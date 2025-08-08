-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create restaurant categories table
CREATE TABLE IF NOT EXISTS restaurant_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restaurant menu items table
CREATE TABLE IF NOT EXISTS restaurant_menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    category_id UUID REFERENCES restaurant_categories(id),
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    preparation_time INTEGER, -- in minutes
    allergens TEXT,
    ingredients TEXT,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    is_gluten_free BOOLEAN DEFAULT FALSE,
    calories INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restaurant orders table
CREATE TABLE IF NOT EXISTS restaurant_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number INTEGER,
    room_number INTEGER,
    guest_id UUID REFERENCES auth.users(id),
    server_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'completed', 'cancelled')),
    order_type TEXT NOT NULL CHECK (order_type IN ('dine-in', 'room-service', 'takeaway')),
    special_instructions TEXT,
    total_amount NUMERIC(10, 2) DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create restaurant order items table
CREATE TABLE IF NOT EXISTS restaurant_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES restaurant_orders(id) NOT NULL,
    menu_item_id UUID REFERENCES restaurant_menu_items(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    special_instructions TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restaurant tables table
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number INTEGER NOT NULL UNIQUE,
    capacity INTEGER NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restaurant reservations table
CREATE TABLE IF NOT EXISTS restaurant_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_name TEXT NOT NULL,
    guest_id UUID REFERENCES auth.users(id),
    contact_number TEXT,
    email TEXT,
    table_id UUID REFERENCES restaurant_tables(id),
    party_size INTEGER NOT NULL,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    special_requests TEXT,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'seated', 'completed', 'cancelled', 'no-show')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger to update total_amount in restaurant_orders when order items change
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE restaurant_orders
    SET total_amount = (
        SELECT SUM(total_price)
        FROM restaurant_order_items
        WHERE order_id = NEW.order_id
    ),
    updated_at = NOW()
    WHERE id = NEW.order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_total_trigger
AFTER INSERT OR UPDATE OR DELETE ON restaurant_order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_total();

-- Set up RLS (Row Level Security)
ALTER TABLE restaurant_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_reservations ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can read restaurant categories"
ON restaurant_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read menu items"
ON restaurant_menu_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read orders"
ON restaurant_orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read order items"
ON restaurant_order_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read tables"
ON restaurant_tables FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read reservations"
ON restaurant_reservations FOR SELECT
TO authenticated
USING (true);

-- Create policies for staff users (assuming staff role exists)
CREATE POLICY "Staff can manage restaurant categories"
ON restaurant_categories FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager' OR role = 'staff')
    )
);

CREATE POLICY "Staff can manage menu items"
ON restaurant_menu_items FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager' OR role = 'staff')
    )
);

CREATE POLICY "Staff can manage orders"
ON restaurant_orders FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager' OR role = 'staff')
    )
);

CREATE POLICY "Staff can manage order items"
ON restaurant_order_items FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager' OR role = 'staff')
    )
);

CREATE POLICY "Staff can manage tables"
ON restaurant_tables FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager' OR role = 'staff')
    )
);

CREATE POLICY "Staff can manage reservations"
ON restaurant_reservations FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role = 'admin' OR role = 'manager' OR role = 'staff')
    )
);

-- Insert some initial categories
INSERT INTO restaurant_categories (name, description)
VALUES 
('Appetizers', 'Starters and small plates'),
('Main Courses', 'Main dishes and entrees'),
('Desserts', 'Sweet treats and desserts'),
('Beverages', 'Drinks and refreshments'),
('Cocktails', 'Alcoholic mixed drinks'),
('Wine', 'Selection of wines'),
('Beer', 'Selection of beers'),
('Specials', 'Chef''s special dishes')
ON CONFLICT (id) DO NOTHING;

-- Insert some sample tables
INSERT INTO restaurant_tables (table_number, capacity, location)
VALUES 
(1, 2, 'Window'),
(2, 2, 'Window'),
(3, 4, 'Center'),
(4, 4, 'Center'),
(5, 6, 'Corner'),
(6, 8, 'Private Room'),
(7, 2, 'Bar'),
(8, 2, 'Bar'),
(9, 4, 'Patio'),
(10, 4, 'Patio')
ON CONFLICT (table_number) DO NOTHING;
