import React, { useState } from 'react';
import supabase from '../supabaseClient';

const UserProfileModal = ({ isOpen, onClose, user }) => {
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        position: user?.position || '',
        department: user?.department || '',
        contactNumber: user?.contactNumber || '',
        avatar: null // For file upload
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [previewUrl, setPreviewUrl] = useState(user?.avatarUrl || '');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, avatar: file });
            // Create a preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            // Update user profile logic here
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    full_name: formData.fullName,
                    position: formData.position,
                    department: formData.department,
                    contact_number: formData.contactNumber,
                })
                .eq('user_id', user.id);

            if (error) {
                throw error;
            }

            // Handle image upload if avatar is provided
            if (formData.avatar) {
                const fileName = `avatar-${user.id}-${Date.now()}`;
                const { data, error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(`public/${fileName}`, formData.avatar);

                if (uploadError) {
                    throw uploadError;
                }

                // Get the public URL for the uploaded image
                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(`public/${fileName}`);

                // Update the user profile with the avatar URL
                if (urlData) {
                    await supabase
                        .from('user_profiles')
                        .update({ avatar_url: urlData.publicUrl })
                        .eq('user_id', user.id);
                }
            }

            setMessage({ 
                type: 'success', 
                text: 'Profile updated successfully!' 
            });
            
            // Close modal after a short delay to show success message
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ 
                type: 'error', 
                text: `Error updating profile: ${error.message}` 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900 dark:opacity-90"></div>
                </div>

                {/* Modal panel */}
                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                                    Edit Profile
                                </h3>
                                <div className="mt-6">
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Avatar preview and upload */}
                                        <div className="flex flex-col items-center mb-6">
                                            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-4">
                                                {previewUrl ? (
                                                    <img 
                                                        src={previewUrl} 
                                                        alt="Profile" 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-3xl font-bold">
                                                        {formData.fullName.charAt(0) || 'U'}
                                                    </div>
                                                )}
                                            </div>
                                            <label className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
                                                Upload Photo
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    onChange={handleFileChange}
                                                    accept="image/*"
                                                />
                                            </label>
                                        </div>

                                        {/* Form fields */}
                                        <div className="grid grid-cols-1 gap-6">
                                            <div>
                                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Full Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="fullName"
                                                    id="fullName"
                                                    value={formData.fullName}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                                                    placeholder="Your full name"
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
                                                    value={formData.position}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                                                    placeholder="Your position"
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
                                                    value={formData.department}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                                                    placeholder="Your department"
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
                                                    value={formData.contactNumber}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                                                    placeholder="Your contact number"
                                                />
                                            </div>
                                        </div>

                                        {/* Status message */}
                                        {message.text && (
                                            <div className={`mt-4 p-3 rounded-md ${
                                                message.type === 'success' 
                                                    ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                                    : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                                {message.text}
                                            </div>
                                        )}
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${
                                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
