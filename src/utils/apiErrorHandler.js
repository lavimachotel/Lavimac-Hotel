import { useUser } from '../context/UserContext';

/**
 * Handle API errors, including token expiration
 * @param {Error} error - The error object
 * @param {Function} refreshToken - Function to refresh the token
 * @returns {Object} - Error details
 */
export const handleApiError = async (error, refreshToken) => {
  // Check if the error is a JWT expired error
  if (error.message && (
    error.message.includes('jwt expired') || 
    error.message.includes('JWT expired') ||
    error.message.includes('token is expired')
  )) {
    try {
      // Try to refresh the token
      const refreshResult = await refreshToken();
      
      if (refreshResult.success) {
        // Token refreshed successfully
        return { 
          handled: true, 
          message: 'Session refreshed. Please try again.' 
        };
      } else {
        // Token refresh failed
        return { 
          handled: false, 
          message: 'Your session has expired. Please log in again.',
          requiresLogin: true
        };
      }
    } catch (refreshError) {
      return { 
        handled: false, 
        message: 'Your session has expired. Please log in again.',
        requiresLogin: true
      };
    }
  }
  
  // Handle database relation errors
  if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
    return {
      handled: false,
      message: 'Database setup issue. Please contact the administrator.',
      isDbError: true
    };
  }
  
  // Handle other errors
  return {
    handled: false,
    message: error.message || 'An unexpected error occurred',
    originalError: error
  };
};

/**
 * Hook to use the API error handler with the user context
 * @returns {Function} - Error handler function
 */
export const useApiErrorHandler = () => {
  const { refreshToken } = useUser();
  
  return async (error) => {
    return handleApiError(error, refreshToken);
  };
}; 