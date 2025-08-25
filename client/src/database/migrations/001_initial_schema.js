/**
 * Initial Database Schema Migration
 * Creates all the core tables for offline hotel management system
 * Mirrors the current Supabase schema structure
 */

export async function createInitialSchema(db) {
  console.log('🏗️ Creating initial database schema...');

  // Create rooms table
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY,
      room_number TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Available',
      price DECIMAL(10, 2) NOT NULL,
      capacity INTEGER NOT NULL,
      amenities TEXT, -- JSON string for amenities array
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      -- Sync tracking
      synced_at DATETIME DEFAULT NULL,
      needs_sync BOOLEAN DEFAULT 0
    )
  `);

  // Create guests table
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      room TEXT,
      check_in_date DATE,
      check_out_date DATE,
      status TEXT DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      -- Sync tracking
      synced_at DATETIME DEFAULT NULL,
      needs_sync BOOLEAN DEFAULT 0
    )
  `);

  // Create reservations table
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER,
      room_id INTEGER,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status TEXT DEFAULT 'Confirmed',
      total_amount DECIMAL(10, 2) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      -- Sync tracking
      synced_at DATETIME DEFAULT NULL,
      needs_sync BOOLEAN DEFAULT 0,
      FOREIGN KEY (guest_id) REFERENCES guests(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )
  `);

  // Create invoices table
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_name TEXT NOT NULL,
      room_number TEXT NOT NULL,
      check_in_date TEXT NOT NULL,
      check_out_date TEXT NOT NULL,
      room_type TEXT NOT NULL DEFAULT 'Standard',
      nights INTEGER NOT NULL DEFAULT 1,
      room_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
      room_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
      service_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
      amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Pending',
      has_service_items BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      -- Sync tracking
      synced_at DATETIME DEFAULT NULL,
      needs_sync BOOLEAN DEFAULT 0
    )
  `);

  // Create invoice_items table
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      service_id INTEGER,
      item_name TEXT NOT NULL,
      item_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
      item_date TEXT,
      item_type TEXT DEFAULT 'service',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      -- Sync tracking
      synced_at DATETIME DEFAULT NULL,
      needs_sync BOOLEAN DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    )
  `);

  // Create user_profiles table
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      full_name TEXT,
      position TEXT,
      department TEXT,
      contact_number TEXT,
      role TEXT DEFAULT 'staff',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      -- Sync tracking
      synced_at DATETIME DEFAULT NULL,
      needs_sync BOOLEAN DEFAULT 0
    )
  `);

  // Create access_requests table
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS access_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      position TEXT NOT NULL,
      department TEXT NOT NULL,
      reason TEXT,
      contact_number TEXT,
      request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      processed_by TEXT,
      processed_at DATETIME,
      -- Sync tracking
      synced_at DATETIME DEFAULT NULL,
      needs_sync BOOLEAN DEFAULT 0
    )
  `);

  // Create services table
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL DEFAULT 0,
      category TEXT,
      available BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      -- Sync tracking
      synced_at DATETIME DEFAULT NULL,
      needs_sync BOOLEAN DEFAULT 0
    )
  `);

  // Create service_requests table
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER,
      room_number TEXT,
      service_id INTEGER,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
      assigned_to TEXT,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      -- Sync tracking
      synced_at DATETIME DEFAULT NULL,
      needs_sync BOOLEAN DEFAULT 0,
      FOREIGN KEY (guest_id) REFERENCES guests(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `);

  // Create tasks table
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
      due_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      -- Sync tracking
      synced_at DATETIME DEFAULT NULL,
      needs_sync BOOLEAN DEFAULT 0
    )
  `);

  // Create inventory_categories table
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS inventory_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      -- Sync tracking
      synced_at DATETIME DEFAULT NULL,
      needs_sync BOOLEAN DEFAULT 0
    )
  `);

  // Create inventory_items table
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      quantity INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'piece',
      min_quantity INTEGER DEFAULT 0,
      price DECIMAL(10, 2) DEFAULT 0,
      supplier TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      -- Sync tracking
      synced_at DATETIME DEFAULT NULL,
      needs_sync BOOLEAN DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES inventory_categories(id)
    )
  `);

  // Create reports table (for cached reports)
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT, -- JSON string
      parameters TEXT, -- JSON string
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      generated_by TEXT,
      -- Sync tracking
      synced_at DATETIME DEFAULT NULL,
      needs_sync BOOLEAN DEFAULT 0
    )
  `);

  // Create offline-specific tables

  // Sync queue for tracking changes that need to be synced
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
      data TEXT, -- JSON string of the record data
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'completed', 'failed'
      retry_count INTEGER DEFAULT 0,
      error_message TEXT,
      priority INTEGER DEFAULT 1 -- 1=high, 2=normal, 3=low
    )
  `);

  // Conflict log for tracking sync conflicts
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS conflict_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      local_data TEXT, -- JSON string
      server_data TEXT, -- JSON string
      conflict_type TEXT, -- 'update_conflict', 'delete_conflict', etc.
      resolution TEXT, -- 'local_wins', 'server_wins', 'manual', 'merged'
      resolved_data TEXT, -- JSON string of final resolved data
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      resolved_by TEXT
    )
  `);

  // Offline sessions for tracking user sessions
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS offline_sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_data TEXT, -- JSON string of user info
      start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE
    )
  `);

  // Local settings for offline configuration
  await db.executeStatement(`
    CREATE TABLE IF NOT EXISTS local_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  console.log('📊 Creating database indexes...');

  // Rooms indexes
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status)');
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(type)');
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_rooms_needs_sync ON rooms(needs_sync)');

  // Guests indexes
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_guests_room ON guests(room)');
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status)');
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_guests_needs_sync ON guests(needs_sync)');

  // Reservations indexes
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(start_date, end_date)');
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_reservations_guest ON reservations(guest_id)');
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_reservations_room ON reservations(room_id)');
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_reservations_needs_sync ON reservations(needs_sync)');

  // Invoices indexes
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)');
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(created_at)');
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_invoices_needs_sync ON invoices(needs_sync)');

  // Sync queue indexes
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_status)');
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority, timestamp)');
  await db.executeStatement('CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name)');

  // Insert default data
  console.log('📝 Inserting default data...');

  // Insert the 9 hotel rooms as specified in the current system
  await db.executeStatement(`
    INSERT OR IGNORE INTO rooms (id, room_number, type, status, price, capacity, amenities)
    VALUES 
      (101, 'Mint', 'Standard', 'Available', 500, 2, '["WiFi", "TV", "AC"]'),
      (102, 'Cinnamon', 'Standard', 'Available', 500, 2, '["WiFi", "TV", "AC"]'),
      (103, 'Basil', 'Standard', 'Available', 500, 2, '["WiFi", "TV", "AC"]'),
      (104, 'Licorice', 'Superior', 'Available', 750, 3, '["WiFi", "TV", "AC", "Mini Bar"]'),
      (105, 'Marigold', 'Superior', 'Available', 750, 3, '["WiFi", "TV", "AC", "Mini Bar"]'),
      (106, 'Lotus', 'Superior', 'Available', 750, 3, '["WiFi", "TV", "AC", "Mini Bar"]'),
      (107, 'Jasmine', 'Superior', 'Available', 750, 3, '["WiFi", "TV", "AC", "Mini Bar"]'),
      (108, 'Private', 'Superior', 'Available', 750, 3, '["WiFi", "TV", "AC", "Mini Bar"]'),
      (109, 'Chamomile', 'Executive', 'Available', 1250, 4, '["WiFi", "TV", "AC", "Mini Bar", "Jacuzzi", "Room Service"]')
  `);

  // Insert default service categories
  await db.executeStatement(`
    INSERT OR IGNORE INTO inventory_categories (id, name, description)
    VALUES 
      (1, 'Room Supplies', 'Items for room maintenance and guest comfort'),
      (2, 'Kitchen Supplies', 'Food and beverage items'),
      (3, 'Cleaning Supplies', 'Cleaning materials and equipment'),
      (4, 'Office Supplies', 'Administrative and office materials'),
      (5, 'Maintenance', 'Tools and materials for facility maintenance')
  `);

  // Insert default services
  await db.executeStatement(`
    INSERT OR IGNORE INTO services (id, name, description, price, category)
    VALUES 
      (1, 'Room Service', 'Food delivery to guest rooms', 25.00, 'Food & Beverage'),
      (2, 'Laundry Service', 'Washing and cleaning of guest clothes', 15.00, 'Personal Care'),
      (3, 'Airport Transfer', 'Transportation to/from airport', 50.00, 'Transportation'),
      (4, 'Spa Treatment', 'Relaxation and wellness services', 100.00, 'Wellness'),
      (5, 'Extra Towels', 'Additional towels for guest room', 5.00, 'Room Amenities'),
      (6, 'Late Checkout', 'Extended stay beyond checkout time', 30.00, 'Room Services')
  `);

  // Insert default settings
  await db.executeStatement(`
    INSERT OR IGNORE INTO local_settings (key, value, type)
    VALUES 
      ('hotel_name', 'The Green Royal Hotel', 'string'),
      ('currency', 'GHS', 'string'),
      ('timezone', 'GMT', 'string'),
      ('auto_sync_interval', '300', 'number'),
      ('offline_mode', 'true', 'boolean'),
      ('last_sync_timestamp', '', 'string'),
      ('sync_on_startup', 'true', 'boolean'),
      ('encrypt_local_data', 'true', 'boolean')
  `);

  console.log('✅ Initial database schema created successfully');
} 