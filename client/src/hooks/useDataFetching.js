import { useState, useEffect, useCallback } from 'react';
import cacheAPI from './useCache';

/**
 * Custom hook for data fetching with caching support
 * 
 * @param {Function} fetchFn - The function to fetch data
 * @param {Array} deps - Dependencies array that triggers refetching
 * @param {Object} options - Options for the hook
 * @param {string} options.cacheKey - Key for caching the fetched data
 * @param {number} options.cacheTTL - Time to live for the cached data in ms
 * @param {boolean} options.skipCache - Whether to skip cache and fetch fresh data
 * @returns {Object} - The hook result object
 */
const useDataFetching = (fetchFn, deps = [], options = {}) => {
  const {
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // Default 5 minutes
    skipCache = false
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Function to fetch data
  const fetchData = useCallback(async (forceFresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first if caching is enabled
      if (cacheKey && !skipCache && !forceFresh) {
        const cachedData = cacheAPI.get(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return cachedData;
        }
      }

      // Fetch fresh data
      const result = await fetchFn();
      setData(result);
      
      // Cache the result if caching is enabled
      if (cacheKey && !skipCache) {
        cacheAPI.set(cacheKey, result, cacheTTL);
      }
      
      setLastFetched(new Date());
      return result;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFn, cacheKey, cacheTTL, skipCache]);

  // Effect to fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [...deps, fetchFn, cacheKey, skipCache]);

  // Function to invalidate cache and refetch
  const refetch = useCallback(() => {
    if (cacheKey) {
      cacheAPI.remove(cacheKey);
    }
    return fetchData(true);
  }, [fetchData, cacheKey]);

  return {
    data,
    loading,
    error,
    refetch,
    lastFetched
  };
};

export default useDataFetching; 