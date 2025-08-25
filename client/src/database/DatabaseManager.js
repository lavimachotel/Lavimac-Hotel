import { openDB } from 'idb';
import CryptoJS from 'crypto-js';

/**
 * Core Database Manager for Offline-First Hotel Management System
 * Handles SQLite in-browser database with IndexedDB persistence
 */
class DatabaseManager {
  constructor() {
    this.db = null;
    this.SQL = null;
    this.idbConnection = null;
    this.isInitialized = false;
    this.encryptionKey = this.generateEncryptionKey();
    
    // Database configuration
    this.DB_NAME = 'HotelManagementDB';
    this.DB_VERSION = 1;
    this.STORE_NAME = 'database';
  }

  /**
   * Initialize the database system
   */
  async initialize() {
    try {
      console.log('🔧 Initializing offline database system...');
      
      // Initialize SQL.js
      console.log('🔧 Step 1: Initializing SQL.js...');
      await this.initializeSQLjs();
      console.log('✅ Step 1 completed: SQL.js initialized');
      
      // Initialize IndexedDB connection
      console.log('🔧 Step 2: Initializing IndexedDB...');
      await this.initializeIndexedDB();
      console.log('✅ Step 2 completed: IndexedDB initialized');
      
      // Load existing database or create new one
      console.log('🔧 Step 3: Loading or creating database...');
      await this.loadOrCreateDatabase();
      console.log('✅ Step 3 completed: Database loaded/created');
      
      // Set initialized flag before migrations (needed for executeStatement)
      this.isInitialized = true;
      console.log('✅ Database core initialization completed');
      
      // Run initial migrations
      console.log('🔧 Step 4: Running migrations...');
      await this.runMigrations();
      console.log('✅ Step 4 completed: Migrations executed');
      
      console.log('✅ Database system initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      console.error('❌ Error details:', error.stack);
      throw error;
    }
  }

  /**
   * Initialize SQL.js library
   */
  async initializeSQLjs() {
    try {
      // Load SQL.js dynamically from CDN to avoid webpack bundling issues
      const initSqlJs = await this.loadSqlJsFromCDN();
      
      // Initialize SQL.js with WebAssembly
      this.SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
      });
      console.log('📦 SQL.js initialized from CDN');
    } catch (error) {
      console.error('Failed to initialize SQL.js:', error);
      throw error;
    }
  }

  /**
   * Load SQL.js library dynamically from CDN
   */
  async loadSqlJsFromCDN() {
    return new Promise((resolve, reject) => {
      console.log('📡 Checking if SQL.js is already loaded...');
      
      // Check if sql.js is already loaded
      if (window.initSqlJs) {
        console.log('✅ SQL.js already loaded from previous session');
        resolve(window.initSqlJs);
        return;
      }

      console.log('📡 Loading SQL.js from CDN: https://sql.js.org/dist/sql-wasm.js');
      
      // Create script element to load sql.js from CDN
      const script = document.createElement('script');
      script.src = 'https://sql.js.org/dist/sql-wasm.js';
      
      script.onload = () => {
        console.log('📡 SQL.js script loaded, checking window.initSqlJs...');
        if (window.initSqlJs) {
          console.log('✅ window.initSqlJs is available');
          resolve(window.initSqlJs);
        } else {
          console.error('❌ window.initSqlJs not available after script load');
          reject(new Error('SQL.js failed to load from CDN - initSqlJs not found'));
        }
      };
      
      script.onerror = (error) => {
        console.error('❌ Failed to load SQL.js script from CDN:', error);
        reject(new Error('Failed to load SQL.js script from CDN'));
      };
      
      // Add timeout for CDN loading
      setTimeout(() => {
        if (!window.initSqlJs) {
          console.error('❌ SQL.js CDN loading timeout');
          reject(new Error('SQL.js CDN loading timeout'));
        }
      }, 10000); // 10 second timeout
      
      document.head.appendChild(script);
      console.log('📡 SQL.js script element added to document head');
    });
  }

  /**
   * Initialize IndexedDB for persistent storage
   */
  async initializeIndexedDB() {
    try {
      this.idbConnection = await openDB(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Create object store for database file
          if (!db.objectStoreNames.contains('database')) {
            db.createObjectStore('database');
          }
          
          // Create object store for metadata
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata');
          }
          
          // Create object store for sync queue
          if (!db.objectStoreNames.contains('sync_queue')) {
            const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
            syncStore.createIndex('timestamp', 'timestamp');
            syncStore.createIndex('status', 'status');
          }
        },
      });
      console.log('📁 IndexedDB initialized');
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Load existing database from IndexedDB or create new one
   */
  async loadOrCreateDatabase() {
    try {
      // Try to load existing database
      const existingDb = await this.idbConnection.get('database', 'main');
      
      if (existingDb && existingDb.data) {
        console.log('📂 Loading existing database from IndexedDB...');
        
        // Decrypt the database
        const decryptedData = this.decryptData(existingDb.data);
        const dbArrayBuffer = new Uint8Array(decryptedData);
        
        // Create SQLite database from existing data
        this.db = new this.SQL.Database(dbArrayBuffer);
        console.log('✅ Existing database loaded successfully');
      } else {
        console.log('🆕 Creating new database...');
        
        // Create new empty database
        this.db = new this.SQL.Database();
        
        // Save initial empty database
        await this.saveDatabase();
        console.log('✅ New database created and saved');
      }
    } catch (error) {
      console.error('Failed to load or create database:', error);
      throw error;
    }
  }

  /**
   * Save current database state to IndexedDB
   */
  async saveDatabase() {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      // Export database to binary
      const dbBinary = this.db.export();
      
      // Encrypt the database
      const encryptedData = this.encryptData(dbBinary);
      
      // Save to IndexedDB
      await this.idbConnection.put('database', {
        data: encryptedData,
        timestamp: new Date().toISOString(),
        version: this.DB_VERSION
      }, 'main');
      
      console.log('💾 Database saved to IndexedDB');
      return true;
    } catch (error) {
      console.error('Failed to save database:', error);
      throw error;
    }
  }

  /**
   * Execute SQL query
   */
  executeQuery(sql, params = []) {
    try {
      if (!this.isInitialized) {
        throw new Error('Database not initialized. Call initialize() first.');
      }

      console.log('📝 Executing query:', sql, params);
      
      const stmt = this.db.prepare(sql);
      const result = stmt.getAsObject(params);
      stmt.free();
      
      return result;
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute SQL query and return all results
   */
  executeQueryAll(sql, params = []) {
    try {
      if (!this.isInitialized) {
        throw new Error('Database not initialized. Call initialize() first.');
      }

      console.log('📝 Executing query (all results):', sql, params);
      
      const stmt = this.db.prepare(sql);
      const results = [];
      
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      
      stmt.free();
      return results;
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute SQL statement (INSERT, UPDATE, DELETE)
   */
  async executeStatement(sql, params = []) {
    try {
      if (!this.isInitialized) {
        throw new Error('Database not initialized. Call initialize() first.');
      }

      console.log('🔄 Executing statement:', sql, params);
      
      const stmt = this.db.prepare(sql);
      stmt.run(params);
      stmt.free();
      
      // Auto-save after modifications
      await this.saveDatabase();
      
      return { success: true, changes: this.db.getRowsModified() };
    } catch (error) {
      console.error('Statement execution failed:', error);
      throw error;
    }
  }

  /**
   * Begin transaction
   */
  beginTransaction() {
    this.executeStatement('BEGIN TRANSACTION');
  }

  /**
   * Commit transaction
   */
  async commitTransaction() {
    await this.executeStatement('COMMIT');
  }

  /**
   * Rollback transaction
   */
  rollbackTransaction() {
    this.executeStatement('ROLLBACK');
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    try {
      console.log('🔄 Running database migrations...');
      
      // Create migrations table if it doesn't exist
      await this.executeStatement(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Import and run migration files
      const { createInitialSchema } = await import('./migrations/001_initial_schema.js');
      await this.runMigration('001_initial_schema', createInitialSchema);
      
      console.log('✅ Migrations completed');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Run a single migration
   */
  async runMigration(name, migrationFunction) {
    try {
      // Check if migration already executed
      const existing = this.executeQueryAll(
        'SELECT * FROM migrations WHERE name = ?',
        [name]
      );

      if (existing.length > 0) {
        console.log(`⏭️ Migration ${name} already executed, skipping`);
        return;
      }

      console.log(`🔄 Running migration: ${name}`);
      
      this.beginTransaction();
      
      try {
        // Execute migration
        await migrationFunction(this);
        
        // Record migration
        await this.executeStatement(
          'INSERT INTO migrations (name) VALUES (?)',
          [name]
        );
        
        await this.commitTransaction();
        console.log(`✅ Migration ${name} completed successfully`);
      } catch (error) {
        this.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      console.error(`Migration ${name} failed:`, error);
      throw error;
    }
  }

  /**
   * Generate encryption key for local data
   */
  generateEncryptionKey() {
    // In production, this should be derived from user credentials or stored securely
    const deviceId = this.getDeviceId();
    return CryptoJS.SHA256(deviceId + 'hotel_management_salt').toString();
  }

  /**
   * Get device identifier
   */
  getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(Array.from(data));
    return CryptoJS.AES.encrypt(dataString, this.encryptionKey).toString();
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    try {
      const parsed = JSON.parse(decryptedString);
      return new Uint8Array(parsed);
    } catch {
      return decryptedString;
    }
  }

  /**
   * Get database info
   */
  getDatabaseInfo() {
    return {
      isInitialized: this.isInitialized,
      version: this.DB_VERSION,
      name: this.DB_NAME,
      tables: this.getTables()
    };
  }

  /**
   * Get list of tables
   */
  getTables() {
    try {
      const result = this.executeQueryAll(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      return result.map(row => row.name);
    } catch (error) {
      console.error('Failed to get tables:', error);
      return [];
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    if (this.idbConnection) {
      this.idbConnection.close();
      this.idbConnection = null;
    }
    
    this.isInitialized = false;
    console.log('🧹 Database resources cleaned up');
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

export default databaseManager; 