import BaseRepository from './BaseRepository.js';

/**
 * Rooms Repository
 * Handles all room-related database operations
 */
export default class RoomsRepository extends BaseRepository {
  constructor() {
    super('rooms', 'id');
  }

  /**
   * Get all rooms with their current status
   */
  async getAllRooms() {
    try {
      return await this.findAll({}, 'id ASC');
    } catch (error) {
      console.error('Error getting all rooms:', error);
      throw error;
    }
  }

  /**
   * Get rooms by status
   */
  async getRoomsByStatus(status) {
    try {
      return await this.findAll({ status }, 'room_number ASC');
    } catch (error) {
      console.error('Error getting rooms by status:', error);
      throw error;
    }
  }

  /**
   * Get available rooms
   */
  async getAvailableRooms() {
    try {
      return await this.getRoomsByStatus('Available');
    } catch (error) {
      console.error('Error getting available rooms:', error);
      throw error;
    }
  }

  /**
   * Get occupied rooms
   */
  async getOccupiedRooms() {
    try {
      return await this.getRoomsByStatus('Occupied');
    } catch (error) {
      console.error('Error getting occupied rooms:', error);
      throw error;
    }
  }

  /**
   * Get rooms by type
   */
  async getRoomsByType(type) {
    try {
      return await this.findAll({ type }, 'room_number ASC');
    } catch (error) {
      console.error('Error getting rooms by type:', error);
      throw error;
    }
  }

  /**
   * Get room by room number
   */
  async getRoomByNumber(roomNumber) {
    try {
      const rooms = await this.findAll({ room_number: roomNumber });
      return rooms.length > 0 ? rooms[0] : null;
    } catch (error) {
      console.error('Error getting room by number:', error);
      throw error;
    }
  }

  /**
   * Update room status
   */
  async updateRoomStatus(roomId, status) {
    try {
      return await this.update(roomId, { status });
    } catch (error) {
      console.error('Error updating room status:', error);
      throw error;
    }
  }

  /**
   * Check in guest to room
   */
  async checkInRoom(roomId) {
    try {
      const room = await this.findById(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} not found`);
      }

      if (room.status !== 'Available') {
        throw new Error(`Room ${room.room_number} is not available for check-in. Current status: ${room.status}`);
      }

      return await this.updateRoomStatus(roomId, 'Occupied');
    } catch (error) {
      console.error('Error checking in room:', error);
      throw error;
    }
  }

  /**
   * Check out guest from room
   */
  async checkOutRoom(roomId) {
    try {
      const room = await this.findById(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} not found`);
      }

      if (room.status !== 'Occupied') {
        throw new Error(`Room ${room.room_number} is not occupied. Current status: ${room.status}`);
      }

