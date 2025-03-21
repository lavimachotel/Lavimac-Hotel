-- Script to check the structure of the rooms table
-- This will help identify the data types of each column

-- Get table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'rooms'
ORDER BY ordinal_position;

-- Get a sample row to see the data
SELECT * FROM public.rooms LIMIT 1; 