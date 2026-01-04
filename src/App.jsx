import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/Layout/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Stock from './pages/Stock'
import StockCheck from './pages/StockCheck'
import ProfitTool from './pages/ProfitTool'
import Reports from './pages/Reports'
import AnalyticsPage from './pages/AnalyticsPage'
import Users from './pages/Users'

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />

                        {/* Protected Routes */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/stock" element={<Stock />} />
                            <Route path="/stock-check" element={<StockCheck />} />
                            <Route path="/profit" element={<ProfitTool />} />
                            <Route path="/reports" element={<Reports />} />
                        </Route>

                        {/* Admin Only Routes */}
                        <Route element={<ProtectedRoute requireAdmin />}>
                            <Route path="/users" element={<Users />} />
                            <Route path="/analytics" element={<AnalyticsPage />} />
                        </Route>

                        {/* Default redirect */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    )
}

export default App
