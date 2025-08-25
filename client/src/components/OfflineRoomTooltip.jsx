import React from 'react';

const OfflineRoomTooltip = ({ room, position, isDarkMode }) => {
  if (!room) return null;

  return (
    <div 
      className={`fixed z-50 p-3 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'} border`}
      style={{
        left: position.x + 10,
        top: position.y - 10,
        pointerEvents: 'none'
      }}
    >
      <div className="text-sm">
        <p className="font-semibold">Room {room.id}</p>
        <p>Type: {room.type}</p>
        <p>Status: {room.status}</p>
        <p>Price: ${room.price_per_night}/night</p>
        {room.guest_name && (
          <p>Guest: {room.guest_name}</p>
        )}
      </div>
    </div>
  );
};

export default OfflineRoomTooltip; 