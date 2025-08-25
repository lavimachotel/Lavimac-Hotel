import React, { Suspense, lazy, useEffect, useMemo } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { OfflineUserProvider } from '../context/OfflineUserContext';
import { ThemeProvider } from '../context/ThemeContext';
import { OfflineRoomReservationProvider } from '../context/OfflineRoomReservationContext';
import { ModalProvider } from '../context/ModalContext';
import { OfflineGuestProvider } from '../context/OfflineGuestContext';
import { OfflineRoomProvider } from '../context/OfflineRoomContext';
import { OfflineReservationProvider } from '../context/OfflineReservationContext';
import { OfflineStaffProvider } from '../context/OfflineStaffContext';
import { OfflineInventoryProvider } from '../context/OfflineInventoryContext';
import { OfflineRestaurantProvider } from '../context/OfflineRestaurantContext';
import OfflineHome from './OfflineHome';
import OfflineProtectedRoute from './OfflineProtectedRoute';
import {
  OfflineLandingPage,
  OfflineBillingPage,
  OfflineAdminAccessControl,
  OfflineManagerAccessControl,
  OfflineTestAccessRequests,
  OfflineReportsPage,
  OfflineRequestAccessPage,
  OfflineLoginPage,
  OfflineForgotPasswordPage,
  OfflineResetPasswordPage,
  OfflineNotFound,
  OfflineRealAccountSetup,
  OfflineStaffPage,
  OfflineStaffTimeAttendancePage,
  OfflineInventoryPage,
  OfflineRestaurantPage,
  OfflineConditionalProfileModal
} from './OfflineStubs';

// Import existing components and stubs
const OfflineDashboard = lazy(() => import('./OfflineDashboard'));
const OfflineRoomsPage = lazy(() => import('./OfflineRoomsPage'));
const OfflineGuestsPage = lazy(() => import('./OfflineGuestsPage'));
const OfflineReservationsPage = lazy(() => import('./OfflineReservationsPage'));
const OfflineTasksPage = lazy(() => import('./OfflineTasksPage'));
const OfflineSettingsPage = lazy(() => import('./OfflineSettingsPage'));
const OfflineServicesPage = lazy(() => import('./OfflineServicesPage'));

// Loading component for Suspense
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen p-5 bg-gray-100 min-w-screen">
    <div className="flex space-x-2 animate-pulse">
      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
    </div>
  </div>
);

