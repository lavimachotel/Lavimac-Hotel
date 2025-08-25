/**
 * Debug Utility for Hotel Management Application
 * 
 * This file provides debugging tools that can be imported into any component
 * to help diagnose issues with room data, reservations, or application state.
 */

// Debug levels
export const DEBUG_LEVELS = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5
};

// Set the current debug level
export const CURRENT_DEBUG_LEVEL = DEBUG_LEVELS.DEBUG;

/**
 * Log a message with a specific debug level
 * @param {string} message - The message to log
 * @param {number} level - The debug level of the message
 * @param {any} data - Optional data to log along with the message
 */
export const debugLog = (message, level = DEBUG_LEVELS.INFO, data = null) => {
  if (level <= CURRENT_DEBUG_LEVEL) {
    const timestamp = new Date().toISOString();
    
    switch (level) {
      case DEBUG_LEVELS.ERROR:
        console.error(`[ERROR][${timestamp}] ${message}`, data || '');
        break;
      case DEBUG_LEVELS.WARN:
        console.warn(`[WARN][${timestamp}] ${message}`, data || '');
        break;
      case DEBUG_LEVELS.INFO:
        console.info(`[INFO][${timestamp}] ${message}`, data || '');
        break;
      case DEBUG_LEVELS.DEBUG:
        console.debug(`[DEBUG][${timestamp}] ${message}`, data || '');
        break;
      case DEBUG_LEVELS.TRACE:
        console.log(`[TRACE][${timestamp}] ${message}`, data || '');
        break;
      default:
        console.log(`[LOG][${timestamp}] ${message}`, data || '');
    }
  }
};

/**
 * Inspect a room object and validate its structure
 * @param {Object} room - The room object to inspect
 * @returns {Object} Validation results
 */
export const inspectRoom = (room) => {
  const results = {
    isValid: false,
    messages: [],
    room: room
  };
  
  // Check if room exists
  if (!room) {
    results.messages.push('Room object is null or undefined');
    return results;
  }
  
  // Check for required properties
  const requiredProps = ['id', 'room_number', 'type', 'status', 'price'];
  const missingProps = requiredProps.filter(prop => room[prop] === undefined);
  
  if (missingProps.length > 0) {
    results.messages.push(`Missing required properties: ${missingProps.join(', ')}`);
  }
  
  // Check property types
  if (room.id !== undefined && typeof room.id !== 'number' && typeof room.id !== 'string') {
    results.messages.push(`Invalid id type: ${typeof room.id}, expected number or string`);
  }
  
  if (room.room_number !== undefined && typeof room.room_number !== 'string') {
    results.messages.push(`Invalid room_number type: ${typeof room.room_number}, expected string`);
  }
  
  if (room.price !== undefined && typeof room.price !== 'number') {
    results.messages.push(`Invalid price type: ${typeof room.price}, expected number`);
  }
  
  // Check if status is valid
  const validStatuses = ['Available', 'Occupied', 'Reserved', 'Maintenance'];
  if (room.status && !validStatuses.includes(room.status)) {
    results.messages.push(`Invalid status: ${room.status}, expected one of ${validStatuses.join(', ')}`);
  }
  
  // Check if type is valid
  const validTypes = ['Standard', 'Superior', 'Executive'];
  if (room.type && !validTypes.includes(room.type)) {
    results.messages.push(`Invalid type: ${room.type}, expected one of ${validTypes.join(', ')}`);
  }
  
  // Check amenities
  if (room.amenities !== undefined && !Array.isArray(room.amenities)) {
    results.messages.push(`Invalid amenities type: ${typeof room.amenities}, expected array`);
  }
  
  // Set isValid flag based on messages
  results.isValid = results.messages.length === 0;
  
  return results;
};

/**
 * Debug and validate room data
 * @param {Array} rooms - Array of room objects to validate
 * @returns {Object} Validation results
 */
export const validateRooms = (rooms) => {
  const results = {
    isValid: false,
    validCount: 0,
    invalidCount: 0,
    messages: [],
    invalidRooms: []
  };
  
  // Check if rooms is an array
  if (!Array.isArray(rooms)) {
    results.messages.push(`Invalid rooms type: ${typeof rooms}, expected array`);
    return results;
  }
  
  // Validate each room
  rooms.forEach((room, index) => {
    const roomResult = inspectRoom(room);
    
    if (roomResult.isValid) {
      results.validCount++;
    } else {
      results.invalidCount++;
      results.invalidRooms.push({
        index,
        room,
        messages: roomResult.messages
      });
      
      results.messages.push(`Room at index ${index} has issues: ${roomResult.messages.join('; ')}`);
    }
  });
  
  // Set isValid flag based on invalid count
  results.isValid = results.invalidCount === 0;
  
  return results;
};

/**
 * Diagnostic function to check application state
 * @param {Object} state - The application state to check
 * @returns {Object} Diagnostic information
 */
export const diagnoseAppState = (state) => {
  const results = {
    timestamp: new Date().toISOString(),
    hasRooms: false,
    roomsCount: 0,
    hasReservations: false,
    reservationsCount: 0,
    isLoading: state.loading || false,
    problems: []
  };
  
  // Check rooms
  if (state.rooms) {
    if (Array.isArray(state.rooms)) {
      results.hasRooms = true;
      results.roomsCount = state.rooms.length;
      
      // Validate rooms
      const roomsValidation = validateRooms(state.rooms);
      if (!roomsValidation.isValid) {
        results.problems.push(`Room data has issues: ${roomsValidation.invalidCount} invalid rooms`);
        results.roomsValidation = roomsValidation;
      }
    } else {
      results.problems.push('state.rooms is not an array');
    }
  } else {
    results.problems.push('state.rooms is undefined or null');
  }
  
  // Check reservations
  if (state.reservations) {
    if (Array.isArray(state.reservations)) {
      results.hasReservations = true;
      results.reservationsCount = state.reservations.length;
    } else {
      results.problems.push('state.reservations is not an array');
    }
  } else {
    results.problems.push('state.reservations is undefined or null');
  }
  
  return results;
};

// Export a global debug function that can be called from the browser console
if (typeof window !== 'undefined') {
  window.hotelDebug = {
    validateRooms,
    inspectRoom,
    diagnoseAppState,
    debugLog
  };
  
  console.log('Hotel Management debug tools loaded. Access via window.hotelDebug');
}

export default {
  debugLog,
  inspectRoom,
  validateRooms,
  diagnoseAppState,
  DEBUG_LEVELS
}; 