import React, { useState, useEffect } from 'react';

/**
 * Simple Database Test Component
 * Tests basic sql.js CDN loading and database creation
 */
const SimpleDatabaseTest = () => {
  const [status, setStatus] = useState('Not Started');
  const [logs, setLogs] = useState([]);
  const [sqlJs, setSqlJs] = useState(null);
  const [db, setDb] = useState(null);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  const loadSqlJsFromCDN = async () => {
    return new Promise((resolve, reject) => {
      // Check if sql.js is already loaded
      if (window.initSqlJs) {
        resolve(window.initSqlJs);
        return;
      }

      // Create script element to load sql.js from CDN
      const script = document.createElement('script');
      script.src = 'https://sql.js.org/dist/sql-wasm.js';
      script.onload = () => {
        if (window.initSqlJs) {
          resolve(window.initSqlJs);
        } else {
          reject(new Error('SQL.js failed to load from CDN'));
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load SQL.js script from CDN'));
      };
      
      document.head.appendChild(script);
    });
  };

  const testSqlJsLoading = async () => {
    try {
      setStatus('Loading SQL.js...');
      addLog('🚀 Starting SQL.js CDN loading test...', 'info');

      // Check network connectivity first
      addLog('🌐 Testing network connectivity...', 'info');
      try {
        const response = await fetch('https://sql.js.org/dist/sql-wasm.js', { method: 'HEAD' });
        if (response.ok) {
          addLog('✅ Network connectivity confirmed', 'success');
        } else {
          addLog(`⚠️ Network response: ${response.status}`, 'warning');
        }
      } catch (netError) {
        addLog(`❌ Network test failed: ${netError.message}`, 'error');
      }

      // Load SQL.js from CDN
      addLog('📡 Loading SQL.js from CDN...', 'info');
      const initSqlJs = await loadSqlJsFromCDN();
      addLog('✅ SQL.js script loaded from CDN', 'success');

      // Initialize SQL.js
      addLog('🔧 Initializing SQL.js with WebAssembly...', 'info');
      const SQL = await initSqlJs({
        locateFile: file => {
          const url = `https://sql.js.org/dist/${file}`;
          addLog(`📁 Loading file: ${url}`, 'info');
          return url;
        }
      });
      setSqlJs(SQL);
      addLog('✅ SQL.js initialized successfully', 'success');

      // Create a test database
      addLog('🗄️ Creating SQLite database...', 'info');
      const database = new SQL.Database();
      setDb(database);
      addLog('✅ SQLite database created', 'success');

      // Test basic SQL operations
      addLog('🔨 Creating test table...', 'info');
      database.run("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);");
      addLog('✅ Test table created', 'success');

      addLog('📝 Inserting test data...', 'info');
      database.run("INSERT INTO test (name) VALUES (?);", ["Test Entry"]);
      addLog('✅ Test data inserted', 'success');

      addLog('🔍 Querying test data...', 'info');
      const stmt = database.prepare("SELECT * FROM test;");
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      addLog(`✅ Query executed, found ${results.length} rows`, 'success');
      addLog(`📊 Data: ${JSON.stringify(results)}`, 'info');

      // Test database export/import
      addLog('💾 Testing database export...', 'info');
      const dbBinary = database.export();
      addLog(`✅ Database exported, size: ${dbBinary.length} bytes`, 'success');

      addLog('📥 Testing database import...', 'info');
      const importedDb = new SQL.Database(dbBinary);
      const importStmt = importedDb.prepare("SELECT * FROM test;");
      const importResults = [];
      while (importStmt.step()) {
        importResults.push(importStmt.getAsObject());
      }
      importStmt.free();
      addLog(`✅ Database imported, found ${importResults.length} rows`, 'success');

      setStatus('Success');
      addLog('🎉 All tests passed!', 'success');

    } catch (error) {
      setStatus('Error');
      addLog(`❌ Error: ${error.message}`, 'error');
      addLog(`🔍 Error stack: ${error.stack}`, 'error');
      console.error('Test failed:', error);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Success': return 'text-green-600';
      case 'Error': return 'text-red-600';
      case 'Loading SQL.js...': return 'text-yellow-600';
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Simple Database Test
        </h1>
        <p className="text-gray-600">
          Test basic SQL.js CDN loading and database operations
        </p>
      </div>

      {/* Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Status</h2>
        <div className={`text-lg font-medium ${getStatusColor(status)}`}>
          {status}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Controls</h2>
        <div className="flex gap-4">
          <button
            onClick={testSqlJsLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Test SQL.js Loading
          </button>
          <button
            onClick={clearLogs}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Activity Logs</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500 italic">No logs yet. Click "Test SQL.js Loading" to start.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <span className="text-gray-400 font-mono">[{log.timestamp}]</span>
                <span className={getLogColor(log.type)}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Debug Info */}
      {sqlJs && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
          <div className="space-y-2 text-sm">
            <div>SQL.js loaded: <span className="text-green-600">✅ Yes</span></div>
            <div>Database created: <span className="text-green-600">✅ Yes</span></div>
            <div>Window.initSqlJs available: <span className="text-green-600">✅ {window.initSqlJs ? 'Yes' : 'No'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleDatabaseTest; 