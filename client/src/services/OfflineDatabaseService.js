/**
 * Offline Database Service
 * Simplified interface for React components to interact with the offline database
 * Uses CDN loading to avoid webpack issues
 */

class OfflineDatabaseService {
  constructor() {
    this.isInitialized = false;
    this.db = null;
    this.SQL = null;
    this.initPromise = null;
  }

  /**
   * Initialize the database (call once)
   */
  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  async _doInitialize() {
    try {
      console.log('🔄 Initializing Offline Database Service...');

      // Load SQL.js from CDN
      if (!window.initSqlJs) {
        await this._loadSqlJs();
      }

      // Initialize SQL.js
      this.SQL = await window.initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });

      // Create database
      this.db = new this.SQL.Database();

      // Create tables
      await this._createTables();

      // Insert default data
      await this._insertDefaultData();

      this.isInitialized = true;
      console.log('✅ Offline Database Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Error initializing database service:', error);
      throw error;
    }
  }

  /**
   * Load SQL.js from CDN
   */
  async _loadSqlJs() {
    return new Promise((resolve, reject) => {
      if (window.initSqlJs) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Create database tables
   */
  async _createTables() {
    const createRoomsTable = `
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_number TEXT UNIQUE NOT NULL,
        room_type TEXT NOT NULL,
        price_per_night DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'Available',
        amenities TEXT,
        max_occupancy INTEGER DEFAULT 2,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        needs_sync INTEGER DEFAULT 1
      )
    `;

    const createGuestsTable = `
      CREATE TABLE IF NOT EXISTS guests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        address TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        needs_sync INTEGER DEFAULT 1
      )
    `;

    const createReservationsTable = `
      CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guest_id INTEGER NOT NULL,
        room_id INTEGER NOT NULL,
        check_in_date TEXT NOT NULL,
        check_out_date TEXT NOT NULL,
        total_amount DECIMAL(10,2),
        status TEXT DEFAULT 'Confirmed',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        needs_sync INTEGER DEFAULT 1,
        FOREIGN KEY (guest_id) REFERENCES guests(id),
        FOREIGN KEY (room_id) REFERENCES rooms(id)
      )
    `;

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        fullName TEXT NOT NULL,
        role TEXT DEFAULT 'staff',
        department TEXT,
        avatar_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        needs_sync INTEGER DEFAULT 1
      )
    `;

    this.db.run(createRoomsTable);
    this.db.run(createGuestsTable);
    this.db.run(createReservationsTable);
    this.db.run(createUsersTable);
  }

  /**
   * Insert default room data
   */
  async _insertDefaultData() {
    const rooms = [
      { room_number: 'Mint', room_type: 'Standard', price: 150.00, description: 'Cozy standard room with mint green decor' },
      { room_number: 'Cinnamon', room_type: 'Standard', price: 150.00, description: 'Warm standard room with cinnamon brown tones' },
      { room_number: 'Basil', room_type: 'Standard', price: 150.00, description: 'Fresh standard room with basil green accents' },
      { room_number: 'Licorice', room_type: 'Deluxe', price: 200.00, description: 'Elegant deluxe room with dark sophisticated styling' },
      { room_number: 'Marigold', room_type: 'Deluxe', price: 200.00, description: 'Bright deluxe room with golden marigold themes' },
      { room_number: 'Lotus', room_type: 'Suite', price: 300.00, description: 'Luxurious suite with lotus-inspired zen design' },
      { room_number: 'Jasmine', room_type: 'Suite', price: 300.00, description: 'Premium suite with jasmine white and gold accents' },
      { room_number: 'Private', room_type: 'Private', price: 500.00, description: 'Exclusive private room with premium amenities' },
      { room_number: 'Chamomile', room_type: 'Standard', price: 150.00, description: 'Relaxing standard room with chamomile yellow tones' }
    ];

    for (const room of rooms) {
      const amenities = JSON.stringify(['WiFi', 'TV', 'Air Conditioning', 'Mini Bar']);
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO rooms (room_number, room_type, price_per_night, amenities, description, status)
        VALUES (?, ?, ?, ?, ?, 'Available')
      `);
      stmt.run([room.room_number, room.room_type, room.price, amenities, room.description]);
      stmt.free();
    }
  }

  /**
   * Check if database is ready
   */
  isReady() {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Get all rooms
   */
  async getRooms() {
    if (!this.isReady()) {
      await this.initialize();
    }

    try {
      const result = this.db.exec("SELECT * FROM rooms ORDER BY room_number");
      if (result.length === 0) return [];

      const columns = result[0].columns;
      const rows = result[0].values;

      return rows.map(row => {
        const room = {};
        columns.forEach((col, index) => {
          room[col] = row[index];
        });
        
        // Parse amenities JSON
        if (room.amenities) {
          try {
            room.amenities = JSON.parse(room.amenities);
          } catch (e) {
            room.amenities = [];
          }
        }
        
        return room;
      });
    } catch (error) {
      console.error('Error getting rooms:', error);
      throw error;
    }
  }

  /**
   * Get rooms by status
   */
  async getRoomsByStatus(status) {
    if (!this.isReady()) {
      await this.initialize();
    }

    try {
      const result = this.db.exec("SELECT * FROM rooms WHERE status = ? ORDER BY room_number", [status]);
      if (result.length === 0) return [];

      const columns = result[0].columns;
      const rows = result[0].values;

      return rows.map(row => {
        const room = {};
        columns.forEach((col, index) => {
          room[col] = row[index];
        });
        return room;
      });
    } catch (error) {
      console.error('Error getting rooms by status:', error);
      throw error;
    }
  }

  /**
   * Update room status
   */
  async updateRoomStatus(roomId, status) {
    if (!this.isReady()) {
      await this.initialize();
    }

    try {
      const stmt = this.db.prepare(`
        UPDATE rooms 
        SET status = ?, updated_at = ?, needs_sync = 1
        WHERE id = ?
      `);
      stmt.run([status, new Date().toISOString(), roomId]);
      stmt.free();

      console.log(`✅ Updated room ${roomId} status to ${status}`);
      return true;
    } catch (error) {
      console.error('Error updating room status:', error);
      throw error;
    }
  }

  /**
   * Get room by number
   */
  async getRoomByNumber(roomNumber) {
    if (!this.isReady()) {
      await this.initialize();
    }

    try {
      const result = this.db.exec("SELECT * FROM rooms WHERE room_number = ?", [roomNumber]);
      if (result.length === 0) return null;

      const columns = result[0].columns;
      const row = result[0].values[0];

      const room = {};
      columns.forEach((col, index) => {
        room[col] = row[index];
      });

      // Parse amenities JSON
      if (room.amenities) {
        try {
          room.amenities = JSON.parse(room.amenities);
        } catch (e) {
          room.amenities = [];
        }
      }

      return room;
    } catch (error) {
      console.error('Error getting room by number:', error);
      throw error;
    }
  }

  /**
   * Create a new guest
   */
  async createGuest(guestData) {
    if (!this.isReady()) {
      await this.initialize();
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO guests (first_name, last_name, email, phone, address, created_at, updated_at, needs_sync)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `);
      
      const now = new Date().toISOString();
      stmt.run([
        guestData.first_name,
        guestData.last_name,
        guestData.email,
        guestData.phone,
        guestData.address,
        now,
        now
      ]);
      stmt.free();

      // Get the inserted guest
      const insertedId = this.db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
      console.log(`✅ Created new guest with ID: ${insertedId}`);
      
      return insertedId;
    } catch (error) {
      console.error('Error creating guest:', error);
      throw error;
    }
  }

  /**
   * Create a new reservation
   */
  async createReservation(reservationData) {
    if (!this.isReady()) {
      await this.initialize();
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, total_amount, status, created_at, updated_at, needs_sync)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);
      
      const now = new Date().toISOString();
      stmt.run([
        reservationData.guest_id,
        reservationData.room_id,
        reservationData.check_in_date,
        reservationData.check_out_date,
        reservationData.total_amount,
        reservationData.status || 'Confirmed',
        now,
        now
      ]);
      stmt.free();

      // Get the inserted reservation
      const insertedId = this.db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
      console.log(`✅ Created new reservation with ID: ${insertedId}`);
      
      return insertedId;
    } catch (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    if (!this.isReady()) {
      await this.initialize();
    }

    try {
      const roomCount = this.db.exec("SELECT COUNT(*) as count FROM rooms")[0].values[0][0];
      const availableRooms = this.db.exec("SELECT COUNT(*) as count FROM rooms WHERE status = 'Available'")[0].values[0][0];
      const occupiedRooms = this.db.exec("SELECT COUNT(*) as count FROM rooms WHERE status = 'Occupied'")[0].values[0][0];
      const guestCount = this.db.exec("SELECT COUNT(*) as count FROM guests")[0].values[0][0];
      const reservationCount = this.db.exec("SELECT COUNT(*) as count FROM reservations")[0].values[0][0];

      return {
        totalRooms: roomCount,
        availableRooms,
        occupiedRooms,
        totalGuests: guestCount,
        totalReservations: reservationCount,
        occupancyRate: roomCount > 0 ? ((occupiedRooms / roomCount) * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    if (!this.isReady()) {
      await this.initialize();
    }

    try {
      const result = this.db.exec("SELECT * FROM users WHERE email = ?", [email]);
      if (result.length === 0) return null;

      const columns = result[0].columns;
      const row = result[0].values[0];

      const user = {};
      columns.forEach((col, index) => {
        user[col] = row[index];
      });

      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData) {
    if (!this.isReady()) {
      await this.initialize();
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (email, fullName, role, department, avatar_url, created_at, updated_at, needs_sync)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `);
      
      const now = new Date().toISOString();
      stmt.run([
        userData.email,
        userData.fullName,
        userData.role || 'staff',
        userData.department,
        userData.avatar_url || '',
        now,
        now
      ]);
      stmt.free();

      // Get the inserted user
      const insertedId = this.db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
      console.log(`✅ Created new user with ID: ${insertedId}`);
      
      return insertedId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
}

// Create singleton instance
const offlineDatabaseService = new OfflineDatabaseService();

export default offlineDatabaseService; 