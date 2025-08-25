# Hotel Management System

A comprehensive hotel management application built with React and Supabase. This system provides a user-friendly interface for managing hotel rooms, reservations, guest check-ins/outs, and other essential hotel operations.

## Features

- **Room Management:** View, filter, and manage all hotel rooms
- **Reservations:** Create, update, and cancel room reservations
- **Guest Management:** Check-in and check-out guests, manage guest information
- **Dashboard:** Real-time statistics and occupancy information
- **Real-time Updates:** Live synchronization with Supabase database

## Setup and Installation

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd hotel-management/client
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Configure Supabase**
   - Create a `.env` file in the client directory with your Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```
   npm start
   ```

## Troubleshooting

### Room Data Not Loading

If rooms aren't displaying correctly, check the following:

1. **Supabase Connection:**
   - Open browser console (F12) to check for connection errors
   - Verify that your Supabase credentials in `.env` are correct
   - Run the app with `REACT_APP_DEBUG=true npm start` for verbose logging

2. **Data Format:**
   - Ensure your room data in Supabase follows the expected format
   - Required fields: `id`, `room_number`, `type`, `status`, `price`

3. **Database Connection:**
   - Requires active Supabase database connection
   - Real-time data synchronization with Supabase database

### Check-in/Check-out Issues

If you're experiencing problems with the check-in or check-out functionality:

1. Verify that the room is in the correct status before attempting operations
2. Check browser console for specific error messages 
3. Try clearing the local storage cache from the app settings page
4. Ensure Supabase has appropriate Row-Level Security (RLS) policies configured

### Reservation Creation Failing

1. Check that all required fields are properly filled
2. Verify dates are in the correct format
3. Check that the room is available for the selected dates
4. Review browser console for specific error messages

## Database Schema

The application expects the following tables in Supabase:

### Rooms Table
```sql
create table rooms (
  id uuid primary key default uuid_generate_v4(),
  room_number text not null,
  type text not null,
  status text not null default 'Available',
  price numeric not null,
  capacity integer not null default 1,
  amenities text[] default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  guest text
);
```

### Reservations Table
```sql
create table reservations (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id),
  guest_name text not null,
  guest_email text,
  guest_phone text,
  check_in_date timestamp with time zone not null,
  check_out_date timestamp with time zone not null,
  status text not null default 'Reserved',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  special_requests text,
  payment_method text,
  payment_status text default 'Pending',
  adults integer default 1,
  children integer default 0,
  room_type text
);
```

## Development Notes

### Running in Mock Data Mode

For development, ensure you have a Supabase instance configured:

1. Set up your Supabase project and database
2. Configure environment variables with your Supabase credentials
3. Restart the development server

### Debugging Mode

For detailed logging:

1. Create a `.env.development` file with:
   ```
   REACT_APP_DEBUG=true
   ```
2. Restart the development server
3. Open browser console to see additional debug information

### Performance Testing

To test the application performance:

1. Build the production version: `npm run build`
2. Serve with a static server: `npx serve -s build`
3. Access the application at http://localhost:3000

## Deploying to Vercel

This project is configured to deploy to Vercel. Follow these steps to deploy:

### Using the PowerShell Script (Windows)

1. Make sure you have Node.js installed
2. Run the deployment script:
   ```
   ./deploy-to-vercel.ps1
   ```

### Manual Deployment

1. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Navigate to the client directory:
   ```
   cd client
   ```

3. Build the project:
   ```
   npm run build
   ```

4. Deploy to Vercel:
   ```
   vercel --prod
   ```

5. Follow the prompts to complete the deployment.

Once deployed, your application will be available at the URL provided by Vercel.

## License

MIT
