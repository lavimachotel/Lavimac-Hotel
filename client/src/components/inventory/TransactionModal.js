import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useTheme } from '../../context/ThemeContext';
import { FaTimes, FaPlus, FaMinus, FaExchangeAlt } from 'react-icons/fa';

const TransactionModal = ({ isOpen, onClose, itemId = null, transaction = null, readOnly = false }) => {
  const { inventoryItems, addTransaction, updateTransaction } = useInventory();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const initialFormState = {
    item_id: itemId || '',
    transaction_type: 'purchase',
    quantity: 0,
    unit_price: 0,
    total_price: 0,
    reference_number: '',
    notes: '',
    department: ''
  };
  
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Reset form when modal opens or itemId changes or transaction changes
  React.useEffect(() => {
    if (isOpen) {
      if (transaction) {
        // Editing mode - use existing transaction data
        setFormData({
          item_id: transaction.item_id,
          transaction_type: transaction.transaction_type,
          quantity: transaction.quantity,
          unit_price: transaction.unit_price || 0,
          total_price: transaction.total_price || 0,
          reference_number: transaction.reference_number || '',
          notes: transaction.notes || '',
          department: transaction.department || ''
        });
      } else {
        // Adding mode - use initial state
        setFormData({
          ...initialFormState,
          item_id: itemId || ''
        });
      }
      setErrors({});
    }
  }, [isOpen, itemId, transaction]);
  
  if (!isOpen) return null;
  
  // Get the selected item details
  const selectedItem = itemId 
    ? inventoryItems.find(item => item.id === itemId) 
    : formData.item_id
      ? inventoryItems.find(item => item.id === formData.item_id)
      : null;
  
  const handleChange = (e) => {
    if (readOnly) return;
    
    const { name, value } = e.target;
    
    // Convert numeric fields to numbers
    const numericFields = ['quantity', 'unit_price'];
    const processedValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
    
    let updatedFormData = {
      ...formData,
      [name]: processedValue
    };
    
    // Auto-calculate total price when quantity or unit price changes
    if (name === 'quantity' || name === 'unit_price') {
      updatedFormData.total_price = (updatedFormData.quantity * updatedFormData.unit_price).toFixed(2);
    }
    
    setFormData(updatedFormData);
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  const validateForm = () => {
    if (readOnly) return true;
    
    const newErrors = {};
    
    if (!formData.item_id) {
      newErrors.item_id = 'Please select an item';
    }
    
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than zero';
    }
    
    if (formData.transaction_type === 'consumption' && selectedItem) {
      // Check if there's enough stock for consumption
      if (!transaction && formData.quantity > selectedItem.current_stock) {
        newErrors.quantity = `Not enough stock. Current stock: ${selectedItem.current_stock} ${selectedItem.unit_of_measure}`;
      } else if (transaction && formData.quantity > (selectedItem.current_stock + transaction.quantity)) {
        // When editing, we need to account for the original transaction quantity
        newErrors.quantity = `Not enough stock. Current stock: ${selectedItem.current_stock + transaction.quantity} ${selectedItem.unit_of_measure}`;
      }
    }
    
    if (formData.transaction_type === 'purchase' && formData.unit_price < 0) {
      newErrors.unit_price = 'Unit price cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (readOnly) {
      onClose();
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      if (transaction) {
        // Update existing transaction
        await updateTransaction(transaction.id, formData);
      } else {
        // Add new transaction
        await addTransaction(formData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error processing transaction:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getTransactionTypeIcon = () => {
    switch (formData.transaction_type) {
      case 'purchase':
        return <FaPlus className="text-green-500" />;
      case 'consumption':
        return <FaMinus className="text-red-500" />;
      case 'adjustment':
        return <FaExchangeAlt className="text-blue-500" />;
      default:
        return null;
    }
  };
  
  const getTransactionTitle = () => {
    if (readOnly) return 'Transaction Details';
    if (transaction) return 'Edit Transaction';
    
    switch (formData.transaction_type) {
      case 'purchase':
        return <span className="flex items-center"><FaPlus className="mr-2 text-green-500" /> Add Inventory</span>;
      case 'consumption':
        return <span className="flex items-center"><FaMinus className="mr-2 text-red-500" /> Consume Inventory</span>;
      case 'adjustment':
        return <span className="flex items-center"><FaExchangeAlt className="mr-2 text-yellow-500" /> Adjust Inventory</span>;
      case 'transfer':
        return <span className="flex items-center"><FaExchangeAlt className="mr-2 text-blue-500" /> Transfer Inventory</span>;
      default:
        return 'New Transaction';
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className={`relative w-full max-w-2xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {getTransactionTitle()}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <FaTimes className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`} />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transaction Type */}
            {!readOnly && (
              <div className="col-span-2">
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => !readOnly && setFormData({ ...formData, transaction_type: 'purchase' })}
                    className={`flex items-center justify-center px-4 py-2 rounded-md ${
                      formData.transaction_type === 'purchase'
                        ? 'bg-green-600 text-white'
                        : isDarkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={readOnly}
                  >
                    <FaPlus className="mr-2" /> Purchase
                  </button>
                  <button
                    type="button"
                    onClick={() => !readOnly && setFormData({ ...formData, transaction_type: 'consumption' })}
                    className={`flex items-center justify-center px-4 py-2 rounded-md ${
                      formData.transaction_type === 'consumption'
                        ? 'bg-red-600 text-white'
                        : isDarkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={readOnly}
                  >
                    <FaMinus className="mr-2" /> Consume
                  </button>
                  <button
                    type="button"
                    onClick={() => !readOnly && setFormData({ ...formData, transaction_type: 'adjustment' })}
                    className={`flex items-center justify-center px-4 py-2 rounded-md ${
                      formData.transaction_type === 'adjustment'
                        ? 'bg-yellow-600 text-white'
                        : isDarkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={readOnly}
                  >
                    <FaExchangeAlt className="mr-2" /> Adjust
                  </button>
                  <button
                    type="button"
                    onClick={() => !readOnly && setFormData({ ...formData, transaction_type: 'transfer' })}
                    className={`flex items-center justify-center px-4 py-2 rounded-md ${
                      formData.transaction_type === 'transfer'
                        ? 'bg-blue-600 text-white'
                        : isDarkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={readOnly}
                  >
                    <FaExchangeAlt className="mr-2" /> Transfer
                  </button>
                </div>
              </div>
            )}
            
            {/* Display transaction type in read-only mode */}
            {readOnly && (
              <div className="col-span-2">
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Transaction Type
                </label>
                <div className={`px-3 py-2 rounded-md ${
                  formData.transaction_type === 'purchase'
                    ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                    : formData.transaction_type === 'consumption'
                      ? isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
                      : formData.transaction_type === 'adjustment'
                        ? isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
                        : isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                }`}>
                  <div className="flex items-center">
                    {formData.transaction_type === 'purchase' && <FaPlus className="mr-2" />}
                    {formData.transaction_type === 'consumption' && <FaMinus className="mr-2" />}
                    {(formData.transaction_type === 'adjustment' || formData.transaction_type === 'transfer') && <FaExchangeAlt className="mr-2" />}
                    {formData.transaction_type.charAt(0).toUpperCase() + formData.transaction_type.slice(1)}
                  </div>
                </div>
              </div>
            )}
            
            {/* Item Information */}
            {/* If transaction is being edited and has item_id, or if itemId is provided, show item details */}
            {(itemId || (transaction && transaction.item_id)) ? (
              <div className="col-span-2 bg-opacity-50 p-4 rounded-md mb-2" 
                   style={{ 
                     backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.7)'
                   }}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{selectedItem ? selectedItem.name : 'Loading...'}</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Current Stock: {selectedItem ? (
                        <span className={selectedItem.current_stock <= selectedItem.reorder_point ? 'text-red-500 font-medium' : ''}>
                          {selectedItem.current_stock} {selectedItem.unit_of_measure}
                        </span>
                      ) : '...'}
                    </p>
                  </div>
                  {selectedItem && selectedItem.current_stock <= selectedItem.reorder_point && (
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
                    }`}>
                      Low Stock
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="col-span-2">
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Item *
                </label>
                <select
                  name="item_id"
                  value={formData.item_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.item_id ? 'border-red-500' : isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                  }`}
                  disabled={transaction !== null || readOnly}
                >
                  <option value="">Select an item</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} - ({item.current_stock} {item.unit_of_measure} available)
                    </option>
                  ))}
                </select>
                {errors.item_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.item_id}</p>
                )}
              </div>
            )}
            
            {/* Quantity */}
            <div>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                Quantity {!readOnly && '*'}
              </label>
              {readOnly ? (
                <div className={`px-3 py-2 border rounded-md ${
                  isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}>
                  {formData.quantity} {selectedItem ? selectedItem.unit_of_measure : ''}
                </div>
              ) : (
                <div className="flex">
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    className={`w-full px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.quantity ? 'border-red-500' : isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                    }`}
                    placeholder="Enter quantity"
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                  <div className={`px-3 py-2 border rounded-r-md ${
                    isDarkMode ? 'border-gray-600 bg-gray-600 text-gray-300' : 'border-gray-300 bg-gray-100 text-gray-700'
                  }`}>
                    {selectedItem ? selectedItem.unit_of_measure : 'units'}
                  </div>
                </div>
              )}
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
              )}
            </div>
            
            {/* Unit Price (only for purchase and adjustment) */}
            {(formData.transaction_type === 'purchase' || formData.transaction_type === 'adjustment') && (
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Unit Price
                </label>
                {readOnly ? (
                  <div className={`px-3 py-2 border rounded-md ${
                    isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-200 bg-gray-50 text-gray-700'
                  }`}>
                    ₵{parseFloat(formData.unit_price).toFixed(2)}
                  </div>
                ) : (
                  <div className="flex">
                    <div className={`px-3 py-2 border rounded-l-md ${
                      isDarkMode ? 'border-gray-600 bg-gray-600 text-gray-300' : 'border-gray-300 bg-gray-100 text-gray-700'
                    }`}>
                      ₵
                    </div>
                    <input
                      type="number"
                      name="unit_price"
                      value={formData.unit_price}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.unit_price ? 'border-red-500' : isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                      }`}
                      placeholder="0.00"
                      readOnly={readOnly}
                      disabled={readOnly}
                    />
                  </div>
                )}
                {errors.unit_price && (
                  <p className="mt-1 text-sm text-red-600">{errors.unit_price}</p>
                )}
              </div>
            )}
            
            {/* Total Price (calculated automatically) */}
            {(formData.transaction_type === 'purchase' || formData.transaction_type === 'adjustment') && (
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Total Price
                </label>
                <div className={`px-3 py-2 border rounded-md ${
                  isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}>
                  ₵{parseFloat(formData.total_price).toFixed(2)}
                </div>
              </div>
            )}
            
            {/* Department */}
            <div>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                Department
              </label>
              {readOnly ? (
                <div className={`px-3 py-2 border rounded-md ${
                  isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}>
                  {formData.department || 'N/A'}
                </div>
              ) : (
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white'
                  }`}
                  placeholder="e.g., Kitchen, Housekeeping"
                  readOnly={readOnly}
                  disabled={readOnly}
                />
              )}
            </div>
            
            {/* Reference Number */}
            <div>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                Reference Number
              </label>
              {readOnly ? (
                <div className={`px-3 py-2 border rounded-md ${
                  isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}>
                  {formData.reference_number || 'N/A'}
                </div>
              ) : (
                <input
                  type="text"
                  name="reference_number"
                  value={formData.reference_number}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white'
                  }`}
                  placeholder="e.g., Invoice #, PO #"
                  readOnly={readOnly}
                  disabled={readOnly}
                />
              )}
            </div>
            
            {/* Notes */}
            <div className="col-span-2">
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                Notes
              </label>
              {readOnly ? (
                <div className={`px-3 py-2 border rounded-md min-h-[60px] ${
                  isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}>
                  {formData.notes || 'No notes provided.'}
                </div>
              ) : (
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="2"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white'
                  }`}
                  placeholder="Additional details about this transaction"
                  readOnly={readOnly}
                  disabled={readOnly}
                />
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-md ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
              disabled={loading}
            >
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center ${
                  transaction
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : formData.transaction_type === 'purchase'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : formData.transaction_type === 'consumption'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : formData.transaction_type === 'adjustment'
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    {transaction ? (
                      <>Save Changes</>
                    ) : (
                      <>
                        {formData.transaction_type === 'purchase' && (
                          <>
                            <FaPlus className="mr-2" /> Add Stock
                          </>
                        )}
                        {formData.transaction_type === 'consumption' && (
                          <>
                            <FaMinus className="mr-2" /> Consume Stock
                          </>
                        )}
                        {formData.transaction_type === 'adjustment' && (
                          <>
                            <FaExchangeAlt className="mr-2" /> Adjust Stock
                          </>
                        )}
                        {formData.transaction_type === 'transfer' && (
                          <>
                            <FaExchangeAlt className="mr-2" /> Transfer Stock
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
