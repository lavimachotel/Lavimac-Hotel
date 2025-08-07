# Hotel Management System 

A full-stack hotel management system with real-time room status updates, guest management, reservation handling, and comprehensive reporting. Built with React, Node.js, Express, and Supabase for persistent storage.

## Project Structure

The project consists of two main parts:

1. **Client**: React-based frontend application
2. **Server**: Node.js/Express backend

## Features

- **Dashboard**: Real-time room statistics and occupancy information
- **Room Management**: View, filter, and manage rooms with status tracking
- **Guest Management**: Check-in and check-out functionality with guest information
- **Reservations**: Create, modify and cancel reservations
- **Real-time Updates**: Live synchronization with database changes
- **Reports**: Generate and export reports in various formats

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Supabase account

## Getting Started

### Clone the Repository

```bash
git clone <repository-url>
cd hotel-management
```

### Setting Up the Backend

```bash
# Install server dependencies
npm install

# Start the server
npm start
```

The server will start at http://localhost:3001

### Setting Up the Frontend

```bash
# Change to client directory
cd client

# Install client dependencies
npm install

# Start the development server
npm start
```

The client will start at http://localhost:3000

## Database Setup

The application uses Supabase as its backend database. You'll need to set up the following:

1. Create a Supabase account at https://supabase.com
2. Create a new project
3. Set up the required tables using the SQL scripts in the `db_scripts` folder
4. Configure your Supabase connection in the client and server `.env` files

See `db_scripts/README.md` for detailed database setup instructions.

## Environment Variables

### Client Environment Variables

Create a `.env` file in the `client` directory:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Server Environment Variables

Create a `.env` file in the root directory:

```
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## Development Notes

The application requires an active Supabase connection to function properly. All data is stored and retrieved from the Supabase database with real-time synchronization.

## Troubleshooting

### Supabase Connection Issues

If you're encountering connection issues with Supabase, check:

1. Your Supabase project is active
2. Your API credentials in `.env` files are correct
3. The appropriate RLS (Row Level Security) policies are in place
   - See `README-RLS-FIX.md` for instructions on fixing common RLS issues

### Room Display Issues

If rooms aren't displaying correctly:

1. Check browser console for error messages
2. Verify that Supabase has room data in the correct format
3. Try clearing your browser's local storage
4. Enable mock data mode temporarily to see if the issue is with your data source

## Building for Production

### Client Build

```bash
cd client
npm run build
```

This creates an optimized production build in the `client/build` folder.

### Server Build

```bash
npm run build
```

## Deployment

The application can be deployed to various hosting services:

1. **Frontend**: Deploy the `client/build` folder to services like Netlify, Vercel, or any static hosting
2. **Backend**: Deploy the Node.js server to services like Heroku, Railway, or any Node.js hosting

Remember to set the appropriate environment variables on your hosting provider.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 