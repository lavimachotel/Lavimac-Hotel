import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import ThemeToggle from '../components/ThemeToggle';
import supabase from '../supabaseClient';
import { toast } from 'react-hot-toast';
// Import debug utilities
import '../debug_login';

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, setCurrentUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      redirectBasedOnRole(user.role);
    }
  }, [user]);

  const redirectBasedOnRole = (role) => {
    if (role === 'admin') {
      navigate('/admin/access-control');
    } else if (role === 'manager') {
      navigate('/manager/access-control');
    } else {
      navigate('/dashboard');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Enhanced logging
    console.log(`Attempting to login with email: ${formData.email}`);
    
    try {
      // Try regular Supabase auth
      console.log("Attempting Supabase auth login...");
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        console.error("Auth error details:", authError);
        throw authError;
      }

      console.log("Login successful, user ID:", data.user.id);

      // If login is successful, get user profile data
      console.log("Fetching user profile...");
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        throw profileError;
      }

      console.log("Profile data retrieved:", profileData);

      // Combine auth and profile data
      setCurrentUser({
        id: data.user.id,
        email: data.user.email,
        role: profileData.role || 'staff',
        fullName: profileData.full_name,
        position: profileData.position,
        department: profileData.department,
        contactNumber: profileData.contact_number,
        permissions: profileData.permissions || [],
        avatar_url: profileData.avatar_url
      });

      toast.success('Login successful!');
      redirectBasedOnRole(profileData.role || 'staff');
      
    } catch (err) {
      console.error('Login error:', err);
      
      // Enhanced error output
      if (err.message === 'Invalid login credentials') {
        console.log('This typically means either:');
        console.log('1. Password is incorrect');
        console.log('2. User email is not confirmed');
        console.log('3. User does not exist in Supabase Auth');
      }
      
      setError(err.message || 'Invalid email or password');
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B101E] overflow-hidden relative">
      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 -left-20 w-72 h-72 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-0 -right-20 w-72 h-72 bg-blue-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-20 w-72 h-72 bg-pink-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
        <div className="absolute -bottom-20 right-20 w-72 h-72 bg-indigo-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-6000"></div>
      </div>
      
      {/* Hexagonal grid background pattern */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg id='hexagons' fill='%239C92AC' fill-opacity='0.15' fill-rule='nonzero'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>
      
      {/* Theme toggle */}
      <div className="absolute top-4 left-4 z-10">
        <ThemeToggle className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white shadow-lg rounded-full p-2" />
      </div>
      
      {/* Main content */}
      <div className="max-w-md w-full z-10 p-4">
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 bg-clip-text text-transparent mb-3 relative z-10">
              Welcome Back
            </h1>
            <div className="absolute -inset-1 blur-xl bg-gradient-to-r from-blue-400/20 via-purple-500/20 to-indigo-400/20 rounded-lg z-0"></div>
          </div>
          <p className="text-lg text-gray-300">
            Sign in to access the hotel management system
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 backdrop-blur-md border-l-4 border-red-500 text-red-200 rounded-md shadow-lg animate-fadeIn">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Login card with glowing border effect */}
        <div className="relative group">
          {/* Glowing border effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-1000 group-hover:duration-300"></div>
          
          <div className="relative backdrop-blur-xl bg-white/10 shadow-2xl rounded-2xl p-8 border border-white/20 transition-all duration-300">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-blue-400 rounded-tl-2xl"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-purple-400 rounded-tr-2xl"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-purple-400 rounded-bl-2xl"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-blue-400 rounded-br-2xl"></div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-200 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  Email Address
                </label>
                <div className="relative group">
                  {/* Input highlight effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg opacity-0 group-focus-within:opacity-50 transition duration-300 blur"></div>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-400 transition-colors duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 text-white bg-white/5 border border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                      placeholder="you@example.com"
                      required
                      disabled={isLoading}
                    />
                    {/* Animated typing cursor effect for email field */}
                    <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-0.5 bg-blue-400 opacity-0 ${formData.email.length === 0 ? 'animate-pulse' : ''}`}></div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-200 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Password
                </label>
                <div className="relative group">
                  {/* Input highlight effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg opacity-0 group-focus-within:opacity-50 transition duration-300 blur"></div>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-400 transition-colors duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-10 py-3 text-white bg-white/5 border border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  to="/landing"
                  className="text-sm text-blue-300 hover:text-blue-400 transition-all duration-200 relative group"
                >
                  Back to Home
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-300 hover:text-blue-400 transition-all duration-200 relative group"
                >
                  Forgot password?
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </div>

              <button
                type="submit"
                className={`w-full flex justify-center items-center py-3 px-4 rounded-lg text-sm font-medium text-white transition-all duration-300 relative group overflow-hidden ${
                  isLoading 
                  ? 'opacity-70 cursor-not-allowed bg-blue-700' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg hover:shadow-blue-500/30'
                }`}
                disabled={isLoading}
              >
                {/* Button background animation */}
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></span>
                
                <span className="relative">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline-block" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      Sign In
                    </>
                  )}
                </span>
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-700/50">
              <div className="text-center">
                <p className="text-sm text-gray-300">
                  Don't have an account?{' '}
                  <Link
                    to="/request-access"
                    className="font-medium text-blue-300 hover:text-blue-400 transition-all duration-200 relative group"
                  >
                    Request Access
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-8 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Hotel Management System • All rights reserved | Developed by Ecstasy Geospatial Services</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 