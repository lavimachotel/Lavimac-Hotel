-- Just drop the problematic policies that cause infinite recursion
-- but don't recreate any policies that might already exist

-- First, drop policies that might be causing the recursion
DROP POLICY IF EXISTS manager_read_profiles ON public.user_profiles;
DROP POLICY IF EXISTS admin_manage_profiles ON public.user_profiles;
DROP POLICY IF EXISTS read_own_profile ON public.user_profiles;

-- Drop any other policy that might be using recursive checks
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles; 
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles; 