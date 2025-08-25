import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, faSave, faTrash, faExclamationTriangle,
  faBoxOpen, faInfoCircle, faEdit
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useInventory } from '../context/InventoryContext';
import toast from 'react-hot-toast';

const InventoryItemModal = ({ isOpen, onClose, mode = 'add', item = null }) => {
  const { theme } = useTheme();
  const { 
    categories, 
    addInventoryItem, 
    updateInventoryItem, 
    deleteInventoryItem
  } = useInventory();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    sku: '',
    unit_of_measure: 'piece',
    minimum_stock: 0,
    reorder_point: 0,
    current_stock: 0,
    unit_cost: 0,
    supplier: '',
    location: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Initialize form data when item prop changes
  useEffect(() => {
    if (item && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        category_id: item.category_id || '',
        sku: item.sku || '',
        unit_of_measure: item.unit_of_measure || 'piece',
        minimum_stock: item.minimum_stock || 0,
        reorder_point: item.reorder_point || 0,
        current_stock: item.current_stock || 0,
        unit_cost: item.unit_cost || 0,
        supplier: item.supplier || '',
        location: item.location || ''
      });
    } else {
      // Reset form for add mode
      setFormData({
        name: '',
        description: '',
        category_id: categories.length > 0 ? categories[0].id : '',
        sku: '',
        unit_of_measure: 'piece',
        minimum_stock: 0,
        reorder_point: 0,
        current_stock: 0,
        unit_cost: 0,
        supplier: '',
        location: ''
      });
    }
    
    setErrors({});
    setConfirmDelete(false);
  }, [item, mode, categories]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Convert numeric fields to numbers
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value === '' ? '' : parseFloat(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
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
      newErrors.name = 'Name is required';
    }
    
    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }
    
    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }
    
    if (formData.minimum_stock < 0) {
      newErrors.minimum_stock = 'Minimum stock cannot be negative';
    }
    
    if (formData.reorder_point < formData.minimum_stock) {
      newErrors.reorder_point = 'Reorder point should be greater than or equal to minimum stock';
    }
    
    if (formData.current_stock < 0) {
      newErrors.current_stock = 'Current stock cannot be negative';
    }
    
    if (formData.unit_cost < 0) {
      newErrors.unit_cost = 'Unit cost cannot be negative';
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
        const result = await addInventoryItem(formData);
        if (result.error) {
          throw new Error(result.error.message || 'Failed to add item');
        }
        toast.success('Inventory item added successfully');
      } else if (mode === 'edit') {
        const result = await updateInventoryItem(item.id, formData);
        if (result.error) {
          throw new Error(result.error.message || 'Failed to update item');
        }
        toast.success('Inventory item updated successfully');
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving inventory item:', error);
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
      const result = await deleteInventoryItem(item.id);
      if (result.error) {
        throw new Error(result.error.message || 'Failed to delete item');
      }
      
      toast.success('Inventory item deleted successfully');
      onClose();
    } catch (error) {
      console.error('Error deleting inventory item:', error);
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
        return 'Add New Inventory Item';
      case 'edit':
        return 'Edit Inventory Item';
      case 'view':
        return 'Inventory Item Details';
      default:
        return 'Inventory Item';
    }
  };

  // Modal icon based on mode
  const getModalIcon = () => {
    switch (mode) {
      case 'add':
        return faBoxOpen;
      case 'edit':
        return faEdit;
      case 'view':
        return faInfoCircle;
      default:
        return faBoxOpen;
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
              className={`relative w-full max-w-2xl rounded-xl shadow-xl overflow-hidden ${
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
                          : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
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
                <div className={`px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="col-span-2">
                      <label className={`block text-sm font-medium mb-1 ${
                        errors.name ? 'text-red-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                        Item Name*
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
                        placeholder="Enter item name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                      )}
                    </div>
                    
                    {/* SKU */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        errors.sku ? 'text-red-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                        SKU*
                      </label>
                      <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        className={`w-full px-3 py-2 rounded-lg ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        } border ${
                          errors.sku 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'focus:ring-blue-500 focus:border-blue-500'
                        } focus:outline-none focus:ring-2 transition-colors`}
                        placeholder="Enter SKU"
                      />
                      {errors.sku && (
                        <p className="mt-1 text-sm text-red-500">{errors.sku}</p>
                      )}
                    </div>
                    
                    {/* Category */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        errors.category_id ? 'text-red-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                        Category*
                      </label>
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        className={`w-full px-3 py-2 rounded-lg appearance-none ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } border ${
                          errors.category_id 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'focus:ring-blue-500 focus:border-blue-500'
                        } focus:outline-none focus:ring-2 transition-colors`}
                      >
                        <option value="">Select Category</option>
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
                    
                    {/* Description */}
                    <div className="col-span-2">
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
                        placeholder="Enter item description"
                      />
                    </div>
                    
                    {/* Unit of Measure */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                        Unit of Measure
                      </label>
                      <select
                        name="unit_of_measure"
                        value={formData.unit_of_measure}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        className={`w-full px-3 py-2 rounded-lg appearance-none ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } border focus:ring-blue-500 focus:border-blue-500 focus:outline-none focus:ring-2 transition-colors`}
                      >
                        <option value="piece">Piece</option>
                        <option value="box">Box</option>
                        <option value="roll">Roll</option>
                        <option value="pack">Pack</option>
                        <option value="bottle">Bottle</option>
                        <option value="kg">Kilogram</option>
                        <option value="liter">Liter</option>
                        <option value="meter">Meter</option>
                        <option value="set">Set</option>
                      </select>
                    </div>
                    
                    {/* Supplier */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                        Supplier
                      </label>
                      <input
                        type="text"
                        name="supplier"
                        value={formData.supplier}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        className={`w-full px-3 py-2 rounded-lg ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        } border focus:ring-blue-500 focus:border-blue-500 focus:outline-none focus:ring-2 transition-colors`}
                        placeholder="Enter supplier name"
                      />
                    </div>
                    
                    {/* Location */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                        Storage Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        className={`w-full px-3 py-2 rounded-lg ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        } border focus:ring-blue-500 focus:border-blue-500 focus:outline-none focus:ring-2 transition-colors`}
                        placeholder="Enter storage location"
                      />
                    </div>
                    
                    {/* Unit Cost */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        errors.unit_cost ? 'text-red-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                        Unit Cost ($)
                      </label>
                      <input
                        type="number"
                        name="unit_cost"
                        value={formData.unit_cost}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        step="0.01"
                        min="0"
                        className={`w-full px-3 py-2 rounded-lg ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        } border ${
                          errors.unit_cost 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'focus:ring-blue-500 focus:border-blue-500'
                        } focus:outline-none focus:ring-2 transition-colors`}
                        placeholder="0.00"
                      />
                      {errors.unit_cost && (
                        <p className="mt-1 text-sm text-red-500">{errors.unit_cost}</p>
                      )}
                    </div>
                    
                    {/* Current Stock */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        errors.current_stock ? 'text-red-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                        Current Stock
                      </label>
                      <input
                        type="number"
                        name="current_stock"
                        value={formData.current_stock}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        min="0"
                        className={`w-full px-3 py-2 rounded-lg ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        } border ${
                          errors.current_stock 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'focus:ring-blue-500 focus:border-blue-500'
                        } focus:outline-none focus:ring-2 transition-colors`}
                        placeholder="0"
                      />
                      {errors.current_stock && (
                        <p className="mt-1 text-sm text-red-500">{errors.current_stock}</p>
                      )}
                    </div>
                    
                    {/* Minimum Stock */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        errors.minimum_stock ? 'text-red-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                        Minimum Stock
                      </label>
                      <input
                        type="number"
                        name="minimum_stock"
                        value={formData.minimum_stock}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        min="0"
                        className={`w-full px-3 py-2 rounded-lg ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        } border ${
                          errors.minimum_stock 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'focus:ring-blue-500 focus:border-blue-500'
                        } focus:outline-none focus:ring-2 transition-colors`}
                        placeholder="0"
                      />
                      {errors.minimum_stock && (
                        <p className="mt-1 text-sm text-red-500">{errors.minimum_stock}</p>
                      )}
                    </div>
                    
                    {/* Reorder Point */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        errors.reorder_point ? 'text-red-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                        Reorder Point
                      </label>
                      <input
                        type="number"
                        name="reorder_point"
                        value={formData.reorder_point}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        min="0"
                        className={`w-full px-3 py-2 rounded-lg ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        } border ${
                          errors.reorder_point 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'focus:ring-blue-500 focus:border-blue-500'
                        } focus:outline-none focus:ring-2 transition-colors`}
                        placeholder="0"
                      />
                      {errors.reorder_point && (
                        <p className="mt-1 text-sm text-red-500">{errors.reorder_point}</p>
                      )}
                    </div>
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

export default InventoryItemModal;
