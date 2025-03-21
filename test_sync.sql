-- Test script to verify that room status updates correctly when guests check in and out
-- This script simulates adding, updating, and removing guests and checks if rooms update properly

-- First, make sure we have a clean test room
UPDATE public.rooms
SET status = 'Available'
WHERE id = 105;

-- Check current status of the test room
SELECT id, room_number, type, status
FROM public.rooms
WHERE id = 105;

-- 1. Test guest check-in (INSERT)
INSERT INTO public.guests (
    name,
    first_name,
    last_name,
    email,
    phone,
    room,
    check_in,
    check_out,
    status
) VALUES (
    'Test Guest',
    'Test',
    'Guest',
    'test@example.com',
    '123-456-7890',
    '105',
    NOW(),
    NOW() + INTERVAL '3 days',
    'Checked In'
);

-- Verify room status updated to 'Occupied'
SELECT 'After check-in' as test, r.id, r.status, g.name as guest_name
FROM public.rooms r
LEFT JOIN public.guests g ON r.id::text = g.room AND g.status = 'Checked In'
WHERE r.id = 105;

-- 2. Test guest room change (UPDATE)
WITH latest_guest AS (
    SELECT id FROM public.guests 
    WHERE room = '105' AND status = 'Checked In'
    ORDER BY created_at DESC
    LIMIT 1
)
UPDATE public.guests
SET room = '106'
FROM latest_guest
WHERE public.guests.id = latest_guest.id;

-- Verify old room (105) is Available and new room (106) is Occupied
SELECT 'After room change' as test, r.id, r.status, 
    (SELECT name FROM public.guests WHERE room = r.id::text LIMIT 1) as guest_name
FROM public.rooms r
WHERE r.id IN (105, 106);

-- 3. Test guest check-out (UPDATE status)
WITH latest_guest AS (
    SELECT id FROM public.guests 
    WHERE room = '106' AND status = 'Checked In'
    ORDER BY created_at DESC
    LIMIT 1
)
UPDATE public.guests
SET status = 'Checked Out'
FROM latest_guest
WHERE public.guests.id = latest_guest.id;

-- Verify room 106 is now Available
SELECT 'After check-out' as test, r.id, r.status, 
    (SELECT name FROM public.guests WHERE room = r.id::text AND status = 'Checked In' LIMIT 1) as guest_name
FROM public.rooms r
WHERE r.id = 106;

-- 4. Test guest deletion (DELETE)
WITH latest_guest AS (
    SELECT id FROM public.guests 
    WHERE room = '106' AND status = 'Checked Out'
    ORDER BY created_at DESC
    LIMIT 1
)
DELETE FROM public.guests
USING latest_guest
WHERE public.guests.id = latest_guest.id;

-- Final verification of room statuses
SELECT 'Final state' as test, r.id, r.status
FROM public.rooms r
WHERE r.id IN (105, 106); 