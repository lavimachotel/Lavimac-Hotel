import React from 'react';

const OfflineRoomContextMenu = ({ room, position, onAction, onClose, isDarkMode }) => {
  if (!room) return null;

  const handleAction = (action) => {
    onAction(action, room.id);
    onClose();
  };

  return (
    <div 
      className={`fixed z-50 py-2 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}
      style={{
        left: position.x,
        top: position.y
      }}
    >
      <div className="min-w-40">
        {room.status === 'Available' && (
          <button
            onClick={() => handleAction('checkin')}
            className={`w-full text-left px-4 py-2 text-sm hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
          >
            Check In
          </button>
        )}
        {room.status === 'Occupied' && (
          <button
            onClick={() => handleAction('checkout')}
            className={`w-full text-left px-4 py-2 text-sm hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
          >
            Check Out
          </button>
        )}
        <button
          onClick={() => handleAction('maintenance')}
          className={`w-full text-left px-4 py-2 text-sm hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
        >
          Set Maintenance
        </button>
        <button
          onClick={() => handleAction('available')}
          className={`w-full text-left px-4 py-2 text-sm hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
        >
          Set Available
        </button>
      </div>
    </div>
  );
};

export default OfflineRoomContextMenu; 