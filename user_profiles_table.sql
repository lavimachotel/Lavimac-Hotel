-- Create the user_profiles table

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff', 'manager', 'admin')),
  position TEXT,
  department TEXT,
  contact_number TEXT,
  permissions TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to read their own profile
CREATE POLICY read_own_profile ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Allow managers to read staff profiles
CREATE POLICY manager_read_profiles ON public.user_profiles
  FOR SELECT USING (
    (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('manager', 'admin')
  );

-- Allow admins to manage all profiles
CREATE POLICY admin_manage_profiles ON public.user_profiles
  FOR ALL USING (
    (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'admin'
  );

-- Allow insertion via the service role (needed for account creation)
CREATE POLICY service_insert_profiles ON public.user_profiles
  FOR INSERT WITH CHECK (TRUE);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id); 