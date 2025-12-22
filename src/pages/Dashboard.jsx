import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    Package,
    DollarSign,
    ArrowRight
} from 'lucide-react'
import ProfitTrendChart from '../components/ProfitTrendChart'

const Dashboard = () => {
    const { isAdmin } = useAuth()
    const navigate = useNavigate()
    const [stats, setStats] = useState({
        totalStock: 0,
        kelanBalance: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            // Fetch stocks
            const { data: stocks } = await supabase.from('stocks').select('*')
            const inStock = stocks?.filter(s => s.state === 'in_stock').length || 0

            // Fetch Kelan balance
            const { data: reports } = await supabase.from('profit_reports').select('kelan_total')
            const { data: payments } = await supabase.from('kelan_payments').select('amount')

            const totalKelanEarned = reports?.reduce((sum, r) => sum + (parseFloat(r.kelan_total) || 0), 0) || 0
            const totalKelanPaid = payments?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0

            setStats({
                totalStock: inStock,
                kelanBalance: totalKelanEarned - totalKelanPaid
            })
        } catch (error) {
            console.error('Dashboard error:', error)
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
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome back! Here's your business overview.</p>
                </div>
            </div>

            {/* Stats Grid - Clickable Cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                <div
                    className="stat-card"
                    style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onClick={() => navigate('/stock')}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = ''
                    }}
                >
                    <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>
                        <Package size={24} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="stat-content">
                        <h3>In Stock</h3>
                        <p className="stat-value">{stats.totalStock}</p>
                    </div>
                </div>

                <div
                    className="stat-card"
                    style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onClick={() => navigate('/profit', { state: { activeTab: 'payments' } })}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = ''
                    }}
                >
                    <div className="stat-icon" style={{ background: stats.kelanBalance > 0 ? 'var(--warning-light)' : 'var(--success-light)' }}>
                        <DollarSign size={24} style={{ color: stats.kelanBalance > 0 ? 'var(--warning)' : 'var(--success)' }} />
                    </div>
                    <div className="stat-content">
                        <h3>Kelan Balance</h3>
                        <p className="stat-value" style={{ color: stats.kelanBalance > 0 ? 'var(--warning)' : 'var(--success)' }}>
                            Rs. {stats.kelanBalance.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Daily Profit Trend Chart - Admin Only */}
            {isAdmin() && (
                <ProfitTrendChart
                    title="Daily Profit Trend (Last 14 Reports)"
                    maxReports={14}
                    height={280}
                />
            )}

            {/* Quick Actions */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Quick Actions</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button onClick={() => navigate('/stock')} className="btn btn-outline w-full" style={{ justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Package size={18} /> Manage Stock
                        </span>
                        <ArrowRight size={18} />
                    </button>
                    <button onClick={() => navigate('/profit')} className="btn btn-outline w-full" style={{ justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <DollarSign size={18} /> Profit Calculator
                        </span>
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
