-- Add guest_id column to service_requests table
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS guest_id UUID;

-- Create an index for faster lookups
DROP INDEX IF EXISTS idx_service_requests_guest_id;
CREATE INDEX idx_service_requests_guest_id ON service_requests(guest_id); 