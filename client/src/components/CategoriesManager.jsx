import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, faPlus, faEdit, faTrash, faLayerGroup,
  faExclamationTriangle, faSync, faSearch
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useInventory } from '../context/InventoryContext';
import CategoryModal from './CategoryModal';
import toast from 'react-hot-toast';

const CategoriesManager = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const { 
    categories, 
    fetchCategories,

    loading
  } = useInventory();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryModalMode, setCategoryModalMode] = useState('add');

  // Fetch categories on component mount
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, fetchCategories]);

  // Filter categories based on search term
  const filteredCategories = React.useMemo(() => {
    if (!searchTerm) return categories;
    
    return categories.filter(category => 
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [categories, searchTerm]);

  // Open category modal
  const openCategoryModal = (mode = 'add', category = null) => {
    setCategoryModalMode(mode);
    setSelectedCategory(category);
    setIsCategoryModalOpen(true);
  };

  // Close category modal
  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setSelectedCategory(null);
    fetchCategories();
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
              className={`relative w-full max-w-3xl rounded-xl shadow-xl overflow-hidden ${
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
                      theme === 'dark' ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'
                    }`}>
                      <FontAwesomeIcon icon={faLayerGroup} className="text-lg" />
                    </div>
                    <h2 className={`text-xl font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      Manage Categories
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
              <div className={`p-6 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {/* Search and Add */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className={`flex-1 min-w-[300px] relative ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    <FontAwesomeIcon 
                      icon={faSearch} 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                    />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                      } border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openCategoryModal('add')}
                      className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                        theme === 'dark' 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      } transition-colors duration-200`}
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-2" />
                      Add Category
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={fetchCategories}
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
                
                {/* Categories List */}
                {loading ? (
                  <div className="flex justify-center items-center p-12">
                    <FontAwesomeIcon icon={faSync} className="text-3xl animate-spin text-blue-500 mr-4" />
                    <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Loading categories...
                    </p>
                  </div>
                ) : filteredCategories.length === 0 ? (
                  <div className="flex flex-col justify-center items-center p-12">
                    <FontAwesomeIcon 
                      icon={faLayerGroup} 
                      className={`text-5xl mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} 
                    />
                    <p className={`text-lg mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      No categories found
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {searchTerm 
                        ? 'Try adjusting your search criteria' 
                        : 'Click the "Add Category" button to add your first category'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCategories.map(category => (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`p-4 rounded-lg border ${
                          theme === 'dark' 
                            ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' 
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        } transition-colors`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className={`text-lg font-medium ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {category.name}
                            </h3>
                            {category.description && (
                              <p className={`mt-1 text-sm ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {category.description}
                              </p>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => openCategoryModal('edit', category)}
                              className={`p-1.5 rounded-full ${
                                theme === 'dark'
                                  ? 'text-amber-400 hover:bg-amber-900/30'
                                  : 'text-amber-600 hover:bg-amber-100'
                              } transition-colors`}
                              title="Edit Category"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button
                              onClick={() => openCategoryModal('view', category)}
                              className={`p-1.5 rounded-full ${
                                theme === 'dark'
                                  ? 'text-blue-400 hover:bg-blue-900/30'
                                  : 'text-blue-600 hover:bg-blue-100'
                              } transition-colors`}
                              title="View Category"
                            >
                              <FontAwesomeIcon icon={faLayerGroup} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className={`px-6 py-4 border-t ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex justify-end">
                  <button
                    onClick={onClose}
                    className={`px-4 py-2 rounded-lg ${
                      theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    } transition-colors`}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Category Modal */}
          <CategoryModal
            isOpen={isCategoryModalOpen}
            onClose={closeCategoryModal}
            mode={categoryModalMode}
            category={selectedCategory}
          />
        </div>
      )}
    </AnimatePresence>
  );
};

export default CategoriesManager;
