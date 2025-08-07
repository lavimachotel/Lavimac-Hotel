-- Populate sample time entries data for testing

-- Insert sample time entries for staff members
-- Note: You'll need to replace the staff_id values with actual IDs from your staff table
-- This script assumes you have at least 3 staff members in your database

-- Get staff IDs (will be used for sample data)
WITH staff_ids AS (
  SELECT id FROM staff LIMIT 3
),
staff_array AS (
  SELECT array_agg(id) as ids FROM staff_ids
),

-- Generate dates for the past week
dates AS (
  SELECT 
    generate_series(
      current_date - interval '7 days',
      current_date - interval '1 day',
      interval '1 day'
    )::date as entry_date
),

-- Create clock-in entries
clock_ins AS (
  INSERT INTO time_entries (
    staff_id,
    entry_type,
    entry_date,
    entry_time,
    notes,
    location
  )
  SELECT
    (SELECT ids[1 + floor(random() * 3)::int] FROM staff_array), -- Random staff ID
    'in',
    d.entry_date,
    (
      '08:00:00'::time + 
      (floor(random() * 30)::int || ' minutes')::interval
    )::time AS entry_time, -- Random time between 8:00 and 8:30
    CASE WHEN random() > 0.7 THEN 'Starting shift' ELSE NULL END,
    'Main Office'
  FROM dates d
  -- Only insert if entry doesn't already exist for this date/staff combo
  WHERE NOT EXISTS (
    SELECT 1 FROM time_entries te 
    WHERE te.entry_type = 'in' 
    AND te.entry_date = d.entry_date
  )
  RETURNING id, staff_id, entry_date, entry_time
),

-- Create corresponding clock-out entries based on clock-ins
clock_outs AS (
  INSERT INTO time_entries (
    staff_id,
    entry_type,
    entry_date,
    entry_time,
    notes,
    location
  )
  SELECT
    ci.staff_id,
    'out',
    ci.entry_date,
    (
      ci.entry_time + 
      (floor(random() * 3 + 8)::int || ' hours')::interval
    )::time AS entry_time, -- 8-11 hours after clock-in
    CASE WHEN random() > 0.7 THEN 'End of shift' ELSE NULL END,
    'Main Office'
  FROM clock_ins ci
  RETURNING id
)

-- Return count of inserted records
SELECT 
  (SELECT count(*) FROM clock_ins) AS inserted_clock_ins,
  (SELECT count(*) FROM clock_outs) AS inserted_clock_outs; 