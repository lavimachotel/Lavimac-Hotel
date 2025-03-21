import React, { useEffect, useState } from 'react';
import * as echarts from 'echarts';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useTheme } from '../context/ThemeContext';
import NewReservationModal from './NewReservationModal';
import ReservationsList from './ReservationsList';

const ReservationsPage = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reservations, setReservations] = useState([]);

  const handleAddReservation = (newReservation) => {
    setReservations((prev) => [...prev, newReservation]);
  };

  const sidebarLinks = [
    { icon: 'fa-tachometer-alt', text: 'Dashboard' },
    { icon: 'fa-calendar-check', text: 'Reservations', active: true },
    { icon: 'fa-bed', text: 'Rooms' },
    { icon: 'fa-users', text: 'Guests' },
    { icon: 'fa-clipboard-list', text: 'Tasks' },
    { icon: 'fa-chart-line', text: 'Reports' },
    { icon: 'fa-dollar-sign', text: 'Billing' },
    { icon: 'fa-concierge-bell', text: 'Services' },
    { icon: 'fa-cog', text: 'Settings' },
  ];

  useEffect(() => {
    const handleResize = () => {
      window.removeEventListener('resize', handleResize);
    };
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>  
      <Sidebar activeLink="Reservations" />
      <div className="flex-1 overflow-auto">
        <Navbar title="Reservations" />
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 mb-6">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow-sm`}>  
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Current Reservations</h3>
                <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600" onClick={() => setIsModalOpen(true)}>New Reservation</button>
              </div>
              <ReservationsList reservations={reservations} />
            </div>
          </div>
          <NewReservationModal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)} onAddReservation={handleAddReservation} />
        </div>
      </div>
    </div>
  );
};

export default ReservationsPage;
