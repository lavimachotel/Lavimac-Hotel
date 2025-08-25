import databaseManager from './DatabaseManager.js';
import RoomsRepository from './repositories/RoomsRepository.js';
import BaseRepository from './repositories/BaseRepository.js';

/**
 * Database Service
 * Main service for managing offline database operations
 * Provides centralized access to all repositories and database operations
 */
class DatabaseService {
  constructor() {
    this.isInitialized = false;
    this.repositories = {};
    this.db = databaseManager;
  }

  /**
   * Initialize the entire offline database system
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Database Service...');

      // Initialize the core database manager
      await this.db.initialize();

      // Initialize all repositories
      await this.initializeRepositories();

      // Initialize default data
      await this.initializeDefaultData();

      this.isInitialized = true;
      console.log('✅ Database Service initialized successfully');

      return {
        success: true,
        message: 'Database Service initialized successfully',
        info: this.getDatabaseInfo()
      };
    } catch (error) {
      console.error('❌ Failed to initialize Database Service:', error);
      throw error;
    }
  }

  /**
   * Initialize all repository instances
   */
  async initializeRepositories() {
    try {
      console.log('📚 Initializing repositories...');

      // Core repositories
      this.repositories.rooms = new RoomsRepository();
      this.repositories.guests = new BaseRepository('guests');
      this.repositories.reservations = new BaseRepository('reservations');
      this.repositories.invoices = new BaseRepository('invoices');
      this.repositories.invoiceItems = new BaseRepository('invoice_items');
      this.repositories.userProfiles = new BaseRepository('user_profiles', 'user_id');
      this.repositories.accessRequests = new BaseRepository('access_requests');
      this.repositories.services = new BaseRepository('services');
      this.repositories.serviceRequests = new BaseRepository('service_requests');
      this.repositories.tasks = new BaseRepository('tasks');
      this.repositories.inventoryCategories = new BaseRepository('inventory_categories');
      this.repositories.inventoryItems = new BaseRepository('inventory_items');
      this.repositories.reports = new BaseRepository('reports');

      // Offline-specific repositories
      this.repositories.syncQueue = new BaseRepository('sync_queue');
      this.repositories.conflictLog = new BaseRepository('conflict_log');
      this.repositories.offlineSessions = new BaseRepository('offline_sessions', 'session_id');
      this.repositories.localSettings = new BaseRepository('local_settings', 'key');

      console.log('✅ Repositories initialized');
    } catch (error) {
      console.error('Failed to initialize repositories:', error);
      throw error;
    }
  }

  /**
   * Initialize default data for new installations
   */
  async initializeDefaultData() {
    try {
      console.log('📊 Initializing default data...');

      // Initialize default rooms
      await this.repositories.rooms.initializeDefaultRooms();

      // Initialize default settings if they don't exist
      await this.initializeDefaultSettings();

      console.log('✅ Default data initialized');
    } catch (error) {
      console.error('Failed to initialize default data:', error);
      throw error;
    }
  }

  /**
   * Initialize default settings
   */
  async initializeDefaultSettings() {
    try {
      const existingSettings = await this.repositories.localSettings.count();
      if (existingSettings > 0) {
        console.log('⏭️ Default settings already exist, skipping initialization');
        return;
      }

      const defaultSettings = [
        { key: 'hotel_name', value: 'Lavimac Royal Hotel', type: 'string' },
        { key: 'currency', value: 'GHS', type: 'string' },
        { key: 'timezone', value: 'GMT', type: 'string' },
        { key: 'auto_sync_interval', value: '300', type: 'number' },
        { key: 'offline_mode', value: 'true', type: 'boolean' },
        { key: 'last_sync_timestamp', value: '', type: 'string' },
        { key: 'sync_on_startup', value: 'true', type: 'boolean' },
        { key: 'encrypt_local_data', value: 'true', type: 'boolean' },
        { key: 'database_version', value: '1.0.0', type: 'string' },
        { key: 'first_setup_completed', value: 'true', type: 'boolean' }
      ];

      await this.repositories.localSettings.bulkCreate(defaultSettings, true);
      console.log('✅ Default settings initialized');
    } catch (error) {
      console.error('Failed to initialize default settings:', error);
      throw error;
    }
  }

  /**
   * Get repository by name
   */
  getRepository(name) {
    if (!this.isInitialized) {
      throw new Error('Database Service not initialized. Call initialize() first.');
    }

    if (!this.repositories[name]) {
      throw new Error(`Repository '${name}' not found`);
    }

    return this.repositories[name];
  }

