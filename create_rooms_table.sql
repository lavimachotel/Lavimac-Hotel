-- Create the rooms table for Hotel Management System
-- This script sets up the rooms table based on what the application expects

-- First, make sure you have the UUID extension installed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if rooms table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'rooms'
  ) THEN
    -- Create the rooms table if it doesn't exist
    CREATE TABLE public.rooms (
      id INT PRIMARY KEY,
      room_number INT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Available',
      price NUMERIC(10, 2) NOT NULL,
      capacity INT NOT NULL,
      amenities TEXT[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Create indexes for better performance
    CREATE INDEX idx_rooms_status ON public.rooms(status);
    CREATE INDEX idx_rooms_type ON public.rooms(type);

    -- Insert initial room data
    INSERT INTO public.rooms (id, room_number, type, status, price, capacity, amenities)
    SELECT
      i as id,
      i as room_number,
      CASE WHEN i <= 110 THEN 'Standard' WHEN i <= 120 THEN 'Deluxe' ELSE 'Suite' END as type,
      'Available' as status,
      CASE WHEN i <= 110 THEN 120 WHEN i <= 120 THEN 180 ELSE 250 END as price,
      CASE WHEN i <= 110 THEN 2 WHEN i <= 120 THEN 4 ELSE 6 END as capacity,
      ARRAY['WiFi', 'TV', 'AC'] as amenities
    FROM generate_series(101, 125) i;

    RAISE NOTICE 'Rooms table created and populated with sample data';
  ELSE
    RAISE NOTICE 'Rooms table already exists, checking for updates needed...';
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public access to the rooms table
CREATE POLICY IF NOT EXISTS "Allow public access to rooms" 
ON public.rooms FOR ALL USING (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_rooms_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
DROP TRIGGER IF EXISTS set_rooms_timestamp ON public.rooms;
CREATE TRIGGER set_rooms_timestamp
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION update_rooms_modified_column();

-- Grant access to the anon and authenticated roles
GRANT ALL ON public.rooms TO anon, authenticated;

-- Add realtime functionality
DO $$
BEGIN
  PERFORM pg_catalog.pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rooms';
  
  IF NOT FOUND THEN
    ALTER publication supabase_realtime ADD TABLE public.rooms;
    RAISE NOTICE 'Added rooms table to realtime publication';
  END IF;
END $$;

-- Sync room status with guest information
DO $$
DECLARE
  guest_count INTEGER;
BEGIN
  -- Check if the guests table exists and has data
  SELECT COUNT(*) INTO guest_count FROM public.guests;
  
  IF guest_count > 0 THEN
    -- Update room status based on guest data
    UPDATE public.rooms r
    SET status = 'Occupied'
    FROM public.guests g
    WHERE r.id::text = g.room
    AND g.status = 'Checked In';
    
    RAISE NOTICE 'Updated % room statuses based on guest data', guest_count;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error syncing room status: %', SQLERRM;
END $$; 