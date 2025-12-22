import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TrendingUp } from 'lucide-react'

/**
 * Professional Multi-Line Profit Trend Chart Component
 * Shows Phone Profit (blue), Accessory Profit (green), and Total Profit (red)
 * Designed following professional UI/UX best practices for SVG line charts
 */
const ProfitTrendChart = ({
    title = "Daily Profit Trend",
    startDate = null,
    endDate = null,
    maxReports = 14,
    height = 280
}) => {
    const [chartData, setChartData] = useState([])
    const [loading, setLoading] = useState(true)
    const [hoveredPoint, setHoveredPoint] = useState(null)

    useEffect(() => {
        fetchChartData()
    }, [startDate, endDate])

    const fetchChartData = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('profit_reports')
                .select('report_date, phone_total_profit, accessory_total_profit')

            if (startDate && endDate) {
                // When date range is specified, fetch in ascending order
                query = query
                    .gte('report_date', startDate)
                    .lte('report_date', endDate)
                    .order('report_date', { ascending: true })
            } else {
                // When no date range, get LATEST records first, then reverse for chronological display
                query = query
                    .order('report_date', { ascending: false })
                    .limit(maxReports)
            }

            const { data, error } = await query

            if (error) throw error

            const formattedData = (data || []).map(r => ({
                date: r.report_date,
                phoneProfit: parseFloat(r.phone_total_profit || 0),
                accessoryProfit: parseFloat(r.accessory_total_profit || 0),
                totalProfit: parseFloat(r.phone_total_profit || 0) + parseFloat(r.accessory_total_profit || 0)
            }))

            // If no date range (Dashboard), reverse to show oldest→newest (chronological)
            if (!startDate && !endDate) {
                formattedData.reverse()
            }

            setChartData(formattedData)
        } catch (error) {
            console.error('Chart data fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="card mb-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ margin: 0, fontWeight: 600 }}>{title}</h3>
                </div>
                <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner"></div>
                </div>
            </div>
        )
    }

    if (chartData.length === 0) {
        return (
            <div className="card mb-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ margin: 0, fontWeight: 600 }}>{title}</h3>
                </div>
                <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No data available for this period
                </div>
            </div>
        )
    }

    // Chart dimensions - using square aspect for perfect circles
    const svgWidth = 800
    const svgHeight = 300
    const padding = { top: 20, right: 30, bottom: 40, left: 60 }
    const innerWidth = svgWidth - padding.left - padding.right
    const innerHeight = svgHeight - padding.top - padding.bottom

    // Find max/min values for scaling
    const allValues = chartData.flatMap(d => [d.phoneProfit, d.accessoryProfit, d.totalProfit])
    const maxValue = Math.max(...allValues, 1)
    const minValue = Math.min(...allValues.filter(v => v > 0), 0)
    const range = maxValue - minValue || 1

    // Generate points for each series
    const generatePoints = (dataKey) => {
        return chartData.map((d, i) => ({
            x: padding.left + (i / (chartData.length - 1 || 1)) * innerWidth,
            y: padding.top + innerHeight - ((d[dataKey] - minValue) / range) * innerHeight,
            value: d[dataKey],
            date: d.date,
            index: i
        }))
    }

    const phonePoints = generatePoints('phoneProfit')
    const accessoryPoints = generatePoints('accessoryProfit')
    const totalPoints = generatePoints('totalProfit')

    // Generate smooth SVG path from points
    const generatePath = (points) => {
        if (points.length < 2) return ''
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    }

    // Series configuration
    const series = [
        { key: 'phone', name: 'Phone Profit', points: phonePoints, color: '#3B82F6' },
        { key: 'accessory', name: 'Accessory Profit', points: accessoryPoints, color: '#10B981' },
        { key: 'total', name: 'Total Profit', points: totalPoints, color: '#EF4444' }
    ]

    // Y-axis labels (5 ticks)
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
        value: Math.round(minValue + range * pct),
        y: padding.top + innerHeight - (pct * innerHeight)
    }))

    // X-axis labels (max 7)
    const xLabelStep = Math.ceil(chartData.length / 7)
    const xLabels = chartData.filter((_, i) => i % xLabelStep === 0 || i === chartData.length - 1)

    return (
        <div className="card mb-6">
            {/* Header with Legend */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{title}</h3>
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
                    {series.map(s => (
                        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg width="24" height="12" style={{ overflow: 'visible' }}>
                                <line x1="0" y1="6" x2="16" y2="6" stroke={s.color} strokeWidth="2" />
                                <circle cx="20" cy="6" r="4" fill="white" stroke={s.color} strokeWidth="2" />
                            </svg>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{s.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chart Container */}
            <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
                <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    style={{
                        width: '100%',
                        height: '100%'
                    }}
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* Definitions for effects */}
                    <defs>
                        {/* Drop shadow for hover effect */}
                        <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3" />
                        </filter>
                    </defs>

                    {/* Grid lines - horizontal */}
                    {yTicks.map((tick, i) => (
                        <line
                            key={i}
                            x1={padding.left}
                            y1={tick.y}
                            x2={svgWidth - padding.right}
                            y2={tick.y}
                            stroke="#E5E7EB"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                        />
                    ))}

                    {/* Y-axis labels */}
                    {yTicks.map((tick, i) => (
                        <text
                            key={i}
                            x={padding.left - 10}
                            y={tick.y + 4}
                            textAnchor="end"
                            fill="#9CA3AF"
                            fontSize="11"
                            fontFamily="system-ui, -apple-system, sans-serif"
                        >
                            {tick.value >= 1000 ? `${(tick.value / 1000).toFixed(0)}k` : tick.value}
                        </text>
                    ))}

                    {/* X-axis labels */}
                    {xLabels.map((d, i) => {
                        const idx = chartData.indexOf(d)
                        const x = padding.left + (idx / (chartData.length - 1 || 1)) * innerWidth
                        return (
                            <text
                                key={i}
                                x={x}
                                y={svgHeight - 10}
                                textAnchor="middle"
                                fill="#9CA3AF"
                                fontSize="11"
                                fontFamily="system-ui, -apple-system, sans-serif"
                            >
                                {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </text>
                        )
                    })}

                    {/* Draw lines first (behind dots) */}
                    {series.map(s => (
                        <path
                            key={s.key}
                            d={generatePath(s.points)}
                            fill="none"
                            stroke={s.color}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ transition: 'all 0.3s ease' }}
                        />
                    ))}

                    {/* Draw dots on top */}
                    {series.map(s => (
                        s.points.map((p, i) => (
                            <g key={`${s.key}-${i}`}>
                                {/* White background circle for contrast */}
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={hoveredPoint?.key === s.key && hoveredPoint?.index === i ? 7 : 5}
                                    fill="white"
                                    stroke={s.color}
                                    strokeWidth="2.5"
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        filter: hoveredPoint?.key === s.key && hoveredPoint?.index === i ? 'url(#dotShadow)' : 'none'
                                    }}
                                    onMouseEnter={() => setHoveredPoint({ key: s.key, index: i, value: p.value, date: p.date, name: s.name, color: s.color })}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                />
                            </g>
                        ))
                    ))}
                </svg>

                {/* Tooltip */}
                {hoveredPoint && (
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'white',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        border: '1px solid #E5E7EB',
                        fontSize: '0.875rem',
                        zIndex: 10
                    }}>
                        <div style={{ fontWeight: 600, color: hoveredPoint.color, marginBottom: '0.25rem' }}>
                            {hoveredPoint.name}
                        </div>
                        <div style={{ color: '#374151' }}>
                            Rs. {hoveredPoint.value.toLocaleString()}
                        </div>
                        <div style={{ color: '#9CA3AF', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                            {new Date(hoveredPoint.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ProfitTrendChart
