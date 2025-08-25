import React, { useEffect, useState, useMemo } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useTheme } from '../context/ThemeContext';
import NewReservationModal from './NewReservationModal';
import ReservationsList from './ReservationsList';
import { useRoomReservation } from '../context/RoomReservationContext';
import '../styles/Reservations.css'; // Import new styles

const ReservationsPage = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { refreshData } = useRoomReservation();

  const handleAddReservation = (newReservation) => {
    refreshData(); // Refresh data after adding a new reservation
  };

  // Use a ref to avoid unnecessary refreshes
  const hasInitiallyLoaded = React.useRef(false);
  
  useEffect(() => {
    // Fetch reservations only once when component mounts
    if (!hasInitiallyLoaded.current) {
      refreshData();
      hasInitiallyLoaded.current = true;
    }
  }, [refreshData]);

  return (
    <div className={`reservations-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>  
      <Sidebar activeLink="Reservations" />
      
      <div className="reservations-content">
        <Navbar title="Reservations" />
        
        <div className="reservations-backdrop">
          <div className="reservations-glass-panel">
            <div className="reservations-header">
              <div className="reservations-title-container">
                <h2 className="reservations-title">
                  <span className="title-icon">
                    <i className="fas fa-calendar-check"></i>
                  </span>
                  <span className="title-text">Reservations Management</span>
                </h2>
                <p className="reservations-subtitle">Manage, monitor, and optimize your hotel reservations</p>
              </div>
              
              <button 
                className="new-reservation-button" 
                onClick={() => setIsModalOpen(true)}
              >
                <div className="button-glow"></div>
                <i className="fas fa-plus-circle"></i>
                <span>New Reservation</span>
              </button>
            </div>
            
            <div className="reservations-list-container">
              <ReservationsList key="reservation-list" />
            </div>
          </div>
        </div>
        
        <NewReservationModal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)} onAddReservation={handleAddReservation} />
      </div>
    </div>
  );
};

export default React.memo(ReservationsPage);
