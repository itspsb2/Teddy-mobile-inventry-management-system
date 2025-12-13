import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Sun, Moon, LogOut, Menu, X } from 'lucide-react'

const TopHeader = ({ sidebarOpen, setSidebarOpen }) => {
    const { user, userProfile, signOut } = useAuth()
    const { isDark, toggleTheme } = useTheme()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef(null)
    const navigate = useNavigate()

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = async () => {
        try {
            await signOut()
            navigate('/login')
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    const getInitials = (name) => {
        if (!name) return 'U'
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    return (
        <header className="top-header">
            <div className="header-left">
                {/* Hamburger Menu */}
                <button
                    className="icon-btn hamburger-btn"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    title={sidebarOpen ? 'Close Menu' : 'Open Menu'}
                >
                    {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
                </button>

                <a href="/dashboard" className="header-logo">
                    <img src="/tdy-logo.png" alt="Teddy Mobile" />
                    <span className="header-logo-text">Teddy Mobile</span>
                </a>
            </div>

            <div className="header-right">
                {/* Theme Toggle */}
                <button
                    className="icon-btn theme-toggle"
                    onClick={toggleTheme}
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* User Menu */}
                <div className="user-menu-container" ref={dropdownRef} style={{ position: 'relative' }}>
                    <button
                        className="user-menu"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                        <div className="user-avatar">
                            {getInitials(userProfile?.name)}
                        </div>
                        <div className="user-info">
                            <span className="user-name">{userProfile?.name || 'User'}</span>
                            <span className="user-role">{userProfile?.role || 'User'}</span>
                        </div>
                    </button>

                    <div className={`user-dropdown ${dropdownOpen ? 'open' : ''}`}>
                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--divider)' }}>
                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{userProfile?.name}</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{user?.email}</div>
                        </div>
                        <div style={{ padding: '0.5rem' }}>
                            <button className="dropdown-item danger" onClick={handleLogout}>
                                <LogOut size={18} />
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}

export default TopHeader
