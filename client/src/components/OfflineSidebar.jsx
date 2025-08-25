import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, 
  faCalendar, 
  faBed, 
  faUsers, 
  faUser, 
  faCog, 
  faSignOutAlt, 
  faBars, 
  faTimes, 
  faBell, 
  faBellSlash, 
  faDoorOpen, 
  faDoorClosed,
  faUtensils,
  faClipboardList,
  faFileInvoiceDollar,
  faBox,
  faChartBar,
  faUserShield,
  faWrench,
  faSun,
  faMoon,
  faPlugCircleXmark
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useOfflineUser } from '../context/OfflineUserContext';
import { useOfflineRoomReservation } from '../context/OfflineRoomReservationContext';
import useOfflinePermission from '../hooks/useOfflinePermission';
import '../styles/Sidebar.css';

const OfflineSidebar = ({ activeLink }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logoutUser } = useOfflineUser();
  const { isShiftActive, endShift } = useOfflineRoomReservation();
  const { hasDepartmentAccess } = useOfflinePermission();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const currentUser = user;

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isStaff = currentUser?.role === 'staff';

  // Define all possible sidebar links with their icons
  const allSidebarLinks = [
    { name: 'Dashboard', path: '/offline/dashboard', icon: faHome },
    { name: 'Reservations', path: '/offline/reservations', icon: faCalendar },
    { name: 'Rooms', path: '/offline/rooms', icon: faBed },
    { name: 'Guests', path: '/offline/guests', icon: faUsers },
    { name: 'Staff', path: '/offline/staff', icon: faUser, show: isAdmin || isManager },
    { name: 'Tasks', path: '/offline/tasks', icon: faClipboardList },
    { name: 'Billing', path: '/offline/billing', icon: faFileInvoiceDollar },
    { name: 'Services', path: '/offline/services', icon: faWrench },
    { 
      name: 'Inventory', 
      path: '/offline/inventory', 
      icon: faBox, 
      show: isAdmin || isManager || 
            currentUser?.department === 'Housekeeping' || 
            currentUser?.department === 'Food & Beverage' 
    },
    { name: 'Restaurant', path: '/offline/restaurant', icon: faUtensils },
    { name: 'Reports', path: '/offline/reports', icon: faChartBar, show: isAdmin || isManager },
    { name: 'Settings', path: '/offline/settings', icon: faCog },
    { name: 'Access Control', path: '/offline/admin/access-control', icon: faUserShield, show: isAdmin },
    { name: 'Staff Access', path: '/offline/manager/access-control', icon: faUserShield, show: isManager }
  ];

  // Filter links based on user's department access
  const sidebarLinks = allSidebarLinks.filter(link => {
    if (link.show !== undefined) return link.show;
    return hasDepartmentAccess(link.name);
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/offline/');
  };

  return (
    <div className={`sidebar-container ${theme === 'dark' ? 'dark-mode' : 'light-mode'} ${sidebarOpen ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-backdrop"></div>
      <div className="sidebar-content">
        <div className="sidebar-header">
          <div className="header-content">
            <button 
              onClick={toggleSidebar} 
              className="toggle-button"
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <div className="button-glow"></div>
              <FontAwesomeIcon icon={sidebarOpen ? faTimes : faBars} />
            </button>
            {sidebarOpen && (
              <h2 className="sidebar-title">
                <span className="title-glow">
                  <FontAwesomeIcon icon={faPlugCircleXmark} className="mr-2 text-green-500" />
                  The Green Royal
                </span>
                <span className="text-xs text-green-400 block mt-1">Offline Mode</span>
              </h2>
            )}
          </div>
        </div>
        
        {/* Offline Status Indicator */}
        {sidebarOpen && (
          <div className="px-4 py-2 mb-4">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-green-800/20 border-green-700/50' : 'bg-green-50 border-green-200'} border text-center`}>
              <FontAwesomeIcon icon={faPlugCircleXmark} className="text-green-500 mb-1" />
              <p className={`text-xs ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                Working Offline
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-green-400' : 'text-green-600'} opacity-80`}>
                Data stored locally
              </p>
            </div>
          </div>
        )}
        
        <div className="sidebar-navigation">
          <nav>
            <ul className="nav-links">
              {sidebarLinks.map((link) => (
                <li key={link.name} className={location.pathname === link.path ? 'active' : ''}>
                  <a 
                    href="#" 
                    className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigation(link.path);
                    }}
                    data-name={link.name}
                  >
                    <div className="link-highlight"></div>
                    <div className="icon-container">
                      <FontAwesomeIcon icon={link.icon} />
                    </div>
                    {sidebarOpen && <span className="link-text">{link.name}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        
        <div className="sidebar-footer">
          <button 
            onClick={toggleTheme} 
            className="footer-button theme-toggle"
          >
            <div className="button-glow"></div>
            <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} className={sidebarOpen ? 'with-text' : ''} />
            {sidebarOpen && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          
          <button
            onClick={handleLogout}
            className="footer-button logout"
          >
            <div className="button-glow"></div>
            <FontAwesomeIcon icon={faSignOutAlt} className={sidebarOpen ? 'with-text' : ''} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfflineSidebar; 