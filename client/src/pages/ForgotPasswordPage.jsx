import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../supabaseClient';
import { toast } from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setIsSubmitted(true);
        toast.success('Password reset link sent to your email');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
      console.error('Reset password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Theme toggle in top right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-slate-900 to-black"></div>
      
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

      {/* Animated gradient blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="container max-w-md z-10 flex flex-col items-center">
        <div className="text-center mb-8">
          <div className="relative mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 inline-block relative z-10">
              Reset Your Password
            </h1>
            <div className="absolute -inset-1 blur-xl bg-gradient-to-r from-blue-400/20 via-purple-500/20 to-indigo-400/20 rounded-lg z-0"></div>
          </div>
          <p className="text-lg text-gray-300">
            {isSubmitted 
              ? "Check your email for the reset link"
              : "Enter your email to receive a password reset link"}
          </p>
        </div>

        {/* Password reset card with glowing border effect */}
        <div className="relative group w-full">
          {/* Glowing border effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-1000 group-hover:duration-300"></div>
          
          <div className="relative backdrop-blur-xl bg-white/10 shadow-2xl rounded-2xl p-8 border border-white/20 transition-all duration-300">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-blue-400 rounded-tl-2xl"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-purple-400 rounded-tr-2xl"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-purple-400 rounded-bl-2xl"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-blue-400 rounded-br-2xl"></div>

            {isSubmitted ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-green-500/20 border border-green-500/50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-200 mb-2">Email Sent Successfully</h3>
                <p className="text-gray-300 mb-6">
                  We've sent a password reset link to <span className="text-blue-400 font-medium">{email}</span>. 
                  Please check your inbox and follow the instructions.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Back to Login
                </Link>
              </div>
            ) : (
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 text-white bg-white/5 border border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        placeholder="you@example.com"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Link
                    to="/login"
                    className="text-sm text-blue-300 hover:text-blue-400 transition-all duration-200 relative group"
                  >
                    Back to Login
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
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline-block" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        Send Reset Link
                      </>
                    )}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
        
        <div className="text-center mt-8 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Hotel Management System • All rights reserved | Developed by Ecstasy Geospatial Services</p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage; 