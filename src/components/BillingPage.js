import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useTheme } from '../context/ThemeContext';
import InvoiceModal from './InvoiceModal';
import { useRoomReservation } from '../context/RoomReservationContext';
import supabase from '../supabaseClient';
import { toast } from 'react-hot-toast';

const BillingPage = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { updateRevenueStats } = useRoomReservation();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch invoices from the database
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First fetch invoices
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching invoices:', error);
        
        // Provide more specific error messages based on the error type
        if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('policy')) {
          setError('Row-Level Security Policy Error: You don\'t have permission to access invoices. Please check README-RLS-FIX.md for instructions on how to fix this.');
        } else if (error.code === '401' || error.code === 'PGRST301') {
          setError('Authentication Error: Your session may have expired. Please see README-RLS-FIX.md for RLS policy setup instructions.');
        } else {
          setError(error.message);
        }
        
        // Fallback to localStorage if Supabase fails
        const savedInvoices = localStorage.getItem('hotelInvoices');
        if (savedInvoices) {
          setInvoices(JSON.parse(savedInvoices));
          console.log('Loaded invoices from localStorage as fallback');
        }
      } else {
        // Convert Supabase data to our invoice format
        const formattedInvoices = data.map(invoice => ({
          id: invoice.id,
          guest: invoice.guest_name,
          room: invoice.room_number,
          checkIn: invoice.check_in_date,
          checkOut: invoice.check_out_date,
          amount: parseFloat(invoice.amount),
          status: invoice.status,
          date: new Date(invoice.created_at).toISOString().split('T')[0],
          roomType: invoice.room_type,
          nights: invoice.nights,
          roomRate: invoice.room_rate,
          roomTotal: invoice.room_total || (invoice.room_rate * invoice.nights),
          serviceTotal: invoice.service_total || 0,
          hasServiceItems: invoice.has_service_items || false,
          serviceItems: []
        }));
        
        // For invoices with service items, fetch the items
        for (const invoice of formattedInvoices) {
          if (invoice.hasServiceItems) {
            const { data: itemsData, error: itemsError } = await supabase
              .from('invoice_items')
              .select('*')
              .eq('invoice_id', invoice.id);
              
            if (!itemsError && itemsData && itemsData.length > 0) {
              invoice.serviceItems = itemsData.map(item => ({
                id: item.id,
                name: item.item_name,
                price: parseFloat(item.item_price),
                date: item.item_date
              }));
            }
          }
        }
        
        setInvoices(formattedInvoices);
        
        // Update revenue stats based on loaded invoices
        const totalPaidAmount = formattedInvoices
          .filter(invoice => invoice.status === 'Paid')
          .reduce((sum, invoice) => sum + invoice.amount, 0);
        
        // Reset revenue to match Supabase data
        updateRevenueStats(0, true); // Reset revenue to zero first
        if (totalPaidAmount > 0) {
          updateRevenueStats(totalPaidAmount); // Add the calculated amount
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching invoices:', err);
      setError('Failed to load invoices. Please try again later. If problems persist, check README-RLS-FIX.md for troubleshooting steps.');
      
      // Fallback to localStorage
      const savedInvoices = localStorage.getItem('hotelInvoices');
      if (savedInvoices) {
        setInvoices(JSON.parse(savedInvoices));
        console.log('Loaded invoices from localStorage due to fetch error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load invoices from Supabase on initial render
  useEffect(() => {
    fetchInvoices();
  }, []);

  // Save invoices to localStorage as backup whenever they change
  useEffect(() => {
    localStorage.setItem('hotelInvoices', JSON.stringify(invoices));
  }, [invoices]);

  // Calculate total revenue
  const totalRevenue = invoices
    .filter(invoice => invoice.status === 'Paid')
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  // Handle invoice creation
  const handleCreateInvoice = async (newInvoice) => {
    try {
      // If invoice has an ID from database already, just add it to our state
      if (newInvoice.id && !newInvoice.isLocalOnly) {
        console.log('Adding database-saved invoice to state:', newInvoice);
        setInvoices(prevInvoices => [newInvoice, ...prevInvoices]);
        
        // Add notification to dashboard
        toast.success(`Invoice created for ${newInvoice.guest} - Room ${newInvoice.room}${newInvoice.serviceItems && newInvoice.serviceItems.length > 0 ? ` with ${newInvoice.serviceItems.length} service items` : ''}`);
        
        // Update revenue stats if the invoice is marked as paid
        if (newInvoice.status === 'Paid') {
          updateRevenueStats(newInvoice.amount);
        }
        
        // Refresh the entire invoice list to ensure database sync
        fetchInvoices();
        return;
      }
      
      // Handle local-only invoices or fallbacks
      if (newInvoice.isLocalOnly) {
        console.warn('Handling local-only invoice (database save failed):', newInvoice);
        
        // Add to our state with generated ID if needed
        const invoiceWithId = {
          ...newInvoice,
          id: newInvoice.id || Date.now(), // Use existing ID or timestamp 
          date: newInvoice.date || new Date().toISOString().split('T')[0],
          hasServiceItems: newInvoice.serviceItems && newInvoice.serviceItems.length > 0
        };
        
        setInvoices(prevInvoices => [invoiceWithId, ...prevInvoices]);
        
        // Add notification about local-only invoice
        toast('Invoice created but stored locally only. Database save failed.', {
          icon: '⚠️',
          style: {
            borderRadius: '10px',
            background: '#fef08a',
            color: '#854d0e',
          },
        });
        
        // Update revenue stats if the invoice is marked as paid even if Supabase fails
        if (newInvoice.status === 'Paid') {
          updateRevenueStats(newInvoice.amount);
        }
      }
    } catch (err) {
      console.error('Unexpected error handling invoice creation:', err);
      toast.error(`Error processing invoice: ${err.message}`);
    }
  };

  // Add notification to dashboard
  const addNotification = (notification) => {
    try {
      // Get existing notifications from localStorage
      const notificationsStr = localStorage.getItem('hotelNotifications');
      const notifications = notificationsStr ? JSON.parse(notificationsStr) : [];
      
      // Add new notification with timestamp
      const newNotification = {
        ...notification,
        time: 'Just now',
        timestamp: new Date().toISOString()
      };
      
      // Add to beginning of array (newest first)
      notifications.unshift(newNotification);
      
      // Keep only the 10 most recent notifications
      const updatedNotifications = notifications.slice(0, 10);
      
      // Save back to localStorage
      localStorage.setItem('hotelNotifications', JSON.stringify(updatedNotifications));
    } catch (err) {
      console.error('Error adding notification:', err);
    }
  };

  // Handle payment status change
  const handlePaymentStatusChange = async (id, newStatus) => {
    const invoiceToUpdate = invoices.find(invoice => invoice.id === id);
    if (!invoiceToUpdate) return;

    try {
      // Use retry logic for database updates
      let retryCount = 0;
      let updateError;
      
      while (retryCount < 3) {
        const { error } = await supabase
          .from('invoices')
          .update({ status: newStatus })
          .eq('id', id);
        
        updateError = error;
        
        if (!updateError) break;
        
        retryCount++;
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (updateError) {
        console.error('Error updating invoice status in Supabase after retries:', updateError);
        toast.error(`Database update failed: ${updateError.message}. The change will only be reflected locally.`);
      } else {
        console.log(`Successfully updated invoice ${id} status to ${newStatus}`);
        // Refresh invoices to ensure database sync
        fetchInvoices();
      }
      
      // Add notification for payment status change
      toast.success(`Invoice for ${invoiceToUpdate.guest} marked as ${newStatus}`);

      // Update local state regardless of Supabase result
      setInvoices(prevInvoices => 
        prevInvoices.map(invoice => {
          if (invoice.id === id) {
            // If changing to Paid and was not Paid before, update revenue
            if (newStatus === 'Paid' && invoice.status !== 'Paid') {
              updateRevenueStats(invoice.amount);
            }
            // If changing from Paid to something else, subtract from revenue
            else if (invoice.status === 'Paid' && newStatus !== 'Paid') {
              updateRevenueStats(-invoice.amount);
            }
            return { ...invoice, status: newStatus };
          }
          return invoice;
        })
      );
    } catch (err) {
      console.error('Unexpected error updating invoice status:', err);
      // Continue with local update even if Supabase fails
      setInvoices(prevInvoices => 
        prevInvoices.map(invoice => {
          if (invoice.id === id) {
            return { ...invoice, status: newStatus };
          }
          return invoice;
        })
      );
    }
  };

  // Handle invoice deletion
  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }
    
    try {
      const invoiceToDelete = invoices.find(invoice => invoice.id === id);
      
      // Check if this is a database-stored invoice or local-only
      if (!invoiceToDelete.isLocalOnly) {
        // This is a database invoice - delete from Supabase
        console.log('Deleting invoice from database:', id);
        
        const { error } = await supabase
          .from('invoices')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('Error deleting invoice from database:', error);
          throw new Error(`Failed to delete invoice: ${error.message}`);
        }
      }
      
      // Remove from local state
      setInvoices(prevInvoices => prevInvoices.filter(invoice => invoice.id !== id));
      
      // Adjust revenue stats if it was a paid invoice
      if (invoiceToDelete && invoiceToDelete.status === 'Paid') {
        updateRevenueStats(-invoiceToDelete.amount); // Subtract the amount
      }
      
      // Add notification about deletion
      toast(`Invoice for ${invoiceToDelete.guest} has been deleted.`, {
        icon: '⚠️',
        style: {
          borderRadius: '10px',
          background: '#fef08a',
          color: '#854d0e',
        },
      });
      
    } catch (err) {
      console.error('Error deleting invoice:', err);
      toast.error(`Error deleting invoice: ${err.message}`);
    }
  };

  // View invoice details
  const viewInvoice = (invoice) => {
    const receiptWindow = window.open('', '_blank');
    
    // Format date display
    const formatDateDisplay = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return isNaN(date) ? dateStr : date.toLocaleDateString();
    };
    
    // Create receipt HTML
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hotel Invoice Receipt</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          .receipt {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #ccc;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .hotel-name {
            font-size: 24px;
            font-weight: bold;
          }
          .invoice-title {
            font-size: 18px;
            margin-top: 10px;
          }
          .invoice-number {
            margin-top: 5px;
            font-style: italic;
          }
          .details {
            margin-bottom: 20px;
          }
          .row {
            display: flex;
            margin-bottom: 5px;
          }
          .label {
            font-weight: bold;
            width: 150px;
          }
          .value {
            flex-grow: 1;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .total-row {
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 14px;
          }
          .print-button {
            text-align: center;
            margin-top: 20px;
          }
          @media print {
            .print-button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="hotel-name">Mikjane Hotel</div>
            <div class="invoice-title">INVOICE / RECEIPT</div>
            <div class="invoice-number">Invoice #: INV-${String(invoice.id).padStart(5, '0')}</div>
          </div>
          
          <div class="details">
            <div class="row">
              <div class="label">Guest Name:</div>
              <div class="value">${invoice.guest}</div>
            </div>
            <div class="row">
              <div class="label">Room Number:</div>
              <div class="value">${invoice.room}</div>
            </div>
            <div class="row">
              <div class="label">Room Type:</div>
              <div class="value">${invoice.roomType || 'Standard'}</div>
            </div>
            <div class="row">
              <div class="label">Check-in Date:</div>
              <div class="value">${formatDateDisplay(invoice.checkIn)}</div>
            </div>
            <div class="row">
              <div class="label">Check-out Date:</div>
              <div class="value">${formatDateDisplay(invoice.checkOut)}</div>
            </div>
            <div class="row">
              <div class="label">Number of Nights:</div>
              <div class="value">${invoice.nights}</div>
            </div>
            <div class="row">
              <div class="label">Date Issued:</div>
              <div class="value">${formatDateDisplay(invoice.date)}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${invoice.roomType || 'Standard'} Room (${invoice.room})</td>
                <td>${formatDateDisplay(invoice.checkIn)} to ${formatDateDisplay(invoice.checkOut)}</td>
                <td>GH₵${invoice.roomTotal ? invoice.roomTotal.toFixed(2) : (invoice.roomRate * invoice.nights).toFixed(2)}</td>
              </tr>
              
              ${invoice.serviceItems && invoice.serviceItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${formatDateDisplay(item.date)}</td>
                  <td>GH₵${item.price.toFixed(2)}</td>
                </tr>
              `).join('')}
              
              ${invoice.serviceItems && invoice.serviceItems.length > 0 ? `
                <tr>
                  <td colspan="2" style="text-align: right; font-weight: medium;">Service Charges Subtotal:</td>
                  <td>GH₵${invoice.serviceTotal ? invoice.serviceTotal.toFixed(2) : invoice.serviceItems.reduce((sum, item) => sum + parseFloat(item.price), 0).toFixed(2)}</td>
                </tr>
              ` : ''}
              
              <tr class="total-row">
                <td colspan="2" style="text-align: right;">Total:</td>
                <td>GH₵${invoice.amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="text-align: right;">Payment Status:</td>
                <td>${invoice.status}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            Thank you for staying with us. We hope to see you again soon!
          </div>
          
          <div class="print-button">
            <button onclick="window.print()">Print Receipt</button>
          </div>
        </div>
      </body>
      </html>
    `;
    
    receiptWindow.document.open();
    receiptWindow.document.write(receiptHtml);
    receiptWindow.document.close();
  };

  // Get status color classes
  const getStatusClasses = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-200 text-green-800';
      case 'Pending':
        return 'bg-yellow-200 text-yellow-800';
      case 'Refunded':
        return 'bg-blue-200 text-blue-800';
      default:
        return 'bg-red-200 text-red-800';
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-gray-800'}`}>
      <Sidebar activeLink="Billing" />
      <div className="flex-1 overflow-auto">
        <Navbar title="Billing Management" />
        
        <div className="p-6">
          {/* Revenue Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow-md`}>
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Revenue</h3>
              <p className="text-3xl font-bold text-green-500">GH₵{totalRevenue.toLocaleString()}</p>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow-md`}>
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Pending Payments</h3>
              <p className="text-3xl font-bold text-yellow-500">
                GH₵{invoices.filter(invoice => invoice.status === 'Pending').reduce((sum, invoice) => sum + invoice.amount, 0).toLocaleString()}
              </p>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow-md`}>
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Invoices</h3>
              <p className="text-3xl font-bold text-blue-500">{invoices.length}</p>
            </div>
          </div>
          
          {/* Invoices Table */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} p-6 rounded-lg shadow-sm`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Billing Overview</h3>
                <button 
                  onClick={() => setShowInvoiceModal(true)} 
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  Create Invoice
                </button>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="text-center p-4 text-red-500">
                  <p>Error loading invoices: {error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              ) : (
              <div className={`overflow-hidden rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Guest</th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Room</th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Date</th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Amount</th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Status</th>
                      <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                    {invoices.length > 0 ? (
                      invoices.map(invoice => (
                        <React.Fragment key={invoice.id}>
                          <tr className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{invoice.guest}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{invoice.room}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>{invoice.date}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              GH₵{invoice.amount.toFixed(2)}
                              {invoice.hasServiceItems && (
                                <span className={`ml-2 text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                  (Room: GH₵{invoice.roomTotal.toFixed(2)}, Services: GH₵{invoice.serviceTotal.toFixed(2)})
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={getStatusClasses(invoice.status)}>
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                {invoice.status !== 'Paid' && (
                                  <button 
                                    onClick={() => handlePaymentStatusChange(invoice.id, 'Paid')}
                                    className={`${isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-900'}`}
                                    title="Mark as Paid"
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                )}
                                
                                {invoice.status !== 'Cancelled' && (
                                  <button 
                                    onClick={() => handlePaymentStatusChange(invoice.id, 'Cancelled')}
                                    className={`${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}`}
                                    title="Mark as Cancelled"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                )}
                                
                                {invoice.status === 'Paid' && (
                                  <button 
                                    onClick={() => handlePaymentStatusChange(invoice.id, 'Refunded')}
                                    className={`${isDarkMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-900'}`}
                                    title="Mark as Refunded"
                                  >
                                    <i className="fas fa-undo"></i>
                                  </button>
                                )}
                                
                                <button 
                                  onClick={() => viewInvoice(invoice)}
                                  className={`${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'}`}
                                  title="View Details"
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                
                                <button 
                                  onClick={() => handleDeleteInvoice(invoice.id)}
                                  className={`${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}`}
                                  title="Delete Invoice"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Service items row */}
                          {invoice.hasServiceItems && invoice.serviceItems.length > 0 && (
                            <tr className={isDarkMode ? 'bg-gray-900 bg-opacity-50' : 'bg-gray-50'}>
                              <td colSpan="6" className="px-6 py-2">
                                <div className="text-xs font-medium mb-1 uppercase tracking-wider text-gray-500">Service Items</div>
                                <div className="grid grid-cols-3 gap-2">
                                  {invoice.serviceItems.map((item, idx) => (
                                    <div key={idx} className={`text-sm rounded px-2 py-1 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</span>
                                      <span className={`ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>GH₵{item.price.toFixed(2)}</span>
                                      <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.date}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className={`px-6 py-4 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {loading ? 'Loading invoices...' : 'No invoices found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Invoice Modal */}
      <InvoiceModal 
        isOpen={showInvoiceModal} 
        onClose={() => setShowInvoiceModal(false)} 
        onCreateInvoice={handleCreateInvoice}
      />
    </div>
  );
};

export default BillingPage;
