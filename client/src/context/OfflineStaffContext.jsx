import React, { createContext, useContext, useState } from 'react';

const OfflineStaffContext = createContext();

export const useOfflineStaff = () => {
  const context = useContext(OfflineStaffContext);
  if (!context) {
    throw new Error('useOfflineStaff must be used within an OfflineStaffProvider');
  }
  return context;
};

export const OfflineStaffProvider = ({ children }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const value = {
    staff,
    loading,
    error,
    clearError: () => setError(null)
  };

  return (
    <OfflineStaffContext.Provider value={value}>
      {children}
    </OfflineStaffContext.Provider>
  );
}; 