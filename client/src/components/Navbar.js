import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faUserCircle, faCog, faSignOutAlt, faSearch, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ title }) => {
    const { user, logoutUser } = useUser();
    const { theme, toggleTheme } = useTheme();
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
        logoutUser();
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
        <header className={`${isDarkMode ? 'bg-gray-900/80' : 'bg-white/90'} backdrop-blur-md border-b mb-8 sticky top-0 z-40 ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/70'} transition-all duration-300`}>
            <div className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center">
                    <div className={`mr-3 flex items-center justify-center w-9 h-9 rounded-full ${isDarkMode ? 'bg-blue-500' : 'bg-blue-600'} text-white`}>
                        <FontAwesomeIcon icon={faShieldAlt} className="text-sm" />
                    </div>
                    <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center`}>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
                            {title}
                        </span>
                    </h1>
                </div>

                <div className={`hidden md:flex items-center mx-4 px-4 py-2 flex-1 max-w-md rounded-full ${isDarkMode ? 'bg-gray-800/70 text-gray-300' : 'bg-gray-100/80 text-gray-600'} border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
                    <FontAwesomeIcon icon={faSearch} className="text-gray-400 mr-2" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className={`bg-transparent border-none outline-none w-full text-sm ${isDarkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'}`}
                    />
                </div>
                
                <div className="flex items-center space-x-5">
                    {/* Theme toggle button */}
                    <button 
                        onClick={toggleTheme}
                        className={`w-10 h-5 rounded-full relative flex items-center ${isDarkMode ? 'bg-blue-700/30 border-blue-600/30' : 'bg-gray-200 border-gray-300'} border transition-colors duration-300`}
                    >
                        <span className={`w-4 h-4 rounded-full absolute transition-all duration-300 ${isDarkMode ? 'bg-blue-500 translate-x-5' : 'bg-white translate-x-1'}`}></span>
                    </button>
                    
                    {/* Notification button */}
                    <button className="relative group">
                        <div className={`p-2 rounded-full transition-all duration-300 ${isDarkMode ? 'group-hover:bg-gray-800' : 'group-hover:bg-gray-100'}`}>
                            <FontAwesomeIcon icon={faBell} className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-lg`} />
                            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-red-500/20">3</span>
                        </div>
                    </button>
                    
                    <div className="relative">
                        {/* User avatar that opens dropdown menu */}
                        <div 
                            className={`flex items-center cursor-pointer px-3 py-1.5 rounded-full transition-all duration-300 ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleUserMenu();
                            }}
                        >
                            {avatarUrl ? (
                                <img 
                                    src={avatarUrl} 
                                    className="w-8 h-8 rounded-full object-cover border-2 border-blue-500" 
                                    alt="Profile" 
                                />
                            ) : (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-blue-100'}`}>
                                    <FontAwesomeIcon icon={faUserCircle} className={`${isDarkMode ? "text-gray-300" : "text-blue-500"} text-lg`} />
                                </div>
                            )}
                            <span className={`ml-2 text-sm font-medium hidden md:block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {user ? (user.fullName || user.email?.split('@')[0]) : 'Guest User'}
                            </span>
                        </div>
                        
                        {/* Dropdown menu */}
                        {isUserMenuOpen && (
                            <div 
                                className={`absolute right-0 mt-2 w-52 py-2 rounded-xl shadow-lg shadow-blue-500/10 z-50 backdrop-blur-md ${isDarkMode ? 'bg-gray-800/95 text-white' : 'bg-white/95 text-gray-800'} ring-1 ${isDarkMode ? 'ring-gray-700' : 'ring-gray-200'} overflow-hidden border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                                onClick={handleMenuClick}
                            >
                                <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                    <p className="text-sm font-semibold">{user ? user.fullName : 'Guest User'}</p>
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {user ? user.email : 'guest@example.com'}
                                    </p>
                                </div>
                                <button
                                    onClick={navigateToSettings}
                                    className={`block w-full text-left px-4 py-3 text-sm transition-colors duration-150 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                                >
                                    <FontAwesomeIcon icon={faCog} className="mr-2" />
                                    Settings
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className={`block w-full text-left px-4 py-3 text-sm transition-colors duration-150 ${isDarkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-500'}`}
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