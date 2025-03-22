import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Create a simple user context without authentication
const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Initialize user state from localStorage if available
    useEffect(() => {
        const storedUser = localStorage.getItem('mikjane_hotel_user');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                console.log('Restored user session from localStorage:', userData.email);
                setUser(userData);
            } catch (error) {
                console.error('Error parsing stored user data:', error);
                localStorage.removeItem('mikjane_hotel_user');
            }
        }
        setLoading(false);
    }, []);
    
    // Simple user management without authentication
    const setCurrentUser = (userData) => {
        console.log('UserContext: Setting current user data:', userData);
        if (userData) {
            setUser(userData);
            // Store user data in localStorage
            localStorage.setItem('mikjane_hotel_user', JSON.stringify(userData));
        } else {
            setUser(null);
            // Remove user data from localStorage
            localStorage.removeItem('mikjane_hotel_user');
        }
    };
    
    // Simple navigation helper
    const navigateTo = (path) => {
        navigate(path);
    };
    
    // Set a demo user (for development only)
    const useDemoUser = () => {
        const demoUser = {
            id: 'demo-user-id',
            email: 'demo@example.com',
            role: 'staff',
            fullName: 'Demo User',
            position: 'Demo Position',
            department: 'Development',
            contactNumber: '123-456-7890',
            avatar_url: null
        };
        
        setUser(demoUser);
        localStorage.setItem('mikjane_hotel_user', JSON.stringify(demoUser));
        navigate('/dashboard');
        return { success: true };
    };
    
    // Clear user data
    const clearUser = () => {
        setUser(null);
        localStorage.removeItem('mikjane_hotel_user');
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