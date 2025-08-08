-- Create the guests table for Hotel Management System
-- This script aligns with the schema expected by your application

-- First, make sure you have the UUID extension installed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the guests table
CREATE TABLE IF NOT EXISTS public.guests (
    -- Primary key and identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic guest information
    name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    
    -- Personal details
    date_of_birth TEXT,
    gender TEXT,
    nationality TEXT,
    region TEXT,
    address TEXT,
    
    -- Booking information
    room TEXT NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'Checked In',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public access to the guests table
-- Note: In a production environment, you might want more restrictive policies
CREATE POLICY "Allow public access to guests" 
ON public.guests FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_guests_room ON public.guests(room);
CREATE INDEX idx_guests_status ON public.guests(status);
CREATE INDEX idx_guests_name ON public.guests(name);
CREATE INDEX idx_guests_email ON public.guests(email);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER set_guests_timestamp
BEFORE UPDATE ON public.guests
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Grant access to the anon and authenticated roles
GRANT ALL ON public.guests TO anon, authenticated;

-- Add realtime functionality
ALTER publication supabase_realtime ADD TABLE public.guests;

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Guests table successfully created with all necessary fields and permissions.';
END $$; 