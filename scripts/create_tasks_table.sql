-- Create tasks table with comprehensive fields
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  room VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  assignee VARCHAR(255),
  status VARCHAR(50) NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- Duration in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_room ON tasks(room);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous users (for development purposes)
CREATE POLICY anon_access ON tasks FOR ALL USING (true);

-- Create policy for authenticated users
CREATE POLICY auth_access ON tasks FOR ALL USING (true);

-- Create function to update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tasks table
CREATE TRIGGER set_tasks_timestamp
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Enable Realtime for tasks
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Insert sample data
INSERT INTO tasks (room, description, priority, assignee, status, due_date, duration)
VALUES
  ('Room 101', 'Deep cleaning after checkout', 'High', 'John Doe', 'Pending', now() + interval '2 hours', 45),
  ('Room 203', 'Fix AC not cooling properly', 'Medium', 'Sarah Johnson', 'In Progress', now() + interval '1 day', 60),
  ('Hallway', 'Replace light bulbs', 'Low', 'Michael Chen', 'Pending', now() + interval '3 days', 30),
  ('Room 305', 'Clean bathroom', 'High', 'John Doe', 'Pending', now() + interval '4 hours', 25),
  ('Lobby', 'Polish furniture', 'Medium', 'Sarah Johnson', 'Pending', now() + interval '2 days', 90);

-- Grant privileges
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON tasks TO anon;
GRANT USAGE, SELECT ON SEQUENCE tasks_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE tasks_id_seq TO anon; 