-- Create inventory category table
CREATE TABLE IF NOT EXISTS inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES inventory_categories(id),
    sku TEXT,
    unit_of_measure TEXT NOT NULL,
    minimum_stock NUMERIC(10, 2) DEFAULT 0,
    reorder_point NUMERIC(10, 2) DEFAULT 0,
    current_stock NUMERIC(10, 2) DEFAULT 0,
    unit_cost NUMERIC(10, 2) DEFAULT 0,
    supplier TEXT,
    supplier_contact TEXT,
    location TEXT,
    last_ordered_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES inventory_items(id) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'adjustment', 'transfer')),
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(10, 2),
    total_price NUMERIC(10, 2),
    reference_number TEXT,
    notes TEXT,
    department TEXT,
    performed_by UUID REFERENCES auth.users(id),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory suppliers table
CREATE TABLE IF NOT EXISTS inventory_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase orders table
CREATE TABLE IF NOT EXISTS inventory_purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES inventory_suppliers(id),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expected_delivery_date TIMESTAMP WITH TIME ZONE,
    actual_delivery_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'approved', 'ordered', 'received', 'cancelled')),
    total_amount NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase order items table
CREATE TABLE IF NOT EXISTS inventory_purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES inventory_purchase_orders(id) NOT NULL,
    item_id UUID REFERENCES inventory_items(id) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    received_quantity NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory_categories
CREATE POLICY "Allow all authenticated users to view inventory categories"
ON inventory_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow staff to create inventory categories"
ON inventory_categories FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

CREATE POLICY "Allow staff to update inventory categories"
ON inventory_categories FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

CREATE POLICY "Allow staff to delete inventory categories"
ON inventory_categories FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

-- Create policies for inventory_items
CREATE POLICY "Allow all authenticated users to view inventory items"
ON inventory_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow staff to create inventory items"
ON inventory_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager' OR role = 'staff')
    )
);

CREATE POLICY "Allow staff to update inventory items"
ON inventory_items FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager' OR role = 'staff')
    )
);

CREATE POLICY "Allow staff to delete inventory items"
ON inventory_items FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

-- Create policies for inventory_transactions
CREATE POLICY "Allow all authenticated users to view inventory transactions"
ON inventory_transactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow staff to create inventory transactions"
ON inventory_transactions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager' OR role = 'staff')
    )
);

CREATE POLICY "Allow staff to update inventory transactions"
ON inventory_transactions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

CREATE POLICY "Allow staff to delete inventory transactions"
ON inventory_transactions FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

-- Create policies for inventory_suppliers
CREATE POLICY "Allow all authenticated users to view inventory suppliers"
ON inventory_suppliers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow staff to create inventory suppliers"
ON inventory_suppliers FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

CREATE POLICY "Allow staff to update inventory suppliers"
ON inventory_suppliers FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

CREATE POLICY "Allow staff to delete inventory suppliers"
ON inventory_suppliers FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

-- Create policies for inventory_purchase_orders
CREATE POLICY "Allow all authenticated users to view purchase orders"
ON inventory_purchase_orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow staff to create purchase orders"
ON inventory_purchase_orders FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

CREATE POLICY "Allow staff to update purchase orders"
ON inventory_purchase_orders FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

CREATE POLICY "Allow staff to delete purchase orders"
ON inventory_purchase_orders FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

-- Create policies for inventory_purchase_order_items
CREATE POLICY "Allow all authenticated users to view purchase order items"
ON inventory_purchase_order_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow staff to create purchase order items"
ON inventory_purchase_order_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

CREATE POLICY "Allow staff to update purchase order items"
ON inventory_purchase_order_items FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

CREATE POLICY "Allow staff to delete purchase order items"
ON inventory_purchase_order_items FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager')
    )
);

-- Create trigger to update inventory item stock when transactions occur
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'purchase' THEN
        UPDATE inventory_items
        SET current_stock = current_stock + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.item_id;
    ELSIF NEW.transaction_type = 'consumption' THEN
        UPDATE inventory_items
        SET current_stock = current_stock - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.item_id;
    ELSIF NEW.transaction_type = 'adjustment' THEN
        UPDATE inventory_items
        SET current_stock = current_stock + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_transaction_trigger
AFTER INSERT ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION update_inventory_stock();

-- Create function to check low stock items
CREATE OR REPLACE FUNCTION get_low_stock_items()
RETURNS TABLE (
    id UUID,
    name TEXT,
    current_stock NUMERIC,
    minimum_stock NUMERIC,
    reorder_point NUMERIC,
    unit_of_measure TEXT,
    category_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.name,
        i.current_stock,
        i.minimum_stock,
        i.reorder_point,
        i.unit_of_measure,
        c.name as category_name
    FROM 
        inventory_items i
    LEFT JOIN 
        inventory_categories c ON i.category_id = c.id
    WHERE 
        i.current_stock <= i.reorder_point
    ORDER BY 
        (i.current_stock / NULLIF(i.reorder_point, 0)) ASC;
END;
$$ LANGUAGE plpgsql;
