import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    Plus,
    Edit2,
    Trash2,
    X,
    Users as UsersIcon,
    Shield,
    User,
    Loader2,
    AlertCircle,
    Mail,
    Lock
} from 'lucide-react'

const Users = () => {
    const { user: currentUser } = useAuth()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'cashier'
    })

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setUsers(data || [])
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const getAuthToken = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Not authenticated')
        return session.access_token
    }

    const handleAddUser = async (e) => {
        e.preventDefault()
        setSaving(true)
        setError('')

        try {
            const token = await getAuthToken()

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                        name: formData.name,
                        role: formData.role
                    })
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create user')
            }

            await fetchUsers()
            setShowAddModal(false)
            resetForm()
            alert(`User "${formData.name}" created successfully!`)
        } catch (error) {
            console.error('Error creating user:', error)
            setError(error.message || 'Failed to create user')
        } finally {
            setSaving(false)
        }
    }

    const handleEditUser = async (e) => {
        e.preventDefault()
        setSaving(true)
        setError('')

        try {
            const token = await getAuthToken()

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-user`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        userId: selectedUser.id,
                        name: formData.name,
                        role: formData.role
                    })
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update user')
            }

            await fetchUsers()
            setShowEditModal(false)
            resetForm()
        } catch (error) {
            console.error('Error updating user:', error)
            setError(error.message || 'Failed to update user')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteUser = async (userId) => {
        if (userId === currentUser?.id) {
            alert("You cannot delete your own account!")
            return
        }

        try {
            const token = await getAuthToken()

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ userId })
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete user')
            }

            await fetchUsers()
        } catch (error) {
            console.error('Delete failed:', error)
            alert('Error deleting user: ' + (error.message || 'Unknown error'))
        }
    }

    const openEditModal = (user) => {
        setSelectedUser(user)
        setFormData({
            email: user.email,
            password: '',
            name: user.name,
            role: user.role
        })
        setError('')
        setShowEditModal(true)
    }

    const resetForm = () => {
        setFormData({
            email: '',
            password: '',
            name: '',
            role: 'cashier'
        })
        setSelectedUser(null)
        setError('')
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">Manage system users and permissions</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => { resetForm(); setShowAddModal(true); }}
                >
                    <Plus size={18} />
                    Add User
                </button>
            </div>

            {/* Users Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan="5">
                                    <div className="empty-state">
                                        <UsersIcon size={48} />
                                        <p>No users found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: 'var(--radius-full)',
                                                background: user.role === 'admin'
                                                    ? 'linear-gradient(135deg, var(--primary) 0%, #4285f4 100%)'
                                                    : 'linear-gradient(135deg, var(--success) 0%, #34a853 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontWeight: 600,
                                                fontSize: '0.875rem'
                                            }}>
                                                {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                                            </div>
                                            <span style={{ fontWeight: 500 }}>{user.name}</span>
                                        </div>
                                    </td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`badge ${user.role === 'admin' ? 'badge-info' : 'badge-success'}`}>
                                            {user.role === 'admin' ? (
                                                <><Shield size={12} style={{ marginRight: '0.25rem' }} /> Admin</>
                                            ) : (
                                                <><User size={12} style={{ marginRight: '0.25rem' }} /> Cashier</>
                                            )}
                                        </span>
                                    </td>
                                    <td>
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => openEditModal(user)}
                                                title="Edit"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            {user.id !== currentUser?.id && (
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add New User</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddUser}>
                            <div className="modal-body">
                                {error && (
                                    <div className="alert alert-danger mb-4">
                                        <AlertCircle size={18} />
                                        {error}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                        <input
                                            type="text"
                                            className="form-input"
                                            style={{ paddingLeft: '2.75rem' }}
                                            placeholder="Enter full name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Email Address *</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                        <input
                                            type="email"
                                            className="form-input"
                                            style={{ paddingLeft: '2.75rem' }}
                                            placeholder="Enter email address"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Password *</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                        <input
                                            type="password"
                                            className="form-input"
                                            style={{ paddingLeft: '2.75rem' }}
                                            placeholder="Min 8 chars, uppercase, lowercase, number"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                            minLength={8}
                                            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
                                            title="Password must be at least 8 characters with uppercase, lowercase, and number"
                                        />
                                    </div>
                                    <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>
                                        Must include uppercase, lowercase, and a number
                                    </p>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Role *</label>
                                    <select
                                        className="form-input form-select"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        required
                                    >
                                        <option value="cashier">Cashier</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Edit User</h3>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEditUser}>
                            <div className="modal-body">
                                {error && (
                                    <div className="alert alert-danger mb-4">
                                        <AlertCircle size={18} />
                                        {error}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        disabled
                                        style={{ opacity: 0.6 }}
                                    />
                                    <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>
                                        Email cannot be changed
                                    </p>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter full name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Role *</label>
                                    <select
                                        className="form-input form-select"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        required
                                        disabled={selectedUser?.id === currentUser?.id}
                                    >
                                        <option value="cashier">Cashier</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    {selectedUser?.id === currentUser?.id && (
                                        <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>
                                            You cannot change your own role
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <Loader2 size={18} className="spin" /> : null}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Users
