import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const Home = () => {
    const navigate = useNavigate();
    const { user } = useUser();

    useEffect(() => {
        console.log('Home component: checking user state:', user ? 'authenticated' : 'not authenticated');
        
        // If user is already logged in, redirect to dashboard
        if (user) {
            console.log('User is authenticated, redirecting to dashboard');
            navigate('/dashboard');
        } else {
            // Otherwise redirect to landing page
            console.log('User is not authenticated, redirecting to landing page');
            navigate('/landing');
        }
    }, [user, navigate]);

    // This is just a loading screen while redirecting
    return (
        <div className="flex items-center justify-center min-h-screen p-5 bg-gray-100 min-w-screen dark:bg-gray-900 dark:text-white">
            <div className="flex flex-col items-center">
                <h1 className="text-3xl font-bold mb-4">Welcome to The Green Royal Hotel</h1>
                <div className="flex space-x-2 animate-pulse mt-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting you to your dashboard...</p>
            </div>
        </div>
    );
};

export default Home;
