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
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ClipboardCheck,
    Download,
    Wrench,
    Send,
    RotateCcw,
    CheckCircle,
    AlertCircle
} from 'lucide-react'

const Stock = () => {
    const { isAdmin, userProfile } = useAuth()
    const [stocks, setStocks] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    // Sort and filter states (Stock tab only)
    const [sortBy, setSortBy] = useState('buy_date')      // 'buy_date' or 'code'
    const [sortOrder, setSortOrder] = useState('desc')    // 'asc' or 'desc'
    const [priceMin, setPriceMin] = useState('')          // Minimum retail price
    const [priceMax, setPriceMax] = useState('')          // Maximum retail price
    // Sort states for Sold tab
    const [soldSortBy, setSoldSortBy] = useState('sell_date')  // 'sell_date' or 'code'
    const [soldSortOrder, setSoldSortOrder] = useState('desc') // 'asc' or 'desc'
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteItemId, setDeleteItemId] = useState(null)

    const [selectedStock, setSelectedStock] = useState(null)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState('stock') // 'stock', 'sold', or 'repairs'

    // Repairs states
    const [repairs, setRepairs] = useState([])
    const [showIssueModal, setShowIssueModal] = useState(false)
    const [showReceiveModal, setShowReceiveModal] = useState(false)
    const [issueLoading, setIssueLoading] = useState(false)
    const [receiveLoading, setReceiveLoading] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })
    const [issueFormData, setIssueFormData] = useState({
        code: '',
        phone: '',
        imei: '',
        colour: '',
        storage: '',
        description: '',
        buy_date: '',
        cost: '',
        wholesale_price: '',
        retail_price: '',
        issue_date: new Date().toISOString().split('T')[0],
        repair_description: '',
        person: ''
    })
    const [receiveFormData, setReceiveFormData] = useState({
        code: '',
        imei: '',
        selectedRepair: null
    })

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
        sell_date: '',
        return_date: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        if (activeTab === 'repairs') {
            fetchRepairs()
        } else {
            fetchStocks()
        }
    }, [activeTab])

    const fetchStocks = async () => {
        setLoading(true)
        try {
            const table = activeTab === 'stock' ? 'stocks' : 'sold_stocks'
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

    const fetchRepairs = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('repairs')
                .select('*')
                .order('issue_date', { ascending: false })

            if (error) throw error
            setRepairs(data || [])
        } catch (error) {
            console.error('Error fetching repairs:', error)
        } finally {
            setLoading(false)
        }
    }

    // === REPAIRS FUNCTIONS ===

    // Lookup device by TDY code for Issue Device
    const lookupDeviceByCode = async (code) => {
        if (!code || code.length < 4) return

        const fullCode = code.startsWith('TDY-') ? code : `TDY-${code}`
        setIssueLoading(true)

        try {
            const { data, error } = await supabase
                .from('stocks')
                .select('*')
                .eq('code', fullCode)
                .single()

            if (error) {
                setMessage({ type: 'error', text: `Device ${fullCode} not found in stock` })
                return
            }

            setIssueFormData(prev => ({
                ...prev,
                code: data.code,
                phone: data.phone,
                imei: data.imei,
                colour: data.colour,
                storage: data.storage,
                description: data.description || '',
                buy_date: data.buy_date,
                cost: data.cost?.toString() || '',
                wholesale_price: data.wholesale_price?.toString() || '',
                retail_price: data.retail_price?.toString() || ''
            }))
            setMessage({ type: 'success', text: `Device ${fullCode} found!` })
        } catch (error) {
            setMessage({ type: 'error', text: 'Device not found in stock' })
        } finally {
            setIssueLoading(false)
        }
    }

    // Issue Device: Move from stocks to repairs
    const handleIssueDevice = async () => {
        if (!issueFormData.code || !issueFormData.person || !issueFormData.repair_description) {
            setMessage({ type: 'error', text: 'Please fill in all required fields' })
            return
        }

        setIssueLoading(true)
        setMessage({ type: '', text: '' })

        try {
            // Step 1: Insert into repairs table
            const { error: insertError } = await supabase
                .from('repairs')
                .insert([{
                    code: issueFormData.code,
                    phone: issueFormData.phone,
                    imei: issueFormData.imei,
                    storage: issueFormData.storage,
                    colour: issueFormData.colour,
                    description: issueFormData.description,
                    buy_date: issueFormData.buy_date,
                    cost: parseFloat(issueFormData.cost) || 0,
                    wholesale_price: parseFloat(issueFormData.wholesale_price) || 0,
                    retail_price: parseFloat(issueFormData.retail_price) || 0,
                    repair_description: issueFormData.repair_description,
                    issue_date: issueFormData.issue_date,
                    person: issueFormData.person
                }])

            if (insertError) throw insertError

            // Step 2: Delete from stocks
            const { error: deleteError } = await supabase
                .from('stocks')
                .delete()
                .eq('code', issueFormData.code)

            if (deleteError) {
                // Rollback: delete from repairs
                await supabase.from('repairs').delete().eq('code', issueFormData.code)
                throw deleteError
            }

            setMessage({ type: 'success', text: `Device ${issueFormData.code} issued for repair successfully!` })

            // Reset and close
            setTimeout(() => {
                setShowIssueModal(false)
                setIssueFormData({
                    code: '', phone: '', imei: '', colour: '', storage: '', description: '',
                    buy_date: '', cost: '', wholesale_price: '', retail_price: '',
                    issue_date: new Date().toISOString().split('T')[0], repair_description: '', person: ''
                })
                setMessage({ type: '', text: '' })
                fetchRepairs()
            }, 1500)
        } catch (error) {
            console.error('Issue device error:', error)
            setMessage({ type: 'error', text: error.message || 'Failed to issue device for repair' })
        } finally {
            setIssueLoading(false)
        }
    }

    // Lookup repair device by Code or IMEI
    const lookupRepairDevice = async (field, value) => {
        if (!value || value.length < 3) return

        setReceiveLoading(true)

        try {
            const searchValue = field === 'code' && !value.startsWith('TDY-') ? `TDY-${value}` : value

            const { data, error } = await supabase
                .from('repairs')
                .select('*')
                .eq(field, searchValue)
                .single()

            if (error) {
                setMessage({ type: 'error', text: `Device not found in repairs` })
                setReceiveFormData(prev => ({ ...prev, selectedRepair: null }))
                return
            }

            setReceiveFormData({
                code: data.code,
                imei: data.imei,
                selectedRepair: data
            })
            setMessage({ type: 'success', text: `Device ${data.code} found in repairs!` })
        } catch (error) {
            setMessage({ type: 'error', text: 'Device not found in repairs' })
        } finally {
            setReceiveLoading(false)
        }
    }

    // Receive Device: Move from repairs back to stocks
    const handleReceiveDevice = async () => {
        const repair = receiveFormData.selectedRepair
        if (!repair) {
            setMessage({ type: 'error', text: 'Please select a device first' })
            return
        }

        setReceiveLoading(true)
        setMessage({ type: '', text: '' })

        try {
            // Step 1: Insert back into stocks (only stock-compatible columns)
            const { error: insertError } = await supabase
                .from('stocks')
                .insert([{
                    code: repair.code,
                    phone: repair.phone,
                    imei: repair.imei,
                    storage: repair.storage,
                    colour: repair.colour,
                    description: repair.description,
                    buy_date: repair.buy_date,
                    cost: repair.cost,
                    wholesale_price: repair.wholesale_price,
                    retail_price: repair.retail_price,
                    state: 'in_stock'
                }])

            if (insertError) throw insertError

            // Step 2: Delete from repairs
            const { error: deleteError } = await supabase
                .from('repairs')
                .delete()
                .eq('id', repair.id)

            if (deleteError) {
                // Rollback
                await supabase.from('stocks').delete().eq('code', repair.code)
                throw deleteError
            }

            setMessage({ type: 'success', text: `Device ${repair.code} received back to stock!` })

            setTimeout(() => {
                setShowReceiveModal(false)
                setReceiveFormData({ code: '', imei: '', selectedRepair: null })
                setMessage({ type: '', text: '' })
                fetchRepairs()
            }, 1500)
        } catch (error) {
            console.error('Receive device error:', error)
            setMessage({ type: 'error', text: error.message || 'Failed to receive device' })
        } finally {
            setReceiveLoading(false)
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
                            return_date: formData.return_date || new Date().toISOString().split('T')[0]
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

                // If moving to sold, manually move to sold_stocks and delete from stocks
                if (formData.state === 'sold') {
                    // Step 1: Insert into sold_stocks with only valid columns
                    const { error: insertError } = await supabase
                        .from('sold_stocks')
                        .insert([{
                            original_id: selectedStock.id,
                            code: selectedStock.code,
                            phone: selectedStock.phone,
                            imei: selectedStock.imei,
                            storage: selectedStock.storage,
                            colour: selectedStock.colour,
                            description: selectedStock.description,
                            buy_date: selectedStock.buy_date,
                            cost: parseFloat(formData.cost) || parseFloat(selectedStock.cost) || 0,
                            sell_price: parseFloat(formData.sell_price),
                            sell_date: formData.sell_date
                        }])

                    if (insertError) throw insertError

                    // Step 2: Delete from stocks
                    const { error: deleteError } = await supabase
                        .from('stocks')
                        .delete()
                        .eq('id', selectedStock.id)

                    if (deleteError) {
                        // Rollback: delete from sold_stocks if stocks delete failed
                        await supabase.from('sold_stocks').delete().eq('imei', selectedStock.imei)
                        throw deleteError
                    }
                } else {
                    // Normal update for in-stock items (not sold)
                    const { error: updateError } = await supabase
                        .from('stocks')
                        .update({
                            code,
                            phone: formData.phone,
                            imei: formData.imei,
                            storage: formData.storage,
                            colour: formData.colour,
                            description: formData.description,
                            buy_date: formData.buy_date,
                            cost: parseFloat(formData.cost) || 0,
                            wholesale_price: parseFloat(formData.wholesale_price),
                            retail_price: parseFloat(formData.retail_price),
                            state: formData.state
                        })
                        .eq('id', selectedStock.id)

                    if (updateError) throw updateError
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
            sell_date: stock.sell_date || new Date().toISOString().split('T')[0],
            return_date: new Date().toISOString().split('T')[0]
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

    // Filter and sort stocks
    const getFilteredAndSortedStocks = () => {
        let result = stocks.filter(stock => {
            // Search filter (both tabs)
            const matchesSearch =
                stock.code?.toLowerCase().includes(search.toLowerCase()) ||
                stock.phone?.toLowerCase().includes(search.toLowerCase()) ||
                stock.imei?.toLowerCase().includes(search.toLowerCase())

            // Price range filter (Stock tab only)
            if (activeTab === 'stock') {
                const retailPrice = parseFloat(stock.retail_price) || 0
                const minPrice = priceMin ? parseFloat(priceMin) : 0
                const maxPrice = priceMax ? parseFloat(priceMax) : Infinity
                const matchesPrice = retailPrice >= minPrice && retailPrice <= maxPrice
                return matchesSearch && matchesPrice
            }

            return matchesSearch
        })

        // Sorting (Stock tab only)
        if (activeTab === 'stock') {
            result.sort((a, b) => {
                let compareA, compareB

                if (sortBy === 'buy_date') {
                    compareA = new Date(a.buy_date || 0).getTime()
                    compareB = new Date(b.buy_date || 0).getTime()
                } else if (sortBy === 'code') {
                    compareA = a.code?.toLowerCase() || ''
                    compareB = b.code?.toLowerCase() || ''
                }

                if (sortOrder === 'asc') {
                    return compareA > compareB ? 1 : compareA < compareB ? -1 : 0
                } else {
                    return compareA < compareB ? 1 : compareA > compareB ? -1 : 0
                }
            })
        }

        // Sorting (Sold tab)
        if (activeTab === 'sold') {
            result.sort((a, b) => {
                let compareA, compareB

                if (soldSortBy === 'sell_date') {
                    compareA = new Date(a.sell_date || 0).getTime()
                    compareB = new Date(b.sell_date || 0).getTime()
                } else if (soldSortBy === 'code') {
                    compareA = a.code?.toLowerCase() || ''
                    compareB = b.code?.toLowerCase() || ''
                }

                if (soldSortOrder === 'asc') {
                    return compareA > compareB ? 1 : compareA < compareB ? -1 : 0
                } else {
                    return compareA < compareB ? 1 : compareA > compareB ? -1 : 0
                }
            })
        }

        return result
    }

    const filteredStocks = getFilteredAndSortedStocks()

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
                    {activeTab === 'repairs' && (
                        <>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setMessage({ type: '', text: '' });
                                    setIssueFormData({
                                        code: '', phone: '', imei: '', colour: '', storage: '', description: '',
                                        buy_date: '', cost: '', wholesale_price: '', retail_price: '',
                                        issue_date: new Date().toISOString().split('T')[0], repair_description: '', person: ''
                                    });
                                    setShowIssueModal(true);
                                }}
                            >
                                <Send size={18} />
                                Issue Device
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() => {
                                    setMessage({ type: '', text: '' });
                                    setReceiveFormData({ code: '', imei: '', selectedRepair: null });
                                    setShowReceiveModal(true);
                                }}
                            >
                                <RotateCcw size={18} />
                                Receive Device
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
                    <ShoppingCart size={18} />
                    Sold History
                </button>
                <button
                    className={`tab ${activeTab === 'repairs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('repairs')}
                >
                    <Wrench size={18} />
                    Repairs
                </button>
            </div>

            {/* Filters and Sort Controls */}
            <div className="card mb-6">
                <div className="filters" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="search-bar" style={{ flex: 1, minWidth: 250, maxWidth: 400 }}>
                        <Search size={18} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search by code, phone, or IMEI..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Sort and Price Range Controls - Stock Tab Only */}
                    {activeTab === 'stock' && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ArrowUpDown size={18} style={{ color: 'var(--gray-500)' }} />
                                <select
                                    className="form-input form-select"
                                    style={{ width: 'auto' }}
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="buy_date">Buy Date</option>
                                    <option value="code">TDY Code</option>
                                </select>
                                <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                                    style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                    {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                    {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                                </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>Price Range:</span>
                                <input
                                    type="number"
                                    className="form-input"
                                    style={{ width: 100 }}
                                    placeholder="Min Rs."
                                    value={priceMin}
                                    onChange={(e) => setPriceMin(e.target.value)}
                                    min="0"
                                />
                                <span style={{ color: 'var(--gray-500)' }}>to</span>
                                <input
                                    type="number"
                                    className="form-input"
                                    style={{ width: 100 }}
                                    placeholder="Max Rs."
                                    value={priceMax}
                                    onChange={(e) => setPriceMax(e.target.value)}
                                    min="0"
                                />
                            </div>
                        </>
                    )}
                    {activeTab === 'sold' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>Sort by:</span>
                            <select
                                className="form-input"
                                style={{ width: 'auto', padding: '0.4rem 0.5rem' }}
                                value={soldSortBy}
                                onChange={(e) => setSoldSortBy(e.target.value)}
                            >
                                <option value="sell_date">Sell Date</option>
                                <option value="code">TDY Code</option>
                            </select>
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setSoldSortOrder(soldSortOrder === 'asc' ? 'desc' : 'asc')}
                                title={soldSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                                style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                                {soldSortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                {soldSortOrder === 'asc' ? 'Asc' : 'Desc'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stock/Sold Table - Hidden on Repairs tab */}
            {(activeTab === 'stock' || activeTab === 'sold') && (
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
                                        <th>Return Date</th>
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
                                                <td>{stock.return_date ? new Date(stock.return_date).toLocaleDateString() : '—'}</td>
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
            )}

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
                                        {/* Show Return Date picker when moving back to in_stock */}
                                        {formData.state === 'in_stock' && (
                                            <div className="form-group">
                                                <label className="form-label">Return Date *</label>
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={formData.return_date}
                                                    onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        )}
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
                                                    onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
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

            {/* Repairs Table */}
            {activeTab === 'repairs' && (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Phone</th>
                                <th>IMEI</th>
                                <th>Colour</th>
                                <th>Issue Date</th>
                                <th>Repair Description</th>
                                <th>Person</th>
                            </tr>
                        </thead>
                        <tbody>
                            {repairs.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="empty-state">
                                            <Wrench size={48} />
                                            <p>No devices in repair</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                repairs.filter(r =>
                                    r.code?.toLowerCase().includes(search.toLowerCase()) ||
                                    r.phone?.toLowerCase().includes(search.toLowerCase()) ||
                                    r.imei?.toLowerCase().includes(search.toLowerCase())
                                ).map((repair) => (
                                    <tr key={repair.id}>
                                        <td>
                                            <div style={{ position: 'relative' }} className="repair-code-cell">
                                                <span
                                                    className="stock-code"
                                                    style={{ cursor: 'help' }}
                                                    title={`Buy Date: ${repair.buy_date ? new Date(repair.buy_date).toLocaleDateString() : 'N/A'}`}
                                                >
                                                    {repair.code}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{repair.phone}</div>
                                        </td>
                                        <td className="text-sm">{repair.imei}</td>
                                        <td>{repair.colour}</td>
                                        <td>{repair.issue_date ? new Date(repair.issue_date).toLocaleDateString() : '—'}</td>
                                        <td>
                                            <span className="text-sm" style={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {repair.repair_description || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge badge-info">{repair.person}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Issue Device Modal */}
            {showIssueModal && (
                <div className="modal-overlay" onClick={() => setShowIssueModal(false)}>
                    <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <Send size={20} style={{ marginRight: '0.5rem', color: 'var(--primary)' }} />
                                Issue Device for Repair
                            </h3>
                            <button className="modal-close" onClick={() => setShowIssueModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {/* Message Alert */}
                            {message.text && (
                                <div className={`alert alert-${message.type}`} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                    {message.text}
                                </div>
                            )}

                            {/* TDY Code Input */}
                            <div className="form-group">
                                <label className="form-label">TDY Code *</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter TDY code (e.g., TDY-1234 or 1234)"
                                        value={issueFormData.code}
                                        onChange={(e) => setIssueFormData({ ...issueFormData, code: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                lookupDeviceByCode(issueFormData.code)
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => lookupDeviceByCode(issueFormData.code)}
                                        disabled={issueLoading}
                                    >
                                        {issueLoading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
                                    </button>
                                </div>
                                <small style={{ color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'block' }}>
                                    Press Enter to auto-fill device details
                                </small>
                            </div>

                            {/* Auto-filled Device Info */}
                            {issueFormData.phone && (
                                <div style={{
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1rem',
                                    marginBottom: '1rem',
                                    border: '1px solid var(--border-light)'
                                }}>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                        Device Information
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                        <div><strong>Phone:</strong> {issueFormData.phone}</div>
                                        <div><strong>IMEI:</strong> {issueFormData.imei}</div>
                                        <div><strong>Colour:</strong> {issueFormData.colour}</div>
                                        <div><strong>Storage:</strong> {issueFormData.storage}</div>
                                    </div>
                                </div>
                            )}

                            {/* Repair Details */}
                            <div className="form-group">
                                <label className="form-label">Issue Date *</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={issueFormData.issue_date}
                                    onChange={(e) => setIssueFormData({ ...issueFormData, issue_date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Repair Description *</label>
                                <textarea
                                    className="form-input"
                                    rows={3}
                                    placeholder="Describe the issue and repair needed..."
                                    value={issueFormData.repair_description}
                                    onChange={(e) => setIssueFormData({ ...issueFormData, repair_description: e.target.value })}
                                    required
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Person / Shop *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Name of repair person or shop"
                                    value={issueFormData.person}
                                    onChange={(e) => setIssueFormData({ ...issueFormData, person: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowIssueModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleIssueDevice}
                                disabled={issueLoading || !issueFormData.phone}
                            >
                                {issueLoading ? (
                                    <>
                                        <Loader2 size={18} className="spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Issue for Repair
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receive Device Modal */}
            {showReceiveModal && (
                <div className="modal-overlay" onClick={() => setShowReceiveModal(false)}>
                    <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <RotateCcw size={20} style={{ marginRight: '0.5rem', color: 'var(--success)' }} />
                                Receive Device from Repair
                            </h3>
                            <button className="modal-close" onClick={() => setShowReceiveModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {/* Message Alert */}
                            {message.text && (
                                <div className={`alert alert-${message.type}`} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                    {message.text}
                                </div>
                            )}

                            {/* Code/IMEI Input */}
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">TDY Code</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="TDY-XXXX"
                                        value={receiveFormData.code}
                                        onChange={(e) => setReceiveFormData({ ...receiveFormData, code: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                lookupRepairDevice('code', receiveFormData.code)
                                            }
                                        }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">or IMEI</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter IMEI"
                                        value={receiveFormData.imei}
                                        onChange={(e) => setReceiveFormData({ ...receiveFormData, imei: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                lookupRepairDevice('imei', receiveFormData.imei)
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => {
                                        // Prioritize IMEI if it has value, otherwise use code
                                        if (receiveFormData.imei && receiveFormData.imei.length >= 3) {
                                            lookupRepairDevice('imei', receiveFormData.imei)
                                        } else if (receiveFormData.code && receiveFormData.code.length >= 3) {
                                            lookupRepairDevice('code', receiveFormData.code)
                                        } else {
                                            setMessage({ type: 'error', text: 'Please enter at least 3 characters' })
                                        }
                                    }}
                                    disabled={receiveLoading}
                                >
                                    {receiveLoading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                                    Search Device
                                </button>
                            </div>

                            {/* Selected Device Preview */}
                            {receiveFormData.selectedRepair && (
                                <div style={{
                                    background: 'var(--success-light)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1rem',
                                    border: '1px solid var(--success)'
                                }}>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <CheckCircle size={16} />
                                        Device Found - Ready to Receive
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                        <div><strong>Code:</strong> {receiveFormData.selectedRepair.code}</div>
                                        <div><strong>Phone:</strong> {receiveFormData.selectedRepair.phone}</div>
                                        <div><strong>IMEI:</strong> {receiveFormData.selectedRepair.imei}</div>
                                        <div><strong>Colour:</strong> {receiveFormData.selectedRepair.colour}</div>
                                        <div><strong>Issue Date:</strong> {new Date(receiveFormData.selectedRepair.issue_date).toLocaleDateString()}</div>
                                        <div><strong>Person:</strong> {receiveFormData.selectedRepair.person}</div>
                                    </div>
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <strong>Repair Issue:</strong> {receiveFormData.selectedRepair.repair_description}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowReceiveModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-success"
                                onClick={handleReceiveDevice}
                                disabled={receiveLoading || !receiveFormData.selectedRepair}
                            >
                                {receiveLoading ? (
                                    <>
                                        <Loader2 size={18} className="spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw size={18} />
                                        Receive to Stock
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Stock
