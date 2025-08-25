import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import supabase from '../supabaseClient';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, setCurrentUser } = useUser();
  const [formData, setFormData] = useState({
    fullName: '',
    position: '',
    department: '',
    contactNumber: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        position: user.position || '',
        department: user.department || '',
        contactNumber: user.contactNumber || '',
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      console.log('Updating profile for user:', user.id);
      
      // Validate user ID is a valid UUID
      if (!user.id || typeof user.id !== 'string' || !user.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        throw new Error('Invalid user ID. Please log in again with a proper account.');
      }
      
      // Upload image if there's a new one
      let avatarUrl = user.avatar_url;
      if (profileImage) {
        avatarUrl = await uploadImage();
        if (!avatarUrl) {
          throw new Error('Failed to upload profile image');
        }
      }
      
      // Update user profile in the database
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.fullName,
          position: formData.position,
          department: formData.department,
          contact_number: formData.contactNumber,
          avatar_url: avatarUrl,
          updated_at: new Date()
        })
        .eq('user_id', user.id)
        .select('*')
        .single();
      
      if (error) {
        console.error('Update error details:', error);
        throw error;
      }
      
      console.log('Profile updated successfully:', data);
      
      // Update local user context with the updated information
      if (data) {
        const updatedUser = {
          ...user,
          fullName: data.full_name,
          position: data.position,
          department: data.department,
          contactNumber: data.contact_number,
          avatar_url: data.avatar_url
        };
        
        // Update user in context if it has setCurrentUser
        if (typeof setCurrentUser === 'function') {
          setCurrentUser(updatedUser);
        }
      }
      
      // Refresh user data in context
      setMessage({ 
        text: 'Profile updated successfully!', 
        type: 'success' 
      });
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);
      
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
        <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                  Edit Profile
                </h3>
                
                {message.text && (
                  <div className={`mt-2 p-2 rounded ${
                    message.type === 'success' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                      : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                  }`}>
                    {message.text}
                  </div>
                )}
                
                <div className="mt-4">
                  <form onSubmit={handleSubmit}>
                    {/* Profile Image */}
                    <div className="flex flex-col items-center mb-6">
                      <div className="relative">
                        <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt="Profile" 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-2xl font-bold">
                              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <label 
                          htmlFor="profile-image" 
                          className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 cursor-pointer hover:bg-blue-700 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          <input 
                            type="file" 
                            id="profile-image" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleImageChange}
                            disabled={uploading || saving}
                          />
                        </label>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Click the edit icon to change your profile picture
                      </p>
                    </div>
                    
                    {/* Full Name */}
                    <div className="mb-4">
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                        placeholder="Enter your full name"
                        disabled={saving}
                      />
                    </div>
                    
                    {/* Position */}
                    <div className="mb-4">
                      <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Position
                      </label>
                      <input
                        type="text"
                        id="position"
                        name="position"
                        value={formData.position}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                        placeholder="Your position in the company"
                        disabled={saving}
                      />
                    </div>
                    
                    {/* Department */}
                    <div className="mb-4">
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                        placeholder="Your department"
                        disabled={saving}
                      />
                    </div>
                    
                    {/* Contact Number */}
                    <div className="mb-4">
                      <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Contact Number
                      </label>
                      <input
                        type="text"
                        id="contactNumber"
                        name="contactNumber"
                        value={formData.contactNumber}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                        placeholder="Your contact number"
                        disabled={saving}
                      />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                        disabled={saving || uploading}
                      >
                        {(saving || uploading) && (
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {saving ? 'Saving...' : uploading ? 'Uploading...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal; 