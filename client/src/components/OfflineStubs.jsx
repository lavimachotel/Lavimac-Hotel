import React from "react";
import { useTheme } from '../context/ThemeContext';

// Generic stub component for components that aren't fully implemented yet
const OfflineStub = ({ title, description, icon = "fas fa-tools" }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
      <div className="text-center p-8">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-orange-500 to-yellow-600 rounded-full flex items-center justify-center">
            <i className={`${icon} text-white text-2xl`}></i>
          </div>
          <h1 className={`text-3xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {title} - Offline Mode
          </h1>
          <p className={`text-lg mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {description}
          </p>
          <p className={`text-sm ${isDarkMode ? 'text-orange-400' : 'text-orange-600'} font-medium`}>
            🚧 This feature is being adapted for offline use
          </p>
        </div>
        
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-orange-800/20 border-orange-700/50' : 'bg-orange-50 border-orange-200'} border`}>
          <p className={`text-sm ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
            This component will have the same functionality as the online version when complete.
          </p>
        </div>
      </div>
    </div>
  );
};

// All the missing offline components as stubs
export const OfflineLandingPage = () => <OfflineStub title="Landing Page" description="Hotel landing page" icon="fas fa-home" />;
export const OfflineReservationsPage = () => <OfflineStub title="Reservations" description="Manage room reservations" icon="fas fa-calendar" />;
export const OfflineGuestsPage = () => <OfflineStub title="Guests" description="Manage guest information" icon="fas fa-users" />;
export const OfflineTasksPage = () => <OfflineStub title="Tasks" description="Task management system" icon="fas fa-tasks" />;
export const OfflineBillingPage = () => <OfflineStub title="Billing" description="Billing and invoicing" icon="fas fa-file-invoice-dollar" />;
export const OfflineServicesPage = () => <OfflineStub title="Services" description="Hotel services management" icon="fas fa-wrench" />;
export const OfflineAdminAccessControl = () => <OfflineStub title="Admin Access Control" description="Administrator access management" icon="fas fa-user-shield" />;
export const OfflineManagerAccessControl = () => <OfflineStub title="Manager Access Control" description="Manager access management" icon="fas fa-user-shield" />;
export const OfflineTestAccessRequests = () => <OfflineStub title="Test Access Requests" description="Testing access requests" icon="fas fa-flask" />;
export const OfflineReportsPage = () => <OfflineStub title="Reports" description="Reporting and analytics" icon="fas fa-chart-bar" />;
export const OfflineRequestAccessPage = () => <OfflineStub title="Request Access" description="Access request form" icon="fas fa-key" />;
export const OfflineLoginPage = () => <OfflineStub title="Login" description="User authentication" icon="fas fa-sign-in-alt" />;
export const OfflineForgotPasswordPage = () => <OfflineStub title="Forgot Password" description="Password recovery" icon="fas fa-lock" />;
export const OfflineResetPasswordPage = () => <OfflineStub title="Reset Password" description="Password reset" icon="fas fa-lock-open" />;
export const OfflineNotFound = () => <OfflineStub title="404 Not Found" description="Page not found" icon="fas fa-exclamation-triangle" />;
export const OfflineRealAccountSetup = () => <OfflineStub title="Account Setup" description="Real account setup" icon="fas fa-user-plus" />;
export const OfflineStaffPage = () => <OfflineStub title="Staff" description="Staff management" icon="fas fa-user" />;
export const OfflineStaffTimeAttendancePage = () => <OfflineStub title="Time & Attendance" description="Staff time tracking" icon="fas fa-clock" />;
export const OfflineInventoryPage = () => <OfflineStub title="Inventory" description="Inventory management" icon="fas fa-box" />;
export const OfflineRestaurantPage = () => <OfflineStub title="Restaurant" description="Restaurant management" icon="fas fa-utensils" />;
export const OfflineConditionalProfileModal = () => <OfflineStub title="Profile" description="User profile" icon="fas fa-user-circle" />;
export const OfflineSettingsPage = () => <OfflineStub title="Settings" description="System settings" icon="fas fa-cog" />; 