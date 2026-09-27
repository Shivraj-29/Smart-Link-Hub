import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApp } from '../App'
import { API_URL, handleUnauthorized } from '../api'

function HubEditor() {
    const { id } = useParams()
    const isEditing = Boolean(id)
    const navigate = useNavigate()
    const { user, logout, addToast } = useApp()

    const [loading, setLoading] = useState(isEditing)
    const [saving, setSaving] = useState(false)

    // Hub data
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [description, setDescription] = useState('')
    const [theme, setTheme] = useState('default')
    const [links, setLinks] = useState([])

    // New link form
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [editingLink, setEditingLink] = useState(null)
    const [linkTitle, setLinkTitle] = useState('')
    const [linkUrl, setLinkUrl] = useState('')
    const [linkIcon, setLinkIcon] = useState('🔗')

    // Rules modal
    const [showRulesModal, setShowRulesModal] = useState(false)
    const [selectedLinkForRules, setSelectedLinkForRules] = useState(null)

    useEffect(() => {
        if (!user) {
            navigate('/login')
            return
        }

        if (isEditing) {
            fetchHub()
        }
    }, [id, user, navigate])

    const fetchHub = async () => {
        try {
            const res = await fetch(`${API_URL}/api/hubs/${id}`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            })
            if (handleUnauthorized(res, logout, navigate)) return
            if (!res.ok) throw new Error('Hub not found')
            const data = await res.json()
            setTitle(data.hub.title)
            setSlug(data.hub.slug)
            setDescription(data.hub.description || '')
            setTheme(data.hub.theme || 'default')
            setLinks(data.links || [])
        } catch (error) {
            addToast('Failed to load hub', 'error')
            navigate('/dashboard')
        } finally {
            setLoading(false)
        }
    }

    const generateSlug = (text) => {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
    }

    const handleTitleChange = (e) => {
        const newTitle = e.target.value
        setTitle(newTitle)
        if (!isEditing && !slug) {
            setSlug(generateSlug(newTitle))
        }
    }

    const saveHub = async () => {
        if (!title || !slug) {
            addToast('Title and slug are required', 'error')
            return
        }

        setSaving(true)
        try {
            const url = isEditing ? `${API_URL}/api/hubs/${id}` : `${API_URL}/api/hubs`
            const method = isEditing ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({
                    title,
                    slug,
                    description,
                    theme,
                    links
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to save')
            }

            const data = await res.json()
            addToast(isEditing ? 'Hub updated!' : 'Hub created!')
            navigate(`/hub/${data.hub.id}/edit`)
        } catch (error) {
            addToast(error.message, 'error')
        } finally {
            setSaving(false)
        }
    }

    const openLinkModal = (link = null) => {
        if (link) {
            setEditingLink(link)
            setLinkTitle(link.title)
            setLinkUrl(link.url)
            setLinkIcon(link.icon || '🔗')
        } else {
            setEditingLink(null)
            setLinkTitle('')
            setLinkUrl('')
            setLinkIcon('🔗')
        }
        setShowLinkModal(true)
    }

    const saveLink = async () => {
        if (!linkTitle || !linkUrl) {
            addToast('Title and URL are required', 'error')
            return
        }

        const newLink = {
            id: editingLink?.id || `temp-${Date.now()}`,
            title: linkTitle,
            url: linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`,
            icon: linkIcon,
            position: editingLink?.position ?? links.length,
            isActive: true,
            rules: editingLink?.rules || []
        }

        if (editingLink) {
            setLinks(links.map(l => l.id === editingLink.id ? newLink : l))
        } else {
            setLinks([...links, newLink])
        }

        setShowLinkModal(false)
    }

    const deleteLink = (linkId) => {
        setLinks(links.filter(l => l.id !== linkId))
    }

    const moveLink = (index, direction) => {
        const newLinks = [...links]
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= links.length) return
            ;[newLinks[index], newLinks[newIndex]] = [newLinks[newIndex], newLinks[index]]
        setLinks(newLinks.map((l, i) => ({ ...l, position: i })))
    }

    const toggleLinkActive = (linkId) => {
        setLinks(links.map(l =>
            l.id === linkId ? { ...l, isActive: !l.isActive } : l
        ))
    }

    const openRulesModal = (link) => {
        setSelectedLinkForRules(link)
        setShowRulesModal(true)
    }

    if (loading) {
        return (
            <div className="page flex items-center justify-center">
                <div className="spinner" />
            </div>
        )
    }

    return (
        <div className="page">
            {/* Header */}
            <nav className="navbar">
                <div className="navbar-content">
                    <Link to="/dashboard" className="btn btn-ghost">
                        ← Back to Dashboard
                    </Link>
                    <button
                        onClick={saveHub}
                        className="btn btn-primary"
                        disabled={saving}
                    >
                        {saving ? <span className="spinner" /> : (isEditing ? 'Save Changes' : 'Create Hub')}
                    </button>
                </div>
            </nav>

            <div className="container py-xl">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)' }}>
                    {/* Left: Editor */}
                    <div className="hide-mobile">
                        <h1 className="text-2xl font-bold mb-lg">
                            {isEditing ? 'Edit Hub' : 'Create New Hub'}
                        </h1>

                        {/* Hub Settings */}
                        <div className="card mb-lg">
                            <h2 className="text-lg font-semibold mb-md">Hub Settings</h2>

                            <div className="input-group mb-md">
                                <label className="input-label" htmlFor="title">Title *</label>
                                <input
                                    id="title"
                                    type="text"
                                    className="input"
                                    placeholder="My Awesome Links"
                                    value={title}
                                    onChange={handleTitleChange}
                                />
                            </div>

                            <div className="input-group mb-md">
                                <label className="input-label" htmlFor="slug">
                                    Slug *
                                    <span className="text-tertiary text-sm"> (yoursite.com/h/{slug || 'your-slug'})</span>
                                </label>
                                <input
                                    id="slug"
                                    type="text"
                                    className="input"
                                    placeholder="my-links"
                                    value={slug}
                                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                                />
                            </div>

                            <div className="input-group mb-md">
                                <label className="input-label" htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    className="input textarea"
                                    placeholder="A short description of your link hub"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label" htmlFor="theme">Theme</label>
                                <select
                                    id="theme"
                                    className="select"
                                    value={theme}
                                    onChange={(e) => setTheme(e.target.value)}
                                >
                                    <option value="default">Default (Black/Green)</option>
                                    <option value="midnight">Midnight Purple</option>
                                    <option value="ocean">Ocean Teal</option>
                                    <option value="sunset">Sunset Red</option>
                                </select>
                            </div>
                        </div>

                        {/* Links Management */}
                        <div className="card">
                            <div className="flex justify-between items-center mb-md">
                                <h2 className="text-lg font-semibold">Links</h2>
                                <button onClick={() => openLinkModal()} className="btn btn-primary">
                                    + Add Link
                                </button>
                            </div>

                            {links.length === 0 ? (
                                <div className="empty-state" style={{ padding: 'var(--spacing-xl)' }}>
                                    <p className="text-secondary">No links yet. Add your first link!</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-sm">
                                    {links.sort((a, b) => a.position - b.position).map((link, index) => (
                                        <LinkItem
                                            key={link.id}
                                            link={link}
                                            index={index}
                                            totalLinks={links.length}
                                            onEdit={() => openLinkModal(link)}
                                            onDelete={() => deleteLink(link.id)}
                                            onMove={(dir) => moveLink(index, dir)}
                                            onToggle={() => toggleLinkActive(link.id)}
                                            onRules={() => openRulesModal(link)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Preview */}
                    <div>
                        <h2 className="text-lg font-semibold mb-md">Preview</h2>
                        <div
                            className={`hub-theme-${theme}`}
                            style={{
                                background: 'var(--hub-bg, var(--color-bg-primary))',
                                borderRadius: 'var(--radius-xl)',
                                padding: 'var(--spacing-xl)',
                                minHeight: '500px',
                                border: '1px solid var(--color-border-primary)'
                            }}
                        >
                            <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
                                <h2 className="text-2xl font-bold mb-sm">{title || 'Your Hub Title'}</h2>
                                {description && (
                                    <p className="text-secondary mb-lg">{description}</p>
                                )}

                                <div className="flex flex-col gap-md">
                                    {links.filter(l => l.isActive).sort((a, b) => a.position - b.position).map(link => (
                                        <a
                                            key={link.id}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="link-card"
                                            style={{ textAlign: 'left' }}
                                        >
                                            <div className="link-card-icon">{link.icon}</div>
                                            <div className="link-card-content">
                                                <p className="link-card-title">{link.title}</p>
                                                <p className="link-card-url">{link.url}</p>
                                            </div>
                                            <span className="link-card-arrow">→</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile: Single Column Layout */}
                    <div className="hide-desktop" style={{ gridColumn: '1 / -1' }}>
                        {/* Mobile UI similar to desktop left panel */}
                    </div>
                </div>
            </div>

            {/* Link Modal */}
            {showLinkModal && (
                <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingLink ? 'Edit Link' : 'Add Link'}
                            </h3>
                            <button
                                onClick={() => setShowLinkModal(false)}
                                className="btn btn-ghost btn-icon"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group mb-md">
                                <label className="input-label">Icon</label>
                                <div className="flex gap-sm">
                                    {['🔗', '🌐', '📧', '📱', '💼', '🎵', '📸', '🎥', '📝', '🛒'].map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => setLinkIcon(emoji)}
                                            className={`btn btn-ghost btn-icon ${linkIcon === emoji ? 'active' : ''}`}
                                            style={{
                                                fontSize: '1.25rem',
                                                background: linkIcon === emoji ? 'var(--color-accent-subtle)' : undefined
                                            }}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="input-group mb-md">
                                <label className="input-label" htmlFor="link-title">Title *</label>
                                <input
                                    id="link-title"
                                    type="text"
                                    className="input"
                                    placeholder="My Website"
                                    value={linkTitle}
                                    onChange={(e) => setLinkTitle(e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label" htmlFor="link-url">URL *</label>
                                <input
                                    id="link-url"
                                    type="url"
                                    className="input"
                                    placeholder="https://example.com"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowLinkModal(false)} className="btn btn-ghost">
                                Cancel
                            </button>
                            <button onClick={saveLink} className="btn btn-primary">
                                {editingLink ? 'Save' : 'Add Link'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rules Modal */}
            {showRulesModal && selectedLinkForRules && (
                <RulesModal
                    link={selectedLinkForRules}
                    onClose={() => setShowRulesModal(false)}
                    onSave={(rules) => {
                        setLinks(links.map(l =>
                            l.id === selectedLinkForRules.id ? { ...l, rules } : l
                        ))
                        setShowRulesModal(false)
                    }}
                />
            )}
        </div>
    )
}

function LinkItem({ link, index, totalLinks, onEdit, onDelete, onMove, onToggle, onRules }) {
    return (
        <div className="card" style={{
            padding: 'var(--spacing-md)',
            opacity: link.isActive ? 1 : 0.5
        }}>
            <div className="flex items-center gap-md">
                <div className="flex flex-col gap-xs">
                    <button
                        onClick={() => onMove(-1)}
                        disabled={index === 0}
                        className="btn btn-ghost"
                        style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                    >
                        ▲
                    </button>
                    <button
                        onClick={() => onMove(1)}
                        disabled={index === totalLinks - 1}
                        className="btn btn-ghost"
                        style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                    >
                        ▼
                    </button>
                </div>

                <div style={{ fontSize: '1.5rem' }}>{link.icon}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-medium">{link.title}</p>
                    <p className="text-sm text-tertiary" style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {link.url}
                    </p>
                    {link.rules?.length > 0 && (
                        <span className="badge" style={{ marginTop: 'var(--spacing-xs)' }}>
                            {link.rules.length} rule{link.rules.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <label className="switch">
                    <input
                        type="checkbox"
                        checked={link.isActive}
                        onChange={onToggle}
                    />
                    <span className="switch-slider" />
                </label>

                <button onClick={onRules} className="btn btn-ghost btn-icon" title="Rules">
                    ⚙️
                </button>
                <button onClick={onEdit} className="btn btn-ghost btn-icon" title="Edit">
                    ✏️
                </button>
                <button
                    onClick={onDelete}
                    className="btn btn-ghost btn-icon"
                    style={{ color: 'var(--color-error)' }}
                    title="Delete"
                >
                    🗑️
                </button>
            </div>
        </div>
    )
}

function RulesModal({ link, onClose, onSave }) {
    const [rules, setRules] = useState(link.rules || [])

    const addRule = (type) => {
        const newRule = {
            id: `rule-${Date.now()}`,
            type,
            config: getDefaultConfig(type)
        }
        setRules([...rules, newRule])
    }

    const getDefaultConfig = (type) => {
        switch (type) {
            case 'time':
                return { startHour: 9, endHour: 17 }
            case 'device':
                return { devices: ['desktop', 'mobile', 'tablet'] }
            case 'location':
                return { countries: [] }
            case 'performance':
                return { minClicks: 0, boostFactor: 1 }
            default:
                return {}
        }
    }

    const updateRule = (ruleId, config) => {
        setRules(rules.map(r => r.id === ruleId ? { ...r, config } : r))
    }

    const removeRule = (ruleId) => {
        setRules(rules.filter(r => r.id !== ruleId))
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">Display Rules for "{link.title}"</h3>
                    <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
                </div>
                <div className="modal-body">
                    <p className="text-secondary mb-lg">
                        Add rules to control when this link is displayed. If no rules are set, the link will always be shown.
                    </p>

                    {/* Add Rule Buttons */}
                    <div className="flex gap-sm mb-lg flex-wrap">
                        <button onClick={() => addRule('time')} className="btn btn-secondary">
                            🕐 Time-Based
                        </button>
                        <button onClick={() => addRule('device')} className="btn btn-secondary">
                            📱 Device-Based
                        </button>
                        <button onClick={() => addRule('location')} className="btn btn-secondary">
                            🌍 Location-Based
                        </button>
                    </div>

                    {/* Rules List */}
                    {rules.length === 0 ? (
                        <p className="text-tertiary text-center py-lg">
                            No rules configured. This link will always be shown.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-md">
                            {rules.map(rule => (
                                <RuleEditor
                                    key={rule.id}
                                    rule={rule}
                                    onUpdate={(config) => updateRule(rule.id, config)}
                                    onRemove={() => removeRule(rule.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button onClick={() => onSave(rules)} className="btn btn-primary">Save Rules</button>
                </div>
            </div>
        </div>
    )
}

function RuleEditor({ rule, onUpdate, onRemove }) {
    const { type, config } = rule

    return (
        <div className="card" style={{ padding: 'var(--spacing-md)' }}>
            <div className="flex justify-between items-center mb-md">
                <span className="badge">
                    {type === 'time' && '🕐 Time-Based'}
                    {type === 'device' && '📱 Device-Based'}
                    {type === 'location' && '🌍 Location-Based'}
                </span>
                <button
                    onClick={onRemove}
                    className="btn btn-ghost btn-icon"
                    style={{ color: 'var(--color-error)' }}
                >
                    ✕
                </button>
            </div>

            {type === 'time' && (
                <div className="flex gap-md items-center">
                    <div className="input-group" style={{ flex: 1 }}>
                        <label className="input-label">Start Hour</label>
                        <select
                            className="select"
                            value={config.startHour}
                            onChange={(e) => onUpdate({ ...config, startHour: parseInt(e.target.value) })}
                        >
                            {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                            ))}
                        </select>
                    </div>
                    <span className="text-tertiary">to</span>
                    <div className="input-group" style={{ flex: 1 }}>
                        <label className="input-label">End Hour</label>
                        <select
                            className="select"
                            value={config.endHour}
                            onChange={(e) => onUpdate({ ...config, endHour: parseInt(e.target.value) })}
                        >
                            {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {type === 'device' && (
                <div className="flex gap-md">
                    {['desktop', 'mobile', 'tablet'].map(device => (
                        <label key={device} className="flex items-center gap-sm">
                            <input
                                type="checkbox"
                                checked={config.devices?.includes(device)}
                                onChange={(e) => {
                                    const devices = e.target.checked
                                        ? [...(config.devices || []), device]
                                        : (config.devices || []).filter(d => d !== device)
                                    onUpdate({ ...config, devices })
                                }}
                            />
                            <span style={{ textTransform: 'capitalize' }}>{device}</span>
                        </label>
                    ))}
                </div>
            )}

            {type === 'location' && (
                <div className="input-group">
                    <label className="input-label">Countries (comma-separated codes)</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="US, UK, CA"
                        value={config.countries?.join(', ') || ''}
                        onChange={(e) => {
                            const countries = e.target.value.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
                            onUpdate({ ...config, countries })
                        }}
                    />
                </div>
            )}
        </div>
    )
}

export default HubEditor
