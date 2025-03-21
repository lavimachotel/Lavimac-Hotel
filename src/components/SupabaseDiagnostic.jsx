import React, { useState, useEffect } from 'react';
import { testSupabaseConnection, createGuest, getGuests } from '../services/guestService';
import { createGuestsTable, diagnoseDatabase, fixGuestsTable, checkSupabaseProjectStatus } from '../services/setupService';
import { useTheme } from '../context/ThemeContext';
import supabase from '../supabaseClient';

const SupabaseDiagnostic = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const [connectionStatus, setConnectionStatus] = useState({
    tested: false,
    success: false,
    message: 'Not tested yet',
    details: null
  });
  
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [tableCreationResult, setTableCreationResult] = useState(null);
  const [testDataResult, setTestDataResult] = useState(null);
  const [guestsList, setGuestsList] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const [fixTableResult, setFixTableResult] = useState(null);
  const [directInsertResult, setDirectInsertResult] = useState(null);
  const [directUrlTest, setDirectUrlTest] = useState(null);
  const [manualUrl, setManualUrl] = useState(process.env.REACT_APP_SUPABASE_URL || '');
  const [projectStatusResult, setProjectStatusResult] = useState(null);
  
  const testConnection = async () => {
    setIsWorking(true);
    try {
      const result = await testSupabaseConnection();
      setConnectionStatus({
        tested: true,
        success: result.success,
        message: result.message,
        details: result
      });
    } catch (error) {
      setConnectionStatus({
        tested: true,
        success: false,
        message: `Error during test: ${error.message}`,
        details: error
      });
    } finally {
      setIsWorking(false);
    }
  };
  
  const runDiagnosis = async () => {
    setIsWorking(true);
    try {
      const result = await diagnoseDatabase();
      setDiagnosisResult(result);
    } catch (error) {
      setDiagnosisResult({
        success: false,
        message: `Error during diagnosis: ${error.message}`,
        error: error
      });
    } finally {
      setIsWorking(false);
    }
  };
  
  const setupGuestsTable = async () => {
    setIsWorking(true);
    try {
      const result = await createGuestsTable();
      setTableCreationResult(result);
    } catch (error) {
      setTableCreationResult({
        success: false,
        message: `Error creating table: ${error.message}`,
        error: error
      });
    } finally {
      setIsWorking(false);
    }
  };
  
  const fixGuestsTableSchema = async () => {
    setIsWorking(true);
    try {
      const result = await fixGuestsTable();
      setFixTableResult(result);
    } catch (error) {
      setFixTableResult({
        success: false,
        message: `Error fixing guests table: ${error.message}`,
        error: error
      });
    } finally {
      setIsWorking(false);
    }
  };
  
  const insertTestData = async () => {
    setIsWorking(true);
    try {
      // Create a test guest directly using the service
      const testGuest = {
        name: `Test Guest ${new Date().toISOString()}`,
        email: `test${Date.now()}@example.com`,
        phone: '123-456-7890',
        room: `${Math.floor(Math.random() * 500) + 100}`,
        check_in: new Date().toISOString(),
        check_out: new Date(Date.now() + 86400000).toISOString(),
        status: 'Checked In',
        first_name: 'Test',
        last_name: 'Guest',
        created_at: new Date().toISOString()
      };
      
      console.log('Attempting to insert test guest:', testGuest);
      const result = await createGuest(testGuest);
      
      if (result.error) {
        throw result.error;
      }
      
      setTestDataResult({
        success: true,
        message: 'Successfully created test guest',
        data: result.data
      });
      
      // Fetch and display current guests
      fetchGuests();
    } catch (error) {
      console.error('Error inserting test data:', error);
      setTestDataResult({
        success: false,
        message: `Error inserting test data: ${error.message}`,
        error: error
      });
    } finally {
      setIsWorking(false);
    }
  };
  
  const fetchGuests = async () => {
    setIsWorking(true);
    try {
      const { data, error } = await getGuests();
      
      if (error) {
        throw error;
      }
      
      setGuestsList({
        success: true,
        message: `Retrieved ${data.length} guests`,
        data: data
      });
    } catch (error) {
      console.error('Error fetching guests:', error);
      setGuestsList({
        success: false,
        message: `Error fetching guests: ${error.message}`,
        error: error
      });
    } finally {
      setIsWorking(false);
    }
  };
  
  // Test direct access to the Supabase URL
  const testDirectUrl = async () => {
    setIsWorking(true);
    try {
      const url = manualUrl || supabase.supabaseUrl;
      console.log(`Testing direct access to URL: ${url}`);
      
      // Add timestamp to avoid caching issues
      const testUrl = `${url}?_=${Date.now()}`;
      
      // First, let's try to test if the domain is reachable at all
      // We'll set a small timeout to quickly detect network issues
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      console.log('Attempting fetch with detailed logging...');
      
      try {
        // Use mode: 'no-cors' as a fallback if regular fetch fails
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'apikey': supabase.supabaseKey || process.env.REACT_APP_SUPABASE_ANON_KEY || '',
            'X-Client-Info': 'diagnostics'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const statusOk = response.status >= 200 && response.status < 300;
        
        // Try to read response type
        const contentType = response.headers.get('content-type');
        
        setDirectUrlTest({
          success: statusOk,
          message: statusOk 
            ? `Successfully connected to ${url} (HTTP ${response.status}, ${contentType || 'unknown content type'})`
            : `Failed to connect to ${url} (HTTP ${response.status}, ${contentType || 'unknown content type'})`,
          status: response.status,
          url: url,
          contentType: contentType,
          httpDetails: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries([...response.headers.entries()])
          }
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Initial fetch failed:', fetchError);
        
        // If the regular fetch failed, try with 'no-cors' mode
        // This will succeed even if CORS is the issue, but won't give us response details
        try {
          console.log('Trying fetch with no-cors mode...');
          const noCorsResponse = await fetch(testUrl, {
            method: 'GET',
            mode: 'no-cors',
            signal: controller.signal
          });
          
          // If we got here, the server is reachable but possibly has CORS issues
          setDirectUrlTest({
            success: false,
            message: `Server is reachable but returned a CORS error. This usually means the Supabase server is working, but the browser security prevents direct access. Your app should still work normally.`,
            error: fetchError,
            url: url,
            corsIssue: true
          });
        } catch (noCorsError) {
          // If both failed, we have a more serious connection issue
          console.error('No-cors fetch also failed:', noCorsError);
          
          // Check if this is a mixed content error (https trying to load http)
          const isMixedContent = fetchError.message.includes('Mixed Content') || 
                                window.location.protocol === 'https:' && url.startsWith('http:');
          
          // Check if this is a CORS error
          const isCorsError = fetchError.message.includes('CORS') || 
                            fetchError.message.includes('cross-origin');
          
          // Check for network error
          const isNetworkError = fetchError.message.includes('network') || 
                                fetchError.message.includes('Failed to fetch');
          
          let detailedMessage = `Failed to connect: ${fetchError.message}`;
          
          if (isMixedContent) {
            detailedMessage = `Mixed content error: Your app is loaded via HTTPS but trying to access Supabase via HTTP. Make sure your Supabase URL uses HTTPS.`;
          } else if (isCorsError) {
            detailedMessage = `CORS error: The Supabase server rejected the request due to cross-origin restrictions. This is normal for direct browser access and won't affect your application.`;
          } else if (isNetworkError) {
            detailedMessage = `Network error: Could not establish a connection to ${url}. This could be due to:
            - Network connectivity issues
            - Firewall or proxy blocking the connection
            - The Supabase project may be in maintenance mode or paused
            - DNS issues preventing hostname resolution`;
          }
          
          setDirectUrlTest({
            success: false,
            message: detailedMessage,
            error: fetchError,
            url: url,
            errorType: isMixedContent ? 'mixed-content' : 
                      isCorsError ? 'cors' : 
                      isNetworkError ? 'network' : 'unknown'
          });
        }
      }
    } catch (error) {
      console.error('Error in testing direct URL access:', error);
      setDirectUrlTest({
        success: false,
        message: `Exception during test: ${error.message}`,
        error: error,
        url: manualUrl || supabase.supabaseUrl
      });
    } finally {
      setIsWorking(false);
    }
  };
  
  // Generate Supabase connection info for troubleshooting
  const getConnectionInfo = () => {
    const url = supabase.supabaseUrl || process.env.REACT_APP_SUPABASE_URL || 'Not configured';
    const hasKey = !!supabase.supabaseKey || !!process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    return {
      url,
      hasKey,
      isConfigured: url !== 'Not configured' && hasKey
    };
  };
  
  const connectionInfo = getConnectionInfo();
  
  // Direct insertion using Supabase client
  const insertDirectData = async () => {
    setIsWorking(true);
    try {
      // Create a test guest directly using the Supabase client
      const testGuest = {
        name: `Direct Test ${new Date().toISOString()}`,
        email: `direct_test${Date.now()}@example.com`,
        phone: '555-123-4567',
        room: `${Math.floor(Math.random() * 500) + 100}`,
        check_in: new Date().toISOString(),
        check_out: new Date(Date.now() + 86400000).toISOString(),
        status: 'Checked In',
        first_name: 'Direct',
        last_name: 'Test',
        created_at: new Date().toISOString()
      };
      
      console.log('Attempting direct insert with Supabase client:', testGuest);
      
      // First check if the guests table exists
      const { error: checkError } = await supabase
        .from('guests')
        .select('count')
        .limit(1);
      
      if (checkError && (checkError.code === '42P01' || checkError.code === 'PGRST116')) {
        // Table doesn't exist, try to create it first
        console.log('Guests table does not exist, creating it first');
        const { success } = await createGuestsTable();
        
        if (!success) {
          throw new Error('Failed to create guests table');
        }
      }
      
      // Now try to insert the data
      const { data, error } = await supabase
        .from('guests')
        .insert([testGuest])
        .select();
      
      if (error) {
        throw error;
      }
      
      setDirectInsertResult({
        success: true,
        message: 'Successfully inserted data directly with Supabase client',
        data: data
      });
      
      // Refresh the guest list
      fetchGuests();
    } catch (error) {
      console.error('Error with direct insertion:', error);
      setDirectInsertResult({
        success: false,
        message: `Error with direct insertion: ${error.message}`,
        error: error
      });
    } finally {
      setIsWorking(false);
    }
  };
  
  // Check if the Supabase project is active
  const checkProjectStatus = async () => {
    setIsWorking(true);
    try {
      const result = await checkSupabaseProjectStatus();
      setProjectStatusResult(result);
    } catch (error) {
      setProjectStatusResult({
        success: false,
        message: `Error checking project status: ${error.message}`,
        error: error
      });
    } finally {
      setIsWorking(false);
    }
  };
  
  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
      <h1 className="text-2xl font-bold mb-6">Supabase Connection Diagnostic</h1>
      
      <div className="space-y-8">
        {/* Connection Details Section */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <h2 className="text-xl font-semibold mb-4">Connection Details</h2>
          <div className="mb-4">
            <p><strong>Supabase URL:</strong> {connectionInfo.url}</p>
            <p><strong>API Key Configured:</strong> {connectionInfo.hasKey ? 'Yes' : 'No'}</p>
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Test URL Directly</h3>
            <p className="mb-2">Test if the Supabase URL is reachable from your browser:</p>
            
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="Enter Supabase URL"
                className={`flex-1 px-3 py-2 rounded-md ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-800 border-gray-300'
                } border`}
              />
              <button
                onClick={testDirectUrl}
                disabled={isWorking}
                className={`px-4 py-2 rounded-md ${
                  isWorking
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white whitespace-nowrap`}
              >
                {isWorking ? 'Testing...' : 'Test URL'}
              </button>
            </div>
            
            {directUrlTest && (
              <div className={`p-3 rounded-md ${
                directUrlTest.success
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-20 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300'
              }`}>
                <p className="font-medium">{directUrlTest.message}</p>
                {directUrlTest.error && (
                  <pre className="mt-2 text-xs overflow-auto max-h-40">
                    {JSON.stringify(directUrlTest.error, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Troubleshooting Steps</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Ensure your Supabase project is active and not in maintenance mode</li>
              <li>Verify the URL in your .env file matches your Supabase project URL</li>
              <li>Check if your browser can reach the Supabase URL (use the Test URL button above)</li>
              <li>Make sure you're using the correct anon key from your Supabase project settings</li>
              <li>If you've just created your project, wait a few minutes for it to fully provision</li>
              <li>Try creating a table directly from the Supabase dashboard</li>
            </ol>
          </div>
        </div>
        
        {/* Network Troubleshooting Section - NEW */}
        <div className={`p-4 rounded-lg mt-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <h2 className="text-xl font-semibold mb-4">Network Troubleshooting</h2>
          
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Failed to Fetch Error</h3>
            <p className="mb-4">
              The "Failed to fetch" error typically indicates a network connectivity issue. Here are detailed troubleshooting steps:
            </p>
            
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>
                <strong>Check if Supabase is up:</strong> Open{' '}
                <a 
                  href="https://status.supabase.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Supabase Status Page
                </a>{' '}
                to see if there are any ongoing outages.
              </li>
              <li>
                <strong>Verify Supabase project status:</strong> Log in to your{' '}
                <a 
                  href="https://app.supabase.com/projects" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Supabase Dashboard
                </a>{' '}
                and check if your project is active (not paused).
              </li>
              <li>
                <strong>Check your network connection:</strong> Ensure you have internet access and no firewall is blocking connections to Supabase.
              </li>
              <li>
                <strong>Temporary network issues:</strong> Try again in a few minutes, as this could be due to temporary network disruptions.
              </li>
              <li>
                <strong>Browser issues:</strong> Try using a different browser or clearing your browser cache.
              </li>
              <li>
                <strong>Cross-Origin (CORS) issues:</strong> Browser security may prevent direct API testing. This is normal when testing directly from a browser, but your application should still work.
              </li>
            </ol>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Project Health Check</h3>
            <p className="mb-2">Quick test to see if your project seems active:</p>
            
            <div className="flex items-center space-x-2 mb-4">
              <button
                onClick={() => window.open(`https://${connectionInfo.url.replace('https://', '')}/rest/v1/?apikey=${supabase.supabaseKey}`, '_blank')}
                className={`px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white`}
              >
                Test Supabase API
              </button>
              
              <button
                onClick={() => window.open(`https://app.supabase.com/project/_`, '_blank')}
                className={`px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white`}
              >
                Open Supabase Dashboard
              </button>
              
              <button
                onClick={checkProjectStatus}
                disabled={isWorking}
                className={`px-4 py-2 rounded-md ${
                  isWorking
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                } text-white`}
              >
                {isWorking ? 'Checking...' : 'Check Project Status'}
              </button>
            </div>
            
            {projectStatusResult && (
              <div className={`mt-4 p-3 rounded-md ${
                projectStatusResult.active
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-20 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300'
              }`}>
                <p className="font-medium">{projectStatusResult.message}</p>
                
                {projectStatusResult.results && (
                  <div className="mt-3">
                    <h4 className="font-medium">Detailed Results:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {Object.entries(projectStatusResult.results).map(([key, result]) => 
                        result && (
                          <div key={key} className={`p-2 rounded ${
                            result.success 
                              ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-10' 
                              : 'bg-red-50 dark:bg-red-900 dark:bg-opacity-10'
                          }`}>
                            <p className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="text-sm">{result.success ? '✓ Successful' : '✗ Failed'}</p>
                            {result.status && <p className="text-sm">Status: {result.status}</p>}
                            {result.error && <p className="text-sm text-red-600 dark:text-red-400">Error: {result.error}</p>}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-4 p-3 rounded-md bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:bg-opacity-20 dark:text-yellow-300">
              <p className="font-medium">If your connection problems persist:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Check if any browser extensions might be blocking connections</li>
                <li>Try from a different network (e.g., switch from WiFi to mobile data)</li>
                <li>Ensure your Supabase project hasn't reached its usage limits</li>
                <li>Verify your API key has necessary permissions</li>
                <li>If your app works normally but only the diagnostic test fails, this could be due to CORS (which is expected)</li>
              </ol>
            </div>
          </div>
        </div>
        
        {/* Connection Test Section */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <h2 className="text-xl font-semibold mb-4">Connection Test</h2>
          <p className="mb-4">Test if your application can connect to Supabase.</p>
          
          <button
            onClick={testConnection}
            disabled={isWorking}
            className={`px-4 py-2 rounded-md ${
              isWorking
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {isWorking ? 'Testing...' : 'Test Connection'}
          </button>
          
          {connectionStatus.tested && (
            <div className={`mt-4 p-3 rounded-md ${
              connectionStatus.success
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-20 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300'
            }`}>
              <p className="font-medium">{connectionStatus.message}</p>
              
              {/* Show additional "Failed to fetch" help if that's the error */}
              {connectionStatus.message && connectionStatus.message.includes('Failed to fetch') && (
                <div className="mt-4 border-t border-red-200 dark:border-red-700 pt-3">
                  <h3 className="font-semibold text-lg">Failed to Fetch Error</h3>
                  <p className="mt-1">This error typically indicates a network connectivity issue:</p>
                  
                  {connectionStatus.details?.possibleCauses && (
                    <>
                      <h4 className="font-medium mt-3">Possible Causes:</h4>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        {connectionStatus.details.possibleCauses.map((cause, index) => (
                          <li key={index}>{cause}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  
                  {connectionStatus.details?.recommendations && (
                    <>
                      <h4 className="font-medium mt-3">Recommendations:</h4>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        {connectionStatus.details.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  
                  <div className="mt-4 p-3 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300 rounded">
                    <p className="font-medium">Try these steps:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Click the "Test URL" button in the Connection Details section</li>
                      <li>Click the "Check Project Status" button in the Network Troubleshooting section</li>
                      <li>Try the "Test Supabase API" button which will open a new tab directly to your Supabase API</li>
                      <li>Check your Supabase dashboard to ensure your project is active</li>
                    </ol>
                  </div>
                </div>
              )}
              
              {connectionStatus.details && !connectionStatus.message.includes('Failed to fetch') && (
                <div className="mt-3">
                  <h4 className="font-medium">Additional Details:</h4>
                  {connectionStatus.details.suggestions && (
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {connectionStatus.details.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              
              {!connectionStatus.details && connectionStatus.details && (
                <pre className="mt-2 text-xs overflow-auto max-h-40">
                  {JSON.stringify(connectionStatus.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
        
        {/* Advanced Diagnosis Section */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <h2 className="text-xl font-semibold mb-4">Advanced Diagnosis</h2>
          <p className="mb-4">Check database tables and policies.</p>
          
          <button
            onClick={runDiagnosis}
            disabled={isWorking}
            className={`px-4 py-2 rounded-md ${
              isWorking
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {isWorking ? 'Diagnosing...' : 'Run Diagnosis'}
          </button>
          
          {diagnosisResult && (
            <div className={`mt-4 p-3 rounded-md ${
              diagnosisResult.success
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-20 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300'
            }`}>
              <p className="font-medium">{diagnosisResult.message}</p>
              <div className="mt-4">
                <h3 className="font-medium">Diagnosis Details:</h3>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Connection: {diagnosisResult.connectionStatus === 'connected' ? 'Connected' : 'Failed'}</li>
                  {diagnosisResult.tables && (
                    <li>
                      Tables: {diagnosisResult.tables.length > 0 
                        ? diagnosisResult.tables.join(', ') 
                        : 'No tables found'}
                    </li>
                  )}
                  {diagnosisResult.hasGuestsTable !== undefined && (
                    <li>
                      Guests Table: {diagnosisResult.hasGuestsTable ? 'Exists' : 'Does not exist'}
                    </li>
                  )}
                  {diagnosisResult.rlsEnabled !== undefined && (
                    <li>
                      Row Level Security: {diagnosisResult.rlsEnabled ? 'Enabled' : 'Disabled'}
                    </li>
                  )}
                </ul>
                
                {diagnosisResult.policies && diagnosisResult.policies.length > 0 && (
                  <>
                    <h3 className="font-medium mt-4">Table Policies:</h3>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      {diagnosisResult.policies.map((policy, index) => (
                        <li key={index}>
                          {policy.policyname} ({policy.cmd}) - {policy.permissive ? 'Permissive' : 'Restrictive'}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Table Creation Section */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <h2 className="text-xl font-semibold mb-4">Setup Guests Table</h2>
          <p className="mb-4">Create or fix the guests table in your Supabase database.</p>
          
          <div className="flex space-x-2">
            <button
              onClick={setupGuestsTable}
              disabled={isWorking}
              className={`px-4 py-2 rounded-md ${
                isWorking
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {isWorking ? 'Setting up...' : 'Create New Table'}
            </button>
            
            <button
              onClick={fixGuestsTableSchema}
              disabled={isWorking}
              className={`px-4 py-2 rounded-md ${
                isWorking
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-yellow-600 hover:bg-yellow-700'
              } text-white`}
            >
              {isWorking ? 'Fixing...' : 'Fix Table Schema'}
            </button>
          </div>
          
          {tableCreationResult && (
            <div className={`mt-4 p-3 rounded-md ${
              tableCreationResult.success
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-20 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300'
            }`}>
              <p className="font-medium">{tableCreationResult.message}</p>
              {!tableCreationResult.success && tableCreationResult.error && (
                <pre className="mt-2 text-xs overflow-auto max-h-40">
                  {JSON.stringify(tableCreationResult.error, null, 2)}
                </pre>
              )}
            </div>
          )}
          
          {fixTableResult && (
            <div className={`mt-4 p-3 rounded-md ${
              fixTableResult.success
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-20 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300'
            }`}>
              <p className="font-medium">{fixTableResult.message}</p>
              {!fixTableResult.success && fixTableResult.error && (
                <pre className="mt-2 text-xs overflow-auto max-h-40">
                  {JSON.stringify(fixTableResult.error, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
        
        {/* Test Data Insertion */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <h2 className="text-xl font-semibold mb-4">Test Data Insertion</h2>
          <p className="mb-4">Insert a test guest record into Supabase.</p>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={insertTestData}
              disabled={isWorking}
              className={`px-4 py-2 rounded-md ${
                isWorking
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {isWorking ? 'Inserting...' : 'Insert Using Service'}
            </button>
            
            <button
              onClick={insertDirectData}
              disabled={isWorking}
              className={`px-4 py-2 rounded-md ${
                isWorking
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              } text-white`}
            >
              {isWorking ? 'Inserting...' : 'Direct Supabase Insert'}
            </button>
            
            <button
              onClick={fetchGuests}
              disabled={isWorking}
              className={`px-4 py-2 rounded-md ${
                isWorking
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {isWorking ? 'Fetching...' : 'Fetch Guest List'}
            </button>
          </div>
          
          {testDataResult && (
            <div className={`mt-4 p-3 rounded-md ${
              testDataResult.success
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-20 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300'
            }`}>
              <p className="font-medium">{testDataResult.message}</p>
              {testDataResult.data && (
                <pre className="mt-2 text-xs overflow-auto max-h-40">
                  {JSON.stringify(testDataResult.data, null, 2)}
                </pre>
              )}
              {testDataResult.error && (
                <pre className="mt-2 text-xs overflow-auto max-h-40">
                  {JSON.stringify(testDataResult.error, null, 2)}
                </pre>
              )}
            </div>
          )}
          
          {directInsertResult && (
            <div className={`mt-4 p-3 rounded-md ${
              directInsertResult.success
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-20 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300'
            }`}>
              <p className="font-medium">{directInsertResult.message}</p>
              {directInsertResult.data && (
                <pre className="mt-2 text-xs overflow-auto max-h-40">
                  {JSON.stringify(directInsertResult.data, null, 2)}
                </pre>
              )}
              {directInsertResult.error && (
                <pre className="mt-2 text-xs overflow-auto max-h-40">
                  {JSON.stringify(directInsertResult.error, null, 2)}
                </pre>
              )}
            </div>
          )}
          
          {guestsList && (
            <div className="mt-4">
              <h3 className="font-medium">Current Guests in Database:</h3>
              {guestsList.success ? (
                guestsList.data && guestsList.data.length > 0 ? (
                  <div className="mt-2 overflow-x-auto">
                    <table className={`min-w-full table-auto ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <tr>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">Room</th>
                          <th className="px-4 py-2 text-left">Status</th>
                          <th className="px-4 py-2 text-left">Check In</th>
                          <th className="px-4 py-2 text-left">Check Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guestsList.data.map((guest, index) => (
                          <tr key={index} className={`${isDarkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
                            <td className="px-4 py-2">{guest.name || `${guest.first_name} ${guest.last_name}`}</td>
                            <td className="px-4 py-2">{guest.room}</td>
                            <td className="px-4 py-2">{guest.status}</td>
                            <td className="px-4 py-2">{guest.check_in ? new Date(guest.check_in).toLocaleString() : 'N/A'}</td>
                            <td className="px-4 py-2">{guest.check_out ? new Date(guest.check_out).toLocaleString() : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2">No guests found in the database.</p>
                )
              ) : (
                <div className="mt-2 text-red-500">
                  <p>{guestsList.message}</p>
                  {guestsList.error && (
                    <pre className="mt-2 text-xs overflow-auto max-h-40">
                      {JSON.stringify(guestsList.error, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupabaseDiagnostic; 