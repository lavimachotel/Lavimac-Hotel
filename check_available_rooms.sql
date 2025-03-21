-- Script to check available room IDs in the database
-- Run this to find valid room IDs to use in your test scripts

-- Get a list of all room IDs
SELECT id, room_number, status 
FROM public.rooms 
ORDER BY id ASC;

-- Get total count of rooms
SELECT COUNT(*) AS total_rooms 
FROM public.rooms;

-- Get the minimum and maximum room IDs
SELECT 
    MIN(id) AS min_room_id,
    MAX(id) AS max_room_id
FROM public.rooms; 