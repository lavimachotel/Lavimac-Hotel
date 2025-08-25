import React, { useEffect } from 'react';
import { useOfflineUser } from '../context/OfflineUserContext';
import { useNavigate, useLocation } from 'react-router-dom';

const OfflineProtectedRoute = ({ children }) => {
  const { user, loading } = useOfflineUser();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle navigation when user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      // Stay within the offline system, redirect to offline home
      if (location.pathname.startsWith('/offline')) {
        navigate('/offline/');
      } else {
        // Fallback for routes not starting with /offline
        navigate('/offline/');
      }
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-green-400">Initializing Offline System...</p>
          <p className="mt-2 text-gray-500 text-sm">Setting up local database</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
            <i className="fas fa-exclamation-triangle text-white text-2xl"></i>
          </div>
          <p className="text-red-400">Redirecting to Offline Home...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default OfflineProtectedRoute; 