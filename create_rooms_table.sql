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
      room_number TEXT NOT NULL,
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
    -- 3 Standard rooms - Mint, Cinnamon, Basil - 500 Ghana Cedis
    -- 5 Superior rooms - Licorice, Marigold, Lotus, Jasmine, Private - 750 Ghana Cedis
    -- 1 Executive room - Chamomile - 1,250 Ghana Cedis
    INSERT INTO public.rooms (id, room_number, type, status, price, capacity, amenities)
    VALUES
      -- Standard Rooms
      (101, 'Mint', 'Standard', 'Available', 500, 2, ARRAY['WiFi', 'TV', 'AC']),
      (102, 'Cinnamon', 'Standard', 'Available', 500, 2, ARRAY['WiFi', 'TV', 'AC']),
      (103, 'Basil', 'Standard', 'Available', 500, 2, ARRAY['WiFi', 'TV', 'AC']),
      
      -- Superior Rooms
      (104, 'Licorice', 'Superior', 'Available', 750, 3, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar']),
      (105, 'Marigold', 'Superior', 'Available', 750, 3, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar']),
      (106, 'Lotus', 'Superior', 'Available', 750, 3, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar']),
      (107, 'Jasmine', 'Superior', 'Available', 750, 3, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar']),
      (108, 'Private', 'Superior', 'Available', 750, 3, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar']),
      
      -- Executive Room
      (109, 'Chamomile', 'Executive', 'Available', 1250, 4, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar', 'Jacuzzi', 'Room Service']);

    RAISE NOTICE 'Rooms table created and populated with sample data';
  ELSE
    RAISE NOTICE 'Rooms table already exists, checking for updates needed...';
    
    -- Delete existing rooms and repopulate with the new room configuration
    DELETE FROM public.rooms;
    
    -- Insert the updated room data
    INSERT INTO public.rooms (id, room_number, type, status, price, capacity, amenities)
    VALUES
      -- Standard Rooms - 500 Ghana Cedis
      (101, 'Mint', 'Standard', 'Available', 500, 2, ARRAY['WiFi', 'TV', 'AC']),
      (102, 'Cinnamon', 'Standard', 'Available', 500, 2, ARRAY['WiFi', 'TV', 'AC']),
      (103, 'Basil', 'Standard', 'Available', 500, 2, ARRAY['WiFi', 'TV', 'AC']),
      
      -- Superior Rooms - 750 Ghana Cedis
      (104, 'Licorice', 'Superior', 'Available', 750, 3, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar']),
      (105, 'Marigold', 'Superior', 'Available', 750, 3, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar']),
      (106, 'Lotus', 'Superior', 'Available', 750, 3, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar']),
      (107, 'Jasmine', 'Superior', 'Available', 750, 3, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar']),
      (108, 'Private', 'Superior', 'Available', 750, 3, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar']),
      
      -- Executive Room - 1,250 Ghana Cedis
      (109, 'Chamomile', 'Executive', 'Available', 1250, 4, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar', 'Jacuzzi', 'Room Service']);
      
    RAISE NOTICE 'Rooms table updated with new room configuration.';
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public access to the rooms table
DO $$
BEGIN
  -- Check if the policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rooms' AND policyname = 'Allow public access to rooms'
  ) THEN
    -- Create the policy if it doesn't exist
    CREATE POLICY "Allow public access to rooms" ON public.rooms FOR ALL USING (true);
    RAISE NOTICE 'Created policy "Allow public access to rooms"';
  ELSE
    RAISE NOTICE 'Policy "Allow public access to rooms" already exists';
  END IF;
END $$;

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
DECLARE
  pub_exists boolean;
BEGIN
  -- Check if the publication exists and contains our table
  SELECT EXISTS (
    SELECT 1 
    FROM pg_publication pub
    JOIN pg_publication_rel pubrel ON pub.oid = pubrel.prpubid
    JOIN pg_class tbl ON pubrel.prrelid = tbl.oid
    JOIN pg_namespace ns ON tbl.relnamespace = ns.oid
    WHERE pub.pubname = 'supabase_realtime'
    AND ns.nspname = 'public'
    AND tbl.relname = 'rooms'
  ) INTO pub_exists;
  
  IF NOT pub_exists THEN
    -- Add the table to the publication
    ALTER publication supabase_realtime ADD TABLE public.rooms;
    RAISE NOTICE 'Added rooms table to realtime publication';
  ELSE
    RAISE NOTICE 'Table already in realtime publication';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Publication supabase_realtime does not exist. Creating it...';
    -- Create the publication if it doesn't exist
    CREATE PUBLICATION supabase_realtime FOR TABLE public.rooms;
    RAISE NOTICE 'Created supabase_realtime publication with rooms table';
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