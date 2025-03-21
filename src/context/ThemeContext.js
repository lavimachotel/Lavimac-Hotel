import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Check if user has a theme preference in localStorage
    const getInitialTheme = () => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                return savedTheme;
            }
        }
        return 'dark'; // Default to dark theme
    };

    const [theme, setTheme] = useState(getInitialTheme);

    // Update localStorage and apply theme classes when theme changes
    useEffect(() => {
        // Save to localStorage
        localStorage.setItem('theme', theme);
        
        // Apply theme classes
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    // Apply theme on initial load
    useEffect(() => {
        const initialTheme = getInitialTheme();
        if (initialTheme === 'dark') {
            document.body.classList.add('dark-mode');
            document.documentElement.classList.add('dark');
        } else {
            document.body.classList.add('light-mode');
            document.documentElement.classList.add('light');
        }
    }, []);

    // Toggle between light and dark themes
    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext); 