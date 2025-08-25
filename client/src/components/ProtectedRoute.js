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
  const { currentUser, isLoading } = useUser();
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
      'reports': 'Reports',
      'services': 'Services',
      'settings': 'Settings',
      'staff-access': 'Staff Access',
      'logout': 'Logout'
    };
    
    // Grant universal access to Time and Attendance page
    if (path === 'staff' && pathname.includes('time-attendance')) {
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
        toast.error(`Access denied: ${pageName} is not accessible for ${currentUser.department} staff`);
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
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }
  
  // If authenticated and has access, render the children
  return children;
};

export default ProtectedRoute; 