      return await this.updateRoomStatus(roomId, 'Available');
    } catch (error) {
      console.error('Error checking out room:', error);
      throw error;
    }
  }

  /**
   * Set room to maintenance
   */
  async setRoomMaintenance(roomId) {
    try {
      return await this.updateRoomStatus(roomId, 'Maintenance');
    } catch (error) {
      console.error('Error setting room maintenance:', error);
      throw error;
    }
  }

  /**
   * Set room to cleaning
   */
  async setRoomCleaning(roomId) {
    try {
      return await this.updateRoomStatus(roomId, 'Cleaning');
    } catch (error) {
      console.error('Error setting room cleaning:', error);
      throw error;
    }
  }

  /**
   * Get room statistics
   */
  async getRoomStatistics() {
    try {
      const stats = await this.findByQuery(`
        SELECT 
          status,
          COUNT(*) as count,
          type,
          AVG(price) as avg_price
        FROM ${this.tableName} 
        GROUP BY status, type
        ORDER BY status, type
      `);

      // Get total counts by status
      const statusCounts = await this.findByQuery(`
        SELECT 
          status,
          COUNT(*) as count
        FROM ${this.tableName} 
        GROUP BY status
      `);

      // Get type distribution
      const typeDistribution = await this.findByQuery(`
        SELECT 
          type,
          COUNT(*) as count,
          AVG(price) as avg_price
        FROM ${this.tableName} 
        GROUP BY type
        ORDER BY count DESC
      `);

      return {
        statusBreakdown: stats,
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {}),
        typeDistribution,
        totalRooms: await this.count()
      };
    } catch (error) {
      console.error('Error getting room statistics:', error);
      throw error;
    }
  }

  /**
   * Get rooms with capacity filter
   */
  async getRoomsByCapacity(minCapacity, maxCapacity = null) {
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE capacity >= ?`;
      const params = [minCapacity];

      if (maxCapacity) {
        query += ' AND capacity <= ?';
        params.push(maxCapacity);
      }

      query += ' ORDER BY capacity ASC, room_number ASC';

      return await this.findByQuery(query, params);
    } catch (error) {
      console.error('Error getting rooms by capacity:', error);
      throw error;
    }
  }

  /**
   * Get rooms within price range
   */
  async getRoomsByPriceRange(minPrice, maxPrice) {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE price >= ? AND price <= ?
        ORDER BY price ASC, room_number ASC
      `;
      return await this.findByQuery(query, [minPrice, maxPrice]);
    } catch (error) {
      console.error('Error getting rooms by price range:', error);
      throw error;
    }
  }

  /**
   * Search rooms by amenities
   */
  async searchRoomsByAmenities(amenities) {
    try {
      // For SQLite, we'll need to search within the JSON string
      let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
      const params = [];

      amenities.forEach((amenity, index) => {
        query += ` AND amenities LIKE ?`;
        params.push(`%"${amenity}"%`);
      });

      query += ' ORDER BY room_number ASC';

      return await this.findByQuery(query, params);
    } catch (error) {
      console.error('Error searching rooms by amenities:', error);
      throw error;
    }
  }

  /**
   * Get room occupancy rate
   */
  async getOccupancyRate() {
    try {
      const totalRooms = await this.count();
      const occupiedRooms = await this.count({ status: 'Occupied' });
      
      const rate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
      
      return {
        totalRooms,
        occupiedRooms,
        availableRooms: totalRooms - occupiedRooms,
        occupancyRate: Math.round(rate * 100) / 100 // Round to 2 decimal places
      };
    } catch (error) {
      console.error('Error getting occupancy rate:', error);
      throw error;
    }
  }

  /**
   * Get room revenue statistics
   */
  async getRevenueStatistics() {
    try {
      const stats = await this.findByQuery(`
        SELECT 
          type,
          COUNT(*) as room_count,
          AVG(price) as avg_price,
          MIN(price) as min_price,
          MAX(price) as max_price,
          SUM(CASE WHEN status = 'Occupied' THEN price ELSE 0 END) as current_revenue
        FROM ${this.tableName} 
        GROUP BY type
        ORDER BY avg_price DESC
      `);

      const totalRevenue = await this.findByQuery(`
        SELECT SUM(CASE WHEN status = 'Occupied' THEN price ELSE 0 END) as total_revenue
        FROM ${this.tableName}
      `);

      return {
        byType: stats,
        totalCurrentRevenue: totalRevenue[0]?.total_revenue || 0
      };
    } catch (error) {
      console.error('Error getting revenue statistics:', error);
      throw error;
    }
  }

  /**
   * Get rooms due for maintenance (example: based on last maintenance date)
   */
  async getRoomsDueForMaintenance(daysThreshold = 30) {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
      
      // For now, return rooms that are currently in maintenance
      // In a real system, you'd have maintenance history tracking
      return await this.findAll({ status: 'Maintenance' });
    } catch (error) {
      console.error('Error getting rooms due for maintenance:', error);
      throw error;
    }
  }

  /**
   * Update room amenities
   */
  async updateRoomAmenities(roomId, amenities) {
    try {
      const amenitiesJson = JSON.stringify(amenities);
      return await this.update(roomId, { amenities: amenitiesJson });
    } catch (error) {
      console.error('Error updating room amenities:', error);
      throw error;
    }
  }

  /**
   * Format record with proper amenities parsing
   */
  formatRecord(record) {
    const formatted = super.formatRecord(record);
    
    if (formatted && formatted.amenities) {
      try {
        // Parse amenities if it's a string
        if (typeof formatted.amenities === 'string') {
          formatted.amenities = JSON.parse(formatted.amenities);
        }
      } catch (error) {
        console.warn('Failed to parse room amenities:', error);
        formatted.amenities = [];
      }
    }

    return formatted;
  }

  /**
   * Initialize default rooms (called during setup)
   */
  async initializeDefaultRooms() {
    try {
      const existingRooms = await this.count();
      if (existingRooms > 0) {
        console.log('⏭️ Default rooms already exist, skipping initialization');
        return false;
      }

      console.log('🏨 Initializing default hotel rooms...');

      const defaultRooms = [
        { id: 101, room_number: 'Mint', type: 'Standard', status: 'Available', price: 500, capacity: 2, amenities: '["WiFi", "TV", "AC"]' },
        { id: 102, room_number: 'Cinnamon', type: 'Standard', status: 'Available', price: 500, capacity: 2, amenities: '["WiFi", "TV", "AC"]' },
        { id: 103, room_number: 'Basil', type: 'Standard', status: 'Available', price: 500, capacity: 2, amenities: '["WiFi", "TV", "AC"]' },
        { id: 104, room_number: 'Licorice', type: 'Superior', status: 'Available', price: 750, capacity: 3, amenities: '["WiFi", "TV", "AC", "Mini Bar"]' },
        { id: 105, room_number: 'Marigold', type: 'Superior', status: 'Available', price: 750, capacity: 3, amenities: '["WiFi", "TV", "AC", "Mini Bar"]' },
        { id: 106, room_number: 'Lotus', type: 'Superior', status: 'Available', price: 750, capacity: 3, amenities: '["WiFi", "TV", "AC", "Mini Bar"]' },
        { id: 107, room_number: 'Jasmine', type: 'Superior', status: 'Available', price: 750, capacity: 3, amenities: '["WiFi", "TV", "AC", "Mini Bar"]' },
        { id: 108, room_number: 'Private', type: 'Superior', status: 'Available', price: 750, capacity: 3, amenities: '["WiFi", "TV", "AC", "Mini Bar"]' },
        { id: 109, room_number: 'Chamomile', type: 'Executive', status: 'Available', price: 1250, capacity: 4, amenities: '["WiFi", "TV", "AC", "Mini Bar", "Jacuzzi", "Room Service"]' }
      ];

      await this.bulkCreate(defaultRooms, true); // Mark as synced since these are default
      console.log('✅ Default rooms initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing default rooms:', error);
      throw error;
    }
  }
} 