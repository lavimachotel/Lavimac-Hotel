import React from 'react';
import { useTheme } from '../context/ThemeContext';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, guestName }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg p-6 w-full max-w-md`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Confirm Deletion</h2>
          <button 
            onClick={onClose}
            className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'} text-xl font-bold`}
          >
            ×
          </button>
        </div>
        
        <div className="mb-6">
          <p>Are you sure you want to delete the guest record for <span className="font-semibold">{guestName}</span>?</p>
          <p className="mt-2 text-sm text-red-500">This action cannot be undone.</p>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button 
            onClick={onClose}
            className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal; 