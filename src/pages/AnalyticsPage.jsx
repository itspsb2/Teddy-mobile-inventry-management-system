import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Analytics from '../components/Analytics'
import { Calendar } from 'lucide-react'

const AnalyticsPage = () => {
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)

    // Date range state
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
                    <h1 className="page-title">Analytics</h1>
                    <p className="page-subtitle">Business insights and performance analysis</p>
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

            <Analytics startDate={startDate} endDate={endDate} reports={reports} />
        </div>
    )
}

export default AnalyticsPage
