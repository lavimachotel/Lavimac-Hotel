import supabase from '../supabaseClient';

/**
 * Create a real admin account in Supabase
 * @param {Object} userData - Admin user data with email, password, fullName
 * @returns {Promise<Object>} - Result of the operation
 */
export const createRealAdminAccount = async (userData) => {
  try {
    console.log('Creating real admin account...');
    
    // Step 1: Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName,
          role: 'admin'
        }
      }
    });
    
    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }
    
    console.log('User created in Auth, user ID:', authData.user.id);
    
    // Step 2: Create the user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        user_id: authData.user.id,
        full_name: userData.fullName,
        role: 'admin',
        position: 'Administrator',
        department: 'Management',
        contact_number: userData.contactNumber || '',
        updated_at: new Date()
      }])
      .select('*')
      .single();
    
    if (profileError) {
      console.error('Profile error:', profileError);
      throw profileError;
    }
    
    console.log('Admin profile created:', profileData);
    
    // Step 3: Set up user permissions if needed
    try {
      const { error: permError } = await supabase.rpc('setup_user_permissions', {
        user_id: authData.user.id,
        user_role: 'admin'
      });
      
      if (permError) {
        console.warn('Warning: Could not set up permissions:', permError);
      }
    } catch (permErr) {
      console.warn('Warning: Error setting up permissions:', permErr);
      // Continue anyway
    }
    
    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: 'admin',
        fullName: userData.fullName
      }
    };
  } catch (error) {
    console.error('Error creating admin account:', error);
    return {
      success: false,
      error: error.message || 'Failed to create admin account'
    };
  }
};

/**
 * Create a real manager account in Supabase
 * @param {Object} userData - Manager user data with email, password, fullName
 * @returns {Promise<Object>} - Result of the operation
 */
export const createRealManagerAccount = async (userData) => {
  try {
    console.log('Creating real manager account...');
    
    // Step 1: Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName,
          role: 'manager'
        }
      }
    });
    
    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }
    
    console.log('User created in Auth, user ID:', authData.user.id);
    
    // Step 2: Create the user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        user_id: authData.user.id,
        full_name: userData.fullName,
        role: 'manager',
        position: 'Manager',
        department: 'Management',
        contact_number: userData.contactNumber || '',
        updated_at: new Date()
      }])
      .select('*')
      .single();
    
    if (profileError) {
      console.error('Profile error:', profileError);
      throw profileError;
    }
    
    console.log('Manager profile created:', profileData);
    
    // Step 3: Set up user permissions if needed
    try {
      const { error: permError } = await supabase.rpc('setup_user_permissions', {
        user_id: authData.user.id,
        user_role: 'manager'
      });
      
      if (permError) {
        console.warn('Warning: Could not set up permissions:', permError);
      }
    } catch (permErr) {
      console.warn('Warning: Error setting up permissions:', permErr);
      // Continue anyway
    }
    
    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: 'manager',
        fullName: userData.fullName
      }
    };
  } catch (error) {
    console.error('Error creating manager account:', error);
    return {
      success: false,
      error: error.message || 'Failed to create manager account'
    };
  }
}; 