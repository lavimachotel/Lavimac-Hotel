-- SCRIPT TO FIX RLS FOR INVOICE TABLES TO ALLOW ANONYMOUS ACCESS
-- Run this in your Supabase SQL Editor

-- First, make sure RLS is enabled on both tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Remove any existing policies that might be causing issues
DROP POLICY IF EXISTS "Invoices viewable by authenticated users" ON public.invoices;
DROP POLICY IF EXISTS "Invoices insertable by authenticated users" ON public.invoices;
DROP POLICY IF EXISTS "Invoices updatable by authenticated users" ON public.invoices;
DROP POLICY IF EXISTS "Invoices deletable by authenticated users" ON public.invoices;

DROP POLICY IF EXISTS "Invoice items viewable by authenticated users" ON public.invoice_items;
DROP POLICY IF EXISTS "Invoice items insertable by authenticated users" ON public.invoice_items;
DROP POLICY IF EXISTS "Invoice items updatable by authenticated users" ON public.invoice_items;
DROP POLICY IF EXISTS "Invoice items deletable by authenticated users" ON public.invoice_items;

-- Create new open policies that allow both authenticated and anonymous access

-- INVOICE TABLE POLICIES

-- Policy to allow viewing invoices by anyone
CREATE POLICY "Invoices viewable by anyone" 
ON public.invoices 
FOR SELECT 
USING (true);

-- Policy to allow inserting invoices by anyone
CREATE POLICY "Invoices insertable by anyone" 
ON public.invoices 
FOR INSERT 
WITH CHECK (true);

-- Policy to allow updating invoices by anyone
CREATE POLICY "Invoices updatable by anyone" 
ON public.invoices 
FOR UPDATE 
USING (true);

-- Policy to allow deleting invoices by anyone
CREATE POLICY "Invoices deletable by anyone" 
ON public.invoices 
FOR DELETE 
USING (true);

-- INVOICE ITEMS TABLE POLICIES

-- Policy to allow viewing invoice items by anyone
CREATE POLICY "Invoice items viewable by anyone" 
ON public.invoice_items 
FOR SELECT 
USING (true);

-- Policy to allow inserting invoice items by anyone
CREATE POLICY "Invoice items insertable by anyone" 
ON public.invoice_items 
FOR INSERT 
WITH CHECK (true);

-- Policy to allow updating invoice items by anyone
CREATE POLICY "Invoice items updatable by anyone" 
ON public.invoice_items 
FOR UPDATE 
USING (true);

-- Policy to allow deleting invoice items by anyone
CREATE POLICY "Invoice items deletable by anyone" 
ON public.invoice_items 
FOR DELETE 
USING (true);

-- Grant access to anon and authenticated roles
GRANT ALL ON public.invoices TO anon, authenticated;
GRANT ALL ON public.invoice_items TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.invoices_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.invoice_items_id_seq TO anon, authenticated;

-- Validation query to check if tables exist
SELECT 
  tablename 
FROM 
  pg_tables 
WHERE 
  schemaname = 'public' AND 
  tablename IN ('invoices', 'invoice_items');

-- Validation query to check if policies exist
SELECT
  tablename,
  policyname
FROM
  pg_policies
WHERE
  schemaname = 'public' AND
  tablename IN ('invoices', 'invoice_items'); 