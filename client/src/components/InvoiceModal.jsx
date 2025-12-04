import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useRoomReservation } from '../context/RoomReservationContext';
import { useGuests } from '../context/GuestContext';
import { format, differenceInDays, parseISO } from 'date-fns';
import supabase from '../supabaseClient';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCalendarAlt, faUser, faHotel, faBed, faCreditCard, faPrint, faPlus, faTrash, faSave, faEdit, faMoneyBillWave, faSearch } from '@fortawesome/free-solid-svg-icons';

// Modify the ServiceSelectionModal to remove custom service functionality
const ServiceSelectionModal = ({ isOpen, onClose, onAddService, isDarkMode, roomNumber, roomName, guestId, currentInvoiceItems }) => {
  console.log('ServiceSelectionModal props:', { isOpen, onClose, onAddService, isDarkMode, roomNumber, roomName, guestId, currentInvoiceItems });
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtered service requests based on room number or search term
  const filteredRequests = useMemo(() => {
    if (!serviceRequests.length) return [];
    
    // Start with all service requests
    let filtered = [...serviceRequests];
    
    // Filter out already added service requests
    filtered = filtered.filter(request => {
      return !currentInvoiceItems.some(item => 
        item.id === request.id && item.isServiceRequest
      );
    });
    
    // If we have a search term, filter by it
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(req => 
        (req.service_name && req.service_name.toLowerCase().includes(term)) ||
        (req.room && String(req.room).toLowerCase().includes(term)) ||
        (req.requested_by && req.requested_by.toLowerCase().includes(term)) ||
        (req.notes && req.notes.toLowerCase().includes(term))
      );
    }
    
    // If we have a room number, prefer requests for this room
    if (roomNumber) {
      // First try exact match
      const roomMatch = filtered.filter(req => 
        String(req.room) === String(roomNumber)
      );
      
      // If we found exact matches, prioritize those
      if (roomMatch.length > 0) {
        const otherRequests = filtered.filter(req => 
          String(req.room) !== String(roomNumber)
        );
        
        // Show room matches first, then other matches
        return [...roomMatch, ...otherRequests];
      }
      
      // Try partial match if no exact matches
      const roomPartialMatch = filtered.filter(req => 
        String(req.room).includes(String(roomNumber)) || 
        String(roomNumber).includes(String(req.room))
      );
      
      if (roomPartialMatch.length > 0) {
        const otherRequests = filtered.filter(req => 
          !String(req.room).includes(String(roomNumber)) && 
          !String(roomNumber).includes(String(req.room))
        );
        
        // Show partial matches first, then other matches
        return [...roomPartialMatch, ...otherRequests];
      }
    }
    
    return filtered;
  }, [serviceRequests, searchTerm, roomNumber, currentInvoiceItems]);
  
  // Fetch service requests for the specific room when modal opens
  useEffect(() => {
    if (isOpen && roomNumber) {
      fetchServiceRequests();
    }
  }, [isOpen, roomNumber]);

  // Function to fetch service requests for this room
  const fetchServiceRequests = async () => {
    if (!roomNumber) {
      console.log("No room number provided, cannot fetch service requests");
      return;
    }
    
    console.log(`Fetching service requests for room: ${roomNumber} (display name: ${roomName || roomNumber})`);
    setLoading(true);
    
    try {
      // Fetch ALL service requests with service details to get the price
      const { data: allRequests, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          services:service_id (
            id,
            name,
            price,
            description
          )
        `)
        .in('status', ['Pending', 'In Progress', 'Completed'])
        .order('requested_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      console.log(`Retrieved ${allRequests?.length || 0} total service requests`);
      
      if (allRequests && allRequests.length > 0) {
        // Log structure for debugging
        console.log("Service request fields:", Object.keys(allRequests[0]));
        console.log("Sample service request:", allRequests[0]);
        
        // Log unique room values to understand how rooms are referenced
        const uniqueRooms = [...new Set(allRequests.map(req => req.room))];
        console.log("Unique room values in service_requests:", uniqueRooms);
        
        // Display all service requests for now
        setServiceRequests(allRequests);
        console.log(`Showing all ${allRequests.length} service requests`);
      } else {
        console.log("No service requests found");
        setServiceRequests([]);
      }
    } catch (err) {
      console.error('Error fetching service requests:', err);
      toast.error('Failed to load service requests');
      setServiceRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting a service request
  const handleSelectService = (request) => {
    // Get price from the related service if available
    let price = 0;
    
    if (request.services && request.services.price) {
      // Price from joined services table
      price = request.services.price;
    } else if (request.price) {
      // Direct price on the request (fallback)
      price = request.price;
    } else if (request.service_id) {
      console.log(`Service ID ${request.service_id} found but no price available`);
    }
    
    console.log(`Adding service "${request.service_name}" with price: ${price}`);
    
    // Convert to the format needed for invoice items
    onAddService({
      id: request.id,
      name: request.service_name,
      price: price, // Use the extracted price
      date: request.requested_at ? new Date(request.requested_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notes: request.notes,
      status: request.status,
      isServiceRequest: true
    });
    
    toast.success('Service request added to invoice');
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date) ? dateString : date.toLocaleDateString();
  };

  // Clean up when modal is closed
  useEffect(() => {
    if (!isOpen) {
      console.log('Trying to call setCurrentInvoiceItems, but it is not defined!');
      // Clean up global variable when modal closes
      if (window.currentInvoiceServiceItems) {
        delete window.currentInvoiceServiceItems;
      }
    }
    
    // Clean up on component unmount
    return () => {
      if (window.currentInvoiceServiceItems) {
        delete window.currentInvoiceServiceItems;
      }
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`${isDarkMode 
        ? 'bg-gray-800 text-white border-gray-700' 
        : 'bg-white text-gray-800 border-gray-200'
      } rounded-lg p-6 w-full max-w-4xl border shadow-lg`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Service Requests for {roomName ? `${roomName} (Room ${roomNumber})` : `Room ${roomNumber}`}
          </h2>
          <button 
            onClick={onClose}
            className={`${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        {/* Add search input */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for service requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 pr-10 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <FontAwesomeIcon 
                icon={searchTerm ? faTimes : faSearch} 
                className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} cursor-pointer`}
                onClick={() => searchTerm ? setSearchTerm('') : null}
              />
            </div>
          </div>
          {roomNumber && (
            <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {filteredRequests.length > 0 
                ? `Showing ${filteredRequests.length} service request(s)${searchTerm ? ' matching search' : ''}.` 
                : `No service requests found${searchTerm ? ' matching search' : ''}.`}
            </div>
          )}
        </div>
        
        {/* Service requests list */}
        <div>
          {loading ? (
            <div className="text-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2">Loading service requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center p-8">
              <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No service requests found{searchTerm ? ' matching your search' : ''}.
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                {!searchTerm 
                  ? 'Try searching for service requests by name, room, or requestor.' 
                  : `No results found for "${searchTerm}". Try a different search term.`}
              </p>
            </div>
          ) : (
            <div className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} max-h-[calc(80vh-220px)] overflow-y-auto`}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} sticky top-0 z-10`}>
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Service</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Room</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Price</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} ${
                      String(request.room) === String(roomNumber) 
                        ? (isDarkMode ? 'bg-green-900/20' : 'bg-green-50') 
                        : ''
                    }`}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{request.service_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{request.room}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{formatDate(request.requested_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${request.status === 'Completed' 
                            ? (isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') 
                            : request.status === 'In Progress'
                              ? (isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800')
                              : (isDarkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')
                          }`}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {(request.services && request.services.price) 
                          ? `GH₵${parseFloat(request.services.price).toFixed(2)}` 
                          : request.price 
                            ? `GH₵${parseFloat(request.price).toFixed(2)}`
                            : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleSelectService(request)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InvoiceModal = ({ isOpen, onClose, onCreateInvoice, invoiceToEdit }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { reservations, rooms } = useRoomReservation();
  const { guestList } = useGuests();
  
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState({
    guestName: '',
    guestId: null,
    roomNumber: '',
    actualRoomNumber: '', // Add actual room number for database
    roomRate: 0,
    checkIn: null,
    checkOut: null,
    nights: 0,
    roomTotal: 0,
    serviceTotal: 0,
    totalAmount: 0,
    paymentStatus: 'Pending',
    serviceItems: []
  });
  
  // First, add a new state for the service item modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  
  // Add state for services
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // Add loading state at the top with other state variables 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add state for existing invoices
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  
  // Add state for form management
  const [guestOptions, setGuestOptions] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Add state for room name
  const [roomName, setRoomName] = useState('');
  
  // Calculate nights between two dates - moving this function before it's used in handleGuestSelect
  const calculateNights = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  // Fetch existing invoices when the modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchExistingInvoices = async () => {
        setLoadingInvoices(true);
        try {
          const { data, error } = await supabase
            .from('invoices')
            .select('id, guest_name, room_number')
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error('Error fetching existing invoices:', error);
            toast.error('Error loading invoice data');
          } else {
            console.log('Fetched existing invoices:', data?.length || 0);
            setExistingInvoices(data || []);
          }
        } catch (err) {
          console.error('Error in invoice fetch:', err);
          toast.error('Unexpected error loading invoice data');
        } finally {
          setLoadingInvoices(false);
        }
      };
      
      fetchExistingInvoices();
    }
  }, [isOpen]);
  
  // Fetch services when the service modal opens
  useEffect(() => {
    if (showServiceModal) {
      fetchServices();
    }
  }, [showServiceModal]);
  
  // Function to fetch services from the database
  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
        
      if (error) {
        console.error('Error fetching services:', error);
        toast.error('Failed to load services');
      } else {
        setServices(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching services:', err);
    } finally {
      setLoadingServices(false);
    }
  };
  
  // Combine reservation data and guest data for selection, filtering out guests who already have invoices
  const guestOptionsMemo = React.useMemo(() => {
    if (loadingInvoices) {
      console.log("Still loading invoices, waiting before processing guests");
      return [];
    }

    // Create a combined array of guests from both sources
    const combinedGuests = [
      ...(Array.isArray(reservations) ? reservations.filter(r => r.status === 'Checked In') : []),
      ...(Array.isArray(guestList) ? guestList.filter(g => g.status === 'Checked In' || g.status === 'checked_in') : [])
    ];

    // Log for debugging
    console.log(`Processing ${combinedGuests.length} total guests`);
    console.log(`Existing invoices: ${existingInvoices.length}`);
    
    // First, deduplicate guests
    const uniqueGuests = combinedGuests.reduce((acc, guest) => {
      const guestId = guest.guest_id || guest.id;
      const guestName = guest.guest_name || guest.name;
      
      // Skip if neither id nor name is available
      if (!guestId && !guestName) return acc;
      
      // Check if this guest is already in our accumulator
      const isDuplicate = acc.some(g => {
        const accId = g.guest_id || g.id;
        const accName = g.guest_name || g.name;
        
        return (guestId && accId && (accId.toString() === guestId.toString())) || 
               (guestName && accName && (accName.toLowerCase() === guestName.toLowerCase()));
      });
      
      if (!isDuplicate) {
        acc.push(guest);
      }
      
      return acc;
    }, []);
    
    console.log(`After deduplication: ${uniqueGuests.length} unique guests`);
    
    // Then, filter out guests who already have invoices
    const guestsWithoutInvoices = uniqueGuests.filter(guest => {
      const guestId = guest.guest_id || guest.id;
      const guestName = guest.guest_name || guest.name;
      
      // Skip guests without proper identification
      if (!guestId && !guestName) {
        console.log("Skipping guest with no ID or name");
        return false;
      }
      
      // Check if this guest has an active room assignment
      const hasRoom = guest.room_id || guest.room;
      if (!hasRoom) {
        console.log(`Guest ${guestName} (${guestId}) has no room assignment, skipping`);
        return false;
      }
      
      // Check if this guest already has an invoice
      const hasInvoice = existingInvoices.some(invoice => {
        const invoiceGuestId = invoice.guest_id;
        const invoiceGuestName = invoice.guest_name;
        
        // Safely convert IDs to strings for comparison
        const guestIdStr = guestId ? String(guestId).trim() : '';
        const invoiceGuestIdStr = invoiceGuestId ? String(invoiceGuestId).trim() : '';
        
        // Case-insensitive name comparison
        const guestNameLower = guestName ? guestName.toLowerCase().trim() : '';
        const invoiceGuestNameLower = invoiceGuestName ? invoiceGuestName.toLowerCase().trim() : '';
        
        const idMatch = guestIdStr && invoiceGuestIdStr && 
                       (guestIdStr === invoiceGuestIdStr);
        
        const nameMatch = guestNameLower && invoiceGuestNameLower && 
                         (guestNameLower === invoiceGuestNameLower);
        
        if (idMatch) {
          console.log(`Guest with ID ${guestIdStr} already has an invoice`);
          return true;
        }
        
        if (nameMatch) {
          console.log(`Guest with name "${guestName}" already has an invoice`);
          return true;
        }
        
        return false;
      });
      
      // Keep guests who don't have invoices
      return !hasInvoice;
    });
    
    console.log(`After filtering invoices: ${guestsWithoutInvoices.length} guests without invoices`);
    return guestsWithoutInvoices;
  }, [reservations, guestList, existingInvoices, loadingInvoices]);
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form state when modal closes
      setSelectedGuest(null);
      setInvoiceDetails({
        guestName: '',
        guestId: null,
        roomNumber: '',
        actualRoomNumber: '',
        roomRate: 0,
        checkIn: null,
        checkOut: null,
        nights: 0,
        roomTotal: 0,
        serviceTotal: 0,
        totalAmount: 0,
        paymentStatus: 'Pending',
        serviceItems: []
      });
    }
  }, [isOpen]);
  
  // Handle guest selection
  const handleGuestSelect = useCallback(async (guest) => {
    try {
      // If we are in editing mode, we don't need to fetch service items
      if (isEditing) return;
      
      console.log("Selected guest:", guest);
      
      // First, get room information to get rate
      let roomData = null;
      let reservationData = null;
      let roomName = ''; 
      let actualRoomNumber = ''; // Initialize the actual room number
      let roomId = null;
      let roomRate = 0;
      
      // If we have a reservation_id, get room data from the reservation
      if (guest.reservation_id) {
        console.log(`Looking up reservation with ID: ${guest.reservation_id}`);
        
        const { data: resData, error: resError } = await supabase
          .from('reservations')
          .select('*, rooms(*)')  // Get all room fields to ensure we get the price
          .eq('id', guest.reservation_id)
          .single();
        
        if (resError) {
          console.error("Error fetching reservation:", resError);
        } else if (resData) {
          console.log("Reservation data found:", resData);
          reservationData = resData;
          
          if (resData.rooms) {
          roomData = resData.rooms;
            roomId = roomData.id;
            roomName = roomData.name || roomData.room_number || ''; // Use room name first, then fall back to room_number
            actualRoomNumber = roomData.room_number || '';
            roomRate = parseFloat(roomData.price) || 0;
            console.log(`Room from reservation: ${roomName}, ID: ${roomId}, Price: ${roomRate}`);
          }
        }
      }
      
      // If no room data from reservation, check room_id directly
      if (!roomData && guest.room_id) {
        console.log(`Looking up room with ID: ${guest.room_id}`);
        
        const { data: rmData, error: rmError } = await supabase
          .from('rooms')
          .select('*')  // Get all fields including price
          .eq('id', guest.room_id)
          .single();
        
        if (rmError) {
          console.error("Error fetching room by ID:", rmError);
        } else if (rmData) {
          console.log("Room data found by ID:", rmData);
          roomData = rmData;
          roomId = rmData.id;
          roomName = rmData.name || rmData.room_number || ''; // Use room name first, then fall back to room_number
          actualRoomNumber = rmData.room_number || '';
          roomRate = parseFloat(rmData.price) || 0;
          console.log(`Room by ID: ${roomName}, Price: ${roomRate}`);
        }
      }
      
      // DIRECT LOOKUP BY ROOM NUMBER/NAME
      // If still no room data, try a direct room table lookup
      if (!roomData && guest.room) {
        const roomValue = String(guest.room).trim();
        console.log(`Direct lookup for room by value: ${roomValue}`);
        
        try {
          // Extract numeric value from room string (e.g., "101", "Room 101" -> 101)
          const numericRoomValue = Number(roomValue.replace(/[^0-9]/g, ''));
          
          // Only proceed if we have a valid numeric room number
          if (Number.isFinite(numericRoomValue) && numericRoomValue > 0) {
            // Try to get the room directly from the rooms table using numeric comparison
            const { data: directRoomData, error: directRoomError } = await supabase
              .from('rooms')
              .select('*')
              .eq('room_number', numericRoomValue)
              .order('id', { ascending: true })
              .limit(1);
            
            if (directRoomError) {
              console.error("Error in direct room lookup:", directRoomError);
            } else if (directRoomData && directRoomData.length > 0) {
              console.log("Direct room lookup successful:", directRoomData[0]);
              roomData = directRoomData[0];
              roomId = roomData.id;
              roomName = roomData.name || roomData.room_number || '';
              actualRoomNumber = roomData.room_number || '';
              roomRate = parseFloat(roomData.price) || 0;
              console.log(`Direct room lookup: ${roomName}, Price: ${roomRate}`);
            } else {
              console.log("No direct room match found, trying extended search");
            }
          } else {
            console.log(`Invalid numeric room value: ${roomValue}, skipping direct lookup`);
          }
        } catch (err) {
          console.error("Error in direct room lookup:", err);
        }
      }
      
      // If still no room data, try all possible ways to match the room
      if (!roomData && guest.room) {
        const roomValue = String(guest.room).trim();
        console.log(`Extended lookup for room by value: ${roomValue}`);
        
        // Get ALL rooms to ensure we have accurate pricing data
        const { data: allRooms, error: roomsError } = await supabase
          .from('rooms')
          .select('*');
          
        if (roomsError) {
          console.error("Error fetching all rooms:", roomsError);
        } else if (allRooms && allRooms.length > 0) {
          console.log(`Retrieved ${allRooms.length} rooms total`);
          
          // Log all room data for debugging
          console.log("All rooms data:", allRooms.map(r => ({
            id: r.id,
            number: r.room_number,
            name: r.name,
            price: r.price,
            block: r.block,
            type: r.type || r.room_type
          })));
          
          // Log what we're searching for
          console.log(`Searching for room with value: "${roomValue}" (type: ${typeof roomValue})`);
          
          // First try exact match on room_number (try both string and numeric comparison)
          const exactNumberMatch = allRooms.find(
            r => String(r.room_number) === String(roomValue) || r.room_number === Number(roomValue)
          );
          
          if (exactNumberMatch) {
            console.log(`Found exact room_number match: ${exactNumberMatch.room_number}`, exactNumberMatch);
            roomData = exactNumberMatch;
            roomId = exactNumberMatch.id;
            roomName = exactNumberMatch.name || exactNumberMatch.room_number || '';
            actualRoomNumber = exactNumberMatch.room_number || '';
            roomRate = parseFloat(exactNumberMatch.price) || 0;
          } 
          // Then try exact match on name if available
          else if (allRooms.find(r => r.name && r.name.toLowerCase() === roomValue.toLowerCase())) {
            const exactNameMatch = allRooms.find(
              r => r.name && r.name.toLowerCase() === roomValue.toLowerCase()
            );
            
            console.log(`Found exact name match: ${exactNameMatch.name}`, exactNameMatch);
            roomData = exactNameMatch;
            roomId = exactNameMatch.id;
            roomName = exactNameMatch.name || exactNameMatch.room_number || '';
            actualRoomNumber = exactNameMatch.room_number || '';
            roomRate = parseFloat(exactNameMatch.price) || 0;
          }
          // Then try partial match
          else {
            const partialMatch = allRooms.find(
              r => (r.room_number && String(r.room_number).includes(roomValue)) ||
                   (r.name && r.name.toLowerCase().includes(roomValue.toLowerCase()))
            );
            
            if (partialMatch) {
              console.log(`Found partial match: ${partialMatch.room_number || partialMatch.name}`, partialMatch);
              roomData = partialMatch;
              roomId = partialMatch.id;
              roomName = partialMatch.name || partialMatch.room_number || '';
              actualRoomNumber = partialMatch.room_number || '';
              roomRate = parseFloat(partialMatch.price) || 0;
            }
          }
        }
      }
      
      // Log the room data we found
      if (roomData) {
        console.log("Final room data:", roomData);
        console.log(`Room: ${roomName}, ID: ${roomId}, Price: GH₵${roomRate}`);
      } else {
        console.warn("⚠️ NO ROOM DATA FOUND! Using fallback values.");
      }
      
      // Apply Aquarian room fallback price if room price is 0 or invalid
      // Check if this is an Aquarian room by examining block, room name, or room data
      if (roomRate === 0 || !roomRate) {
        const guestBlock = (guest.block || guest.room_block || roomData?.block || '').toLowerCase();
        const displayRoom = String(guest.room_name || guest.room_id || guest.room || roomName || '').toLowerCase();
        const roomBlock = (roomData?.block || '').toLowerCase();
        
        // Extract numeric room number for range check
        const roomNumberStr = String(guest.room || actualRoomNumber || roomName || '').replace(/[^0-9]/g, '');
        const roomNumberInt = parseInt(roomNumberStr, 10);
        
        // Aquarian rooms are typically 101-114 or 1-14
        const isAquarianByNumber = (roomNumberInt >= 101 && roomNumberInt <= 114) || 
                                   (roomNumberInt >= 1 && roomNumberInt <= 14);
        
        // Check multiple indicators for Aquarian rooms
        const isAquarianByKeyword = guestBlock.includes('aquarian') || 
                                    guestBlock.includes('aquarium') ||
                                    displayRoom.includes('aquarian') ||
                                    displayRoom.includes('aquarium') ||
                                    roomBlock.includes('aquarian') ||
                                    roomBlock.includes('aquarium') ||
                                    displayRoom.includes('aq');
        
        const isAquarian = isAquarianByNumber || isAquarianByKeyword;
        
        if (isAquarian) {
          console.log(`Aquarian room detected (room ${roomNumberStr}) with 0 price - applying fallback price of GH₵500`);
          roomRate = 500;
        } else if (!roomData) {
          console.log('No room data found; defaulting room rate to GH₵0');
        }
      }
      
      // Set the roomName state for use in forms and templates
      setRoomName(roomName);
      
      // Get check-in/check-out dates and calculate nights
      let checkIn = guest.check_in || null;
      let checkOut = guest.check_out || null;
      
      // If we got reservation data, use those dates
      if (reservationData) {
        checkIn = reservationData.check_in_date || checkIn;
        checkOut = reservationData.check_out_date || checkOut;
      }
      
      const nights = calculateNights(checkIn, checkOut);

      const roomTotal = roomRate * nights;
      
      // Use room name for display but keep actual room number for database queries
      const displayRoomNumber = roomName || actualRoomNumber || guest.room || '';
      
      // Update the invoice details
      setInvoiceDetails({
        guestName: guest.guest_name || guest.name || 'Guest',
        guestId: guest.guest_id || guest.id,
        roomNumber: displayRoomNumber,
        actualRoomNumber: actualRoomNumber,
        roomRate: roomRate,
        checkIn: checkIn,
        checkOut: checkOut,
        nights: nights,
        roomTotal: roomTotal,
        serviceTotal: 0,
        totalAmount: roomTotal,
        paymentStatus: 'Pending',
        serviceItems: []
      });
      
      console.log("Invoice details updated:", {
        guestName: guest.guest_name || guest.name || 'Guest',
        roomNumber: displayRoomNumber,
        actualRoomNumber: actualRoomNumber,
        roomId: roomId,
        roomRate: roomRate,
        nights: nights,
        total: roomTotal
      });
      
    } catch (err) {
      console.error("Error handling guest selection:", err);
      toast.error(`Error loading guest data: ${err.message}`);
    }
  }, [isEditing, calculateNights]);
  
  // Reset invoice details
  const resetInvoiceDetails = () => {
    setInvoiceDetails({
      guestName: '',
      guestId: null,
      roomNumber: '',
      actualRoomNumber: '',
      roomRate: 0,
      checkIn: null,
      checkOut: null,
      nights: 0,
      roomTotal: 0,
      serviceTotal: 0,
      totalAmount: 0,
      paymentStatus: 'Pending',
      serviceItems: []
    });
    
    // Also reset roomName
    setRoomName('');
  };
  
  // Handle payment status change
  const handlePaymentStatusChange = (e) => {
    setInvoiceDetails(prev => ({
      ...prev,
      paymentStatus: e.target.value
    }));
  };
  
  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return isNaN(date) ? dateStr : date.toLocaleDateString();
  };
  
  // Fetch guests without invoices
  const fetchGuestsWithoutInvoices = async () => {
    setLoadingInvoices(true);
    
    try {
      // Only fetch guests that do not already have invoices if not in edit mode
      if (!isEditing) {
        const { data: invoicedGuests, error: invoiceError } = await supabase
          .from('invoices')
          .select('guest_id');
        
        if (invoiceError) throw invoiceError;
        
        // Get IDs of guests who already have invoices
        const invoicedGuestIds = invoicedGuests?.map(ig => ig.guest_id) || [];
        
        // Get active guests (checked in but not checked out)
        let { data: guests, error: guestError } = await supabase
          .from('guests')
          .select('id, name, room, check_in, check_out')
          .or('status.eq.checked_in,status.eq.Checked In');
        
        if (guestError) throw guestError;
        
        // Filter out guests who already have invoices and who don't have room assignments
        if (guests && guests.length > 0) {
          guests = guests.filter(guest => {
            // Check if guest has an invoice
            const hasInvoice = invoicedGuestIds.length > 0 && invoicedGuestIds.includes(guest.id);
            
            // Check if guest has a room assignment
            const hasRoom = guest.room && String(guest.room).trim() !== '';
            
            // Keep only guests who don't have invoices and have rooms
            return !hasInvoice && hasRoom;
          });
          
          // Fetch room names for all guests with room assignments
          // Sanitize room numbers: extract numeric values and filter out invalid ones
          const roomNumbers = guests
            .map(guest => {
              // Extract numeric value from room string (e.g., "101", "Room 101" -> 101)
              const roomStr = String(guest.room || '').trim();
              const numericValue = Number(roomStr.replace(/[^0-9]/g, ''));
              return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
            })
            .filter(room => room !== null);
          
          if (roomNumbers.length > 0) {
            const { data: roomsData, error: roomsError } = await supabase
              .from('rooms')
              .select('room_number, name')
              .in('room_number', roomNumbers);
              
            if (!roomsError && roomsData) {
              // Create a mapping of room number to room name
              const roomMap = {};
              roomsData.forEach(room => {
                roomMap[room.room_number] = room.name || room.room_number;
              });
              
              // Add room_name to each guest
              guests = guests.map(guest => ({
                ...guest,
                room_name: roomMap[guest.room] || guest.room
              }));
            }
          }
        }
        
        // Set guest options
        setGuestOptions(guests || []);
      }
    } catch (err) {
      console.error("Error fetching guests:", err);
      toast.error(`Error loading guests: ${err.message}`);
      setGuestOptions([]);
    } finally {
      setLoadingInvoices(false);
    }
  };
  
  // Handle creating or updating an invoice
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    
    // Validate the form
    if (!invoiceDetails.guestName) {
      toast.error('Please select a guest');
      return;
    }
    
    if (!invoiceDetails.roomNumber) {
      toast.error('Guest must have a room assignment');
      return;
    }
    
    if (invoiceDetails.totalAmount <= 0) {
      toast.error('Invoice amount must be greater than zero');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Ensure room_number is set correctly (it's required by the database)
      // Use actualRoomNumber for database, but keep display name for UI
      const roomNumber = invoiceDetails.actualRoomNumber ? String(invoiceDetails.actualRoomNumber).trim() : String(invoiceDetails.roomNumber).trim();
      
      if (!roomNumber) {
        throw new Error('Room number is required and cannot be empty');
      }
      
      // Create invoice object
      const invoiceData = {
        guest_id: invoiceDetails.guestId,
        guest_name: invoiceDetails.guestName,
        room_number: roomNumber,
        room_name: roomName || roomNumber, // Use roomName (actual name) first, fall back to number
        check_in_date: invoiceDetails.checkIn,
        check_out_date: invoiceDetails.checkOut,
        nights: invoiceDetails.nights || 1,
        room_rate: invoiceDetails.roomRate || 0,
        room_total: invoiceDetails.roomTotal || 0,
        service_total: invoiceDetails.serviceTotal || 0,
        amount: invoiceDetails.totalAmount || 0,
        status: invoiceDetails.paymentStatus || 'Pending',
        has_service_items: invoiceDetails.serviceItems && invoiceDetails.serviceItems.length > 0,
        ...(isEditing ? { id: invoiceToEdit.id } : {}), // Include ID if editing
      };
      
      // Insert into database
      let result = null;
      
      if (isEditing) {
        // Update existing invoice
        const { data, error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoiceToEdit.id)
          .select();
        
        if (error) throw error;
        result = data?.[0];
      } else {
        // Create new invoice
        const { data, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select();
        
        if (error) throw error;
        result = data?.[0];
      }
      
      // If result is null, assume we're in local-only mode
      const invoiceId = result?.id || `local-${Date.now()}`;
      
      // Process service items
      const serviceItemPromises = [];
      
      // Update all service items with this invoice ID
      for (const item of invoiceDetails.serviceItems) {
        if (item.id && !item.isManual) {
          // Skip updating existing service requests since there's no invoice column
          console.log(`Skipping update for service item ${item.id} - no invoice column available`);
        } 
        else if (item.isManual) {
          // For manually added items, insert a new service request without price or invoice references
          const serviceData = {
            guest_id: invoiceDetails.guestId,
            service_name: item.name,
            status: 'Completed',
            room: invoiceDetails.roomNumber, // Add the room field which is required
            requested_by: 'system', // Add the requested_by field which is required
            // Removed request_date: item.date since the column doesn't exist
            // Removed price: item.price since the column doesn't exist
          };
          
          const { error } = await supabase
            .from('service_requests')
            .insert(serviceData);
            
          if (error) throw error;
        }
      }
      
      // Wait for all service item operations to complete
      await Promise.all(serviceItemPromises);
      
      // Create the formatted invoice for the parent component
      const formattedInvoice = {
        id: invoiceId,
        guest: invoiceDetails.guestName,
        room: invoiceDetails.roomNumber,
        room_name: roomName || invoiceDetails.roomNumber, // Use the actual room name
        checkIn: invoiceDetails.checkIn,
        checkOut: invoiceDetails.checkOut,
        nights: invoiceDetails.nights,
        date: new Date().toISOString().split('T')[0],
        amount: invoiceDetails.totalAmount,
        roomRate: invoiceDetails.roomRate,
        roomTotal: invoiceDetails.roomTotal,
        serviceTotal: invoiceDetails.serviceTotal,
        status: invoiceDetails.paymentStatus,
        hasServiceItems: invoiceDetails.serviceItems.length > 0,
        serviceItems: invoiceDetails.serviceItems.map(item => ({
          name: item.name,
          date: item.date,
          price: parseFloat(item.price)
        }))
      };
      
      // Call the parent callback with the new/updated invoice
      onCreateInvoice(formattedInvoice);
      
      // Show success message
      toast.success(isEditing ? 'Invoice updated successfully!' : 'Invoice created successfully!');
      
      // Reset form and close modal
      resetInvoiceDetails();
      setSelectedGuest(null);
      setIsEditing(false);
      onClose();
      
    } catch (err) {
      console.error("Error creating invoice:", err);
      toast.error(`Error ${isEditing ? 'updating' : 'creating'} invoice: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Set up editing mode when an invoice is provided
  useEffect(() => {
    const setupEditMode = () => {
      if (invoiceToEdit) {
        setIsEditing(true);
        
        // Convert the invoice to our internal format
        const serviceItems = invoiceToEdit.serviceItems?.map(item => ({
          name: item.name,
          date: item.date,
          price: parseFloat(item.price),
          isManual: true // Treat all items as manual when editing
        })) || [];
        
        setInvoiceDetails({
          guestName: invoiceToEdit.guest,
          guestId: invoiceToEdit.guest_id,
          roomNumber: invoiceToEdit.room,
          roomRate: invoiceToEdit.roomRate || 0,
          checkIn: invoiceToEdit.checkIn,
          checkOut: invoiceToEdit.checkOut,
          nights: invoiceToEdit.nights || calculateNights(invoiceToEdit.checkIn, invoiceToEdit.checkOut),
          roomTotal: invoiceToEdit.roomTotal || 0,
          serviceTotal: invoiceToEdit.serviceTotal || 0,
          totalAmount: invoiceToEdit.amount || 0,
          paymentStatus: invoiceToEdit.status || 'Pending',
          serviceItems: serviceItems
        });
        
        // Create a guest object for selected guest
        setSelectedGuest({
          id: invoiceToEdit.guest_id,
          name: invoiceToEdit.guest,
          room: invoiceToEdit.room,
          check_in: invoiceToEdit.checkIn,
          check_out: invoiceToEdit.checkOut
        });
        
        // Set room name from room_name or fallback to room number
        setRoomName(invoiceToEdit.room_name || invoiceToEdit.room);
      } else {
        setIsEditing(false);
        resetInvoiceDetails();
        setSelectedGuest(null);
        setRoomName('');
      }
    };
    
    setupEditMode();
  }, [invoiceToEdit]);
  
  // Fetch guests when the modal opens
  useEffect(() => {
    if (isOpen && !isEditing) {
      fetchGuestsWithoutInvoices();
    }
  }, [isOpen, isEditing]);
  
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
              <div className="label">Room:</div>
              <div className="value">${roomName || invoiceDetails.roomNumber}</div>
            </div>
            <div className="row">
              <div className="label">Room Type:</div>
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
                <td>Room Charges</td>
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
  
  // Handle opening the service modal
  const addServiceItem = () => {
    // If no room number, show error
    if (!invoiceDetails.actualRoomNumber && !invoiceDetails.roomNumber) {
      toast.error('Please select a guest with a room assignment first');
      return;
    }
    console.log(`Opening service modal for room: ${invoiceDetails.actualRoomNumber} (${invoiceDetails.roomNumber})`);
    
    // Set current invoice service items in a global variable for ServiceSelectionModal to access
    window.currentInvoiceServiceItems = invoiceDetails.serviceItems;
    
    setShowServiceModal(true);
  };

  // Add this function to handle adding a service to the invoice
  const handleAddServiceItem = (service) => {
    // Make sure we have a valid service
    if (!service) return;
    
    // Check if this service is already added to avoid duplicates
    const isDuplicate = invoiceDetails.serviceItems.some(item => 
      item.id === service.id && item.isServiceRequest
    );
    
    if (isDuplicate) {
      toast.error('This service request has already been added to the invoice');
      return;
    }

    // Add default price if not provided
    const servicePrice = service.price || 0;
    
    const newServiceItem = {
      ...service,
      price: servicePrice
    };
    
    const newServiceItems = [...invoiceDetails.serviceItems, newServiceItem];
    const newServiceTotal = newServiceItems.reduce((total, item) => total + (parseFloat(item.price) || 0), 0);
    
    setInvoiceDetails(prev => ({
        ...prev,
      serviceItems: newServiceItems,
        serviceTotal: newServiceTotal,
        totalAmount: prev.roomTotal + newServiceTotal
    }));
    
    setShowServiceModal(false);
  };
  
  // Add this function to remove a service item from the invoice
  const removeServiceItem = (index) => {
    const newServiceItems = [...invoiceDetails.serviceItems];
    newServiceItems.splice(index, 1);
    const newServiceTotal = newServiceItems.reduce((total, item) => total + (parseFloat(item.price) || 0), 0);
    
    setInvoiceDetails(prev => ({
      ...prev,
      serviceItems: newServiceItems,
      serviceTotal: newServiceTotal,
      totalAmount: prev.roomTotal + newServiceTotal
    }));
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
  
  // Add this useEffect after other useEffects
  // Ensure invoices are loaded when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingInvoices(true);
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('id, guest_name, room_number')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error loading initial invoice data:', error);
        } else {
          console.log('Initial invoice data loaded:', data?.length || 0);
          setExistingInvoices(data || []);
        }
      } catch (err) {
        console.error('Unexpected error in initial data load:', err);
      } finally {
        setLoadingInvoices(false);
      }
    };
    
    loadInitialData();
  }, []);  // Empty dependency array means this runs once on mount
  
  // Add this function to edit service price
  const editServicePrice = (index) => {
    const item = invoiceDetails.serviceItems[index];
    const currentPrice = item.price || 0;
    
    const newPrice = prompt(`Edit price for ${item.name} (GH₵):`, currentPrice);
    
    if (newPrice !== null && !isNaN(parseFloat(newPrice)) && parseFloat(newPrice) >= 0) {
      const updatedItems = [...invoiceDetails.serviceItems];
      updatedItems[index] = {
        ...item,
        price: parseFloat(newPrice)
      };
      
      const newServiceTotal = updatedItems.reduce((total, item) => total + (parseFloat(item.price) || 0), 0);
      
      setInvoiceDetails(prev => ({
        ...prev,
        serviceItems: updatedItems,
        serviceTotal: newServiceTotal,
        totalAmount: prev.roomTotal + newServiceTotal
      }));
    }
  };
  
  if (!isOpen) return null;
  
  // Get status color based on payment status
  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return isDarkMode ? 'from-green-500 to-emerald-600' : 'from-green-400 to-emerald-500';
      case 'Pending':
        return isDarkMode ? 'from-amber-500 to-yellow-600' : 'from-amber-400 to-yellow-500';
      case 'Refunded':
        return isDarkMode ? 'from-blue-500 to-indigo-600' : 'from-blue-400 to-indigo-500';
      case 'Cancelled':
        return isDarkMode ? 'from-red-500 to-pink-600' : 'from-red-400 to-pink-500';
      default:
        return isDarkMode ? 'from-gray-500 to-gray-600' : 'from-gray-400 to-gray-500';
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${isDarkMode 
        ? 'bg-gray-800/90 text-white border-gray-700/50' 
        : 'bg-white/95 text-gray-800 border-gray-200/50'
      } rounded-xl w-full max-w-4xl border shadow-lg backdrop-blur-md relative overflow-hidden h-[90vh] flex flex-col`}>
        
        {/* Header gradient bar */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${getStatusColor(invoiceDetails.paymentStatus)}`}></div>
        
        <div className="flex justify-between items-center p-6 border-b border-gray-200/10">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">
            {invoiceToEdit ? 'Edit Invoice' : 'Create New Invoice'}
          </h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${isDarkMode 
              ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' 
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium">Select Guest</label>
            {isEditing ? (
              // In edit mode, just show the selected guest as text
              <div className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                {invoiceDetails.guestName} - Room {invoiceDetails.roomNumber}
              </div>
            ) : loadingInvoices ? (
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
                  const displayRoom = guest.room_name || guest.room_id || guest.room || '';
                  const matchingRoom = rooms?.find(r => {
                    const roomIdMatch = guest.room_id && r.id === guest.room_id;
                    const roomNumberMatch = displayRoom && (r.room_number?.toString() === displayRoom.toString());
                    return roomIdMatch || roomNumberMatch;
                  });
                  
                  // Get the base room price
                  let roomPrice = matchingRoom?.price || guest.room_price || guest.roomRate || 0;
                  
                  // Apply Aquarian room fallback if price is 0 or invalid
                  if (!roomPrice || roomPrice === 0) {
                    const guestBlock = (guest.block || guest.room_block || matchingRoom?.block || '').toLowerCase();
                    const displayRoomLower = String(displayRoom).toLowerCase();
                    const roomBlock = (matchingRoom?.block || '').toLowerCase();
                    
                    // Extract numeric room number for range check
                    const roomNumberStr = String(displayRoom).replace(/[^0-9]/g, '');
                    const roomNumberInt = parseInt(roomNumberStr, 10);
                    
                    // Aquarian rooms are typically 101-114 or 1-14
                    const isAquarianByNumber = (roomNumberInt >= 101 && roomNumberInt <= 114) || 
                                               (roomNumberInt >= 1 && roomNumberInt <= 14);
                    
                    // Check multiple indicators for Aquarian rooms
                    const isAquarianByKeyword = guestBlock.includes('aquarian') || 
                                                guestBlock.includes('aquarium') ||
                                                displayRoomLower.includes('aquarian') ||
                                                displayRoomLower.includes('aquarium') ||
                                                roomBlock.includes('aquarian') ||
                                                roomBlock.includes('aquarium') ||
                                                displayRoomLower.includes('aq');
                    
                    const isAquarian = isAquarianByNumber || isAquarianByKeyword;
                    
                    if (isAquarian) {
                      roomPrice = 500;
                    }
                  }
                  
                  const formattedPrice = roomPrice ? `₵${Number(roomPrice).toFixed(2)}` : '₵0.00';
                  const guestLabel = guest.guest_name || guest.name || 'Guest';
                  return (
                    <option key={index} value={guest.guest_id || guest.id}>
                      {guestLabel}
                      {displayRoom ? ` - Room ${displayRoom}` : ''}
                      {` (${formattedPrice})`}
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
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                            <div className="flex items-center justify-end">
                              <span className="font-medium mr-2">GH₵{item.price.toFixed(2)}</span>
                              <button 
                                onClick={() => editServicePrice(index)}
                                className="text-xs p-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 mr-2"
                                title="Edit Price"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                            </div>
                          </td>
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
        
        <div className="p-6 border-t border-gray-200/10 flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
              isDarkMode 
                ? 'bg-gray-700/60 hover:bg-gray-600 text-gray-300 border-gray-600' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
            }`}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleCreateInvoice}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 transform hover:scale-105 flex items-center"
            disabled={isSubmitting}
          >
            <FontAwesomeIcon icon={faSave} className="mr-2" />
            {isSubmitting ? 'Processing...' : invoiceToEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </div>
      
      {/* Replace AddServiceItemModal with ServiceSelectionModal */}
      <ServiceSelectionModal 
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        onAddService={handleAddServiceItem}
        isDarkMode={isDarkMode}
        roomNumber={invoiceDetails.actualRoomNumber || invoiceDetails.roomNumber}
        roomName={invoiceDetails.roomNumber}
        guestId={invoiceDetails.guestId}
        currentInvoiceItems={invoiceDetails.serviceItems}
      />
    </div>
  );
};

export default InvoiceModal;
