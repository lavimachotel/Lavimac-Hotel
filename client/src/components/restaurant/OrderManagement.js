import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import supabase from '../../supabaseClient';
import { FaClipboardList, FaSearch, FaFilter, FaEye, FaPrint, FaUtensils, FaCheck, FaSync, FaPlus, FaChartLine, FaMoneyBillWave, FaShoppingCart, FaStar, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import OrderModal from './OrderModal';

const OrderManagement = () => {
  const { theme } = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [showStatsDashboard, setShowStatsDashboard] = useState(false);
  const [statsData, setStatsData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    popularItems: []
  });
  const [dateRange, setDateRange] = useState('all'); // 'today', 'week', 'month', 'all'

  // Fetch orders from the database
  const fetchOrders = async () => {
    setLoading(true);
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
      setOrders(data || []);
      
      // Calculate statistics
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.message);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
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
      .slice(0, 5); // Top 5 items
    
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
    calculateStats(orders);
  };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const updates = { 
        status: newStatus, 
        updated_at: new Date(),
        completed_at: newStatus === 'completed' ? new Date() : null
      };
      
      const { data, error } = await supabase
        .from('restaurant_orders')
        .update(updates)
        .eq('id', orderId)
        .select();
      
      if (error) throw error;
      
      // Update local state
      setOrders(prev => 
        prev.map(order => order.id === orderId ? { ...order, ...updates } : order)
      );
      
      // Recalculate statistics
      calculateStats(orders.map(order => 
        order.id === orderId ? { ...order, ...updates } : order
      ));
      
      toast.success(`Order status updated to ${newStatus}`);
      return data[0];
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(`Failed to update order status: ${error.message}`);
      throw error;
    }
  };

  // Delete order
  const deleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      try {
        // First delete order items
        const { error: itemsError } = await supabase
          .from('restaurant_order_items')
          .delete()
          .match({ order_id: orderId });
        
        if (itemsError) throw itemsError;
        
        // Then delete the order
        const { error } = await supabase
          .from('restaurant_orders')
          .delete()
          .match({ id: orderId });
        
        if (error) throw error;
        
        // Update local state
        setOrders(prev => prev.filter(order => order.id !== orderId));
        
        // Recalculate statistics
        calculateStats(orders.filter(order => order.id !== orderId));
        
        toast.success('Order deleted successfully');
      } catch (error) {
        console.error('Error deleting order:', error);
        toast.error(`Failed to delete order: ${error.message}`);
      }
    }
  };

  // Handle print order
  const printOrder = (order) => {
    // Create a new window with order details for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast.error('Please allow pop-ups to print orders');
      return;
    }
    
    // Format order items
    const itemsHtml = order.restaurant_order_items.map(item => {
      const itemName = item.restaurant_menu_items ? item.restaurant_menu_items.name : item.name;
      const itemPrice = item.restaurant_menu_items ? item.restaurant_menu_items.price : item.price;
      return `
        <tr>
          <td>${itemName}</td>
          <td>${item.quantity}</td>
          <td>GH₵${(itemPrice * item.quantity).toFixed(2)}</td>
        </tr>
      `;
    }).join('');
    
    // Print document content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order #${order.id.slice(0, 8)}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
            h1 { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
            h2 { text-align: center; margin-top: 5px; }
            .hotel-name { text-align: center; font-size: 1.5em; font-weight: bold; margin-bottom: 5px; color: #2c5e2e; }
            .order-details { margin-bottom: 20px; }
            .order-details div { margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; text-align: right; margin-top: 20px; }
            .footer { margin-top: 30px; text-align: center; font-size: 0.8em; color: #666; }
          </style>
        </head>
        <body>
          <div class="hotel-name">The Green Royal Hotel</div>
          <h1>Order Receipt</h1>
          <div class="order-details">
            <div><strong>Order ID:</strong> ${order.id}</div>
            <div><strong>Date:</strong> ${formatDate(order.created_at)}</div>
            <div><strong>Type:</strong> ${order.order_type.replace('-', ' ')}</div>
            <div><strong>Location:</strong> ${order.table_number ? `Table ${order.table_number}` : order.room_number ? `Room ${order.room_number}` : 'N/A'}</div>
            <div><strong>Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="total">
            Total: GH₵${order.total_amount.toFixed(2)}
          </div>
          
          <div class="footer">
            Thank you for dining with us at Hotel Management System!
          </div>
        </body>
      </html>
    `);
    
    // Wait for content to load then print
    printWindow.document.close();
    printWindow.onload = function() {
      printWindow.print();
      // printWindow.close(); // Uncomment to auto-close after print
    };
    
    toast.success('Print preview generated');
  };

  // Initialize data
  useEffect(() => {
    fetchOrders();
    
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
          // Refresh orders when any order changes
          fetchOrders();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      orderSubscription.unsubscribe();
    };
  }, []);

  // Update stats when date range changes
  useEffect(() => {
    if (orders.length > 0) {
      calculateStats(orders);
    }
  }, [dateRange]);

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      (order.id && order.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.room_number && order.room_number.toString().includes(searchTerm));
    
    const matchesStatus = statusFilter === '' || order.status === statusFilter;
    const matchesOrderType = orderTypeFilter === '' || order.order_type === orderTypeFilter;
    
    return matchesSearch && matchesStatus && matchesOrderType;
  });

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Calculate total items in an order
  const getTotalItems = (orderItems) => {
    return orderItems.reduce((total, item) => total + item.quantity, 0);
  };

  // View order details
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  // Close order details modal
  const closeOrderDetails = () => {
    setShowOrderDetails(false);
  };

  // Open order modal to add new order
  const openOrderModal = () => {
    setIsOrderModalOpen(true);
  };

  // Close order modal
  const closeOrderModal = () => {
    setIsOrderModalOpen(false);
    fetchOrders(); // Refresh orders after modal closes
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return theme === 'dark' ? 'bg-yellow-800/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return theme === 'dark' ? 'bg-blue-800/30 text-blue-400' : 'bg-blue-100 text-blue-800';
      case 'ready':
        return theme === 'dark' ? 'bg-green-800/30 text-green-400' : 'bg-green-100 text-green-800';
      case 'delivered':
        return theme === 'dark' ? 'bg-purple-800/30 text-purple-400' : 'bg-purple-100 text-purple-800';
      case 'completed':
        return theme === 'dark' ? 'bg-green-800/30 text-green-400' : 'bg-green-100 text-green-800';
      case 'cancelled':
        return theme === 'dark' ? 'bg-red-800/30 text-red-400' : 'bg-red-100 text-red-800';
      default:
        return theme === 'dark' ? 'bg-gray-800/30 text-gray-400' : 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="order-management">
      {/* Action buttons row */}
      <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex gap-2">
          <button
            onClick={openOrderModal}
            className={`flex items-center justify-center px-4 py-2 rounded-lg shadow-sm transition-colors ${
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <FaPlus className="mr-2" />
            Add Order
          </button>
          
          <button
            onClick={() => setShowStatsDashboard(!showStatsDashboard)}
            className={`flex items-center justify-center px-4 py-2 rounded-lg shadow-sm transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            <FaChartLine className="mr-2" />
            {showStatsDashboard ? 'Hide Stats' : 'Show Stats'}
          </button>
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
            placeholder="Search orders..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg appearance-none ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <select
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg appearance-none ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
          >
            <option value="">All Order Types</option>
            <option value="dine-in">Dine-in</option>
            <option value="room-service">Room Service</option>
            <option value="takeaway">Takeaway</option>
          </select>
        </div>
        
        <button
          onClick={fetchOrders}
          className={`px-4 py-2 rounded-lg flex items-center ${
            theme === 'dark' 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          }`}
        >
          <FaSync className="mr-2" />
          Refresh
        </button>
      </div>
      
      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className={`p-6 text-center ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
          <p>Error loading orders. Please try again later.</p>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="overflow-x-auto">
          <table className={`w-full ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredOrders.map(order => (
                <tr 
                  key={order.id} 
                  className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.order_type === 'dine-in'
                        ? theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                        : order.order_type === 'room-service'
                        ? theme === 'dark' ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-800'
                        : theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                    }`}>
                      {order.order_type.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {order.table_number ? `Table ${order.table_number}` : order.room_number ? `Room ${order.room_number}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getTotalItems(order.restaurant_order_items)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    GH₵{order.total_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewOrderDetails(order)}
                        className={`p-2 rounded-full ${
                          theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                        }`}
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => {
                          const nextStatus = {
                            'pending': 'preparing',
                            'preparing': 'ready',
                            'ready': 'delivered',
                            'delivered': 'completed'
                          }[order.status];
                          
                          if (nextStatus) {
                            updateOrderStatus(order.id, nextStatus);
                          }
                        }}
                        disabled={!['pending', 'preparing', 'ready', 'delivered'].includes(order.status)}
                        className={`p-2 rounded-full ${
                          ['pending', 'preparing', 'ready', 'delivered'].includes(order.status)
                            ? theme === 'dark' ? 'hover:bg-gray-600 text-green-400' : 'hover:bg-gray-200 text-green-600'
                            : theme === 'dark' ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
                        }`}
                        title="Advance Status"
                      >
                        <FaCheck />
                      </button>
                      <button
                        onClick={() => printOrder(order)}
                        className={`p-2 rounded-full ${
                          theme === 'dark' ? 'hover:bg-gray-600 text-blue-400' : 'hover:bg-gray-200 text-blue-600'
                        }`}
                        title="Print Order"
                      >
                        <FaPrint />
                      </button>
                      <button
                        onClick={() => deleteOrder(order.id)}
                        className={`p-2 rounded-full ${
                          theme === 'dark' ? 'hover:bg-gray-600 text-red-400' : 'hover:bg-gray-200 text-red-600'
                        }`}
                        title="Delete Order"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`p-12 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          <FaClipboardList className="mx-auto text-4xl mb-4" />
          <p className="text-xl font-medium mb-2">No orders found</p>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* OrderModal for adding new orders */}
      <OrderModal 
        isOpen={isOrderModalOpen}
        onClose={closeOrderModal}
      />
    </div>
  );
};

export default OrderManagement;
