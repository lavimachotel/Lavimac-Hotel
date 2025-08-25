import React, { useState, useEffect } from 'react';
import { FaSearch, FaPlus, FaChartBar, FaUtensils, FaGlassMartiniAlt, FaFolder, FaTimes, FaEdit, FaTrash, FaMoneyBillWave, FaShoppingCart, FaStar, FaChartLine } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useRestaurant } from '../../context/RestaurantContext';
import { useTheme } from '../../context/ThemeContext';
import MenuItemModal from './MenuItemModal';
import CategoryModal from './CategoryModal';
import OrderManagement from './OrderManagement';
import DashboardLayout from '../DashboardLayout';
import toast from 'react-hot-toast';
import supabase from '../../supabaseClient';

const RestaurantPage = () => {
  const { menuItems, categories, loading, error, fetchMenuItems, deleteMenuItem } = useRestaurant();
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeTab, setActiveTab] = useState('menu');
  const [isMenuItemModalOpen, setIsMenuItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isCategoriesSectionExpanded, setIsCategoriesSectionExpanded] = useState(false);
  const [statsData, setStatsData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    popularItems: []
  });
  const [dateRange, setDateRange] = useState('all'); // 'today', 'week', 'month', 'all'

  // Filter menu items based on search term and category using useMemo to prevent unnecessary recalculations
  const filteredMenuItems = React.useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === '' || item.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchTerm, categoryFilter]);

  // Fetch statistics data when component mounts
  useEffect(() => {
    fetchOrderStats();
    
    // Set up real-time subscription for orders
    const orderSubscription = supabase
      .channel('restaurant_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'restaurant_orders'
        },
        (payload) => {
          console.log('Received order change:', payload);
          // Refresh stats when any order changes
          fetchOrderStats();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      orderSubscription.unsubscribe();
    };
  }, []);

  // Fetch orders statistics from the database
  const fetchOrderStats = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_orders')
        .select(`
          *,
          restaurant_order_items(
            *,
            restaurant_menu_items(name, price)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Calculate statistics
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching order statistics:', error);
    }
  };

  // Calculate statistics from orders
  const calculateStats = (ordersData) => {
    if (!ordersData || ordersData.length === 0) {
      setStatsData({
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        popularItems: []
      });
      return;
    }

    // Filter orders based on date range
    const filteredOrders = filterOrdersByDateRange(ordersData, dateRange);
    
    // Only consider completed orders for revenue calculation
    const completedOrders = filteredOrders.filter(order => 
      order.status === 'completed' || order.status === 'delivered'
    );
    
    // Calculate total revenue
    const totalRevenue = completedOrders.reduce((sum, order) => {
      return sum + (parseFloat(order.total_amount) || 0);
    }, 0);
    
    // Calculate average order value
    const avgOrderValue = completedOrders.length > 0 
      ? totalRevenue / completedOrders.length 
      : 0;
    
    // Find popular items
    const itemCounts = {};
    completedOrders.forEach(order => {
      if (order.restaurant_order_items && order.restaurant_order_items.length > 0) {
        order.restaurant_order_items.forEach(item => {
          const itemName = item.restaurant_menu_items ? item.restaurant_menu_items.name : item.name;
          if (itemName) {
            itemCounts[itemName] = (itemCounts[itemName] || 0) + item.quantity;
          }
        });
      }
    });
    
    // Convert to array and sort by count
    const popularItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3); // Top 3 items
    
    setStatsData({
      totalRevenue,
      totalOrders: completedOrders.length,
      avgOrderValue,
      popularItems
    });
  };

  // Filter orders based on date range
  const filterOrdersByDateRange = (ordersData, range) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    switch (range) {
      case 'today':
        return ordersData.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= today;
        });
      case 'week':
        return ordersData.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= startOfWeek;
        });
      case 'month':
        return ordersData.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= startOfMonth;
        });
      case 'all':
      default:
        return ordersData;
    }
  };

  // Handle date range change
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    fetchOrderStats();
  };

  // Refresh menu items when the component mounts, with proper dependency handling
  useEffect(() => {
    let isMounted = true;
    
    const loadMenuItems = async () => {
      if (isMounted) {
        await fetchMenuItems();
      }
    };
    
    loadMenuItems();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array since fetchMenuItems is from context

  // Modal functions for Menu Items
  const openAddMenuItemModal = () => {
    setSelectedMenuItem(null);
    setIsMenuItemModalOpen(true);
  };

  const openEditMenuItemModal = (item) => {
    setSelectedMenuItem(item);
    setIsMenuItemModalOpen(true);
  };

  const closeMenuItemModal = React.useCallback(() => {
    // Close the modal first
    setIsMenuItemModalOpen(false);
    setSelectedMenuItem(null);
    
    // Use setTimeout to allow the modal closing animation to complete
    // before refreshing the data to avoid UI jank
    setTimeout(() => {
      fetchMenuItems(); // Refresh menu items after modal closes to get latest data
    }, 300);
  }, [fetchMenuItems]);

  // Handle delete menu item
  const handleDeleteMenuItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        await deleteMenuItem(itemId);
        toast.success('Menu item deleted successfully');
      } catch (error) {
        console.error('Error deleting menu item:', error);
        toast.error('Failed to delete menu item');
      }
    }
  };

  // Modal functions for Categories
  const openAddCategoryModal = () => {
    setSelectedCategory(null);
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setSelectedCategory(null);
  };

  // Content for the Restaurant page
  const pageContent = (
    <div className="flex flex-col h-full">
      {/* Action buttons row with stats dashboard - Futuristic UI */}
      <div className="mb-6 flex flex-wrap lg:flex-nowrap items-start justify-between gap-6">
        <div className="flex flex-wrap gap-4">
          <motion.button
            onClick={openAddMenuItemModal}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`relative overflow-hidden flex items-center justify-center px-5 py-2.5 rounded-lg shadow-md ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-700/20'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white shadow-blue-300/30'
            } transition-all duration-200`}
          >
            <motion.span 
              className="absolute inset-0 bg-white opacity-10"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            />
            <FaPlus className="mr-2" />
            <span className="font-medium">Add Menu Item</span>
          </motion.button>

          <motion.button
            onClick={openAddCategoryModal}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`relative overflow-hidden flex items-center justify-center px-5 py-2.5 rounded-lg shadow-md ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-700/20'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-300/30'
            } transition-all duration-200`}
          >
            <motion.span 
              className="absolute inset-0 bg-white opacity-10"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}
            />
            <FaFolder className="mr-2" />
            <span className="font-medium">Add Category</span>
          </motion.button>
        </div>

        {/* Enhanced Revenue Statistics Dashboard */}
        <div className="flex-grow min-w-[320px] w-full lg:max-w-[500px]">
          <div className={`rounded-xl shadow-md overflow-hidden ${
            theme === 'dark' ? 'bg-gray-800/80 border border-gray-700/50' : 'bg-white/90 border border-gray-200/50'
          }`}>
            <div className={`px-4 py-3 border-b flex justify-between items-center ${
              theme === 'dark' ? 'border-gray-700/50 bg-gray-800' : 'border-gray-200/50 bg-gray-50'
            }`}>
              <h3 className="font-medium flex items-center">
                <FaChartLine className="mr-2 text-blue-500" />
                <span>Restaurant Dashboard</span>
              </h3>
              
              {/* Date Range Selector */}
              <div className={`flex rounded-lg overflow-hidden border ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <button 
                  onClick={() => handleDateRangeChange('today')}
                  className={`px-3 py-1 text-xs font-medium ${
                    dateRange === 'today' 
                      ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'
                  }`}
                >
                  Today
                </button>
                <button 
                  onClick={() => handleDateRangeChange('week')}
                  className={`px-3 py-1 text-xs font-medium ${
                    dateRange === 'week' 
                      ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'
                  }`}
                >
                  Week
                </button>
                <button 
                  onClick={() => handleDateRangeChange('month')}
                  className={`px-3 py-1 text-xs font-medium ${
                    dateRange === 'month' 
                      ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'
                  }`}
                >
                  Month
                </button>
                <button 
                  onClick={() => handleDateRangeChange('all')}
                  className={`px-3 py-1 text-xs font-medium ${
                    dateRange === 'all' 
                      ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 p-4">
              {/* Revenue Card */}
              <div className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-blue-800/30' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100'
              }`}>
                <div className="flex items-center mb-3">
                  <div className={`p-3 rounded-full mr-4 ${
                    theme === 'dark' ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700'
                  }`}>
                    <FaMoneyBillWave size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider opacity-70">Total Revenue</span>
                    <span className="text-2xl font-bold mt-1">GH₵{statsData.totalRevenue.toFixed(2)}</span>
                  </div>
                </div>
                <div className={`text-xs ${theme === 'dark' ? 'text-blue-300/70' : 'text-blue-600/70'}`}>
                  Based on {statsData.totalOrders} completed orders
                </div>
              </div>

              {/* Average Order Value */}
              <div className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-gradient-to-br from-green-900/30 to-teal-900/30 border border-green-800/30' : 'bg-gradient-to-br from-green-50 to-teal-50 border border-green-100'
              }`}>
                <div className="flex items-center mb-3">
                  <div className={`p-3 rounded-full mr-4 ${
                    theme === 'dark' ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'
                  }`}>
                    <FaShoppingCart size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider opacity-70">Average Order</span>
                    <span className="text-2xl font-bold mt-1">GH₵{statsData.avgOrderValue.toFixed(2)}</span>
                  </div>
                </div>
                <div className={`text-xs ${theme === 'dark' ? 'text-green-300/70' : 'text-green-600/70'}`}>
                  {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This week' : dateRange === 'month' ? 'This month' : 'All time'} average
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
          <nav className="flex -mb-px space-x-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('menu')}
              className={`py-3 px-4 font-medium text-sm inline-flex items-center whitespace-nowrap ${
                activeTab === 'menu'
                  ? `border-b-2 border-blue-500 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`
                  : `${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`
              }`}
            >
              <FaUtensils className="mr-2" />
              Menu Management
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-3 px-4 font-medium text-sm inline-flex items-center whitespace-nowrap ${
                activeTab === 'orders'
                  ? `border-b-2 border-blue-500 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`
                  : `${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`
              }`}
            >
              <FaChartBar className="mr-2" />
              Orders
            </button>
          </nav>
        </div>

        {activeTab === 'menu' && (
          <div className="flex flex-wrap gap-4 mt-6">
            <div className={`flex-1 min-w-[300px] relative ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              <motion.div 
                animate={{ 
                  opacity: searchTerm ? 0.8 : 0.6,
                  scale: searchTerm ? 1.1 : 1
                }}
                transition={{ duration: 0.2 }}
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
              >
                <FaSearch 
                  className={`${
                    theme === 'dark' 
                      ? searchTerm ? 'text-blue-400' : 'text-gray-500' 
                      : searchTerm ? 'text-blue-500' : 'text-gray-400'
                  }`} 
                />
              </motion.div>
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg shadow-sm backdrop-blur-sm ${
                  theme === 'dark'
                    ? 'bg-gray-800/90 border-gray-700/80 text-white placeholder-gray-500'
                    : 'bg-white/90 border-gray-300/80 text-gray-800 placeholder-gray-400'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all hover:border-blue-400/70`}
              />
              <motion.div 
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 scale-x-0 origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: searchTerm ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
              {searchTerm && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSearchTerm('')}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full ${
                    theme === 'dark' 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FaTimes className="text-xs" />
                </motion.button>
              )}
            </div>
            
            <div className="flex-1 min-w-[200px] relative">
              <div className={`relative ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`}>
                <FaFolder className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm opacity-70" />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 rounded-lg appearance-none shadow-sm backdrop-blur-sm ${
                  theme === 'dark'
                    ? 'bg-gray-800/90 border-gray-700/80 text-white'
                    : 'bg-white/90 border-gray-300/80 text-gray-800'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all hover:border-blue-400/70`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%235C6BC0' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                }}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <motion.div 
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 scale-x-0 origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: categoryFilter ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Content based on active tab */}
      <div className="content-area flex-1 overflow-y-auto">
        {activeTab === 'menu' && (
          <div>
            {/* Categories Section - Futuristic UI */}
            {categories.length > 0 && (
              <div className="mb-8">
                <div 
                  onClick={() => setIsCategoriesSectionExpanded(!isCategoriesSectionExpanded)}
                  className="flex items-center justify-between cursor-pointer mb-4"
                >
                  <h2 className={`text-lg font-semibold tracking-wide ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    <span className="inline-block border-b-2 border-blue-500 pb-1">Categories</span>
                  </h2>
                  <motion.div
                    initial={false}
                    animate={{ rotate: isCategoriesSectionExpanded ? 180 : 0 }}
                    className="mr-2"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </motion.div>
                </div>
                <AnimatePresence>
                  {isCategoriesSectionExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {categories.map(category => (
                          <motion.div
                            key={category.id}
                            onClick={() => openEditCategoryModal(category)}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className={`relative overflow-hidden rounded-xl cursor-pointer py-3 px-4 shadow-sm ${
                              theme === 'dark' 
                                ? 'bg-gradient-to-br from-gray-800 to-gray-900 hover:shadow-lg hover:shadow-blue-900/10' 
                                : 'bg-gradient-to-br from-white to-gray-50 hover:shadow-lg hover:shadow-blue-200/40'
                            } transition-all duration-200 border border-opacity-20 backdrop-blur-sm ${
                              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                            }`}
                          >
                            <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: category.color || '#3B82F6' }}></div>
                            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" 
                                style={{ 
                                  backgroundColor: category.color || '#3B82F6', 
                                  filter: 'blur(25px)',
                                  transform: 'translate(30%, -30%)'
                                }}></div>
                            
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-800/80' : 'bg-white/80'} 
                                  shadow-sm backdrop-blur-sm border border-opacity-20 ${
                                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                                  }`}
                              >
                                <FaFolder className="text-base" style={{ color: category.color || '#3B82F6' }} />
                              </div>
                              <div>
                                <span className="font-medium line-clamp-1">{category.name}</span>
                                <span className={`text-xs block mt-0.5 ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  {filteredMenuItems.filter(item => item.category_id === category.id).length} items
                                </span>
                              </div>
                            </div>
                            
                            <motion.div 
                              className={`absolute inset-0 ${theme === 'dark' ? 'bg-blue-500' : 'bg-blue-400'} opacity-0`}
                              initial={{ opacity: 0 }}
                              whileHover={{ opacity: 0.03 }}
                              transition={{ duration: 0.2 }}
                            />
                          </motion.div>
                        ))}
                        
                        {/* Add Category Button */}
                        <motion.div
                          onClick={openAddCategoryModal}
                          whileHover={{ scale: 1.03, y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          className={`relative overflow-hidden rounded-xl cursor-pointer py-3 px-4 shadow-sm border border-dashed ${
                            theme === 'dark'
                              ? 'bg-gray-800/50 border-gray-700 hover:border-blue-700 hover:shadow-blue-900/10' 
                              : 'bg-gray-50/50 border-gray-300 hover:border-blue-400 hover:shadow-blue-200/40'
                          } transition-all duration-200 flex items-center justify-center`}
                        >
                          <div className={`flex flex-col items-center ${
                            theme === 'dark' ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'
                          }`}>
                            <FaPlus className="text-xl mb-1" />
                            <span className="text-sm font-medium">Add Category</span>
                          </div>
                          
                          <motion.div 
                            className={`absolute inset-0 ${theme === 'dark' ? 'bg-blue-500' : 'bg-blue-400'} opacity-0`}
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 0.03 }}
                            transition={{ duration: 0.2 }}
                          />
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Menu items grid */}
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className={`p-6 text-center ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                <p>Error loading menu items. Please try again later.</p>
              </div>
            ) : filteredMenuItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMenuItems.map(item => (
                  <MenuItemCard 
                    key={`menu-item-card-${item.id}`} 
                    item={item} 
                    theme={theme} 
                    openEditMenuItemModal={openEditMenuItemModal}
                    handleDeleteMenuItem={handleDeleteMenuItem}
                  />
                ))}
              </div>
            ) : (
              <div className={`p-12 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                <FaSearch className="mx-auto text-4xl mb-4" />
                <p className="text-xl font-medium mb-2">No menu items found</p>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'orders' && (
          <div>
            <OrderManagement />
          </div>
        )}
      </div>
      {isMenuItemModalOpen && (
        <MenuItemModal 
          isOpen={isMenuItemModalOpen} 
          onClose={closeMenuItemModal} 
          menuItem={selectedMenuItem} 
        />
      )}
      {isCategoryModalOpen && (
        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={closeCategoryModal}
          category={selectedCategory}
        />
      )}
    </div>
  );

  return (
    <DashboardLayout activeLink="Restaurant" title="Restaurant Management">
      {pageContent}
    </DashboardLayout>
  );
};

