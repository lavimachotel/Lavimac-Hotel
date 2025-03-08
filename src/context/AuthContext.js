import React, { createContext, useState, useContext } from 'react';
import { supabase } from '../supabaseClient'; // Correct import path
import { useHistory } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const history = useHistory();

    const [user, setUser] = useState(null);

    const signup = async (email, password) => {
        const { user, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setUser(user);
        return 'Sign up successful! Please log in.';
    };

    const login = async (email, password) => {
        const { user, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setUser(user);
        history.push('/dashboard'); // Redirect to dashboard
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
