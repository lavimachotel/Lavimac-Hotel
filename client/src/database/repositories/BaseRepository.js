import databaseManager from '../DatabaseManager.js';

/**
 * Base Repository Class
 * Provides common CRUD operations and sync tracking for all entities
 */
export default class BaseRepository {
  constructor(tableName, primaryKey = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.db = databaseManager;
  }

  /**
   * Find record by ID
   */
  async findById(id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
      const result = this.db.executeQueryAll(query, [id]);
      return result.length > 0 ? this.formatRecord(result[0]) : null;
    } catch (error) {
      console.error(`Error finding ${this.tableName} by ID:`, error);
      throw error;
    }
  }

  /**
   * Find all records with optional conditions
   */
  async findAll(conditions = {}, orderBy = null, limit = null) {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];

      // Add WHERE conditions
      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map(key => `${key} = ?`)
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }

      // Add ORDER BY
      if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
      }

      // Add LIMIT
      if (limit) {
        query += ` LIMIT ${limit}`;
      }

      const results = this.db.executeQueryAll(query, params);
      return results.map(record => this.formatRecord(record));
    } catch (error) {
      console.error(`Error finding all ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Find records with custom SQL query
   */
  async findByQuery(query, params = []) {
    try {
      const results = this.db.executeQueryAll(query, params);
      return results.map(record => this.formatRecord(record));
    } catch (error) {
      console.error(`Error executing custom query on ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Create new record
   */
  async create(data) {
    try {
      // Add metadata
      const recordData = {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        needs_sync: 1
      };

      // Remove undefined values
      Object.keys(recordData).forEach(key => 
        recordData[key] === undefined && delete recordData[key]
      );

      const columns = Object.keys(recordData);
      const placeholders = columns.map(() => '?').join(', ');
      const values = Object.values(recordData);

      const query = `
        INSERT INTO ${this.tableName} (${columns.join(', ')})
        VALUES (${placeholders})
      `;

      const result = await this.db.executeStatement(query, values);
      
      if (result.success) {
        // Get the inserted record
        const insertedId = this.db.db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
        const newRecord = await this.findById(insertedId);
        
        // Add to sync queue
        await this.addToSyncQueue('INSERT', insertedId, newRecord);
        
        console.log(`✅ Created new ${this.tableName} record with ID: ${insertedId}`);
        return newRecord;
      }
      
      throw new Error('Failed to create record');
    } catch (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Update record by ID
   */
  async update(id, data) {
    try {
      // Get current record for conflict tracking
      const currentRecord = await this.findById(id);
      if (!currentRecord) {
        throw new Error(`Record with ID ${id} not found`);
      }

      // Add metadata
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
        needs_sync: 1
      };

      // Remove undefined values and primary key
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || key === this.primaryKey) {
          delete updateData[key];
        }
      });

      const columns = Object.keys(updateData);
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const values = [...Object.values(updateData), id];

      const query = `
        UPDATE ${this.tableName} 
        SET ${setClause}
        WHERE ${this.primaryKey} = ?
      `;

      const result = await this.db.executeStatement(query, values);
      
      if (result.success) {
        const updatedRecord = await this.findById(id);
        
        // Add to sync queue
        await this.addToSyncQueue('UPDATE', id, updatedRecord, currentRecord);
        
        console.log(`✅ Updated ${this.tableName} record with ID: ${id}`);
        return updatedRecord;
      }
      
      throw new Error('Failed to update record');
    } catch (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete record by ID
   */
  async delete(id) {
    try {
      // Get current record for sync queue
      const currentRecord = await this.findById(id);
      if (!currentRecord) {
        throw new Error(`Record with ID ${id} not found`);
      }

      const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
      const result = await this.db.executeStatement(query, [id]);
      
      if (result.success) {
        // Add to sync queue
        await this.addToSyncQueue('DELETE', id, null, currentRecord);
        
        console.log(`✅ Deleted ${this.tableName} record with ID: ${id}`);
        return true;
      }
      
      throw new Error('Failed to delete record');
    } catch (error) {
      console.error(`Error deleting ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Count records with optional conditions
   */
  async count(conditions = {}) {
    try {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const params = [];

      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map(key => `${key} = ?`)
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }

      const result = this.db.executeQuery(query, params);
      return result.count || 0;
    } catch (error) {
      console.error(`Error counting ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Check if record exists
   */
  async exists(id) {
    try {
      const query = `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = ? LIMIT 1`;
      const result = this.db.executeQueryAll(query, [id]);
      return result.length > 0;
    } catch (error) {
      console.error(`Error checking if ${this.tableName} exists:`, error);
      return false;
    }
  }

  /**
   * Get records that need syncing
   */
  async getUnsynced() {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE needs_sync = 1`;
      const results = this.db.executeQueryAll(query);
      return results.map(record => this.formatRecord(record));
    } catch (error) {
      console.error(`Error getting unsynced ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Mark record as synced
   */
  async markAsSynced(id) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET needs_sync = 0, synced_at = ? 
        WHERE ${this.primaryKey} = ?
      `;
      const result = await this.db.executeStatement(query, [new Date().toISOString(), id]);
      return result.success;
    } catch (error) {
      console.error(`Error marking ${this.tableName} as synced:`, error);
      throw error;
    }
  }

  /**
   * Bulk create records (for sync operations)
   */
  async bulkCreate(records, markSynced = false) {
    try {
      const createdRecords = [];
      
      this.db.beginTransaction();
      
      try {
        for (const record of records) {
          const recordData = {
            ...record,
            created_at: record.created_at || new Date().toISOString(),
            updated_at: record.updated_at || new Date().toISOString(),
            needs_sync: markSynced ? 0 : 1,
            synced_at: markSynced ? new Date().toISOString() : null
          };

          // Remove undefined values
          Object.keys(recordData).forEach(key => 
            recordData[key] === undefined && delete recordData[key]
          );

          const columns = Object.keys(recordData);
          const placeholders = columns.map(() => '?').join(', ');
          const values = Object.values(recordData);

          const query = `
            INSERT INTO ${this.tableName} (${columns.join(', ')})
            VALUES (${placeholders})
          `;

          await this.db.executeStatement(query, values);
          
          // Get the inserted record
          const insertedId = this.db.db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
          const newRecord = await this.findById(insertedId);
          createdRecords.push(newRecord);
        }
        
        await this.db.commitTransaction();
        console.log(`✅ Bulk created ${records.length} ${this.tableName} records`);
        return createdRecords;
      } catch (error) {
        this.db.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      console.error(`Error bulk creating ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Add operation to sync queue
   */
  async addToSyncQueue(operation, recordId, newData = null, oldData = null) {
    try {
      const priority = this.getSyncPriority(operation);
      
      const syncData = {
        table_name: this.tableName,
        record_id: recordId.toString(),
        operation: operation,
        data: newData ? JSON.stringify(newData) : null,
        old_data: oldData ? JSON.stringify(oldData) : null,
        timestamp: new Date().toISOString(),
        sync_status: 'pending',
        priority: priority
      };

      const columns = Object.keys(syncData);
      const placeholders = columns.map(() => '?').join(', ');
      const values = Object.values(syncData);

      const query = `
        INSERT INTO sync_queue (${columns.join(', ')})
        VALUES (${placeholders})
      `;

      await this.db.executeStatement(query, values);
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      // Don't throw here to avoid breaking main operations
    }
  }

  /**
   * Get sync priority based on table and operation
   */
  getSyncPriority(operation) {
    // High priority tables (financial data)
    const highPriorityTables = ['invoices', 'invoice_items'];
    // Critical operations
    const criticalOperations = ['DELETE'];
    
    if (highPriorityTables.includes(this.tableName) || criticalOperations.includes(operation)) {
      return 1; // High priority
    }
    
    return 2; // Normal priority
  }

  /**
   * Format record (override in subclasses for custom formatting)
   */
  formatRecord(record) {
    if (!record) return null;

    // Parse JSON fields if they exist
    const formattedRecord = { ...record };
    
    // Convert SQLite boolean values
    ['needs_sync', 'has_service_items', 'available'].forEach(field => {
      if (formattedRecord[field] !== undefined) {
        formattedRecord[field] = Boolean(formattedRecord[field]);
      }
    });

    // Parse JSON amenities for rooms
    if (this.tableName === 'rooms' && formattedRecord.amenities) {
      try {
        formattedRecord.amenities = JSON.parse(formattedRecord.amenities);
      } catch (e) {
        console.warn('Failed to parse amenities JSON:', e);
      }
    }

    return formattedRecord;
  }

  /**
   * Execute raw SQL query (use with caution)
   */
  async executeRawQuery(query, params = []) {
    try {
      return this.db.executeQueryAll(query, params);
    } catch (error) {
      console.error('Error executing raw query:', error);
      throw error;
    }
  }

  /**
   * Get table info
   */
  getTableInfo() {
    return {
      name: this.tableName,
      primaryKey: this.primaryKey,
      columns: this.getTableColumns()
    };
  }

  /**
   * Get table columns
   */
  getTableColumns() {
    try {
      const query = `PRAGMA table_info(${this.tableName})`;
      const result = this.db.executeQueryAll(query);
      return result.map(column => ({
        name: column.name,
        type: column.type,
        nullable: !column.notnull,
        defaultValue: column.dflt_value,
        primaryKey: Boolean(column.pk)
      }));
    } catch (error) {
      console.error(`Error getting ${this.tableName} columns:`, error);
      return [];
    }
  }
}