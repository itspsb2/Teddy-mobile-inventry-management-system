import { useState, useEffect, useId } from 'react'
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
    const chartId = useId()

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
            <div className="card chart-card mb-6">
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
            <div className="card chart-card mb-6">
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

    // Generate smooth SVG path from points (Catmull-Rom to Bezier)
    const generateSmoothPath = (points) => {
        if (points.length < 2) return ''
        const smoothing = 0.2
        return points.reduce((path, point, i, arr) => {
            if (i === 0) return `M ${point.x} ${point.y}`
            const prev = arr[i - 1]
            const prevPrev = arr[i - 2] || prev
            const next = arr[i + 1] || point
            const cp1x = prev.x + (point.x - prevPrev.x) * smoothing
            const cp1y = prev.y + (point.y - prevPrev.y) * smoothing
            const cp2x = point.x - (next.x - prev.x) * smoothing
            const cp2y = point.y - (next.y - prev.y) * smoothing
            return `${path} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`
        }, '')
    }

    const generateAreaPath = (points, baselineY) => {
        if (points.length < 2) return ''
        const smoothPath = generateSmoothPath(points)
        const last = points[points.length - 1]
        const first = points[0]
        return `${smoothPath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`
    }

    // Series configuration
    const series = [
        { key: 'phone', name: 'Phone Profit', points: phonePoints, color: 'var(--chart-phone)', gradient: `url(#${chartId}-phone-line)` },
        { key: 'accessory', name: 'Accessory Profit', points: accessoryPoints, color: 'var(--chart-accessory)', gradient: `url(#${chartId}-accessory-line)` },
        { key: 'total', name: 'Total Profit', points: totalPoints, color: 'var(--chart-total)', gradient: `url(#${chartId}-total-line)` }
    ]

    // Y-axis labels (5 ticks)
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
        value: Math.round(minValue + range * pct),
        y: padding.top + innerHeight - (pct * innerHeight)
    }))

    // X-axis labels (max 7)
    const xLabelStep = Math.ceil(chartData.length / 7)
    const xLabels = chartData.filter((_, i) => i % xLabelStep === 0 || i === chartData.length - 1)

    const baselineY = padding.top + innerHeight
    const totalAreaPath = generateAreaPath(totalPoints, baselineY)
    const tooltipLeft = hoveredPoint ? (hoveredPoint.x / svgWidth) * 100 : 0
    const tooltipTop = hoveredPoint ? (hoveredPoint.y / svgHeight) * 100 : 0
    const tooltipShiftX = tooltipLeft > 75 ? '-110%' : tooltipLeft < 25 ? '10%' : '-50%'
    const tooltipShiftY = tooltipTop < 25 ? '20%' : '-120%'

    return (
        <div className="card chart-card mb-6">
            {/* Header with Legend */}
            <div className="chart-header">
                <div className="chart-title">
                    <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{title}</h3>
                </div>
                {/* Legend */}
                <div className="chart-legend">
                    {series.map(s => (
                        <div key={s.key} className="chart-legend-item">
                            <span className="chart-legend-swatch" style={{ background: s.color }}></span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{s.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chart Container */}
            <div className="chart-container" style={{ height: `${height}px` }}>
                <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    style={{
                        width: '100%',
                        height: '100%'
                    }}
                    preserveAspectRatio="xMidYMid meet"
                    onMouseLeave={() => setHoveredPoint(null)}
                >
                    {/* Definitions for effects */}
                    <defs>
                        <linearGradient id={`${chartId}-phone-line`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="var(--chart-phone)" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="var(--chart-phone)" />
                        </linearGradient>
                        <linearGradient id={`${chartId}-accessory-line`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="var(--chart-accessory)" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="var(--chart-accessory)" />
                        </linearGradient>
                        <linearGradient id={`${chartId}-total-line`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="var(--chart-total)" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="var(--chart-total)" />
                        </linearGradient>
                        <linearGradient id={`${chartId}-total-area`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-total)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="var(--chart-total)" stopOpacity="0.04" />
                        </linearGradient>
                        <filter id={`${chartId}-dotShadow`} x="-50%" y="-50%" width="200%" height="200%">
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
                            stroke="var(--chart-grid)"
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
                            fill="var(--text-tertiary)"
                            fontSize="11"
                            fontFamily="var(--font-body)"
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
                            fill="var(--text-tertiary)"
                            fontSize="11"
                            fontFamily="var(--font-body)"
                        >
                            {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </text>
                    )
                })}

                    {/* Total area fill */}
                    <path
                        d={totalAreaPath}
                        fill={`url(#${chartId}-total-area)`}
                        opacity="0.85"
                    />

                    {/* Draw lines first (behind dots) */}
                    {series.map(s => (
                        <path
                            key={s.key}
                            d={generateSmoothPath(s.points)}
                            fill="none"
                            stroke={s.gradient}
                            strokeWidth={s.key === 'total' ? '3' : '2.5'}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ transition: 'all 0.3s ease' }}
                        />
                    ))}

                    {/* Hover guide */}
                    {hoveredPoint && (
                        <line
                            x1={hoveredPoint.x}
                            y1={padding.top}
                            x2={hoveredPoint.x}
                            y2={baselineY}
                            stroke="var(--chart-grid-strong)"
                            strokeDasharray="4,6"
                        />
                    )}

                    {/* Draw dots on top */}
                    {series.map(s => (
                        s.points.map((p, i) => (
                            <g key={`${s.key}-${i}`}>
                                {hoveredPoint?.key === s.key && hoveredPoint?.index === i && (
                                    <circle
                                        cx={p.x}
                                        cy={p.y}
                                        r="10"
                                        fill={s.color}
                                        opacity="0.15"
                                    />
                                )}
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
                                        filter: hoveredPoint?.key === s.key && hoveredPoint?.index === i ? `url(#${chartId}-dotShadow)` : 'none'
                                    }}
                                    onMouseEnter={() => setHoveredPoint({
                                        key: s.key,
                                        index: i,
                                        value: p.value,
                                        date: p.date,
                                        name: s.name,
                                        color: s.color,
                                        x: p.x,
                                        y: p.y
                                    })}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                />
                            </g>
                        ))
                    ))}
                </svg>

                {/* Tooltip */}
                {hoveredPoint && (
                    <div
                        className="chart-tooltip"
                        style={{
                            left: `${tooltipLeft}%`,
                            top: `${tooltipTop}%`,
                            transform: `translate(${tooltipShiftX}, ${tooltipShiftY})`
                        }}
                    >
                        <div style={{ fontWeight: 600, color: hoveredPoint.color, marginBottom: '0.25rem' }}>
                            {hoveredPoint.name}
                        </div>
                        <div style={{ color: 'var(--text-primary)' }}>
                            Rs. {hoveredPoint.value.toLocaleString()}
                        </div>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
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
