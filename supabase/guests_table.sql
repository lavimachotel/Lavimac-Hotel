-- Drop the table if it exists
DROP TABLE IF EXISTS public.guests;

-- Create the guests table
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    room TEXT NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'Checked In',
    first_name TEXT,
    last_name TEXT,
    date_of_birth TEXT,
    gender TEXT,
    nationality TEXT,
    region TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Setup RLS (Row Level Security)
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Create policy for users who can see all guests
CREATE POLICY "Users can view all guests" ON public.guests
    FOR SELECT
    USING (true);

-- Create policy for authenticated users to insert guests
CREATE POLICY "Authenticated users can insert guests" ON public.guests
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to update guests
CREATE POLICY "Authenticated users can update guests" ON public.guests
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Create policy for authenticated users to delete guests
CREATE POLICY "Authenticated users can delete guests" ON public.guests
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS guests_room_idx ON public.guests (room);
CREATE INDEX IF NOT EXISTS guests_status_idx ON public.guests (status);
CREATE INDEX IF NOT EXISTS guests_created_at_idx ON public.guests (created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_guests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER guests_updated_at_trigger
BEFORE UPDATE ON public.guests
FOR EACH ROW
EXECUTE FUNCTION public.update_guests_updated_at();

-- Add comment to the table
COMMENT ON TABLE public.guests IS 'Stores information about hotel guests'; 