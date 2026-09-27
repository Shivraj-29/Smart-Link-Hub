import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import geoip from 'geoip-lite'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'
import QRCode from 'qrcode'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { Pool } = pg
const NODE_ENV = process.env.NODE_ENV || 'development'
const isProd = NODE_ENV === 'production'

// ---------------------------------------------------------------------------
// Config / secrets
// ---------------------------------------------------------------------------
let JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
    if (isProd) {
        console.error('FATAL: JWT_SECRET environment variable is required in production.')
        process.exit(1)
    }
    // Dev-only fallback so `npm run server` still works out of the box.
    // Sessions won't survive a restart, and this must never be used in production.
    console.warn('WARNING: JWT_SECRET not set — using a random dev-only secret. Set JWT_SECRET in your .env for real use.')
    JWT_SECRET = uuidv4() + uuidv4()
}

if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is required.')
    process.exit(1)
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = express()

// Required so req.ip / req.protocol / rate-limiting reflect the real client
// when running behind AWS ALB / CloudFront / any reverse proxy.
app.set('trust proxy', 1)

app.use(helmet({ contentSecurityPolicy: false }))
app.use(compression())

// CORS: supports a comma-separated FRONTEND_URL list ("*" + credentials is
// invalid per the CORS spec, so we validate explicit origins instead).
const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true) // same-origin, curl, mobile apps
        if (allowedOrigins.length === 0) return callback(null, true) // dev default: allow all
        if (allowedOrigins.includes(origin)) return callback(null, true)
        return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}
app.use(cors(corsOptions))
app.use(express.json({ limit: '1mb' }))

// Initializing PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProd ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX || '10', 10)
})
pool.on('error', (err) => console.error('Unexpected idle client error', err))

// Creating tables
const initDB = async () => {
    const client = await pool.connect()
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS hubs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                slug TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                theme TEXT DEFAULT 'default',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS links (
                id TEXT PRIMARY KEY,
                hub_id TEXT NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                icon TEXT DEFAULT '🔗',
                position INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS rules (
                id TEXT PRIMARY KEY,
                link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
                rule_type TEXT NOT NULL,
                rule_config TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS analytics (
                id TEXT PRIMARY KEY,
                hub_id TEXT NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
                link_id TEXT,
                event_type TEXT NOT NULL,
                device_type TEXT,
                location TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_hubs_user_id ON hubs(user_id);
            CREATE INDEX IF NOT EXISTS idx_links_hub_id ON links(hub_id);
            CREATE INDEX IF NOT EXISTS idx_rules_link_id ON rules(link_id);
            CREATE INDEX IF NOT EXISTS idx_analytics_hub_id ON analytics(hub_id);
            CREATE INDEX IF NOT EXISTS idx_analytics_hub_event_time ON analytics(hub_id, event_type, timestamp);
        `)
        console.log('Database tables initialized')
    } finally {
        client.release()
    }
}

initDB().catch(err => {
    console.error('Database init error:', err)
    process.exit(1)
})

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const signToken = (userId) =>
    jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' })

// Stricter limiter for auth endpoints to slow down credential stuffing / brute force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again in a few minutes.' }
})

// General API limiter as a baseline safety net
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' }
})
app.use('/api/', apiLimiter)

const authenticate = async (req, res, next) => {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7) : req.query.authorization

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET)
        const result = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [payload.sub])
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Unauthorized' })
        }
        req.user = result.rows[0]
        next()
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired session, please log in again' })
    }
}

const isValidUrl = (value) => {
    try {
        const u = new URL(value)
        return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
        return false
    }
}

const detectDeviceType = (userAgent = '') => {
    const ua = userAgent.toLowerCase()
    if (/ipad|tablet(?!.*mobile)/.test(ua)) return 'tablet'
    if (/mobi|android|iphone|ipod/.test(ua)) return 'mobile'
    return 'desktop'
}

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

// ---------------------------------------------------------------------------
// Health check (for AWS ALB / ECS / EB health checks)
// ---------------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1')
        res.json({ status: 'ok', timestamp: new Date().toISOString() })
    } catch (error) {
        res.status(503).json({ status: 'error', error: 'Database unreachable' })
    }
})

// ---------------------------------------------------------------------------
// Authentication Routes
// ---------------------------------------------------------------------------

app.post('/api/auth/register', authLimiter, async (req, res) => {
    let { email, password, name } = req.body
    email = (email || '').trim().toLowerCase()
    name = (name || '').trim()

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
    }
    if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' })
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    try {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' })
        }

        const id = uuidv4()
        const hashedPassword = await bcrypt.hash(password, 10)

        await pool.query(
            'INSERT INTO users (id, email, password, name) VALUES ($1, $2, $3, $4)',
            [id, email, hashedPassword, name || null]
        )

        res.json({
            user: { id, email, name },
            token: signToken(id)
        })
    } catch (error) {
        console.error('Register error:', error)
        res.status(500).json({ error: 'Registration failed' })
    }
})

app.post('/api/auth/login', authLimiter, async (req, res) => {
    let { email, password } = req.body
    email = (email || '').trim().toLowerCase()

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
        const user = result.rows[0]

        // Only accept bcrypt hashes ($2a$/$2b$ prefix). Any legacy base64 hash
        // from before this change will safely fail and require a password reset.
        const passwordOk = user && (await bcrypt.compare(password, user.password).catch(() => false))

        if (!user || !passwordOk) {
            return res.status(401).json({ error: 'Invalid email or password' })
        }

        res.json({
            user: { id: user.id, email: user.email, name: user.name },
            token: signToken(user.id)
        })
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ error: 'Login failed' })
    }
})

// ---------------------------------------------------------------------------
// Hub Routes
// ---------------------------------------------------------------------------

app.get('/api/hubs', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT h.*, 
                   COUNT(DISTINCT l.id) as "linkCount",
                   (SELECT COUNT(*) FROM analytics WHERE hub_id = h.id AND event_type = 'click') as "clickCount"
            FROM hubs h
            LEFT JOIN links l ON l.hub_id = h.id
            WHERE h.user_id = $1
            GROUP BY h.id
            ORDER BY h.created_at DESC
        `, [req.user.id])

        const hubs = result.rows
        const totalClicks = hubs.reduce((sum, h) => sum + parseInt(h.clickCount || 0), 0)
        const totalLinks = hubs.reduce((sum, h) => sum + parseInt(h.linkCount || 0), 0)

        res.json({ hubs, totalClicks, totalLinks })
    } catch (error) {
        console.error('Get hubs error:', error)
        res.status(500).json({ error: 'Failed to get hubs' })
    }
})

