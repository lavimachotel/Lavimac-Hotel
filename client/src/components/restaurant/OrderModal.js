import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { FaTimes, FaPlus, FaMinus, FaUtensils, FaSave } from 'react-icons/fa';
import supabase from '../../supabaseClient';
import toast from 'react-hot-toast';

const OrderModal = ({ isOpen, onClose, order = null }) => {
  const { theme } = useTheme();
  const { menuItems } = useRestaurant();
  const isEditing = !!order;

  const [formData, setFormData] = useState({
    order_type: 'dine-in',
    room_number: '',
    notes: '',
    items: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurant_categories')
          .select('*')
          .order('name');
        
        if (error) throw error;
        setCategories(data || []);
        if (data && data.length > 0) {
          setSelectedCategory(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Initialize form with order data when editing
  useEffect(() => {
    if (order) {
      setFormData({
        order_type: order.order_type || 'dine-in',
        room_number: order.room_number || '',
        notes: order.notes || '',
        items: order.restaurant_order_items?.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          notes: item.notes || '',
          menu_item: menuItems.find(mi => mi.id === item.menu_item_id) || null
        })) || []
      });
    } else if (isOpen) {
      // Reset form when adding new order
      setFormData({
        order_type: 'dine-in',
        room_number: '',
        notes: '',
        items: []
      });
    }
    setErrors({});
  }, [order, isOpen]);

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

  const addItemToOrder = (menuItem) => {
    // Ensure menuItem has a price before adding
    if (!menuItem || (menuItem.price === undefined || menuItem.price === null)) {
      toast.error("Cannot add item with missing price information");
      return;
    }
    
    setFormData(prev => {
      const existingItemIndex = prev.items.findIndex(item => item.menu_item_id === menuItem.id);
      
      if (existingItemIndex !== -1) {
        // Item already exists, increase quantity
        const updatedItems = [...prev.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1
        };
        return { ...prev, items: updatedItems };
      } else {
        // Add new item
        return {
          ...prev,
          items: [...prev.items, {
            menu_item_id: menuItem.id,
            menu_item: menuItem,
            quantity: 1,
            unit_price: menuItem.price, // Store price directly on item
            notes: ''
          }]
        };
      }
    });
  };

  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity < 1) {
      removeItemFromOrder(index);
      return;
    }
    
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        quantity: newQuantity
      };
      return { ...prev, items: updatedItems };
    });
  };

  const updateItemNotes = (index, notes) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        notes
      };
      return { ...prev, items: updatedItems };
    });
  };

  const removeItemFromOrder = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (formData.order_type === 'room-service' && !formData.room_number) {
      newErrors.room_number = 'Room number is required for room service orders';
    }
    
    if (formData.items.length === 0) {
      newErrors.items = 'Please add at least one item to the order';
    } else {
      // Check if any menu items are missing prices
      const missingPrices = formData.items.some(item => 
        !item.menu_item || item.menu_item.price === undefined || item.menu_item.price === null
      );
      
      if (missingPrices) {
        newErrors.items = 'Some items have missing price information';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => {
      const price = item.menu_item?.price || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Calculate total from items
      const orderTotal = calculateTotal();
      
      // Create order in database
      const orderData = {
        order_type: formData.order_type,
        price: orderTotal,
        room_number: formData.order_type === 'room-service' ? formData.room_number : null,
        notes: formData.notes,
        status: 'pending',
        total_amount: orderTotal,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const { data: orderResult, error: orderError } = await supabase
        .from('restaurant_orders')
        .insert([orderData])
        .select();
      
      if (orderError) throw orderError;
      
      // Create order items
      const orderItems = formData.items.map(item => {
        const unitPrice = item.menu_item?.price || 0;
        return {
          order_id: orderResult[0].id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: unitPrice,
          total_price: unitPrice * item.quantity, // Calculate total price for each item
          notes: item.notes
        };
      });
      
      const { error: itemsError } = await supabase
        .from('restaurant_order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
      
      toast.success('Order placed successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(`Failed to place order: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMenuItems = selectedCategory 
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems;

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
              className={`relative w-full max-w-4xl p-6 rounded-lg shadow-xl ${
                theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <FaUtensils className={`text-xl mr-3 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  <h2 className="text-xl font-bold">
                    {isEditing ? 'Edit Order' : 'Place New Order'}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Order Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-1 font-medium">
                        Order Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="order_type"
                        value={formData.order_type}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 rounded-lg ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600'
                            : 'bg-white border-gray-300'
                        } border`}
                      >
                        <option value="dine-in">Dine-in</option>
                        <option value="room-service">Room Service</option>
                        <option value="takeaway">Takeaway</option>
                      </select>
                    </div>
                    
                    {formData.order_type === 'room-service' && (
                      <div>
                        <label className="block mb-1 font-medium">
                          Room Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="room_number"
                          value={formData.room_number}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 rounded-lg ${
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-600'
                              : 'bg-white border-gray-300'
                          } border ${errors.room_number ? 'border-red-500' : ''}`}
                        />
                        {errors.room_number && (
                          <p className="mt-1 text-sm text-red-500">{errors.room_number}</p>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <label className="block mb-1 font-medium">
                        Order Notes
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows="2"
                        className={`w-full px-3 py-2 rounded-lg ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600'
                            : 'bg-white border-gray-300'
                        } border`}
                        placeholder="Special instructions"
                      />
                    </div>
                    
                    {/* Selected Items */}
                    <div>
                      <h3 className="block mb-3 font-medium tracking-wide uppercase text-sm">Order Items</h3>
                      {formData.items.length === 0 ? (
                        <div className={`p-6 text-center rounded-lg ${
                          theme === 'dark' 
                            ? 'bg-gray-800/80 border border-gray-700/50 backdrop-blur-sm' 
                            : 'bg-white/90 border border-gray-200/50 shadow-sm backdrop-blur-sm'
                        }`}>
                          <p className="opacity-80">No items added to order</p>
                          <p className="text-xs mt-1 opacity-60">Click on menu items to add them to your order</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                          {formData.items.map((item, index) => (
                            <motion.div 
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              whileHover={{ scale: 1.01 }}
                              transition={{ duration: 0.2 }}
                              className={`p-3 rounded-lg relative overflow-hidden ${
                                theme === 'dark' 
                                  ? 'bg-gray-800/80 hover:bg-gray-800 border border-gray-700/50 backdrop-blur-sm' 
                                  : 'bg-white/90 hover:bg-white border border-gray-200/50 shadow-sm backdrop-blur-sm'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <h4 className="font-medium">{item.menu_item?.name}</h4>
                                  <div className="flex items-center justify-between mt-2">
                                    <div className={`flex items-center bg-opacity-10 rounded-full overflow-hidden border border-opacity-20 px-1
                                      ${theme === 'dark' ? 'bg-blue-900 border-blue-700' : 'bg-blue-100 border-blue-200'}`}>
                                      <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => updateItemQuantity(index, item.quantity - 1)}
                                        className={`p-1 rounded-full ${
                                          theme === 'dark' 
                                            ? 'hover:bg-gray-700 text-blue-400' 
                                            : 'hover:bg-blue-100 text-blue-600'
                                        }`}
                                      >
                                        <FaMinus className="text-xs" />
                                      </motion.button>
                                      <span className="mx-2 font-medium text-sm">{item.quantity}</span>
                                      <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => updateItemQuantity(index, item.quantity + 1)}
                                        className={`p-1 rounded-full ${
                                          theme === 'dark' 
                                            ? 'hover:bg-gray-700 text-blue-400' 
                                            : 'hover:bg-blue-100 text-blue-600'
                                        }`}
                                      >
                                        <FaPlus className="text-xs" />
                                      </motion.button>
                                    </div>
                                    <span className={`font-medium text-sm px-2 py-1 rounded-md
                                      ${theme === 'dark' 
                                        ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/30' 
                                        : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100'}`}>
                                      GH₵{(item.menu_item?.price * item.quantity).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.1, rotate: 90 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => removeItemFromOrder(index)}
                                  className={`p-1.5 rounded-full self-start ${
                                    theme === 'dark' 
                                      ? 'hover:bg-red-900/30 text-red-400 border border-red-800/30' 
                                      : 'hover:bg-red-100 text-red-500 border border-red-200'
                                  }`}
                                >
                                  <FaTimes className="text-xs" />
                                </motion.button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                      {errors.items && (
                        <p className="mt-1 text-sm text-red-500">{errors.items}</p>
                      )}
                      
                      <motion.div 
                        whileHover={{ scale: 1.01 }}
                        className={`mt-4 p-4 rounded-lg font-medium flex justify-between items-center ${
                          theme === 'dark'
                            ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/20 shadow-lg shadow-blue-900/5'
                            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 shadow-lg shadow-blue-900/5'
                        }`}
                      >
                        <span className="text-sm uppercase tracking-wide opacity-80">Total Amount</span>
                        <span className="text-lg font-bold">GH₵{calculateTotal().toFixed(2)}</span>
                      </motion.div>
                    </div>
                  </div>
                  
                  {/* Right Column - Menu Items */}
                  <div>
                    <div className="mb-4">
                      <h3 className="block mb-3 font-medium tracking-wide uppercase text-sm">
                        Categories
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <motion.button
                          type="button"
                          onClick={() => setSelectedCategory('')}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className={`relative overflow-hidden rounded-lg py-2 px-3 text-center ${
                            selectedCategory === '' 
                              ? (theme === 'dark' 
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20'  
                                : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-300/30') 
                              : (theme === 'dark'
                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200')
                          }`}
                        >
                          {selectedCategory === '' && (
                            <motion.span 
                              className="absolute inset-0 bg-white opacity-10"
                              initial={{ x: '-100%' }}
                              animate={{ x: '100%' }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            />
                          )}
                          <span className="font-medium relative z-10">All Items</span>
                        </motion.button>
                        
                        {categories.map(category => (
                          <motion.button
                            key={category.id}
                            type="button"
                            onClick={() => setSelectedCategory(category.id)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className={`relative overflow-hidden rounded-lg py-2 px-3 text-center ${
                              selectedCategory === category.id 
                                ? (theme === 'dark' 
                                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20'  
                                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-300/30') 
                                : (theme === 'dark'
                                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200')
                            }`}
                          >
                            {selectedCategory === category.id && (
                              <motion.span 
                                className="absolute inset-0 bg-white opacity-10"
                                initial={{ x: '-100%' }}
                                animate={{ x: '100%' }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                              />
                            )}
                            <span className="font-medium relative z-10">{category.name}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    
                    <div className={`h-[400px] overflow-y-auto p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-700/70 backdrop-blur-sm' : 'bg-gray-100/80 backdrop-blur-sm'
                    } border border-gray-700/20 shadow-inner`}>
                      {filteredMenuItems.length === 0 ? (
                        <div className="p-4 text-center">
                          <p>No menu items found</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {filteredMenuItems.map(item => (
                            <motion.div
                              key={item.id}
                              onClick={() => addItemToOrder(item)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${
                                theme === 'dark' 
                                  ? 'bg-gray-800/80 hover:bg-gradient-to-r hover:from-blue-900/50 hover:to-purple-900/50 backdrop-blur-sm border border-gray-700/50' 
                                  : 'bg-white/90 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 backdrop-blur-sm border border-gray-200/50 shadow-sm'
                              } transition-all duration-200`}
                            >
                              <div>
                                <h4 className="font-medium">{item.name}</h4>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium mr-3 px-2 py-1 rounded-md bg-opacity-20 border border-opacity-20 
                                  ${theme === 'dark' ? 'bg-blue-800 border-blue-700' : 'bg-blue-100 border-blue-200'}">
                                  GH₵{item.price.toFixed(2)}
                                </span>
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.1, rotate: 90 }}
                                  whileTap={{ scale: 0.9 }}
                                  className={`ml-1 p-1.5 rounded-full ${
                                    theme === 'dark' 
                                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500' 
                                      : 'bg-gradient-to-tr from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400'
                                  } text-white shadow-md`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addItemToOrder(item);
                                  }}
                                >
                                  <FaPlus className="text-xs" />
                                </motion.button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Form Actions */}
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <motion.button
                    type="button"
                    onClick={onClose}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-4 py-2 rounded-lg ${
                      theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-5 py-2 rounded-lg flex items-center ${
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-700/20'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white shadow-lg shadow-blue-500/20'
                    }`}
                    disabled={isSubmitting}
                  >
                    <FaSave className="mr-2" />
                    {isSubmitting ? 'Processing...' : 'Place Order'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OrderModal;