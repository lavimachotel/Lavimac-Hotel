import React, { useEffect, useRef } from 'react';

const RoomContextMenu = ({ position, room, onClose, onAction, isDarkMode = true }) => {
  const menuRef = useRef(null);
  
  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  // Add escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  // Prevent context menu on our context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!room) return null;
  
  return (
    <div
      ref={menuRef}
      className={`fixed z-50 w-64 rounded-xl shadow-xl backdrop-blur-md ${
        isDarkMode 
          ? 'bg-slate-800/80 border-slate-700/50 text-white' 
          : 'bg-white/80 border-gray-200/50 text-gray-800'
      } border overflow-hidden`}
      style={{ 
        top: position.y, 
        left: position.x,
        backdropFilter: 'blur(8px)',
        boxShadow: isDarkMode 
          ? '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(30, 58, 138, 0.1)' 
          : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(59, 130, 246, 0.1)'
      }}
      onContextMenu={handleContextMenu}
    >
      <div className={`${
        isDarkMode 
          ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-slate-700/50' 
          : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-gray-200/50'
      } px-4 py-3 border-b relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
        <div className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-600'} uppercase tracking-wider font-medium mb-0.5`}>{room.name || room.room_number}</div>
        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>{room.type || 'Standard'}</div>
      </div>
      
      <div className="p-1.5 space-y-0.5">
        {room.status === 'Available' && (
          <>
            <MenuButton 
              icon="fa-sign-in-alt" 
              label="Check In" 
              color="green" 
              onClick={() => onAction('checkIn', room.id)} 
              isDarkMode={isDarkMode}
            />
            <MenuButton 
              icon="fa-calendar-plus" 
              label="Make Reservation" 
              color="blue" 
              onClick={() => onAction('reserve', room.id)} 
              isDarkMode={isDarkMode}
            />
            <MenuButton 
              icon="fa-tools" 
              label="Set to Maintenance" 
              color="amber" 
              onClick={() => onAction('maintenance', room.id)} 
              isDarkMode={isDarkMode}
            />
          </>
        )}
        
        {room.status === 'Occupied' && (
          <>
            <MenuButton 
              icon="fa-sign-out-alt" 
              label="Check Out" 
              color="red"
              onClick={() => onAction('checkOut', room.id)} 
              isDarkMode={isDarkMode}
            />
            <MenuButton 
              icon="fa-file-invoice-dollar" 
              label="Generate Invoice" 
              color="green" 
              onClick={() => onAction('invoice', room.id)} 
              isDarkMode={isDarkMode}
            />
          </>
        )}
        
        {room.status === 'Reserved' && (
          <>
            <MenuButton 
              icon="fa-sign-in-alt" 
              label="Check In Guest" 
              color="green" 
              onClick={() => onAction('checkIn', room.id)} 
              isDarkMode={isDarkMode}
            />
            <MenuButton 
              icon="fa-calendar-times" 
              label="Cancel Reservation" 
              color="red" 
              onClick={() => onAction('cancel', room.id)} 
              isDarkMode={isDarkMode}
            />
          </>
        )}
        
        {room.status === 'Maintenance' && (
          <MenuButton 
            icon="fa-check-circle" 
            label="Mark as Available" 
            color="green" 
            onClick={() => onAction('available', room.id)} 
            isDarkMode={isDarkMode}
          />
        )}
        
        <div className={`border-t ${isDarkMode ? 'border-slate-700/40' : 'border-gray-200/60'} mt-1.5 pt-1.5`}>
          <MenuButton 
            icon="fa-info-circle" 
            label="View Details" 
            color="blue" 
            onClick={() => onAction('details', room.id)} 
            isDarkMode={isDarkMode}
          />
          <MenuButton 
            icon="fa-times" 
            label="Close Menu" 
            color="gray" 
            onClick={onClose} 
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  );
};

// Helper component for menu buttons
const MenuButton = ({ icon, label, color, onClick, isDarkMode = true }) => {
  // Get color classes
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return isDarkMode
          ? 'hover:bg-green-500/20 hover:text-green-300 group-hover:text-green-400 active:bg-green-500/30'
          : 'hover:bg-green-500/10 hover:text-green-600 group-hover:text-green-600 active:bg-green-500/20';
      case 'red':
        return isDarkMode
          ? 'hover:bg-red-500/20 hover:text-red-300 group-hover:text-red-400 active:bg-red-500/30'
          : 'hover:bg-red-500/10 hover:text-red-600 group-hover:text-red-600 active:bg-red-500/20';
      case 'blue':
        return isDarkMode
          ? 'hover:bg-blue-500/20 hover:text-blue-300 group-hover:text-blue-400 active:bg-blue-500/30'
          : 'hover:bg-blue-500/10 hover:text-blue-600 group-hover:text-blue-600 active:bg-blue-500/20';
      case 'amber':
        return isDarkMode
          ? 'hover:bg-amber-500/20 hover:text-amber-300 group-hover:text-amber-400 active:bg-amber-500/30'
          : 'hover:bg-amber-500/10 hover:text-amber-600 group-hover:text-amber-600 active:bg-amber-500/20';
      case 'purple':
        return isDarkMode
          ? 'hover:bg-purple-500/20 hover:text-purple-300 group-hover:text-purple-400 active:bg-purple-500/30'
          : 'hover:bg-purple-500/10 hover:text-purple-600 group-hover:text-purple-600 active:bg-purple-500/20';
      default:
        return isDarkMode
          ? 'hover:bg-gray-700 hover:text-white group-hover:text-white active:bg-gray-600'
          : 'hover:bg-gray-100 hover:text-gray-800 group-hover:text-gray-800 active:bg-gray-200';
    }
  };
  
  // Get icon color based on button color
  const getIconColor = () => {
    switch (color) {
      case 'green':
        return isDarkMode ? 'text-green-500/70' : 'text-green-500/70';
      case 'red':
        return isDarkMode ? 'text-red-500/70' : 'text-red-500/70';
      case 'blue':
        return isDarkMode ? 'text-blue-500/70' : 'text-blue-500/70';
      case 'amber':
        return isDarkMode ? 'text-amber-500/70' : 'text-amber-500/70';
      case 'purple':
        return isDarkMode ? 'text-purple-500/70' : 'text-purple-500/70';
      default:
        return isDarkMode ? 'text-slate-400' : 'text-slate-500';
    }
  };
  
  return (
    <button 
      className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center group transition-all duration-200 ${getColorClasses()}`}
      onClick={onClick}
    >
      <i className={`fas ${icon} w-6 ${getIconColor()} transition-colors duration-200`}></i>
      <span className="text-sm">{label}</span>
    </button>
  );
};

export default RoomContextMenu; 