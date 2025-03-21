import React, { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

// Create a simple user context without authentication
const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Simple user management without authentication
    const setCurrentUser = (userData) => {
        if (userData) {
            setUser(userData);
        } else {
            setUser(null);
        }
    };
    
    // Simple navigation helper
    const navigateTo = (path) => {
        navigate(path);
    };
    
    // Set a demo user (for development only)
    const useDemoUser = () => {
        setUser({
            id: 'demo-user-id',
            email: 'demo@example.com',
            role: 'staff',
            fullName: 'Demo User',
            position: 'Demo Position',
            department: 'Development',
            contactNumber: '123-456-7890',
            avatar_url: null
        });
        
        navigate('/dashboard');
        return { success: true };
    };
    
    // Clear user data
    const clearUser = () => {
        setUser(null);
        navigate('/');
        return { success: true };
    };

    return (
        <UserContext.Provider value={{ 
            user, 
            loading,
            setLoading,
            setCurrentUser,
            navigateTo,
            useDemoUser,
            clearUser
        }}>
            {children}
        </UserContext.Provider>
    );
};

// Hook for easy context usage
export const useUser = () => useContext(UserContext); 