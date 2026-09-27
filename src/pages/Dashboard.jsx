import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { API_URL, handleUnauthorized } from '../api'

function Dashboard() {
    const { user, logout, addToast } = useApp()
    const navigate = useNavigate()
    const [hubs, setHubs] = useState([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalHubs: 0,
        totalClicks: 0,
        totalLinks: 0
    })
    const [sidebarOpen, setSidebarOpen] = useState(false)

    useEffect(() => {
        if (!user) {
            navigate('/login')
            return
        }
        fetchHubs()
    }, [user, navigate])

    const fetchHubs = async () => {
        try {
            const res = await fetch(`${API_URL}/api/hubs`, {
                headers: {
                    'Authorization': `Bearer ${user?.token}`
                }
            })
            if (handleUnauthorized(res, logout, navigate)) return
            const data = await res.json()
            setHubs(data.hubs || [])
            setStats({
                totalHubs: data.hubs?.length || 0,
                totalClicks: data.totalClicks || 0,
                totalLinks: data.totalLinks || 0
            })
        } catch (error) {
            console.error('Failed to fetch hubs:', error)
        } finally {
            setLoading(false)
        }
    }

    const deleteHub = async (hubId) => {
        if (!confirm('Are you sure you want to delete this hub?')) return

        try {
            const res = await fetch(`${API_URL}/api/hubs/${hubId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${user?.token}`
                }
            })

            if (res.ok) {
                setHubs(hubs.filter(h => h.id !== hubId))
                addToast('Hub deleted successfully')
            }
        } catch (error) {
            addToast('Failed to delete hub', 'error')
        }
    }

    const handleLogout = () => {
        logout()
        navigate('/')
    }

    if (!user) return null

    return (
        <div className="dashboard-layout">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="hide-desktop"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 'var(--z-modal)'
                    }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="flex items-center gap-sm">
                    <span style={{ fontSize: '1.5rem', color: 'var(--color-accent-primary)' }}>⚡</span>
                    <span className="font-bold text-lg">Smart Link Hub</span>
                </div>

                <nav className="sidebar-nav">
                    <Link to="/dashboard" className="sidebar-link active">
                        <span>📊</span>
                        Dashboard
                    </Link>
                    <Link to="/hub/new" className="sidebar-link">
                        <span>➕</span>
                        New Hub
                    </Link>
                </nav>

                <div style={{
                    marginTop: 'auto',
                    paddingTop: 'var(--spacing-xl)',
                    borderTop: '1px solid var(--color-border-secondary)'
                }}>
                    <div className="flex items-center gap-md mb-md">
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--color-accent-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-accent-primary)',
                            fontWeight: 'var(--font-weight-bold)'
                        }}>
                            {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <p className="font-medium">{user.name || 'User'}</p>
                            <p className="text-sm text-tertiary">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn btn-ghost" style={{ width: '100%' }}>
                        Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Mobile Header */}
                <div className="hide-desktop flex justify-between items-center mb-lg">
                    <button
                        className="btn btn-icon btn-ghost"
                        onClick={() => setSidebarOpen(true)}
                    >
                        ☰
                    </button>
                    <span className="font-bold">Dashboard</span>
                    <div style={{ width: '40px' }} />
                </div>

                {/* Page Header */}
                <div className="flex justify-between items-center mb-xl hide-mobile">
                    <div>
                        <h1 className="text-3xl font-bold">Dashboard</h1>
                        <p className="text-secondary">Manage your link hubs</p>
                    </div>
                    <Link to="/hub/new" className="btn btn-primary">
                        <span>+</span>
                        Create Hub
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 lg:grid-cols-3 mb-xl">
                    <div className="stat-card">
                        <p className="stat-card-label">Total Hubs</p>
                        <p className="stat-card-value">{stats.totalHubs}</p>
                    </div>
                    <div className="stat-card">
                        <p className="stat-card-label">Total Clicks</p>
                        <p className="stat-card-value">{stats.totalClicks}</p>
                    </div>
                    <div className="stat-card">
                        <p className="stat-card-label">Total Links</p>
                        <p className="stat-card-value">{stats.totalLinks}</p>
                    </div>
                </div>

                {/* Hubs List */}
                <div>
                    <h2 className="text-xl font-semibold mb-lg">Your Hubs</h2>

                    {loading ? (
                        <div className="flex justify-center py-xl">
                            <div className="spinner" />
                        </div>
                    ) : hubs.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🔗</div>
                            <h3 className="empty-state-title">No hubs yet</h3>
                            <p className="empty-state-description">
                                Create your first smart link hub to get started
                            </p>
                            <Link to="/hub/new" className="btn btn-primary">
                                Create Your First Hub
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-2">
                            {hubs.map(hub => (
                                <HubCard
                                    key={hub.id}
                                    hub={hub}
                                    onDelete={() => deleteHub(hub.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Mobile FAB */}
                <Link
                    to="/hub/new"
                    className="btn btn-primary hide-desktop"
                    style={{
                        position: 'fixed',
                        bottom: 'var(--spacing-lg)',
                        right: 'var(--spacing-lg)',
                        width: '56px',
                        height: '56px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '1.5rem',
                        boxShadow: 'var(--shadow-lg)'
                    }}
                >
                    +
                </Link>
            </main>
        </div>
    )
}

function HubCard({ hub, onDelete }) {
    const { user, addToast } = useApp()
    const [showQR, setShowQR] = useState(false)
    const [qrData, setQrData] = useState(null)
    const [loadingQR, setLoadingQR] = useState(false)
    const publicUrl = `${window.location.origin}/h/${hub.slug}`

    const copyUrl = () => {
        navigator.clipboard.writeText(publicUrl)
        addToast('URL copied to clipboard!')
    }

    const fetchQRCode = async () => {
        setLoadingQR(true)
        try {
            const res = await fetch(`${API_URL}/api/hubs/${hub.id}/qr`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            })
            const data = await res.json()
            setQrData(data)
            setShowQR(true)
        } catch (error) {
            addToast('Failed to generate QR code', 'error')
        } finally {
            setLoadingQR(false)
        }
    }

    const downloadQR = () => {
        if (!qrData?.qrCode) return
        const link = document.createElement('a')
        link.download = `${hub.slug}-qrcode.png`
        link.href = qrData.qrCode
        link.click()
    }

    return (
        <>
            <div className="hub-card">
                <div className="hub-card-header">
                    <h3 className="hub-card-title">{hub.title}</h3>
                    <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hub-card-slug"
                    >
                        /{hub.slug} ↗
                    </a>
                </div>
                <div className="hub-card-body">
                    <div className="hub-card-stats">
                        <div className="hub-card-stat">
                            <p className="hub-card-stat-value">{hub.clickCount || 0}</p>
                            <p className="hub-card-stat-label">Clicks</p>
                        </div>
                        <div className="hub-card-stat">
                            <p className="hub-card-stat-value">{hub.linkCount || 0}</p>
                            <p className="hub-card-stat-label">Links</p>
                        </div>
                    </div>
                    {hub.description && (
                        <p className="text-secondary text-sm" style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {hub.description}
                        </p>
                    )}
                </div>
                <div className="hub-card-footer">
                    <Link to={`/hub/${hub.id}/edit`} className="btn btn-ghost" style={{ flex: 1 }}>
                        Edit
                    </Link>
                    <Link to={`/hub/${hub.id}/analytics`} className="btn btn-ghost" style={{ flex: 1 }}>
                        Analytics
                    </Link>
                    <button onClick={fetchQRCode} className="btn btn-ghost" title="QR Code" disabled={loadingQR}>
                        {loadingQR ? '...' : '📱'}
                    </button>
                    <button onClick={copyUrl} className="btn btn-ghost" title="Copy URL">
                        📋
                    </button>
                    <button onClick={onDelete} className="btn btn-ghost" style={{ color: 'var(--color-error)' }} title="Delete">
                        🗑️
                    </button>
                </div>
            </div>

            {/* QR Code Modal */}
            {showQR && qrData && (
                <div className="modal-overlay" onClick={() => setShowQR(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">QR Code</h3>
                            <button onClick={() => setShowQR(false)} className="btn btn-ghost btn-icon">✕</button>
                        </div>
                        <div className="modal-body text-center">
                            <img
                                src={qrData.qrCode}
                                alt="QR Code"
                                style={{
                                    width: '250px',
                                    height: '250px',
                                    margin: '0 auto',
                                    borderRadius: 'var(--radius-lg)'
                                }}
                            />
                            <p className="text-secondary text-sm mt-lg" style={{ wordBreak: 'break-all' }}>
                                {qrData.url}
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowQR(false)} className="btn btn-ghost">Close</button>
                            <button onClick={downloadQR} className="btn btn-primary">Download PNG</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Dashboard