app.post('/api/hubs', authenticate, async (req, res) => {
    const { title, description, theme, links } = req.body
    let { slug } = req.body

    if (!title || !slug) {
        return res.status(400).json({ error: 'Title and slug are required' })
    }
    slug = slug.trim().toLowerCase()
    if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ error: 'Slug can only contain lowercase letters, numbers and hyphens' })
    }
    if (title.length > 200) {
        return res.status(400).json({ error: 'Title is too long' })
    }
    if (links?.some(l => !isValidUrl(l.url))) {
        return res.status(400).json({ error: 'One or more links have an invalid URL' })
    }

    const client = await pool.connect()
    try {
        await client.query('BEGIN')

        const existing = await client.query('SELECT id FROM hubs WHERE slug = $1', [slug])
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK')
            return res.status(400).json({ error: 'Slug already taken' })
        }

        const hubId = uuidv4()

        await client.query(
            'INSERT INTO hubs (id, user_id, slug, title, description, theme) VALUES ($1, $2, $3, $4, $5, $6)',
            [hubId, req.user.id, slug, title, description || null, theme || 'default']
        )

        // Inserting links
        if (links && links.length > 0) {
            for (const link of links) {
                const linkId = uuidv4()
                await client.query(
                    'INSERT INTO links (id, hub_id, title, url, icon, position, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [linkId, hubId, link.title, link.url, link.icon || '🔗', link.position ?? 0, link.isActive !== false]
                )

                // Inserting rules for the link
                if (link.rules && link.rules.length > 0) {
                    for (const rule of link.rules) {
                        await client.query(
                            'INSERT INTO rules (id, link_id, rule_type, rule_config) VALUES ($1, $2, $3, $4)',
                            [uuidv4(), linkId, rule.type, JSON.stringify(rule.config)]
                        )
                    }
                }
            }
        }

        await client.query('COMMIT')
        res.json({ hub: { id: hubId, slug, title, description, theme } })
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('Create hub error:', error)
        res.status(500).json({ error: 'Failed to create hub' })
    } finally {
        client.release()
    }
})

