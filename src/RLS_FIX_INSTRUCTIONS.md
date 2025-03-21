# Fixing Row Level Security (RLS) Errors in User Profiles

This guide will help you fix the "Error updating profile: new row violates row-level security policy" issue that occurs when trying to update your user profile in the settings page.

## What is the Issue?

The error occurs because Supabase's Row Level Security (RLS) policies are preventing users from updating their own profile information. This is a security feature, but it needs to be properly configured to allow legitimate operations.

## Quick Fix

Here's a step-by-step guide to resolve this issue:

### Option 1: Run the Fix Script (Requires Service Role Key)

1. Make sure you have the necessary environment variables set in your `.env` file:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key
   REACT_APP_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Run the RLS fix script:
   ```bash
   node src/run_rls_fixes.js
   ```

3. Restart your application and try updating your profile again.

### Option 2: Manual SQL Fix in Supabase Dashboard

If you don't have access to the service role key or prefer to do it manually:

1. Log in to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to the SQL Editor
4. Copy and paste the contents of `fix_user_profiles_rls.sql` and run it
5. Restart your application and try updating your profile again

### Option 3: Use the Supabase CLI

If you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed:

1. Make sure you're authenticated with the CLI
2. Run:
   ```bash
   supabase db execute --file src/fix_user_profiles_rls.sql
   ```

## Detailed Explanation of the Fix

The RLS fix does the following:

1. Resets any existing RLS policies for the `user_profiles` table
2. Creates policies that allow users to:
   - View their own profile data
   - Update their own profile data
3. Sets up policies for the `storage.objects` table to allow users to:
   - View avatars (publicly accessible)
   - Upload their own avatars
   - Update their own avatars

## Custom Code Changes

We've also made the following code improvements:

1. Enhanced error logging in `supabaseClient.js` to better identify RLS issues
2. Added better error handling in the profile update function
3. Added proper upload options for avatar images

## Verifying the Fix

After applying one of the fixes above, try these steps to verify everything is working:

1. Go to the Settings page
2. Change your name or phone number
3. Upload a profile picture
4. Save the changes
5. Refresh the page to ensure the changes persist
6. Check that your profile picture appears in the navbar

## Still Having Issues?

If you're still encountering problems, check the following:

1. Open your browser's developer console (F12) and look for specific error messages
2. Make sure your user is properly authenticated before trying to update the profile
3. Check that the `user_id` in the `user_profiles` table matches the `id` in the `auth.users` table
4. Try clearing your browser's localStorage and logging in again

For more advanced troubleshooting, you can use the diagnostic functions in `supabaseClient.js`:

```javascript
import supabase, { diagnoseRLSIssues } from './supabaseClient';

// In your component:
const diagnose = async () => {
  const results = await diagnoseRLSIssues();
  console.log(results);
};
``` 