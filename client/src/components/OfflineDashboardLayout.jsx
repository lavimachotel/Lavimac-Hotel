import React from 'react';
import OfflineNavbar from './OfflineNavbar';
import OfflineSidebar from './OfflineSidebar';
import { useTheme } from '../context/ThemeContext';

const OfflineDashboardLayout = ({ children, activeLink, title }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <OfflineNavbar title={title} />
      <div className="flex">
        <OfflineSidebar activeLink={activeLink} />
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default OfflineDashboardLayout; 