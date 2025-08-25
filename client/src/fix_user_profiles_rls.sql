-- Reset existing RLS policies for the user_profiles table
DROP POLICY IF EXISTS "Allow users to update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to view own profile" ON user_profiles;

-- Enable Row Level Security on the table if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to view their own profile
CREATE POLICY "Allow users to view own profile"
ON user_profiles
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a policy that allows users to update their own profile
CREATE POLICY "Allow users to update own profile"
ON user_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a policy that allows users to view avatars
DROP POLICY IF EXISTS "Allow public access to avatars" ON storage.objects;

CREATE POLICY "Allow public access to avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Create a policy that allows authenticated users to upload avatars
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'public');

-- Create a policy that allows users to update/replace their avatars
DROP POLICY IF EXISTS "Allow users to update avatars" ON storage.objects;

CREATE POLICY "Allow users to update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'public'); 