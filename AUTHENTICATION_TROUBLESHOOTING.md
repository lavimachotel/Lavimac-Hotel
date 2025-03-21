# Authentication Troubleshooting Guide

This guide helps you resolve common authentication issues in the Hotel Management System.

## Common Authentication Errors

### "Auth session missing" Error

**Error Message:** `AuthSessionMissingError: Auth session missing!`

**Causes:**
1. You're not logged in
2. Your session has expired
3. The session cookie is missing or invalid
4. The Supabase client is not properly initialized

**Solutions:**

1. **Log in again:**
   - Navigate to `/login`
   - Enter your credentials
   - If successful, you'll be redirected to the dashboard

2. **Check your Supabase configuration:**
   - Ensure your `.env` file contains the correct Supabase URL and anon key:
     ```
     REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
     REACT_APP_SUPABASE_ANON_KEY=your-anon-key
     ```
   - Restart your development server after making changes

3. **Clear browser cookies and cache:**
   - Open your browser's settings
   - Clear cookies and site data for your application
   - Try logging in again

4. **Check for CORS issues:**
   - Open your browser's developer console (F12)
   - Look for CORS-related errors
   - If found, ensure your Supabase project has the correct allowed origins

## Role-Based Access Issues

### "Access denied. Admin privileges required" Error

**Causes:**
1. Your user account doesn't have the admin role
2. The role information isn't being properly loaded from the user_profiles table

**Solutions:**

1. **Check your user role:**
   - Log in to the application
   - Navigate to `/dashboard`
   - Your role should be displayed in the user profile section

2. **Update your role in the database:**
   - Connect to your Supabase database
   - Run the following SQL query:
     ```sql
     UPDATE user_profiles 
     SET role = 'admin' 
     WHERE user_id = 'your-user-id';
     ```
   - Replace 'your-user-id' with your actual user ID
   - Log out and log back in

3. **Check the user_profiles table:**
   - Ensure the table exists and has the correct structure
   - Verify that there's a record for your user with the correct user_id

## Session Management Issues

### Session Expires Too Quickly

**Causes:**
1. JWT expiration time is set too short
2. Token refresh mechanism isn't working

**Solutions:**

1. **Adjust JWT expiration in Supabase:**
   - Go to your Supabase dashboard
   - Navigate to Authentication > Settings
   - Under "JWT Expiry", increase the value (e.g., to 3600 seconds / 1 hour)

2. **Check token refresh implementation:**
   - Open the AuthContext.js file
   - Verify that the token refresh mechanism is properly implemented
   - Ensure the refreshToken function is being called before token expiration

## Browser-Related Issues

### Authentication Works in Some Browsers But Not Others

**Causes:**
1. Cookie settings differ between browsers
2. Privacy settings blocking third-party cookies
3. Local storage access is restricted

**Solutions:**

1. **Check browser cookie settings:**
   - Ensure cookies are enabled
   - Check if third-party cookies are blocked
   - Disable tracking prevention features temporarily for testing

2. **Use localStorage instead of cookies:**
   - Update the Supabase client configuration:
     ```javascript
     const supabase = createClient(supabaseUrl, supabaseAnonKey, {
       auth: {
         autoRefreshToken: true,
         persistSession: true,
         storage: localStorage
       }
     });
     ```

## Testing Authentication

To test if your authentication is working correctly:

1. **Check current session:**
   ```javascript
   const { data, error } = await supabase.auth.getSession();
   console.log('Session:', data.session);
   ```

2. **Get current user:**
   ```javascript
   const { data, error } = await supabase.auth.getUser();
   console.log('User:', data.user);
   ```

3. **Check user role:**
   ```javascript
   const { data, error } = await supabase
     .from('user_profiles')
     .select('role')
     .eq('user_id', userId)
     .single();
   console.log('User role:', data?.role);
   ```

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JWT Debugging Tool](https://jwt.io/) - Paste your JWT token to decode and verify it
- [Supabase Community Forum](https://github.com/supabase/supabase/discussions) 