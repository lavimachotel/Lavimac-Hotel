-- Test script for the guests table in Hotel Management System
-- This script inserts a test record and retrieves it to verify the table works correctly

-- Insert a test guest
INSERT INTO public.guests (
    name,
    first_name,
    last_name,
    email,
    phone,
    date_of_birth,
    gender,
    nationality,
    region,
    address,
    room,
    check_in,
    check_out,
    status
) VALUES (
    'John Doe',                              -- name
    'John',                                  -- first_name
    'Doe',                                   -- last_name
    'john.doe@example.com',                  -- email
    '+233 12345678',                         -- phone
    '1980-01-01',                            -- date_of_birth
    'Male',                                  -- gender
    'Ghana',                                 -- nationality
    'Ashanti',                               -- region
    '123 Main Street, Kumasi',               -- address
    '101',                                   -- room
    NOW(),                                   -- check_in
    NOW() + INTERVAL '7 days',               -- check_out
    'Checked In'                             -- status
) RETURNING *;

-- Verify that the record was inserted correctly
SELECT * FROM public.guests WHERE name = 'John Doe'; 