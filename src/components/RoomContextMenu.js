import React, { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const RoomContextMenu = ({ 
  isVisible, 
  position, 
  onClose, 
  room, 
  onCheckIn, 
  onCheckOut, 
  onReserve, 
  onMaintenance, 
  onMarkAvailable 
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Close the menu when clicking outside
  useEffect(() => {
    if (!isVisible) return;
    
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isVisible, onClose]);
  
  // Prevent the default context menu
  useEffect(() => {
    if (!isVisible) return;
    
    const handleContextMenu = (e) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [isVisible]);
  
  if (!isVisible) return null;
  
  const menuStyle = {
    top: `${position.y}px`,
    left: `${position.x}px`,
  };
  
  return (
    <div 
      className={`fixed z-50 ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'} border rounded-md shadow-lg`}
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`p-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} font-medium`}>
        Room {room.id} - {room.status}
      </div>
      <div className="p-1">
        {room.status === 'Available' && (
          <>
            <button 
              className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white rounded"
              onClick={() => { onCheckIn(room.id); onClose(); }}
            >
              Check In
            </button>
            <button 
              className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white rounded"
              onClick={() => { onReserve(room.id); onClose(); }}
            >
              Reserve
            </button>
            <button 
              className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white rounded"
              onClick={() => { onMaintenance(room.id); onClose(); }}
            >
              Set to Maintenance
            </button>
          </>
        )}
        
        {room.status === 'Occupied' && (
          <button 
            className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white rounded"
            onClick={() => { onCheckOut(room.id); onClose(); }}
          >
            Check Out
          </button>
        )}
        
        {room.status === 'Reserved' && (
          <>
            <button 
              className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white rounded"
              onClick={() => { 
                // Convert to occupied
                onCheckIn(room.id); 
                onClose(); 
              }}
            >
              Check In Guest
            </button>
            <button 
              className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white rounded"
              onClick={() => { onCheckOut(room.id); onClose(); }}
            >
              Cancel Reservation
            </button>
          </>
        )}
        
        {room.status === 'Maintenance' && (
          <button 
            className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white rounded"
            onClick={() => { onMarkAvailable(room.id); onClose(); }}
          >
            Mark as Available
          </button>
        )}
        
        <button 
          className="w-full text-left px-3 py-2 hover:bg-blue-500 hover:text-white rounded"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default RoomContextMenu; 