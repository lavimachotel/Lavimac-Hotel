import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';

const Sidebar = ({ activeLink }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const { user, clearUser } = useUser();

  // Check if user is an admin or a manager
  const isAdmin = user && (user.role === 'admin' || user.role === 'administrator');
  const isManager = user && (user.role === 'manager' || isAdmin); // Admin can also see manager pages
  const isStaff = user && !isAdmin && !isManager; // Regular staff member

  // Sidebar menu items
  const sidebarLinks = [
    { icon: 'fa-tachometer-alt', text: 'Dashboard', active: activeLink === 'Dashboard' },
    { icon: 'fa-calendar-check', text: 'Reservations', active: activeLink === 'Reservations' },
    { icon: 'fa-bed', text: 'Rooms', active: activeLink === 'Rooms' },
    { icon: 'fa-users', text: 'Guests', active: activeLink === 'Guests' },
    // Only show Staff link to managers and admins
    ...(isStaff ? [] : [{ icon: 'fa-user-tie', text: 'Staff', active: activeLink === 'Staff' }]),
    { icon: 'fa-clipboard-list', text: 'Tasks', active: activeLink === 'Tasks' },
    { icon: 'fa-dollar-sign', text: 'Billing', active: activeLink === 'Billing' },
    { icon: 'fa-concierge-bell', text: 'Services', active: activeLink === 'Services' },
    { icon: 'fa-chart-bar', text: 'Reports', active: activeLink === 'Reports' },
    { icon: 'fa-cog', text: 'Settings', active: activeLink === 'Settings' },
    // Manager links - visible to managers and admins
    ...(isManager ? [
      { icon: 'fa-user-plus', text: 'Staff Access', active: activeLink === 'Staff Access' },
    ] : []),
    // Admin links - only visible to admins
    ...(isAdmin ? [
      { icon: 'fa-user-shield', text: 'Access Control', active: activeLink === 'Access Control' },
      { icon: 'fa-database', text: 'Diagnostics', active: activeLink === 'Diagnostics' }
    ] : []),
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Handle navigation with special cases for admin routes
  const handleNavigation = (link) => {
    console.log('Navigating to:', link.text);
    
    switch(link.text) {
      case 'Dashboard':
        navigate('/dashboard');
        break;
      case 'Reservations':
        navigate('/reservations');
        break;
      case 'Rooms':
        navigate('/rooms');
        break;
      case 'Guests':
        navigate('/guests');
        break;
      case 'Staff':
        navigate('/staff');
        break;
      case 'Tasks':
        navigate('/tasks');
        break;
      case 'Billing':
        navigate('/billing');
        break;
      case 'Services':
        navigate('/services');
        break;
      case 'Reports':
        navigate('/reports');
        break;
      case 'Settings':
        navigate('/settings');
        break;
      case 'Access Control':
        navigate('/admin/access-control');
        break;
      case 'Staff Access':
        navigate('/manager/access-control');
        break;
      case 'Diagnostics':
        navigate('/diagnostics');
        break;
      default:
        // Convert route safely: lowercase and replace all spaces with hyphens
        const route = link.text.toLowerCase().replace(/\s+/g, '-');
        console.log('Default navigation to:', route);
        navigate(`/${route}`);
    }
  };

  // Handle logout
  const handleLogout = () => {
    clearUser();
    navigate('/');
  };

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} ${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex flex-col`}>  
      {/* Sidebar Header */}
      <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-300'}`}>
        {sidebarOpen && <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Mikjane Hotel</h2>}
        <button onClick={toggleSidebar} className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}>
          <i className={`fas ${sidebarOpen ? 'fa-chevron-left' : 'fa-chevron-right'}`}></i>
        </button>
      </div>
      
      {/* Sidebar Links */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2">
          <ul className="space-y-2">
            {sidebarLinks.map((link, index) => (
              <li key={index}>
                <a 
                  href="#" 
                  className={`flex items-center p-3 rounded-lg ${
                    link.active 
                      ? 'bg-blue-600 text-white' 
                      : theme === 'dark'
                        ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigation(link);
                  }}
                >
                  <i className={`fas ${link.icon} ${sidebarOpen ? 'mr-3' : 'mx-auto'} text-xl`}></i>
                  {sidebarOpen && <span>{link.text}</span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      
      {/* Sidebar Footer */}
      <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-300'}`}>
        {/* End Shift Button - only for staff */}
        {isStaff && (
          <button 
            onClick={() => navigate('/staff/time-attendance', { state: { clockType: 'out' } })}
            className={`flex items-center w-full p-2 mb-2 rounded-lg pulse-button ${
              theme === 'dark'
                ? 'bg-red-700 hover:bg-red-800 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            <i className={`fas fa-clock ${sidebarOpen ? 'mr-3' : 'mx-auto'} text-xl`}></i>
            {sidebarOpen && <span>End Shift</span>}
          </button>
        )}
        
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme} 
          className={`flex items-center w-full p-2 mb-2 rounded-lg ${
            theme === 'dark'
              ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
          }`}
        >
          <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} ${sidebarOpen ? 'mr-3' : 'mx-auto'} text-xl`}></i>
          {sidebarOpen && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`flex items-center w-full p-2 rounded-lg ${
            theme === 'dark'
              ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
          }`}
        >
          <i className={`fas fa-sign-out-alt ${sidebarOpen ? 'mr-3' : 'mx-auto'} text-xl`}></i>
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;