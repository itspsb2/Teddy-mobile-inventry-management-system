import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { AlertCircle, Loader2, Mail, Lock, Sun, Moon } from 'lucide-react'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { signIn, user, loading: authLoading } = useAuth()
    const { isDark, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const location = useLocation()

    // Get the page user was trying to access, or default to dashboard
    const from = location.state?.from?.pathname || '/dashboard'

    // If already logged in, redirect to intended page
    useEffect(() => {
        if (!authLoading && user) {
            navigate(from, { replace: true })
        }
    }, [user, authLoading, navigate, from])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await signIn(email, password)
            navigate(from, { replace: true })
        } catch (err) {
            setError(err.message || 'Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="login-page">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={40} className="spin" style={{ color: 'var(--primary)' }} />
                </div>
            </div>
        )
    }

    return (
        <div className="login-page">
            {/* Theme Toggle */}
            <button
                className="icon-btn"
                onClick={toggleTheme}
                style={{
                    position: 'absolute',
                    top: '1.5rem',
                    right: '1.5rem',
                    background: 'var(--surface)',
                    boxShadow: 'var(--shadow-md)'
                }}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="login-card">
                <div className="login-header">
                    <img src="/tdy-logo.png" alt="Teddy Mobile" className="login-logo" />
                    <h1 className="login-title">Welcome Back</h1>
                    <p className="login-subtitle">Sign in to Teddy Mobile Stock Management</p>
                </div>

                {error && (
                    <div className="alert alert-danger mb-4">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-tertiary)'
                                }}
                            />
                            <input
                                type="email"
                                className="form-input"
                                style={{ paddingLeft: '2.75rem' }}
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-tertiary)'
                                }}
                            />
                            <input
                                type="password"
                                className="form-input"
                                style={{ paddingLeft: '2.75rem' }}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                        style={{ marginTop: '0.5rem' }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="spin" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default Login
