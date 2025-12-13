import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import TopHeader from './TopHeader'
import Sidebar from './Sidebar'
import { Loader2 } from 'lucide-react'

const ProtectedRoute = ({ requireAdmin = false }) => {
    const { user, userProfile, loading, isAdmin } = useAuth()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const location = useLocation()

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'var(--bg-secondary)'
            }}>
                <Loader2
                    size={40}
                    style={{
                        animation: 'spin 1s linear infinite',
                        color: 'var(--primary)'
                    }}
                />
            </div>
        )
    }

    if (!user) {
        // Save the current location so we can redirect back after login
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    if (requireAdmin && !isAdmin()) {
        return <Navigate to="/dashboard" replace />
    }

    return (
        <div className="app-layout">
            <TopHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className={`main-content ${sidebarOpen ? '' : 'sidebar-closed'}`}>
                <Outlet />
            </main>
        </div>
    )
}

export default ProtectedRoute
