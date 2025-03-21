-- Create triggers to automatically update room status when guests check in or out
-- This script ensures the rooms table stays in sync with the guests table

-- First, create a function that updates room status on guest check-in
CREATE OR REPLACE FUNCTION update_room_status_on_guest_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If a new guest is being added (check-in)
    IF TG_OP = 'INSERT' THEN
        -- Update the corresponding room to Occupied
        UPDATE public.rooms 
        SET status = 'Occupied', updated_at = NOW()
        WHERE id::text = NEW.room;
    
    -- If a guest record is being updated
    ELSIF TG_OP = 'UPDATE' THEN
        -- If the room number changed, update both old and new room statuses
        IF OLD.room <> NEW.room THEN
            -- Set the old room to Available
            UPDATE public.rooms 
            SET status = 'Available', updated_at = NOW()
            WHERE id::text = OLD.room;
            
            -- Set the new room to Occupied
            UPDATE public.rooms 
            SET status = 'Occupied', updated_at = NOW()
            WHERE id::text = NEW.room;
        
        -- If the status changed to something other than 'Checked In', update room status
        ELSIF OLD.status = 'Checked In' AND NEW.status <> 'Checked In' THEN
            -- Set the room to Available
            UPDATE public.rooms 
            SET status = 'Available', updated_at = NOW()
            WHERE id::text = NEW.room;
        
        -- If the status changed to 'Checked In' from something else
        ELSIF OLD.status <> 'Checked In' AND NEW.status = 'Checked In' THEN
            -- Set the room to Occupied
            UPDATE public.rooms 
            SET status = 'Occupied', updated_at = NOW()
            WHERE id::text = NEW.room;
        END IF;
    
    -- If a guest is being deleted (check-out)
    ELSIF TG_OP = 'DELETE' THEN
        -- Update the corresponding room to Available
        UPDATE public.rooms 
        SET status = 'Available', updated_at = NOW()
        WHERE id::text = OLD.room;
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
DROP TRIGGER IF EXISTS guest_insert_trigger ON public.guests;
DROP TRIGGER IF EXISTS guest_update_trigger ON public.guests;
DROP TRIGGER IF EXISTS guest_delete_trigger ON public.guests;

-- Create triggers for each operation
CREATE TRIGGER guest_insert_trigger
AFTER INSERT ON public.guests
FOR EACH ROW
EXECUTE FUNCTION update_room_status_on_guest_change();

CREATE TRIGGER guest_update_trigger
AFTER UPDATE ON public.guests
FOR EACH ROW
EXECUTE FUNCTION update_room_status_on_guest_change();

CREATE TRIGGER guest_delete_trigger
AFTER DELETE ON public.guests
FOR EACH ROW
EXECUTE FUNCTION update_room_status_on_guest_change();

-- Manually sync rooms and guests to fix any existing inconsistencies
DO $$
DECLARE
    guest_count INTEGER;
    updated_count INTEGER;
BEGIN
    -- Update all rooms to Available first (default state)
    UPDATE public.rooms SET status = 'Available' WHERE status = 'Occupied';
    
    -- Then update rooms with active guests to Occupied
    WITH room_updates AS (
        UPDATE public.rooms r
        SET status = 'Occupied', updated_at = NOW()
        FROM public.guests g
        WHERE r.id::text = g.room
        AND g.status = 'Checked In'
        RETURNING r.id
    )
    SELECT COUNT(*) INTO updated_count FROM room_updates;
    
    RAISE NOTICE 'Reset all rooms to Available and then updated % rooms to Occupied based on current guests', updated_count;
END $$; 