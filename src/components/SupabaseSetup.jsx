import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { checkSupabaseConnection, checkRequiredTables, createAdminUser } from '../utils/setupSupabase';
import ThemeToggle from './ThemeToggle';
import supabase, { 
  testTableAccess, 
  diagnoseRLSIssues 
} from '../supabaseClient';

const SupabaseSetup = () => {
  const [connectionStatus, setConnectionStatus] = useState({ checking: true });
  const [tablesStatus, setTablesStatus] = useState({ checking: true });
  const [adminForm, setAdminForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [adminCreationStatus, setAdminCreationStatus] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [diagnosisResults, setDiagnosisResults] = useState(null);
  const [tableAccessResults, setTableAccessResults] = useState({});
  const [authState, setAuthState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [userSession, setUserSession] = useState(null);

  useEffect(() => {
    const checkConnection = async () => {
      setConnectionStatus({ checking: true });
      const result = await checkSupabaseConnection();
      setConnectionStatus({ checking: false, ...result });
      
      if (result.success) {
        checkTables();
      }
    };
    
    const checkTables = async () => {
      setTablesStatus({ checking: true });
      const result = await checkRequiredTables();
      setTablesStatus({ checking: false, ...result });
    };
    
    checkConnection();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserSession(session);
      setAuthState({
        authenticated: !!session,
        expiresAt: session?.expires_at,
        user: session?.user,
      });
    };
    
    checkAuth();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session);
      setAuthState({
        authenticated: !!session,
        expiresAt: session?.expires_at,
        user: session?.user,
      });
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleAdminFormChange = (e) => {
    const { name, value } = e.target;
    setAdminForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    
    if (adminForm.password !== adminForm.confirmPassword) {
      setAdminCreationStatus({
        success: false,
        error: 'Passwords do not match'
      });
      return;
    }
    
    setAdminCreationStatus({ creating: true });
    const result = await createAdminUser(adminForm);
    setAdminCreationStatus(result);
    
    if (result.success) {
      // Clear form
      setAdminForm({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: ''
      });
    }
  };

  // Test access to a specific table
  const runTableAccessTest = async (tableName, operation) => {
    setIsLoading(true);
    try {
      const result = await testTableAccess(tableName, operation);
      setTableAccessResults((prev) => ({
        ...prev,
        [tableName]: {
          ...(prev[tableName] || {}),
          [operation]: result,
        },
      }));
    } catch (error) {
      console.error(`Error testing ${operation} on ${tableName}:`, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Run full diagnosis
  const runFullDiagnosis = async () => {
    setIsLoading(true);
    try {
      const results = await diagnoseRLSIssues();
      setDiagnosisResults(results);
    } catch (error) {
      console.error('Error running diagnosis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative dark:bg-gray-900 light:bg-gray-100">
      <div className="absolute bottom-4 left-4 z-10">
        <ThemeToggle className="bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 light:bg-gray-200 light:hover:bg-gray-300" />
      </div>
      
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold dark:text-white light:text-gray-900">Supabase Setup</h1>
          <p className="mt-2 text-lg dark:text-gray-300 light:text-gray-700">
            Configure your Supabase database for the Hotel Management System
          </p>
        </div>
        
        <div className="space-y-8">
          {/* Connection Status */}
          <div className="p-6 rounded-xl shadow-lg border dark:bg-gray-800 dark:border-gray-700 light:bg-white light:border-gray-200">
            <h2 className="text-xl font-semibold mb-4 dark:text-white light:text-gray-900">Connection Status</h2>
            
            {connectionStatus.checking ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <p className="dark:text-gray-300 light:text-gray-700">Checking connection...</p>
              </div>
            ) : connectionStatus.success ? (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                <strong className="font-bold">Connected!</strong>
                <span className="block sm:inline"> {connectionStatus.message}</span>
              </div>
            ) : (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <strong className="font-bold">Connection Error!</strong>
                <span className="block sm:inline"> {connectionStatus.error}</span>
                {connectionStatus.details && (
                  <p className="mt-2 text-sm">{connectionStatus.details}</p>
                )}
                <div className="mt-4">
                  <p className="text-sm">Please check your Supabase configuration:</p>
                  <ol className="list-decimal list-inside mt-2 text-sm">
                    <li>Make sure you&apos;ve set the correct URL and API key in your .env file</li>
                    <li>Verify that your Supabase project is up and running</li>
                    <li>Check your internet connection</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
          
          {/* Tables Status */}
          {!connectionStatus.checking && connectionStatus.success && (
            <div className="p-6 rounded-xl shadow-lg border dark:bg-gray-800 dark:border-gray-700 light:bg-white light:border-gray-200">
              <h2 className="text-xl font-semibold mb-4 dark:text-white light:text-gray-900">Database Tables</h2>
              
              {tablesStatus.checking ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <p className="dark:text-gray-300 light:text-gray-700">Checking tables...</p>
                </div>
              ) : tablesStatus.success ? (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                  <strong className="font-bold">Tables Ready!</strong>
                  <span className="block sm:inline"> All required tables exist in your database.</span>
                </div>
              ) : (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                  <strong className="font-bold">Missing Tables!</strong>
                  <span className="block sm:inline"> Some required tables are missing from your database.</span>
                  
                  <div className="mt-4">
                    <p className="text-sm">Table status:</p>
                    <ul className="mt-2 text-sm space-y-1">
                      {tablesStatus.tables && Object.entries(tablesStatus.tables).map(([table, status]) => (
                        <li key={table} className="flex items-center">
                          {status.exists ? (
                            <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          <span className={status.exists ? 'text-green-700' : 'text-red-700'}>
                            {table}: {status.exists ? 'Exists' : status.error}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm">To create the missing tables:</p>
                    <ol className="list-decimal list-inside mt-2 text-sm">
                      <li>Go to your Supabase dashboard</li>
                      <li>Navigate to the SQL Editor</li>
                      <li>Create a new query</li>
                      <li>Paste the contents of the <code>create_tables.sql</code> file</li>
                      <li>Run the query</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Create Admin User */}
          {!connectionStatus.checking && connectionStatus.success && !tablesStatus.checking && tablesStatus.success && (
            <div className="p-6 rounded-xl shadow-lg border dark:bg-gray-800 dark:border-gray-700 light:bg-white light:border-gray-200">
              <h2 className="text-xl font-semibold mb-4 dark:text-white light:text-gray-900">Create Admin User</h2>
              
              {adminCreationStatus && adminCreationStatus.success ? (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
                  <strong className="font-bold">Success!</strong>
                  <span className="block sm:inline"> Admin user created successfully.</span>
                </div>
              ) : null}
              
              {adminCreationStatus && !adminCreationStatus.success && !adminCreationStatus.creating ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> {adminCreationStatus.error}</span>
                  {adminCreationStatus.details && (
                    <p className="mt-2 text-sm">{adminCreationStatus.details}</p>
                  )}
                </div>
              ) : null}
              
              <form onSubmit={handleCreateAdmin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={adminForm.email}
                    onChange={handleAdminFormChange}
                    className="w-full px-4 py-3 rounded-lg dark:bg-black/50 dark:border-white/10 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="admin@example.com"
                    required
                    disabled={adminCreationStatus?.creating}
                  />
                </div>
                
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={adminForm.fullName}
                    onChange={handleAdminFormChange}
                    className="w-full px-4 py-3 rounded-lg dark:bg-black/50 dark:border-white/10 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Admin User"
                    required
                    disabled={adminCreationStatus?.creating}
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={adminForm.password}
                      onChange={handleAdminFormChange}
                      className="w-full px-4 py-3 rounded-lg dark:bg-black/50 dark:border-white/10 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      placeholder="Create a strong password"
                      minLength={8}
                      required
                      disabled={adminCreationStatus?.creating}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 dark:text-gray-400 light:text-gray-600 hover:text-gray-500"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={adminForm.confirmPassword}
                    onChange={handleAdminFormChange}
                    className="w-full px-4 py-3 rounded-lg dark:bg-black/50 dark:border-white/10 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Confirm your password"
                    minLength={8}
                    required
                    disabled={adminCreationStatus?.creating}
                  />
                </div>
                
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className={`px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-gray-900 light:focus:ring-offset-white transition-all duration-300 ${adminCreationStatus?.creating ? 'opacity-70 cursor-not-allowed' : ''}`}
                    disabled={adminCreationStatus?.creating}
                  >
                    {adminCreationStatus?.creating ? 'Creating Admin...' : 'Create Admin User'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Next Steps */}
          {!connectionStatus.checking && connectionStatus.success && !tablesStatus.checking && tablesStatus.success && (
            <div className="p-6 rounded-xl shadow-lg border dark:bg-gray-800 dark:border-gray-700 light:bg-white light:border-gray-200">
              <h2 className="text-xl font-semibold mb-4 dark:text-white light:text-gray-900">Next Steps</h2>
              
              <div className="space-y-4">
                <p className="dark:text-gray-300 light:text-gray-700">
                  Your Supabase database is now set up and ready to use. Here are the next steps:
                </p>
                
                <ol className="list-decimal list-inside space-y-2 dark:text-gray-300 light:text-gray-700">
                  <li>
                    <span className="font-medium">Set up your admin account</span>
                    <p className="ml-6 text-sm">Create an admin account in the system to manage hotel operations.</p>
                  </li>
                  <li>
                    <span className="font-medium">Configure system settings</span>
                    <p className="ml-6 text-sm">In your Supabase dashboard, configure database settings and permissions for your hotel system.</p>
                  </li>
                  <li>
                    <span className="font-medium">Start using the system</span>
                    <p className="ml-6 text-sm">You can now start using the Hotel Management System with your Supabase backend.</p>
                  </li>
                </ol>
                
                <div className="mt-6 flex justify-center">
                  <Link to="/dashboard" className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-gray-900 light:focus:ring-offset-white transition-all duration-300">
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupabaseSetup;