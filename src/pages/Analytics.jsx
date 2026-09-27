import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { API_URL, handleUnauthorized } from '../api'

function Analytics() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user, logout } = useApp()

    const [hub, setHub] = useState(null)
    const [analytics, setAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)
    const [timeRange, setTimeRange] = useState('7d')

    useEffect(() => {
        if (!user) {
            navigate('/login')
            return
        }
        fetchAnalytics()
    }, [id, user, timeRange])

    const fetchAnalytics = async () => {
        try {
            const [hubRes, analyticsRes] = await Promise.all([
                fetch(`${API_URL}/api/hubs/${id}`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                }),
                fetch(`${API_URL}/api/analytics/${id}?range=${timeRange}`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                })
            ])

            if (handleUnauthorized(hubRes, logout, navigate)) return
            if (!hubRes.ok) throw new Error('Hub not found')

            const hubData = await hubRes.json()
            const analyticsData = await analyticsRes.json()

            setHub(hubData.hub)
            setAnalytics(analyticsData)
        } catch (error) {
            console.error('Failed to fetch analytics:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="page flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="spinner" />
            </div>
        )
    }

    if (!hub) {
        return (
            <div className="page flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-md">Hub Not Found</h1>
                    <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
                </div>
            </div>
        )
    }

    const totalViews = analytics?.totalViews || 0
    const totalClicks = analytics?.totalClicks || 0
    const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0
    const linkStats = analytics?.linkStats || []
    const dailyData = analytics?.dailyStats || []
    const deviceBreakdown = analytics?.deviceBreakdown || []

    return (
        <div className="page">
            {/* Navigation */}
            <nav className="navbar">
                <div className="navbar-content">
                    <Link to="/dashboard" className="btn btn-ghost">
                        ← Back to Dashboard
                    </Link>
                    <div className="flex gap-sm">
                        <button
                            onClick={() => window.location.href = `${API_URL}/api/analytics/${id}/export?format=csv&range=${timeRange}&authorization=${user?.token}`}
                            className="btn btn-secondary"
                        >
                            Export CSV
                        </button>
                        <Link to={`/hub/${id}/edit`} className="btn btn-secondary">
                            Edit Hub
                        </Link>
                        <a
                            href={`/h/${hub.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost"
                        >
                            View Live ↗
                        </a>
                    </div>
                </div>
            </nav>

            <div className="container py-xl">
                {/* Header */}
                <div className="flex justify-between items-start mb-xl">
                    <div>
                        <h1 className="text-3xl font-bold mb-sm">Analytics</h1>
                        <p className="text-secondary">{hub.title}</p>
                    </div>
                    <select
                        className="select"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        style={{ width: 'auto' }}
                    >
                        <option value="24h">Last 24 hours</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="all">All time</option>
                    </select>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-4 lg:grid-cols-4 mb-xl">
                    <div className="stat-card">
                        <p className="stat-card-label">Total Views</p>
                        <p className="stat-card-value">{totalViews.toLocaleString()}</p>
                    </div>
                    <div className="stat-card">
                        <p className="stat-card-label">Total Clicks</p>
                        <p className="stat-card-value">{totalClicks.toLocaleString()}</p>
                    </div>
                    <div className="stat-card">
                        <p className="stat-card-label">Click Rate</p>
                        <p className="stat-card-value">{ctr}%</p>
                    </div>
                    <div className="stat-card">
                        <p className="stat-card-label">Active Links</p>
                        <p className="stat-card-value">{linkStats.length}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 gap-lg">
                    {/* Daily Chart */}
                    <div className="chart-container">
                        <div className="chart-header">
                            <h3 className="chart-title">Views & Clicks Over Time</h3>
                        </div>
                        <div style={{ height: '250px' }}>
                            {dailyData.length > 0 ? (
                                <SimpleChart data={dailyData} />
                            ) : (
                                <div className="flex items-center justify-center text-tertiary" style={{ height: '100%' }}>
                                    No data available for this period
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Device Breakdown */}
                    <div className="chart-container">
                        <div className="chart-header">
                            <h3 className="chart-title">Device Breakdown</h3>
                        </div>
                        <div style={{ padding: 'var(--spacing-lg)' }}>
                            {deviceBreakdown.length > 0 ? (
                                <div className="flex flex-col gap-md">
                                    {deviceBreakdown.map(device => (
                                        <DeviceBar key={device.type} device={device} total={totalViews} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center text-tertiary" style={{ height: '150px' }}>
                                    No device data available
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Link Performance */}
                <div className="mt-xl">
                    <h2 className="text-xl font-semibold mb-lg">Link Performance</h2>

                    {linkStats.length === 0 ? (
                        <div className="card text-center py-xl">
                            <p className="text-tertiary">No link data available yet</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Link</th>
                                        <th>Clicks</th>
                                        <th>CTR</th>
                                        <th>Performance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {linkStats.sort((a, b) => b.clicks - a.clicks).map((link, index) => {
                                        const linkCtr = totalViews > 0 ? ((link.clicks / totalViews) * 100).toFixed(1) : 0
                                        const maxClicks = Math.max(...linkStats.map(l => l.clicks), 1)
                                        const barWidth = (link.clicks / maxClicks) * 100

                                        return (
                                            <tr key={link.id}>
                                                <td>
                                                    <div className="flex items-center gap-md">
                                                        <span style={{ fontSize: '1.25rem' }}>{link.icon || '🔗'}</span>
                                                        <div>
                                                            <p className="font-medium">{link.title}</p>
                                                            <p className="text-sm text-tertiary">{link.url}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="font-semibold">{link.clicks.toLocaleString()}</span>
                                                </td>
                                                <td>{linkCtr}%</td>
                                                <td style={{ width: '200px' }}>
                                                    <div style={{
                                                        height: '8px',
                                                        background: 'var(--color-bg-tertiary)',
                                                        borderRadius: 'var(--radius-full)',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            height: '100%',
                                                            width: `${barWidth}%`,
                                                            background: index === 0
                                                                ? 'var(--color-accent-primary)'
                                                                : 'var(--color-accent-tertiary)',
                                                            borderRadius: 'var(--radius-full)',
                                                            transition: 'width 0.5s ease'
                                                        }} />
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

                {/* Insights */}
                <div className="mt-xl">
                    <h2 className="text-xl font-semibold mb-lg">Insights</h2>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-lg">
                        <InsightCard
                            icon="🏆"
                            title="Top Performer"
                            value={linkStats[0]?.title || 'No data'}
                            subtitle={linkStats[0] ? `${linkStats[0].clicks} clicks` : ''}
                        />
                        <InsightCard
                            icon="📱"
                            title="Most Common Device"
                            value={deviceBreakdown[0]?.type || 'No data'}
                            subtitle={deviceBreakdown[0] ? `${((deviceBreakdown[0].count / totalViews) * 100).toFixed(0)}% of visits` : ''}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function SimpleChart({ data }) {
    const maxValue = Math.max(...data.map(d => Math.max(d.views, d.clicks)), 1)

    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            height: '100%',
            padding: 'var(--spacing-md) 0'
        }}>
            {data.map((day, index) => (
                <div key={index} className="flex flex-col items-center gap-sm" style={{ flex: 1 }}>
                    <div className="flex gap-xs items-end" style={{ height: '180px' }}>
                        <div
                            style={{
                                width: '12px',
                                height: `${(day.views / maxValue) * 100}%`,
                                background: 'var(--color-accent-tertiary)',
                                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                                minHeight: '4px'
                            }}
                            title={`${day.views} views`}
                        />
                        <div
                            style={{
                                width: '12px',
                                height: `${(day.clicks / maxValue) * 100}%`,
                                background: 'var(--color-accent-primary)',
                                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                                minHeight: '4px'
                            }}
                            title={`${day.clicks} clicks`}
                        />
                    </div>
                    <span className="text-xs text-tertiary">{day.label}</span>
                </div>
            ))}
        </div>
    )
}

function DeviceBar({ device, total }) {
    const percentage = total > 0 ? (device.count / total) * 100 : 0
    const icons = { desktop: '🖥️', mobile: '📱', tablet: '📱' }

    return (
        <div>
            <div className="flex justify-between items-center mb-xs">
                <span className="flex items-center gap-sm">
                    <span>{icons[device.type] || '📱'}</span>
                    <span style={{ textTransform: 'capitalize' }}>{device.type}</span>
                </span>
                <span className="text-secondary">{percentage.toFixed(0)}%</span>
            </div>
            <div style={{
                height: '8px',
                background: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%',
                    width: `${percentage}%`,
                    background: 'var(--color-accent-primary)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.5s ease'
                }} />
            </div>
        </div>
    )
}

function InsightCard({ icon, title, value, subtitle }) {
    return (
        <div className="card">
            <div className="flex items-start gap-md">
                <div style={{
                    fontSize: '2rem',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--color-accent-subtle)',
                    borderRadius: 'var(--radius-lg)'
                }}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-tertiary mb-xs">{title}</p>
                    <p className="font-semibold">{value}</p>
                    {subtitle && <p className="text-sm text-accent">{subtitle}</p>}
                </div>
            </div>
        </div>
    )
}

export default Analytics
