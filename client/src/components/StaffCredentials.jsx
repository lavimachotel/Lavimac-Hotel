import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserCredentials } from '../services/userService';
import { useUser } from '../context/UserContext';
import supabase from '../supabaseClient';

const StaffCredentials = () => {
  const { user } = useUser();
  const [credentials, setCredentials] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchCredentials = async () => {
      setIsLoading(true);
      try {
        const result = await getUserCredentials();
        if (result.success) {
          setCredentials(result.data);
        } else {
          setError(result.error || 'Failed to fetch credentials');
        }
      } catch (err) {
        console.error('Error fetching credentials:', err);
        setError('An error occurred while fetching your credentials');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchCredentials();
    }
  }, [user]);

  // Mark credentials as used when viewed
  useEffect(() => {
    const markAsUsed = async () => {
      if (credentials && !credentials.is_used) {
        try {
          await supabase
            .from('staff_credentials')
            .update({ is_used: true })
            .eq('id', credentials.id);
        } catch (err) {
          console.error('Error marking credentials as used:', err);
        }
      }
    };

    if (credentials) {
      markAsUsed();
    }
  }, [credentials]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="dark:text-white light:text-gray-900">Loading credentials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
        <div className="mt-4 text-center">
          <Link to="/dashboard" className="text-blue-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!credentials) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="dark:text-white light:text-gray-900">No credentials found for your account.</p>
        <div className="mt-4">
          <Link to="/dashboard" className="text-blue-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-blue-600 dark:bg-blue-800">
          <h2 className="text-xl text-white font-bold">Your Login Credentials</h2>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <p className="text-sm dark:text-gray-400 light:text-gray-500 mb-2">
              Please save these credentials. You will need them to log in.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-1">
              Email/Username
            </label>
            <div className="flex">
              <input
                type="text"
                value={credentials.email}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded border dark:border-gray-600 dark:text-white light:text-gray-900"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(credentials.email);
                  alert('Email copied to clipboard');
                }}
                className="ml-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-1">
              Password
            </label>
            <div className="flex">
              <input
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded border dark:border-gray-600 dark:text-white light:text-gray-900"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="ml-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(credentials.password);
                  alert('Password copied to clipboard');
                }}
                className="ml-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <Link 
              to="/login" 
              className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Go to Login Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffCredentials; 