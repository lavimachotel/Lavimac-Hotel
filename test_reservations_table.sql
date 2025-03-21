-- Test script for the reservations table in Hotel Management System
-- This script inserts a test reservation and verifies that room status is updated correctly

-- First, check if the test room exists
DO $$
BEGIN
    -- Check if the room already exists
    IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = 110) THEN
        -- If the room doesn't exist, create it
        INSERT INTO public.rooms (
            id, 
            room_number, 
            type, 
            status, 
            price, 
            capacity, 
            amenities,
            created_at,
            updated_at
        ) VALUES (
            110,                              -- id
            110,                              -- room_number (using numeric value)
            'Standard',                       -- type
            'Available',                      -- status
            100.00,                           -- price
            2,                                -- capacity
            ARRAY['WiFi', 'TV', 'Air Conditioning'],  -- amenities as proper array
            NOW(),                            -- created_at
            NOW()                             -- updated_at
        );
        RAISE NOTICE 'Created test room with ID 110';
    ELSE
        -- If the room exists, ensure its status is 'Available'
        UPDATE public.rooms
        SET status = 'Available'
        WHERE id = 110;
        RAISE NOTICE 'Using existing room with ID 110';
    END IF;
END $$;

-- Check current status of the test room
SELECT id, status FROM public.rooms WHERE id = 110;

-- 1. Test creating a new reservation
INSERT INTO public.reservations (
    room_id,
    room_type,
    guest_name,
    guest_email,
    guest_phone,
    check_in_date,
    check_out_date,
    adults,
    children,
    special_requests,
    status,
    payment_method,
    payment_status
) VALUES (
    110,                                     -- room_id
    'Standard',                              -- room_type
    'John Smith',                            -- guest_name
    'john.smith@example.com',                -- guest_email
    '123-456-7890',                          -- guest_phone
    NOW() + INTERVAL '5 days',               -- check_in_date
    NOW() + INTERVAL '10 days',              -- check_out_date
    2,                                       -- adults
    1,                                       -- children
    'Need extra pillows',                    -- special_requests
    'Reserved',                              -- status
    'Credit Card',                           -- payment_method
    'Pending'                                -- payment_status
) RETURNING *;

-- Verify room status changed to 'Reserved'
SELECT id, status FROM public.rooms WHERE id = 110;

-- 2. Retrieve the created reservation to verify
SELECT * FROM public.reservations WHERE room_id = 110 AND status = 'Reserved';

-- 3. Test updating reservation to 'Checked In'
WITH latest_reservation AS (
    SELECT id FROM public.reservations 
    WHERE room_id = 110 AND status = 'Reserved'
    ORDER BY created_at DESC
    LIMIT 1
)
UPDATE public.reservations
SET status = 'Checked In'
FROM latest_reservation
WHERE public.reservations.id = latest_reservation.id
RETURNING *;

-- Verify room status changed to 'Occupied'
SELECT id, status FROM public.rooms WHERE id = 110;

-- 4. Test updating reservation to 'Checked Out'
WITH latest_reservation AS (
    SELECT id FROM public.reservations 
    WHERE room_id = 110 AND status = 'Checked In'
    ORDER BY created_at DESC
    LIMIT 1
)
UPDATE public.reservations
SET status = 'Checked Out'
FROM latest_reservation
WHERE public.reservations.id = latest_reservation.id
RETURNING *;

-- Verify room status changed back to 'Available'
SELECT id, status FROM public.rooms WHERE id = 110;

-- 5. Test deleting a reservation
WITH latest_reservation AS (
    SELECT id FROM public.reservations 
    WHERE room_id = 110 AND status = 'Checked Out'
    ORDER BY created_at DESC
    LIMIT 1
)
DELETE FROM public.reservations
USING latest_reservation
WHERE public.reservations.id = latest_reservation.id
RETURNING *;

-- Final status check
SELECT id, status FROM public.rooms WHERE id = 110; 