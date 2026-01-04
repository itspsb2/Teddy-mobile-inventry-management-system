import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    LayoutDashboard,
    Package,
    Calculator,
    FileText,
    Users,
    BarChart3
} from 'lucide-react'

const Sidebar = ({ isOpen, onClose }) => {
    const { isAdmin } = useAuth()

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/stock', icon: Package, label: 'Stock' },
        { to: '/profit', icon: Calculator, label: 'Profit Tool' },
        { to: '/reports', icon: FileText, label: 'Reports' }
    ]

    const adminItems = [
        { to: '/users', icon: Users, label: 'Users' },
        { to: '/analytics', icon: BarChart3, label: 'Analytics' }
    ]

    const handleNavClick = () => {
        // Close sidebar on mobile after navigation
        if (window.innerWidth < 1024) {
            onClose()
        }
    }

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={onClose}
                />
            )}

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <nav>
                    <div className="nav-section">
                        <div className="nav-section-title">Main Menu</div>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                onClick={handleNavClick}
                            >
                                <item.icon size={20} />
                                {item.label}
                            </NavLink>
                        ))}
                    </div>

                    {isAdmin() && (
                        <div className="nav-section">
                            <div className="nav-section-title">Administration</div>
                            {adminItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                    onClick={handleNavClick}
                                >
                                    <item.icon size={20} />
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    )}
                </nav>
            </aside>
        </>
    )
}

export default Sidebar
