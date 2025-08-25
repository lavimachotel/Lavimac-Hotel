import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5 bg-gray-100 min-w-screen dark:bg-gray-900 dark:text-white">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-xl mb-6">The page you are looking for doesn't exist or has been moved.</p>
      <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
        Go Home
      </Link>
      <div className="mt-8 text-gray-500 dark:text-gray-400">
        <p>If you believe this is an error, please contact the system administrator.</p>
        <p className="mt-2">You can also try clearing your browser cache and cookies.</p>
      </div>
    </div>
  );
};

export default NotFound; 