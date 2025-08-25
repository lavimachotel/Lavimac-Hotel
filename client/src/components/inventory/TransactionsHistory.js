import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useTheme } from '../../context/ThemeContext';
import { FaSort, FaSortUp, FaSortDown, FaSearch, FaFileExport } from 'react-icons/fa';
import { format } from 'date-fns';
import TransactionModal from './TransactionModal';
import toast from 'react-hot-toast';

const TransactionsHistory = ({ itemId = null }) => {
  const { transactions, fetchTransactions, deleteTransaction, loading } = useInventory();
  const { theme } = useTheme();
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [transactionType, setTransactionType] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'transaction_date', direction: 'desc' });
  
  // Add state for handling edit/view modals
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  
  useEffect(() => {
    fetchTransactions();
  }, []); // Remove fetchTransactions from dependencies to prevent infinite loop
  
  useEffect(() => {
    let filtered = [...transactions];
    
    // Filter by item if itemId is provided
    if (itemId) {
      filtered = filtered.filter(transaction => transaction.item_id === itemId);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => 
        (transaction.inventory_items?.name?.toLowerCase().includes(term)) ||
        (transaction.reference_number?.toLowerCase().includes(term)) ||
        (transaction.notes?.toLowerCase().includes(term)) ||
        (transaction.department?.toLowerCase().includes(term))
      );
    }
    
    // Filter by transaction type
    if (transactionType) {
      filtered = filtered.filter(transaction => transaction.transaction_type === transactionType);
    }
    
    // Filter by date range
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(transaction => new Date(transaction.transaction_date) >= startDate);
    }
    
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // End of the day
      filtered = filtered.filter(transaction => new Date(transaction.transaction_date) <= endDate);
    }
    
    // Sort transactions
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        // Handle nested properties like inventory_items.name
        if (sortConfig.key.includes('.')) {
          const [parent, child] = sortConfig.key.split('.');
          if (!a[parent] || !b[parent]) return 0;
          
          if (a[parent][child] < b[parent][child]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
          }
          if (a[parent][child] > b[parent][child]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
          }
          return 0;
        }
        
        // Handle regular properties
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredTransactions(filtered);
  }, [transactions, itemId, searchTerm, dateRange, transactionType, sortConfig]);
  
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="text-gray-300" />;
    return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };
  
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  const getTransactionTypeLabel = (type) => {
    switch (type) {
      case 'purchase':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Purchase</span>;
      case 'consumption':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Consumption</span>;
      case 'adjustment':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Adjustment</span>;
      case 'transfer':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Transfer</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{type}</span>;
    }
  };
  
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return;
    
    // Create CSV content
    const headers = [
      'Date',
      'Item',
      'Type',
      'Quantity',
      'Unit',
      'Unit Price',
      'Total Price',
      'Reference',
      'Department',
      'Notes'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(transaction => [
        formatDate(transaction.transaction_date),
        `"${transaction.inventory_items?.name || transaction.item?.name || ''}"`,
        transaction.transaction_type,
        transaction.quantity,
        transaction.inventory_items?.unit_of_measure || transaction.item?.unit_of_measure || '',
        `₵${parseFloat(transaction.unit_price || 0).toFixed(2)}`,
        `₵${parseFloat(transaction.total_price || 0).toFixed(2)}`,
        `"${transaction.reference_number || ''}"`,
        `"${transaction.department || ''}"`,
        `"${(transaction.notes || '').replace(/"/g, '""')}"` // Escape quotes in notes
      ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Handle viewing transaction details
  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setIsViewMode(true);
    setIsTransactionModalOpen(true);
  };

  // Handle editing a transaction
  const handleEditTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setIsViewMode(false);
    setIsTransactionModalOpen(true);
  };

  // Handle deleting a transaction
  const handleDeleteTransaction = async (id) => {
    try {
      await deleteTransaction(id);
      toast.success('Transaction deleted successfully');
      fetchTransactions(); // Refresh the list
      setIsConfirmDeleteOpen(false);
      setTransactionToDelete(null);
    } catch (error) {
      toast.error(`Failed to delete transaction: ${error.message}`);
    }
  };

  // Handle printing receipt/invoice
  const handlePrintTransaction = (transaction) => {
    // Create a printable version of the transaction
    const printContent = `
      <html>
        <head>
          <title>Transaction Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .receipt { border: 1px solid #ddd; padding: 20px; max-width: 800px; margin: 0 auto; }
            .receipt-item { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h2>Transaction Receipt</h2>
              <p>Date: ${formatDate(transaction.transaction_date)}</p>
              <p>Reference: ${transaction.reference_number || 'N/A'}</p>
            </div>
            
            <h3>Transaction Details</h3>
            <div class="receipt-item">
              <span>Item:</span>
              <span>${transaction.inventory_items?.name || transaction.item?.name || 'Unknown Item'}</span>
            </div>
            <div class="receipt-item">
              <span>Transaction Type:</span>
              <span>${transaction.transaction_type.toUpperCase()}</span>
            </div>
            <div class="receipt-item">
              <span>Quantity:</span>
              <span>${transaction.quantity} ${transaction.inventory_items?.unit_of_measure || transaction.item?.unit_of_measure || ''}</span>
            </div>
            <div class="receipt-item">
              <span>Unit Price:</span>
              <span>₵${parseFloat(transaction.unit_price || 0).toFixed(2)}</span>
            </div>
            <div class="receipt-item">
              <span>Total:</span>
              <span>₵${parseFloat(transaction.total_price || 0).toFixed(2)}</span>
            </div>
            <div class="receipt-item">
              <span>Department:</span>
              <span>${transaction.department || 'N/A'}</span>
            </div>
            
            ${transaction.notes ? `
            <h3>Notes</h3>
            <p>${transaction.notes}</p>
            ` : ''}
            
            <div class="footer">
              <p>This is an electronically generated receipt.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Open a new window and print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Print after a short delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Close all modals
  const closeAllModals = () => {
    setIsTransactionModalOpen(false);
    setSelectedTransaction(null);
    setIsViewMode(false);
    setIsConfirmDeleteOpen(false);
    setTransactionToDelete(null);
  };
  
  return (
    <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg shadow overflow-hidden`}>
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Transaction History</h2>
        
        {/* Filters */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
            </div>
            <input
              type="text"
              placeholder="Search transactions..."
              className={`pl-10 pr-4 py-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
              } border`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Transaction Type Filter */}
          <div>
            <select
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
            >
              <option value="">All Transaction Types</option>
              <option value="purchase">Purchases</option>
              <option value="consumption">Consumption</option>
              <option value="adjustment">Adjustments</option>
              <option value="transfer">Transfers</option>
            </select>
          </div>
          
          {/* Date Range Filters */}
          <div className="flex space-x-2">
            <input
              type="date"
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              placeholder="Start Date"
            />
            <input
              type="date"
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              placeholder="End Date"
            />
          </div>
          
          {/* Export Button */}
          <div className="flex justify-end">
            <button
              onClick={exportToCSV}
              disabled={filteredTransactions.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaFileExport className="mr-2" /> Export CSV
            </button>
          </div>
        </div>
      </div>
      
      {/* Transactions Table */}
      {loading ? (
        <div className="p-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredTransactions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}
                  onClick={() => handleSort('transaction_date')}
                >
                  <div className="flex items-center">
                    Date/Time {getSortIcon('transaction_date')}
                  </div>
                </th>
                {!itemId && (
                  <th 
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}
                    onClick={() => handleSort('inventory_items.name')}
                  >
                    <div className="flex items-center">
                      Item {getSortIcon('inventory_items.name')}
                    </div>
                  </th>
                )}
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}
                  onClick={() => handleSort('transaction_type')}
                >
                  <div className="flex items-center">
                    Type {getSortIcon('transaction_type')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center">
                    Quantity {getSortIcon('quantity')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}
                  onClick={() => handleSort('unit_price')}
                >
                  <div className="flex items-center">
                    Unit Price (₵) {getSortIcon('unit_price')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}
                  onClick={() => handleSort('total_price')}
                >
                  <div className="flex items-center">
                    Total (₵) {getSortIcon('total_price')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}
                  onClick={() => handleSort('reference_number')}
                >
                  <div className="flex items-center">
                    Reference {getSortIcon('reference_number')}
                  </div>
                </th>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}
                  onClick={() => handleSort('department')}
                >
                  <div className="flex items-center">
                    Department {getSortIcon('department')}
                  </div>
                </th>
                <th className={`p-3 text-center text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`${theme === 'dark' ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                    {formatDate(transaction.transaction_date)}
                  </td>
                  {!itemId && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {transaction.inventory_items?.name || transaction.item?.name || 'Item Name Unavailable'}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTransactionTypeLabel(transaction.transaction_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      transaction.transaction_type === 'purchase' || 
                      (transaction.transaction_type === 'adjustment' && transaction.quantity > 0)
                        ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        : transaction.transaction_type === 'consumption' || 
                          (transaction.transaction_type === 'adjustment' && transaction.quantity < 0)
                          ? theme === 'dark' ? 'text-red-400' : 'text-red-600'
                          : theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {transaction.transaction_type === 'purchase' || 
                       (transaction.transaction_type === 'adjustment' && transaction.quantity > 0)
                        ? '+'
                        : transaction.transaction_type === 'consumption' || 
                          (transaction.transaction_type === 'adjustment' && transaction.quantity < 0)
                          ? '-'
                          : ''}
                      {Math.abs(transaction.quantity)} {transaction.inventory_items?.unit_of_measure || transaction.item?.unit_of_measure || ''}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                    {transaction.unit_price ? `₵${parseFloat(transaction.unit_price).toFixed(2)}` : '₵0.00'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                    {transaction.total_price ? `₵${parseFloat(transaction.total_price).toFixed(2)}` : '₵0.00'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                    {transaction.reference_number || 'N/A'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                    {transaction.department || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleViewTransaction(transaction)}
                        className={`p-1 rounded-full ${theme === 'dark' ? 'text-blue-400 hover:bg-gray-600' : 'text-blue-600 hover:bg-gray-200'}`}
                        title="View Details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditTransaction(transaction)}
                        className={`p-1 rounded-full ${theme === 'dark' ? 'text-yellow-400 hover:bg-gray-600' : 'text-yellow-600 hover:bg-gray-200'}`}
                        title="Edit Transaction"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setTransactionToDelete(transaction);
                          setIsConfirmDeleteOpen(true);
                        }}
                        className={`p-1 rounded-full ${theme === 'dark' ? 'text-red-400 hover:bg-gray-600' : 'text-red-600 hover:bg-gray-200'}`}
                        title="Delete Transaction"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handlePrintTransaction(transaction)}
                        className={`p-1 rounded-full ${theme === 'dark' ? 'text-green-400 hover:bg-gray-600' : 'text-green-600 hover:bg-gray-200'}`}
                        title="Print Receipt"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          <FaSearch className="mx-auto text-3xl mb-2" />
          <p>No transactions found matching your criteria.</p>
        </div>
      )}

      {/* Modals */}
      {/* Transaction Edit/View Modal */}
      {isTransactionModalOpen && (
        <TransactionModal
          isOpen={isTransactionModalOpen}
          onClose={closeAllModals}
          transaction={selectedTransaction}
          readOnly={isViewMode}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {isConfirmDeleteOpen && transactionToDelete && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className={`relative w-full max-w-md ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg shadow-lg p-6`}>
            <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
            <p className="mb-6">Are you sure you want to delete this transaction? This action cannot be undone.</p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeAllModals}
                className={`px-4 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTransaction(transactionToDelete.id)}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsHistory;
