import React from 'react';
import { useTheme } from '../context/ThemeContext';

const RoomTooltip = ({ room, visible, position }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  if (!visible || !room) return null;
  
  return (
    <div 
      className={`absolute z-10 p-3 rounded-md shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
      style={{ 
        left: `${position.x + 10}px`, 
        top: `${position.y + 10}px`,
        minWidth: '200px'
      }}
    >
      <h4 className="font-semibold">Room {room.id}</h4>
      <p className="text-sm">{room.type} - ${room.price}/night</p>
      <p className={`text-sm font-medium ${
        room.status === 'Available' ? 'text-green-500' : 
        room.status === 'Occupied' ? 'text-red-500' : 
        room.status === 'Reserved' ? 'text-blue-500' :
        'text-yellow-500'
      }`}>
        {room.status}
      </p>
      {room.guest && (
        <>
          <p className="text-sm mt-1">Guest: {room.guest}</p>
          <p className="text-sm">Check-in: {room.checkIn}</p>
          <p className="text-sm">Check-out: {room.checkOut}</p>
        </>
      )}
    </div>
  );
};

export default RoomTooltip; 