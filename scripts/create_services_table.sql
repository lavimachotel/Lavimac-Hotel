-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create service_requests table
CREATE TABLE IF NOT EXISTS service_requests (
  id SERIAL PRIMARY KEY,
  room VARCHAR(255) NOT NULL,
  service_id INTEGER REFERENCES services(id),
  service_name VARCHAR(255) NOT NULL,
  requested_by VARCHAR(255) NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status VARCHAR(50) NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);
CREATE INDEX IF NOT EXISTS idx_services_available ON services(available);
CREATE INDEX IF NOT EXISTS idx_service_requests_room ON service_requests(room);
CREATE INDEX IF NOT EXISTS idx_service_requests_service_id ON service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

-- Enable Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous users (for development purposes)
CREATE POLICY anon_access_services ON services FOR ALL USING (true);
CREATE POLICY anon_access_service_requests ON service_requests FOR ALL USING (true);

-- Create policy for authenticated users
CREATE POLICY auth_access_services ON services FOR ALL USING (true);
CREATE POLICY auth_access_service_requests ON service_requests FOR ALL USING (true);

-- Create function to update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for services table
CREATE TRIGGER set_services_timestamp
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Create trigger for service_requests table
CREATE TRIGGER set_service_requests_timestamp
BEFORE UPDATE ON service_requests
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Enable Realtime for services and service_requests
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE services, service_requests;

-- Insert sample data for services
INSERT INTO services (name, price, description, available)
VALUES
  ('Room Cleaning', 25.00, 'Standard room cleaning service', TRUE),
  ('Laundry', 15.00, 'Per load of laundry', TRUE),
  ('Breakfast', 20.00, 'Continental breakfast', TRUE),
  ('Airport Shuttle', 50.00, 'Round trip to/from airport', TRUE),
  ('Spa Treatment', 120.00, '60-minute massage', FALSE),
  ('Room Service', 10.00, 'Delivery fee + food cost', TRUE);

-- Insert sample data for service_requests
INSERT INTO service_requests (room, service_id, service_name, requested_by, status, notes)
VALUES
  ('Room 301', 1, 'Room Cleaning', 'James Wilson', 'Pending', 'Please clean after 11:00 AM'),
  ('Room 405', 6, 'Room Service', 'Sarah Chen', 'In Progress', 'Ordered breakfast items'),
  ('Room 203', 2, 'Laundry', 'Michael Brown', 'Completed', 'Two loads of laundry completed'),
  ('Room 512', 4, 'Airport Shuttle', 'Emma Johnson', 'Pending', 'Needs pickup at 4:00 PM tomorrow'),
  ('Room 107', 1, 'Room Cleaning', 'David Smith', 'Cancelled', 'Guest checked out early');

-- Grant privileges
GRANT ALL ON services TO authenticated;
GRANT ALL ON services TO anon;
GRANT ALL ON service_requests TO authenticated;
GRANT ALL ON service_requests TO anon;
GRANT USAGE, SELECT ON SEQUENCE services_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE services_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE service_requests_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE service_requests_id_seq TO anon; 