import React from 'react';

const RoomTooltip = ({ room, position, isDarkMode = true }) => {
  if (!room) return null;
  
  // Calculate price display with Ghana Cedis
  const priceDisplay = 
    room.type === 'Standard' ? 'GH₵400' :
    room.type === 'Superior' ? 'GH₵700' :
    room.type === 'Executive' ? 'GH₵1,250' :
    `GH₵${room.price}`;
  
  // Get status color classes
  const getStatusClasses = (status) => {
    switch (status) {
      case 'Available':
        return isDarkMode
          ? 'bg-green-500/20 text-green-400 border-green-500/40'
          : 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'Occupied':
        return isDarkMode
          ? 'bg-red-500/20 text-red-400 border-red-500/40'
          : 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'Reserved':
        return isDarkMode
          ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
          : 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'Maintenance':
        return isDarkMode
          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
          : 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      default:
        return isDarkMode
          ? 'bg-gray-500/20 text-gray-400 border-gray-500/40'
          : 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

  // Get status color for the highlight bar
  const getStatusHighlight = (status) => {
    switch (status) {
      case 'Available':
        return 'from-green-500 to-emerald-500';
      case 'Occupied':
        return 'from-red-500 to-pink-500';
      case 'Reserved':
        return 'from-blue-500 to-indigo-500';
      case 'Maintenance':
        return 'from-amber-500 to-yellow-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };
  
  return (
    <div 
      className={`fixed z-50 p-3.5 rounded-xl shadow-xl border backdrop-blur-md ${
        isDarkMode 
          ? 'bg-slate-800/80 text-white border-slate-700/60' 
          : 'bg-white/80 text-gray-800 border-gray-200/60'
      } overflow-hidden`}
      style={{ 
        left: `${position.x + 10}px`, 
        top: `${position.y + 10}px`,
        minWidth: '280px',
        maxWidth: '320px',
        backdropFilter: 'blur(8px)'
      }}
    >
      {/* Status color bar */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${getStatusHighlight(room.status)}`}></div>
      
      <div className="text-lg font-bold mb-3 flex items-center mt-1.5">
        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
          room.status === 'Available' ? isDarkMode ? 'bg-green-400' : 'bg-green-600' : 
          room.status === 'Occupied' ? isDarkMode ? 'bg-red-400' : 'bg-red-600' :
          room.status === 'Reserved' ? isDarkMode ? 'bg-blue-400' : 'bg-blue-600' : 
          isDarkMode ? 'bg-amber-400' : 'bg-amber-600'
        }`}></span>
        <span className={`${isDarkMode ? 'bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300' : ''}`}>
          {room.name || room.room_number}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Type:</div>
        <div className="font-medium">{room.type}</div>
        
        <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status:</div>
        <div>
          <span className={`px-2 py-0.5 rounded-md text-xs ${getStatusClasses(room.status)} border`}>
            {room.status}
          </span>
        </div>
        
        <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Price:</div>
        <div className={`font-medium ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{priceDisplay}</div>
        
        {room.capacity && (
          <>
            <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Capacity:</div>
            <div className="font-medium">{room.capacity} {room.capacity === 1 ? 'Person' : 'People'}</div>
          </>
        )}
      </div>
      
      {room.amenities && room.amenities.length > 0 && (
        <div className="mt-3.5">
          <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-1.5 text-xs uppercase tracking-wider`}>Amenities:</div>
          <div className="flex flex-wrap gap-1.5">
            {room.amenities.map((amenity, index) => (
              <span key={index} className={`px-2 py-1 text-xs rounded-lg border ${
                isDarkMode 
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' 
                  : 'bg-blue-500/5 text-blue-600 border-blue-500/20'
              }`}>
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {room.guest && (
        <div className={`mt-3.5 p-3 rounded-lg border ${
          isDarkMode 
            ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30' 
            : 'bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border-indigo-500/20'
        }`}>
          <p className={`text-sm font-medium flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <i className={`fas fa-user ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} mr-2.5`}></i>
            {room.guest}
          </p>
          {room.checkIn && (
            <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mt-2 flex items-center`}>
              <i className={`fas fa-sign-in-alt ${isDarkMode ? 'text-green-400' : 'text-green-500'} mr-2`}></i>
              Check-in: {room.checkIn}
            </p>
          )}
          {room.checkOut && (
            <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mt-1.5 flex items-center`}>
              <i className={`fas fa-sign-out-alt ${isDarkMode ? 'text-red-400' : 'text-red-500'} mr-2`}></i>
              Check-out: {room.checkOut}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomTooltip; 