import React, { useState, useEffect } from 'react';
import supabase, { 
  checkSupabaseConnection, 
  testTableAccess, 
  diagnoseRLSIssues 
} from '../supabaseClient';

// Styles for the component
const styles = {
  container: {
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0',
  },
  card: {
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '10px',
    paddingBottom: '5px',
    borderBottom: '1px solid #eee',
  },
  button: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#3f51b5',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    marginRight: '10px',
  },
  buttonDanger: {
    backgroundColor: '#f44336',
  },
  buttonSuccess: {
    backgroundColor: '#4caf50',
  },
  detailsContainer: {
    marginTop: '10px',
    backgroundColor: '#f5f5f5',
    padding: '10px',
    borderRadius: '4px',
    overflowX: 'auto',
  },
  statusIndicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '5px',
  },
  statusSuccess: {
    backgroundColor: '#4caf50',
  },
  statusError: {
    backgroundColor: '#f44336',
  },
  statusWarning: {
    backgroundColor: '#ff9800',
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '10px',
    borderBottom: '2px solid #ddd',
    backgroundColor: '#f5f5f5',
  },
  td: {
    padding: '10px',
    borderBottom: '1px solid #ddd',
  },
  envVarContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px',
    borderBottom: '1px solid #eee',
  },
  envVarName: {
    fontWeight: 'bold',
    flexBasis: '40%',
  },
  envVarValue: {
    flexBasis: '60%',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
};

// Theme-aware styles
const getThemedStyles = (isDarkMode) => {
  const baseStyles = { ...styles };
  
  if (isDarkMode) {
    return {
      ...baseStyles,
      container: {
        ...baseStyles.container,
        backgroundColor: '#1e1e1e',
        color: '#e0e0e0',
      },
      card: {
        ...baseStyles.card,
        backgroundColor: '#2d2d2d',
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
      },
      sectionTitle: {
        ...baseStyles.sectionTitle,
        borderBottom: '1px solid #444',
      },
      detailsContainer: {
        ...baseStyles.detailsContainer,
        backgroundColor: '#333',
        color: '#e0e0e0',
      },
      th: {
        ...baseStyles.th,
        backgroundColor: '#333',
        borderBottom: '2px solid #444',
      },
      td: {
        ...baseStyles.td,
        borderBottom: '1px solid #444',
      },
      envVarContainer: {
        ...baseStyles.envVarContainer,
        borderBottom: '1px solid #444',
      },
    };
  }
  
  return baseStyles;
};

