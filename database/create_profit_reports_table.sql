-- =====================================================
-- Profit Reports Table for Teddy Mobile Stock Management
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Drop table if exists (uncomment if you need to recreate)
-- DROP TABLE IF EXISTS profit_reports;

-- Create the profit_reports table
CREATE TABLE IF NOT EXISTS profit_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Report date (the date the report is for)
    report_date DATE NOT NULL,
    
    -- Phone Sales Summary
    phone_total_revenue DECIMAL(12, 2) DEFAULT 0,
    phone_total_cost DECIMAL(12, 2) DEFAULT 0,
    phone_total_profit DECIMAL(12, 2) DEFAULT 0,
    
    -- Accessory Sales Summary
    accessory_total_revenue DECIMAL(12, 2) DEFAULT 0,
    accessory_total_cost DECIMAL(12, 2) DEFAULT 0,
    accessory_total_profit DECIMAL(12, 2) DEFAULT 0,
    
    -- Thabrew Profit (80%)
    thabrew_phone_profit DECIMAL(12, 2) DEFAULT 0,
    thabrew_accessory_profit DECIMAL(12, 2) DEFAULT 0,
    thabrew_total DECIMAL(12, 2) DEFAULT 0,
    
    -- Kelan Profit (20%)
    kelan_phone_profit DECIMAL(12, 2) DEFAULT 0,
    kelan_accessory_profit DECIMAL(12, 2) DEFAULT 0,
    kelan_total DECIMAL(12, 2) DEFAULT 0,
    
    -- Detailed Entries (stored as JSONB for flexibility)
    -- phone_entries: [{model, imei, colour, owner, revenue, cost, profit, thabrew, kelan, tdyCode}, ...]
    phone_entries JSONB DEFAULT '[]'::jsonb,
    
    -- accessory_entries: [{model, revenue, cost, profit, thabrew, kelan}, ...]
    accessory_entries JSONB DEFAULT '[]'::jsonb,
    
    -- thabrew_entries: [{description, amount, isManual}, ...]
    thabrew_entries JSONB DEFAULT '[]'::jsonb,
    
    -- kelan_entries: [{description, amount, isManual}, ...]
    kelan_entries JSONB DEFAULT '[]'::jsonb
);

-- Create index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_profit_reports_date ON profit_reports(report_date DESC);

-- Enable Row Level Security
ALTER TABLE profit_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read all reports
CREATE POLICY "Allow authenticated read access" ON profit_reports
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policy: Allow authenticated users to insert reports
CREATE POLICY "Allow authenticated insert" ON profit_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update reports
CREATE POLICY "Allow authenticated update" ON profit_reports
    FOR UPDATE
    TO authenticated
    USING (true);

-- RLS Policy: Allow authenticated users to delete reports
CREATE POLICY "Allow authenticated delete" ON profit_reports
    FOR DELETE
    TO authenticated
    USING (true);

-- Grant permissions to authenticated users
GRANT ALL ON profit_reports TO authenticated;

-- Success message
SELECT 'profit_reports table created successfully!' AS status;
