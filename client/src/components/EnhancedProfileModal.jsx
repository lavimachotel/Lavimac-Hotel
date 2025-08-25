import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import supabase from '../supabaseClient';

const EnhancedProfileModal = ({ isOpen, onClose }) => {
  const { user, setCurrentUser } = useUser();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile form data
  const [profileData, setProfileData] = useState({
    fullName: '',
    position: '',
    department: '',
    contactNumber: '',
  });
  
  // Email change form data
  const [emailData, setEmailData] = useState({
    currentEmail: '',
    newEmail: '',
    confirmNewEmail: '',
    password: '',
  });
  
  // Password change form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  
  // UI state
  const [profileImage, setProfileImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        position: user.position || '',
        department: user.department || '',
        contactNumber: user.contactNumber || '',
      });
      
      setEmailData({
        ...emailData,
        currentEmail: user.email || '',
      });
      
      // Check if user has a profile image
      if (user.avatar_url) {
        setImageUrl(user.avatar_url);
      } else {
        fetchProfileImage();
      }
    }
  }, [user]);

  const fetchProfileImage = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .storage
        .from('avatars')
        .getPublicUrl(`${user.id}`);
      
      if (error) {
        console.error('Error fetching profile image:', error);
        return;
      }
      
      if (data?.publicUrl) {
        // Check if the image exists by making a HEAD request
        fetch(data.publicUrl, { method: 'HEAD' })
          .then(res => {
            if (res.ok) {
              setImageUrl(data.publicUrl);
            }
          })
          .catch(err => console.error('Error checking image existence:', err));
      }
    } catch (error) {
      console.error('Error in fetchProfileImage:', error);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ 
          text: 'Image size should be less than 2MB', 
          type: 'error' 
        });
        return;
      }
      
      // Check file type
      if (!file.type.match('image.*')) {
        setMessage({ 
          text: 'Please select an image file', 
          type: 'error' 
        });
        return;
      }
      
      setProfileImage(file);
      setImageUrl(URL.createObjectURL(file));
      setMessage({ text: '', type: '' });
    }
  };

  const uploadImage = async () => {
    if (!profileImage || !user) return null;
    
    setUploading(true);
    try {
      // Upload the image to Supabase Storage
      const fileExt = profileImage.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      
      const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(fileName, profileImage, {
          upsert: true,
          cacheControl: '3600',
          contentType: profileImage.type
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data } = await supabase
        .storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage({ 
        text: 'Failed to upload image. Please try again.', 
        type: 'error' 
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      // Upload image if there's a new one
      let avatarUrl = user.avatar_url;
      if (profileImage) {
        avatarUrl = await uploadImage();
        if (!avatarUrl) {
          throw new Error('Failed to upload profile image');
        }
      }
      
      // Update user profile in the database
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: profileData.fullName,
          position: profileData.position,
          department: profileData.department,
          contact_number: profileData.contactNumber,
          avatar_url: avatarUrl,
          updated_at: new Date()
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Update local user data
      const updatedUser = {
        ...user,
        fullName: profileData.fullName,
        position: profileData.position,
        department: profileData.department,
        contactNumber: profileData.contactNumber,
        avatar_url: avatarUrl
      };
      
      // Update user in context
      setCurrentUser(updatedUser);
      
      setMessage({ 
        text: 'Profile updated successfully!', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ 
        text: error.message || 'Failed to update profile. Please try again.', 
        type: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      console.log('Changing email for user:', user.id);
      
      // Validate user ID is a valid UUID
      if (!user.id || typeof user.id !== 'string' || !user.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        throw new Error('Invalid user ID. Please log in again with a proper account.');
      }
      
      // Validate emails
      if (emailData.newEmail !== emailData.confirmNewEmail) {
        throw new Error('New email addresses do not match');
      }
      
      // Update email using Supabase Auth API
      const { error } = await supabase.auth.updateUser({
        email: emailData.newEmail
      });
      
      if (error) {
        console.error('Email update error:', error);
        throw error;
      }
      
      console.log('Email update initiated. Verification email sent.');
      
      // Reset the form
      setEmailData({
        currentEmail: emailData.newEmail,
        newEmail: '',
        confirmNewEmail: '',
        password: ''
      });
      
      setMessage({
        text: 'Email change initiated. Please check your new email for verification.',
        type: 'success'
      });
      
    } catch (error) {
      console.error('Error updating email:', error);
      setMessage({
        text: error.message || 'Failed to update email. Please try again.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      console.log('Changing password for user:', user.id);
      
      // Validate user ID is a valid UUID
      if (!user.id || typeof user.id !== 'string' || !user.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        throw new Error('Invalid user ID. Please log in again with a proper account.');
      }
      
      // Validate passwords
      if (passwordData.newPassword !== passwordData.confirmNewPassword) {
        throw new Error('New passwords do not match');
      }
      
      if (passwordData.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      
      // Update password using Supabase Auth API
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) {
        console.error('Password update error:', error);
        throw error;
      }
      
      console.log('Password updated successfully');
      
      // Reset the form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      
      setMessage({
        text: 'Password updated successfully!',
        type: 'success'
      });
      
    } catch (error) {
      console.error('Error updating password:', error);
      setMessage({
        text: error.message || 'Failed to update password. Please try again.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>
        
        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Account Settings
                </h3>
                
                {/* Tabs */}
                <div className="mt-4 border-b border-gray-200 dark:border-gray-700">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab('profile')}
                      className={`${
                        activeTab === 'profile'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => setActiveTab('email')}
                      className={`${
                        activeTab === 'email'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      Email
                    </button>
                    <button
                      onClick={() => setActiveTab('password')}
                      className={`${
                        activeTab === 'password'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      Password
                    </button>
                  </nav>
                </div>
                
                {/* Message display */}
                {message.text && (
                  <div className={`mt-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}`}>
                    {message.text}
                  </div>
                )}
                
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <form onSubmit={handleProfileSubmit} className="mt-6 space-y-6">
                    {/* Profile Image */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 mb-4">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                            {profileData.fullName.charAt(0) || user?.email?.charAt(0) || '?'}
                          </div>
                        )}
                        <label 
                          htmlFor="profile-image" 
                          className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          <input 
                            id="profile-image" 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Click the edit icon to change your profile picture
                      </p>
                    </div>
                    
                    {/* Form Fields */}
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          id="fullName"
                          value={profileData.fullName}
                          onChange={handleProfileChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Position
                        </label>
                        <input
                          type="text"
                          name="position"
                          id="position"
                          value={profileData.position}
                          onChange={handleProfileChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Department
                        </label>
                        <input
                          type="text"
                          name="department"
                          id="department"
                          value={profileData.department}
                          onChange={handleProfileChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Contact Number
                        </label>
                        <input
                          type="text"
                          name="contactNumber"
                          id="contactNumber"
                          value={profileData.contactNumber}
                          onChange={handleProfileChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="pt-5">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={onClose}
                          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
                
                {/* Email Tab */}
                {activeTab === 'email' && (
                  <form onSubmit={handleEmailSubmit} className="mt-6 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="currentEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Current Email
                        </label>
                        <input
                          type="email"
                          name="currentEmail"
                          id="currentEmail"
                          value={emailData.currentEmail}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                          disabled
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          New Email
                        </label>
                        <input
                          type="email"
                          name="newEmail"
                          id="newEmail"
                          value={emailData.newEmail}
                          onChange={handleEmailChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="confirmNewEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Confirm New Email
                        </label>
                        <input
                          type="email"
                          name="confirmNewEmail"
                          id="confirmNewEmail"
                          value={emailData.confirmNewEmail}
                          onChange={handleEmailChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="emailPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Current Password (for verification)
                        </label>
                        <input
                          type="password"
                          name="password"
                          id="emailPassword"
                          value={emailData.password}
                          onChange={handleEmailChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="pt-5">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={onClose}
                          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {saving ? 'Updating...' : 'Update Email'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
                
                {/* Password Tab */}
                {activeTab === 'password' && (
                  <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Current Password
                        </label>
                        <input
                          type="password"
                          name="currentPassword"
                          id="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          New Password
                        </label>
                        <input
                          type="password"
                          name="newPassword"
                          id="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          required
                          minLength={8}
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Password must be at least 8 characters long
                        </p>
                      </div>
                      
                      <div>
                        <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          name="confirmNewPassword"
                          id="confirmNewPassword"
                          value={passwordData.confirmNewPassword}
                          onChange={handlePasswordChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="pt-5">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={onClose}
                          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {saving ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedProfileModal;
