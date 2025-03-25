import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useTheme } from '../context/ThemeContext';

const ReservationEditModal = ({ isOpen, onClose, reservation, onUpdateReservation }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [formData, setFormData] = useState({
    guestName: '',
    email: '',
    phoneNumber: '',
    roomType: '',
    roomNumber: '',
    checkInDate: new Date(),
    checkOutDate: new Date(),
    adults: 1,
    children: 0,
    specialRequests: '',
    paymentMethod: 'Credit Card',
    status: 'Confirmed'
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Populate form with reservation data when modal opens
  useEffect(() => {
    if (reservation) {
      setFormData({
        guestName: reservation.guestName || '',
        email: reservation.email || '',
        phoneNumber: reservation.phoneNumber || '',
        roomType: reservation.roomType || 'Standard',
        roomNumber: reservation.roomNumber || '',
        checkInDate: reservation.checkInDate ? new Date(reservation.checkInDate) : new Date(),
        checkOutDate: reservation.checkOutDate ? new Date(reservation.checkOutDate) : new Date(),
        adults: reservation.adults || 1,
        children: reservation.children || 0,
        specialRequests: reservation.specialRequests || '',
        paymentMethod: reservation.paymentMethod || 'Credit Card',
        status: reservation.status || 'Confirmed'
      });
    }
  }, [reservation, isOpen]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle date changes
  const handleDateChange = (name, date) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
    }));
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.guestName.trim()) newErrors.guestName = 'Guest name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!formData.roomNumber) newErrors.roomNumber = 'Room number is required';
    
    // Check if check-out date is after check-in date
    if (formData.checkOutDate <= formData.checkInDate) {
      newErrors.checkOutDate = 'Check-out date must be after check-in date';
    }
    
    return newErrors;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    setIsLoading(true);
    
    // Format dates as strings
    const checkInDateStr = formData.checkInDate instanceof Date 
      ? formData.checkInDate.toISOString().split('T')[0] 
      : formData.checkInDate;
    
    const checkOutDateStr = formData.checkOutDate instanceof Date 
      ? formData.checkOutDate.toISOString().split('T')[0] 
      : formData.checkOutDate;
    
    // Create updated reservation object
    const updatedReservation = {
      ...reservation, // Keep the original ID and any other fields
      guestName: formData.guestName,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      roomType: formData.roomType,
      roomNumber: formData.roomNumber,
      checkInDate: checkInDateStr,
      checkOutDate: checkOutDateStr,
      adults: parseInt(formData.adults),
      children: parseInt(formData.children),
      specialRequests: formData.specialRequests,
      paymentMethod: formData.paymentMethod,
      status: formData.status,
      updatedAt: new Date().toISOString()
    };
    
    // Call the update function provided by parent component
    onUpdateReservation(updatedReservation)
      .then(() => {
        setIsLoading(false);
        onClose();
      })
      .catch(error => {
        setIsLoading(false);
        setErrors({ submit: error.message || 'Failed to update reservation' });
      });
  };

  if (!isOpen || !reservation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`relative w-full max-w-4xl mx-auto rounded-lg shadow-xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-xl font-semibold">Edit Reservation</h2>
          <button 
            onClick={onClose}
            className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'} text-xl font-bold`}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
              <p>{errors.submit}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Guest Information */}
              <div>
                <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>Guest Information</h3>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Guest Name</label>
                  <input 
                    type="text" 
                    name="guestName"
                    value={formData.guestName}
                    onChange={handleChange}
                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} ${errors.guestName ? 'border-red-500' : ''}`}
                  />
                  {errors.guestName && <p className="mt-1 text-sm text-red-500">{errors.guestName}</p>}
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} ${errors.email ? 'border-red-500' : ''}`}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} ${errors.phoneNumber ? 'border-red-500' : ''}`}
                  />
                  {errors.phoneNumber && <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>}
                </div>
              </div>

              {/* Reservation Details */}
              <div>
                <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>Reservation Details</h3>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Room Type</label>
                  <select
                    name="roomType"
                    value={formData.roomType}
                    onChange={handleChange}
                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                  >
                    <option value="Standard">Standard</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Room Number</label>
                  <input 
                    type="text" 
                    name="roomNumber"
                    value={formData.roomNumber}
                    onChange={handleChange}
                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} ${errors.roomNumber ? 'border-red-500' : ''}`}
                  />
                  {errors.roomNumber && <p className="mt-1 text-sm text-red-500">{errors.roomNumber}</p>}
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Checked In">Checked In</option>
                    <option value="Checked Out">Checked Out</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Date Information */}
              <div>
                <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>Stay Information</h3>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Check-in Date</label>
                  <DatePicker
                    selected={formData.checkInDate}
                    onChange={date => handleDateChange('checkInDate', date)}
                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    dateFormat="MMMM d, yyyy"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Check-out Date</label>
                  <DatePicker
                    selected={formData.checkOutDate}
                    onChange={date => handleDateChange('checkOutDate', date)}
                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} ${errors.checkOutDate ? 'border-red-500' : ''}`}
                    dateFormat="MMMM d, yyyy"
                    minDate={new Date(formData.checkInDate.getTime() + 86400000)} // +1 day from check-in
                  />
                  {errors.checkOutDate && <p className="mt-1 text-sm text-red-500">{errors.checkOutDate}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Adults</label>
                    <input 
                      type="number" 
                      name="adults"
                      value={formData.adults}
                      onChange={handleChange}
                      min="1"
                      className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Children</label>
                    <input 
                      type="number" 
                      name="children"
                      value={formData.children}
                      onChange={handleChange}
                      min="0"
                      className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Payment and Extras */}
              <div>
                <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>Payment & Extras</h3>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                  >
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Mobile Money">Mobile Money</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Special Requests</label>
                  <textarea 
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleChange}
                    rows="4"
                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                    placeholder="Any special requests or notes"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white`}
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Reservation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReservationEditModal; 