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

        // Header
        doc.setFontSize(20)
        doc.setTextColor(0, 0, 0)
        doc.text('TEDDY MOBILE', 105, 20, { align: 'center' })
        doc.setFontSize(14)
        doc.text('Daily Profit Report', 105, 30, { align: 'center' })
        doc.setFontSize(10)
        doc.text(`Date: ${new Date(report.report_date).toLocaleDateString()}`, 105, 38, { align: 'center' })

        let y = 50

        // Phone Summary
        doc.setFontSize(12)
        doc.text('Phone Sales Summary', 20, y)
        doc.autoTable({
            startY: y + 5,
            head: [['Metric', 'Amount']],
            body: [
                ['Total Revenue', `Rs. ${parseFloat(report.phone_total_revenue).toLocaleString()}`],
                ['Total Cost', `Rs. ${parseFloat(report.phone_total_cost).toLocaleString()}`],
                ['Total Profit', `Rs. ${parseFloat(report.phone_total_profit).toLocaleString()}`]
            ],
            theme: 'plain',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
        })
        y = doc.lastAutoTable.finalY + 15

        // Accessory Summary
        doc.text('Accessory Sales Summary', 20, y)
        doc.autoTable({
            startY: y + 5,
            head: [['Metric', 'Amount']],
            body: [
                ['Total Revenue', `Rs. ${parseFloat(report.accessory_total_revenue).toLocaleString()}`],
                ['Total Cost', `Rs. ${parseFloat(report.accessory_total_cost).toLocaleString()}`],
                ['Total Profit', `Rs. ${parseFloat(report.accessory_total_profit).toLocaleString()}`]
            ],
            theme: 'plain',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
        })
        y = doc.lastAutoTable.finalY + 15

        // Profit Split
        doc.text('Profit Split (80/20)', 20, y)
        doc.autoTable({
            startY: y + 5,
            head: [['Owner', 'Phone', 'Accessory', 'Total']],
            body: [
                ['Thabrew (80%)',
                    `Rs. ${parseFloat(report.thabrew_phone_profit).toLocaleString()}`,
                    `Rs. ${parseFloat(report.thabrew_accessory_profit).toLocaleString()}`,
                    `Rs. ${parseFloat(report.thabrew_total).toLocaleString()}`
                ],
                ['Kelan (20%)',
                    `Rs. ${parseFloat(report.kelan_phone_profit).toLocaleString()}`,
                    `Rs. ${parseFloat(report.kelan_accessory_profit).toLocaleString()}`,
                    `Rs. ${parseFloat(report.kelan_total).toLocaleString()}`
                ]
            ],
            theme: 'plain',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
        })

        doc.save(`profit-report-${report.report_date}.pdf`)
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
                    <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                Report - {new Date(selectedReport.report_date).toLocaleDateString()}
                            </h3>
                            <button className="modal-close" onClick={() => setSelectedReport(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="grid-2 mb-4">
                                <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                                    <h4 style={{ marginBottom: '0.5rem' }}>📱 Phone Sales</h4>
                                    <div>Revenue: Rs. {parseFloat(selectedReport.phone_total_revenue || 0).toLocaleString()}</div>
                                    <div>Cost: Rs. {parseFloat(selectedReport.phone_total_cost || 0).toLocaleString()}</div>
                                    <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                                        Profit: Rs. {parseFloat(selectedReport.phone_total_profit || 0).toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                                    <h4 style={{ marginBottom: '0.5rem' }}>🎧 Accessory Sales</h4>
                                    <div>Revenue: Rs. {parseFloat(selectedReport.accessory_total_revenue || 0).toLocaleString()}</div>
                                    <div>Cost: Rs. {parseFloat(selectedReport.accessory_total_cost || 0).toLocaleString()}</div>
                                    <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                                        Profit: Rs. {parseFloat(selectedReport.accessory_total_profit || 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <div className="grid-2">
                                <div style={{ padding: '1rem', background: 'rgba(225, 6, 19, 0.05)', borderRadius: 'var(--radius)' }}>
                                    <h4 style={{ marginBottom: '0.5rem' }}>Thabrew (80%)</h4>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                                        Rs. {parseFloat(selectedReport.thabrew_total || 0).toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 'var(--radius)' }}>
                                    <h4 style={{ marginBottom: '0.5rem' }}>Kelan (20%)</h4>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--info)' }}>
                                        Rs. {parseFloat(selectedReport.kelan_total || 0).toLocaleString()}
                                    </div>
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