app.get('/api/hubs/:id', authenticate, async (req, res) => {
    try {
        const hubResult = await pool.query(
            'SELECT * FROM hubs WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        )

        if (hubResult.rows.length === 0) {
            return res.status(404).json({ error: 'Hub not found' })
        }

        const hub = hubResult.rows[0]

        const linksResult = await pool.query(`
            SELECT l.*, 
                   COALESCE(
                       (SELECT json_agg(json_build_object('id', r.id, 'type', r.rule_type, 'config', r.rule_config))
                        FROM rules r WHERE r.link_id = l.id),
                       '[]'::json
                   ) as rules_json
            FROM links l
            WHERE l.hub_id = $1
            ORDER BY l.position ASC
        `, [hub.id])

        // Parsing rules using JSON
        const linksWithRules = linksResult.rows.map(link => ({
            ...link,
            isActive: link.is_active,
            rules: (link.rules_json || []).filter(r => r && r.id).map(r => ({
                ...r,
                config: typeof r.config === 'string' ? JSON.parse(r.config) : r.config
            }))
        }))

        res.json({ hub, links: linksWithRules })
    } catch (error) {
        console.error('Get hub error:', error)
        res.status(500).json({ error: 'Failed to get hub' })
    }
})

app.put('/api/hubs/:id', authenticate, async (req, res) => {
    const { title, description, theme, links } = req.body
    let { slug } = req.body
    const hubId = req.params.id

    if (!title || !slug) {
        return res.status(400).json({ error: 'Title and slug are required' })
    }
    slug = slug.trim().toLowerCase()
    if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ error: 'Slug can only contain lowercase letters, numbers and hyphens' })
    }
    if (links?.some(l => !isValidUrl(l.url))) {
        return res.status(400).json({ error: 'One or more links have an invalid URL' })
    }

    const client = await pool.connect()
    try {
        await client.query('BEGIN')

        const hubResult = await client.query(
            'SELECT * FROM hubs WHERE id = $1 AND user_id = $2',
            [hubId, req.user.id]
        )

        if (hubResult.rows.length === 0) {
            await client.query('ROLLBACK')
            return res.status(404).json({ error: 'Hub not found' })
        }

        const hub = hubResult.rows[0]

        // Checking slug uniqueness (excluding current hub)
        if (slug && slug !== hub.slug) {
            const existing = await client.query(
                'SELECT id FROM hubs WHERE slug = $1 AND id != $2',
                [slug, hubId]
            )
            if (existing.rows.length > 0) {
                await client.query('ROLLBACK')
                return res.status(400).json({ error: 'Slug already taken' })
            }
        }

        // Updating hub
        await client.query(
            'UPDATE hubs SET title = $1, slug = $2, description = $3, theme = $4 WHERE id = $5',
            [title, slug, description, theme, hubId]
        )

        // Updating links: preserve existing link IDs (so analytics history stays
        // linked) instead of deleting and re-inserting everything on every save.
        if (links) {
            const existingLinksResult = await client.query('SELECT id FROM links WHERE hub_id = $1', [hubId])
            const existingIds = new Set(existingLinksResult.rows.map(r => r.id))
            const keptIds = new Set()

            for (let i = 0; i < links.length; i++) {
                const link = links[i]
                const isExisting = Boolean(link.id) && existingIds.has(link.id)
                const linkId = isExisting ? link.id : uuidv4()
                keptIds.add(linkId)

                if (isExisting) {
                    await client.query(
                        'UPDATE links SET title = $1, url = $2, icon = $3, position = $4, is_active = $5 WHERE id = $6',
                        [link.title, link.url, link.icon || '🔗', link.position ?? i, link.isActive !== false, linkId]
                    )
                    await client.query('DELETE FROM rules WHERE link_id = $1', [linkId])
                } else {
                    await client.query(
                        'INSERT INTO links (id, hub_id, title, url, icon, position, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                        [linkId, hubId, link.title, link.url, link.icon || '🔗', link.position ?? i, link.isActive !== false]
                    )
                }

                if (link.rules && link.rules.length > 0) {
                    for (const rule of link.rules) {
                        await client.query(
                            'INSERT INTO rules (id, link_id, rule_type, rule_config) VALUES ($1, $2, $3, $4)',
                            [uuidv4(), linkId, rule.type, JSON.stringify(rule.config)]
                        )
                    }
                }
            }

            // Remove links the user deleted in the editor
            const idsToDelete = [...existingIds].filter(id => !keptIds.has(id))
            if (idsToDelete.length > 0) {
                await client.query('DELETE FROM links WHERE id = ANY($1::text[])', [idsToDelete])
            }
        }

        await client.query('COMMIT')
        res.json({ hub: { id: hubId, slug, title, description, theme } })
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('Update hub error:', error)
        res.status(500).json({ error: 'Failed to update hub' })
    } finally {
        client.release()
    }
})

