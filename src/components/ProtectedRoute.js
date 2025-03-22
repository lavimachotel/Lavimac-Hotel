import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

/**
 * ProtectedRoute - A wrapper component that protects routes from unauthorized access
 * It checks if the user is logged in and redirects to landing page if not
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useUser();
  const location = useLocation();

  useEffect(() => {
    console.log(`ProtectedRoute [${location.pathname}]: User ${user ? 'authenticated' : 'not authenticated'}, Loading: ${loading}`);
  }, [user, loading, location.pathname]);

  // Show a loading indicator while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="flex space-x-2 animate-pulse mb-4">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">Verifying your session...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, redirect to landing page
  if (!user) {
    console.log(`ProtectedRoute: Redirecting from ${location.pathname} to /landing (not authenticated)`);
    return <Navigate to="/landing" state={{ from: location.pathname }} replace />;
  }

  // User is authenticated, render the protected route
  console.log(`ProtectedRoute: Allowing access to ${location.pathname}`);
  return children;
};

export default ProtectedRoute; 