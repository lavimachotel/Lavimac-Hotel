import React, { createContext, useContext, useState } from 'react';

const OfflineInventoryContext = createContext();

export const useOfflineInventory = () => {
  const context = useContext(OfflineInventoryContext);
  if (!context) {
    throw new Error('useOfflineInventory must be used within an OfflineInventoryProvider');
  }
  return context;
};

export const OfflineInventoryProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const value = {
    inventory,
    loading,
    error,
    clearError: () => setError(null)
  };

  return (
    <OfflineInventoryContext.Provider value={value}>
      {children}
    </OfflineInventoryContext.Provider>
  );
}; 