import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCamera, faLock, faUser, faGlobe } from '@fortawesome/free-solid-svg-icons';
import OfflineSidebar from './OfflineSidebar';
import OfflineNavbar from './OfflineNavbar';
import { useTheme } from '../context/ThemeContext';
import { useOfflineUser } from '../context/OfflineUserContext';

const OfflineSettingsPage = () => {
  const { theme } = useTheme();
  const { user, updateUser } = useOfflineUser();
  const isDarkMode = theme === 'dark';
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [previewUrl, setPreviewUrl] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    avatar: null,
    language: 'English',
    timeZone: 'GMT+0',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12-hour',
    currency: 'GHS',
    notifications: {
      email: true,
      sms: false,
      browser: true,
      app: true
    },
    security: {
      twoFactor: false,
      sessionTimeout: '30 minutes',
      changePassword: false
    }
  });

  // Load user data and saved settings when component mounts
  useEffect(() => {
    if (user) {
      // Split full name into first and last name
      const nameParts = user.fullName ? user.fullName.split(' ') : ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Load saved preferences from localStorage
      const savedSettings = localStorage.getItem('offline_user_settings');
      const preferences = savedSettings ? JSON.parse(savedSettings) : {};
      
      setFormData({
        firstName,
        lastName,
        email: user.email || '',
        phone: user.contactNumber || '',
        role: user.role || '',
        avatar: null,
        language: preferences.language || 'English',
        timeZone: preferences.timeZone || 'GMT+0',
        dateFormat: preferences.dateFormat || 'MM/DD/YYYY',
        timeFormat: preferences.timeFormat || '12-hour',
        currency: preferences.currency || 'GHS',
        notifications: preferences.notifications || {
          email: true,
          sms: false,
          browser: true,
          app: true
        },
        security: preferences.security || {
          twoFactor: false,
          sessionTimeout: '30 minutes',
          changePassword: false
        }
      });
      
      if (user.avatar_url) {
        setPreviewUrl(user.avatar_url);
      }
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData({
        ...formData,
        [section]: {
          ...formData[section],
          [field]: type === 'checkbox' ? checked : value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, avatar: file });
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!user || !user.id) {
        throw new Error('User not authenticated');
      }

      // Create full name from first and last name
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      // Handle avatar upload if provided (store as base64 in localStorage for offline)
      let avatarUrl = user.avatar_url;
      if (formData.avatar) {
        avatarUrl = previewUrl; // Use the preview URL (base64) as the avatar URL
      }

      // Update user profile
      const updatedUser = {
        ...user,
        fullName,
        contactNumber: formData.phone,
        avatar_url: avatarUrl
      };

      // Save user preferences to localStorage
      const userSettings = {
        language: formData.language,
        timeZone: formData.timeZone,
        dateFormat: formData.dateFormat,
        timeFormat: formData.timeFormat,
        currency: formData.currency,
        notifications: formData.notifications,
        security: formData.security
      };
      
      localStorage.setItem('offline_user_settings', JSON.stringify(userSettings));
      
      // Update user in context
      await updateUser(updatedUser);

      setMessage({ 
        type: 'success', 
        text: 'Profile updated successfully!' 
      });
      
      // Clear the message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: `Error updating profile: ${error.message}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>
      <OfflineSidebar activeLink="Settings" />
      <div className="flex-1 overflow-auto">
        <OfflineNavbar title="Settings" />
        
        <div className="p-6">
          {/* Futuristic Header */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-3xl"></div>
            <div className="relative bg-white/10 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
                Settings - Offline Mode
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Manage your profile, preferences, notifications, and security settings</p>
            </div>
          </div>

          {/* Futuristic Tab Navigation */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-xl blur-2xl"></div>
            <div className="relative bg-white/5 dark:bg-gray-800/30 backdrop-blur-lg rounded-xl p-1 border border-white/10 dark:border-gray-700/30">
              <div className="flex flex-wrap space-x-1">
                {[
                  { id: 'profile', icon: faUser, label: 'Profile' },
                  { id: 'preferences', icon: faGlobe, label: 'Preferences' },
                  { id: 'notifications', icon: faBell, label: 'Notifications' },
                  { id: 'security', icon: faLock, label: 'Security' }
                ].map((tab) => (
                  <button 
                    key={tab.id}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-400 dark:text-indigo-300'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-white/5 dark:hover:bg-gray-700/10'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <FontAwesomeIcon icon={tab.icon} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
            
          {/* Content Area */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-2xl"></div>
            <div className="relative bg-white/5 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl p-6 border border-white/10 dark:border-gray-700/30 shadow-lg">
              <form onSubmit={handleSubmit}>
                <div className="p-6">
                  {/* Status message */}
                  {message.text && (
                    <div className={`mb-6 p-3 rounded-md ${
                      message.type === 'success' 
                        ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  {activeTab === 'profile' && (
                    <div>
                      <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Profile Settings</h3>
                      
                      {/* Profile Picture Upload */}
                      <div className="flex flex-col items-center mb-8">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-4 relative">
                          {previewUrl ? (
                            <img 
                              src={previewUrl} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-3xl font-bold">
                              {formData.firstName.charAt(0) || 'U'}
                            </div>
                          )}
                          <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-md">
                            <FontAwesomeIcon icon={faCamera} className="text-sm" />
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={handleFileChange}
                              accept="image/*"
                            />
                          </label>
                        </div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Click the camera icon to upload a profile picture
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>First Name</label>
                          <input 
                            type="text" 
                            name="firstName" 
                            value={formData.firstName} 
                            onChange={handleChange}
                            className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          />
                        </div>
                        <div>
                          <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Last Name</label>
                          <input 
                            type="text" 
                            name="lastName" 
                            value={formData.lastName} 
                            onChange={handleChange}
                            className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          />
                        </div>
                        <div>
                          <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Email</label>
                          <input 
                            type="email" 
                            name="email" 
                            value={formData.email}
                            disabled
                            className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'} border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-not-allowed`}
                          />
                          <p className="text-xs text-gray-500 mt-1">Email cannot be changed in offline mode</p>
                        </div>
                        <div>
                          <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Phone</label>
                          <input 
                            type="text" 
                            name="phone" 
                            value={formData.phone} 
                            onChange={handleChange}
                            className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          />
                        </div>
                        <div>
                          <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Role</label>
                          <input 
                            type="text" 
                            value={formData.role} 
                            disabled
                            className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'} border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-not-allowed`}
                          />
                          <p className="text-xs text-gray-500 mt-1">Role cannot be changed in offline mode</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'preferences' && (
                    <div>
                      <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Preferences</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Language</label>
                          <select 
                            name="language" 
                            value={formData.language} 
                            onChange={handleChange}
                            className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          >
                            <option value="English">English</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                            <option value="German">German</option>
                          </select>
                        </div>
                        <div>
                          <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Time Zone</label>
                          <select 
                            name="timeZone" 
                            value={formData.timeZone} 
                            onChange={handleChange}
                            className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          >
                            <option value="GMT+0">GMT+0 (London)</option>
                            <option value="GMT-5">GMT-5 (New York)</option>
                            <option value="GMT-8">GMT-8 (Los Angeles)</option>
                            <option value="GMT+1">GMT+1 (Paris)</option>
                            <option value="GMT+8">GMT+8 (Beijing)</option>
                          </select>
                        </div>
                        <div>
                          <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Date Format</label>
                          <select 
                            name="dateFormat" 
                            value={formData.dateFormat} 
                            onChange={handleChange}
                            className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          >
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                          </select>
                        </div>
                        <div>
                          <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Time Format</label>
                          <select 
                            name="timeFormat" 
                            value={formData.timeFormat} 
                            onChange={handleChange}
                            className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          >
                            <option value="12-hour">12-hour (AM/PM)</option>
                            <option value="24-hour">24-hour</option>
                          </select>
                        </div>
                        <div>
                          <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Currency</label>
                          <select 
                            name="currency" 
                            value={formData.currency} 
                            onChange={handleChange}
                            className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          >
                            <option value="GHS">GHS (GH₵)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="JPY">JPY (¥)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'notifications' && (
                    <div>
                      <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Notification Settings</h3>
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            id="email-notifications" 
                            name="notifications.email" 
                            checked={formData.notifications.email} 
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="email-notifications" className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Email Notifications</label>
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            id="sms-notifications" 
                            name="notifications.sms" 
                            checked={formData.notifications.sms} 
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="sms-notifications" className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>SMS Notifications</label>
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            id="browser-notifications" 
                            name="notifications.browser" 
                            checked={formData.notifications.browser} 
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="browser-notifications" className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Browser Notifications</label>
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            id="app-notifications" 
                            name="notifications.app" 
                            checked={formData.notifications.app} 
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="app-notifications" className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>In-App Notifications</label>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'security' && (
                    <div>
                      <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Security Settings</h3>
                      <div className="space-y-6">
                        <div>
                          <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Session Timeout</label>
                          <select 
                            name="security.sessionTimeout" 
                            value={formData.security.sessionTimeout} 
                            onChange={handleChange}
                            className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          >
                            <option value="15 minutes">15 minutes</option>
                            <option value="30 minutes">30 minutes</option>
                            <option value="1 hour">1 hour</option>
                            <option value="2 hours">2 hours</option>
                            <option value="4 hours">4 hours</option>
                          </select>
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            id="two-factor" 
                            name="security.twoFactor" 
                            checked={formData.security.twoFactor} 
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="two-factor" className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Enable Two-Factor Authentication (Offline mode)</label>
                        </div>
                        <div>
                          <button
                            type="button"
                            className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                            onClick={() => setFormData({...formData, security: {...formData.security, changePassword: true}})}
                          >
                            Change Password
                          </button>
                          
                          {formData.security.changePassword && (
                            <div className="mt-4 space-y-4">
                              <div>
                                <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Current Password</label>
                                <input 
                                  type="password" 
                                  className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                />
                              </div>
                              <div>
                                <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>New Password</label>
                                <input 
                                  type="password" 
                                  className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                />
                              </div>
                              <div>
                                <label className={`block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Confirm New Password</label>
                                <input 
                                  type="password" 
                                  className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className={`px-6 py-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className={`px-6 py-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md transition-colors`}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineSettingsPage; 