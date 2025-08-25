import React, { createContext, useContext, useState, useEffect } from 'react';
import useOfflineDatabase from '../hooks/useOfflineDatabase';

const OfflineUserContext = createContext();

export const useOfflineUser = () => {
  const context = useContext(OfflineUserContext);
  if (!context) {
    throw new Error('useOfflineUser must be used within an OfflineUserProvider');
  }
  return context;
};

export const OfflineUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { isInitialized, getUserByEmail, createUser } = useOfflineDatabase();

  useEffect(() => {
    if (isInitialized) {
      initializeOfflineUser();
    }
  }, [isInitialized]);

  const initializeOfflineUser = async () => {
    try {
      console.log('🔄 Initializing offline user...');
      
      // Check for existing session in localStorage
      const savedUser = localStorage.getItem('offlineUser');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          console.log('✅ Found saved offline user:', parsedUser.email);
          setUser(parsedUser);
          setLoading(false);
          return;
        } catch (err) {
          console.error('Error parsing saved user:', err);
          localStorage.removeItem('offlineUser');
        }
      }

      // Create and automatically login default admin user for offline mode
      await createAndLoginDefaultUser();
    } catch (err) {
      console.error('Error initializing offline user:', err);
      setError('Failed to initialize offline user session');
      setLoading(false);
    }
  };

  const createAndLoginDefaultUser = async () => {
    try {
      const defaultUserEmail = 'admin@hotel.offline';
      
      // Try to get existing user first
      let existingUser = await getUserByEmail(defaultUserEmail);
      
      if (!existingUser) {
        console.log('🔄 Creating default offline user...');
        const defaultUserData = {
          email: defaultUserEmail,
          fullName: 'Hotel Administrator',
          role: 'admin',
          department: 'Management',
          avatar_url: ''
        };

        await createUser(defaultUserData);
        existingUser = await getUserByEmail(defaultUserEmail);
      }

      console.log('✅ Offline user ready:', existingUser.email);
      setUser(existingUser);
      localStorage.setItem('offlineUser', JSON.stringify(existingUser));
      
    } catch (err) {
      console.error('Error creating default user:', err);
      
      // Fallback: create user object without database storage
      const fallbackUser = {
        id: 1,
        email: 'admin@hotel.offline',
        fullName: 'Hotel Administrator',
        role: 'admin',
        department: 'Management',
        avatar_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('⚠️ Using fallback user due to database error');
      setUser(fallbackUser);
      localStorage.setItem('offlineUser', JSON.stringify(fallbackUser));
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      // In offline mode, we'll use simplified authentication
      // Check if user exists in the database
      const existingUser = await getUserByEmail(email);
      
      if (existingUser) {
        setUser(existingUser);
        localStorage.setItem('offlineUser', JSON.stringify(existingUser));
        return { user: existingUser, error: null };
      } else {
        // Create new user if doesn't exist (simplified offline registration)
        const newUser = {
          email,
          fullName: email.split('@')[0].replace(/[^a-zA-Z]/g, ' '),
          role: 'staff',
          department: 'General',
          avatar_url: ''
        };

        await createUser(newUser);
        const createdUser = await getUserByEmail(email);
        setUser(createdUser);
        localStorage.setItem('offlineUser', JSON.stringify(createdUser));
        return { user: createdUser, error: null };
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed');
      return { user: null, error: 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('offlineUser');
    // For offline mode, immediately recreate the default user
    setTimeout(() => {
      createAndLoginDefaultUser();
    }, 100);
  };

  const updateUserProfile = async (updates) => {
    try {
      if (!user) return { error: 'No user logged in' };

      const updatedUser = {
        ...user,
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Note: We would need to implement updateUser in the database service for full functionality
      
      setUser(updatedUser);
      localStorage.setItem('offlineUser', JSON.stringify(updatedUser));
      
      return { user: updatedUser, error: null };
    } catch (err) {
      console.error('Error updating profile:', err);
      return { user: null, error: 'Failed to update profile' };
    }
  };

  const value = {
    user,
    loading,
    error,
    loginUser,
    logoutUser,
    updateUserProfile,
    setUser,
    isAuthenticated: !!user
  };

  return (
    <OfflineUserContext.Provider value={value}>
      {children}
    </OfflineUserContext.Provider>
  );
}; 