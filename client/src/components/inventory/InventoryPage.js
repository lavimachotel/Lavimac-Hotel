import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useTheme } from '../../context/ThemeContext';
import { motion } from 'framer-motion';
import { 
  FaBoxOpen, 
  FaPlus, 
  FaSearch, 
  FaFilter, 
  FaSort, 
  FaExclamationTriangle, 
  FaSync,
  FaBoxes, 
  FaWarehouse, 
  FaClipboardList, 
  FaLayerGroup,
  FaEdit, 
  FaTrash, 
  FaSortUp, 
  FaSortDown, 
  FaEye,
  FaTags, 
  FaHistory, 
  FaExchangeAlt
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import AddItemModal from './AddItemModal';
import CategoryModal from './CategoryModal';
import TransactionModal from './TransactionModal';
import TransactionsHistory from './TransactionsHistory';
import DashboardLayout from '../DashboardLayout';

const InventoryPage = () => {
  const { 
    inventoryItems, 
    categories, 
    lowStockItems,
    loading, 
    error, 

    fetchInventoryItems,
    deleteInventoryItem
  } = useInventory();
  
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  
  useEffect(() => {
    document.title = 'Inventory Management | Hotel Management System';
    fetchInventoryItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  

  // Filter and sort inventory items
  const filteredItems = React.useMemo(() => {
    let filtered = [...inventoryItems];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category_id === categoryFilter);
    }
    
    // Apply tab filter
    if (activeTab === 'lowStock') {
      filtered = filtered.filter(item => item.current_stock <= item.reorder_point);
    }
    
    // Sort items
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [inventoryItems, searchTerm, categoryFilter, sortConfig, activeTab]);

  // Handle sort request
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Calculate inventory statistics
  const stats = React.useMemo(() => {
    const totalItems = inventoryItems.length;
    const totalStock = inventoryItems.reduce((sum, item) => sum + item.current_stock, 0);
    const lowStockCount = lowStockItems.length;
    const totalCategories = categories.length;
    
    return { totalItems, totalStock, lowStockCount, totalCategories };
  }, [inventoryItems, lowStockItems, categories]);

  // Get category name by ID
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };

  // Get stock status class
  const getStockStatusClass = (item) => {
    if (item.current_stock <= item.minimum_stock) {
      return theme === 'dark' ? 'text-red-400' : 'text-red-600';
    } else if (item.current_stock <= item.reorder_point) {
      return theme === 'dark' ? 'text-amber-400' : 'text-amber-600';
    } else {
      return theme === 'dark' ? 'text-green-400' : 'text-green-600';
    }
  };

  // Close all modals
  const closeAllModals = () => {
    setIsAddModalOpen(false);
    setIsViewModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsCategoryModalOpen(false);
    setIsHistoryVisible(false);
    setSelectedItem(null);
    setDeleteConfirmItem(null);
    
    // Refresh data after modal closes
    fetchInventoryItems();
  };

  return (
    <DashboardLayout activeLink="Inventory" title="Inventory Management">
      <div className="inventory-page p-6">
        <Toaster position="top-right" />
        
        {/* Page header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center"
            >
              <FaBoxOpen 
                className={`text-3xl mr-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} 
              />
              <div>
                <h1 className="text-3xl font-bold">Inventory Management</h1>
                <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Manage your hotel's inventory items and stock levels
                </p>
              </div>
            </motion.div>
            
            <div className="flex space-x-3">

              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCategoryModalOpen(true)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                  theme === 'dark' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                } transition-colors duration-200`}
              >
                <FaTags className="mr-2" />
                Manage Categories
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAddModalOpen(true)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                  theme === 'dark' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                } transition-colors duration-200`}
              >
                <FaPlus className="mr-2" />
                Add Item
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  fetchInventoryItems();
                }}
                className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                  theme === 'dark' 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                } transition-colors duration-200`}
              >
                <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
            </div>
          </div>
          
          {/* Search and filter controls */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className={`flex-1 min-w-[300px] relative ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              <FaSearch 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
              />
              <input
                type="text"
                placeholder="Search by name, SKU, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
              />
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg appearance-none ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-800'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-l-lg font-medium transition-colors ${
                  activeTab === 'all'
                    ? theme === 'dark' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-500 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Items
              </button>
              <button
                onClick={() => setActiveTab('lowStock')}
                className={`px-4 py-2 rounded-r-lg font-medium transition-colors ${
                  activeTab === 'lowStock'
                    ? theme === 'dark' 
                      ? 'bg-amber-600 text-white' 
                      : 'bg-amber-500 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Low Stock ({lowStockItems.length})
              </button>
            </div>
            
            <div>
              <button
                onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                  isHistoryVisible
                    ? theme === 'dark' 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-teal-500 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                } transition-colors duration-200`}
              >
                <FaHistory className="mr-2" />
                {isHistoryVisible ? 'Hide Transactions' : 'View Transactions'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Inventory statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={`p-6 rounded-xl shadow-sm ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Items</p>
                <h3 className="text-2xl font-bold mt-1">{stats.totalItems}</h3>
              </div>
              <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <FaBoxes 
                  className={`text-xl ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} 
                />
              </div>
            </div>
            <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                {filteredItems.length} items in current view
              </p>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className={`p-6 rounded-xl shadow-sm ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Stock</p>
                <h3 className="text-2xl font-bold mt-1">{stats.totalStock.toLocaleString()}</h3>
              </div>
              <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <FaWarehouse 
                  className={`text-xl ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} 
                />
              </div>
            </div>
            <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                Units across all inventory items
              </p>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className={`p-6 rounded-xl shadow-sm ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Low Stock Items</p>
                <h3 className="text-2xl font-bold mt-1">{stats.lowStockCount}</h3>
              </div>
              <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'}`}>
                <FaExclamationTriangle 
                  className={`text-xl ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} 
                />
              </div>
            </div>
            <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                Items below reorder point
              </p>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className={`p-6 rounded-xl shadow-sm ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Categories</p>
                <h3 className="text-2xl font-bold mt-1">{stats.totalCategories}</h3>
              </div>
              <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                <FaLayerGroup 
                  className={`text-xl ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} 
                />
              </div>
            </div>
            <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                Item categories available
              </p>
            </div>
          </motion.div>
        </div>
        
        {/* Transactions History (conditionally rendered) */}
        {isHistoryVisible && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <TransactionsHistory />
          </motion.div>
        )}
        
        {/* Inventory table */}
        <div className={`rounded-xl shadow-sm overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          {loading ? (
            <div className="p-8 flex justify-center items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className={`p-6 text-center ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
              <FaExclamationTriangle className="text-3xl mb-2" />
              <p>Error loading inventory data. Please try again later.</p>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className={`w-full ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('name')}
                    >
                      <div className="flex items-center">
                        Item Name
                        {sortConfig.key === 'name' && sortConfig.direction === 'ascending' && (
                          <FaSortUp className="ml-1" />
                        )}
                        {sortConfig.key === 'name' && sortConfig.direction === 'descending' && (
                          <FaSortDown className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Category
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('sku')}
                    >
                      <div className="flex items-center">
                        SKU
                        {sortConfig.key === 'sku' && sortConfig.direction === 'ascending' && (
                          <FaSortUp className="ml-1" />
                        )}
                        {sortConfig.key === 'sku' && sortConfig.direction === 'descending' && (
                          <FaSortDown className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('current_stock')}
                    >
                      <div className="flex items-center">
                        Current Stock
                        {sortConfig.key === 'current_stock' && sortConfig.direction === 'ascending' && (
                          <FaSortUp className="ml-1" />
                        )}
                        {sortConfig.key === 'current_stock' && sortConfig.direction === 'descending' && (
                          <FaSortDown className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Reorder Point
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredItems.map(item => (
                    <motion.tr 
                      key={item.id} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {item.description.length > 60 
                              ? `${item.description.substring(0, 60)}...` 
                              : item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          theme === 'dark' ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {getCategoryName(item.category_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-mono text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {item.sku || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        {item.current_stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          {item.unit_of_measure}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          {item.reorder_point}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.current_stock <= item.minimum_stock ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
                          }`}>
                            Out of Stock
                          </span>
                        ) : item.current_stock <= item.reorder_point ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            theme === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Low Stock
                          </span>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                          }`}>
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-3">
                          <button 
                            className={theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}
                            onClick={() => {
                              setSelectedItem(item);
                              setIsViewModalOpen(true);
                            }}
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button 
                            className={theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-800'}
                            onClick={() => {
                              setSelectedItemId(item.id);
                              setIsTransactionModalOpen(true);
                            }}
                            title="Add Transaction"
                          >
                            <FaExchangeAlt />
                          </button>
                          <button 
                            className={theme === 'dark' ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-800'}
                            onClick={() => {
                              setSelectedItem(item);
                              setIsEditModalOpen(true);
                            }}
                            title="Edit Item"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className={theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'}
                            onClick={() => {
                              setDeleteConfirmItem(item);
                              setIsDeleteModalOpen(true);
                            }}
                            title="Delete Item"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <FaSearch className="text-3xl mb-2" />
              <p>No inventory items found matching your criteria.</p>
            </div>
          )}
        </div>
        
        {/* Modals */}
        <AddItemModal 
          isOpen={isAddModalOpen || isEditModalOpen} 
          onClose={closeAllModals}
          itemToEdit={isEditModalOpen ? selectedItem : null}
        />
        
        {/* Conditional rendering of category modal */}
        {isCategoryModalOpen && (
          <CategoryModal 
            isOpen={isCategoryModalOpen} 
            onClose={closeAllModals}
          />
        )}
        
        {/* Transaction modal for stock adjustments */}
        {isTransactionModalOpen && (
          <TransactionModal 
            isOpen={isTransactionModalOpen} 
            onClose={closeAllModals}
            itemId={selectedItemId}
          />
        )}
        
        {/* View Item Modal */}
        {isViewModalOpen && selectedItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-2xl rounded-xl shadow-lg overflow-hidden ${
                theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              }`}
            >
              <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Item Details</h3>
                  <button 
                    onClick={closeAllModals}
                    className={`p-1 rounded-full hover:bg-opacity-20 ${
                      theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                    }`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Name</p>
                    <p className="font-medium text-lg">{selectedItem.name}</p>
                  </div>
                  
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>SKU</p>
                    <p className="font-mono">{selectedItem.sku || '-'}</p>
                  </div>
                  
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Category</p>
                    <p>{getCategoryName(selectedItem.category_id)}</p>
                  </div>
                  
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Current Stock</p>
                    <p className={`font-medium ${getStockStatusClass(selectedItem)}`}>
                      {selectedItem.current_stock} {selectedItem.unit_of_measure}
                    </p>
                  </div>
                  
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Reorder Point</p>
                    <p>{selectedItem.reorder_point} {selectedItem.unit_of_measure}</p>
                  </div>
                  
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Minimum Stock</p>
                    <p>{selectedItem.minimum_stock} {selectedItem.unit_of_measure}</p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Description</p>
                    <p>{selectedItem.description || 'No description provided.'}</p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Notes</p>
                    <p>{selectedItem.notes || 'No notes available.'}</p>
                  </div>
                </div>
              </div>
              
              <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setSelectedItemId(selectedItem.id);
                      setIsTransactionModalOpen(true);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      theme === 'dark' 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    <FaExchangeAlt className="mr-2" />
                    Add Transaction
                  </button>
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setIsEditModalOpen(true);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      theme === 'dark' 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <FaEdit className="mr-2" />
                    Edit Item
                  </button>
                  <button
                    onClick={closeAllModals}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      theme === 'dark' 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && deleteConfirmItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md rounded-xl shadow-lg overflow-hidden ${
                theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              }`}
            >
              <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className="text-xl font-bold">Confirm Delete</h3>
              </div>
              
              <div className="px-6 py-4">
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-full mr-4 ${
                    theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'
                  }`}>
                    <FaExclamationTriangle className="text-xl" />
                  </div>
                  <div>
                    <p className="font-medium">Are you sure you want to delete this item?</p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span className="font-semibold">{deleteConfirmItem.name}</span> will be permanently removed.
                    </p>
                  </div>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  This action cannot be undone. All data associated with this item will be lost.
                </p>
              </div>
              
              <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeleteConfirmItem(null);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      theme === 'dark' 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await deleteInventoryItem(deleteConfirmItem.id);
                        toast.success(`${deleteConfirmItem.name} has been deleted.`);
                        setIsDeleteModalOpen(false);
                        setDeleteConfirmItem(null);
                        fetchInventoryItems();
                      } catch (error) {
                        toast.error(`Failed to delete item: ${error.message}`);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      theme === 'dark' 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    <FaTrash className="mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InventoryPage;
