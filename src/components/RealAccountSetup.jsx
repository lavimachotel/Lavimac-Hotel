import React, { useState } from 'react';
import { createRealAdminAccount, createRealManagerAccount } from '../utils/setupRealAccounts';

const RealAccountSetup = () => {
  const [activeTab, setActiveTab] = useState('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  const [adminForm, setAdminForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    contactNumber: ''
  });
  
  const [managerForm, setManagerForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    contactNumber: ''
  });
  
  const handleAdminFormChange = (e) => {
    const { name, value } = e.target;
    setAdminForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleManagerFormChange = (e) => {
    const { name, value } = e.target;
    setManagerForm(prev => ({ ...prev, [name]: value }));
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };
  
  const validateForm = (form) => {
    if (!form.email || !form.password || !form.confirmPassword || !form.fullName) {
      setMessage({ text: 'Please fill in all required fields', type: 'error' });
      return false;
    }
    
    if (form.password !== form.confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      return false;
    }
    
    if (form.password.length < 8) {
      setMessage({ text: 'Password must be at least 8 characters long', type: 'error' });
      return false;
    }
    
    return true;
  };
  
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    
    if (!validateForm(adminForm)) return;
    
    setIsLoading(true);
    
    try {
      const result = await createRealAdminAccount(adminForm);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setMessage({ text: `Admin account (${result.user.email}) created successfully!`, type: 'success' });
      
      // Reset form
      setAdminForm({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        contactNumber: ''
      });
      
    } catch (error) {
      console.error('Error creating admin account:', error);
      setMessage({ text: error.message || 'Failed to create admin account', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateManager = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    
    if (!validateForm(managerForm)) return;
    
    setIsLoading(true);
    
    try {
      const result = await createRealManagerAccount(managerForm);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setMessage({ text: `Manager account (${result.user.email}) created successfully!`, type: 'success' });
      
      // Reset form
      setManagerForm({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        contactNumber: ''
      });
      
    } catch (error) {
      console.error('Error creating manager account:', error);
      setMessage({ text: error.message || 'Failed to create manager account', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="p-6 rounded-xl shadow-lg border dark:bg-gray-800 dark:border-gray-700 light:bg-white light:border-gray-200">
        <h1 className="text-2xl font-bold mb-4 dark:text-white light:text-gray-900">Create Real Accounts</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          Create real admin and manager accounts with proper Supabase authentication.
        </p>
        
        {message.text && (
          <div className={`p-4 mb-6 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-400' : 'bg-red-100 text-red-700 border border-red-400'}`}>
            {message.text}
          </div>
        )}
        
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'admin' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('admin')}
          >
            Admin Account
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'manager' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('manager')}
          >
            Manager Account
          </button>
        </div>
        
        {activeTab === 'admin' ? (
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="admin-email"
                name="email"
                value={adminForm.email}
                onChange={handleAdminFormChange}
                className="w-full px-4 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 border"
                placeholder="admin@example.com"
                required
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="admin-fullName" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="admin-fullName"
                name="fullName"
                value={adminForm.fullName}
                onChange={handleAdminFormChange}
                className="w-full px-4 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 border"
                placeholder="Admin User"
                required
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="admin-contactNumber" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-1">
                Contact Number (Optional)
              </label>
              <input
                type="text"
                id="admin-contactNumber"
                name="contactNumber"
                value={adminForm.contactNumber}
                onChange={handleAdminFormChange}
                className="w-full px-4 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 border"
                placeholder="123-456-7890"
                disabled={isLoading}
              />
            </div>
            
            <div className="relative">
              <label htmlFor="admin-password" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="admin-password"
                  name="password"
                  value={adminForm.password}
                  onChange={handleAdminFormChange}
                  className="w-full px-4 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 border pr-10"
                  placeholder="••••••••"
                  minLength={8}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Password must be at least 8 characters long
              </p>
            </div>
            
            <div>
              <label htmlFor="admin-confirmPassword" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="admin-confirmPassword"
                name="confirmPassword"
                value={adminForm.confirmPassword}
                onChange={handleAdminFormChange}
                className="w-full px-4 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 border"
                placeholder="••••••••"
                minLength={8}
                required
                disabled={isLoading}
              />
            </div>
            
            <div>
              <button
                type="submit"
                className={`w-full mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? 'Creating Admin Account...' : 'Create Admin Account'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateManager} className="space-y-4">
            <div>
              <label htmlFor="manager-email" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="manager-email"
                name="email"
                value={managerForm.email}
                onChange={handleManagerFormChange}
                className="w-full px-4 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 border"
                placeholder="manager@example.com"
                required
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="manager-fullName" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="manager-fullName"
                name="fullName"
                value={managerForm.fullName}
                onChange={handleManagerFormChange}
                className="w-full px-4 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 border"
                placeholder="Manager User"
                required
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="manager-contactNumber" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-1">
                Contact Number (Optional)
              </label>
              <input
                type="text"
                id="manager-contactNumber"
                name="contactNumber"
                value={managerForm.contactNumber}
                onChange={handleManagerFormChange}
                className="w-full px-4 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 border"
                placeholder="123-456-7890"
                disabled={isLoading}
              />
            </div>
            
            <div className="relative">
              <label htmlFor="manager-password" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="manager-password"
                  name="password"
                  value={managerForm.password}
                  onChange={handleManagerFormChange}
                  className="w-full px-4 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 border pr-10"
                  placeholder="••••••••"
                  minLength={8}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Password must be at least 8 characters long
              </p>
            </div>
            
            <div>
              <label htmlFor="manager-confirmPassword" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="manager-confirmPassword"
                name="confirmPassword"
                value={managerForm.confirmPassword}
                onChange={handleManagerFormChange}
                className="w-full px-4 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 border"
                placeholder="••••••••"
                minLength={8}
                required
                disabled={isLoading}
              />
            </div>
            
            <div>
              <button
                type="submit"
                className={`w-full mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? 'Creating Manager Account...' : 'Create Manager Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RealAccountSetup; 