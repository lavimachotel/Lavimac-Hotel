import React, { useState, useContext, useEffect } from 'react';
import { RoomReservationContext } from '../context/RoomReservationContext';
import RoomCard from '../components/RoomCard';
import '../styles/RoomsPage.css';

const RoomsPage = () => {
  const { getRooms, loading } = useContext(RoomReservationContext);
  const [rooms, setRooms] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    searchTerm: ''
  });
  const [sortBy, setSortBy] = useState({ field: 'room_number', direction: 'asc' });
  
  // Calculate room statistics
  const calculateRoomStats = (roomsData) => {
    console.log('Calculating room stats with:', roomsData);
    
    // Ensure we have a valid array of rooms
    if (!Array.isArray(roomsData)) {
      console.warn('roomsData is not an array:', roomsData);
      return {
        totalRooms: 0,
        availableRooms: 0,
        occupiedRooms: 0,
        reservedRooms: 0,
        maintenanceRooms: 0
      };
    }
    
    const totalRooms = roomsData.length;
    
    const availableRooms = roomsData.filter(room => 
      room && room.status === 'Available'
    ).length;
    
    const occupiedRooms = roomsData.filter(room => 
      room && room.status === 'Occupied'
    ).length;
    
    const reservedRooms = roomsData.filter(room => 
      room && room.status === 'Reserved'
    ).length;
    
    const maintenanceRooms = roomsData.filter(room => 
      room && room.status === 'Maintenance'
    ).length;
    
    return {
      totalRooms,
      availableRooms,
      occupiedRooms,
      reservedRooms,
      maintenanceRooms
    };
  };
  
  // Load and filter rooms
  useEffect(() => {
    console.log('RoomsPage: Fetching rooms with filters:', filters);
    const fetchedRooms = getRooms(filters, sortBy);
    console.log('RoomsPage: Received rooms:', fetchedRooms?.length || 0);
    setRooms(fetchedRooms || []);
  }, [filters, sortBy, getRooms]);
  
  // Room stats
  const roomStats = calculateRoomStats(rooms);
  
  return (
    <div className="rooms-page">
      <h1>Hotel Rooms</h1>
      
      {/* Debug info - can be removed in production */}
      <div className="debug-info" style={{ fontSize: '12px', color: '#666', margin: '10px 0', padding: '5px', backgroundColor: '#f5f5f5' }}>
        <p>Loading state: {loading ? 'true' : 'false'}</p>
        <p>Rooms count: {Array.isArray(rooms) ? rooms.length : 'not an array'}</p>
        <p>Current filters: {JSON.stringify(filters)}</p>
        <p>Sort by: {sortBy.field} ({sortBy.direction})</p>
      </div>
      
      {/* Room statistics */}
      <div className="room-statistics">
        <div className="stat-box">
          <h3>Total Rooms</h3>
          <p>{roomStats.totalRooms}</p>
        </div>
        <div className="stat-box available">
          <h3>Available</h3>
          <p>{roomStats.availableRooms}</p>
        </div>
        <div className="stat-box occupied">
          <h3>Occupied</h3>
          <p>{roomStats.occupiedRooms}</p>
        </div>
        <div className="stat-box reserved">
          <h3>Reserved</h3>
          <p>{roomStats.reservedRooms}</p>
        </div>
        <div className="stat-box maintenance">
          <h3>Maintenance</h3>
          <p>{roomStats.maintenanceRooms}</p>
        </div>
      </div>
      
      {/* Filters and search */}
      <div className="rooms-filter">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search rooms..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
          />
        </div>
        
        <div className="filter-controls">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Reserved">Reserved</option>
            <option value="Maintenance">Maintenance</option>
          </select>
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="Standard">Standard</option>
            <option value="Superior">Superior</option>
            <option value="Executive">Executive</option>
          </select>
          
          <select
            value={`${sortBy.field}-${sortBy.direction}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-');
              setSortBy({ field, direction });
            }}
          >
            <option value="room_number-asc">Room Number (A-Z)</option>
            <option value="room_number-desc">Room Number (Z-A)</option>
            <option value="price-asc">Price (Low to High)</option>
            <option value="price-desc">Price (High to Low)</option>
          </select>
        </div>
      </div>
      
      {/* Room cards */}
      <div className="rooms-grid">
        {loading ? (
          <div className="loading-message">Loading rooms...</div>
        ) : rooms.length > 0 ? (
          rooms.map((room) => (
            room ? <RoomCard key={room.id} room={room} /> : null
          ))
        ) : (
          <div className="no-rooms-message">
            <p>No rooms found matching your criteria.</p>
            <button onClick={() => setFilters({ status: '', type: '', searchTerm: '' })}>
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomsPage; 