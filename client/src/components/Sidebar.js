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
  faMoon
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useRoomReservation } from '../context/RoomReservationContext';
import usePermission from '../hooks/usePermission';
import '../styles/Sidebar.css';

const Sidebar = ({ activeLink }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logoutUser } = useUser();
  const { isShiftActive, endShift } = useRoomReservation();
  const { hasDepartmentAccess } = usePermission();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [routeCache, setRouteCache] = useState({});

  const currentUser = user;

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isStaff = currentUser?.role === 'staff';

  // Define all possible sidebar links with their icons
  const allSidebarLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: faHome },
    { name: 'Reservations', path: '/reservations', icon: faCalendar },
    { name: 'Rooms', path: '/rooms', icon: faBed },
    { name: 'Guests', path: '/guests', icon: faUsers },
    { name: 'Staff', path: '/staff', icon: faUser, show: isAdmin || isManager },
    { name: 'Tasks', path: '/tasks', icon: faClipboardList },
    { name: 'Billing', path: '/billing', icon: faFileInvoiceDollar },
    { name: 'Services', path: '/services', icon: faWrench },
    { 
      name: 'Inventory', 
      path: '/inventory', 
      icon: faBox, 
      show: isAdmin || isManager || 
            currentUser?.department === 'Housekeeping' || 
            currentUser?.department === 'Food & Beverage' 
    },
    { name: 'Restaurant', path: '/restaurant', icon: faUtensils },
    { name: 'Reports', path: '/reports', icon: faChartBar, show: isAdmin || isManager },
    { name: 'Settings', path: '/settings', icon: faCog },
    { name: 'Access Control', path: '/admin/access-control', icon: faUserShield, show: isAdmin },
    { name: 'Staff Access', path: '/manager/access-control', icon: faUserShield, show: isManager }
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
    navigate('/');
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
                <span className="title-glow">The Green Royal</span>
              </h2>
            )}
          </div>
        </div>
        
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

export default Sidebar;