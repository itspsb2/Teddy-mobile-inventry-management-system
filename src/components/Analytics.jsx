import { useState, useEffect, useMemo } from 'react'
import {
    Calendar,
    BarChart3,
    Target
} from 'lucide-react'

const Analytics = ({ startDate, endDate, reports }) => {
    const [goals, setGoals] = useState(() => {
        const saved = localStorage.getItem('analyticsGoals')
        return saved ? JSON.parse(saved) : { monthly: 100000 }
    })
    const [editingGoals, setEditingGoals] = useState(false)

    // Filter reports by date range
    const filteredReports = useMemo(() => {
        return reports.filter(r => r.report_date >= startDate && r.report_date <= endDate)
    }, [reports, startDate, endDate])

    // Quick Stats for Phone vs Accessory Split
    const quickStats = useMemo(() => {
        const totalPhoneProfit = filteredReports.reduce((sum, r) => sum + (parseFloat(r.phone_total_profit) || 0), 0)
        const totalAccessoryProfit = filteredReports.reduce((sum, r) => sum + (parseFloat(r.accessory_total_profit) || 0), 0)
        const totalProfit = totalPhoneProfit + totalAccessoryProfit

        return {
            totalProfit,
            totalPhoneProfit,
            totalAccessoryProfit
        }
    }, [filteredReports])

    // Best Selling Days
    const bestSellingDays = useMemo(() => {
        const days = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

        filteredReports.forEach(r => {
            const day = new Date(r.report_date).getDay()
            days[day] += (parseFloat(r.phone_total_profit) || 0) + (parseFloat(r.accessory_total_profit) || 0)
            dayCounts[day]++
        })

        return dayNames.map((name, i) => ({
            day: name,
            profit: days[i],
            count: dayCounts[i],
            avg: dayCounts[i] > 0 ? days[i] / dayCounts[i] : 0
        }))
    }, [filteredReports])

    // Save goals to localStorage
    const saveGoals = () => {
        localStorage.setItem('analyticsGoals', JSON.stringify(goals))
        setEditingGoals(false)
    }

    const maxDayProfit = Math.max(...bestSellingDays.map(d => d.profit))
    const phoneSplit = quickStats.totalProfit > 0
        ? (quickStats.totalPhoneProfit / quickStats.totalProfit) * 100
        : 50
    const accessorySplit = 100 - phoneSplit

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Best Selling Days */}
            <div className="card chart-card">
                <div className="card-header">
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart3 size={20} /> Best Selling Days
                    </h2>
                </div>
                <div className="bar-chart">
                    {bestSellingDays.map((d, i) => (
                        <div key={i} className="bar-item">
                            <div
                                className="bar-value"
                                style={{ height: `${maxDayProfit > 0 ? (d.profit / maxDayProfit) * 120 : 0}px` }}
                                title={`Rs. ${d.profit.toLocaleString()}`}
                            />
                            <span className="bar-label">{d.day}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Phone vs Accessory Split */}
            <div className="card chart-card">
                <div className="card-header">
                    <h2 className="card-title">Phone vs Accessory Split</h2>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                            <span>Phones</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                            Rs. {quickStats.totalPhoneProfit.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {quickStats.totalProfit > 0 ? ((quickStats.totalPhoneProfit / quickStats.totalProfit) * 100).toFixed(1) : 0}%
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ width: '12px', height: '12px', background: 'var(--success)', borderRadius: '2px' }}></div>
                            <span>Accessories</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                            Rs. {quickStats.totalAccessoryProfit.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {quickStats.totalProfit > 0 ? ((quickStats.totalAccessoryProfit / quickStats.totalProfit) * 100).toFixed(1) : 0}%
                        </div>
                    </div>
                </div>
                {/* Visual Bar */}
                <div className="split-bar" style={{ marginTop: '1rem' }}>
                    <div
                        className="split-bar__segment split-bar__segment--phone"
                        style={{ width: `${phoneSplit}%` }}
                    ></div>
                    <div
                        className="split-bar__segment split-bar__segment--accessory"
                        style={{ width: `${accessorySplit}%` }}
                    ></div>
                </div>
            </div>

            {/* Goal Tracking - Monthly Only */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Target size={20} /> Monthly Goal Tracking
                    </h2>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditingGoals(!editingGoals)}>
                        {editingGoals ? 'Cancel' : 'Edit Goal'}
                    </button>
                </div>
                {editingGoals ? (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
                            <label className="form-label">Monthly Goal (Rs.)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={goals.monthly}
                                onChange={e => setGoals({ ...goals, monthly: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={saveGoals}>Save</button>
                    </div>
                ) : (
                    <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Monthly Goal</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem' }}>Rs. {goals.monthly.toLocaleString()}</div>
                        <div className="progress-bar" style={{ marginBottom: '0.5rem' }}>
                            <div className="progress-fill" style={{ width: `${Math.min((quickStats.totalProfit / goals.monthly) * 100, 100)}%` }}></div>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {((quickStats.totalProfit / goals.monthly) * 100).toFixed(1)}% achieved
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--success)', marginTop: '0.75rem' }}>
                            Rs. {quickStats.totalProfit.toLocaleString()} earned
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Analytics
