import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { FaChair, FaUsers, FaCalendarAlt, FaCheck, FaTimes, FaEllipsisH } from 'react-icons/fa';
import supabase from '../../supabaseClient';
import toast from 'react-hot-toast';

const TableManagement = () => {
  const { theme } = useTheme();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showTableActions, setShowTableActions] = useState(null);

  // Fetch tables from the database
  const fetchTables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number');
      
      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
      setError(error.message);
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  // Update table status
  const updateTableStatus = async (tableId, newStatus) => {
    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .update({ status: newStatus, updated_at: new Date() })
        .eq('id', tableId)
        .select();
      
      if (error) throw error;
      
      // Update local state
      setTables(prev => 
        prev.map(table => table.id === tableId ? { ...table, status: newStatus } : table)
      );
      
      toast.success(`Table status updated to ${newStatus}`);
      return data[0];
    } catch (error) {
      console.error('Error updating table status:', error);
      toast.error(`Failed to update table status: ${error.message}`);
      throw error;
    }
  };

  // Handle table selection
  const handleTableClick = (table) => {
    setSelectedTable(table);
  };

  // Toggle table actions menu
  const toggleTableActions = (tableId) => {
    setShowTableActions(showTableActions === tableId ? null : tableId);
  };

  // Initialize data
  useEffect(() => {
    fetchTables();
  }, []);

  // Get status color based on table status
  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return theme === 'dark' ? 'bg-green-800/30 text-green-400' : 'bg-green-100 text-green-800';
      case 'occupied':
        return theme === 'dark' ? 'bg-red-800/30 text-red-400' : 'bg-red-100 text-red-800';
      case 'reserved':
        return theme === 'dark' ? 'bg-blue-800/30 text-blue-400' : 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return theme === 'dark' ? 'bg-yellow-800/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800';
      default:
        return theme === 'dark' ? 'bg-gray-800/30 text-gray-400' : 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="table-management">
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className={`p-6 text-center ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
          <p>Error loading tables. Please try again later.</p>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              Restaurant Tables
            </h2>
            <button
              onClick={fetchTables}
              className={`px-4 py-2 rounded-lg flex items-center ${
                theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {tables.map(table => (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`relative rounded-xl shadow-sm overflow-hidden ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                } ${selectedTable?.id === table.id ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => handleTableClick(table)}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold">Table {table.table_number}</h3>
                      <div className="flex items-center mt-1">
                        <FaUsers className={`mr-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Capacity: {table.capacity}
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTableActions(table.id);
                        }}
                        className={`p-2 rounded-full ${
                          theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        <FaEllipsisH />
                      </button>
                      
                      {showTableActions === table.id && (
                        <div 
                          className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-10 ${
                            theme === 'dark' ? 'bg-gray-700' : 'bg-white'
                          } ring-1 ring-black ring-opacity-5`}
                        >
                          <div className="py-1" role="menu" aria-orientation="vertical">
                            <button
                              className={`w-full text-left px-4 py-2 text-sm ${
                                theme === 'dark' ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTableStatus(table.id, 'available');
                                setShowTableActions(null);
                              }}
                            >
                              Mark as Available
                            </button>
                            <button
                              className={`w-full text-left px-4 py-2 text-sm ${
                                theme === 'dark' ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTableStatus(table.id, 'occupied');
                                setShowTableActions(null);
                              }}
                            >
                              Mark as Occupied
                            </button>
                            <button
                              className={`w-full text-left px-4 py-2 text-sm ${
                                theme === 'dark' ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTableStatus(table.id, 'reserved');
                                setShowTableActions(null);
                              }}
                            >
                              Mark as Reserved
                            </button>
                            <button
                              className={`w-full text-left px-4 py-2 text-sm ${
                                theme === 'dark' ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTableStatus(table.id, 'maintenance');
                                setShowTableActions(null);
                              }}
                            >
                              Mark as Maintenance
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(table.status)}`}>
                      {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                    </span>
                    {table.location && (
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {table.location}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <button
                        className={`px-3 py-1 text-sm rounded ${
                          theme === 'dark' 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        <FaCalendarAlt className="inline mr-1" />
                        Reservations
                      </button>
                      
                      {table.status === 'available' ? (
                        <button
                          className={`px-3 py-1 text-sm rounded ${
                            theme === 'dark' 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTableStatus(table.id, 'occupied');
                          }}
                        >
                          <FaCheck className="inline mr-1" />
                          Seat
                        </button>
                      ) : table.status === 'occupied' ? (
                        <button
                          className={`px-3 py-1 text-sm rounded ${
                            theme === 'dark' 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-red-500 hover:bg-red-600 text-white'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTableStatus(table.id, 'available');
                          }}
                        >
                          <FaTimes className="inline mr-1" />
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableManagement;
