-- Configure Row Level Security (RLS) policies for Hotel Management System
-- This script enables anonymous users to perform all operations on the database tables
-- Run this script in the Supabase SQL Editor to fix permission issues

-- 1. Enable RLS on all tables
ALTER TABLE IF EXISTS public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Grant necessary privileges to anonymous and authenticated users
GRANT ALL ON public.rooms TO anon, authenticated;
GRANT ALL ON public.reservations TO anon, authenticated;
GRANT ALL ON public.guests TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;

-- 3. Configure RLS policies for the rooms table
-- First drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public access to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anonymous read access to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anonymous insert to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anonymous update to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anonymous delete from rooms" ON public.rooms;

-- Create new policies for rooms table
CREATE POLICY "Allow anonymous read access to rooms" 
ON public.rooms FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to rooms" 
ON public.rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to rooms" 
ON public.rooms FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete from rooms" 
ON public.rooms FOR DELETE USING (true);

-- 4. Configure RLS policies for the reservations table
-- First drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public access to reservations" ON public.reservations;
DROP POLICY IF EXISTS "Allow anonymous read access to reservations" ON public.reservations;
DROP POLICY IF EXISTS "Allow anonymous insert to reservations" ON public.reservations;
DROP POLICY IF EXISTS "Allow anonymous update to reservations" ON public.reservations;
DROP POLICY IF EXISTS "Allow anonymous delete from reservations" ON public.reservations;

-- Create new policies for reservations table
CREATE POLICY "Allow anonymous read access to reservations" 
ON public.reservations FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to reservations" 
ON public.reservations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to reservations" 
ON public.reservations FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete from reservations" 
ON public.reservations FOR DELETE USING (true);

-- 5. Configure RLS policies for the guests table
-- First drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public access to guests" ON public.guests;
DROP POLICY IF EXISTS "Allow anonymous read access to guests" ON public.guests;
DROP POLICY IF EXISTS "Allow anonymous insert to guests" ON public.guests;
DROP POLICY IF EXISTS "Allow anonymous update to guests" ON public.guests;
DROP POLICY IF EXISTS "Allow anonymous delete from guests" ON public.guests;

-- Create new policies for guests table (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'guests'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow anonymous read access to guests" 
             ON public.guests FOR SELECT USING (true)';
    
    EXECUTE 'CREATE POLICY "Allow anonymous insert to guests" 
             ON public.guests FOR INSERT WITH CHECK (true)';
    
    EXECUTE 'CREATE POLICY "Allow anonymous update to guests" 
             ON public.guests FOR UPDATE USING (true)';
    
    EXECUTE 'CREATE POLICY "Allow anonymous delete from guests" 
             ON public.guests FOR DELETE USING (true)';
  END IF;
END $$;

-- 6. Add realtime support for all tables
DO $$
BEGIN
  -- Add rooms table to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'rooms'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE public.rooms;
  END IF;

  -- Add reservations table to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'reservations'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE public.reservations;
  END IF;

  -- Add guests table to realtime publication if it exists and is not already added
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'guests'
  ) AND NOT EXISTS (
    SELECT 1 
    FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'guests'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE public.guests;
  END IF;
END $$;

-- 7. Create all rooms from 101 to 120 to ensure the foreign key constraint can be satisfied
DO $$
BEGIN
  -- Delete existing rooms first to avoid conflicts
  DELETE FROM public.rooms;
  
  -- Reset the sequence if it exists
  ALTER SEQUENCE IF EXISTS public.rooms_id_seq RESTART WITH 101;
  
  -- Insert standard rooms (101-110)
  INSERT INTO public.rooms (id, room_number, type, status, price, capacity, amenities)
  SELECT
    i as id,
    i as room_number,
    'Standard' as type,
    'Available' as status,
    120.00 as price,
    2 as capacity,
    ARRAY['WiFi', 'TV', 'AC'] as amenities
  FROM generate_series(101, 110) i;
  
  -- Insert deluxe rooms (111-115)
  INSERT INTO public.rooms (id, room_number, type, status, price, capacity, amenities)
  SELECT
    i as id,
    i as room_number,
    'Deluxe' as type,
    'Available' as status,
    180.00 as price,
    4 as capacity,
    ARRAY['WiFi', 'TV', 'AC', 'Mini Bar', 'Ocean View'] as amenities
  FROM generate_series(111, 115) i;
  
  -- Insert suite rooms (116-120)
  INSERT INTO public.rooms (id, room_number, type, status, price, capacity, amenities)
  SELECT
    i as id,
    i as room_number,
    'Suite' as type,
    'Available' as status,
    250.00 as price,
    6 as capacity,
    ARRAY['WiFi', 'TV', 'AC', 'Mini Bar', 'Jacuzzi', 'Kitchen', 'Living Room'] as amenities
  FROM generate_series(116, 120) i;
  
  RAISE NOTICE 'Added 20 rooms (101-120) to the database';
END $$;

-- Output success message
DO $$
BEGIN
  RAISE NOTICE 'Row Level Security (RLS) policies have been successfully configured!';
  RAISE NOTICE 'Anonymous users can now perform operations on all tables.';
END $$; 