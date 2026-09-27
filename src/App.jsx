import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, createContext, useContext } from 'react'

// Context for global state
const AppContext = createContext()

export const useApp = () => useContext(AppContext)

// Pages
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import HubEditor from './pages/HubEditor'
import PublicHub from './pages/PublicHub'
import Analytics from './pages/Analytics'
import Login from './pages/Login'

function App() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user')
        return saved ? JSON.parse(saved) : null
    })

    const [toasts, setToasts] = useState([])

    const login = (userData) => {
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('user')
    }

    const addToast = (message, type = 'success') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3000)
    }

    return (
        <AppContext.Provider value={{ user, login, logout, addToast }}>
            <Router>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/hub/new" element={<HubEditor />} />
                    <Route path="/hub/:id/edit" element={<HubEditor />} />
                    <Route path="/hub/:id/analytics" element={<Analytics />} />
                    <Route path="/h/:slug" element={<PublicHub />} />
                </Routes>
            </Router>

            {/* Toast Container */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </AppContext.Provider>
    )
}

export default App
