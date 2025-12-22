import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import {
    ClipboardCheck,
    PlayCircle,
    CheckCircle,
    XCircle,
    Search,
    FileText,
    Loader2,
    Package,
    AlertTriangle
} from 'lucide-react'

const StockCheck = () => {
    const { user, userProfile } = useAuth()
    const [activeSession, setActiveSession] = useState(null)
    const [history, setHistory] = useState([])
    const [stocks, setStocks] = useState([])
    const [loading, setLoading] = useState(true)
    const [verifyCode, setVerifyCode] = useState('')
    const [verifying, setVerifying] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // Fetch active session
            const { data: sessions } = await supabase
                .from('stock_checks')
                .select('*')
                .eq('status', 'in_progress')
                .order('created_at', { ascending: false })
                .limit(1)

            if (sessions && sessions.length > 0) {
                setActiveSession(sessions[0])
            }

            // Fetch history
            const { data: historyData } = await supabase
                .from('stock_checks')
                .select('*')
                .eq('status', 'completed')
                .order('check_date', { ascending: false })
                .limit(10)

            setHistory(historyData || [])

            // Fetch in-stock items
            const { data: stockData } = await supabase
                .from('stocks')
                .select('*')
                .eq('state', 'in_stock')

            setStocks(stockData || [])
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const startNewSession = async () => {
        try {
            const inStockItems = stocks.length

            const { data, error } = await supabase
                .from('stock_checks')
                .insert([{
                    check_date: new Date().toISOString().split('T')[0],
                    checked_by: user.id,
                    total_items: inStockItems,
                    verified_items: 0,
                    missing_items: 0,
                    verified_codes: [],
                    missing_codes: [],
                    status: 'in_progress'
                }])
                .select()
                .single()

            if (error) throw error

            setActiveSession(data)
            setMessage({ type: 'success', text: `Started new check session with ${inStockItems} items to verify.` })
        } catch (error) {
            setMessage({ type: 'error', text: error.message })
        }
    }

    const verifyItem = async () => {
        if (!verifyCode.trim() || !activeSession) return
        setVerifying(true)
        setMessage({ type: '', text: '' })

        try {
            let inputValue = verifyCode.trim().toUpperCase()
            let code = ''
            let stockItem = null

            // Check if input is an IMEI (typically 15 digits)
            if (/^\d{14,15}$/.test(inputValue)) {
                // Lookup by IMEI
                stockItem = stocks.find(s => s.imei === inputValue || s.imei === verifyCode.trim())
                if (!stockItem) {
                    setMessage({ type: 'error', text: `IMEI ${inputValue} not found in inventory!` })
                    setVerifyCode('')
                    setVerifying(false)
                    return
                }
                code = stockItem.code.toUpperCase()
            } else {
                // Process as TDY code
                code = inputValue

                // If user enters just digits, auto-prepend TDY-
                if (/^\d{1,4}$/.test(code)) {
                    code = `TDY-${code.padStart(4, '0')}`
                }
                // If user enters partial code like "1234", convert to TDY-1234
                else if (/^\d+$/.test(code)) {
                    code = `TDY-${code.slice(-4).padStart(4, '0')}`
                }
                // Normalize code format if it has TDY prefix
                else if (code.startsWith('TDY') && !code.includes('-')) {
                    code = `TDY-${code.slice(3).padStart(4, '0')}`
                }

                // Check if code exists in stock
                stockItem = stocks.find(s => s.code.toUpperCase() === code)
                if (!stockItem) {
                    setMessage({ type: 'error', text: `${code} not found in inventory!` })
                    setVerifyCode('')
                    setVerifying(false)
                    return
                }
            }

            const verifiedCodes = activeSession.verified_codes || []

            // Check if already verified
            if (verifiedCodes.includes(code)) {
                setMessage({ type: 'warning', text: `${code} already verified!` })
                setVerifyCode('')
                setVerifying(false)
                return
            }

            // Update session
            const newVerifiedCodes = [...verifiedCodes, code]
            const { error } = await supabase
                .from('stock_checks')
                .update({
                    verified_codes: newVerifiedCodes,
                    verified_items: newVerifiedCodes.length
                })
                .eq('id', activeSession.id)

            if (error) throw error

            // Update stock last checked
            await supabase
                .from('stocks')
                .update({ last_checked_at: new Date().toISOString() })
                .eq('id', stockItem.id)

            setActiveSession({
                ...activeSession,
                verified_codes: newVerifiedCodes,
                verified_items: newVerifiedCodes.length
            })
            setMessage({ type: 'success', text: `✓ ${code} verified - ${stockItem.phone}` })
            setVerifyCode('')
        } catch (error) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setVerifying(false)
        }
    }

    const completeSession = async () => {
        if (!activeSession) return

        try {
            const verifiedCodes = activeSession.verified_codes || []
            const allCodes = stocks.map(s => s.code.toUpperCase())
            const missingCodes = allCodes.filter(c => !verifiedCodes.includes(c))

            // Calculate totals
            const verifiedCount = verifiedCodes.length
            const missingCount = missingCodes.length
            const totalItems = verifiedCount + missingCount

            const { error } = await supabase
                .from('stock_checks')
                .update({
                    status: 'completed',
                    total_items: totalItems,
                    verified_items: verifiedCount,
                    missing_codes: missingCodes,
                    missing_items: missingCount
                })
                .eq('id', activeSession.id)

            if (error) throw error

            setMessage({
                type: missingCount > 0 ? 'warning' : 'success',
                text: missingCount > 0
                    ? `Check completed. ${missingCount} items missing!`
                    : 'Check completed. All items verified!'
            })
            setActiveSession(null)
            await fetchData()
        } catch (error) {
            setMessage({ type: 'error', text: error.message })
        }
    }

    const generatePDF = (session) => {
        const doc = new jsPDF()

        // Header
        doc.setFontSize(20)
        doc.setTextColor(0, 0, 0)
        doc.text('TEDDY MOBILE', 105, 20, { align: 'center' })
        doc.setFontSize(14)
        doc.text('Stock Check Report', 105, 30, { align: 'center' })

        // Info
        doc.setFontSize(10)
        doc.text(`Date: ${new Date(session.check_date).toLocaleDateString()}`, 20, 45)
        doc.text(`Total Items: ${session.total_items}`, 20, 52)
        doc.text(`Verified: ${session.verified_items}`, 20, 59)
        doc.text(`Missing: ${session.missing_items}`, 20, 66)

        // Verified Items Table
        if (session.verified_codes && session.verified_codes.length > 0) {
            doc.setFontSize(12)
            doc.text('Verified Items:', 20, 80)

            const verifiedData = session.verified_codes.map((code, i) => {
                const stock = stocks.find(s => s.code.toUpperCase() === code)
                return [i + 1, code, stock?.phone || 'Unknown', stock?.storage || '']
            })

            doc.autoTable({
                startY: 85,
                head: [['#', 'Code', 'Phone', 'Storage']],
                body: verifiedData,
                theme: 'plain',
                styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
                headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
            })
        }

        // Missing Items
        if (session.missing_codes && session.missing_codes.length > 0) {
            const finalY = doc.lastAutoTable?.finalY || 85
            doc.setFontSize(12)
            doc.setTextColor(0, 0, 0)
            doc.text('Missing Items:', 20, finalY + 15)

            const missingData = session.missing_codes.map((code, i) => {
                const stock = stocks.find(s => s.code.toUpperCase() === code)
                return [i + 1, code, stock?.phone || 'Unknown', stock?.storage || '']
            })

            doc.autoTable({
                startY: finalY + 20,
                head: [['#', 'Code', 'Phone', 'Storage']],
                body: missingData,
                theme: 'plain',
                styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
                headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
            })
        }

        doc.save(`stock-check-${session.check_date}.pdf`)
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        )
    }

    const progress = activeSession
        ? Math.round((activeSession.verified_items / activeSession.total_items) * 100) || 0
        : 0

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Stock Check</h1>
                    <p className="page-subtitle">Audit and verify your inventory</p>
                </div>
                {!activeSession && (
                    <button className="btn btn-primary" onClick={startNewSession}>
                        <PlayCircle size={18} />
                        Start New Check
                    </button>
                )}
            </div>

            {message.text && (
                <div className={`alert alert-${message.type === 'error' ? 'danger' : message.type === 'warning' ? 'warning' : 'success'} mb-4`}>
                    {message.type === 'error' ? <XCircle size={18} /> :
                        message.type === 'warning' ? <AlertTriangle size={18} /> :
                            <CheckCircle size={18} />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Active Session */}
            {activeSession && (
                <div className="card mb-6">
                    <h2 className="card-title mb-4">Active Check Session</h2>

                    {/* Progress */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm font-medium">{activeSession.verified_items} / {activeSession.total_items}</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* Verify Input */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: '2.75rem' }}
                                placeholder="Enter TDY code (e.g., 1234) or full IMEI"
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && verifyItem()}
                                autoFocus
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={verifyItem}
                            disabled={verifying || !verifyCode.trim()}
                        >
                            {verifying ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={18} />}
                            Verify
                        </button>
                    </div>

                    {/* Complete Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-success" onClick={completeSession}>
                            <ClipboardCheck size={18} />
                            Complete Check
                        </button>
                    </div>
                </div>
            )}

            {/* History */}
            <div className="card">
                <h2 className="card-title mb-4">Check History</h2>
                {history.length === 0 ? (
                    <div className="empty-state">
                        <ClipboardCheck size={48} />
                        <p>No stock checks completed yet</p>
                    </div>
                ) : (
                    <div className="table-container" style={{ boxShadow: 'none' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Total Items</th>
                                    <th>Verified</th>
                                    <th>Missing</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((check) => (
                                    <tr key={check.id}>
                                        <td>{new Date(check.check_date).toLocaleDateString()}</td>
                                        <td>{check.total_items}</td>
                                        <td>
                                            <span className="badge badge-success">{check.verified_items}</span>
                                        </td>
                                        <td>
                                            {check.missing_items > 0 ? (
                                                <span className="badge badge-danger">{check.missing_items}</span>
                                            ) : (
                                                <span className="badge badge-success">0</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${check.missing_items > 0 ? 'badge-warning' : 'badge-success'}`}>
                                                {check.missing_items > 0 ? 'Issues Found' : 'All Clear'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => generatePDF(check)}
                                            >
                                                <FileText size={14} />
                                                PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default StockCheck
