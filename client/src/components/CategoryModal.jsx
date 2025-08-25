import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, faSave, faTrash, faExclamationTriangle,
  faLayerGroup, faPlus, faEdit
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useInventory } from '../context/InventoryContext';
import toast from 'react-hot-toast';

const CategoryModal = ({ isOpen, onClose, mode = 'add', category = null }) => {
  const { theme } = useTheme();
  const { 
    categories,
    addCategory,
          updateCategory,
      deleteCategory
    } = useInventory();
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Initialize form data when category prop changes
  useEffect(() => {
    if (category && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: category.name || '',
        description: category.description || ''
      });
    } else {
      // Reset form for add mode
      setFormData({
        name: '',
        description: ''
      });
    }
    
    setErrors({});
    setConfirmDelete(false);
  }, [category, mode]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    }
    
    // Check for duplicate category names
    if (formData.name.trim() && mode === 'add') {
      const isDuplicate = categories.some(
        cat => cat.name.toLowerCase() === formData.name.trim().toLowerCase()
      );
      
      if (isDuplicate) {
        newErrors.name = 'A category with this name already exists';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (mode === 'view') {
      onClose();
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (mode === 'add') {
        const result = await addCategory(formData);
        if (result.error) {
          throw new Error(result.error.message || 'Failed to add category');
        }
        toast.success('Category added successfully');
      } else if (mode === 'edit') {
        const result = await updateCategory(category.id, formData);
        if (result.error) {
          throw new Error(result.error.message || 'Failed to update category');
        }
        toast.success('Category updated successfully');
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await deleteCategory(category.id);
      if (result.error) {
        throw new Error(result.error.message || 'Failed to delete category');
      }
      
      toast.success('Category deleted successfully');
      onClose();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
      setConfirmDelete(false);
    }
  };

  // Modal title based on mode
  const getModalTitle = () => {
    switch (mode) {
      case 'add':
        return 'Add New Category';
      case 'edit':
        return 'Edit Category';
      case 'view':
        return 'Category Details';
      default:
        return 'Category';
    }
  };

  // Modal icon based on mode
  const getModalIcon = () => {
    switch (mode) {
      case 'add':
        return faPlus;
      case 'edit':
        return faEdit;
      case 'view':
        return faLayerGroup;
      default:
        return faLayerGroup;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className="flex items-center justify-center min-h-screen p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`relative w-full max-w-md rounded-xl shadow-xl overflow-hidden ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`px-6 py-4 border-b ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full mr-3 ${
                      mode === 'add'
                        ? theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'
                        : mode === 'edit'
                          ? theme === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600'
                          : theme === 'dark' ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'
                    }`}>
                      <FontAwesomeIcon icon={getModalIcon()} className="text-lg" />
                    </div>
                    <h2 className={`text-xl font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      {getModalTitle()}
                    </h2>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className={`p-2 rounded-full ${
                      theme === 'dark'
                        ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                        : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                    } transition-colors`}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
                

              </div>
              
              {/* Body */}
              <form onSubmit={handleSubmit}>
                <div className={`px-6 py-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {/* Name */}
                  <div className="mb-4">
                    <label className={`block text-sm font-medium mb-1 ${
                      errors.name ? 'text-red-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    }`}>
                      Category Name*
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={mode === 'view'}
                      className={`w-full px-3 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      } border ${
                        errors.name 
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                          : 'focus:ring-blue-500 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 transition-colors`}
                      placeholder="Enter category name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    }`}>
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      disabled={mode === 'view'}
                      rows="3"
                      className={`w-full px-3 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      } border focus:ring-blue-500 focus:border-blue-500 focus:outline-none focus:ring-2 transition-colors`}
                      placeholder="Enter category description (optional)"
                    />
                  </div>
                </div>
                
                {/* Footer */}
                <div className={`px-6 py-4 border-t ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                } flex justify-between items-center`}>
                  {mode === 'edit' && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className={`px-4 py-2 rounded-lg flex items-center ${
                        confirmDelete
                          ? theme === 'dark'
                            ? 'bg-red-700 hover:bg-red-800 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                          : theme === 'dark'
                            ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400'
                            : 'bg-red-100 hover:bg-red-200 text-red-600'
                      } transition-colors`}
                    >
                      <FontAwesomeIcon icon={faTrash} className="mr-2" />
                      {confirmDelete ? 'Confirm Delete' : 'Delete'}
                    </button>
                  ) : (
                    <div></div>
                  )}
                  
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className={`px-4 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      } transition-colors`}
                    >
                      {mode === 'view' ? 'Close' : 'Cancel'}
                    </button>
                    
                    {mode !== 'view' && (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-4 py-2 rounded-lg flex items-center ${
                          theme === 'dark'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        } transition-colors`}
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faSave} className="mr-2" />
                            Save
                          </>
                        )}
                      </button>
                    )}
                  </div>
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
