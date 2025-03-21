import supabase from '../supabaseClient';

/**
 * Create a new user account with profile
 * @param {Object} userData - The user data containing email, password, role, etc.
 * @returns {Promise<Object>} - The created user data or error
 */
export const createUserAccount = async (userData) => {
  try {
    // Step 1: Instead of directly accessing the auth.users table,
    // we'll use a more permission-friendly approach
    
    // Option 1: Use signUp which doesn't require admin privileges
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName,
          role: userData.role
        }
      }
    });

    if (authError) throw authError;

    // Step 2: Create the user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert([
        {
          user_id: authData.user.id,
          full_name: userData.fullName,
          role: userData.role,
          position: userData.position,
          department: userData.department,
          contact_number: userData.contactNumber,
          permissions: userData.permissions
        }
      ])
      .select('*')
      .single();

    if (profileError) {
      console.error("Error creating user profile:", profileError);
      // We can't easily delete the auth user without admin privileges
      // Consider adding a "pending_deletion" flag to handle this case
      throw profileError;
    }

    // Step 3: Store the credentials for later retrieval
    const { data: credData, error: credError } = await supabase
      .rpc('store_staff_credentials', {
        p_user_id: authData.user.id,
        p_email: userData.email,
        p_password: userData.password
      });

    if (credError) {
      console.warn("Warning: Could not store staff credentials:", credError);
      // Don't throw here - we want to continue even if this fails
    } else {
      console.log("Staff credentials stored successfully");
    }

    // Set up RLS policy for this user using a stored procedure or function
    // This approach avoids direct access to auth.users table
    const { error: rlsError } = await supabase
      .rpc('setup_user_permissions', { 
        user_id: authData.user.id,
        user_role: userData.role
      });
    
    if (rlsError) {
      console.warn("Warning: Could not set up RLS policies for user:", rlsError);
      // Don't throw - we want to continue even if this fails
    }

    return {
      success: true,
      user: {
        ...authData.user,
        profile: profileData
      }
    };
  } catch (error) {
    console.error('Error creating user account:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to create user account'
    };
  }
};

/**
 * Get all users with their profiles
 * @returns {Promise<Array>} - List of users or error
 */
export const getAllUsers = async () => {
  try {
    // Instead of accessing auth users directly, just get profiles
    // This avoids permission issues with the auth.users table
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*');
      
    if (profilesError) throw profilesError;
    
    return {
      success: true,
      data: profiles
    };
  } catch (error) {
    console.error('Error getting users:', error);
    return {
      success: false,
      error: error.message || 'Failed to get users'
    };
  }
};

/**
 * Update user profile
 * @param {string} userId - The user ID
 * @param {Object} profileData - The profile data to update
 * @returns {Promise<Object>} - The updated profile or error
 */
export const updateUserProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(profileData)
      .eq('user_id', userId)
      .select('*')
      .single();
      
    if (error) throw error;
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return {
      success: false,
      error: error.message || 'Failed to update user profile'
    };
  }
};

/**
 * Delete a user account
 * @param {string} userId - The user ID to delete
 * @returns {Promise<Object>} - Success status or error
 */
export const deleteUserAccount = async (userId) => {
  try {
    // First mark the user profile as inactive instead of trying to delete auth user
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ active: false })
      .eq('user_id', userId);
    
    if (updateError) throw updateError;
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error deactivating user account:', error);
    return {
      success: false,
      error: error.message || 'Failed to deactivate user account'
    };
  }
};

/**
 * Get user credentials (for staff login)
 * Only accessible by the user themselves or admins
 * @param {string} userId - Optional, if admin wants to see credentials for a specific user
 * @returns {Promise<Object>} - The credentials or error
 */
export const getUserCredentials = async (userId = null) => {
  try {
    // Get the authenticated user's ID if no userId provided
    if (!userId) {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        throw new Error('Not authenticated');
      }
      userId = authData.session.user.id;
    }
    
    const { data, error } = await supabase
      .from('staff_credentials')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error) throw error;
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error getting user credentials:', error);
    return {
      success: false,
      error: error.message || 'Failed to get user credentials'
    };
  }
}; 