-- Check the structure of the rooms table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'rooms'
ORDER BY 
    ordinal_position;

-- Display sample data from rooms table
SELECT * FROM public.rooms LIMIT 5;

-- Count rooms by status
SELECT status, COUNT(*) FROM public.rooms GROUP BY status; 