// Menu Item Card Component - memoized to prevent unnecessary re-renders
const MenuItemCard = React.memo(({ item, theme, openEditMenuItemModal, handleDeleteMenuItem }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring" }}
      layout
      layoutId={`menu-item-${item.id}`}
      className={`rounded-xl shadow-sm overflow-hidden ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}
    >
      {/* Header (always visible) */}
      <div 
        onClick={toggleExpand}
        className={`p-4 cursor-pointer flex justify-between items-center ${
          !isExpanded && 'border-b-0'
        }`}
      >
        <div className="flex items-center">
          <h3 className="text-lg font-bold">{item.name}</h3>
          <motion.div
            initial={false}
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="ml-2"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </motion.div>
        </div>
        <span className={`font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
          GH₵{item.price.toFixed(2)}
        </span>
      </div>
      
      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {item.image_url && (
              <div className="h-48 overflow-hidden">
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="px-4 pb-4">
              {item.description && (
                <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {item.description}
                </p>
              )}
              
              <div className="flex flex-wrap gap-2 mb-3">
                {item.is_vegetarian && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                  }`}>
                    Vegetarian
                  </span>
                )}
                
                {item.is_vegan && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                  }`}>
                    Vegan
                  </span>
                )}
                
                {item.is_gluten_free && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    theme === 'dark' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    Gluten Free
                  </span>
                )}
                
                {item.restaurant_categories && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    theme === 'dark' ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {item.restaurant_categories.name}
                  </span>
                )}
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {item.preparation_time ? `${item.preparation_time} mins` : 'Prep time varies'}
                </span>
                
                <div className="flex space-x-2">
                  <button 
                    className={`p-2 rounded-full ${
                      theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                    title="Edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditMenuItemModal(item);
                    }}
                  >
                    <FaEdit className="h-4 w-4" />
                  </button>
                  <button 
                    className={`p-2 rounded-full ${
                      theme === 'dark' ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'
                    }`}
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
                        handleDeleteMenuItem(item.id);
                      }
                    }}
                  >
                    <FaTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default RestaurantPage;
