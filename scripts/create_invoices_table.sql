-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  guest_name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Paid', 'Pending', 'Refunded', 'Overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  room_type TEXT,
  nights INTEGER,
  room_rate DECIMAL(10,2)
);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS invoices_guest_name_idx ON public.invoices(guest_name);
CREATE INDEX IF NOT EXISTS invoices_room_number_idx ON public.invoices(room_number);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices(status);

-- Enable Row Level Security
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for anonymous access (full access for development purposes)
DROP POLICY IF EXISTS "Allow anonymous read access to invoices" ON public.invoices;
CREATE POLICY "Allow anonymous full access to invoices"
  ON public.invoices
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create RLS policy for authenticated users (full access)
DROP POLICY IF EXISTS "Allow authenticated users full access to invoices" ON public.invoices;
CREATE POLICY "Allow authenticated users full access to invoices"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create a function to automatically update the 'updated_at' column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it already exists to avoid conflicts
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;

-- Create a trigger to call the function whenever a row is updated
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for the invoices table
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
END;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;

-- Insert sample data
INSERT INTO public.invoices 
  (guest_name, room_number, check_in_date, check_out_date, amount, status, room_type, nights, room_rate)
VALUES
  ('Sample Guest', '101', '2023-11-15', '2023-11-18', 1250.00, 'Paid', 'Deluxe', 3, 416.67);

-- Grant necessary privileges (expanded for development)
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.invoices_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.invoices_id_seq TO anon; 