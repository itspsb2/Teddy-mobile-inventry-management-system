import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    ShoppingCart,
    Package,
    Loader2,
    Filter,
    ClipboardCheck,
    Download
} from 'lucide-react'

const Stock = () => {
    const { isAdmin, userProfile } = useAuth()
    const [stocks, setStocks] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [stateFilter, setStateFilter] = useState('all')
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteItemId, setDeleteItemId] = useState(null)

    const [selectedStock, setSelectedStock] = useState(null)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState('stock') // 'stock' or 'sold'

    // Form states
    const [formData, setFormData] = useState({
        phone: '',
        imei: '',
        manualCode: '',
        storage: '',
        colour: '',
        description: '',
        buy_date: new Date().toISOString().split('T')[0],
        cost: '',
        wholesale_price: '',
        retail_price: '',
        state: 'in_stock',
        sell_price: '',
        sell_date: ''
    })

    useEffect(() => {
        fetchStocks()
    }, [activeTab])

    const fetchStocks = async () => {
        try {
            const table = activeTab === 'stock' ? 'stocks' : 'sold_stocks'
            // If fetching sold_stocks, we sort by sold_at or created_at
            const sortCol = activeTab === 'stock' ? 'created_at' : 'sell_date'

            const { data, error } = await supabase
                .from(table)
                .select('*')
                .order(sortCol, { ascending: false })

            if (error) throw error
            setStocks(data || [])
        } catch (error) {
            console.error('Error fetching stocks:', error)
        } finally {
            setLoading(false)
        }
    }

    const generateStockCode = (imei) => {
        const lastFour = imei.slice(-4)
        return `TDY-${lastFour}`
    }

    const handleAddStock = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            const code = `TDY-${formData.manualCode}`
            const { error } = await supabase
                .from('stocks')
                .insert([{
                    code,
                    phone: formData.phone,
                    imei: formData.imei,
                    storage: formData.storage,
                    colour: formData.colour,
                    description: formData.description || null,
                    buy_date: formData.buy_date,
                    cost: parseFloat(formData.cost) || 0,
                    wholesale_price: parseFloat(formData.wholesale_price),
                    retail_price: parseFloat(formData.retail_price),
                    state: 'in_stock'
                }])

            if (error) throw error

            await fetchStocks()
            setShowAddModal(false)
            resetForm()
        } catch (error) {
            console.error('Add stock error:', error)
            alert(error.message || 'Error adding stock')
        } finally {
            setSaving(false)
        }
    }

    const handleEditStock = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            // SOLD TAB: Handle sold items differently
            if (activeTab === 'sold') {
                // If moving back to in_stock
                if (formData.state === 'in_stock') {
                    // Step 1: Insert back into stocks table
                    const { error: insertError } = await supabase
                        .from('stocks')
                        .insert([{
                            code: selectedStock.code,
                            phone: selectedStock.phone,
                            imei: selectedStock.imei,
                            storage: selectedStock.storage,
                            colour: selectedStock.colour,
                            description: selectedStock.description || '',
                            buy_date: selectedStock.buy_date,
                            cost: parseFloat(formData.cost) || parseFloat(selectedStock.cost) || 0,
                            wholesale_price: parseFloat(formData.wholesale_price) || 0,
                            retail_price: parseFloat(formData.retail_price) || 0,
                            state: 'in_stock',
                            return_date: new Date().toISOString().split('T')[0]
                        }])

                    if (insertError) throw insertError

                    // Step 2: Delete from sold_stocks
                    const { error: deleteError } = await supabase
                        .from('sold_stocks')
                        .delete()
                        .eq('id', selectedStock.id)

                    if (deleteError) throw deleteError

                    alert('Item moved back to In Stock successfully!')
                } else {
                    // Just update the sold_stocks record (cost, wholesale, retail only)
                    const { error: updateError } = await supabase
                        .from('sold_stocks')
                        .update({
                            cost: parseFloat(formData.cost) || 0,
                            // Note: wholesale_price and retail_price may not exist in sold_stocks schema
                            // If they do exist, uncomment these lines:
                            // wholesale_price: parseFloat(formData.wholesale_price) || 0,
                            // retail_price: parseFloat(formData.retail_price) || 0,
                        })
                        .eq('id', selectedStock.id)

                    if (updateError) throw updateError
                }
            } else {
                // STOCK TAB: Normal update for in-stock items
                const code = `TDY-${formData.manualCode}`

                const { error: updateError } = await supabase
                    .from('stocks')
                    .update({
                        code,
                        phone: formData.phone,
                        storage: formData.storage,
                        colour: formData.colour,
                        description: formData.description,
                        buy_date: formData.buy_date,
                        cost: parseFloat(formData.cost) || 0,
                        wholesale_price: parseFloat(formData.wholesale_price),
                        retail_price: parseFloat(formData.retail_price),
                        state: formData.state,
                        sell_price: formData.state === 'sold' ? parseFloat(formData.sell_price) : null,
                        sell_date: formData.state === 'sold' ? formData.sell_date : null,
                        profit: formData.state === 'sold' ? (parseFloat(formData.sell_price) - parseFloat(formData.cost || formData.wholesale_price)) : null
                    })
                    .eq('id', selectedStock.id)

                if (updateError) throw updateError

                // If moving to sold (and currently in In Stock tab), trigger the move
                if (formData.state === 'sold') {
                    const { error: moveError } = await supabase.rpc('move_stock_to_sold', {
                        p_imei: selectedStock.imei,
                        p_sell_price: parseFloat(formData.sell_price),
                        p_sell_date: formData.sell_date
                    })
                    if (moveError) throw moveError
                }
            }

            await fetchStocks()
            setShowEditModal(false)
            resetForm()
        } catch (error) {
            console.error('Edit stock error:', error)
            alert(error.message || 'Error updating stock')
        } finally {
            setSaving(false)
        }
    }



    const handleDelete = (id) => {
        if (!isAdmin()) {
            alert('Only admins can delete items')
            return
        }
        setDeleteItemId(id)
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        if (!deleteItemId) return

        try {
            const { error } = await supabase
                .from('stocks')
                .delete()
                .eq('id', deleteItemId)

            if (error) {
                throw error
            }

            await fetchStocks()
        } catch (error) {
            console.error('Delete failed:', error)
            alert('Error deleting stock: ' + (error.message || 'Unknown error'))
        } finally {
            setShowDeleteModal(false)
            setDeleteItemId(null)
        }
    }

    const openEditModal = (stock) => {
        setSelectedStock(stock)
        setFormData({
            phone: stock.phone,
            imei: stock.imei,
            manualCode: stock.code ? stock.code.slice(4) : '', // Extract XXXX from TDY-XXXX
            storage: stock.storage,
            colour: stock.colour,
            description: stock.description || '',
            buy_date: stock.buy_date,
            cost: stock.cost ? stock.cost.toString() : '',
            wholesale_price: stock.wholesale_price ? stock.wholesale_price.toString() : '',
            retail_price: stock.retail_price ? stock.retail_price.toString() : '',
            // Set state based on which tab we're on (sold_stocks items are always 'sold')
            state: activeTab === 'sold' ? 'sold' : (stock.state || 'in_stock'),
            sell_price: stock.sell_price ? stock.sell_price.toString() : '',
            sell_date: stock.sell_date || new Date().toISOString().split('T')[0]
        })
        setShowEditModal(true)
    }



    const resetForm = () => {
        setFormData({
            phone: '',
            imei: '',
            manualCode: '',
            storage: '',
            colour: '',
            description: '',
            buy_date: new Date().toISOString().split('T')[0],
            cost: '',
            wholesale_price: '',
            retail_price: ''
        })
        setSelectedStock(null)
    }

    // Filter stocks
    const filteredStocks = stocks.filter(stock => {
        const matchesSearch =
            stock.code?.toLowerCase().includes(search.toLowerCase()) ||
            stock.phone?.toLowerCase().includes(search.toLowerCase()) ||
            stock.imei?.toLowerCase().includes(search.toLowerCase())

        const matchesState = stateFilter === 'all' || stock.state === stateFilter

        return matchesSearch && matchesState
    })

    // Export to CSV function
    const exportToCSV = () => {
        let headers = []
        let rows = []

        if (activeTab === 'stock') {
            headers = ['Code', 'Phone', 'IMEI', 'Storage', 'Colour', 'Description', 'Buy Date', 'Cost', 'Wholesale Price', 'Retail Price']
            rows = filteredStocks.map(s => [
                s.code || '',
                s.phone || '',
                `\t${s.imei || ''}`,  // Tab prefix prevents Excel scientific notation
                s.storage || '',
                s.colour || '',
                s.description || '',
                s.buy_date || '',
                s.cost || 0,
                s.wholesale_price || 0,
                s.retail_price || 0
            ])
        } else {
            headers = ['Code', 'Phone', 'IMEI', 'Storage', 'Colour', 'Description', 'Buy Date', 'Cost', 'Sell Date', 'Sell Price']
            rows = filteredStocks.map(s => [
                s.code || '',
                s.phone || '',
                `\t${s.imei || ''}`,  // Tab prefix prevents Excel scientific notation
                s.storage || '',
                s.colour || '',
                s.description || '',
                s.buy_date || '',
                s.cost || 0,
                s.sell_date || '',
                s.sell_price || 0
            ])
        }

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n')

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `${activeTab === 'stock' ? 'in_stock' : 'sold_history'}_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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
                    <h1 className="page-title">Stock Management</h1>
                    <p className="page-subtitle">Manage your phone inventory</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {isAdmin() && (
                        <button className="btn btn-outline" onClick={exportToCSV}>
                            <Download size={18} />
                            Export CSV
                        </button>
                    )}
                    {activeTab === 'stock' && (
                        <>
                            <Link to="/stock-check" className="btn btn-outline">
                                <ClipboardCheck size={18} />
                                Stock Check
                            </Link>
                            <button
                                className="btn btn-primary"
                                onClick={() => { resetForm(); setShowAddModal(true); }}
                            >
                                <Plus size={18} />
                                Add Phone
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="tabs mb-6">
                <button
                    className={`tab ${activeTab === 'stock' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stock')}
                >
                    <Package size={18} />
                    In Stock
                </button>
                <button
                    className={`tab ${activeTab === 'sold' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sold')}
                >
                    <ClipboardCheck size={18} />
                    Sold History
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="filters">
                    <div className="search-bar" style={{ flex: 1, maxWidth: 400 }}>
                        <Search size={18} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search by code, phone, or IMEI..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Filter size={18} style={{ color: 'var(--gray-500)' }} />
                        <select
                            className="form-input form-select"
                            style={{ width: 'auto' }}
                            value={stateFilter}
                            onChange={(e) => setStateFilter(e.target.value)}
                        >
                            <option value="all">All States</option>
                            <option value="in_stock">In Stock</option>
                            <option value="sold">Sold</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stock Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Phone</th>
                            <th>IMEI</th>
                            <th>Storage</th>
                            <th>Colour</th>
                            <th>Description</th>
                            <th>Buy Date</th>
                            {activeTab === 'stock' && (
                                <>
                                    {isAdmin() && <th>Cost</th>}
                                    <th>Wholesale Price</th>
                                    <th>Retail Price</th>
                                </>
                            )}
                            {activeTab === 'sold' && (
                                <>
                                    {isAdmin() && <th>Cost</th>}
                                    <th>Sell Date</th>
                                    <th>Sell Price</th>
                                </>
                            )}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStocks.length === 0 ? (
                            <tr>
                                <td colSpan={activeTab === 'stock' ? (isAdmin() ? 11 : 10) : 10}>
                                    <div className="empty-state">
                                        <Package size={48} />
                                        <p>No {activeTab === 'stock' ? 'stock' : 'sold'} items found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredStocks.map((stock) => (
                                <tr key={stock.id}>
                                    <td>
                                        <span className="stock-code">{stock.code}</span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{stock.phone}</div>
                                    </td>
                                    <td className="text-sm">{stock.imei}</td>
                                    <td>{stock.storage}</td>
                                    <td>{stock.colour}</td>
                                    <td>
                                        <span className="text-sm text-muted">{stock.description || '—'}</span>
                                    </td>
                                    <td>{stock.buy_date ? new Date(stock.buy_date).toLocaleDateString() : '—'}</td>
                                    {activeTab === 'stock' && (
                                        <>
                                            {isAdmin() && (
                                                <td>Rs. {parseFloat(stock.cost || 0).toLocaleString()}</td>
                                            )}
                                            <td>Rs. {parseFloat(stock.wholesale_price || 0).toLocaleString()}</td>
                                            <td>Rs. {parseFloat(stock.retail_price || 0).toLocaleString()}</td>
                                        </>
                                    )}
                                    {activeTab === 'sold' && (
                                        <>
                                            {isAdmin() && (
                                                <td>Rs. {parseFloat(stock.cost || 0).toLocaleString()}</td>
                                            )}
                                            <td>{stock.sell_date ? new Date(stock.sell_date).toLocaleDateString() : '—'}</td>
                                            <td>Rs. {parseFloat(stock.sell_price || 0).toLocaleString()}</td>
                                        </>
                                    )}
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {isAdmin() && (
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    onClick={() => openEditModal(stock)}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={14} />
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

            {/* Add Stock Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add New Phone</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddStock}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Stock Code (Last 4) *</label>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{
                                            background: 'var(--bg-secondary)',
                                            padding: '0.5rem 0.75rem',
                                            border: '1px solid var(--border)',
                                            borderRight: 'none',
                                            borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                                            color: 'var(--text-secondary)',
                                            fontWeight: 500
                                        }}>TDY-</span>
                                        <input
                                            type="text"
                                            className="form-input"
                                            style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
                                            placeholder="XXXX"
                                            value={formData.manualCode}
                                            onChange={(e) => setFormData({ ...formData, manualCode: e.target.value })}
                                            required
                                            maxLength={4}
                                        />
                                    </div>
                                </div>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Phone Model *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. iPhone 14 Pro Max"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">IMEI *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="15-digit IMEI number"
                                            value={formData.imei}
                                            onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Storage *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. 256GB"
                                            value={formData.storage}
                                            onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Colour *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. Space Black"
                                            value={formData.colour}
                                            onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Optional notes"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Purchase Date *</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.buy_date}
                                            onChange={(e) => setFormData({ ...formData, buy_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    {isAdmin() && (
                                        <div className="form-group">
                                            <label className="form-label">Cost (Rs.)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                placeholder="Cost price"
                                                value={formData.cost}
                                                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Wholesale Price (Rs.) *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="Wholesale price"
                                            value={formData.wholesale_price}
                                            onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                                            required
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Retail Price (Rs.) *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="Retail price"
                                            value={formData.retail_price}
                                            onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                                            required
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <Loader2 size={18} className="spinner" /> : <Plus size={18} />}
                                    Add Phone
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Stock Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Edit Stock - {selectedStock?.code}</h3>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEditStock}>
                            <div className="modal-body">
                                {/* SOLD TAB: Simplified form - only Status, Cost, Wholesale, Retail */}
                                {activeTab === 'sold' ? (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Status</label>
                                            <select
                                                className="form-input"
                                                value={formData.state}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            >
                                                <option value="sold">Sold</option>
                                                <option value="in_stock">Move back to In Stock</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Cost (Rs.)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                placeholder="Cost price"
                                                value={formData.cost}
                                                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="grid-2">
                                            <div className="form-group">
                                                <label className="form-label">Wholesale Price (Rs.)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={formData.wholesale_price}
                                                    onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Retail Price (Rs.)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={formData.retail_price}
                                                    onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* STOCK TAB: Full edit form */
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Stock Code (Last 4) *</label>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{
                                                    background: 'var(--bg-secondary)',
                                                    padding: '0.5rem 0.75rem',
                                                    border: '1px solid var(--border)',
                                                    borderRight: 'none',
                                                    borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                                                    color: 'var(--text-secondary)',
                                                    fontWeight: 500
                                                }}>TDY-</span>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
                                                    value={formData.manualCode}
                                                    onChange={(e) => setFormData({ ...formData, manualCode: e.target.value })}
                                                    required
                                                    maxLength={4}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid-2">
                                            <div className="form-group">
                                                <label className="form-label">Phone Model *</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">IMEI</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.imei}
                                                    disabled
                                                />
                                            </div>
                                        </div>
                                        <div className="grid-2">
                                            <div className="form-group">
                                                <label className="form-label">Storage *</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.storage}
                                                    onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Colour *</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.colour}
                                                    onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Description</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid-2">
                                            <div className="form-group">
                                                <label className="form-label">Purchase Date *</label>
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={formData.buy_date}
                                                    onChange={(e) => setFormData({ ...formData, buy_date: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            {isAdmin() && (
                                                <div className="form-group">
                                                    <label className="form-label">Cost (Rs.)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        placeholder="Cost price"
                                                        value={formData.cost}
                                                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid-2">
                                            <div className="form-group">
                                                <label className="form-label">Wholesale Price (Rs.) *</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={formData.wholesale_price}
                                                    onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Retail Price (Rs.) *</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={formData.retail_price}
                                                    onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Status</label>
                                            <select
                                                className="form-input"
                                                value={formData.state}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            >
                                                <option value="in_stock">In Stock</option>
                                                <option value="sold">Sold</option>
                                            </select>
                                        </div>

                                        {formData.state === 'sold' && (
                                            <div className="grid-2">
                                                <div className="form-group">
                                                    <label className="form-label">Sell Price (Rs.) *</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={formData.sell_price}
                                                        onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                                                        required={formData.state === 'sold'}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Sell Date *</label>
                                                    <input
                                                        type="date"
                                                        className="form-input"
                                                        value={formData.sell_date}
                                                        onChange={(e) => setFormData({ ...formData, sell_date: e.target.value })}
                                                        required={formData.state === 'sold'}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <Loader2 size={18} className="spinner" /> : null}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}



            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Confirm Delete</h3>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ textAlign: 'center', fontSize: '1rem', color: 'var(--text-primary)' }}>
                                Are you sure you want to delete this item?
                            </p>
                            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center' }}>
                            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={confirmDelete}>
                                <Trash2 size={18} />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Stock
