// API Base URL
export const API_URL = import.meta.env.VITE_API_URL || ''

// If a request comes back 401 (expired/invalid JWT), clear the stale session
// and bounce to /login instead of silently failing. Returns true if handled.
export function handleUnauthorized(res, logout, navigate) {
    if (res.status === 401) {
        logout()
        navigate('/login')
        return true
    }
    return false
}
