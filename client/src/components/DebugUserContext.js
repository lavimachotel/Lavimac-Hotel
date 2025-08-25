import React, { useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

const DebugUserContext = () => {
  const userContext = useUser();
  const navigate = useNavigate();
  
  // Log everything from the context to help debug
  useEffect(() => {
    console.log('UserContext Debug - All available functions and values:', userContext);
  }, [userContext]);
  
  const testLogout = () => {
    console.log('Testing logoutUser function...');
    try {
      userContext.logoutUser();
      console.log('logoutUser executed successfully');
    } catch (error) {
      console.error('Error using logoutUser:', error);
    }
    navigate('/');
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>UserContext Debug</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Available Functions and Values</h2>
        <pre>{JSON.stringify(Object.keys(userContext), null, 2)}</pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Current User Data</h2>
        <pre>{JSON.stringify(userContext.user, null, 2)}</pre>
      </div>
      
      <button 
        onClick={testLogout}
        style={{
          padding: '10px 15px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '10px'
        }}
      >
        Test logoutUser
      </button>
      
      <button 
        onClick={() => navigate('/')}
        style={{
          padding: '10px 15px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Back to Home
      </button>
    </div>
  );
};

export default DebugUserContext; 