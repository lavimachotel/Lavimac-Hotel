# Billing System Setup Instructions

This guide will help you set up the necessary database tables for the hotel management system's billing functionality.

## Setting Up Database Tables

To properly store invoices and ensure they don't disappear after page refresh, you need to run the following SQL script in your Supabase SQL Editor:

1. Log in to your Supabase dashboard (https://app.supabase.io)
2. Navigate to your project
3. Click on "SQL Editor" in the left sidebar
4. Create a new query 
5. Copy and paste the following SQL script:

```sql
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

-- Add Row-Level Security (RLS) policies for authenticated users
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invoices are viewable by authenticated users"
    ON invoices FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "Invoices are insertable by authenticated users"
    ON invoices FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Invoices are updatable by authenticated users"
    ON invoices FOR UPDATE
    USING (auth.role() = 'authenticated');
CREATE POLICY "Invoices are deletable by authenticated users"
    ON invoices FOR DELETE
    USING (auth.role() = 'authenticated');

-- Add RLS policies for invoice_items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invoice items are viewable by authenticated users"
    ON invoice_items FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "Invoice items are insertable by authenticated users"
    ON invoice_items FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Invoice items are updatable by authenticated users"
    ON invoice_items FOR UPDATE
    USING (auth.role() = 'authenticated');
CREATE POLICY "Invoice items are deletable by authenticated users"
    ON invoice_items FOR DELETE
    USING (auth.role() = 'authenticated');

-- Add RLS policies for invoice_payments
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invoice payments are viewable by authenticated users"
    ON invoice_payments FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "Invoice payments are insertable by authenticated users"
    ON invoice_payments FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Invoice payments are updatable by authenticated users"
    ON invoice_payments FOR UPDATE
    USING (auth.role() = 'authenticated');
CREATE POLICY "Invoice payments are deletable by authenticated users"
    ON invoice_payments FOR DELETE
    USING (auth.role() = 'authenticated');
```

6. Click "Run" to execute the script

## Verifying Setup

To verify the tables were created successfully:

1. Go to the "Table Editor" in your Supabase dashboard
2. You should see the following tables:
   - `invoices`
   - `invoice_items`
   - `invoice_payments`

## Troubleshooting Common Issues

If you encounter any issues:

1. **References to non-existent tables**: If the script fails with errors about missing tables, you might need to create the referenced tables first (like `guests` or `services`).

2. **Permission issues**: Make sure you have admin access to the database.

3. **Duplicate tables**: If tables already exist, you can drop them first using:
   ```sql
   DROP TABLE IF EXISTS invoice_payments;
   DROP TABLE IF EXISTS invoice_items;
   DROP TABLE IF EXISTS invoices;
   ```

## Next Steps

After successfully creating the tables, your billing system will be able to store invoices persistently in the database. You can now use the application to:

1. Create invoices for guests
2. Track payment status
3. View invoice history
4. Generate reports

The invoices will now be properly stored and will not disappear after page refresh. 