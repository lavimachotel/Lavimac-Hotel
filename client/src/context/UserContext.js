import React, { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

// Create a simple user context without authentication
const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Simple user management without authentication
    const setCurrentUser = (userData) => {
        console.log('UserContext: Setting current user data:', userData);
        setUser(userData);
    };
    
    // Simple navigation helper
    const navigateTo = (path) => {
        navigate(path);
    };
    
    // Logout user
    const logoutUser = () => {
        setCurrentUser(null);
        navigate('/landing');
    };

    // Login user
    const loginUser = (userData) => {
        console.log('Logging in user:', userData);
        setCurrentUser(userData);
        navigate('/dashboard');
    };

    // Error during login
    const loginError = (error) => {
        setError(error);
        setCurrentUser(null);
    };

    // Demo login (for development/testing)
    const demoLogin = (role = 'staff', department = 'Front Desk') => {
        const demoUser = {
            id: `demo-${role}-id`,
            email: `${role}@example.com`,
            role: role,
            department: department,
            fullName: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
            createdAt: new Date().toISOString()
        };
        setCurrentUser(demoUser);
        navigate('/dashboard');
    };

    // Demo logout
    const demoLogout = () => {
        setCurrentUser(null);
        navigate('/landing');
    };

    return (
        <UserContext.Provider value={{ 
            user,
            currentUser: user, // Add currentUser alias for backward compatibility
            loading,
            setLoading,
            setCurrentUser,
            navigateTo,
            logoutUser,
            loginUser,
            loginError,
            demoLogin,
            demoLogout,
            error
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}; 