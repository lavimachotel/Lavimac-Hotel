-- Troubleshooting script for the guests table in Hotel Management System
-- This script checks for common issues with the table setup

-- Check if the table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'guests'
) AS "guests_table_exists";

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'guests'
ORDER BY 
    ordinal_position;

-- Check if Row Level Security is enabled
SELECT 
    relrowsecurity
FROM 
    pg_class
WHERE 
    oid = 'public.guests'::regclass;

-- Check policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM 
    pg_policies
WHERE 
    tablename = 'guests' 
    AND schemaname = 'public';

-- Check indexes
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename = 'guests'
    AND schemaname = 'public';

-- Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM 
    information_schema.triggers
WHERE 
    event_object_schema = 'public'
    AND event_object_table = 'guests';

-- Check if the table is in the realtime publication
SELECT 
    pubname,
    tablename
FROM 
    pg_publication_tables
WHERE 
    tablename = 'guests';

-- Check current record count
SELECT 
    COUNT(*) AS "record_count"
FROM 
    public.guests; 