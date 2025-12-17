import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import {
    FileText,
    Calendar,
    TrendingUp,
    Download,
    Eye,
    X
} from 'lucide-react'

const Reports = () => {
    const { isAdmin } = useAuth()
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedReport, setSelectedReport] = useState(null)

    // Date range state - default to current month
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]
    const [startDate, setStartDate] = useState(firstDayOfMonth)
    const [endDate, setEndDate] = useState(today)

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

        // Phone Chart (Detailed)
        const phoneEntries = report.phone_entries || []
        if (phoneEntries.length > 0) {
            doc.setFontSize(14)
            doc.setFont(undefined, 'bold')
            doc.text('Phone Chart', 14, y)
            y += 5

            const phoneRows = phoneEntries.map(p => [
                p.model || '', p.imei || '', p.colour || '', p.owner || '',
                (p.revenue || 0).toFixed(2), (p.cost || 0).toFixed(2), (p.profit || 0).toFixed(2),
                (p.thabrew || 0).toFixed(2), (p.kelan || 0).toFixed(2)
            ])

            const phoneTotals = phoneEntries.reduce((acc, curr) => ({
                rev: acc.rev + (curr.revenue || 0), cost: acc.cost + (curr.cost || 0), prof: acc.prof + (curr.profit || 0),
                th: acc.th + (curr.thabrew || 0), ke: acc.ke + (curr.kelan || 0)
            }), { rev: 0, cost: 0, prof: 0, th: 0, ke: 0 })

            phoneRows.push(['TOTAL', '', '', '', phoneTotals.rev.toFixed(2), phoneTotals.cost.toFixed(2), phoneTotals.prof.toFixed(2), phoneTotals.th.toFixed(2), phoneTotals.ke.toFixed(2)])

            doc.autoTable({
                startY: y,
                head: [['Model', 'IMEI', 'Colour', 'Owner', 'Revenue', 'Cost', 'Profit', 'Thabrew', 'Kelan']],
                body: phoneRows,
                theme: 'plain',
                styles: { lineColor: [0, 0, 0], lineWidth: 0.1, fontSize: 8 },
                headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
            })
            y = doc.lastAutoTable.finalY + 15
        }

        // Accessories Chart (Detailed)
        const accessoryEntries = report.accessory_entries || []
        if (accessoryEntries.length > 0) {
            if (y > 250) { doc.addPage(); y = 20 }
            doc.setFontSize(14)
            doc.setFont(undefined, 'bold')
            doc.text('Accessories Chart', 14, y)
            y += 5

            const accRows = accessoryEntries.map(a => [
                a.model || '', (a.revenue || 0).toFixed(2), (a.cost || 0).toFixed(2),
                (a.profit || 0).toFixed(2), (a.thabrew || 0).toFixed(2), (a.kelan || 0).toFixed(2)
            ])
            const accTotals = accessoryEntries.reduce((acc, curr) => ({
                rev: acc.rev + (curr.revenue || 0), cost: acc.cost + (curr.cost || 0), prof: acc.prof + (curr.profit || 0),
                th: acc.th + (curr.thabrew || 0), ke: acc.ke + (curr.kelan || 0)
            }), { rev: 0, cost: 0, prof: 0, th: 0, ke: 0 })
            accRows.push(['TOTAL', accTotals.rev.toFixed(2), accTotals.cost.toFixed(2), accTotals.prof.toFixed(2), accTotals.th.toFixed(2), accTotals.ke.toFixed(2)])

            doc.autoTable({
                startY: y,
                head: [['Model', 'Revenue', 'Cost', 'Profit', 'Thabrew', 'Kelan']],
                body: accRows,
                theme: 'plain',
                styles: { lineColor: [0, 0, 0], lineWidth: 0.1, fontSize: 9 },
                headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
            })
            y = doc.lastAutoTable.finalY + 15
        }

        // Thabrew Profit (Detailed)
        const thabrewEntries = report.thabrew_entries || []
        if (thabrewEntries.length > 0) {
            if (y > 250) { doc.addPage(); y = 20 }
            doc.setFontSize(14)
            doc.setFont(undefined, 'bold')
            doc.text('Thabrew Profit', 14, y)
            y += 5

            const thRows = thabrewEntries.map(t => [t.description || '', (t.amount || 0).toFixed(2)])
            const thTotal = thabrewEntries.reduce((s, t) => s + (t.amount || 0), 0)
            thRows.push(['TOTAL', thTotal.toFixed(2)])

            doc.autoTable({
                startY: y,
                head: [['Description', 'Amount']],
                body: thRows,
                theme: 'plain',
                styles: { lineColor: [0, 0, 0], lineWidth: 0.1, fontSize: 9 },
                headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
            })
            y = doc.lastAutoTable.finalY + 15
        }

        // Kelan Profit (Detailed)
        const kelanEntries = report.kelan_entries || []
        if (kelanEntries.length > 0) {
            if (y > 250) { doc.addPage(); y = 20 }
            doc.setFontSize(14)
            doc.setFont(undefined, 'bold')
            doc.text('Kelan Profit', 14, y)
            y += 5

            const keRows = kelanEntries.map(k => [k.description || '', (k.amount || 0).toFixed(2)])
            const keTotal = kelanEntries.reduce((s, k) => s + (k.amount || 0), 0)
            keRows.push(['TOTAL', keTotal.toFixed(2)])

            doc.autoTable({
                startY: y,
                head: [['Description', 'Amount']],
                body: keRows,
                theme: 'plain',
                styles: { lineColor: [0, 0, 0], lineWidth: 0.1, fontSize: 9 },
                headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
            })
        }

        doc.save(`Sale_Profit_Report_${report.report_date}.pdf`)
    }

    // Calculate stats for selected date range
    const getDateRangeStats = () => {
        const rangeReports = reports.filter(r => {
            const reportDate = r.report_date
            return reportDate >= startDate && reportDate <= endDate
        })

        return {
            count: rangeReports.length,
            totalProfit: rangeReports.reduce((sum, r) =>
                sum + parseFloat(r.phone_total_profit || 0) + parseFloat(r.accessory_total_profit || 0), 0
            ),
            thabrewTotal: rangeReports.reduce((sum, r) => sum + parseFloat(r.thabrew_total || 0), 0),
            kelanTotal: rangeReports.reduce((sum, r) => sum + parseFloat(r.kelan_total || 0), 0)
        }
    }

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
            <div className="stats-grid mb-6">
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
                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Total Profit</h3>
                        <p className="stat-value">Rs. {dateRangeStats.totalProfit.toLocaleString()}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
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

            {/* Report Detail Modal */}
            {selectedReport && (
                <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
                    <div className="modal" style={{ maxWidth: 900, maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                Report - {new Date(selectedReport.report_date).toLocaleDateString()}
                            </h3>
                            <button className="modal-close" onClick={() => setSelectedReport(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Phone Entries Table */}
                            {selectedReport.phone_entries && selectedReport.phone_entries.length > 0 && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        📱 Phone Sales ({selectedReport.phone_entries.length} items)
                                    </h4>
                                    <div className="table-container" style={{ boxShadow: 'none' }}>
                                        <table className="table" style={{ fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr>
                                                    <th>Model</th>
                                                    <th>IMEI</th>
                                                    <th>Owner</th>
                                                    <th>Revenue</th>
                                                    <th>Cost</th>
                                                    <th>Profit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedReport.phone_entries.map((p, i) => (
                                                    <tr key={i}>
                                                        <td>{p.model}</td>
                                                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{p.imei}</td>
                                                        <td><span className={`badge ${p.owner?.toUpperCase() === 'TB' ? 'badge-success' : 'badge-info'}`}>{p.owner}</span></td>
                                                        <td>Rs. {(p.revenue || 0).toLocaleString()}</td>
                                                        <td>Rs. {(p.cost || 0).toLocaleString()}</td>
                                                        <td style={{ fontWeight: 600, color: (p.profit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>Rs. {(p.profit || 0).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Accessory Entries Table */}
                            {selectedReport.accessory_entries && selectedReport.accessory_entries.length > 0 && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        🎧 Accessory Sales ({selectedReport.accessory_entries.length} items)
                                    </h4>
                                    <div className="table-container" style={{ boxShadow: 'none' }}>
                                        <table className="table" style={{ fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr>
                                                    <th>Model</th>
                                                    <th>Revenue</th>
                                                    <th>Cost</th>
                                                    <th>Profit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedReport.accessory_entries.map((a, i) => (
                                                    <tr key={i}>
                                                        <td>{a.model}</td>
                                                        <td>Rs. {(a.revenue || 0).toLocaleString()}</td>
                                                        <td>Rs. {(a.cost || 0).toLocaleString()}</td>
                                                        <td style={{ fontWeight: 600, color: (a.profit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>Rs. {(a.profit || 0).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Summary Cards */}
                            <div className="grid-2 mb-4">
                                <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                                    <h4 style={{ marginBottom: '0.5rem' }}>📱 Phone Totals</h4>
                                    <div>Revenue: Rs. {parseFloat(selectedReport.phone_total_revenue || 0).toLocaleString()}</div>
                                    <div>Cost: Rs. {parseFloat(selectedReport.phone_total_cost || 0).toLocaleString()}</div>
                                    <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                                        Profit: Rs. {parseFloat(selectedReport.phone_total_profit || 0).toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                                    <h4 style={{ marginBottom: '0.5rem' }}>🎧 Accessory Totals</h4>
                                    <div>Revenue: Rs. {parseFloat(selectedReport.accessory_total_revenue || 0).toLocaleString()}</div>
                                    <div>Cost: Rs. {parseFloat(selectedReport.accessory_total_cost || 0).toLocaleString()}</div>
                                    <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                                        Profit: Rs. {parseFloat(selectedReport.accessory_total_profit || 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Thabrew & Kelan Breakdown */}
                            <div className="grid-2">
                                <div style={{ padding: '1rem', background: 'rgba(225, 6, 19, 0.05)', borderRadius: 'var(--radius)' }}>
                                    <h4 style={{ marginBottom: '0.75rem' }}>Thabrew (80%)</h4>
                                    {selectedReport.thabrew_entries && selectedReport.thabrew_entries.length > 0 ? (
                                        <div style={{ fontSize: '0.85rem' }}>
                                            {selectedReport.thabrew_entries.map((t, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                    <span>{t.description}</span>
                                                    <span>Rs. {(t.amount || 0).toLocaleString()}</span>
                                                </div>
                                            ))}
                                            <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                                                <span>TOTAL</span>
                                                <span style={{ color: 'var(--primary)' }}>Rs. {parseFloat(selectedReport.thabrew_total || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                                            Rs. {parseFloat(selectedReport.thabrew_total || 0).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 'var(--radius)' }}>
                                    <h4 style={{ marginBottom: '0.75rem' }}>Kelan (20%)</h4>
                                    {selectedReport.kelan_entries && selectedReport.kelan_entries.length > 0 ? (
                                        <div style={{ fontSize: '0.85rem' }}>
                                            {selectedReport.kelan_entries.map((k, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                    <span>{k.description}</span>
                                                    <span>Rs. {(k.amount || 0).toLocaleString()}</span>
                                                </div>
                                            ))}
                                            <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                                                <span>TOTAL</span>
                                                <span style={{ color: 'var(--info)' }}>Rs. {parseFloat(selectedReport.kelan_total || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--info)' }}>
                                            Rs. {parseFloat(selectedReport.kelan_total || 0).toLocaleString()}
                                        </div>
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
