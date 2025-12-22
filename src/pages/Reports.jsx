import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import ProfitTrendChart from '../components/ProfitTrendChart'
import {
    FileText,
    Calendar,
    TrendingUp,
    Download,
    Eye,
    X,
    Phone,
    Package,
    Users,
    Edit2
} from 'lucide-react'

const Reports = () => {
    const { isAdmin } = useAuth()
    const navigate = useNavigate()
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedReport, setSelectedReport] = useState(null)

    // Date range state - load from localStorage if available
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]
    const [startDate, setStartDate] = useState(() => {
        const saved = localStorage.getItem('reportsDateRange')
        if (saved) {
            try {
                return JSON.parse(saved).start || firstDayOfMonth
            } catch {
                return firstDayOfMonth
            }
        }
        return firstDayOfMonth
    })
    const [endDate, setEndDate] = useState(() => {
        const saved = localStorage.getItem('reportsDateRange')
        if (saved) {
            try {
                return JSON.parse(saved).end || today
            } catch {
                return today
            }
        }
        return today
    })

    // Save date range to localStorage when changed
    useEffect(() => {
        localStorage.setItem('reportsDateRange', JSON.stringify({ start: startDate, end: endDate }))
    }, [startDate, endDate])

    useEffect(() => {
        fetchReports()
    }, [])

    const fetchReports = async () => {
        try {
            const { data, error } = await supabase
                .from('profit_reports')
                .select('*')
                .order('report_date', { ascending: false })

            if (error) throw error
            setReports(data || [])
        } catch (error) {
            console.error('Error fetching reports:', error)
        } finally {
            setLoading(false)
        }
    }

    const generatePDF = (report) => {
        const doc = new jsPDF()
        let y = 20

        // Header
        doc.setFontSize(18)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('Sale Profit Management Report', 105, y, { align: 'center' })
        y += 10

        doc.setFontSize(12)
        doc.setFont(undefined, 'normal')
        doc.text(`Report Date: ${new Date(report.report_date).toLocaleDateString()}`, 105, y, { align: 'center' })
        y += 15

        // Phone Chart
        doc.setFontSize(14)
        doc.setFont(undefined, 'bold')
        doc.text('Phone Chart', 14, y)
        y += 5

        const phoneEntries = report.phone_entries || []
        const phoneRows = phoneEntries.map(p => [
            p.model || '',
            p.imei || '',
            p.colour || '',
            p.owner || '',
            parseFloat(p.revenue || 0).toFixed(2),
            parseFloat(p.cost || 0).toFixed(2),
            parseFloat(p.profit || 0).toFixed(2),
            parseFloat(p.thabrew || 0).toFixed(2),
            parseFloat(p.kelan || 0).toFixed(2)
        ])

        // Add totals row
        phoneRows.push([
            'TOTAL', '', '', '',
            parseFloat(report.phone_total_revenue || 0).toFixed(2),
            parseFloat(report.phone_total_cost || 0).toFixed(2),
            parseFloat(report.phone_total_profit || 0).toFixed(2),
            parseFloat(report.thabrew_phone_profit || 0).toFixed(2),
            parseFloat(report.kelan_phone_profit || 0).toFixed(2)
        ])

        doc.autoTable({
            startY: y,
            head: [['Model', 'IMEI', 'Colour', 'Owner', 'Revenue', 'Cost', 'Profit', 'Thabrew', 'Kelan']],
            body: phoneRows,
            theme: 'plain',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.1, fontSize: 8 },
            headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
        })
        y = doc.lastAutoTable.finalY + 15

        // Accessories Chart
        if (y > 250) { doc.addPage(); y = 20 }
        doc.text('Accessories Chart', 14, y)
        y += 5

        const accessoryEntries = report.accessory_entries || []
        const accRows = accessoryEntries.map(a => [
            a.model || '',
            parseFloat(a.revenue || 0).toFixed(2),
            parseFloat(a.cost || 0).toFixed(2),
            parseFloat(a.profit || 0).toFixed(2),
            parseFloat(a.thabrew || 0).toFixed(2),
            parseFloat(a.kelan || 0).toFixed(2)
        ])

        accRows.push([
            'TOTAL',
            parseFloat(report.accessory_total_revenue || 0).toFixed(2),
            parseFloat(report.accessory_total_cost || 0).toFixed(2),
            parseFloat(report.accessory_total_profit || 0).toFixed(2),
            parseFloat(report.thabrew_accessory_profit || 0).toFixed(2),
            parseFloat(report.kelan_accessory_profit || 0).toFixed(2)
        ])

        doc.autoTable({
            startY: y,
            head: [['Model', 'Revenue', 'Cost', 'Profit', 'Thabrew', 'Kelan']],
            body: accRows,
            theme: 'plain',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
        })
        y = doc.lastAutoTable.finalY + 15

        // Thabrew Profit
        if (y > 250) { doc.addPage(); y = 20 }
        doc.text('Thabrew Profit', 14, y)
        y += 5

        const thabrewEntries = report.thabrew_entries || []
        const thRows = thabrewEntries.map(t => [
            t.description || '',
            parseFloat(t.amount || 0).toFixed(2)
        ])
        thRows.push(['TOTAL', parseFloat(report.thabrew_total || 0).toFixed(2)])

        doc.autoTable({
            startY: y,
            head: [['Description', 'Amount']],
            body: thRows,
            theme: 'plain',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
        })
        y = doc.lastAutoTable.finalY + 15

        // Kelan Profit
        if (y > 250) { doc.addPage(); y = 20 }
        doc.text('Kelan Profit', 14, y)
        y += 5

        const kelanEntries = report.kelan_entries || []
        const keRows = kelanEntries.map(k => [
            k.description || '',
            parseFloat(k.amount || 0).toFixed(2)
        ])
        keRows.push(['TOTAL', parseFloat(report.kelan_total || 0).toFixed(2)])

        doc.autoTable({
            startY: y,
            head: [['Description', 'Amount']],
            body: keRows,
            theme: 'plain',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
        })

        doc.save(`Sale_Profit_Report_${report.report_date}.pdf`)
    }

    // Calculate stats for selected date range
    const getDateRangeStats = () => {
        const rangeReports = reports.filter(r => {
            const reportDate = r.report_date
            return reportDate >= startDate && reportDate <= endDate
        })

        const kelanTotal = rangeReports.reduce((sum, r) => sum + parseFloat(r.kelan_total || 0), 0)

        return {
            count: rangeReports.length,
            thabrewTotal: kelanTotal * 4,  // Thabrew = Kelan x 4
            kelanTotal: kelanTotal
        }
    }

    // Get daily profits for chart
    const getDailyProfits = () => {
        const rangeReports = reports.filter(r => {
            const reportDate = r.report_date
            return reportDate >= startDate && reportDate <= endDate
        })

        // Sort by date ascending
        return rangeReports
            .map(r => ({
                date: r.report_date,
                profit: parseFloat(r.phone_total_profit || 0) + parseFloat(r.accessory_total_profit || 0)
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
    }

    const dailyProfits = getDailyProfits()

    const dateRangeStats = getDateRangeStats()

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reports</h1>
                    <p className="page-subtitle">View and download profit reports</p>
                </div>
            </div>

            {/* Date Range Selector */}
            <div className="card mb-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={20} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Date Range:</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="date"
                            className="form-input"
                            style={{ width: 'auto' }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span style={{ color: 'var(--text-secondary)' }}>to</span>
                        <input
                            type="date"
                            className="form-input"
                            style={{ width: 'auto' }}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card">
                    <div className="stat-icon">
                        <Calendar size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Reports in Range</h3>
                        <p className="stat-value">{dateRangeStats.count}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(225, 6, 19, 0.1)', color: '#E10613' }}>
                        <FileText size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Thabrew Share</h3>
                        <p className="stat-value">Rs. {dateRangeStats.thabrewTotal.toLocaleString()}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                        <FileText size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Kelan Share</h3>
                        <p className="stat-value">Rs. {dateRangeStats.kelanTotal.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Day-by-Day Profit Chart - Multi-line (Phone, Accessory, Total) */}
            <ProfitTrendChart
                title="Daily Profit Trend"
                startDate={startDate}
                endDate={endDate}
                height={280}
            />

            {/* Reports Table */}
            <div className="card">
                <h2 className="card-title mb-4">All Reports</h2>
                {reports.length === 0 ? (
                    <div className="empty-state">
                        <FileText size={48} />
                        <p>No reports created yet</p>
                    </div>
                ) : (
                    <div className="table-container" style={{ boxShadow: 'none' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Phone Profit</th>
                                    <th>Accessory Profit</th>
                                    <th>Total Profit</th>
                                    <th>Thabrew</th>
                                    <th>Kelan</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((report) => {
                                    const totalProfit = parseFloat(report.phone_total_profit || 0) +
                                        parseFloat(report.accessory_total_profit || 0)
                                    return (
                                        <tr key={report.id}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>
                                                    {new Date(report.report_date).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td>Rs. {parseFloat(report.phone_total_profit || 0).toLocaleString()}</td>
                                            <td>Rs. {parseFloat(report.accessory_total_profit || 0).toLocaleString()}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                                                Rs. {totalProfit.toLocaleString()}
                                            </td>
                                            <td>Rs. {parseFloat(report.thabrew_total || 0).toLocaleString()}</td>
                                            <td>Rs. {parseFloat(report.kelan_total || 0).toLocaleString()}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn btn-sm btn-outline"
                                                        onClick={() => setSelectedReport(report)}
                                                        title="View"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => generatePDF(report)}
                                                        title="Download PDF"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                    {isAdmin && (
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => navigate('/profit', { state: { editReport: report } })}
                                                            title="Edit Report"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Enhanced Report Detail Modal */}
            {selectedReport && (
                <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
                    <div className="modal" style={{ maxWidth: 900, maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                📊 Profit Report - {new Date(selectedReport.report_date).toLocaleDateString()}
                            </h3>
                            <button className="modal-close" onClick={() => setSelectedReport(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {/* Phone Chart Section */}
                            <div className="mb-6">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <Phone size={20} style={{ color: 'var(--primary)' }} />
                                    <h4 style={{ margin: 0, fontWeight: 600 }}>Phone Chart</h4>
                                </div>
                                {(selectedReport.phone_entries || []).length > 0 ? (
                                    <div className="table-container" style={{ boxShadow: 'none', marginBottom: 0 }}>
                                        <table className="table" style={{ fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr>
                                                    <th>Model</th>
                                                    <th>IMEI</th>
                                                    <th>Colour</th>
                                                    <th>Owner</th>
                                                    <th>Revenue</th>
                                                    <th>Cost</th>
                                                    <th>Profit</th>
                                                    <th>Thabrew</th>
                                                    <th>Kelan</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedReport.phone_entries || []).map((p, i) => (
                                                    <tr key={i}>
                                                        <td>{p.model}</td>
                                                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{p.imei}</td>
                                                        <td>{p.colour}</td>
                                                        <td><span className={`badge ${p.owner === 'TB' ? 'badge-success' : 'badge-info'}`}>{p.owner}</span></td>
                                                        <td>Rs. {parseFloat(p.revenue || 0).toLocaleString()}</td>
                                                        <td>Rs. {parseFloat(p.cost || 0).toLocaleString()}</td>
                                                        <td style={{ fontWeight: 600, color: p.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                            Rs. {parseFloat(p.profit || 0).toLocaleString()}
                                                        </td>
                                                        <td>Rs. {parseFloat(p.thabrew || 0).toLocaleString()}</td>
                                                        <td>Rs. {parseFloat(p.kelan || 0).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ background: 'var(--gray-100)', fontWeight: 600 }}>
                                                    <td colSpan={4} style={{ textAlign: 'right' }}>TOTAL:</td>
                                                    <td>Rs. {parseFloat(selectedReport.phone_total_revenue || 0).toLocaleString()}</td>
                                                    <td>Rs. {parseFloat(selectedReport.phone_total_cost || 0).toLocaleString()}</td>
                                                    <td style={{ color: 'var(--success)' }}>Rs. {parseFloat(selectedReport.phone_total_profit || 0).toLocaleString()}</td>
                                                    <td>Rs. {parseFloat(selectedReport.thabrew_phone_profit || 0).toLocaleString()}</td>
                                                    <td>Rs. {parseFloat(selectedReport.kelan_phone_profit || 0).toLocaleString()}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No phone entries</p>
                                )}
                            </div>

                            {/* Accessories Chart Section */}
                            <div className="mb-6">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <Package size={20} style={{ color: 'var(--primary)' }} />
                                    <h4 style={{ margin: 0, fontWeight: 600 }}>Accessories Chart</h4>
                                </div>
                                {(selectedReport.accessory_entries || []).length > 0 ? (
                                    <div className="table-container" style={{ boxShadow: 'none', marginBottom: 0 }}>
                                        <table className="table" style={{ fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr>
                                                    <th>Model</th>
                                                    <th>Revenue</th>
                                                    <th>Cost</th>
                                                    <th>Profit</th>
                                                    <th>Thabrew</th>
                                                    <th>Kelan</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedReport.accessory_entries || []).map((a, i) => (
                                                    <tr key={i}>
                                                        <td>{a.model}</td>
                                                        <td>Rs. {parseFloat(a.revenue || 0).toLocaleString()}</td>
                                                        <td>Rs. {parseFloat(a.cost || 0).toLocaleString()}</td>
                                                        <td style={{ fontWeight: 600, color: a.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                            Rs. {parseFloat(a.profit || 0).toLocaleString()}
                                                        </td>
                                                        <td>Rs. {parseFloat(a.thabrew || 0).toLocaleString()}</td>
                                                        <td>Rs. {parseFloat(a.kelan || 0).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ background: 'var(--gray-100)', fontWeight: 600 }}>
                                                    <td style={{ textAlign: 'right' }}>TOTAL:</td>
                                                    <td>Rs. {parseFloat(selectedReport.accessory_total_revenue || 0).toLocaleString()}</td>
                                                    <td>Rs. {parseFloat(selectedReport.accessory_total_cost || 0).toLocaleString()}</td>
                                                    <td style={{ color: 'var(--success)' }}>Rs. {parseFloat(selectedReport.accessory_total_profit || 0).toLocaleString()}</td>
                                                    <td>Rs. {parseFloat(selectedReport.thabrew_accessory_profit || 0).toLocaleString()}</td>
                                                    <td>Rs. {parseFloat(selectedReport.kelan_accessory_profit || 0).toLocaleString()}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No accessory entries</p>
                                )}
                            </div>

                            {/* Thabrew & Kelan Section - Side by Side */}
                            <div className="grid-2">
                                {/* Thabrew Profit */}
                                <div style={{ padding: '1rem', background: 'rgba(225, 6, 19, 0.03)', borderRadius: 'var(--radius)', border: '1px solid rgba(225, 6, 19, 0.1)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <Users size={18} style={{ color: 'var(--primary)' }} />
                                        <h4 style={{ margin: 0, fontWeight: 600 }}>Thabrew Profit (80%)</h4>
                                    </div>
                                    {(selectedReport.thabrew_entries || []).length > 0 ? (
                                        <div style={{ fontSize: '0.85rem' }}>
                                            {(selectedReport.thabrew_entries || []).map((t, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                                                    <span style={{ color: 'var(--text-secondary)' }}>{t.description}</span>
                                                    <span style={{ fontWeight: 500 }}>Rs. {parseFloat(t.amount || 0).toLocaleString()}</span>
                                                </div>
                                            ))}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', marginTop: '0.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                                                <span>TOTAL</span>
                                                <span>Rs. {parseFloat(selectedReport.thabrew_total || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No entries</p>
                                    )}
                                </div>

                                {/* Kelan Profit */}
                                <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.03)', borderRadius: 'var(--radius)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <Users size={18} style={{ color: 'var(--info)' }} />
                                        <h4 style={{ margin: 0, fontWeight: 600 }}>Kelan Profit (20%)</h4>
                                    </div>
                                    {(selectedReport.kelan_entries || []).length > 0 ? (
                                        <div style={{ fontSize: '0.85rem' }}>
                                            {(selectedReport.kelan_entries || []).map((k, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                                                    <span style={{ color: 'var(--text-secondary)' }}>{k.description}</span>
                                                    <span style={{ fontWeight: 500 }}>Rs. {parseFloat(k.amount || 0).toLocaleString()}</span>
                                                </div>
                                            ))}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', marginTop: '0.25rem', fontWeight: 700, color: 'var(--info)' }}>
                                                <span>TOTAL</span>
                                                <span>Rs. {parseFloat(selectedReport.kelan_total || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No entries</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setSelectedReport(null)}>
                                Close
                            </button>
                            <button className="btn btn-primary" onClick={() => generatePDF(selectedReport)}>
                                <Download size={18} />
                                Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Reports

