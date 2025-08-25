import React, { createContext, useContext, useState } from 'react';

const OfflineRestaurantContext = createContext();

export const useOfflineRestaurant = () => {
  const context = useContext(OfflineRestaurantContext);
  if (!context) {
    throw new Error('useOfflineRestaurant must be used within an OfflineRestaurantProvider');
  }
  return context;
};

export const OfflineRestaurantProvider = ({ children }) => {
  const [restaurant, setRestaurant] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const value = {
    restaurant,
    loading,
    error,
    clearError: () => setError(null)
  };

  return (
    <OfflineRestaurantContext.Provider value={value}>
      {children}
    </OfflineRestaurantContext.Provider>
  );
}; 