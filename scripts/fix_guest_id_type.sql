-- Drop the existing guest_id column if it exists with the wrong type
DO $$
BEGIN
  -- First check if the column exists and is of integer type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'service_requests' 
    AND column_name = 'guest_id' 
    AND data_type = 'integer'
  ) THEN
    -- Drop the column with the wrong type
    ALTER TABLE service_requests DROP COLUMN guest_id;
    
    -- Add it back with the correct UUID type
    ALTER TABLE service_requests ADD COLUMN guest_id UUID;
  END IF;
  
  -- If the column doesn't exist at all, add it
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'service_requests' 
    AND column_name = 'guest_id'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN guest_id UUID;
  END IF;
END
$$;

-- Create or recreate the index
DROP INDEX IF EXISTS idx_service_requests_guest_id;
CREATE INDEX idx_service_requests_guest_id ON service_requests(guest_id); 