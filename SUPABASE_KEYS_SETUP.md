# Supabase Keys Setup

This document contains the new Supabase configuration keys for the Lavimac HMS project.

## New Supabase Configuration

### Project URL
```
https://bviglsgfbwjhioeyhnin.supabase.co
```

### Anonymous Key (Public)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWdsc2dmYndqaGlvZXlobmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjgzOTEsImV4cCI6MjA3MTcwNDM5MX0.qge5aoUragEUNQbXSO1oheiW0Cog_JUBogrOKj0OoTA
```

### Service Role Key (Private)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWdsc2dmYndqaGlvZXlobmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyODM5MSwiZXhwIjoyMDcxNzA0MzkxfQ.lC27GFNAA61dvCwPVBEK2ios7JHPcGE_qivrbVF4vnA
```

## Environment Variables Setup

### Option 1: Create .env file (Recommended)

Create a `.env` file in your project root with the following content:

```bash
SUPABASE_URL=https://bviglsgfbwjhioeyhnin.supabase.co 
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWdsc2dmYndqaGlvZXlobmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjgzOTEsImV4cCI6MjA3MTcwNDM5MX0.qge5aoUragEUNQbXSO1oheiW0Cog_JUBogrOKj0OoTA
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWdsc2dmYndqaGlvZXlobmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyODM5MSwiZXhwIjoyMDcxNzA0MzkxfQ.lC27GFNAA61dvCwPVBEK2ios7JHPcGE_qivrbVF4vnA
REACT_APP_SUPABASE_URL=https://bviglsgfbwjhioeyhnin.supabase.co 
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWdsc2dmYndqaGlvZXlobmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjgzOTEsImV4cCI6MjA3MTcwNDM5MX0.qge5aoUragEUNQbXSO1oheiW0Cog_JUBogrOKj0OoTA
```

### Option 2: Use the Configuration File

The project now includes a `supabase-config.js` file that contains all the configuration. You can import this file in your scripts:

```javascript
// For CommonJS
const SUPABASE_CONFIG = require('./supabase-config.js');

// For ES6 modules
import SUPABASE_CONFIG from './supabase-config.js';

// Use the configuration
const supabaseUrl = SUPABASE_CONFIG.SUPABASE_URL;
const supabaseKey = SUPABASE_CONFIG.SUPABASE_ANON_KEY;
```

## What Has Been Updated

The following files have been updated with the new Supabase keys:

1. **src/supabaseClient.js** - Main Supabase client configuration
2. **client/src/supabaseClient.js** - Client-side Supabase client configuration
3. **client/vercel.json** - Vercel deployment environment variables
4. **check_database_setup.js** - Database setup script
5. **check_database_tables.js** - Database tables check script
6. **fix_database_setup.js** - Database fix script
7. **update_rooms_data.js** - Rooms data update script

## Security Notes

- **Anonymous Key**: This is safe to use in client-side code and is already included in the Vercel deployment
- **Service Role Key**: This should only be used in server-side scripts and should never be exposed to the client
- **Environment Variables**: The `.env` file should be added to `.gitignore` to prevent committing sensitive keys

## Testing the Connection

After setting up the environment variables, you can test the connection by running:

```bash
# Test database setup
node check_database_setup.js

# Test database tables
node check_database_tables.js

# Test rooms data update
node update_rooms_data.js
```

## Troubleshooting

If you encounter connection issues:

1. Verify the environment variables are set correctly
2. Check that the Supabase project is active and accessible
3. Ensure your IP address is not blocked by Supabase
4. Check the browser console for any authentication errors

## Next Steps

1. Set up your environment variables using one of the methods above
2. Test the connection to ensure everything is working
3. Deploy your application with the new configuration
4. Monitor the application for any connection issues