const OfflineApp = () => {
  const location = useLocation();

  // Preload critical components 
  useEffect(() => {
    // Preload these components as they're commonly used
    import('./OfflineDashboard');
    import('./OfflineRoomsPage');
    import('./OfflineGuestsPage');
    import('./OfflineReservationsPage');
    import('./OfflineTasksPage');
    import('./OfflineSettingsPage');
    import('./OfflineServicesPage');
  }, []);

  // Force re-render when route changes with optimized transition
  useEffect(() => {
    // Scroll to top when page changes
    window.scrollTo(0, 0);
    
    // Clear any lingering tooltips or popovers
    const tooltips = document.querySelectorAll('.tooltip, .popover');
    if (tooltips.length) {
      tooltips.forEach(el => el.remove());
    }
    
    // Add instant transition to body to prevent FOUC
    document.body.classList.add('no-transition');
    
    // Remove the class after a short delay
    setTimeout(() => {
      document.body.classList.remove('no-transition');
    }, 50);
  }, [location.pathname]);

  // Create memoized routes to prevent unnecessary re-renders
  const routes = useMemo(() => (
    <Routes>
      <Route path="/" element={<OfflineHome key="offline-home-route" />} />
      <Route path="/landing" element={<OfflineLandingPage key="offline-landing-route" />} />
      <Route path="/login" element={<OfflineLoginPage key="offline-login-route" />} />
      <Route path="/request-access" element={<OfflineRequestAccessPage key="offline-request-access-route" />} />
      
      {/* Protected Routes - Add key prop for forced re-rendering */}
      <Route path="/dashboard" element={
        <OfflineProtectedRoute>
          <OfflineDashboard key="offline-dashboard" />
        </OfflineProtectedRoute>
      } />
      <Route path="/rooms" element={
        <OfflineProtectedRoute>
          <OfflineRoomsPage key="offline-rooms" />
        </OfflineProtectedRoute>
      } />
      <Route path="/reservations" element={
        <OfflineProtectedRoute>
          <OfflineReservationsPage key="offline-reservations" />
        </OfflineProtectedRoute>
      } />
      <Route path="/guests" element={
        <OfflineProtectedRoute>
          <OfflineGuestsPage key="offline-guests" />
        </OfflineProtectedRoute>
      } />
      <Route path="/staff" element={
        <OfflineProtectedRoute>
          <OfflineStaffPage key="offline-staff" />
        </OfflineProtectedRoute>
      } />
      <Route path="/tasks" element={
        <OfflineProtectedRoute>
          <OfflineTasksPage key="offline-tasks" />
        </OfflineProtectedRoute>
      } />
      <Route path="/billing" element={
        <OfflineProtectedRoute>
          <OfflineBillingPage key="offline-billing" />
        </OfflineProtectedRoute>
      } />
      <Route path="/services" element={
        <OfflineProtectedRoute>
          <OfflineServicesPage key="offline-services" />
        </OfflineProtectedRoute>
      } />
      <Route path="/inventory" element={
        <OfflineProtectedRoute>
          <OfflineInventoryPage key="offline-inventory" />
        </OfflineProtectedRoute>
      } />
      <Route path="/reports" element={
        <OfflineProtectedRoute>
          <OfflineReportsPage key="offline-reports" />
        </OfflineProtectedRoute>
      } />
      <Route path="/profile" element={
        <OfflineProtectedRoute>
          <OfflineConditionalProfileModal key="offline-profile" />
        </OfflineProtectedRoute>
      } />
      <Route path="/settings" element={
        <OfflineProtectedRoute>
          <OfflineSettingsPage key="offline-settings" />
        </OfflineProtectedRoute>
      } />
      <Route path="/admin/access-control" element={
        <OfflineProtectedRoute>
          <OfflineAdminAccessControl key="offline-admin-access" />
        </OfflineProtectedRoute>
      } />
      <Route path="/manager/access-control" element={
        <OfflineProtectedRoute>
          <OfflineManagerAccessControl key="offline-manager-access" />
        </OfflineProtectedRoute>
      } />
      <Route path="/test-access-requests" element={
        <OfflineProtectedRoute>
          <OfflineTestAccessRequests key="offline-test-access" />
        </OfflineProtectedRoute>
      } />
      <Route path="/staff/time-attendance" element={
        <OfflineProtectedRoute>
          <OfflineStaffTimeAttendancePage key="offline-time-attendance" />
        </OfflineProtectedRoute>
      } />
      <Route path="/restaurant" element={
        <OfflineProtectedRoute>
          <OfflineRestaurantPage key="offline-restaurant" />
        </OfflineProtectedRoute>
      } />
      <Route path="/forgot-password" element={<OfflineForgotPasswordPage key="offline-forgot-password-route" />} />
      <Route path="/reset-password" element={<OfflineResetPasswordPage key="offline-reset-password-route" />} />
      <Route path="/real-account-setup" element={<OfflineRealAccountSetup key="offline-real-account-setup-route" />} />
      <Route path="*" element={<OfflineNotFound key="offline-not-found-route" />} />
    </Routes>
  ), []);

  return (
    <ThemeProvider>
      <OfflineUserProvider>
        <OfflineRoomReservationProvider>
          <OfflineRoomProvider>
            <OfflineReservationProvider>
              <OfflineGuestProvider>
                <OfflineStaffProvider>
                  <OfflineInventoryProvider>
                    <OfflineRestaurantProvider>
                      <ModalProvider>
                        <div className="App">
                          <Suspense fallback={<LoadingFallback />}>
                            {routes}
                          </Suspense>
                          <Toaster position="top-right" />
                        </div>
                      </ModalProvider>
                    </OfflineRestaurantProvider>
                  </OfflineInventoryProvider>
                </OfflineStaffProvider>
              </OfflineGuestProvider>
            </OfflineReservationProvider>
          </OfflineRoomProvider>
        </OfflineRoomReservationProvider>
      </OfflineUserProvider>
    </ThemeProvider>
  );
};

export default OfflineApp; 