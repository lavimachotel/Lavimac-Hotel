import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRestaurant } from '../../context/RestaurantContext';
import { useTheme } from '../../context/ThemeContext';
import { FaTimes, FaFolder, FaSave } from 'react-icons/fa';

const CategoryModal = ({ isOpen, onClose, category = null }) => {
  const { addCategory, updateCategory } = useRestaurant();
  const { theme } = useTheme();
  const isEditing = !!category;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6' // Default color - blue
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with category data when editing
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        color: category.color || '#3B82F6'
      });
    } else {
      // Reset form when adding new category
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6'
      });
    }
    setErrors({});
  }, [category, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isEditing) {
        await updateCategory(category.id, formData);
      } else {
        await addCategory(formData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black"
              onClick={onClose}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20 }}
              className={`relative w-full max-w-md p-6 rounded-lg shadow-xl ${
                theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <FaFolder className={`text-xl mr-3 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  <h2 className="text-xl font-bold">
                    {isEditing ? 'Edit Category' : 'Add New Category'}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-full ${
                    theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <FaTimes />
                </button>
              </div>
              
              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 mb-6">
                  {/* Name */}
                  <div>
                    <label className="block mb-1 font-medium">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-white border-gray-300'
                      } border ${errors.name ? 'border-red-500' : ''}`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label className="block mb-1 font-medium">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                      className={`w-full px-3 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-white border-gray-300'
                      } border`}
                    />
                  </div>
                  
                  {/* Color */}
                  <div>
                    <label className="block mb-1 font-medium">Category Color</label>
                    <div className="flex items-center">
                      <input
                        type="color"
                        name="color"
                        value={formData.color}
                        onChange={handleChange}
                        className="h-10 w-10 rounded border mr-2"
                      />
                      <input
                        type="text"
                        name="color"
                        value={formData.color}
                        onChange={handleChange}
                        className={`flex-1 px-3 py-2 rounded-lg ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600'
                            : 'bg-white border-gray-300'
                        } border`}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`px-4 py-2 rounded-lg ${
                      theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-lg flex items-center ${
                      theme === 'dark'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                    disabled={isSubmitting}
                  >
                    <FaSave className="mr-2" />
                    {isSubmitting ? 'Saving...' : 'Save Category'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CategoryModal; 