-- Script to fix RLS policy for inventory_categories table

-- First, check the existing policies
SELECT * FROM pg_policies WHERE tablename = 'inventory_categories';

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all authenticated users to view inventory categories" ON inventory_categories;
DROP POLICY IF EXISTS "Allow staff to create inventory categories" ON inventory_categories;
DROP POLICY IF EXISTS "Allow staff to update inventory categories" ON inventory_categories;
DROP POLICY IF EXISTS "Allow staff to delete inventory categories" ON inventory_categories;

-- Make sure RLS is enabled
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;

-- Create new permission policies that include all staff roles
-- Policy for viewing categories
CREATE POLICY "Allow all authenticated users to view inventory categories"
ON inventory_categories FOR SELECT
TO authenticated
USING (true);

-- Allow all staff members (not just managers and admins) to create categories
CREATE POLICY "Allow staff to create inventory categories"
ON inventory_categories FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role IN ('admin', 'administrator', 'manager', 'staff'))
    )
);

-- Allow all staff members to update categories
CREATE POLICY "Allow staff to update inventory categories"
ON inventory_categories FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role IN ('admin', 'administrator', 'manager', 'staff'))
    )
);

-- Only allow managers and admins to delete categories (if needed)
CREATE POLICY "Allow staff to delete inventory categories"
ON inventory_categories FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND (role IN ('admin', 'administrator', 'manager'))
    )
);

-- If needed, add created_by column to track who created each category
ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create trigger to automatically set created_by
CREATE OR REPLACE FUNCTION set_inventory_category_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS set_created_by_on_categories ON inventory_categories;

-- Create trigger
CREATE TRIGGER set_created_by_on_categories
BEFORE INSERT ON inventory_categories
FOR EACH ROW
EXECUTE FUNCTION set_inventory_category_created_by();

-- Add a comment explaining the changes
COMMENT ON TABLE inventory_categories IS 'Hotel inventory categories with updated RLS policies that allow all staff to manage categories'; 