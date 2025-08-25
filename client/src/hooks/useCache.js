/**
 * A simple cache implementation for React applications
 */

// The global cache object
const cache = new Map();

/**
 * Cache configuration
 */
const config = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes in milliseconds
  enabled: true
};

/**
 * Set a value in the cache with an optional TTL
 * @param {string} key - The cache key
 * @param {any} value - The value to cache
 * @param {number} ttl - Time to live in milliseconds (optional)
 */
export const set = (key, value, ttl = config.defaultTTL) => {
  if (!config.enabled) return;
  
  const expires = Date.now() + ttl;
  cache.set(key, { value, expires });
  
  // Set timeout to automatically remove expired item
  setTimeout(() => {
    const item = cache.get(key);
    if (item && item.expires <= Date.now()) {
      cache.delete(key);
    }
  }, ttl);
};

/**
 * Get a value from the cache
 * @param {string} key - The cache key
 * @returns {any|null} - The cached value or null if not found/expired
 */
export const get = (key) => {
  if (!config.enabled) return null;
  
  const item = cache.get(key);
  
  // Check if item exists and is not expired
  if (item && item.expires > Date.now()) {
    return item.value;
  }
  
  // If expired, remove from cache
  if (item) {
    cache.delete(key);
  }
  
  return null;
};

/**
 * Check if a key exists in the cache
 * @param {string} key - The cache key
 * @returns {boolean} - True if key exists and is not expired
 */
export const has = (key) => {
  if (!config.enabled) return false;
  
  const item = cache.get(key);
  
  // Check if item exists and is not expired
  if (item && item.expires > Date.now()) {
    return true;
  }
  
  // If expired, remove from cache
  if (item) {
    cache.delete(key);
  }
  
  return false;
};

/**
 * Remove a value from the cache
 * @param {string} key - The cache key
 */
export const remove = (key) => {
  cache.delete(key);
};

/**
 * Clear the entire cache
 */
export const clear = () => {
  cache.clear();
};

/**
 * Configure the cache
 * @param {Object} options - Configuration options
 * @param {number} options.defaultTTL - Default time to live
 * @param {boolean} options.enabled - Enable/disable caching
 */
export const configure = (options) => {
  Object.assign(config, options);
};

/**
 * Get the current cache stats
 * @returns {Object} - Cache statistics
 */
export const getStats = () => {
  const now = Date.now();
  let validItems = 0;
  let expiredItems = 0;
  
  cache.forEach(item => {
    if (item.expires > now) {
      validItems++;
    } else {
      expiredItems++;
    }
  });
  
  return {
    size: cache.size,
    validItems,
    expiredItems
  };
};

// Export the cache API
const cacheAPI = {
  set,
  get,
  has,
  remove,
  clear,
  configure,
  getStats
};

export default cacheAPI; 