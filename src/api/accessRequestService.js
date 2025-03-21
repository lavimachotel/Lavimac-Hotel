import supabase from '../supabaseClient';
import { handleApiError } from '../utils/apiErrorHandler';

/**
 * Submit a new access request
 * @param {Object} requestData - The access request data
 * @param {Function} refreshToken - Function to refresh the token (optional)
 * @returns {Promise} - The result of the operation
 */
export const submitAccessRequest = async (requestData, refreshToken = null) => {
  try {
    console.log('Submitting access request:', requestData);
    
    const { data, error } = await supabase
      .from('access_requests')
      .insert([
        {
          full_name: requestData.fullName,
          email: requestData.email,
          position: requestData.position,
          department: requestData.department,
          reason: requestData.reason,
          contact_number: requestData.contactNumber,
          request_date: new Date().toISOString(), // Explicitly set request_date
          status: 'pending' // Explicitly set status to ensure correct case
        }
      ]);

    if (error) throw error;
    console.log('Access request submitted successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error submitting access request:', error);
    
    // If refreshToken is provided, handle token expiration
    if (refreshToken) {
      const errorResult = await handleApiError(error, refreshToken);
      if (errorResult.handled) {
        // Try again after token refresh
        return submitAccessRequest(requestData, refreshToken);
      }
      return { success: false, error: errorResult.message };
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Get all pending access requests
 * @returns {Promise<{success: boolean, data: Array|null, error: string|null, isAuthError: boolean}>}
 */
export const getPendingAccessRequests = async () => {
  try {
    console.log('💬 getPendingAccessRequests: Starting to fetch pending requests');
    
    // First, check if we can connect to Supabase at all
    console.log('💬 Testing basic Supabase connection...');
    const { count, error: testError } = await supabase
      .from('access_requests')
      .select('*', { count: 'exact', head: true });
      
    if (testError) {
      console.error('❌ Basic connection test failed:', testError);
    } else {
      console.log('✅ Basic connection succeeded, count:', count);
    }
    
    // Now try the actual query
    console.log('💬 Executing main query for pending requests...');
    const { data, error } = await supabase
      .from('access_requests')
      .select('*')
      .eq('status', 'pending')
      .order('request_date', { ascending: false });
      
    console.log('💬 Query completed');
    console.log('💬 Data received:', data);
    console.log('💬 Error (if any):', error);
      
    if (error) {
      // Check if it's an auth error
      const isAuthError = error.code === 'PGRST301' || error.message.includes('JWT');
      console.error('❌ Error fetching pending requests:', error, 'Is auth error:', isAuthError);
      return {
        success: false,
        data: null,
        error: error.message,
        isAuthError
      };
    }
    
    console.log(`✅ Successfully fetched ${data?.length || 0} pending requests`);
    return {
      success: true,
      data,
      error: null,
      isAuthError: false
    };
  } catch (err) {
    console.error('❌ Exception in getPendingAccessRequests:', err);
    return {
      success: false,
      data: null,
      error: err.message || 'An unknown error occurred',
      isAuthError: false
    };
  }
};

/**
 * Get all access requests with specified status
 * @param {string} status - Request status to filter by (pending, approved, rejected)
 * @returns {Promise<{success: boolean, data: Array|null, error: string|null, isAuthError: boolean}>}
 */
export const getAccessRequestsByStatus = async (status) => {
  try {
    const { data, error } = await supabase
      .from('access_requests')
      .select('*')
      .eq('status', status)
      .order('request_date', { ascending: false });
      
    if (error) {
      // Check if it's an auth error
      const isAuthError = error.code === 'PGRST301' || error.message.includes('JWT');
      return {
        success: false,
        data: null,
        error: error.message,
        isAuthError
      };
    }
    
    return {
      success: true,
      data,
      error: null,
      isAuthError: false
    };
  } catch (err) {
    console.error(`Error in getAccessRequestsByStatus (${status}):`, err);
    return {
      success: false,
      data: null,
      error: err.message || 'An unknown error occurred',
      isAuthError: false
    };
  }
};

/**
 * Create a new access request
 * @param {Object} requestData - The request data to insert
 * @returns {Promise<{success: boolean, data: Object|null, error: string|null}>}
 */
export const createAccessRequest = async (requestData) => {
  try {
    // First check if an access request with this email already exists
    const { data: existingRequests, error: checkError } = await supabase
      .from('access_requests')
      .select('id, status')
      .eq('email', requestData.email);
      
    if (checkError) throw checkError;
    
    // If there's a pending request, inform the user
    if (existingRequests && existingRequests.length > 0) {
      const pendingRequest = existingRequests.find(req => req.status === 'pending');
      if (pendingRequest) {
        return {
          success: false,
          data: null,
          error: 'You already have a pending access request. Please wait for approval.'
        };
      }
    }
    
    // If we get here, it's safe to create a new request
    const { data, error } = await supabase
      .from('access_requests')
      .insert([
        {
          full_name: requestData.full_name,
          email: requestData.email,
          position: requestData.position,
          department: requestData.department,
          contact_number: requestData.contact_number,
          reason: requestData.reason,
          status: 'pending',
          request_date: new Date().toISOString()
        }
      ])
      .select('*')
      .single();
      
    if (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
    
    return {
      success: true,
      data,
      error: null
    };
  } catch (err) {
    console.error('Error in createAccessRequest:', err);
    return {
      success: false,
      data: null,
      error: err.message || 'An unknown error occurred'
    };
  }
};

/**
 * Update the status of an access request
 * @param {number|string} requestId - The ID of the request to update
 * @param {string} status - The new status (approved, rejected)
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const updateAccessRequestStatus = async (requestId, status) => {
  try {
    const { error } = await supabase
      .from('access_requests')
      .update({ status })
      .eq('id', requestId);
      
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      error: null
    };
  } catch (err) {
    console.error('Error in updateAccessRequestStatus:', err);
    return {
      success: false,
      error: err.message || 'An unknown error occurred'
    };
  }
};

/**
 * Delete an access request
 * @param {number|string} requestId - The ID of the request to delete
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const deleteAccessRequest = async (requestId) => {
  try {
    const { error } = await supabase
      .from('access_requests')
      .delete()
      .eq('id', requestId);
      
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      error: null
    };
  } catch (err) {
    console.error('Error in deleteAccessRequest:', err);
    return {
      success: false,
      error: err.message || 'An unknown error occurred'
    };
  }
};

/**
 * Check if user has a pending access request
 * @param {string} email - Email to check
 * @returns {Promise<{success: boolean, hasPendingRequest: boolean, error: string|null}>}
 */
export const checkPendingAccessRequest = async (email) => {
  try {
    const { data, error } = await supabase
      .from('access_requests')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending');
      
    if (error) {
      return {
        success: false,
        hasPendingRequest: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      hasPendingRequest: data.length > 0,
      error: null
    };
  } catch (err) {
    console.error('Error in checkPendingAccessRequest:', err);
    return {
      success: false,
      hasPendingRequest: false,
      error: err.message || 'An unknown error occurred'
    };
  }
}; 