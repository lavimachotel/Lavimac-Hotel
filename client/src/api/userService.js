import supabase from '../supabaseClient';
import { handleApiError } from '../utils/apiErrorHandler';

/**
 * Create a new user account
 * @param {Object} userData - The user data
 * @param {Function} refreshToken - Function to refresh the token (optional)
 * @returns {Promise} - The result of the operation
 */
export const createUserAccount = async (userData, refreshToken = null) => {
  try {
    // First, create the user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.username,
      password: userData.password,
      email_confirm: true
    });

    if (authError) throw authError;

    // Then, create the user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert([
        {
          user_id: authData.user.id,
          full_name: userData.fullName,
          position: userData.position,
          department: userData.department,
          contact_number: userData.contactNumber,
          role: userData.role
        }
      ]);

    if (profileError) throw profileError;

    // Finally, assign permissions
    if (userData.permissions && userData.permissions.length > 0) {
      const permissionEntries = userData.permissions.map(permissionId => ({
        user_id: authData.user.id,
        permission_id: permissionId
      }));

      const { error: permissionError } = await supabase
        .from('user_permissions')
        .insert(permissionEntries);

      if (permissionError) throw permissionError;
    }

    return { success: true, data: authData.user };
  } catch (error) {
    console.error('Error creating user account:', error);
    
    // If refreshToken is provided, handle token expiration
    if (refreshToken) {
      const errorResult = await handleApiError(error, refreshToken);
      if (errorResult.handled) {
        // Try again after token refresh
        return createUserAccount(userData, refreshToken);
      }
      return { success: false, error: errorResult.message };
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Get user permissions
 * @param {string} userId - The user ID
 * @param {Function} refreshToken - Function to refresh the token (optional)
 * @returns {Promise} - The result of the operation
 */
export const getUserPermissions = async (userId, refreshToken = null) => {
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select(`
        permission_id,
        permissions (
          name,
          description
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return { 
      success: true, 
      data: data.map(item => ({
        id: item.permission_id,
        name: item.permissions.name,
        description: item.permissions.description
      }))
    };
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    
    // If refreshToken is provided, handle token expiration
    if (refreshToken) {
      const errorResult = await handleApiError(error, refreshToken);
      if (errorResult.handled) {
        // Try again after token refresh
        return getUserPermissions(userId, refreshToken);
      }
      return { success: false, error: errorResult.message };
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Get all available permissions
 * @param {Function} refreshToken - Function to refresh the token (optional)
 * @returns {Promise} - The result of the operation
 */
export const getAllPermissions = async (refreshToken = null) => {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('id');

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching permissions:', error);
    
    // If refreshToken is provided, handle token expiration
    if (refreshToken) {
      const errorResult = await handleApiError(error, refreshToken);
      if (errorResult.handled) {
        // Try again after token refresh
        return getAllPermissions(refreshToken);
      }
      return { success: false, error: errorResult.message };
    }
    
    return { success: false, error: error.message };
  }
}; 