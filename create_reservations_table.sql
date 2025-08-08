-- Create the reservations table for Hotel Management System
-- This script sets up the reservations table based on the NewReservationModal and RoomReservationContext

-- First, make sure you have the UUID extension installed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the reservations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reservations (
    -- Primary key and identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Room information
    room_id INT NOT NULL,
    room_type TEXT NOT NULL,
    
    -- Guest information
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone TEXT,
    
    -- Booking details
    check_in_date TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_date TIMESTAMP WITH TIME ZONE NOT NULL,
    adults INT DEFAULT 1,
    children INT DEFAULT 0,
    special_requests TEXT,
    
    -- Reservation status and payment
    status TEXT NOT NULL DEFAULT 'Reserved',  -- 'Reserved', 'Checked In', 'Checked Out', 'Cancelled'
    payment_method TEXT,
    payment_status TEXT DEFAULT 'Pending',    -- 'Pending', 'Paid', 'Refunded'
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Foreign key to rooms
    FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON public.reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_guest_email ON public.reservations(guest_email);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in_date ON public.reservations(check_in_date);

-- Enable Row Level Security
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and then create new policy
-- Using DO block to safely handle the case when policy doesn't exist
DO $$
BEGIN
    BEGIN
        DROP POLICY IF EXISTS "Allow public access to reservations" ON public.reservations;
    EXCEPTION
        WHEN undefined_object THEN
            -- Policy doesn't exist, so just continue
    END;
END $$;

-- Create the policy for public access
CREATE POLICY "Allow public access to reservations" 
ON public.reservations FOR ALL USING (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_reservations_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
DROP TRIGGER IF EXISTS set_reservations_timestamp ON public.reservations;
CREATE TRIGGER set_reservations_timestamp
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION update_reservations_modified_column();

-- Grant access to the anon and authenticated roles
GRANT ALL ON public.reservations TO anon, authenticated;

-- Add realtime functionality
DO $$
BEGIN
  -- Fixed: proper SELECT query with FROM clause
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'reservations'
  ) THEN
    -- Add table to publication if it's not already there
    ALTER publication supabase_realtime ADD TABLE public.reservations;
    RAISE NOTICE 'Added reservations table to realtime publication';
  END IF;
END $$;

-- Create a trigger function to update room status when a reservation is created or updated
CREATE OR REPLACE FUNCTION update_room_status_from_reservation()
RETURNS TRIGGER AS $$
BEGIN
    -- If a new reservation is being added
    IF TG_OP = 'INSERT' THEN
        -- Set the room status to 'Reserved'
        UPDATE public.rooms 
        SET status = 'Reserved', updated_at = NOW()
        WHERE id = NEW.room_id;
    
    -- If a reservation is being updated
    ELSIF TG_OP = 'UPDATE' THEN
        -- If the room ID changed, update both old and new room statuses
        IF OLD.room_id <> NEW.room_id THEN
            -- Set old room to Available (unless it has active guests)
            UPDATE public.rooms 
            SET status = CASE 
                WHEN (SELECT COUNT(*) FROM public.guests WHERE room = OLD.room_id::text AND status = 'Checked In') > 0 THEN 'Occupied'
                ELSE 'Available' 
                END,
                updated_at = NOW()
            WHERE id = OLD.room_id;
            
            -- Set new room to Reserved
            UPDATE public.rooms 
            SET status = 'Reserved', updated_at = NOW()
            WHERE id = NEW.room_id;
        
        -- If the status changed to 'Cancelled' or 'Checked Out', update room status
        ELSIF NEW.status IN ('Cancelled', 'Checked Out') AND OLD.status NOT IN ('Cancelled', 'Checked Out') THEN
            -- Set the room to Available (unless it has active guests)
            UPDATE public.rooms 
            SET status = CASE 
                WHEN (SELECT COUNT(*) FROM public.guests WHERE room = NEW.room_id::text AND status = 'Checked In') > 0 THEN 'Occupied'
                ELSE 'Available' 
                END,
                updated_at = NOW()
            WHERE id = NEW.room_id;
        
        -- If the status changed from 'Cancelled' or 'Checked Out' to another status
        ELSIF OLD.status IN ('Cancelled', 'Checked Out') AND NEW.status NOT IN ('Cancelled', 'Checked Out') THEN
            -- Set the room status based on the new reservation status
            UPDATE public.rooms 
            SET status = CASE
                WHEN NEW.status = 'Checked In' THEN 'Occupied'
                ELSE 'Reserved'
                END,
                updated_at = NOW()
            WHERE id = NEW.room_id;
        
        -- If the status changed to 'Checked In'
        ELSIF NEW.status = 'Checked In' AND OLD.status <> 'Checked In' THEN
            -- Set the room to Occupied
            UPDATE public.rooms 
            SET status = 'Occupied', updated_at = NOW()
            WHERE id = NEW.room_id;
        END IF;
    
    -- If a reservation is being deleted
    ELSIF TG_OP = 'DELETE' THEN
        -- Set the room to Available (unless it has active guests)
        UPDATE public.rooms 
        SET status = CASE 
            WHEN (SELECT COUNT(*) FROM public.guests WHERE room = OLD.room_id::text AND status = 'Checked In') > 0 THEN 'Occupied'
            ELSE 'Available' 
            END,
            updated_at = NOW()
        WHERE id = OLD.room_id;
    END IF;
    
    -- For INSERT and UPDATE operations
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        RETURN NEW;
    ELSE
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist to avoid conflicts
DROP TRIGGER IF EXISTS reservation_insert_trigger ON public.reservations;
DROP TRIGGER IF EXISTS reservation_update_trigger ON public.reservations;
DROP TRIGGER IF EXISTS reservation_delete_trigger ON public.reservations;

-- Create triggers for each operation
CREATE TRIGGER reservation_insert_trigger
AFTER INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION update_room_status_from_reservation();

CREATE TRIGGER reservation_update_trigger
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION update_room_status_from_reservation();

CREATE TRIGGER reservation_delete_trigger
AFTER DELETE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION update_room_status_from_reservation(); 