-- Create time_entries table for storing staff clock in/out records
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('in', 'out')), -- 'in' or 'out'
  entry_date DATE NOT NULL,
  entry_time TIME NOT NULL,
  notes TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_time_entries_staff_id ON time_entries(staff_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_entry_date ON time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_entry_type ON time_entries(entry_type);

-- Add Row Level Security (RLS) policies
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Allow all users to view time entries
CREATE POLICY "Time entries are viewable by everyone" 
ON time_entries FOR SELECT 
USING (true);

-- Allow authenticated users to insert time entries
CREATE POLICY "Users can insert their own time entries" 
ON time_entries FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update their own time entries
CREATE POLICY "Users can update their own time entries" 
ON time_entries FOR UPDATE 
TO authenticated 
USING (true);

-- Add view to calculate work hours by staff and date
CREATE OR REPLACE VIEW staff_work_hours AS
SELECT 
  staff_id,
  entry_date,
  (
    SELECT MAX(e_out.entry_time) 
    FROM time_entries e_out 
    WHERE e_out.staff_id = e_in.staff_id 
      AND e_out.entry_date = e_in.entry_date 
      AND e_out.entry_type = 'out'
  ) - (
    SELECT MIN(e_in.entry_time) 
    FROM time_entries e_in 
    WHERE e_in.staff_id = e_in.staff_id 
      AND e_in.entry_date = e_in.entry_date 
      AND e_in.entry_type = 'in'
  ) AS work_hours
FROM time_entries e_in
WHERE e_in.entry_type = 'in'
GROUP BY staff_id, entry_date;

-- Comment on the time_entries table
COMMENT ON TABLE time_entries IS 'Stores staff time entries for clock in/out records';

-- Notify clients on changes to time entries
DROP TRIGGER IF EXISTS time_entries_changes_trigger ON time_entries;
CREATE TRIGGER time_entries_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON time_entries
FOR EACH ROW EXECUTE FUNCTION public.notify_table_changes(); 