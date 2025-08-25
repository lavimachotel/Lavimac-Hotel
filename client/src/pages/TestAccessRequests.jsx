import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../supabaseClient';
import { useUser } from '../context/UserContext';
import { getPendingAccessRequests } from '../api/accessRequestService';

const TestAccessRequests = () => {
  const { user, refreshToken } = useUser();
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runTests = async () => {
    setLoading(true);
    setError(null);
    const testResults = {};

    try {
      // Test 1: Check current user
      testResults.currentUser = user ? {
        id: user.id,
        email: user.email,
        role: 'Checking...'
      } : 'Not logged in';

      // Test 2: Check user profile
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          testResults.userProfile = { error: profileError.message };
        } else {
          testResults.userProfile = profile;
          if (testResults.currentUser && typeof testResults.currentUser === 'object') {
            testResults.currentUser.role = profile.role;
          }
        }
      }

      // Test 3: Check if access_requests table exists
      const { data: tableExists, error: tableError } = await supabase
        .from('access_requests')
        .select('id')
        .limit(1);

      testResults.tableExists = tableError ? 
        { error: tableError.message } : 
        { success: true, message: 'Table exists' };

      // Test 4: Count all access requests
      const { data: allRequests, error: allError } = await supabase
        .from('access_requests')
        .select('*');

      testResults.allRequests = allError ? 
        { error: allError.message } : 
        { count: allRequests?.length || 0, requests: allRequests };

      // Test 5: Check status values
      if (allRequests && allRequests.length > 0) {
        const statusCounts = {};
        allRequests.forEach(req => {
          const status = req.status || 'null';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        testResults.statusCounts = statusCounts;
      }

      // Test 6: Check request_date values
      if (allRequests && allRequests.length > 0) {
        const nullDates = allRequests.filter(req => !req.request_date).length;
        testResults.requestDates = {
          total: allRequests.length,
          nullDates,
          hasNullDates: nullDates > 0
        };
      }

      // Test 7: Try using the service function
      const serviceResult = await getPendingAccessRequests(refreshToken);
      testResults.serviceResult = serviceResult;

      // Test 8: Try direct query for pending requests
      const { data: pendingRequests, error: pendingError } = await supabase
        .from('access_requests')
        .select('*')
        .eq('status', 'pending');

      testResults.directPendingQuery = pendingError ? 
        { error: pendingError.message } : 
        { count: pendingRequests?.length || 0, requests: pendingRequests };

      // Test 9: Check RLS policies
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_policies_for_table', { table_name: 'access_requests' });

      testResults.policies = policiesError ? 
        { error: policiesError.message } : 
        { policies };

      setResults(testResults);
    } catch (err) {
      setError(err.message);
      console.error('Test error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create a simple RPC function to get policies
  const createPolicyFunction = async () => {
    try {
      const { error } = await supabase.rpc('create_get_policies_function');
      if (error) throw error;
      alert('Policy function created successfully');
    } catch (err) {
      alert(`Error creating policy function: ${err.message}`);
    }
  };

  // Fix common issues
  const fixIssues = async () => {
    setLoading(true);
    try {
      // Fix 1: Update null request_dates
      await supabase.rpc('fix_request_dates');
      
      // Fix 2: Normalize status values
      await supabase.rpc('normalize_status_values');
      
      // Fix 3: Recreate problematic policies
      await supabase.rpc('recreate_access_request_policies');
      
      alert('Fixes applied successfully. Please run tests again.');
    } catch (err) {
      alert(`Error applying fixes: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create the RPC functions if they don't exist
  const createRpcFunctions = async () => {
    try {
      const { error: error1 } = await supabase.rpc('create_helper_functions');
      if (error1) throw error1;
      alert('Helper functions created successfully');
    } catch (err) {
      alert(`Error creating helper functions: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900 light:bg-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold dark:text-white light:text-gray-900">Access Request Diagnostics</h1>
            <p className="mt-2 text-lg dark:text-gray-300 light:text-gray-700">
              Test and debug access request issues
            </p>
          </div>
          <div className="space-x-4">
            <Link to="/dashboard" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Dashboard
            </Link>
            <Link to="/admin/access-control" className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors">
              Access Control
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div className="p-6 rounded-xl shadow-lg border dark:bg-gray-800 dark:border-gray-700 light:bg-white light:border-gray-200">
            <h2 className="text-xl font-semibold mb-4 dark:text-white light:text-gray-900">Diagnostic Tools</h2>
            
            <div className="flex space-x-4 mb-6">
              <button
                onClick={runTests}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Running Tests...' : 'Run Tests'}
              </button>
              
              <button
                onClick={createPolicyFunction}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                Create Policy Function
              </button>
              
              <button
                onClick={createRpcFunctions}
                disabled={loading}
                className="px-4 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                Create Helper Functions
              </button>
              
              <button
                onClick={fixIssues}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Fix Common Issues
              </button>
            </div>
            
            <div className="space-y-6">
              {Object.entries(results).map(([key, value]) => (
                <div key={key} className="p-4 rounded-lg border dark:bg-gray-700 dark:border-gray-600 light:bg-gray-50 light:border-gray-200">
                  <h3 className="font-medium dark:text-white light:text-gray-900 mb-2">{key}</h3>
                  <pre className="whitespace-pre-wrap text-sm dark:text-gray-300 light:text-gray-700 overflow-auto max-h-60">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestAccessRequests; 