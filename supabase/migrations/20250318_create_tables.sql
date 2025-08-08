-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id BIGINT PRIMARY KEY,
    room_number BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Available',
    price DECIMAL(10, 2) NOT NULL,
    capacity INTEGER NOT NULL,
    amenities TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index on room_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON public.rooms(room_number);

-- Create reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id BIGINT NOT NULL REFERENCES public.rooms(id),
    room_number BIGINT NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255),
    guest_phone VARCHAR(50),
    check_in_date TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Reserved',
    room_type VARCHAR(50) NOT NULL,
    room_price DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON public.reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_number ON public.reservations(room_number);
CREATE INDEX IF NOT EXISTS idx_reservations_guest_name ON public.reservations(guest_name);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON public.reservations(check_in_date, check_out_date);

-- Create RLS policies for security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow full access to authenticated users" ON public.rooms
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow full access to authenticated users" ON public.reservations
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Grant access to anon and authenticated roles
GRANT ALL ON public.rooms TO anon, authenticated;
GRANT ALL ON public.reservations TO anon, authenticated;