app.delete('/api/hubs/:id', authenticate, async (req, res) => {
    try {
        const hubResult = await pool.query(
            'SELECT id FROM hubs WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        )

        if (hubResult.rows.length === 0) {
            return res.status(404).json({ error: 'Hub not found' })
        }

        await pool.query('DELETE FROM hubs WHERE id = $1', [req.params.id])
        res.json({ success: true })
    } catch (error) {
        console.error('Delete hub error:', error)
        res.status(500).json({ error: 'Failed to delete hub' })
    }
})

// ---------------------------------------------------------------------------
// Public Hub Route
// ---------------------------------------------------------------------------

app.get('/api/public/:slug', async (req, res) => {
    try {
        const hubResult = await pool.query('SELECT * FROM hubs WHERE slug = $1', [req.params.slug])

        if (hubResult.rows.length === 0) {
            return res.status(404).json({ error: 'Hub not found' })
        }

        const hub = hubResult.rows[0]

        const linksResult = await pool.query(`
            SELECT l.*, 
                   COALESCE(
                       (SELECT json_agg(json_build_object('type', r.rule_type, 'config', r.rule_config))
                        FROM rules r WHERE r.link_id = l.id),
                       '[]'::json
                   ) as rules_json
            FROM links l
            WHERE l.hub_id = $1 AND l.is_active = true
            ORDER BY l.position ASC
        `, [hub.id])

        // Device type is derived server-side from the User-Agent header, so it
        // can't be spoofed by a client-supplied query param and works even
        // though the frontend doesn't pass one.
        const deviceType = detectDeviceType(req.headers['user-agent'])
        const currentHour = new Date().getHours()
        const geo = geoip.lookup(req.ip)
        const visitorCountry = geo?.country || null

        const filteredLinks = linksResult.rows.filter(link => {
            const rules = (link.rules_json || []).filter(r => r && r.type)

            // If no rules, always show
            if (rules.length === 0) return true

            // Checking each rule
            for (const rule of rules) {
                const config = typeof rule.config === 'string' ? JSON.parse(rule.config) : rule.config

                // Time based rule
                if (rule.type === 'time') {
                    const { startHour, endHour } = config
                    if (currentHour < startHour || currentHour >= endHour) {
                        return false
                    }
                }

                // Device based rule
                if (rule.type === 'device') {
                    const { devices } = config
                    if (devices && devices.length > 0 && !devices.includes(deviceType)) {
                        return false
                    }
                }

                // Location based rule (best-effort: geoip-lite is an offline
                // lookup and may not resolve local/dev/VPN IPs)
                if (rule.type === 'location') {
                    const { countries } = config
                    if (countries && countries.length > 0) {
                        if (!visitorCountry || !countries.includes(visitorCountry)) {
                            return false
                        }
                    }
                }
            }

            return true
        })

        res.json({
            hub: {
                title: hub.title,
                description: hub.description,
                theme: hub.theme,
                slug: hub.slug
            },
            links: filteredLinks.map(l => ({
                id: l.id,
                title: l.title,
                url: l.url,
                icon: l.icon
            }))
        })
    } catch (error) {
        console.error('Get public hub error:', error)
        res.status(500).json({ error: 'Failed to get hub' })
    }
})

// ---------------------------------------------------------------------------
// Analytics Routes
// ---------------------------------------------------------------------------

app.post('/api/analytics/track', async (req, res) => {
    const { slug, linkId, eventType, deviceType, timestamp } = req.body

    if (!slug || !['visit', 'click'].includes(eventType)) {
        return res.status(400).json({ error: 'Invalid tracking payload' })
    }

    try {
        const hubResult = await pool.query('SELECT id FROM hubs WHERE slug = $1', [slug])
        if (hubResult.rows.length === 0) {
            return res.status(404).json({ error: 'Hub not found' })
        }

        await pool.query(
            'INSERT INTO analytics (id, hub_id, link_id, event_type, device_type, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
            [uuidv4(), hubResult.rows[0].id, linkId || null, eventType, deviceType || null, timestamp || new Date().toISOString()]
        )

        res.json({ success: true })
    } catch (error) {
        console.error('Track analytics error:', error)
        res.status(500).json({ error: 'Failed to track analytics' })
    }
})

const buildDateFilter = (range, alias = '') => {
    const col = alias ? `${alias}.timestamp` : 'timestamp'
    if (range === '24h') return `AND ${col} >= NOW() - INTERVAL '1 day'`
    if (range === '7d') return `AND ${col} >= NOW() - INTERVAL '7 days'`
    if (range === '30d') return `AND ${col} >= NOW() - INTERVAL '30 days'`
    return ''
}

app.get('/api/analytics/:hubId', authenticate, async (req, res) => {
    const hubId = req.params.hubId
    const range = req.query.range || '7d'

    try {
        const hubResult = await pool.query(
            'SELECT * FROM hubs WHERE id = $1 AND user_id = $2',
            [hubId, req.user.id]
        )

        if (hubResult.rows.length === 0) {
            return res.status(404).json({ error: 'Hub not found' })
        }

        const dateFilter = buildDateFilter(range)
        const dateFilterAnalytics = buildDateFilter(range, 'a')

        const viewsResult = await pool.query(`
            SELECT COUNT(*) as count FROM analytics 
            WHERE hub_id = $1 AND event_type = 'visit' ${dateFilter}
        `, [hubId])
        const totalViews = parseInt(viewsResult.rows[0]?.count || 0)

        const clicksResult = await pool.query(`
            SELECT COUNT(*) as count FROM analytics 
            WHERE hub_id = $1 AND event_type = 'click' ${dateFilter}
        `, [hubId])
        const totalClicks = parseInt(clicksResult.rows[0]?.count || 0)

        const linkStatsResult = await pool.query(`
            SELECT l.id, l.title, l.url, l.icon, COUNT(a.id) as clicks
            FROM links l
            LEFT JOIN analytics a ON a.link_id = l.id AND a.event_type = 'click' ${dateFilterAnalytics}
            WHERE l.hub_id = $1
            GROUP BY l.id
            ORDER BY clicks DESC
        `, [hubId])

        const deviceResult = await pool.query(`
            SELECT device_type as type, COUNT(*) as count
            FROM analytics
            WHERE hub_id = $1 AND event_type = 'visit' ${dateFilter}
            GROUP BY device_type
            ORDER BY count DESC
        `, [hubId])

        const dailyResult = await pool.query(`
            SELECT 
                DATE(timestamp) as date,
                SUM(CASE WHEN event_type = 'visit' THEN 1 ELSE 0 END) as views,
                SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicks
            FROM analytics
            WHERE hub_id = $1 ${dateFilter}
            GROUP BY DATE(timestamp)
            ORDER BY date DESC
            LIMIT 7
        `, [hubId])

        const formattedDailyStats = dailyResult.rows.reverse().map(d => ({
            ...d,
            views: parseInt(d.views),
            clicks: parseInt(d.clicks),
            label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })
        }))

        res.json({
            totalViews,
            totalClicks,
            linkStats: linkStatsResult.rows.map(l => ({ ...l, clicks: parseInt(l.clicks) })),
            deviceBreakdown: deviceResult.rows.map(d => ({ ...d, count: parseInt(d.count) })),
            dailyStats: formattedDailyStats
        })
    } catch (error) {
        console.error('Get analytics error:', error)
        res.status(500).json({ error: 'Failed to get analytics' })
    }
})

