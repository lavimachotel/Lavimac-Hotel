import supabase from '../supabaseClient';

/**
 * Check if a user with the given email already exists
 * @param {string} email - The email to check
 * @returns {Promise<boolean>} - True if user exists, false otherwise
 */
export const checkUserExists = async (email) => {
  try {
    console.log(`Checking if user with email ${email} already exists...`);
    
    // First try the most reliable method - check the user_profiles table
    // We're storing email in profiles, so this should work most of the time
    console.log('Checking user_profiles table first...');
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, email')
      .eq('email', email)
      .maybeSingle();
    
    if (profileError) {
      console.warn('Error checking user_profiles table:', profileError);
    } else if (profileData) {
      console.log('User found in user_profiles table:', profileData);
      return true;
    }
    
    // Try the Supabase auth API (this might not have the required permissions)
    try {
      console.log('Trying Supabase auth admin API...');
      const { data, error } = await supabase.auth.admin.getUserByEmail(email);
      
      if (error) {
        console.warn('Error using admin API:', error);
      } else if (data && data.user) {
        console.log('User found via admin API:', data.user.id);
        return true;
      }
    } catch (err) {
      console.warn('Admin API not available:', err);
    }
    
    // Try a sign-in attempt that doesn't create a user
    try {
      console.log('Trying sign-in attempt...');
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false
        }
      });
      
      // If we get a "User not found" error, then the user doesn't exist
      // If we get any other error, it's likely the user exists
      if (signInError) {
        if (signInError.message.includes('User not found')) {
          console.log('User not found via sign-in attempt');
          return false;
        } else {
          // Other errors might indicate user exists but something else went wrong
          console.log('Sign-in error, user might exist:', signInError);
        }
      } else {
        // If no error, user exists and OTP was sent
        console.log('OTP sent, user exists');
        return true;
      }
    } catch (err) {
      console.warn('Sign-in attempt failed:', err);
    }
    
    // If we've tried everything and haven't returned, assume user does not exist
    console.log('All checks completed, assuming user does not exist');
    return false;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    // In case of error, return false to allow the attempt to create
    // but log a clear message
    console.warn('Due to error, defaulting to assume user does not exist');
    return false;
  }
};

/**
 * Create a new user account with profile
 * @param {Object} userData - The user data containing email, password, role, etc.
 * @returns {Promise<Object>} - The created user data or error
 */
export const createUserAccount = async (userData) => {
  try {
    console.log('Starting createUserAccount for email:', userData.email);
    
    // First check if user already exists
    const userExists = await checkUserExists(userData.email);
    if (userExists) {
      console.log('User already exists, returning error code');
      return {
        success: false,
        error: 'User already registered',
        code: 'USER_ALREADY_EXISTS',
        message: `A user with email ${userData.email} is already registered in the system.`
      };
    }
    
    console.log('User does not exist, proceeding with account creation');
    
    // Step 1: Create auth user via signUp
    console.log('Step 1: Creating auth user via signUp');
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

    if (authError) {
      console.error('Error creating auth user:', authError);
      
      // Check if error indicates user already exists
      if (authError.message.includes('already registered')) {
        return {
          success: false,
          error: 'User already registered',
          code: 'USER_ALREADY_EXISTS',
          message: `A user with email ${userData.email} is already registered in the system.`
        };
      }
      
      throw authError;
    }
    
    console.log('Auth user created successfully:', authData.user.id);

    // Step 2: Create the user profile
    console.log('Step 2: Creating user profile');
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
          permissions: userData.permissions,
          email: userData.email // Store email in profile for easier queries
        }
      ])
      .select('*')
      .single();

    if (profileError) {
      console.error("Error creating user profile:", profileError);
      
      // Check if profile already exists (unique constraint violation)
      if (profileError.code === '23505') { // PostgreSQL unique constraint violation
        console.log('Profile already exists, returning USER_ALREADY_EXISTS');
        return {
          success: false,
          error: 'User already registered',
          code: 'USER_ALREADY_EXISTS',
          message: `A profile for user ${userData.email} already exists.`
        };
      }
      
      throw profileError;
    }
    
    console.log('User profile created successfully');

    // Step 3: Store the credentials for later retrieval
    console.log('Step 3: Storing staff credentials');
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
    console.log('Step 4: Setting up user permissions');
    const { error: rlsError } = await supabase
      .rpc('setup_user_permissions', { 
        user_id: authData.user.id,
        user_role: userData.role
      });
    
    if (rlsError) {
      console.warn("Warning: Could not set up RLS policies for user:", rlsError);
      // Don't throw - we want to continue even if this fails
    } else {
      console.log("User permissions set up successfully");
    }
    
    console.log('User account creation completed successfully');
    return {
      success: true,
      user: {
        ...authData.user,
        profile: profileData
      },
      message: `User account for ${userData.email} created successfully`
    };
  } catch (error) {
    console.error('Error creating user account:', error);
    
    // Check for common error patterns
    if (error.message && error.message.includes('already registered')) {
      return {
        success: false,
        error: 'User already registered',
        code: 'USER_ALREADY_EXISTS',
        message: `A user with email ${userData.email} is already registered.`
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to create user account',
      code: error.code || 'UNKNOWN_ERROR'
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