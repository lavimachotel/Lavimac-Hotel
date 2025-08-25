-- Add avatar_url column to user_profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE user_profiles
        ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- Create a storage bucket for avatars if it doesn't exist
-- Note: This needs to be run with Supabase admin privileges
-- You may need to run this in the Supabase SQL editor
-- or adjust your RLS policies to allow users to upload avatars

-- Example RLS policy for avatars bucket (to be run in Supabase SQL editor)
/*
-- Allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read any avatar
CREATE POLICY "Anyone can view avatars" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'avatars');
*/

-- Update the user_profiles table to include updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE user_profiles
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$; 