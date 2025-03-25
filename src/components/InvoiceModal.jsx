import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useRoomReservation } from '../context/RoomReservationContext';
import { useGuests } from '../context/GuestContext';
import { format, differenceInDays, parseISO } from 'date-fns';
import supabase from '../supabaseClient';
import { toast } from 'react-hot-toast';

const InvoiceModal = ({ isOpen, onClose, onCreateInvoice }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { reservations, rooms } = useRoomReservation();
  const { guestList } = useGuests();
  
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState({
    guestName: '',
    roomNumber: '',
    checkIn: '',
    checkOut: '',
    roomType: '',
    roomRate: 0,
    nights: 0,
    totalAmount: 0,
    paymentStatus: 'Pending',
    serviceItems: []
  });
  
  // First, add a new state for the service item modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [newServiceItem, setNewServiceItem] = useState({
    name: '',
    price: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  // Add loading state at the top with other state variables 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add state for existing invoices
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  
  // Fetch existing invoices when the modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchExistingInvoices = async () => {
        setLoadingInvoices(true);
        try {
          const { data, error } = await supabase
            .from('invoices')
            .select('guest_id, guest_name');
          
          if (error) {
            console.error('Error fetching existing invoices:', error);
          } else {
            setExistingInvoices(data || []);
          }
        } catch (err) {
          console.error('Error in invoice fetch:', err);
        } finally {
          setLoadingInvoices(false);
        }
      };
      
      fetchExistingInvoices();
    }
  }, [isOpen]);
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form state when modal closes
      setSelectedGuest(null);
      setInvoiceDetails({
        guestName: '',
        roomNumber: '',
        checkIn: '',
        checkOut: '',
        roomType: '',
        roomRate: 0,
        nights: 0,
        totalAmount: 0,
        paymentStatus: 'Pending',
        serviceItems: []
      });
    }
  }, [isOpen]);
  
  // Combine reservation data and guest data for selection, filtering out guests who already have invoices
  const guestOptions = [...reservations, ...guestList].filter((item, index, self) => {
    // First, remove duplicates by guest name or id
    const isUnique = index === self.findIndex(t => (
      (t.guest_name && item.guest_name && t.guest_name === item.guest_name) ||
      (t.name && item.name && t.name === item.name) ||
      (t.id && item.id && t.id === item.id)
    ));
    
    if (!isUnique) return false;
    
    // Then, filter out guests who already have invoices
    const guestId = item.guest_id || item.id;
    const guestName = item.guest_name || item.name;
    
    // Check if this guest already has an invoice by id or name
    const hasInvoice = existingInvoices.some(invoice => 
      (guestId && invoice.guest_id === guestId) || 
      (guestName && invoice.guest_name === guestName)
    );
    
    // Keep guests who don't have invoices
    return !hasInvoice;
  });
  
  // Handle guest selection
  const handleGuestSelect = async (guest) => {
    if (!guest) return;
    
    console.log("Handling guest selection for:", guest);
    
    // Get room details
    const roomId = guest.room_id || guest.room;
    if (!roomId) {
      console.warn("No room ID found for guest:", guest);
      return;
    }
    
    const room = rooms.find(r => r.id === parseInt(roomId, 10) || r.id === roomId);
    console.log("Found room:", room);
    
    // Calculate dates and nights
    const checkInDate = guest.check_in_date || guest.checkIn || guest.check_in || new Date();
    const checkOutDate = guest.check_out_date || guest.checkOut || guest.check_out || new Date();
    
    // Format dates for display (date only)
    const formatDate = (date) => {
      if (!date) return '';
      if (typeof date === 'string') {
        // Remove the time part if it exists
        return date.split('T')[0].split(' ')[0];
      }
      return format(date, 'yyyy-MM-dd');
    };
    
    const formattedCheckIn = formatDate(checkInDate);
    const formattedCheckOut = formatDate(checkOutDate);
    
    // Calculate number of nights - ensure we're comparing just the dates
    const checkInDateObj = typeof checkInDate === 'string' 
      ? new Date(formattedCheckIn) 
      : new Date(format(checkInDate, 'yyyy-MM-dd'));
      
    const checkOutDateObj = typeof checkOutDate === 'string' 
      ? new Date(formattedCheckOut) 
      : new Date(format(checkOutDate, 'yyyy-MM-dd'));
    
    const nights = differenceInDays(checkOutDateObj, checkInDateObj) || 1;
    
    // Calculate base room total
    const roomRate = room ? room.price : 120; // Default price if not found
    const roomTotal = roomRate * nights;
    
    // Get guest name for records
    const guestName = guest.guest_name || guest.name || '';
    console.log(`Fetching service requests for ${guestName} in room ${roomId}`);
    
    try {
      // Step 1: Fetch all service requests for this room
      const { data: serviceRequests, error: serviceError } = await supabase
        .from('service_requests')
        .select('*')
        .eq('room', roomId)
        .neq('status', 'Cancelled');
      
      if (serviceError) {
        console.error('Error fetching service requests:', serviceError);
        throw serviceError;
      }
      
      console.log(`Found ${serviceRequests?.length || 0} service requests for room ${roomId}`);
      
      // Step 2: Get service IDs to fetch their details
      const serviceIds = serviceRequests
        .filter(req => req.service_id)
        .map(req => req.service_id);
      
      // Step 3: Fetch service details for pricing
      let serviceItems = [];
      if (serviceIds.length > 0) {
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, name, price')
          .in('id', serviceIds);
        
        if (servicesError) {
          console.error('Error fetching service details:', servicesError);
        } else if (servicesData) {
          // Create a lookup map for quick access
          const serviceMap = {};
          servicesData.forEach(service => {
            serviceMap[service.id] = service;
          });
          
          // Map service requests to invoice items
          serviceItems = serviceRequests.map(req => {
            const service = req.service_id ? serviceMap[req.service_id] : null;
            return {
              id: req.id,
              name: service ? service.name : (req.service_name || 'Service'),
              price: service ? parseFloat(service.price) : (req.price || 0),
              date: req.requested_at ? format(new Date(req.requested_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
              status: req.status
            };
          });
        }
      }
      
      // Calculate total with service items
      const serviceTotal = serviceItems.reduce((sum, item) => sum + (item.price || 0), 0);
      const totalAmount = roomTotal + serviceTotal;
      
      // Update the invoice details
      setInvoiceDetails({
        guestName: guestName,
        roomNumber: roomId,
        checkIn: formattedCheckIn,
        checkOut: formattedCheckOut,
        roomType: room ? room.type : 'Standard',
        roomRate,
        nights,
        roomTotal,
        serviceTotal,
        totalAmount,
        paymentStatus: 'Pending',
        serviceItems
      });
      
      console.log("Invoice details updated:", {
        guest: guestName, 
        room: roomId, 
        nights, 
        roomTotal,
        serviceItems: serviceItems.length,
        serviceTotal,
        totalAmount
      });
      
    } catch (err) {
      console.error("Error processing guest selection:", err);
      // Set basic invoice details even if service requests fail
      setInvoiceDetails({
        guestName: guestName,
        roomNumber: roomId,
        checkIn: formattedCheckIn,
        checkOut: formattedCheckOut,
        roomType: room ? room.type : 'Standard',
        roomRate,
        nights,
        roomTotal,
        serviceTotal: 0,
        totalAmount: roomTotal,
        paymentStatus: 'Pending',
        serviceItems: []
      });
    }
  };
  
  // Handle payment status change
  const handlePaymentStatusChange = (e) => {
    setInvoiceDetails({
      ...invoiceDetails,
      paymentStatus: e.target.value
    });
  };
  
  // Reset invoice details to defaults
  const resetInvoiceDetails = () => {
    setInvoiceDetails({
      guestName: '',
      roomNumber: '',
      checkIn: '',
      checkOut: '',
      roomType: '',
      roomRate: 0,
      nights: 0,
      totalAmount: 0,
      paymentStatus: 'Pending',
      serviceItems: []
    });
  };
  
  // Generate a printable receipt
  const handlePrintReceipt = () => {
    const receiptWindow = window.open('', '_blank');
    
    // Create receipt HTML
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hotel Invoice Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .receipt-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .hotel-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .hotel-info { font-size: 14px; color: #666; }
          .invoice-title { font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 15px; text-align: center; }
          .details { margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f8f8f8; }
          .total-row { font-weight: bold; background-color: #f0f0f0; }
          .footer { margin-top: 30px; text-align: center; font-size: 14px; color: #666; }
          .print-button { text-align: center; margin-top: 30px; }
          .print-button button { padding: 10px 20px; background-color: #4CAF50; color: white; border: none; cursor: pointer; border-radius: 4px; }
          .print-button button:hover { background-color: #45a049; }
          @media print {
            .print-button { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div className="receipt-container">
          <div className="header">
            <div className="hotel-name">Royal Palm Hotel</div>
            <div className="hotel-info">123 Beachside Avenue, Accra, Ghana</div>
            <div className="hotel-info">Phone: +233 123 456 789 | Email: info@royalpalm.com</div>
          </div>
          
          <div className="invoice-title">INVOICE RECEIPT</div>
          
          <div className="details">
            <div className="row">
              <div className="label">Guest Name:</div>
              <div className="value">${invoiceDetails.guestName}</div>
            </div>
            <div className="row">
              <div className="label">Room Number:</div>
              <div className="value">${invoiceDetails.roomNumber}</div>
            </div>
            <div className="row">
              <div className="label">Room Type:</div>
              <div className="value">${invoiceDetails.roomType}</div>
            </div>
            <div className="row">
              <div className="label">Check-in Date:</div>
              <div className="value">${invoiceDetails.checkIn}</div>
            </div>
            <div className="row">
              <div className="label">Check-out Date:</div>
              <div className="value">${invoiceDetails.checkOut}</div>
            </div>
            <div className="row">
              <div className="label">Number of Nights:</div>
              <div className="value">${invoiceDetails.nights}</div>
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
                <td>Room Charges (${invoiceDetails.roomType})</td>
                <td>${invoiceDetails.checkIn} to ${invoiceDetails.checkOut}</td>
                <td>GH₵${invoiceDetails.roomRate.toFixed(2)} x ${invoiceDetails.nights} nights = GH₵${invoiceDetails.roomTotal.toFixed(2)}</td>
              </tr>
              ${invoiceDetails.serviceItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.date}</td>
                  <td>GH₵${item.price.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr className="total-row">
                <td colspan="2">Total Amount</td>
                <td>GH₵${invoiceDetails.totalAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2">Payment Status</td>
                <td>${invoiceDetails.paymentStatus}</td>
              </tr>
            </tbody>
          </table>
          
          <div className="footer">
            Thank you for staying with us. We hope to see you again soon!
          </div>
          
          <div className="print-button">
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
  
  // Helper function to format dates consistently
  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      // Try to handle various date formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // If invalid date, return as is
      
      // Format as DD/MM/YYYY
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original if there's an error
    }
  };
  
  // Handle room rate edit
  const handleRoomRateEdit = () => {
    const currentRate = invoiceDetails.roomRate;
    const newRate = parseFloat(prompt(`Edit room rate (GH₵):`, currentRate) || currentRate);
    
    if (!isNaN(newRate) && newRate >= 0) {
      // Calculate new totals
      const newRoomTotal = newRate * invoiceDetails.nights;
      const newTotalAmount = newRoomTotal + invoiceDetails.serviceTotal;
      
      setInvoiceDetails({
        ...invoiceDetails,
        roomRate: newRate,
        roomTotal: newRoomTotal,
        totalAmount: newTotalAmount
      });
    }
  };
  
  // Update the addServiceItem function
  const addServiceItem = () => {
    setShowServiceModal(true);
  };

  const handleAddServiceItem = () => {
    if (!newServiceItem.name || !newServiceItem.price) {
      alert('Please fill in all required fields');
      return;
    }

    const serviceItem = {
      name: newServiceItem.name,
      price: parseFloat(newServiceItem.price),
      date: newServiceItem.date || new Date().toISOString().split('T')[0],
      isManual: true
    };

    setInvoiceDetails(prev => {
      const updatedServiceItems = [...prev.serviceItems, serviceItem];
      const newServiceTotal = updatedServiceItems.reduce((sum, item) => sum + item.price, 0);
      
      return {
        ...prev,
        serviceItems: updatedServiceItems,
        serviceTotal: newServiceTotal,
        totalAmount: prev.roomTotal + newServiceTotal
      };
    });

    // Reset form and close modal
    setNewServiceItem({
      name: '',
      price: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowServiceModal(false);
  };
  
  // Handle message from service dialog
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'ADD_SERVICE') {
        const { name, price } = event.data.data;
        
        // Add the service item
        const newServiceItem = {
          id: Date.now(),
          name: name,
          price: price,
          date: format(new Date(), 'yyyy-MM-dd'),
          isManual: true
        };
        
        // Update invoice details with the new service item
        const updatedServiceItems = [...invoiceDetails.serviceItems, newServiceItem];
        const newServiceTotal = updatedServiceItems.reduce((sum, item) => sum + (item.price || 0), 0);
        const newTotalAmount = invoiceDetails.roomTotal + newServiceTotal;
        
        setInvoiceDetails({
          ...invoiceDetails,
          serviceItems: updatedServiceItems,
          serviceTotal: newServiceTotal,
          totalAmount: newTotalAmount
        });
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [invoiceDetails]);
  
  // Update the removeServiceItem function with confirmation
  const removeServiceItem = (index) => {
    if (window.confirm('Are you sure you want to remove this service item from the invoice?')) {
      setInvoiceDetails(prev => {
        const updatedItems = [...prev.serviceItems];
        updatedItems.splice(index, 1);
        
        // Recalculate service total and invoice total
        const newServiceTotal = updatedItems.reduce((sum, item) => sum + item.price, 0);
        
        return {
          ...prev,
          serviceItems: updatedItems,
          serviceTotal: newServiceTotal,
          totalAmount: prev.roomTotal + newServiceTotal
        };
      });
    }
  };
  
  // Update the handleCreateInvoice function to use the correct property names
  const handleCreateInvoice = async () => {
    // Validate that we have all necessary information
    if (!selectedGuest) {
      alert('Please select a guest to create an invoice.');
      return;
    }

    if (!invoiceDetails.roomNumber || !invoiceDetails.nights || invoiceDetails.roomRate <= 0) {
      alert('Please ensure room details are complete with a valid rate.');
      return;
    }

    // Set submitting state to show loading indicator
    setIsSubmitting(true);
    
    try {
      // Prepare invoice object for database
      const invoiceData = {
        guest_id: selectedGuest.guest_id || selectedGuest.id || null,
        guest_name: invoiceDetails.guestName,
        room_number: invoiceDetails.roomNumber,
        room_type: invoiceDetails.roomType,
        check_in_date: invoiceDetails.checkIn,
        check_out_date: invoiceDetails.checkOut,
        nights: invoiceDetails.nights,
        room_rate: invoiceDetails.roomRate,
        room_total: invoiceDetails.roomTotal,
        service_total: invoiceDetails.serviceTotal || 0,
        amount: invoiceDetails.totalAmount,
        status: invoiceDetails.paymentStatus,
        has_service_items: invoiceDetails.serviceItems.length > 0
      };
      
      console.log('Saving invoice to database:', invoiceData);
      
      // Insert invoice into Supabase
      const { data: invoiceResult, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();
      
      if (invoiceError) {
        console.error('Error saving invoice:', invoiceError);
        
        // Handle specific types of errors with more informative messages
        if (invoiceError.code === '42501' || invoiceError.message.includes('permission denied') || invoiceError.message.includes('violates row-level security policy')) {
          throw new Error(`Row-Level Security Policy Error: You don't have permission to create invoices. Please see the README-RLS-FIX.md file for instructions on fixing RLS policies.`);
        } else if (invoiceError.code === '401' || invoiceError.code === 'PGRST301') {
          throw new Error(`Authentication Error: Your session may have expired. See README-RLS-FIX.md for RLS policy setup instructions.`);
        } else {
          throw new Error(`Failed to insert invoice: ${invoiceError.message}`);
        }
      }
      
      console.log('Invoice saved successfully:', invoiceResult);
      
      // If we have service items, save them too
      if (invoiceDetails.serviceItems.length > 0 && invoiceResult) {
        const invoiceItems = invoiceDetails.serviceItems.map(item => ({
          invoice_id: invoiceResult.id,
          service_id: item.service_id || null,
          item_name: item.name,
          item_price: item.price,
          item_date: item.date,
          status: item.status || (item.isManual ? 'Manual' : 'Pending')
        }));
        
        console.log('Saving invoice items:', invoiceItems);
        
        const { data: itemsResult, error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);
        
        if (itemsError) {
          console.error('Error saving invoice items:', itemsError);
          // We'll continue since the main invoice was saved
          toast('Some service items could not be saved.', {
            icon: '⚠️',
            style: {
              borderRadius: '10px',
              background: '#fef08a',
              color: '#854d0e',
            },
          });
        } else {
          console.log('Invoice items saved successfully');
        }
      }
      
      // Create invoice object for parent component (BillingPage)
      const invoice = {
        id: invoiceResult.id,
        guestId: selectedGuest.guest_id || selectedGuest.id,
        guest: invoiceDetails.guestName,
        room: invoiceDetails.roomNumber,
        checkIn: invoiceDetails.checkIn,
        checkOut: invoiceDetails.checkOut,
        amount: invoiceDetails.totalAmount,
        status: invoiceDetails.paymentStatus,
        date: format(new Date(), 'yyyy-MM-dd'),
        roomType: invoiceDetails.roomType,
        nights: invoiceDetails.nights,
        roomRate: invoiceDetails.roomRate,
        roomTotal: invoiceDetails.roomTotal,
        serviceTotal: invoiceDetails.serviceTotal,
        serviceItems: invoiceDetails.serviceItems
      };
      
      // Call the parent component's handler with the new invoice
      onCreateInvoice(invoice);
      
      // Reset state
      setSelectedGuest(null);
      resetInvoiceDetails();
      
      // Show success message
      toast.success('Invoice created and saved to database successfully!');
      
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error(`Failed to create invoice: ${error.message}`);
      
      // Create a fallback local invoice to prevent data loss
      const localInvoice = {
        id: Date.now(),
        guestId: selectedGuest.guest_id || selectedGuest.id,
        guest: invoiceDetails.guestName,
        room: invoiceDetails.roomNumber,
        checkIn: invoiceDetails.checkIn,
        checkOut: invoiceDetails.checkOut,
        amount: invoiceDetails.totalAmount,
        status: invoiceDetails.paymentStatus,
        date: format(new Date(), 'yyyy-MM-dd'),
        roomType: invoiceDetails.roomType,
        nights: invoiceDetails.nights,
        roomRate: invoiceDetails.roomRate,
        serviceItems: invoiceDetails.serviceItems,
        roomTotal: invoiceDetails.roomTotal,
        serviceTotal: invoiceDetails.serviceTotal,
        isLocalOnly: true // Flag to indicate this invoice exists only locally
      };
      
      // Still call onCreateInvoice to add the invoice to local state
      onCreateInvoice(localInvoice);
      toast('Invoice will be stored locally only.', {
        icon: '⚠️',
        style: {
          borderRadius: '10px',
          background: '#fef08a',
          color: '#854d0e',
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg w-full max-w-3xl mx-auto overflow-hidden shadow-xl`}>
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-xl font-semibold">Generate Invoice</h2>
          <button 
            onClick={onClose}
            className={`${isDarkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium">Select Guest</label>
            {loadingInvoices ? (
              <div className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'} flex items-center justify-center`}>
                <i className="fas fa-spinner fa-spin mr-2"></i> Loading guest list...
              </div>
            ) : guestOptions.length === 0 ? (
              <div className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                No guests without invoices found. All guests have been invoiced.
              </div>
            ) : (
              <select 
                className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}
                value={selectedGuest ? (selectedGuest.guest_id || selectedGuest.id || '') : ''}
                onChange={(e) => {
                  // Get the selected guest ID
                  const selectedId = e.target.value;
                  if (!selectedId) {
                    // If no guest is selected, reset the form
                    setSelectedGuest(null);
                    resetInvoiceDetails();
                    return;
                  }
                  
                  // Find the guest object matching the selected ID
                  const selectedGuest = guestOptions.find(g => 
                    String(g.guest_id) === selectedId || String(g.id) === selectedId
                  );
                  
                  if (selectedGuest) {
                    // First reset the form
                    resetInvoiceDetails();
                    
                    // Then set the selected guest
                    setSelectedGuest(selectedGuest);
                    
                    // Allow state update to complete before processing the guest
                    setTimeout(() => {
                      console.log("Processing selected guest:", selectedGuest);
                      handleGuestSelect(selectedGuest);
                    }, 100);
                  }
                }}
              >
                <option value="">-- Select a guest --</option>
                {guestOptions.map((guest, index) => {
                  const guestId = guest.guest_id || guest.id || index;
                  const guestName = guest.guest_name || guest.name || 'Guest';
                  return (
                    <option key={index} value={guestId}>
                      {guestName} {guest.room_id || guest.room ? ` - Room ${guest.room_id || guest.room}` : ''}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
          
          {selectedGuest && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="font-medium mb-2">Guest Details</h3>
                <p className="mb-1"><span className="font-medium">Name:</span> {invoiceDetails.guestName}</p>
                <p className="mb-1"><span className="font-medium">Room:</span> {invoiceDetails.roomNumber}</p>
                <p className="mb-1"><span className="font-medium">Room Type:</span> {invoiceDetails.roomType}</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Stay Information</h3>
                <p className="mb-1"><span className="font-medium">Check-in:</span> {formatDateDisplay(invoiceDetails.checkIn)}</p>
                <p className="mb-1"><span className="font-medium">Check-out:</span> {formatDateDisplay(invoiceDetails.checkOut)}</p>
                <p className="mb-1"><span className="font-medium">Nights:</span> {invoiceDetails.nights}</p>
              </div>
            </div>
          )}
          
          {selectedGuest && (
            <div className="mt-6 p-4 rounded-lg border bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="font-medium mb-3">Invoice Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Room Rate (per night):</span>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">GH₵{invoiceDetails.roomRate?.toFixed(2) || '0.00'}</span>
                    <button 
                      onClick={() => {
                        const newRate = prompt('Enter new room rate (GH₵ per night):', invoiceDetails.roomRate);
                        if (newRate && !isNaN(parseFloat(newRate)) && parseFloat(newRate) >= 0) {
                          const rate = parseFloat(newRate);
                          const roomTotal = rate * invoiceDetails.nights;
                          setInvoiceDetails(prev => ({
                            ...prev,
                            roomRate: rate,
                            roomTotal: roomTotal,
                            totalAmount: roomTotal + prev.serviceTotal
                          }));
                        }
                      }}
                      className="text-xs p-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      title="Edit Room Rate"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Nights:</span>
                  <span className="font-medium">{invoiceDetails.nights || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Room Total:</span>
                  <span className="font-medium">GH₵{invoiceDetails.roomTotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Total:</span>
                  <span className="font-medium">GH₵{invoiceDetails.serviceTotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="border-t pt-2 mt-2 dark:border-gray-700">
                  <div className="flex justify-between font-bold">
                    <span>Final Total:</span>
                    <span>GH₵{invoiceDetails.totalAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {selectedGuest && (
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium">Payment Status</label>
              <select 
                className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}
                value={invoiceDetails.paymentStatus}
                onChange={handlePaymentStatusChange}
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
          )}
          
          {selectedGuest && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Service Requests</h3>
                <button
                  onClick={addServiceItem}
                  className={`px-2 py-1 rounded text-sm ${isDarkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                >
                  <i className="fas fa-plus mr-1"></i> Add Service
                </button>
              </div>
              
              {invoiceDetails.serviceItems.length > 0 ? (
                <div className={`overflow-hidden rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} max-h-60 overflow-y-auto`}>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className={isDarkMode ? 'bg-gray-600' : 'bg-gray-50'}>
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Service</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider">Amount</th>
                        <th scope="col" className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoiceDetails.serviceItems.map((item, index) => (
                        <tr key={index} className={item.isManual ? (isDarkMode ? 'bg-blue-900 bg-opacity-20' : 'bg-blue-50') : ''}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{item.name}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{formatDateDisplay(item.date)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            {item.isManual ? (
                              <span className={`px-2 py-0.5 rounded text-xs ${isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                                Manual
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                item.status === 'Completed' 
                                  ? (isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800')
                                  : (isDarkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')
                              }`}>
                                {item.status || 'Pending'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right">GH₵{item.price.toFixed(2)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <button
                              onClick={() => removeServiceItem(index)}
                              className="text-red-500 hover:text-red-700"
                              title="Remove from invoice"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {/* Service total row */}
                      <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} font-medium`}>
                        <td colSpan="3" className="px-3 py-2 text-right">Service Total:</td>
                        <td className="px-3 py-2 text-right">GH₵{invoiceDetails.serviceTotal.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No service items added yet. Service requests will be automatically loaded if available.
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="border-t p-4 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Cancel
          </button>
          {selectedGuest && (
            <>
              <button 
                onClick={handlePrintReceipt}
                className={`px-4 py-2 rounded ${isDarkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
              >
                <i className="fas fa-print mr-2"></i>
                Print Receipt
              </button>
              <button 
                onClick={handleCreateInvoice}
                className={`px-4 py-2 rounded ${isDarkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Processing...
                  </>
                ) : (
                  'Create Invoice'
                )}
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Service Item Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`rounded-lg p-6 w-96 shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-medium mb-4">Add Service Item</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Service Name</label>
              <input
                type="text"
                value={newServiceItem.name}
                onChange={(e) => setNewServiceItem(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full p-2 border rounded ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                placeholder="e.g., Room Service, Laundry"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Price (GH₵)</label>
              <input
                type="number"
                value={newServiceItem.price}
                onChange={(e) => setNewServiceItem(prev => ({ ...prev, price: e.target.value }))}
                className={`w-full p-2 border rounded ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={newServiceItem.date}
                onChange={(e) => setNewServiceItem(prev => ({ ...prev, date: e.target.value }))}
                className={`w-full p-2 border rounded ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowServiceModal(false)}
                className={`px-4 py-2 rounded ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddServiceItem}
                className={`px-4 py-2 rounded ${
                  isDarkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceModal; 