-- Script to synchronize room statuses with guest and reservation data
-- This will ensure the dashboard and rooms page show correct status colors

-- First, gather information about active statuses
WITH 
reservation_statuses AS (
    -- Get rooms with active reservations
    SELECT 
        room_id,
        CASE 
            WHEN status = 'Checked In' THEN 'Occupied'
            WHEN status = 'Reserved' THEN 'Reserved'
            ELSE NULL
        END as derived_status
    FROM 
        public.reservations
    WHERE 
        status IN ('Reserved', 'Checked In')
),
guest_statuses AS (
    -- Get rooms with checked-in guests
    SELECT 
        room::int as room_id,
        'Occupied' as derived_status
    FROM 
        public.guests
    WHERE 
        status = 'Checked In'
)
-- Update room statuses based on the combined information
UPDATE public.rooms r
SET 
    status = COALESCE(
        -- First priority: checked-in guests
        (SELECT derived_status FROM guest_statuses WHERE room_id = r.id),
        -- Second priority: active reservations
        (SELECT derived_status FROM reservation_statuses WHERE room_id = r.id),
        -- Default: Available
        'Available'
    ),
    updated_at = NOW()
WHERE
    -- Only update rooms where the status would change
    r.status <> COALESCE(
        (SELECT derived_status FROM guest_statuses WHERE room_id = r.id),
        (SELECT derived_status FROM reservation_statuses WHERE room_id = r.id),
        'Available'
    );

-- Report rooms by status to verify results
SELECT status, COUNT(*) FROM public.rooms GROUP BY status ORDER BY status;

-- Fix any specific issues

-- 1. Ensure rooms with checked-in guests are marked as 'Occupied'
UPDATE public.rooms r
SET status = 'Occupied', updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM public.guests g
    WHERE g.room = r.id::text
    AND g.status = 'Checked In'
)
AND r.status <> 'Occupied';

-- 2. Ensure rooms with active reservations but no guests are marked as 'Reserved'
UPDATE public.rooms r
SET status = 'Reserved', updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM public.reservations res
    WHERE res.room_id = r.id
    AND res.status = 'Reserved'
)
AND NOT EXISTS (
    SELECT 1 FROM public.guests g
    WHERE g.room = r.id::text
    AND g.status = 'Checked In'
)
AND r.status <> 'Reserved';

-- 3. Ensure rooms with no active guests or reservations are marked as 'Available'
UPDATE public.rooms r
SET status = 'Available', updated_at = NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.guests g
    WHERE g.room = r.id::text
    AND g.status = 'Checked In'
)
AND NOT EXISTS (
    SELECT 1 FROM public.reservations res
    WHERE res.room_id = r.id
    AND res.status IN ('Reserved', 'Checked In')
)
AND r.status NOT IN ('Available', 'Maintenance');

-- Final report after fixes
SELECT status, COUNT(*) FROM public.rooms GROUP BY status ORDER BY status; 