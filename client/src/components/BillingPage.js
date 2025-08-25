import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useTheme } from '../context/ThemeContext';
import InvoiceModal from './InvoiceModal';
import { useRoomReservation } from '../context/RoomReservationContext';
import supabase from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillWave, faFileInvoiceDollar, faCreditCard, faReceipt, faTrash, faEdit, faEye, faUndo, faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';

const BillingPage = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { updateRevenueStats } = useRoomReservation();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

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
        
        // Handle error gracefully
        console.warn('Failed to fetch invoices from database');
        setInvoices([]);
      } else {
        // Convert Supabase data to our invoice format
        const formattedInvoices = data.map(invoice => ({
          id: invoice.id,
          guest: invoice.guest_name,
          room_number: invoice.room_number, // Store the original room number
          room: invoice.room_name || invoice.room_number, // Use room_name if available, fallback to room_number
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
        
        // Update dashboard notification with latest revenue data
        const revenueNotification = {
          type: 'revenue_update',
          title: 'Revenue Updated',
          message: `Total Revenue: GH₵${totalPaidAmount.toFixed(2)}`,
          time: new Date().toISOString()
        };
        addNotification(revenueNotification);
      }
    } catch (err) {
      console.error('Unexpected error fetching invoices:', err);
      setError('Failed to load invoices. Please try again later. If problems persist, check README-RLS-FIX.md for troubleshooting steps.');
      
      // Handle error gracefully
      console.warn('Failed to fetch invoices from database');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  // Load invoices from Supabase on initial render
  useEffect(() => {
    fetchInvoices();
  }, []);



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
      console.log('Notification:', notification);
      
      // Dispatch revenue update event if this is a revenue-related notification
      if (notification.type === 'revenue_update') {
        const revenueEvent = new CustomEvent('hotelRevenueUpdate', {
          detail: { totalRevenue: totalRevenue }
        });
        document.dispatchEvent(revenueEvent);
      }
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
    
    // Use our utility function for date formatting
    const formatDateDisplay = formatDate;
    
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
            <div class="hotel-name">Lavimac Royal Hotel</div>
            <div class="invoice-title">INVOICE / RECEIPT</div>
            <div class="invoice-number">Invoice #: INV-${String(invoice.id).padStart(5, '0')}</div>
          </div>
          
          <div class="details">
            <div class="row">
              <div class="label">Guest Name:</div>
              <div class="value">${invoice.guest}</div>
            </div>
            <div class="row">
              <div class="label">Room:</div>
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
                <td>${invoice.roomType || 'Standard'} Room \$\{invoice\.room\}</td>
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

  // Edit invoice
  const editInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
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
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Sidebar activeLink="Billing" />
      <div className="flex-1 overflow-auto">
        <Navbar title="Billing Management" />
        
        <div className="p-6 space-y-6">
          {/* Revenue Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl
              ${isDarkMode 
                ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-lg border border-gray-700/50 text-white' 
                : 'bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-lg border border-gray-200/50 text-gray-800'}`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
        <div className="p-6">
                <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Revenue</h3>
                  <div className={`rounded-full p-2 ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'}`}>
                    <FontAwesomeIcon icon={faMoneyBillWave} />
                  </div>
                </div>
                <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-green-600">
                  GH₵{totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl
              ${isDarkMode 
                ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-lg border border-gray-700/50 text-white' 
                : 'bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-lg border border-gray-200/50 text-gray-800'}`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
              <div className="p-6">
                <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Pending Payments</h3>
                  <div className={`rounded-full p-2 ${isDarkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                    <FontAwesomeIcon icon={faFileInvoiceDollar} />
                  </div>
                </div>
                <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600">
                GH₵{invoices.filter(invoice => invoice.status === 'Pending').reduce((sum, invoice) => sum + invoice.amount, 0).toLocaleString()}
              </p>
              </div>
            </div>
            
            <div className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl
              ${isDarkMode 
                ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-lg border border-gray-700/50 text-white' 
                : 'bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-lg border border-gray-200/50 text-gray-800'}`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
              <div className="p-6">
                <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Invoices</h3>
                  <div className={`rounded-full p-2 ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <FontAwesomeIcon icon={faReceipt} />
                  </div>
                </div>
                <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600">
                  {invoices.length}
                </p>
              </div>
            </div>
          </div>
          
          {/* Invoices Table Header */}
          <div className={`relative overflow-hidden rounded-xl shadow-lg 
            ${isDarkMode 
              ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-lg border border-gray-700/50 text-white' 
              : 'bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-lg border border-gray-200/50 text-gray-800'}`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r ${isDarkMode ? 'from-blue-400 to-indigo-500' : 'from-blue-600 to-indigo-700'}`}>
                  Billing Overview
                </h3>
                <button 
                  onClick={() => setShowInvoiceModal(true)} 
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 transform hover:scale-105 flex items-center"
                >
                  <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
                  Create Invoice
                </button>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="relative w-16 h-16">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500/20 rounded-full animate-pulse"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : error ? (
                <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-red-900/30 border border-red-800/50 text-red-300' : 'bg-red-100 border border-red-200 text-red-700'}`}>
                  <p className="mb-2">{error}</p>
                  <button 
                    onClick={() => fetchInvoices()} 
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200"
                  >
                    Retry
                  </button>
                </div>
              ) : (
              <div className="overflow-auto rounded-lg">
                <table className="min-w-full divide-y divide-gray-200/10">
                  <thead className={isDarkMode ? 'bg-gray-800/60' : 'bg-gray-100/80'}>
                    <tr>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Guest</th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Room</th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Date</th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Amount</th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Status</th>
                      <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={isDarkMode ? 'divide-y divide-gray-700/30' : 'divide-y divide-gray-200/30'}>
                    {invoices.length > 0 ? (
                      invoices.map(invoice => (
                        <React.Fragment key={invoice.id}>
                          <tr className={`transition-colors duration-150 ${isDarkMode ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50/70'}`}>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{invoice.guest}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{invoice.room}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>{invoice.date}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              <span className="font-medium">GH₵{invoice.amount.toFixed(2)}</span>
                              {invoice.hasServiceItems && (
                                <div className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                  <span className="inline-block mr-2">Room: GH₵{invoice.roomTotal.toFixed(2)}</span>
                                  <span className="inline-block">Services: GH₵{invoice.serviceTotal.toFixed(2)}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${invoice.status === 'Paid' 
                                  ? isDarkMode ? 'bg-green-900/30 text-green-400 border border-green-700/30' : 'bg-green-100 text-green-800 border border-green-200'
                                  : invoice.status === 'Pending'
                                  ? isDarkMode ? 'bg-amber-900/30 text-amber-400 border border-amber-700/30' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : invoice.status === 'Refunded'
                                  ? isDarkMode ? 'bg-blue-900/30 text-blue-400 border border-blue-700/30' : 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : isDarkMode ? 'bg-red-900/30 text-red-400 border border-red-700/30' : 'bg-red-100 text-red-800 border border-red-200'
                                }`}>
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-3">
                                {invoice.status !== 'Paid' && (
                                  <button 
                                    onClick={() => handlePaymentStatusChange(invoice.id, 'Paid')}
                                    className={`rounded-full p-1.5 transition-all duration-200 transform hover:scale-110
                                      ${isDarkMode ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                                    title="Mark as Paid"
                                  >
                                    <FontAwesomeIcon icon={faCheck} size="sm" />
                                  </button>
                                )}
                                
                                {invoice.status !== 'Cancelled' && (
                                  <button 
                                    onClick={() => handlePaymentStatusChange(invoice.id, 'Cancelled')}
                                    className={`rounded-full p-1.5 transition-all duration-200 transform hover:scale-110
                                      ${isDarkMode ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                                    title="Mark as Cancelled"
                                  >
                                    <FontAwesomeIcon icon={faTimes} size="sm" />
                                  </button>
                                )}
                                
                                {invoice.status === 'Paid' && (
                                  <button 
                                    onClick={() => handlePaymentStatusChange(invoice.id, 'Refunded')}
                                    className={`rounded-full p-1.5 transition-all duration-200 transform hover:scale-110
                                      ${isDarkMode ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'}`}
                                    title="Mark as Refunded"
                                  >
                                    <FontAwesomeIcon icon={faUndo} size="sm" />
                                  </button>
                                )}
                                
                                <button 
                                  onClick={() => viewInvoice(invoice)}
                                  className={`rounded-full p-1.5 transition-all duration-200 transform hover:scale-110
                                    ${isDarkMode ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                                  title="View Details"
                                >
                                  <FontAwesomeIcon icon={faEye} size="sm" />
                                </button>
                                
                                <button 
                                  onClick={() => editInvoice(invoice)}
                                  className={`rounded-full p-1.5 transition-all duration-200 transform hover:scale-110
                                    ${isDarkMode ? 'bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
                                  title="Edit Invoice"
                                >
                                  <FontAwesomeIcon icon={faEdit} size="sm" />
                                </button>
                                
                                <button 
                                  onClick={() => handleDeleteInvoice(invoice.id)}
                                  className={`rounded-full p-1.5 transition-all duration-200 transform hover:scale-110
                                    ${isDarkMode ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                                  title="Delete Invoice"
                                >
                                  <FontAwesomeIcon icon={faTrash} size="sm" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Service items row */}
                          {invoice.hasServiceItems && invoice.serviceItems.length > 0 && (
                            <tr className={isDarkMode ? 'bg-gray-800/20' : 'bg-gray-50/70'}>
                              <td colSpan="6" className="px-6 py-3">
                                <div className={`text-xs font-medium mb-1.5 uppercase tracking-wider ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Service Items</div>
                                <div className="grid grid-cols-3 gap-3">
                                  {invoice.serviceItems.map((item, idx) => (
                                    <div key={idx} className={`text-sm rounded-lg px-3 py-2 border ${
                                      isDarkMode 
                                        ? 'bg-gray-800/80 border-gray-700/40 shadow-inner shadow-gray-900/30' 
                                        : 'bg-white/80 border-gray-200/40 shadow-sm'
                                    }`}>
                                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</span>
                                      <span className={`ml-2 font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>GH₵{item.price.toFixed(2)}</span>
                                      <span className={`block mt-0.5 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.date}</span>
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
                        <td colSpan="6" className={`px-6 py-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <div className="flex flex-col items-center">
                            <FontAwesomeIcon icon={faFileInvoiceDollar} className={`text-4xl mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                            <p>No invoices found</p>
                            <button 
                              onClick={() => setShowInvoiceModal(true)} 
                              className="mt-3 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg transition-all duration-200"
                            >
                              Create Your First Invoice
                            </button>
                          </div>
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
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedInvoice(null);
        }} 
        onCreateInvoice={handleCreateInvoice}
        invoiceToEdit={selectedInvoice}
      />
    </div>
  );
};

export default BillingPage;
