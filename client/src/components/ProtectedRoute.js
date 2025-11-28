import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import usePermission from '../hooks/usePermission';
import { toast } from 'react-hot-toast';

/**
 * ProtectedRoute - A wrapper component that protects routes from unauthorized access
 * It checks if the user is logged in and redirects to landing page if not
 */
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading: isLoading } = useUser();
  const location = useLocation();
  const { hasDepartmentAccess } = usePermission();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Function to get page name from path for permission checking
  const getPageNameFromPath = (pathname) => {
    const pathParts = pathname.split('/').filter(part => part !== '');
    const path = pathParts[0]?.toLowerCase() || '';

    // Handle offline routes - they should have same permissions as their online counterparts
    if (path === 'offline' && pathParts[1]) {
      const offlinePagePath = pathParts[1].toLowerCase();
      const offlinePathToPageName = {
        'dashboard': 'Dashboard',
        'rooms': 'Rooms',
        'guests': 'Guests',
        'reservations': 'Reservations',
        'billing': 'Billing',
        'tasks': 'Tasks',
        'staff': 'Staff',
        'inventory': 'Inventory',
        'restaurant': 'Restaurant',
        'reports': 'Reports',
        'services': 'Services'
      };
      return offlinePathToPageName[offlinePagePath] || 'Dashboard';
    }

    const pathToPageName = {
      '': 'Dashboard',
      'dashboard': 'Dashboard',
      'reservations': 'Reservations',
      'rooms': 'Rooms',
      'guests': 'Guests',
      'staff': 'Staff',
      'tasks': 'Tasks',
      'billing': 'Billing',
      'inventory': 'Inventory',
      'restaurant': 'Restaurant',
      'bar': 'Restaurant', // Alias for restaurant
      'reports': 'Reports',
      'services': 'Services',
      'settings': 'Settings',
      'staff-access': 'Staff Access',
      'logout': 'Logout',
      'pool': 'Pool',
      'systems': 'Systems'
    };

    // Grant universal access to Time and Attendance page
    // Grant universal access to Time and Attendance page
    if (path === 'time-attendance') {
      return null;
    }

    // Grant universal access to offline testing routes and offline pages
    if (path === 'offline-test' || path === 'simple-test' || path === 'offline-rooms' || path === 'offline') {
      return null;
    }

    return pathToPageName[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  useEffect(() => {
    const checkAccess = () => {
      if (!currentUser) {
        setHasAccess(false);
        setIsCheckingAccess(false);
        return;
      }

      const pageName = getPageNameFromPath(location.pathname);

      // Skip access check for paths that don't require it
      if (pageName === null) {
        setHasAccess(true);
        setIsCheckingAccess(false);
        return;
      }

      // Special case for Inventory page - allow Housekeeping and Food & Beverage staff
      if (pageName === 'Inventory' &&
        (currentUser.department === 'Housekeeping' ||
          currentUser.department === 'Food & Beverage')) {
        setHasAccess(true);
        setIsCheckingAccess(false);
        return;
      }

      const accessGranted = hasDepartmentAccess(pageName);
      setHasAccess(accessGranted);
      setIsCheckingAccess(false);

      if (!accessGranted) {

      }
    };

    checkAccess();
  }, [currentUser, location.pathname, hasDepartmentAccess]);

  // While checking authentication status
  if (isLoading || isCheckingAccess) {
    return <div>Loading...</div>;
  }

  // If not authenticated, redirect to landing page
  if (!currentUser) {
    console.log('Not authenticated, redirecting to landing page');
    return <Navigate to="/landing" state={{ from: location }} replace />;
  }

  // Check department-based access
  if (!hasAccess) {
    console.log('Access denied for', currentUser.department, 'to page:', getPageNameFromPath(location.pathname));

    // Redirect to department's default page instead of dashboard
    const getDepartmentDefaultPage = (department) => {
      const normalizedDept = department ? department.toLowerCase().replace(/\s+/g, '_') : '';

      switch (normalizedDept) {
        case 'food_beverage':
        case 'food_&_beverage':
        case 'food&beverage':
          return '/restaurant';
        case 'housekeeping':
        case 'maintenance':
          return '/tasks';
        case 'accounting':
          return '/billing';
        case 'hr':
        case 'human_resources':
          return '/staff';
        case 'front_desk':
        case 'management':
        default:
          return '/dashboard';
      }
    };

    const defaultPage = getDepartmentDefaultPage(currentUser.department);
    const currentPage = getPageNameFromPath(location.pathname);

    // If we're being denied from the user's own default page, show error instead of redirect loop
    if (location.pathname === defaultPage) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your account ({currentUser.department}) doesn't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              Please contact your administrator if you believe this is an error.
            </p>
            <button
              onClick={() => window.location.href = '/logout'}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      );
    }

    // Redirect to the user's department default page
    return <Navigate to={defaultPage} state={{ from: location }} replace />;
  }

  // If authenticated and has access, render the children
  return children;
};

export default ProtectedRoute; 