  /**
   * Get all repositories
   */
  getAllRepositories() {
    if (!this.isInitialized) {
      throw new Error('Database Service not initialized. Call initialize() first.');
    }

    return this.repositories;
  }

  /**
   * Execute a transaction across multiple repositories
   */
  async executeTransaction(operations) {
    try {
      this.db.beginTransaction();

      const results = [];
      for (const operation of operations) {
        const { repository, method, args } = operation;
        const repo = this.getRepository(repository);
        const result = await repo[method](...args);
        results.push(result);
      }

      await this.db.commitTransaction();
      return results;
    } catch (error) {
      this.db.rollbackTransaction();
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Get database information and statistics
   */
  getDatabaseInfo() {
    if (!this.isInitialized) {
      return { initialized: false };
    }

    const dbInfo = this.db.getDatabaseInfo();
    const repositoryCount = Object.keys(this.repositories).length;

    return {
      ...dbInfo,
      repositoriesLoaded: repositoryCount,
      repositories: Object.keys(this.repositories)
    };
  }

  /**
   * Get database statistics
   */
  async getDatabaseStatistics() {
    try {
      if (!this.isInitialized) {
        throw new Error('Database Service not initialized');
      }

      const stats = {};

      // Get record counts for each main table
      const mainTables = ['rooms', 'guests', 'reservations', 'invoices', 'services', 'tasks'];
      
      for (const table of mainTables) {
        if (this.repositories[table]) {
          stats[table] = await this.repositories[table].count();
        }
      }

      // Get sync queue statistics
      if (this.repositories.syncQueue) {
        const pendingSync = await this.repositories.syncQueue.count({ sync_status: 'pending' });
        const failedSync = await this.repositories.syncQueue.count({ sync_status: 'failed' });
        
        stats.sync = {
          pending: pendingSync,
          failed: failedSync,
          total: await this.repositories.syncQueue.count()
        };
      }

      return stats;
    } catch (error) {
      console.error('Error getting database statistics:', error);
      throw error;
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      const health = {
        status: 'healthy',
        checks: [],
        timestamp: new Date().toISOString()
      };

      // Check if database is initialized
      health.checks.push({
        name: 'Database Initialized',
        status: this.isInitialized ? 'pass' : 'fail',
        message: this.isInitialized ? 'Database is initialized' : 'Database not initialized'
      });

      // Check table integrity
      try {
        const tables = this.db.getTables();
        health.checks.push({
          name: 'Table Integrity',
          status: tables.length > 0 ? 'pass' : 'fail',
          message: `${tables.length} tables found`,
          details: tables
        });
      } catch (error) {
        health.checks.push({
          name: 'Table Integrity',
          status: 'fail',
          message: 'Failed to check tables',
          error: error.message
        });
      }

      // Check sync queue health
      if (this.repositories.syncQueue) {
        try {
          const failedSync = await this.repositories.syncQueue.count({ sync_status: 'failed' });
          health.checks.push({
            name: 'Sync Health',
            status: failedSync === 0 ? 'pass' : 'warning',
            message: `${failedSync} failed sync operations`,
            failedCount: failedSync
          });
        } catch (error) {
          health.checks.push({
            name: 'Sync Health',
            status: 'fail',
            message: 'Failed to check sync queue',
            error: error.message
          });
        }
      }

      // Overall health status
      const failedChecks = health.checks.filter(check => check.status === 'fail');
      const warningChecks = health.checks.filter(check => check.status === 'warning');

      if (failedChecks.length > 0) {
        health.status = 'unhealthy';
      } else if (warningChecks.length > 0) {
        health.status = 'warning';
      }

      return health;
    } catch (error) {
      console.error('Error checking database health:', error);
      return {
        status: 'error',
        message: 'Failed to check database health',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Reset database (for development/testing)
   */
  async resetDatabase() {
    try {
      console.log('⚠️ Resetting database...');

      // Clear all data
      const tables = this.db.getTables();
      for (const table of tables) {
        if (table !== 'migrations') {
          await this.db.executeStatement(`DELETE FROM ${table}`);
        }
      }

      // Reinitialize default data
      await this.initializeDefaultData();

      console.log('✅ Database reset completed');
      return true;
    } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
    }
  }

  /**
   * Cleanup and close database connections
   */
  cleanup() {
    try {
      console.log('🧹 Cleaning up Database Service...');
      
      this.repositories = {};
      this.isInitialized = false;
      
      if (this.db) {
        this.db.cleanup();
      }
      
      console.log('✅ Database Service cleanup completed');
    } catch (error) {
      console.error('Error during Database Service cleanup:', error);
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;