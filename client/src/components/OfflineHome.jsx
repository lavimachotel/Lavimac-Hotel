import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const OfflineHome = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
      <div className="text-center p-8">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
            <i className="fas fa-plug-circle-xmark text-white text-3xl"></i>
          </div>
          <h1 className={`text-4xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            The Green Royal Hotel
          </h1>
          <p className={`text-xl mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Offline Management System
          </p>
          <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'} font-medium`}>
            🔴 Working in Offline Mode
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/offline/dashboard')}
            className="w-full max-w-md bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
          >
            <i className="fas fa-home mr-2"></i>
            Go to Dashboard
          </button>
          
          <button
            onClick={() => navigate('/offline/rooms')}
            className="w-full max-w-md bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg"
          >
            <i className="fas fa-bed mr-2"></i>
            Manage Rooms
          </button>
          
          <button
            onClick={() => navigate('/offline/reservations')}
            className="w-full max-w-md bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-6 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-lg"
          >
            <i className="fas fa-calendar mr-2"></i>
            View Reservations
          </button>
        </div>

        <div className={`mt-8 p-4 rounded-lg ${isDarkMode ? 'bg-green-800/20 border-green-700/50' : 'bg-green-50 border-green-200'} border`}>
          <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>
            <i className="fas fa-info-circle mr-2"></i>
            Offline Features
          </h3>
          <ul className={`text-sm space-y-1 ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
            <li>• Full room management and reservations</li>
            <li>• Guest check-in and check-out</li>
            <li>• Local data storage with encryption</li>
            <li>• All changes sync when back online</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OfflineHome; 