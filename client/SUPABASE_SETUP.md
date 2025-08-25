# Supabase Setup Guide

This guide will help you set up your Supabase configuration for the Hotel Management System.

## 1. Create a Supabase Account and Project

1. Go to [Supabase](https://supabase.com/) and sign up for an account if you don't have one.
2. Create a new project:
   - Click on "New Project"
   - Enter a name for your project (e.g., "MikjaneHotelManagement")
   - Set a secure database password
   - Choose a region closest to your users
   - Click "Create new project"

## 2. Set Up Database Tables

1. In your Supabase dashboard, go to the "SQL Editor" section.
2. Create a new query and paste the contents of the `create_tables.sql` file.
3. Run the query to create all the necessary tables and set up the security policies.

### Common SQL Script Errors

If you encounter errors when running the SQL script, here's how to handle them:

#### "ERROR: 42501: permission denied to set parameter "app.jwt_secret""

This error occurs because the default Supabase user doesn't have superuser privileges to set database parameters. To fix this:

1. Remove or comment out the line `ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';` from your SQL script
2. Configure JWT settings through the Supabase dashboard instead:
   - Go to your Supabase dashboard
   - Navigate to Settings > API
   - Under "JWT Settings", you can configure your JWT expiry time

#### "ERROR: relation already exists"

This error occurs when you try to create a table that already exists. You can safely ignore this error, as our script uses `CREATE TABLE IF NOT EXISTS` to handle this case.

#### "ERROR: permission denied for schema public"

This error might occur if your Supabase project has restricted permissions on the public schema. To fix this:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the following SQL to grant permissions:
   ```sql
   GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
   ```

## 3. Get Your API Credentials

1. In your Supabase dashboard, go to "Settings" (gear icon) in the left sidebar.
2. Click on "API" in the submenu.
3. You'll find your:
   - **Project URL**: This is your `REACT_APP_SUPABASE_URL`
   - **anon/public** key: This is your `REACT_APP_SUPABASE_ANON_KEY`

## 4. Configure Your Environment Variables

1. In the `client` directory, create a `.env` file (or edit the existing one).
2. Add the following lines, replacing the placeholders with your actual values:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```

## 5. Configure Authentication Settings

1. In your Supabase dashboard, go to "Authentication" > "Settings".
2. Under "Email Auth", make sure "Enable Email Signup" is turned on.
3. Optionally, you can configure email templates for verification, password recovery, etc.
4. Under "JWT Settings", you can adjust the token expiry time (default is 3600 seconds or 1 hour).
   - Consider increasing this to 86400 seconds (24 hours) for better user experience.

## 6. Configure CORS Settings

1. In your Supabase dashboard, go to "Settings" > "API".
2. Under "CORS (Cross-Origin Resource Sharing)", add your application's domain:
   - For local development, add `http://localhost:3000`
   - For production, add your production domain
   - Alternatively, you can use `*` for development, but this is not recommended for production

## 7. Test Your Setup

1. Start your development server:
   ```bash
   npm start
   ```
2. Navigate to the setup page at `http://localhost:3000/setup`
3. The setup page will check your Supabase connection and database tables
4. If everything is set up correctly, you can create an admin user through the setup page

## 8. Restart Your Application

After making these changes, restart your development server for the changes to take effect:

```bash
# Stop your current server (Ctrl+C)
# Then restart it
npm start
```

## Troubleshooting

If you encounter any issues during setup, refer to the `SUPABASE_TROUBLESHOOTING.md` file for detailed troubleshooting steps.

For more help, refer to the [Supabase documentation](https://supabase.com/docs). 