import React, { createContext, useContext, useState, useEffect } from 'react';
import useOfflineDatabase from '../hooks/useOfflineDatabase';

const OfflineGuestContext = createContext();

export const useOfflineGuests = () => {
  const context = useContext(OfflineGuestContext);
  if (!context) {
    throw new Error('useOfflineGuests must be used within an OfflineGuestProvider');
  }
  return context;
};

export const OfflineGuestProvider = ({ children }) => {
  const [guestList, setGuestList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    isInitialized,
    getGuests,
    createGuest,
    updateGuest,
    deleteGuest
  } = useOfflineDatabase();

  // Load guests when database is ready
  useEffect(() => {
    if (isInitialized) {
      loadGuests();
    }
  }, [isInitialized]);

  const loadGuests = async () => {
    try {
      setLoading(true);
      const guests = await getGuests();
      setGuestList(guests);
      setError(null);
    } catch (err) {
      console.error('Error loading guests:', err);
      setError('Failed to load guests');
    } finally {
      setLoading(false);
    }
  };

  const addGuest = async (guestData) => {
    try {
      setLoading(true);
      await createGuest(guestData);
      await loadGuests(); // Reload to get updated list
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Error adding guest:', err);
      setError('Failed to add guest');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const editGuest = async (guestId, updates) => {
    try {
      setLoading(true);
      await updateGuest(guestId, updates);
      await loadGuests(); // Reload to get updated list
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Error updating guest:', err);
      setError('Failed to update guest');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const removeGuest = async (guestId) => {
    try {
      setLoading(true);
      await deleteGuest(guestId);
      await loadGuests(); // Reload to get updated list
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Error deleting guest:', err);
      setError('Failed to delete guest');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getGuestById = (guestId) => {
    return guestList.find(guest => guest.id === parseInt(guestId));
  };

  const searchGuests = (searchTerm) => {
    if (!searchTerm) return guestList;
    
    const term = searchTerm.toLowerCase();
    return guestList.filter(guest => 
      guest.name?.toLowerCase().includes(term) ||
      guest.email?.toLowerCase().includes(term) ||
      guest.phone?.toLowerCase().includes(term)
    );
  };

  const value = {
    guestList,
    loading,
    error,
    addGuest,
    editGuest,
    removeGuest,
    getGuestById,
    searchGuests,
    refreshGuests: loadGuests,
    clearError: () => setError(null)
  };

  return (
    <OfflineGuestContext.Provider value={value}>
      {children}
    </OfflineGuestContext.Provider>
  );
}; 