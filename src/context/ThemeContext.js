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
            
            // Check for user system preference
            const userMedia = window.matchMedia('(prefers-color-scheme: dark)');
            if (userMedia.matches) {
                return 'dark';
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
        const root = document.documentElement;
        
        if (theme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            
            // Additional class for custom CSS if needed
            document.body.style.backgroundColor = '#1a1a1a';
            document.body.style.color = '#ffffff';
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
            
            // Additional class for custom CSS if needed
            document.body.style.backgroundColor = '#f8fafc';
            document.body.style.color = '#334155';
        }
    }, [theme]);

    // Apply theme on initial load
    useEffect(() => {
        const initialTheme = getInitialTheme();
        
        // Initial theme setup
        if (initialTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
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