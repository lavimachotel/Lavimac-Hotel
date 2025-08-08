-- Create tables for invoice management
-- This script will create:
-- 1. invoices table - main table for invoice data
-- 2. invoice_items table - details of service items associated with invoices
-- 3. invoice_payments table - payment records for invoices

-- Table for storing invoice records
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,
    guest_name VARCHAR(255) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    room_type VARCHAR(100) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights INTEGER NOT NULL,
    room_rate DECIMAL(10, 2) NOT NULL,
    room_total DECIMAL(10, 2) NOT NULL,
    service_total DECIMAL(10, 2) DEFAULT 0.00,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Cancelled', 'Refunded')),
    has_service_items BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing invoice line items (services, etc.)
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    item_price DECIMAL(10, 2) NOT NULL,
    item_date DATE,
    service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Cancelled', 'Manual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking payments made against invoices
CREATE TABLE IF NOT EXISTS invoice_payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(100) DEFAULT 'Cash',
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receipt_number VARCHAR(100),
    notes TEXT,
    created_by VARCHAR(100)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_guest_id ON invoices(guest_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);

-- Add update_updated_at function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Sample queries (commented out, for reference)
-- 
-- -- Query to get all invoices with their payment status and total
-- SELECT i.id, i.guest_name, i.room_number, i.check_in_date, i.check_out_date, 
--        i.amount, i.status, SUM(p.amount) as amount_paid
-- FROM invoices i
-- LEFT JOIN invoice_payments p ON i.id = p.invoice_id
-- GROUP BY i.id
-- ORDER BY i.created_at DESC;
--
-- -- Query to get invoice details with all items
-- SELECT i.*, ii.item_name, ii.item_price, ii.item_date, ii.status as item_status
-- FROM invoices i
-- LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
-- WHERE i.id = [invoice_id]
-- ORDER BY ii.item_date; 