import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRestaurant } from '../../context/RestaurantContext';
import { useTheme } from '../../context/ThemeContext';
import { FaTimes, FaUtensils, FaSave } from 'react-icons/fa';

const MenuItemModal = ({ isOpen, onClose, menuItem = null }) => {
  const { categories, addMenuItem, updateMenuItem } = useRestaurant();
  const { theme } = useTheme();
  const isEditing = !!menuItem;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    preparation_time: '',
    is_available: true
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with menu item data when editing
  useEffect(() => {
    if (menuItem) {
      setFormData({
        name: menuItem.name || '',
        description: menuItem.description || '',
        price: menuItem.price ? menuItem.price.toString() : '',
        category_id: menuItem.category_id || '',
        preparation_time: menuItem.preparation_time ? menuItem.preparation_time.toString() : '',
        is_available: menuItem.is_available !== false
      });
    } else {
      // Reset form when adding new item
      setFormData({
        name: '',
        description: '',
        price: '',
        category_id: '',
        preparation_time: '',
        is_available: true
      });
    }
    setErrors({});
  }, [menuItem, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
    
    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be a positive number';
    }
    
    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }
    
    if (formData.preparation_time && (isNaN(parseInt(formData.preparation_time)) || parseInt(formData.preparation_time) < 0)) {
      newErrors.preparation_time = 'Preparation time must be a non-negative number';
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
      // Format data for submission
      const submissionData = {
        ...formData,
        price: parseFloat(formData.price),
        preparation_time: formData.preparation_time ? parseInt(formData.preparation_time) : null
      };
      
      if (isEditing) {
        await updateMenuItem(menuItem.id, submissionData);
      } else {
        await addMenuItem(submissionData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving menu item:', error);
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
              className={`relative w-full max-w-2xl p-6 rounded-lg shadow-xl ${
                theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <FaUtensils className={`text-xl mr-3 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  <h2 className="text-xl font-bold">
                    {isEditing ? 'Edit Menu Item' : 'Add New Menu Item'}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Name */}
                  <div className="col-span-2">
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
                  <div className="col-span-2">
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
                  
                  {/* Price */}
                  <div>
                    <label className="block mb-1 font-medium">
                      Price (GH₵) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className={`w-full px-3 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-white border-gray-300'
                      } border ${errors.price ? 'border-red-500' : ''}`}
                    />
                    {errors.price && (
                      <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                    )}
                  </div>
                  
                  {/* Category */}
                  <div>
                    <label className="block mb-1 font-medium">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-white border-gray-300'
                      } border ${errors.category_id ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.category_id && (
                      <p className="mt-1 text-sm text-red-500">{errors.category_id}</p>
                    )}
                  </div>
                  
                  {/* Preparation Time */}
                  <div>
                    <label className="block mb-1 font-medium">Preparation Time (minutes)</label>
                    <input
                      type="number"
                      name="preparation_time"
                      value={formData.preparation_time}
                      onChange={handleChange}
                      min="0"
                      className={`w-full px-3 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-white border-gray-300'
                      } border ${errors.preparation_time ? 'border-red-500' : ''}`}
                    />
                    {errors.preparation_time && (
                      <p className="mt-1 text-sm text-red-500">{errors.preparation_time}</p>
                    )}
                  </div>
                  
                  {/* Availability Option */}
                  <div>
                    <label className="block mb-1 font-medium">Availability</label>
                    <div className="flex items-center mt-2">
                      <input
                        type="checkbox"
                        name="is_available"
                        checked={formData.is_available}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <span>Available on Menu</span>
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
                    {isSubmitting ? 'Saving...' : 'Save Menu Item'}
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

export default MenuItemModal;
