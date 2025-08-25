import React, { useState, useEffect } from 'react';
import databaseService from '../database/DatabaseService.js';

/**
 * Offline Database Test Component
 * Tests and demonstrates the offline database functionality
 */
const OfflineDatabaseTest = () => {
  const [dbStatus, setDbStatus] = useState('Not Initialized');
  const [dbInfo, setDbInfo] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  // Initialize database on component mount
  useEffect(() => {
    // Don't auto-initialize, let user click the button to see detailed logs
    addLog('🏁 Component mounted. Click "Reinitialize DB" to start.', 'info');
  }, []);

  const initializeDatabase = async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('🚀 Starting database initialization...', 'info');

      // Add detailed logging
      addLog('📋 Checking databaseService availability...', 'info');
      if (!databaseService) {
        throw new Error('DatabaseService is not available');
      }
      addLog('✅ DatabaseService is available', 'success');

      addLog('🔧 Calling databaseService.initialize()...', 'info');
      const result = await databaseService.initialize();
      addLog('📊 Initialize result received', 'info');
      
      if (result && result.success) {
        setDbStatus('Initialized');
        setDbInfo(result.info);
        addLog('✅ Database initialized successfully', 'success');
        
        // Load initial data
        await loadRooms();
        await loadStats();
        await checkHealth();
      } else {
        const errorMsg = result ? `Initialization failed: ${JSON.stringify(result)}` : 'No result returned from initialization';
        throw new Error(errorMsg);
      }
    } catch (err) {
      const errorMessage = err.message || 'Unknown error occurred';
      const errorStack = err.stack || 'No stack trace available';
      
      setError(errorMessage);
      setDbStatus('Error');
      addLog(`❌ Database initialization failed: ${errorMessage}`, 'error');
      addLog(`🔍 Error stack: ${errorStack}`, 'error');
      
      // Log additional debugging info
      addLog(`🔍 Error type: ${err.constructor.name}`, 'error');
      addLog(`🔍 DatabaseService type: ${typeof databaseService}`, 'info');
      
      console.error('Full error object:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    try {
      addLog('📊 Loading rooms data...', 'info');
      const roomsRepo = databaseService.getRepository('rooms');
      const roomsData = await roomsRepo.getAllRooms();
      setRooms(roomsData);
      addLog(`✅ Loaded ${roomsData.length} rooms`, 'success');
    } catch (err) {
      addLog(`❌ Failed to load rooms: ${err.message}`, 'error');
    }
  };

  const loadStats = async () => {
    try {
      addLog('📈 Loading database statistics...', 'info');
      const statsData = await databaseService.getDatabaseStatistics();
      setStats(statsData);
      addLog('✅ Statistics loaded', 'success');
    } catch (err) {
      addLog(`❌ Failed to load statistics: ${err.message}`, 'error');
    }
  };

  const checkHealth = async () => {
    try {
      addLog('🏥 Checking database health...', 'info');
      const healthData = await databaseService.checkDatabaseHealth();
      setHealth(healthData);
      addLog(`✅ Health check completed: ${healthData.status}`, 'success');
    } catch (err) {
      addLog(`❌ Health check failed: ${err.message}`, 'error');
    }
  };

  const testRoomOperations = async () => {
    try {
      setLoading(true);
      addLog('🧪 Testing room operations...', 'info');
      
      const roomsRepo = databaseService.getRepository('rooms');
      
      // Test getting available rooms
      const availableRooms = await roomsRepo.getAvailableRooms();
      addLog(`📋 Found ${availableRooms.length} available rooms`, 'info');
      
      if (availableRooms.length > 0) {
        const testRoom = availableRooms[0];
        addLog(`🏨 Testing with room: ${testRoom.room_number}`, 'info');
        
        // Test check-in
        await roomsRepo.checkInRoom(testRoom.id);
        addLog(`✅ Checked in room ${testRoom.room_number}`, 'success');
        
        // Test check-out
        await roomsRepo.checkOutRoom(testRoom.id);
        addLog(`✅ Checked out room ${testRoom.room_number}`, 'success');
        
        // Reload rooms to see changes
        await loadRooms();
      }
      
      addLog('✅ Room operations test completed', 'success');
    } catch (err) {
      addLog(`❌ Room operations test failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testGuestOperations = async () => {
    try {
      setLoading(true);
      addLog('🧪 Testing guest operations...', 'info');
      
      const guestsRepo = databaseService.getRepository('guests');
      
      // Create a test guest
      const testGuest = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        status: 'Checked In'
      };
      
      const createdGuest = await guestsRepo.create(testGuest);
      addLog(`✅ Created guest: ${createdGuest.name} (ID: ${createdGuest.id})`, 'success');
      
      // Update guest
      const updatedGuest = await guestsRepo.update(createdGuest.id, {
        phone: '+0987654321'
      });
      addLog(`✅ Updated guest phone: ${updatedGuest.phone}`, 'success');
      
      // Get guest by ID
      const retrievedGuest = await guestsRepo.findById(createdGuest.id);
      addLog(`✅ Retrieved guest: ${retrievedGuest.name}`, 'success');
      
      // Delete guest
      await guestsRepo.delete(createdGuest.id);
      addLog(`✅ Deleted guest: ${createdGuest.name}`, 'success');
      
      addLog('✅ Guest operations test completed', 'success');
    } catch (err) {
      addLog(`❌ Guest operations test failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Initialized': return 'text-green-600';
      case 'Error': return 'text-red-600';
      case 'Not Initialized': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Offline Database Test
        </h1>
        <p className="text-gray-600">
          Test and monitor the offline database functionality
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 mb-2">Database Status</h3>
          <p className={`text-lg font-bold ${getStatusColor(dbStatus)}`}>
            {dbStatus}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 mb-2">Total Rooms</h3>
          <p className="text-lg font-bold text-blue-600">
            {rooms.length}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 mb-2">Health Status</h3>
          <p className={`text-lg font-bold ${
            health?.status === 'healthy' ? 'text-green-600' : 
            health?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {health?.status || 'Unknown'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={initializeDatabase}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Reinitialize DB'}
          </button>
          
          <button
            onClick={testRoomOperations}
            disabled={loading || dbStatus !== 'Initialized'}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Test Room Operations
          </button>
          
          <button
            onClick={testGuestOperations}
            disabled={loading || dbStatus !== 'Initialized'}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Test Guest Operations
          </button>
          
          <button
            onClick={loadStats}
            disabled={loading || dbStatus !== 'Initialized'}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            Refresh Stats
          </button>
          
          <button
            onClick={checkHealth}
            disabled={loading || dbStatus !== 'Initialized'}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Check Health
          </button>
          
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h4 className="font-bold">Error:</h4>
          <p>{error}</p>
        </div>
      )}

      {/* Database Info */}
      {dbInfo && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 mb-3">Database Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Name:</span> {dbInfo.name}
            </div>
            <div>
              <span className="font-medium">Version:</span> {dbInfo.version}
            </div>
            <div>
              <span className="font-medium">Tables:</span> {dbInfo.tables?.length || 0}
            </div>
            <div>
              <span className="font-medium">Repositories:</span> {dbInfo.repositoriesLoaded}
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 mb-3">Database Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium capitalize">{key}:</span>{' '}
                {typeof value === 'object' ? JSON.stringify(value) : value}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rooms List */}
      {rooms.length > 0 && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 mb-3">Rooms ({rooms.length})</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Room</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">Capacity</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.id} className="border-b">
                    <td className="p-2">{room.id}</td>
                    <td className="p-2">{room.room_number}</td>
                    <td className="p-2">{room.type}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        room.status === 'Available' ? 'bg-green-100 text-green-800' :
                        room.status === 'Occupied' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {room.status}
                      </span>
                    </td>
                    <td className="p-2">GHS {room.price}</td>
                    <td className="p-2">{room.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Health Check Results */}
      {health && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 mb-3">Health Check Results</h3>
          <div className="space-y-2">
            {health.checks?.map((check, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${
                  check.status === 'pass' ? 'bg-green-500' :
                  check.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></span>
                <span className="font-medium">{check.name}:</span>
                <span>{check.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold text-gray-700 mb-3">Activity Logs</h3>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm">No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-sm">
                <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                <span className={getLogColor(log.type)}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineDatabaseTest; 