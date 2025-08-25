import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBoxOpen, faPlus, faSearch, faFilter, 
  faSort, faExclamationTriangle, faSync,
  faBoxes, faWarehouse, faClipboardList, faLayerGroup,
  faEdit, faTrash, faSortUp, faSortDown, faEye,
  faTags
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import InventoryItemModal from '../components/InventoryItemModal';
import CategoriesManager from '../components/CategoriesManager';

const InventoryPage = () => {
  const { 
    inventoryItems, 
    categories, 
    lowStockItems,
    loading, 
    error, 
    
    fetchInventoryItems
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
  const [isCategoriesManagerOpen, setIsCategoriesManagerOpen] = useState(false);

  // Fetch inventory data on component mount
  useEffect(() => {
    const loadData = async () => {
      await fetchInventoryItems();
    };
    
    loadData();
  }, [fetchInventoryItems]);

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
    if (activeTab === 'low-stock') {
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

  // Handle view item details
  const handleViewItem = (item) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  };

  // Handle edit item
  const handleEditItem = (item) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  // Handle delete item
  const handleDeleteItem = (item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
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
    setIsCategoriesManagerOpen(false);
    setSelectedItem(null);
    
    // Refresh data after modal closes
    fetchInventoryItems();
  };

  return (
    <div className="inventory-page p-6">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center"
          >
            <FontAwesomeIcon 
              icon={faBoxOpen} 
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
              onClick={() => setIsCategoriesManagerOpen(true)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                theme === 'dark' 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              } transition-colors duration-200`}
            >
              <FontAwesomeIcon icon={faTags} className="mr-2" />
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
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Add Item
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchInventoryItems()}
              className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              } transition-colors duration-200`}
            >
              <FontAwesomeIcon icon={faSync} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
          </div>
        </div>
        
        {/* Search and filter controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className={`flex-1 min-w-[300px] relative ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            <FontAwesomeIcon 
              icon={faSearch} 
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
              onClick={() => setActiveTab('low-stock')}
              className={`px-4 py-2 rounded-r-lg font-medium transition-colors ${
                activeTab === 'low-stock'
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
              <FontAwesomeIcon 
                icon={faBoxes} 
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
              <FontAwesomeIcon 
                icon={faWarehouse} 
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
              <FontAwesomeIcon 
                icon={faExclamationTriangle} 
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
              <FontAwesomeIcon 
                icon={faLayerGroup} 
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
      
      {/* Inventory table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className={`rounded-xl shadow-sm overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <FontAwesomeIcon icon={faSync} className="text-3xl animate-spin text-blue-500 mr-4" />
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Loading inventory data...
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col justify-center items-center p-12">
            <FontAwesomeIcon 
              icon={faBoxOpen} 
              className={`text-5xl mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} 
            />
            <p className={`text-lg mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              No inventory items found
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              {searchTerm || categoryFilter 
                ? 'Try adjusting your search or filter criteria' 
                : 'Click the "Add Item" button to add your first inventory item'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'}>
                <tr>
                  <th 
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                    onClick={() => requestSort('name')}
                  >
                    <div className="flex items-center">
                      <span>Name</span>
                      {sortConfig.key === 'name' && (
                        <FontAwesomeIcon 
                          icon={sortConfig.direction === 'ascending' ? faSortUp : faSortDown} 
                          className="ml-1" 
                        />
                      )}
                    </div>
                  </th>
                  <th 
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                    onClick={() => requestSort('sku')}
                  >
                    <div className="flex items-center">
                      <span>SKU</span>
                      {sortConfig.key === 'sku' && (
                        <FontAwesomeIcon 
                          icon={sortConfig.direction === 'ascending' ? faSortUp : faSortDown} 
                          className="ml-1" 
                        />
                      )}
                    </div>
                  </th>
                  <th 
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    Category
                  </th>
                  <th 
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                    onClick={() => requestSort('current_stock')}
                  >
                    <div className="flex items-center">
                      <span>Stock</span>
                      {sortConfig.key === 'current_stock' && (
                        <FontAwesomeIcon 
                          icon={sortConfig.direction === 'ascending' ? faSortUp : faSortDown} 
                          className="ml-1" 
                        />
                      )}
                    </div>
                  </th>
                  <th 
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                    onClick={() => requestSort('unit_cost')}
                  >
                    <div className="flex items-center">
                      <span>Unit Cost</span>
                      {sortConfig.key === 'unit_cost' && (
                        <FontAwesomeIcon 
                          icon={sortConfig.direction === 'ascending' ? faSortUp : faSortDown} 
                          className="ml-1" 
                        />
                      )}
                    </div>
                  </th>
                  <th 
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    Location
                  </th>
                  <th 
                    className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {filteredItems.map((item) => (
                  <motion.tr 
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`${
                      theme === 'dark' 
                        ? 'hover:bg-gray-700/50' 
                        : 'hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {item.name}
                          </div>
                          {item.description && (
                            <div className={`text-xs ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {item.description.length > 60 
                                ? `${item.description.substring(0, 60)}...` 
                                : item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {item.sku}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {item.inventory_categories ? item.inventory_categories.name : getCategoryName(item.category_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getStockStatusClass(item)}`}>
                        {item.current_stock} {item.unit_of_measure}
                      </div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Min: {item.minimum_stock} | Reorder: {item.reorder_point}
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      ${item.unit_cost.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {item.location || 'Not specified'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewItem(item)}
                          className={`p-1.5 rounded-full ${
                            theme === 'dark'
                              ? 'text-blue-400 hover:bg-blue-900/30'
                              : 'text-blue-600 hover:bg-blue-100'
                          } transition-colors`}
                          title="View Details"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button
                          onClick={() => handleEditItem(item)}
                          className={`p-1.5 rounded-full ${
                            theme === 'dark'
                              ? 'text-amber-400 hover:bg-amber-900/30'
                              : 'text-amber-600 hover:bg-amber-100'
                          } transition-colors`}
                          title="Edit Item"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className={`p-1.5 rounded-full ${
                            theme === 'dark'
                              ? 'text-red-400 hover:bg-red-900/30'
                              : 'text-red-600 hover:bg-red-100'
                          } transition-colors`}
                          title="Delete Item"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
      
      {/* Modals */}
      <InventoryItemModal 
        isOpen={isAddModalOpen} 
        onClose={closeAllModals} 
        mode="add" 
      />
      
      <InventoryItemModal 
        isOpen={isViewModalOpen} 
        onClose={closeAllModals} 
        mode="view" 
        item={selectedItem} 
      />
      
      <InventoryItemModal 
        isOpen={isEditModalOpen} 
        onClose={closeAllModals} 
        mode="edit" 
        item={selectedItem} 
      />
      
      <CategoriesManager
        isOpen={isCategoriesManagerOpen}
        onClose={closeAllModals}
      />
    </div>
  );
};

export default InventoryPage;