const SupabaseDiagnostics = ({ isDarkMode = false }) => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [diagnosisResults, setDiagnosisResults] = useState(null);
  const [tableAccessResults, setTableAccessResults] = useState({});
  const [authState, setAuthState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [userSession, setUserSession] = useState(null);
  
  const themedStyles = getThemedStyles(isDarkMode);
  
  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      const status = await checkSupabaseConnection();
      setConnectionStatus(status);
    };
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserSession(session);
      setAuthState({
        authenticated: !!session,
        expiresAt: session?.expires_at,
        user: session?.user,
      });
    };
    
    checkConnection();
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
  
  // Format environment variables for display
  const getEnvVariables = () => {
    return [
      {
        name: 'REACT_APP_SUPABASE_URL',
        value: process.env.REACT_APP_SUPABASE_URL || 'Not set (using fallback)',
        isDefined: !!process.env.REACT_APP_SUPABASE_URL,
      },
      {
        name: 'REACT_APP_SUPABASE_ANON_KEY',
        value: process.env.REACT_APP_SUPABASE_ANON_KEY 
          ? '********' + (process.env.REACT_APP_SUPABASE_ANON_KEY.substr(-6)) 
          : 'Not set (using fallback)',
        isDefined: !!process.env.REACT_APP_SUPABASE_ANON_KEY,
      },
    ];
  };
  
  // Attempt simple remediation actions
  const attemptFixAuth = async () => {
    await supabase.auth.signOut();
    alert('Signed out. Please refresh the page and try signing in again.');
  };
  
  return (
    <div style={themedStyles.container}>
      <div style={themedStyles.header}>
        <h1 style={themedStyles.title}>Supabase Connection Diagnostics</h1>
        <div>
          <button 
            style={themedStyles.button} 
            onClick={() => setIsDetailVisible(!isDetailVisible)}
          >
            {isDetailVisible ? 'Hide Details' : 'Show Details'}
          </button>
          <button 
            style={{...themedStyles.button, ...themedStyles.buttonSuccess}}
            onClick={runFullDiagnosis}
            disabled={isLoading}
          >
            {isLoading ? 'Running...' : 'Run Full Diagnosis'}
          </button>
        </div>
      </div>
      
      {/* Connection Status Card */}
      <div style={themedStyles.card}>
        <div style={themedStyles.sectionTitle}>Connection Status</div>
        <div>
          {connectionStatus ? (
            <>
              <span 
                style={{
                  ...themedStyles.statusIndicator, 
                  ...(connectionStatus.success ? themedStyles.statusSuccess : themedStyles.statusError)
                }}
              ></span>
              <span>
                {connectionStatus.success 
                  ? `Connected (Latency: ${connectionStatus.latency}ms)` 
                  : `Failed to connect: ${connectionStatus.message}`}
              </span>
            </>
          ) : (
            <span>Checking connection...</span>
          )}
        </div>
        
        {/* Environment Variables */}
        {isDetailVisible && (
          <div style={themedStyles.detailsContainer}>
            <div style={{marginBottom: '10px', fontWeight: 'bold'}}>Environment Variables</div>
            {getEnvVariables().map((envVar) => (
              <div key={envVar.name} style={themedStyles.envVarContainer}>
                <div style={themedStyles.envVarName}>
                  <span 
                    style={{
                      ...themedStyles.statusIndicator, 
                      ...(envVar.isDefined ? themedStyles.statusSuccess : themedStyles.statusWarning)
                    }}
                  ></span>
                  {envVar.name}
                </div>
                <div style={themedStyles.envVarValue}>{envVar.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Authentication Status Card */}
      <div style={themedStyles.card}>
        <div style={themedStyles.sectionTitle}>Authentication Status</div>
        <div>
          {authState ? (
            <>
              <span 
                style={{
                  ...themedStyles.statusIndicator, 
                  ...(authState.authenticated ? themedStyles.statusSuccess : themedStyles.statusWarning)
                }}
              ></span>
              <span>
                {authState.authenticated 
                  ? `Authenticated (Expires: ${new Date(authState.expiresAt * 1000).toLocaleString()})` 
                  : 'Not authenticated'}
              </span>
              
              {!authState.authenticated && (
                <button 
                  style={{...themedStyles.button, marginLeft: '15px'}}
                  onClick={() => alert('Manual sign-in required. Please check your auth config.')}
                >
                  Sign In
                </button>
              )}
              
              {authState.authenticated && (
                <button 
                  style={{...themedStyles.button, ...themedStyles.buttonDanger, marginLeft: '15px'}}
                  onClick={attemptFixAuth}
                >
                  Sign Out
                </button>
              )}
            </>
          ) : (
            <span>Checking authentication...</span>
          )}
        </div>
        
        {/* Auth Details */}
        {isDetailVisible && authState && authState.authenticated && (
          <div style={themedStyles.detailsContainer}>
            <div style={{marginBottom: '10px', fontWeight: 'bold'}}>User Details</div>
            <pre style={{overflowX: 'auto'}}>
              {JSON.stringify({
                id: authState.user?.id,
                email: authState.user?.email,
                role: authState.user?.role,
                lastSignIn: authState.user?.last_sign_in_at,
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      {/* Table Access Tests */}
      <div style={themedStyles.card}>
        <div style={themedStyles.sectionTitle}>
          Table Access Tests
          <button 
            style={{...themedStyles.button, float: 'right', padding: '4px 10px'}}
            onClick={() => {
              runTableAccessTest('rooms', 'select');
              runTableAccessTest('reservations', 'select');
            }}
          >
            Test Reads
          </button>
        </div>
        
        <div style={themedStyles.tableContainer}>
          <table style={themedStyles.table}>
            <thead>
              <tr>
                <th style={themedStyles.th}>Table Name</th>
                <th style={themedStyles.th}>Operation</th>
                <th style={themedStyles.th}>Status</th>
                <th style={themedStyles.th}>Message</th>
                <th style={themedStyles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(tableAccessResults).map(tableName => (
                Object.keys(tableAccessResults[tableName]).map(operation => (
                  <tr key={`${tableName}-${operation}`}>
                    <td style={themedStyles.td}>{tableName}</td>
                    <td style={themedStyles.td}>{operation}</td>
                    <td style={themedStyles.td}>
                      <span 
                        style={{
                          ...themedStyles.statusIndicator, 
                          ...(tableAccessResults[tableName][operation].success 
                            ? themedStyles.statusSuccess 
                            : themedStyles.statusError)
                        }}
                      ></span>
                      {tableAccessResults[tableName][operation].success ? 'Success' : 'Failed'}
                    </td>
                    <td style={themedStyles.td}>
                      {tableAccessResults[tableName][operation].message || 
                       (tableAccessResults[tableName][operation].success 
                        ? `Latency: ${tableAccessResults[tableName][operation].latency}ms` 
                        : 'No error message')}
                    </td>
                    <td style={themedStyles.td}>
                      <button 
                        style={{...themedStyles.button, padding: '4px 10px'}}
                        onClick={() => runTableAccessTest(tableName, operation)}
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ))
              ))}
              
              {Object.keys(tableAccessResults).length === 0 && (
                <tr>
                  <td colSpan="5" style={{...themedStyles.td, textAlign: 'center'}}>
                    No tests run yet. Click "Test Reads" or "Run Full Diagnosis" to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Full Diagnosis Results */}
      {diagnosisResults && (
        <div style={themedStyles.card}>
          <div style={themedStyles.sectionTitle}>Diagnosis Results</div>
          
          <div style={themedStyles.tableContainer}>
            <table style={themedStyles.table}>
              <thead>
                <tr>
                  <th style={themedStyles.th}>Table</th>
                  <th style={themedStyles.th}>Select</th>
                  <th style={themedStyles.th}>Insert</th>
                  <th style={themedStyles.th}>Update</th>
                  <th style={themedStyles.th}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(diagnosisResults).map(tableName => (
                  <tr key={tableName}>
                    <td style={themedStyles.td}>{tableName}</td>
                    {['select', 'insert', 'update', 'delete'].map(operation => (
                      <td key={`${tableName}-${operation}`} style={themedStyles.td}>
                        <span 
                          style={{
                            ...themedStyles.statusIndicator, 
                            ...(diagnosisResults[tableName][operation]?.success 
                              ? themedStyles.statusSuccess 
                              : themedStyles.statusError)
                          }}
                        ></span>
                        {diagnosisResults[tableName][operation]?.success ? 'Pass' : 'Fail'}
                        
                        {diagnosisResults[tableName][operation] && !diagnosisResults[tableName][operation].success && (
                          <div style={{fontSize: '12px', marginTop: '5px', color: '#f44336'}}>
                            {diagnosisResults[tableName][operation].message?.substring(0, 50)}
                            {diagnosisResults[tableName][operation].message?.length > 50 ? '...' : ''}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {isDetailVisible && (
            <div style={themedStyles.detailsContainer}>
              <div style={{marginBottom: '10px', fontWeight: 'bold'}}>Full Diagnosis Data</div>
              <pre style={{overflowX: 'auto'}}>
                {JSON.stringify(diagnosisResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      {/* Recommendations */}
      <div style={themedStyles.card}>
        <div style={themedStyles.sectionTitle}>Troubleshooting Recommendations</div>
        
        <div>
          <h4>Authentication Issues:</h4>
          <ul>
            <li>Check that your Supabase URL and anon key are correct in your environment variables.</li>
            <li>Try signing out and signing back in if you see 401 errors.</li>
            <li>Verify that your auth session hasn't expired.</li>
          </ul>
          
          <h4>Row-Level Security (RLS) Issues:</h4>
          <ul>
            <li>If you see 403 errors, check your RLS policies in the Supabase dashboard.</li>
            <li>For development, you can temporarily disable RLS on tables (not recommended for production).</li>
            <li>Make sure the authenticated user has the appropriate permissions in your RLS policies.</li>
          </ul>
          
          <h4>Connection Issues:</h4>
          <ul>
            <li>Check your network connection and ensure you can reach the Supabase API.</li>
            <li>Verify that your Supabase project is active and not paused due to billing issues.</li>
            <li>If using localhost, ensure CORS is properly configured in your Supabase settings.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SupabaseDiagnostics; 