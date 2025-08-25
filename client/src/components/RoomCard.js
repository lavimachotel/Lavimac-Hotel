import React from 'react';
import '../styles/RoomCard.css';

const RoomCard = ({ room }) => {
  // Safety check - if room is null or undefined, show error card
  if (!room) {
    return (
      <div className="room-card error">
        <div className="card-content">
          <h3>Error: Invalid Room Data</h3>
          <p>This room has missing or invalid data.</p>
        </div>
      </div>
    );
  }

  // Extract room properties with defaults for safety
  const {
    id = 'unknown',
    room_number = 'Unknown',
    type = 'Standard',
    status = 'Unknown',
    price = 0,
    capacity = 0,
    amenities = []
  } = room;

  // Determine card status class
  const getStatusClass = () => {
    switch (status) {
      case 'Available':
        return 'available';
      case 'Occupied':
        return 'occupied';
      case 'Reserved':
        return 'reserved';
      case 'Maintenance':
        return 'maintenance';
      default:
        return 'unknown';
    }
  };

  // Format price with GH₵ symbol and commas
  const formatPrice = (amount) => {
    return `GH₵ ${Number(amount).toLocaleString()}`;
  };

  return (
    <div className={`room-card ${getStatusClass()}`}>
      <div className="card-header">
        <h3>{room_number}</h3>
        <span className="room-status">{status}</span>
      </div>
      
      <div className="card-content">
        <div className="room-detail">
          <span className="label">Type:</span>
          <span className="value">{type}</span>
        </div>
        
        <div className="room-detail">
          <span className="label">Price:</span>
          <span className="value">{formatPrice(price)}</span>
        </div>
        
        <div className="room-detail">
          <span className="label">Capacity:</span>
          <span className="value">{capacity} {capacity === 1 ? 'Person' : 'People'}</span>
        </div>
        
        {Array.isArray(amenities) && amenities.length > 0 && (
          <div className="room-amenities">
            <span className="label">Amenities:</span>
            <div className="amenities-list">
              {amenities.map((amenity, index) => (
                <span key={index} className="amenity-tag">{amenity}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="card-actions">
        <button className="action-button view">View Details</button>
        
        {status === 'Available' && (
          <button className="action-button reserve">Reserve</button>
        )}
        
        {(status === 'Reserved' || status === 'Occupied') && (
          <button className="action-button checkout">Check-out</button>
        )}
        
        {status === 'Maintenance' && (
          <button className="action-button maintenance">Mark Available</button>
        )}
      </div>
    </div>
  );
};

export default RoomCard; 