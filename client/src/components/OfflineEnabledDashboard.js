import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import useOfflineDashboard from '../hooks/useOfflineDashboard';

const OfflineEnabledDashboard = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();
  
  // Offline dashboard data
  const {
    loading: offlineLoading,
    error: offlineError,
    isInitialized: offlineInitialized,
    rooms: offlineRooms,
    stats: offlineStats
  } = useOfflineDashboard();
  
  // Online/offline state management
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('online');
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('online');
      console.log('Connection restored - online mode available');
    };
    
    const handleOffline = () => {
      setConnectionStatus('offline');
      setIsOfflineMode(true);
      console.log('Connection lost - switching to offline mode');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-fallback to offline if needed
  useEffect(() => {
    if (connectionStatus === 'offline' || !navigator.onLine) {
      setIsOfflineMode(true);
    }
  }, [connectionStatus]);

  // Use offline data
  const rooms = offlineRooms || [];
  const loading = offlineLoading;
  const error = offlineError;
  
  // Statistics calculations
  const totalRooms = rooms.length || 0;
  const availableRooms = rooms.filter(room => room.status === 'Available').length || 0;
  const occupiedRooms = rooms.filter(room => room.status === 'Occupied').length || 0;
  const reservedRooms = rooms.filter(room => room.status === 'Reserved').length || 0;
  const occupancyRate = totalRooms > 0 ? Math.round(((occupiedRooms + reservedRooms) / totalRooms) * 100) : 0;

  const toggleOfflineMode = () => {
    setIsOfflineMode(!isOfflineMode);
  };

  // Status indicator
  const StatusIndicator = () => (
    <div className="flex items-center space-x-3 mb-4">
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
        isOfflineMode 
          ? (isDarkMode ? 'bg-amber-900' : 'bg-amber-100') 
          : (isDarkMode ? 'bg-green-900' : 'bg-green-100')
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isOfflineMode ? 'bg-amber-500' : 'bg-green-500'
        }`}></div>
        <span className={`text-sm font-medium ${
          isOfflineMode 
            ? (isDarkMode ? 'text-amber-200' : 'text-amber-800')
            : (isDarkMode ? 'text-green-200' : 'text-green-800')
        }`}>
          {isOfflineMode ? 'Offline Mode' : 'Online Mode'}
        </span>
      </div>
      
      {connectionStatus === 'online' && (
        <button
          onClick={toggleOfflineMode}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${
            isOfflineMode 
              ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
              : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')
          }`}
        >
          {isOfflineMode ? 'Switch to Online' : 'Switch to Offline'}
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
        <Sidebar activeLink="Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2">Loading offline dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !offlineInitialized) {
    return (
      <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
        <Sidebar activeLink="Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-500">
            <p>Error loading offline dashboard: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
      <Sidebar activeLink="Dashboard" />
      <div className="flex-1 overflow-auto relative">
        <div className={`absolute inset-0 ${isDarkMode ? 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-700/20 via-slate-900 to-slate-900' : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/10 via-sky-100 to-white'} -z-10`}></div>
        <div className="p-8 relative z-10">
          <div className="max-w-[1440px] mx-auto">
            <Navbar title="Dashboard" />
            <StatusIndicator />

            {/* Statistics Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className={`${isDarkMode ? 'bg-slate-800/80' : 'bg-white/80'} backdrop-blur-md rounded-xl p-6 shadow-lg border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Rooms</p>
                    <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalRooms}</p>
                  </div>
                  <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                    <i className={`fas fa-building ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}></i>
                  </div>
                </div>
              </div>

              <div className={`${isDarkMode ? 'bg-slate-800/80' : 'bg-white/80'} backdrop-blur-md rounded-xl p-6 shadow-lg border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Available</p>
                    <p className={`text-3xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{availableRooms}</p>
                  </div>
                  <div className={`p-3 rounded-full ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                    <i className={`fas fa-check-circle ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}></i>
                  </div>
                </div>
              </div>

              <div className={`${isDarkMode ? 'bg-slate-800/80' : 'bg-white/80'} backdrop-blur-md rounded-xl p-6 shadow-lg border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Occupied</p>
                    <p className={`text-3xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{occupiedRooms}</p>
                  </div>
                  <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                    <i className={`fas fa-users ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}></i>
                  </div>
                </div>
              </div>

              <div className={`${isDarkMode ? 'bg-slate-800/80' : 'bg-white/80'} backdrop-blur-md rounded-xl p-6 shadow-lg border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Occupancy Rate</p>
                    <p className={`text-3xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{occupancyRate}%</p>
                  </div>
                  <div className={`p-3 rounded-full ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                    <i className={`fas fa-chart-pie ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <button onClick={() => navigate('/offline/rooms')} className={`bg-gradient-to-r ${isDarkMode ? 'from-blue-600 to-blue-800 border-blue-500/30' : 'from-blue-500 to-blue-700 border-blue-400/40'} text-white rounded-lg p-4 hover:from-blue-700 hover:to-blue-900 flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg border backdrop-blur-sm`}>
                <div className={`${isDarkMode ? 'bg-blue-500/30' : 'bg-blue-400/40'} p-2 rounded-lg mr-2`}>
                  <i className="fas fa-bed"></i>
                </div>
                <span>Manage Rooms</span>
              </button>
              <button onClick={() => navigate('/guests')} className={`bg-gradient-to-r ${isDarkMode ? 'from-green-600 to-green-800 border-green-500/30' : 'from-green-500 to-green-700 border-green-400/40'} text-white rounded-lg p-4 hover:from-green-700 hover:to-green-900 flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg border backdrop-blur-sm`}>
                <div className={`${isDarkMode ? 'bg-green-500/30' : 'bg-green-400/40'} p-2 rounded-lg mr-2`}>
                  <i className="fas fa-users"></i>
                </div>
                <span>Manage Guests</span>
              </button>
              <button onClick={() => navigate('/tasks')} className={`bg-gradient-to-r ${isDarkMode ? 'from-yellow-600 to-amber-800 border-yellow-500/30' : 'from-yellow-500 to-amber-700 border-yellow-400/40'} text-white rounded-lg p-4 hover:from-yellow-700 hover:to-amber-900 flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg border backdrop-blur-sm`}>
                <div className={`${isDarkMode ? 'bg-yellow-500/30' : 'bg-yellow-400/40'} p-2 rounded-lg mr-2`}>
                  <i className="fas fa-tasks"></i>
                </div>
                <span>View Tasks</span>
              </button>
            </div>

            {/* Room Overview */}
            <div className={`${isDarkMode ? 'bg-slate-800/80' : 'bg-white/80'} backdrop-blur-md rounded-xl p-6 shadow-lg border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center`}>
                <i className={`fas fa-building mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}></i>
                Room Overview
              </h3>
              
              <div className={`mt-3 text-sm text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                Offline Dashboard - Local Data ({rooms.length} rooms loaded)
              </div>

              {/* Room Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {rooms.map((room) => {
                  const getStatusColor = (status) => {
                    switch (status) {
                      case 'Available':
                        return isDarkMode ? 'bg-green-900/30 border-green-500/50' : 'bg-green-50 border-green-200';
                      case 'Occupied':
                        return isDarkMode ? 'bg-blue-900/30 border-blue-500/50' : 'bg-blue-50 border-blue-200';
                      case 'Reserved':
                        return isDarkMode ? 'bg-yellow-900/30 border-yellow-500/50' : 'bg-yellow-50 border-yellow-200';
                      default:
                        return isDarkMode ? 'bg-red-900/30 border-red-500/50' : 'bg-red-50 border-red-200';
                    }
                  };

                  const getStatusDot = (status) => {
                    switch (status) {
                      case 'Available': return 'bg-green-500';
                      case 'Occupied': return 'bg-blue-500';
                      case 'Reserved': return 'bg-yellow-500';
                      default: return 'bg-red-500';
                    }
                  };

                  return (
                    <div
                      key={room.id}
                      className={`relative p-4 rounded-xl border-2 h-24 flex flex-col justify-between ${getStatusColor(room.status)}`}
                    >
                      <div className={`absolute ${getStatusDot(room.status)} w-3 h-3 rounded-full bottom-3 right-3`}></div>
                      
                      <div className="flex justify-between items-start w-full">
                        <div className="flex flex-col items-start">
                          <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            {room.name || `Room ${room.room_number || room.id}`}
                          </span>
                          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {room.type || 'Standard'}
                          </span>
                        </div>
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {room.status}
                        </span>
                      </div>
                      
                      {room.guest && (
                        <div className={`flex items-center mt-1 px-2 py-1 rounded-md ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                          <i className={`fas fa-user text-xs mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}></i>
                          <span className="text-xs truncate max-w-full">
                            {room.guest}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {rooms.length === 0 && (
                <div className="text-center py-8">
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No rooms available. Check offline data initialization.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineEnabledDashboard; 