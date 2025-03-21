import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faUserCircle, faCog, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ title }) => {
    const { user, clearUser } = useUser();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    
    // Effect to update the avatar URL when user data changes
    useEffect(() => {
        if (user && user.avatar_url) {
            console.log('Setting avatar URL in Navbar:', user.avatar_url);
            setAvatarUrl(user.avatar_url);
        } else {
            setAvatarUrl('');
        }
    }, [user, user?.avatar_url]);
    
    const toggleUserMenu = () => {
        setIsUserMenuOpen(!isUserMenuOpen);
    };
    
    const navigateToSettings = () => {
        navigate('/settings');
        setIsUserMenuOpen(false);
    };
    
    const handleLogout = () => {
        clearUser();
        navigate('/');
    };
    
    // Close the menu when clicking outside
    useEffect(() => {
        const closeMenu = () => setIsUserMenuOpen(false);
        document.body.addEventListener('click', closeMenu);
        
        return () => {
            document.body.removeEventListener('click', closeMenu);
        };
    }, []);
    
    // Stop propagation to prevent menu from closing when clicking on it
    const handleMenuClick = (e) => {
        e.stopPropagation();
    };
    
    return (
        <header className={`${isDarkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} border-b mb-8`}>
            <div className="px-6 py-4 flex items-center justify-between">
                <h1 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{title}</h1>
                <div className="flex items-center space-x-4">
                    <button className="relative !rounded-button">
                        <FontAwesomeIcon icon={faBell} className={isDarkMode ? "text-gray-400" : "text-gray-600"} />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">3</span>
                    </button>
                    
                    <div className="relative">
                        {/* User avatar that opens dropdown menu */}
                        <div 
                            className="flex items-center cursor-pointer" 
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleUserMenu();
                            }}
                        >
                            {avatarUrl ? (
                                <img 
                                    src={avatarUrl} 
                                    className="w-8 h-8 rounded-full object-cover" 
                                    alt="Profile" 
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faUserCircle} className={`${isDarkMode ? "text-gray-600" : "text-gray-500"} text-lg`} />
                                </div>
                            )}
                            <span className={`ml-2 text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                                {user ? (user.fullName || user.email?.split('@')[0]) : 'Guest User'}
                            </span>
                        </div>
                        
                        {/* Dropdown menu */}
                        {isUserMenuOpen && (
                            <div 
                                className={`absolute right-0 mt-2 w-48 py-2 rounded-md shadow-lg z-50 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} ring-1 ring-black ring-opacity-5`}
                                onClick={handleMenuClick}
                            >
                                <button
                                    onClick={navigateToSettings}
                                    className={`block w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                                >
                                    <FontAwesomeIcon icon={faCog} className="mr-2" />
                                    Settings
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className={`block w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                                >
                                    <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar; 