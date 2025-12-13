import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
    Package,
    TrendingUp,
    DollarSign,
    ShoppingCart,
    ArrowRight,
    AlertCircle
} from 'lucide-react'

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalStock: 0,
        kelanBalance: 0
    })
    const [recentSales, setRecentSales] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            // Fetch stocks
            const { data: stocks } = await supabase.from('stocks').select('*')
            const inStock = stocks?.filter(s => s.state === 'in_stock').length || 0

            // Fetch sold stocks for recent sales
            const { data: soldStocks } = await supabase
                .from('sold_stocks')
                .select('*')
                .order('sell_date', { ascending: false })
                .limit(5)

            // Fetch Kelan balance
            const { data: reports } = await supabase.from('profit_reports').select('kelan_total')
            const { data: payments } = await supabase.from('kelan_payments').select('amount')

            const totalKelanEarned = reports?.reduce((sum, r) => sum + (parseFloat(r.kelan_total) || 0), 0) || 0
            const totalKelanPaid = payments?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0

            setStats({
                totalStock: inStock,
                kelanBalance: totalKelanEarned - totalKelanPaid
            })

            // Recent sales
            setRecentSales(soldStocks || [])
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

            {/* Stats Grid */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>
                        <Package size={24} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="stat-content">
                        <h3>In Stock</h3>
                        <p className="stat-value">{stats.totalStock}</p>
                    </div>
                </div>

                <div className="stat-card">
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

            {/* Kelan Balance Alert */}
            {stats.kelanBalance > 0 && (
                <div className="alert alert-warning mb-6">
                    <AlertCircle size={20} />
                    <div>
                        <strong>Outstanding Kelan Balance:</strong> Rs. {stats.kelanBalance.toLocaleString()}
                        <Link to="/profit" style={{ marginLeft: '0.5rem', color: 'inherit', fontWeight: 500 }}>
                            View Details →
                        </Link>
                    </div>
                </div>
            )}

            {/* Quick Actions & Recent Sales */}
            <div className="grid-2">
                {/* Quick Actions */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Quick Actions</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <Link to="/stock" className="btn btn-outline w-full" style={{ justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Package size={18} /> Manage Stock
                            </span>
                            <ArrowRight size={18} />
                        </Link>
                        <Link to="/profit" className="btn btn-outline w-full" style={{ justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={18} /> Profit Calculator
                            </span>
                            <ArrowRight size={18} />
                        </Link>
                        <Link to="/stock-check" className="btn btn-outline w-full" style={{ justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ShoppingCart size={18} /> Stock Check
                            </span>
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>

                {/* Recent Sales */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Recent Sales</h2>
                        <Link to="/stock" className="btn btn-sm btn-outline">View All</Link>
                    </div>
                    {recentSales.length === 0 ? (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <ShoppingCart size={32} />
                            <p>No sales yet</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {recentSales.map(sale => (
                                <div
                                    key={sale.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-md)'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{sale.phone}</div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{sale.code}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                                            +Rs. {parseFloat(sale.profit || 0).toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                            {sale.sell_date ? new Date(sale.sell_date).toLocaleDateString() : ''}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Dashboard

