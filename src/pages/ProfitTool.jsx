import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import {
    Calculator,
    Plus,
    Trash2,
    FileText,
    Save,
    Wallet,
    DollarSign,
    Edit2,
    Loader2,
    Calendar,
    Phone,
    Package,
    Users,
    TrendingUp,
    CreditCard,
    Download
} from 'lucide-react'

const ProfitTool = () => {
    const location = useLocation()
    const [activeTab, setActiveTab] = useState(() => {
        // Check if we were navigated here with a specific tab
        return location.state?.activeTab || 'calculations'
    })

    // Update tab when navigating from dashboard
    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab)
            // Clear the state to prevent re-setting on refresh
            window.history.replaceState({}, document.title)
        }
    }, [location.state])

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Profit Calculator</h1>
                    <p className="page-subtitle">Calculate profits and track Kelan payments</p>
                </div>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'calculations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('calculations')}
                >
                    <Calculator size={18} />
                    Profit Calculations
                </button>
                <button
                    className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('payments')}
                >
                    <Wallet size={18} />
                    Kelan Payments
                </button>
            </div>

            {activeTab === 'calculations' ? <ProfitCalculations /> : <KelanPayments />}
        </div>
    )
}

const ProfitCalculations = () => {
    const location = useLocation()
    const navigate = useNavigate()

    const [phoneData, setPhoneData] = useState([])
    const [accessoryData, setAccessoryData] = useState([])
    const [thabrewData, setThabrewData] = useState([])
    const [kelanData, setKelanData] = useState([])
    const [manualThabrew, setManualThabrew] = useState([])
    const [manualKelan, setManualKelan] = useState([])
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
    const [saving, setSaving] = useState(false)

    // Edit mode state
    const [editingReportId, setEditingReportId] = useState(null)
    const [isEditMode, setIsEditMode] = useState(false)

    const [phoneForm, setPhoneForm] = useState({
        ownerType: 'TB', // 'TB' or 'Other'
        owner: 'TB',
        tdyCode: '',
        model: '',
        imei: '',
        colour: '',
        revenue: '',
        cost: ''
    })
    const [accessoryForm, setAccessoryForm] = useState({
        model: '', revenue: '', cost: ''
    })
    const [thabrewForm, setThabrewForm] = useState({ description: '', amount: '' })
    const [kelanForm, setKelanForm] = useState({ description: '', amount: '' })

    const [editPhoneIdx, setEditPhoneIdx] = useState(null)
    const [editAccessoryIdx, setEditAccessoryIdx] = useState(null)

    // Load report data if editing
    useEffect(() => {
        if (location.state?.editReport) {
            const report = location.state.editReport
            setIsEditMode(true)
            setEditingReportId(report.id)
            setReportDate(report.report_date)

            // Load phone entries
            if (report.phone_entries && Array.isArray(report.phone_entries)) {
                setPhoneData(report.phone_entries)
            }

            // Load accessory entries
            if (report.accessory_entries && Array.isArray(report.accessory_entries)) {
                setAccessoryData(report.accessory_entries)
            }

            // Load thabrew entries as manual entries
            if (report.thabrew_entries && Array.isArray(report.thabrew_entries)) {
                const manualTh = report.thabrew_entries.filter(t => t.isManual)
                setManualThabrew(manualTh)
            }

            // Load kelan entries as manual entries
            if (report.kelan_entries && Array.isArray(report.kelan_entries)) {
                const manualKe = report.kelan_entries.filter(k => k.isManual)
                setManualKelan(manualKe)
            }

            // Clear the location state to prevent reload on navigation
            window.history.replaceState({}, document.title)
        }
    }, [location.state])

    useEffect(() => {
        updateOwnerTables()
    }, [phoneData, accessoryData, manualThabrew, manualKelan])

    const calculateProfitSplit = (revenue, cost) => {
        const profit = revenue - cost
        return { profit, thabrew: profit * 0.8, kelan: profit * 0.2 }
    }

    const updateOwnerTables = () => {
        let phoneThabrewTotal = 0, phoneKelanTotal = 0
        let accessoryThabrewTotal = 0, accessoryKelanTotal = 0, accessoryCostTotal = 0

        phoneData.forEach(p => {
            phoneThabrewTotal += p.thabrew
            phoneKelanTotal += p.kelan
        })

        accessoryData.forEach(a => {
            accessoryThabrewTotal += a.thabrew
            accessoryKelanTotal += a.kelan
            accessoryCostTotal += a.cost
        })

        const newThabrew = [
            { description: 'Phone Profit (80%)', amount: phoneThabrewTotal, isManual: false },
            { description: 'Accessories Profit (80%)', amount: accessoryThabrewTotal, isManual: false },
            { description: 'Accessories Cost', amount: accessoryCostTotal, isManual: false }
        ]

        phoneData.forEach(p => {
            if (p.owner && p.owner.toUpperCase() === 'TB') {
                newThabrew.push({
                    description: `${p.model} (${p.imei})`,
                    amount: p.cost,
                    isManual: false
                })
            }
        })

        manualThabrew.forEach(m => newThabrew.push({ ...m, isManual: true }))

        const newKelan = [
            { description: 'Phone Profit (20%)', amount: phoneKelanTotal, isManual: false },
            { description: 'Accessories Profit (20%)', amount: accessoryKelanTotal, isManual: false }
        ]

        manualKelan.forEach(m => newKelan.push({ ...m, isManual: true }))

        setThabrewData(newThabrew)
        setKelanData(newKelan)
    }

    // Lookup stock by TDY code and auto-fill form
    const lookupStockByCode = async (code) => {
        if (!code) return

        // Format code to TDY-XXXX if user just enters XXXX
        const fullCode = code.startsWith('TDY-') ? code : `TDY-${code}`

        try {
            const { data: stock, error } = await supabase
                .from('stocks')
                .select('*')
                .eq('code', fullCode)
                .single()

            if (error || !stock) {
                console.log(`Stock with code ${fullCode} not found`)
                return
            }

            // Auto-fill form with stock data
            setPhoneForm(prev => ({
                ...prev,
                model: stock.phone || '',
                imei: stock.imei || '',
                colour: stock.colour || '',
                cost: (stock.cost || stock.wholesale_price || 0).toString()
            }))
        } catch (err) {
            console.error('Error looking up stock:', err)
        }
    }

    const addPhone = () => {
        const { model, imei, colour, ownerType, owner, revenue, cost, tdyCode } = phoneForm

        // Determine final owner value
        const finalOwner = ownerType === 'TB' ? 'TB' : owner

        if (!model || !imei || !colour || !finalOwner) {
            alert('Please fill in Model, IMEI, Colour, and Owner')
            return
        }

        const numRevenue = parseFloat(revenue) || 0
        const numCost = parseFloat(cost) || 0
        const { profit, thabrew, kelan } = calculateProfitSplit(numRevenue, numCost)

        // Include tdyCode for TB phones to enable stock lookup by code
        const fullTdyCode = tdyCode ? (tdyCode.startsWith('TDY-') ? tdyCode : `TDY-${tdyCode}`) : ''
        const entry = { model, imei, colour, owner: finalOwner, revenue: numRevenue, cost: numCost, profit, thabrew, kelan, tdyCode: fullTdyCode }

        if (editPhoneIdx !== null) {
            const updated = [...phoneData]
            updated[editPhoneIdx] = entry
            setPhoneData(updated)
            setEditPhoneIdx(null)
        } else {
            setPhoneData([...phoneData, entry])
        }
        // Reset form
        setPhoneForm({
            ownerType: 'TB',
            owner: 'TB',
            tdyCode: '',
            model: '',
            imei: '',
            colour: '',
            revenue: '',
            cost: ''
        })
    }

    const editPhone = (idx) => {
        const entry = phoneData[idx]
        setPhoneForm({
            ownerType: entry.owner === 'TB' ? 'TB' : 'Other',
            owner: entry.owner,
            tdyCode: '',
            model: entry.model,
            imei: entry.imei,
            colour: entry.colour,
            revenue: entry.revenue.toString(),
            cost: entry.cost.toString()
        })
        setEditPhoneIdx(idx)
    }

    const deletePhone = (idx) => {
        setPhoneData(phoneData.filter((_, i) => i !== idx))
    }

    const addAccessory = () => {
        const { model, revenue, cost } = accessoryForm
        if (!model) {
            alert('Please fill in Model')
            return
        }

        const numRevenue = parseFloat(revenue) || 0
        const numCost = parseFloat(cost) || 0
        const { profit, thabrew, kelan } = calculateProfitSplit(numRevenue, numCost)

        const entry = { model, revenue: numRevenue, cost: numCost, profit, thabrew, kelan }

        if (editAccessoryIdx !== null) {
            const updated = [...accessoryData]
            updated[editAccessoryIdx] = entry
            setAccessoryData(updated)
            setEditAccessoryIdx(null)
        } else {
            setAccessoryData([...accessoryData, entry])
        }
        setAccessoryForm({ model: '', revenue: '', cost: '' })
    }

    const editAccessory = (idx) => {
        setAccessoryForm({ ...accessoryData[idx] })
        setEditAccessoryIdx(idx)
    }

    const deleteAccessory = (idx) => {
        setAccessoryData(accessoryData.filter((_, i) => i !== idx))
    }

    const addThabrewManual = () => {
        if (!thabrewForm.description) return
        const amount = parseFloat(thabrewForm.amount) || 0
        setManualThabrew([...manualThabrew, { description: thabrewForm.description, amount }])
        setThabrewForm({ description: '', amount: '' })
    }

    const deleteThabrewManual = (idx) => {
        const entry = thabrewData[idx]
        if (!entry.isManual) return
        const manualIdx = manualThabrew.findIndex(m => m.description === entry.description && m.amount === entry.amount)
        if (manualIdx !== -1) setManualThabrew(manualThabrew.filter((_, i) => i !== manualIdx))
    }

    const addKelanManual = () => {
        if (!kelanForm.description) return
        const amount = parseFloat(kelanForm.amount) || 0
        setManualKelan([...manualKelan, { description: kelanForm.description, amount }])
        setKelanForm({ description: '', amount: '' })
    }

    const deleteKelanManual = (idx) => {
        const entry = kelanData[idx]
        if (!entry.isManual) return
        const manualIdx = manualKelan.findIndex(m => m.description === entry.description && m.amount === entry.amount)
        if (manualIdx !== -1) setManualKelan(manualKelan.filter((_, i) => i !== manualIdx))
    }

    const generatePDF = () => {
        const doc = new jsPDF()
        let y = 20

        // Header
        doc.setFontSize(18)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('Sale Profit Management Report', 105, y, { align: 'center' })
        y += 10

        doc.setFontSize(12)
        doc.setFont(undefined, 'normal')
        doc.text(`Report Date: ${new Date(reportDate).toLocaleDateString()}`, 105, y, { align: 'center' })
        y += 15

        doc.setFontSize(14)
        doc.setFont(undefined, 'bold')
        doc.text('Phone Chart', 14, y)
        y += 5

        const phoneRows = phoneData.map(p => [
            p.model, p.imei, p.colour, p.owner,
            p.revenue.toFixed(2), p.cost.toFixed(2), p.profit.toFixed(2),
            p.thabrew.toFixed(2), p.kelan.toFixed(2)
        ])

        const phoneTotals = phoneData.reduce((acc, curr) => ({
            rev: acc.rev + curr.revenue, cost: acc.cost + curr.cost, prof: acc.prof + curr.profit,
            th: acc.th + curr.thabrew, ke: acc.ke + curr.kelan
        }), { rev: 0, cost: 0, prof: 0, th: 0, ke: 0 })

        phoneRows.push(['TOTAL', '', '', '', phoneTotals.rev.toFixed(2), phoneTotals.cost.toFixed(2), phoneTotals.prof.toFixed(2), phoneTotals.th.toFixed(2), phoneTotals.ke.toFixed(2)])

        doc.autoTable({
            startY: y,
            head: [['Model', 'IMEI', 'Colour', 'Owner', 'Revenue', 'Cost', 'Profit', 'Thabrew', 'Kelan']],
            body: phoneRows,
            theme: 'plain',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
        })
        y = doc.lastAutoTable.finalY + 15

        if (y > 250) { doc.addPage(); y = 20 }
        doc.text('Accessories Chart', 14, y)
        y += 5

        const accRows = accessoryData.map(a => [a.model, a.revenue.toFixed(2), a.cost.toFixed(2), a.profit.toFixed(2), a.thabrew.toFixed(2), a.kelan.toFixed(2)])
        const accTotals = accessoryData.reduce((acc, curr) => ({
            rev: acc.rev + curr.revenue, cost: acc.cost + curr.cost, prof: acc.prof + curr.profit,
            th: acc.th + curr.thabrew, ke: acc.ke + curr.kelan
        }), { rev: 0, cost: 0, prof: 0, th: 0, ke: 0 })
        accRows.push(['TOTAL', accTotals.rev.toFixed(2), accTotals.cost.toFixed(2), accTotals.prof.toFixed(2), accTotals.th.toFixed(2), accTotals.ke.toFixed(2)])

        doc.autoTable({
            startY: y,
            head: [['Model', 'Revenue', 'Cost', 'Profit', 'Thabrew', 'Kelan']],
            body: accRows,
            theme: 'plain',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
        })
        y = doc.lastAutoTable.finalY + 15

        if (y > 250) { doc.addPage(); y = 20 }
        doc.text('Thabrew Profit', 14, y)
        y += 5

        const thRows = thabrewData.map(t => [t.description, t.amount.toFixed(2)])
        const thTotal = thabrewData.reduce((s, t) => s + t.amount, 0)
        thRows.push(['TOTAL', thTotal.toFixed(2)])

        doc.autoTable({
            startY: y,
            head: [['Description', 'Amount']],
            body: thRows,
            theme: 'plain',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
        })
        y = doc.lastAutoTable.finalY + 15

        if (y > 250) { doc.addPage(); y = 20 }
        doc.text('Kelan Profit', 14, y)
        y += 5

        const keRows = kelanData.map(k => [k.description, k.amount.toFixed(2)])
        const keTotal = kelanData.reduce((s, k) => s + k.amount, 0)
        keRows.push(['TOTAL', keTotal.toFixed(2)])

        doc.autoTable({
            startY: y,
            head: [['Description', 'Amount']],
            body: keRows,
            theme: 'plain',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] }
        })

        doc.save(`Sale_Profit_Report_${reportDate}.pdf`)
    }

    const saveReport = async () => {
        setSaving(true)
        try {
            const thTotal = thabrewData.reduce((s, t) => s + t.amount, 0)
            const keTotal = kelanData.reduce((s, k) => s + k.amount, 0)
            const pTotals = phoneData.reduce((acc, curr) => ({
                rev: acc.rev + curr.revenue, cost: acc.cost + curr.cost, prof: acc.prof + curr.profit,
                th: acc.th + curr.thabrew, ke: acc.ke + curr.kelan
            }), { rev: 0, cost: 0, prof: 0, th: 0, ke: 0 })
            const aTotals = accessoryData.reduce((acc, curr) => ({
                rev: acc.rev + curr.revenue, cost: acc.cost + curr.cost, prof: acc.prof + curr.profit,
                th: acc.th + curr.thabrew, ke: acc.ke + curr.kelan
            }), { rev: 0, cost: 0, prof: 0, th: 0, ke: 0 })

            const reportData = {
                report_date: reportDate,
                phone_total_revenue: pTotals.rev, phone_total_cost: pTotals.cost, phone_total_profit: pTotals.prof,
                accessory_total_revenue: aTotals.rev, accessory_total_cost: aTotals.cost, accessory_total_profit: aTotals.prof,
                thabrew_phone_profit: pTotals.th, thabrew_accessory_profit: aTotals.th, thabrew_total: thTotal,
                kelan_phone_profit: pTotals.ke, kelan_accessory_profit: aTotals.ke, kelan_total: keTotal,
                phone_entries: phoneData, accessory_entries: accessoryData, thabrew_entries: thabrewData, kelan_entries: kelanData
            }

            let error
            if (isEditMode && editingReportId) {
                // Update existing report
                const result = await supabase
                    .from('profit_reports')
                    .update(reportData)
                    .eq('id', editingReportId)
                error = result.error
            } else {
                // Insert new report
                const result = await supabase.from('profit_reports').insert([reportData])
                error = result.error
            }

            if (error) throw error

            // Move stocks to sold_stocks for BOTH new AND edited reports
            // This ensures any phones in the report that still exist in stocks are moved
            let movedCount = 0
            let skippedCount = 0

            for (const p of phoneData) {
                console.log('Processing phone entry:', p)
                // Only process if we have a way to look up the stock (tdyCode or imei)
                if (p.tdyCode || p.imei) {
                    try {
                        let stockItem = null
                        let fetchError = null

                        // Step 1: Try to find stock by TDY code first (for TB phones)
                        if (p.tdyCode) {
                            console.log(`Looking up stock with code: ${p.tdyCode}`)
                            const result = await supabase
                                .from('stocks')
                                .select('*')
                                .eq('code', p.tdyCode)
                                .single()
                            stockItem = result.data
                            fetchError = result.error
                        }

                        // Step 2: If not found by code, try IMEI
                        if (!stockItem && p.imei) {
                            console.log(`Looking up stock with IMEI: ${p.imei}`)
                            const result = await supabase
                                .from('stocks')
                                .select('*')
                                .eq('imei', p.imei)
                                .single()
                            stockItem = result.data
                            fetchError = result.error
                        }

                        if (fetchError && fetchError.code !== 'PGRST116') {
                            console.log(`Fetch error:`, fetchError.message)
                            skippedCount++
                            continue
                        }
                        if (!stockItem) {
                            console.log(`Stock not found for entry (may already be sold), skipping...`)
                            skippedCount++
                            continue
                        }

                        console.log('Found stock:', stockItem)

                        // Step 3: Copy data from stock table, but use COST from profit report
                        const costValue = parseFloat(p.cost) || 0  // Cost from profit report
                        const sellPriceValue = parseFloat(p.revenue) || 0

                        const soldStockData = {
                            original_id: stockItem.id,
                            code: stockItem.code || 'N/A',
                            phone: stockItem.phone || 'Unknown',
                            imei: stockItem.imei,
                            storage: stockItem.storage || 'N/A',
                            colour: stockItem.colour || 'N/A',
                            description: stockItem.description || '',
                            buy_date: stockItem.buy_date,
                            cost: costValue,  // FROM PROFIT REPORT, not from stock table
                            sell_price: sellPriceValue,
                            sell_date: reportDate
                        }

                        console.log('Inserting sold_stock data:', soldStockData)

                        // Step 4: Insert into sold_stocks
                        const { error: insertError } = await supabase
                            .from('sold_stocks')
                            .insert([soldStockData])

                        if (insertError) {
                            console.error(`Failed to insert stock ${p.imei} into sold_stocks:`, insertError)
                            skippedCount++
                            continue
                        }

                        console.log(`Inserted into sold_stocks successfully`)

                        // Step 5: DELETE from stocks table (CRITICAL - must happen!)
                        console.log(`Attempting to delete stock id: ${stockItem.id} from stocks table...`)

                        const { data: deleteData, error: deleteError } = await supabase
                            .from('stocks')
                            .delete()
                            .eq('id', stockItem.id)
                            .select()  // Return deleted rows to verify

                        if (deleteError) {
                            console.error(`DELETE ERROR for stock ${p.imei}:`, deleteError)
                            // Try to remove the sold_stock entry we just added since delete failed
                            await supabase.from('sold_stocks').delete().eq('imei', stockItem.imei)
                            skippedCount++
                            continue
                        }

                        console.log(`Delete result:`, deleteData)
                        console.log(`Successfully moved stock ${p.imei} from stocks to sold_stocks`)
                        movedCount++

                    } catch (err) {
                        console.error(`Error moving stock ${p.imei}:`, err)
                        skippedCount++
                    }
                } else {
                    console.log('Skipped entry - no TDY code or IMEI to lookup stock:', p)
                }
            }

            console.log(`Stock movement complete: ${movedCount} moved to sold, ${skippedCount} skipped`)

            // Generate PDF after successful save
            generatePDF()

            if (isEditMode) {
                alert(`Report updated successfully! PDF generated!\n\nStock movement: ${movedCount} moved to sold, ${skippedCount} skipped.\n\nCheck browser console (F12) for details.`)
                // Reset edit mode and navigate back to reports
                setIsEditMode(false)
                setEditingReportId(null)
                navigate('/reports')
            } else {
                alert(`Report saved! PDF generated!\n\nStock movement: ${movedCount} moved to sold, ${skippedCount} skipped.\n\nCheck browser console (F12) for details.`)
            }

            setPhoneData([])
            setAccessoryData([])
            setManualThabrew([])
            setManualKelan([])
        } catch (error) {
            alert(error.message)
        } finally {
            setSaving(false)
        }
    }

    const phoneTotals = phoneData.reduce((acc, p) => ({
        rev: acc.rev + p.revenue, cost: acc.cost + p.cost, prof: acc.prof + p.profit,
        th: acc.th + p.thabrew, ke: acc.ke + p.kelan
    }), { rev: 0, cost: 0, prof: 0, th: 0, ke: 0 })

    const accTotals = accessoryData.reduce((acc, a) => ({
        rev: acc.rev + a.revenue, cost: acc.cost + a.cost, prof: acc.prof + a.profit,
        th: acc.th + a.thabrew, ke: acc.ke + a.kelan
    }), { rev: 0, cost: 0, prof: 0, th: 0, ke: 0 })

    const thTotal = thabrewData.reduce((s, t) => s + t.amount, 0)
    const keTotal = kelanData.reduce((s, k) => s + k.amount, 0)

    return (
        <div>
            {/* Date Selection */}
            <div className="card mb-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Calendar size={20} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Report Date:</span>
                    <input
                        type="date"
                        className="form-input"
                        style={{ width: 'auto' }}
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Phone Chart Section */}
            <div className="card mb-6">
                <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                            background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Phone size={20} style={{ color: 'var(--primary)' }} />
                        </div>
                        <h2 className="card-title">Phone Sales</h2>
                    </div>
                </div>

                {/* Row 1: Owner Type, TDY Code (if TB), Owner Input (if Other) */}
                <div className="grid-2 mb-4" style={{ gridTemplateColumns: phoneForm.ownerType === 'TB' ? '1fr 1fr 1fr 1fr' : '1fr 2fr 1fr' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Owner Type</label>
                        <select
                            className="form-input"
                            value={phoneForm.ownerType}
                            onChange={e => {
                                const type = e.target.value
                                setPhoneForm({
                                    ...phoneForm,
                                    ownerType: type,
                                    owner: type === 'TB' ? 'TB' : '',
                                    tdyCode: '',
                                    model: type === 'Other' ? phoneForm.model : '',
                                    imei: type === 'Other' ? phoneForm.imei : '',
                                    colour: type === 'Other' ? phoneForm.colour : '',
                                    cost: type === 'Other' ? phoneForm.cost : ''
                                })
                            }}
                        >
                            <option value="TB">TB (Teddy)</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {phoneForm.ownerType === 'TB' && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">TDY Code</label>
                            <input
                                className="form-input"
                                placeholder="Enter code (e.g., 1234)"
                                value={phoneForm.tdyCode}
                                onChange={e => setPhoneForm({ ...phoneForm, tdyCode: e.target.value })}
                                onBlur={e => lookupStockByCode(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        lookupStockByCode(phoneForm.tdyCode)
                                    }
                                }}
                            />
                        </div>
                    )}

                    {phoneForm.ownerType === 'Other' && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Owner Name</label>
                            <input
                                className="form-input"
                                placeholder="Enter owner name"
                                value={phoneForm.owner}
                                onChange={e => setPhoneForm({ ...phoneForm, owner: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Revenue</label>
                        <input type="number" className="form-input" placeholder="0" value={phoneForm.revenue} onChange={e => setPhoneForm({ ...phoneForm, revenue: e.target.value })} />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Cost</label>
                        <input type="number" className="form-input" placeholder="0" value={phoneForm.cost} onChange={e => setPhoneForm({ ...phoneForm, cost: e.target.value })} />
                    </div>
                </div>

                {/* Row 2: Model, IMEI, Colour */}
                <div className="grid-2 mb-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Model</label>
                        <input className="form-input" placeholder="iPhone 14" value={phoneForm.model} onChange={e => setPhoneForm({ ...phoneForm, model: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">IMEI</label>
                        <input className="form-input" placeholder="356789012345678" value={phoneForm.imei} onChange={e => setPhoneForm({ ...phoneForm, imei: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Colour</label>
                        <input className="form-input" placeholder="Black" value={phoneForm.colour} onChange={e => setPhoneForm({ ...phoneForm, colour: e.target.value })} />
                    </div>
                </div>

                <button className="btn btn-primary w-full" onClick={addPhone}>
                    <Plus size={18} />
                    {editPhoneIdx !== null ? 'Update Entry' : 'Add Phone Sale'}
                </button>

                {phoneData.length > 0 && (
                    <div className="table-container mt-4">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Model</th>
                                    <th>IMEI</th>
                                    <th>Colour</th>
                                    <th>Owner</th>
                                    <th>Revenue</th>
                                    <th>Cost</th>
                                    <th>Profit</th>
                                    <th>Thabrew</th>
                                    <th>Kelan</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {phoneData.map((p, i) => (
                                    <tr key={i}>
                                        <td>{p.model}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.imei}</td>
                                        <td>{p.colour}</td>
                                        <td><span className={`badge ${p.owner?.toUpperCase() === 'TB' ? 'badge-success' : 'badge-info'}`}>{p.owner}</span></td>
                                        <td>Rs. {p.revenue.toLocaleString()}</td>
                                        <td>Rs. {p.cost.toLocaleString()}</td>
                                        <td style={{ fontWeight: 600, color: p.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>Rs. {p.profit.toLocaleString()}</td>
                                        <td>Rs. {p.thabrew.toLocaleString()}</td>
                                        <td>Rs. {p.kelan.toLocaleString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button className="btn btn-sm btn-outline" onClick={() => editPhone(i)}><Edit2 size={14} /></button>
                                                <button className="btn btn-sm btn-danger" onClick={() => deletePhone(i)}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--success-light)' }}>
                                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>TOTALS:</td>
                                    <td>Rs. {phoneTotals.rev.toLocaleString()}</td>
                                    <td>Rs. {phoneTotals.cost.toLocaleString()}</td>
                                    <td style={{ fontWeight: 700 }}>Rs. {phoneTotals.prof.toLocaleString()}</td>
                                    <td>Rs. {phoneTotals.th.toLocaleString()}</td>
                                    <td>Rs. {phoneTotals.ke.toLocaleString()}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Accessories Section */}
            <div className="card mb-6">
                <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                            background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Package size={20} style={{ color: 'var(--primary)' }} />
                        </div>
                        <h2 className="card-title">Accessory Sales</h2>
                    </div>
                </div>

                <div className="grid-3 mb-4">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Model / Description</label>
                        <input className="form-input" placeholder="USB-C Cable" value={accessoryForm.model} onChange={e => setAccessoryForm({ ...accessoryForm, model: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Revenue</label>
                        <input type="number" className="form-input" placeholder="0" value={accessoryForm.revenue} onChange={e => setAccessoryForm({ ...accessoryForm, revenue: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Cost</label>
                        <input type="number" className="form-input" placeholder="0" value={accessoryForm.cost} onChange={e => setAccessoryForm({ ...accessoryForm, cost: e.target.value })} />
                    </div>
                </div>

                <button className="btn btn-primary w-full" onClick={addAccessory}>
                    <Plus size={18} />
                    {editAccessoryIdx !== null ? 'Update Entry' : 'Add Accessory Sale'}
                </button>

                {accessoryData.length > 0 && (
                    <div className="table-container mt-4">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Model</th>
                                    <th>Revenue</th>
                                    <th>Cost</th>
                                    <th>Profit</th>
                                    <th>Thabrew</th>
                                    <th>Kelan</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accessoryData.map((a, i) => (
                                    <tr key={i}>
                                        <td>{a.model}</td>
                                        <td>Rs. {a.revenue.toLocaleString()}</td>
                                        <td>Rs. {a.cost.toLocaleString()}</td>
                                        <td style={{ fontWeight: 600, color: a.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>Rs. {a.profit.toLocaleString()}</td>
                                        <td>Rs. {a.thabrew.toLocaleString()}</td>
                                        <td>Rs. {a.kelan.toLocaleString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button className="btn btn-sm btn-outline" onClick={() => editAccessory(i)}><Edit2 size={14} /></button>
                                                <button className="btn btn-sm btn-danger" onClick={() => deleteAccessory(i)}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--success-light)' }}>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>TOTALS:</td>
                                    <td>Rs. {accTotals.rev.toLocaleString()}</td>
                                    <td>Rs. {accTotals.cost.toLocaleString()}</td>
                                    <td style={{ fontWeight: 700 }}>Rs. {accTotals.prof.toLocaleString()}</td>
                                    <td>Rs. {accTotals.th.toLocaleString()}</td>
                                    <td>Rs. {accTotals.ke.toLocaleString()}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Owner Profit Sections */}
            <div className="grid-2 mb-6">
                {/* Thabrew Section */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                                background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Users size={20} style={{ color: 'var(--success)' }} />
                            </div>
                            <div>
                                <h2 className="card-title">Thabrew Profit</h2>
                                <span className="text-sm text-muted">80% share + TB phone costs</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input className="form-input" placeholder="Description" value={thabrewForm.description} onChange={e => setThabrewForm({ ...thabrewForm, description: e.target.value })} style={{ flex: 1 }} />
                        <input type="number" className="form-input" placeholder="Amount" value={thabrewForm.amount} onChange={e => setThabrewForm({ ...thabrewForm, amount: e.target.value })} style={{ width: '120px' }} />
                        <button className="btn btn-success" onClick={addThabrewManual}><Plus size={18} /></button>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th style={{ width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {thabrewData.map((t, i) => (
                                    <tr key={i}>
                                        <td>
                                            {t.description}
                                            {!t.isManual && <span className="badge badge-info" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>Auto</span>}
                                        </td>
                                        <td>Rs. {t.amount.toLocaleString()}</td>
                                        <td>
                                            {t.isManual && <button className="btn btn-sm btn-danger" onClick={() => deleteThabrewManual(i)}><Trash2 size={14} /></button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--success-light)' }}>
                                    <td style={{ fontWeight: 700 }}>TOTAL</td>
                                    <td style={{ fontWeight: 700, fontSize: '1.1rem' }}>Rs. {thTotal.toLocaleString()}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Kelan Section */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                                background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <TrendingUp size={20} style={{ color: 'var(--warning)' }} />
                            </div>
                            <div>
                                <h2 className="card-title">Kelan Profit</h2>
                                <span className="text-sm text-muted">20% share</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input className="form-input" placeholder="Description" value={kelanForm.description} onChange={e => setKelanForm({ ...kelanForm, description: e.target.value })} style={{ flex: 1 }} />
                        <input type="number" className="form-input" placeholder="Amount" value={kelanForm.amount} onChange={e => setKelanForm({ ...kelanForm, amount: e.target.value })} style={{ width: '120px' }} />
                        <button className="btn btn-primary" onClick={addKelanManual}><Plus size={18} /></button>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th style={{ width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {kelanData.map((k, i) => (
                                    <tr key={i}>
                                        <td>
                                            {k.description}
                                            {!k.isManual && <span className="badge badge-info" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>Auto</span>}
                                        </td>
                                        <td>Rs. {k.amount.toLocaleString()}</td>
                                        <td>
                                            {k.isManual && <button className="btn btn-sm btn-danger" onClick={() => deleteKelanManual(i)}><Trash2 size={14} /></button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--warning-light)' }}>
                                    <td style={{ fontWeight: 700 }}>TOTAL</td>
                                    <td style={{ fontWeight: 700, fontSize: '1.1rem' }}>Rs. {keTotal.toLocaleString()}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="card" style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button className="btn btn-primary btn-lg" onClick={saveReport} disabled={saving}>
                    {saving ? <Loader2 size={20} className="spin" /> : <FileText size={20} />}
                    Save & Generate PDF Report
                </button>
            </div>
        </div>
    )
}

const KelanPayments = () => {
    const [payments, setPayments] = useState([])
    const [summary, setSummary] = useState({ earned: 0, paid: 0, balance: 0 })
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        description: ''
    })
    const [saving, setSaving] = useState(false)

    // Payslip States - Load from localStorage if available
    const date = new Date()
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]
    const currentDay = date.toISOString().split('T')[0]
    const [payslipRange, setPayslipRange] = useState(() => {
        const saved = localStorage.getItem('kelanPayslipRange')
        if (saved) {
            try {
                return JSON.parse(saved)
            } catch {
                return { start: firstDay, end: currentDay }
            }
        }
        return { start: firstDay, end: currentDay }
    })
    const [generatingPayslip, setGeneratingPayslip] = useState(false)

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        try {
            const { data: paymentsData } = await supabase.from('kelan_payments').select('*').order('payment_date', { ascending: false })
            setPayments(paymentsData || [])

            const { data: reports } = await supabase.from('profit_reports').select('kelan_total')
            const totalEarned = reports?.reduce((sum, r) => sum + (parseFloat(r.kelan_total) || 0), 0) || 0
            const totalPaid = paymentsData?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0

            setSummary({ earned: totalEarned, paid: totalPaid, balance: totalEarned - totalPaid })
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const addPayment = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const { error } = await supabase.from('kelan_payments').insert([{
                payment_date: formData.payment_date,
                amount: parseFloat(formData.amount),
                description: formData.description
            }])
            if (error) throw error
            setFormData({ payment_date: new Date().toISOString().split('T')[0], amount: '', description: '' })
            await fetchData()
        } catch (error) {
            alert(error.message)
        } finally {
            setSaving(false)
        }
    }

    const generatePayslip = async () => {
        setGeneratingPayslip(true)
        try {
            // 1. Fetch Earnings (Profit Reports) within range
            const { data: earningsData, error: earningsError } = await supabase
                .from('profit_reports')
                .select('report_date, kelan_total')
                .gte('report_date', payslipRange.start)
                .lte('report_date', payslipRange.end)
                .order('report_date', { ascending: true })

            if (earningsError) throw earningsError

            // 2. Fetch Payments within range
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('kelan_payments')
                .select('payment_date, amount, description')
                .gte('payment_date', payslipRange.start)
                .lte('payment_date', payslipRange.end)
                .order('payment_date', { ascending: true })

            if (paymentsError) throw paymentsError

            // 3. Generate PDF
            const doc = new jsPDF()
            let y = 20

            // Header - Plain Black & White
            doc.setFontSize(20)
            doc.setTextColor(0, 0, 0)
            doc.text('PAYSLIP - KELAN', 105, y, { align: 'center' })
            y += 10

            doc.setFontSize(12)
            doc.text(`Period: ${new Date(payslipRange.start).toLocaleDateString()} to ${new Date(payslipRange.end).toLocaleDateString()}`, 105, y, { align: 'center' })
            y += 15

            // --- Daily Earnings Table ---
            doc.setFontSize(14)
            doc.setFont(undefined, 'bold')
            doc.text('Daily Earnings', 14, y)

            const earningsRows = earningsData.map(r => [
                new Date(r.report_date).toLocaleDateString(),
                'Daily Profit Share',
                parseFloat(r.kelan_total).toFixed(2)
            ])

            const totalEarnings = earningsData.reduce((sum, r) => sum + (parseFloat(r.kelan_total) || 0), 0)
            earningsRows.push(['TOTAL EARNINGS', '', totalEarnings.toFixed(2)])

            doc.autoTable({
                startY: y + 5,
                head: [['Date', 'Description', 'Amount (Rs.)']],
                body: earningsRows,
                theme: 'plain',
                styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
                headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] },
                columnStyles: { 2: { halign: 'right' } }
            })

            y = doc.lastAutoTable.finalY + 15

            // --- Payments Received Table ---
            if (y > 250) { doc.addPage(); y = 20 }
            doc.text('Payments Received', 14, y)

            const paymentRows = paymentsData.map(p => [
                new Date(p.payment_date).toLocaleDateString(),
                p.description || 'Payment',
                parseFloat(p.amount).toFixed(2)
            ])

            const totalPayments = paymentsData.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
            paymentRows.push(['TOTAL PAID', '', totalPayments.toFixed(2)])

            doc.autoTable({
                startY: y + 5,
                head: [['Date', 'Description', 'Amount (Rs.)']],
                body: paymentRows,
                theme: 'plain',
                styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
                headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0] },
                columnStyles: { 2: { halign: 'right' } }
            })

            y = doc.lastAutoTable.finalY + 20

            // --- Summary Section ---
            if (y > 230) { doc.addPage(); y = 20 }

            doc.autoTable({
                startY: y,
                theme: 'plain',
                styles: { lineColor: [0, 0, 0], lineWidth: 0.1, fontSize: 12 },
                body: [
                    ['Total Earnings for Period', totalEarnings.toFixed(2)],
                    ['Total Paid in Period', totalPayments.toFixed(2)],
                    ['NET BALANCE (Period)', (totalEarnings - totalPayments).toFixed(2)]
                ],
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
            })

            doc.save(`Payslip_Kelan_${payslipRange.start}_to_${payslipRange.end}.pdf`)

        } catch (error) {
            console.error('Payslip Error:', error)
            alert('Error generating payslip: ' + error.message)
        } finally {
            setGeneratingPayslip(false)
        }
    }

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>

    // Calculate range-specific totals for the summary cards
    const getRangeTotals = () => {
        // This will be calculated when payslip data is fetched
        return { earned: 0, paid: 0, balance: 0 }
    }

    return (
        <div>
            {/* Generate Payslip Card - Now includes summary cards */}
            <div className="card mb-6">
                <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                            background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <FileText size={20} style={{ color: 'var(--text-secondary)' }} />
                        </div>
                        <div>
                            <h2 className="card-title">Generate Payslip</h2>
                            <p className="text-sm text-muted">View earnings summary and download detailed report for a specific period</p>
                        </div>
                    </div>
                </div>

                {/* Date Range Selector */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label className="form-label">Start Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={payslipRange.start}
                            onChange={e => {
                                const newRange = { ...payslipRange, start: e.target.value }
                                setPayslipRange(newRange)
                                localStorage.setItem('kelanPayslipRange', JSON.stringify(newRange))
                            }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label className="form-label">End Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={payslipRange.end}
                            onChange={e => {
                                const newRange = { ...payslipRange, end: e.target.value }
                                setPayslipRange(newRange)
                                localStorage.setItem('kelanPayslipRange', JSON.stringify(newRange))
                            }}
                        />
                    </div>
                </div>

                {/* Summary Cards - Filtered by date range */}
                <RangeSummaryCards payslipRange={payslipRange} />

                {/* Download Button */}
                <button className="btn btn-secondary w-full" onClick={generatePayslip} disabled={generatingPayslip} style={{ marginTop: '1rem' }}>
                    {generatingPayslip ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
                    Download Payslip PDF
                </button>
            </div>

            <div className="grid-2">
                {/* Add Payment Form */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                                background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Plus size={20} style={{ color: 'var(--primary)' }} />
                            </div>
                            <h2 className="card-title">Record Payment</h2>
                        </div>
                    </div>

                    <form onSubmit={addPayment}>
                        <div className="form-group">
                            <label className="form-label">Payment Date</label>
                            <input type="date" className="form-input" value={formData.payment_date} onChange={e => setFormData({ ...formData, payment_date: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Amount (Rs.)</label>
                            <input type="number" className="form-input" placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required min="0" step="0.01" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description (Optional)</label>
                            <input className="form-input" placeholder="Payment notes..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                            {saving ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
                            Record Payment
                        </button>
                    </form>
                </div>

                {/* Payment History */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                                background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <FileText size={20} style={{ color: 'var(--success)' }} />
                            </div>
                            <h2 className="card-title">Payment History</h2>
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={3}>
                                            <div className="empty-state">
                                                <Wallet size={32} />
                                                <p>No payments recorded yet</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map(p => (
                                        <tr key={p.id}>
                                            <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--success)' }}>Rs. {parseFloat(p.amount).toLocaleString()}</td>
                                            <td>{p.description || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Sub-component for range-filtered summary cards
const RangeSummaryCards = ({ payslipRange }) => {
    const [rangeSummary, setRangeSummary] = useState({ earned: 0, paid: 0, balance: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRangeData = async () => {
            setLoading(true)
            try {
                // Fetch earnings in range
                const { data: earningsData } = await supabase
                    .from('profit_reports')
                    .select('kelan_total')
                    .gte('report_date', payslipRange.start)
                    .lte('report_date', payslipRange.end)

                // Fetch payments in range
                const { data: paymentsData } = await supabase
                    .from('kelan_payments')
                    .select('amount')
                    .gte('payment_date', payslipRange.start)
                    .lte('payment_date', payslipRange.end)

                const earned = earningsData?.reduce((sum, r) => sum + (parseFloat(r.kelan_total) || 0), 0) || 0
                const paid = paymentsData?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0

                setRangeSummary({ earned, paid, balance: earned - paid })
            } catch (error) {
                console.error('Error fetching range data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchRangeData()
    }, [payslipRange.start, payslipRange.end])

    if (loading) {
        return (
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} className="stat-card" style={{ opacity: 0.5 }}>
                        <div className="stat-content" style={{ textAlign: 'center' }}>
                            <p>Loading...</p>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--success-light)' }}>
                    <DollarSign size={24} style={{ color: 'var(--success)' }} />
                </div>
                <div className="stat-content">
                    <h3>Earned (Period)</h3>
                    <p className="stat-value">Rs. {rangeSummary.earned.toLocaleString()}</p>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>
                    <CreditCard size={24} style={{ color: 'var(--primary)' }} />
                </div>
                <div className="stat-content">
                    <h3>Paid (Period)</h3>
                    <p className="stat-value">Rs. {rangeSummary.paid.toLocaleString()}</p>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon" style={{ background: rangeSummary.balance > 0 ? 'var(--warning-light)' : 'var(--success-light)' }}>
                    <Wallet size={24} style={{ color: rangeSummary.balance > 0 ? 'var(--warning)' : 'var(--success)' }} />
                </div>
                <div className="stat-content">
                    <h3>Balance (Period)</h3>
                    <p className="stat-value" style={{ color: rangeSummary.balance > 0 ? 'var(--warning)' : 'var(--success)' }}>
                        Rs. {rangeSummary.balance.toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default ProfitTool
