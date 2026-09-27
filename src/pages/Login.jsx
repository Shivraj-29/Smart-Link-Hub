import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../App'
import { API_URL } from '../api'

function Login() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const { login, addToast } = useApp()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const endpoint = isLogin ? `${API_URL}/api/auth/login` : `${API_URL}/api/auth/register`
            const body = isLogin
                ? { email, password }
                : { email, password, name }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong')
            }

            login({ ...data.user, token: data.token })
            addToast(isLogin ? 'Welcome back!' : 'Account created successfully!')
            navigate('/dashboard')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 'var(--spacing-md)'
        }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
                {/* Logo */}
                <Link to="/" className="flex items-center justify-center gap-sm mb-xl" style={{ textDecoration: 'none' }}>
                    <span style={{ fontSize: '2rem', color: 'var(--color-accent-primary)' }}>⚡</span>
                    <span className="text-2xl font-bold">Smart Link Hub</span>
                </Link>

                {/* Auth Card */}
                <div className="card">
                    {/* Tabs */}
                    <div className="tabs" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <button
                            className={`tab ${isLogin ? 'active' : ''}`}
                            onClick={() => setIsLogin(true)}
                        >
                            Log In
                        </button>
                        <button
                            className={`tab ${!isLogin ? 'active' : ''}`}
                            onClick={() => setIsLogin(false)}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            background: 'rgba(255, 68, 68, 0.1)',
                            border: '1px solid var(--color-error)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-error)',
                            marginBottom: 'var(--spacing-md)',
                            fontSize: 'var(--font-size-sm)'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <div className="input-group mb-md">
                                <label className="input-label" htmlFor="name">Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    className="input"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={!isLogin}
                                />
                            </div>
                        )}

                        <div className="input-group mb-md">
                            <label className="input-label" htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                className="input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group mb-lg">
                            <label className="input-label" htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                className="input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner" />
                            ) : (
                                isLogin ? 'Log In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    {isLogin && (
                        <p className="text-center text-tertiary text-sm mt-lg">
                            Don't have an account?{' '}
                            <button
                                onClick={() => setIsLogin(false)}
                                className="text-accent"
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                Sign up
                            </button>
                        </p>
                    )}
                </div>

                <p className="text-center text-tertiary text-sm mt-lg">
                    <Link to="/">← Back to home</Link>
                </p>
            </div>
        </div>
    )
}

export default Login