// ---------------------------------------------------------------------------
// QR code generation
// ---------------------------------------------------------------------------

app.get('/api/hubs/:id/qr', authenticate, async (req, res) => {
    try {
        const hubResult = await pool.query(
            'SELECT * FROM hubs WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        )

        if (hubResult.rows.length === 0) {
            return res.status(404).json({ error: 'Hub not found' })
        }

        const hub = hubResult.rows[0]
        const format = req.query.format || 'png'
        const size = Math.min(Math.max(parseInt(req.query.size) || 300, 64), 1024)
        const publicOrigin = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
        const publicUrl = `${publicOrigin}/h/${hub.slug}`

        if (format === 'svg') {
            const svg = await QRCode.toString(publicUrl, {
                type: 'svg',
                width: size,
                margin: 2,
                color: { dark: '#00ff88', light: '#000000' }
            })
            res.setHeader('Content-Type', 'image/svg+xml')
            res.send(svg)
        } else {
            const png = await QRCode.toDataURL(publicUrl, {
                width: size,
                margin: 2,
                color: { dark: '#00ff88', light: '#000000' }
            })
            res.json({ qrCode: png, url: publicUrl })
        }
    } catch (error) {
        console.error('QR code error:', error)
        res.status(500).json({ error: 'Failed to generate QR code' })
    }
})

// ---------------------------------------------------------------------------
// Analytics export
// ---------------------------------------------------------------------------

app.get('/api/analytics/:hubId/export', authenticate, async (req, res) => {
    const hubId = req.params.hubId
    const format = req.query.format || 'json'
    const range = req.query.range || 'all'

    try {
        const hubResult = await pool.query(
            'SELECT * FROM hubs WHERE id = $1 AND user_id = $2',
            [hubId, req.user.id]
        )

        if (hubResult.rows.length === 0) {
            return res.status(404).json({ error: 'Hub not found' })
        }

        const hub = hubResult.rows[0]
        const dateFilter = buildDateFilter(range)
        const dateFilterAnalytics = buildDateFilter(range, 'a')

        const analyticsResult = await pool.query(`
            SELECT 
                a.event_type,
                a.device_type,
                a.timestamp,
                l.title as link_title,
                l.url as link_url
            FROM analytics a
            LEFT JOIN links l ON l.id = a.link_id
            WHERE a.hub_id = $1 ${dateFilter}
            ORDER BY a.timestamp DESC
        `, [hubId])

        const analyticsData = analyticsResult.rows
        const totalViews = analyticsData.filter(a => a.event_type === 'visit').length
        const totalClicks = analyticsData.filter(a => a.event_type === 'click').length

        const linkStatsResult = await pool.query(`
            SELECT l.title, l.url, COUNT(a.id) as clicks
            FROM links l
            LEFT JOIN analytics a ON a.link_id = l.id AND a.event_type = 'click' ${dateFilterAnalytics}
            WHERE l.hub_id = $1
            GROUP BY l.id, l.title, l.url
            ORDER BY clicks DESC
        `, [hubId])

        if (format === 'csv') {
            let csv = 'Smart Link Hub Analytics Report\n'
            csv += `Hub: ${csvEscape(hub.title)}\n`
            csv += `Slug: ${csvEscape(hub.slug)}\n`
            csv += `Generated: ${new Date().toISOString()}\n`
            csv += `Time Range: ${range}\n\n`

            csv += 'SUMMARY\n'
            csv += `Total Views,${totalViews}\n`
            csv += `Total Clicks,${totalClicks}\n`
            csv += `Click Rate,${totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0}%\n\n`

            csv += 'LINK PERFORMANCE\n'
            csv += 'Link Title,URL,Clicks\n'
            linkStatsResult.rows.forEach(link => {
                csv += `${csvEscape(link.title)},${csvEscape(link.url)},${link.clicks}\n`
            })

            csv += '\nDETAILED EVENTS\n'
            csv += 'Timestamp,Event Type,Device,Link Title,Link URL\n'
            analyticsData.forEach(event => {
                csv += `${event.timestamp},${event.event_type},${event.device_type || 'unknown'},${csvEscape(event.link_title || '')},${csvEscape(event.link_url || '')}\n`
            })

            res.setHeader('Content-Type', 'text/csv')
            res.setHeader('Content-Disposition', `attachment; filename="${hub.slug}-analytics-${range}.csv"`)
            res.send(csv)
        } else {
            res.json({
                hub: { title: hub.title, slug: hub.slug, description: hub.description },
                timeRange: range,
                generatedAt: new Date().toISOString(),
                summary: {
                    totalViews,
                    totalClicks,
                    clickRate: totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0
                },
                linkPerformance: linkStatsResult.rows.map(l => ({ ...l, clicks: parseInt(l.clicks) })),
                events: analyticsData
            })
        }
    } catch (error) {
        console.error('Export analytics error:', error)
        res.status(500).json({ error: 'Failed to export analytics' })
    }
})

// ---------------------------------------------------------------------------
// Serving static files in production
// ---------------------------------------------------------------------------
if (isProd) {
    const distPath = path.join(__dirname, '..', 'dist')
    app.use(express.static(distPath, { maxAge: '1y', index: false }))
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'))
        } else {
            res.status(404).json({ error: 'Not found' })
        }
    })
}

// Generic error handler (e.g. CORS rejection) so it returns JSON, not an HTML stack trace
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message)
    res.status(err.status || 500).json({ error: err.message || 'Something went wrong' })
})

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3001
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT} [${NODE_ENV}]`)
})

// Graceful shutdown for containerized environments (ECS/EB send SIGTERM)
const shutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully...`)
    server.close(() => {
        pool.end().then(() => {
            console.log('Closed out remaining connections')
            process.exit(0)
        })
    })
    setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
