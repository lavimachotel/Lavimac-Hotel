import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { useTheme } from '../context/ThemeContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useRoomReservation } from '../context/RoomReservationContext';
import { datePickerConfig } from '../utils/dateUtils';
import '../styles/FuturisticDatepicker.css';

const NewReservationModal = ({ isOpen, onRequestClose, onAddReservation }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { createReservation, rooms, refreshData } = useRoomReservation();
  
  useEffect(() => {
    Modal.setAppElement('body');
  }, []);

  // Initial form state
  const [formData, setFormData] = useState({
    guestName: '',
    email: '',
    phoneNumber: '',
    roomType: 'Standard',
    roomNumber: '',
    checkInDate: new Date(),
    checkOutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
    adults: 1,
    children: 0,
    specialRequests: '',
    paymentMethod: 'Credit Card'
  });

  // Error state
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!formData.roomNumber.trim()) newErrors.roomNumber = 'Room number is required';
    if (!formData.checkInDate) newErrors.checkInDate = 'Check-in date is required';
    if (!formData.checkOutDate) newErrors.checkOutDate = 'Check-out date is required';
    
    // Check if check-out date is after check-in date
    if (formData.checkInDate && formData.checkOutDate && 
        formData.checkOutDate <= formData.checkInDate) {
      newErrors.checkOutDate = 'Check-out date must be after check-in date';
    }
    
    return newErrors;
  };

  // Next step validation
  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      // Guest information validation
      if (!formData.guestName.trim()) newErrors.guestName = 'Guest name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Email is invalid';
      if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    } else if (step === 2) {
      if (!formData.roomNumber) newErrors.roomNumber = 'Room number is required';
      if (!formData.checkInDate) newErrors.checkInDate = 'Check-in date is required';
      if (!formData.checkOutDate) newErrors.checkOutDate = 'Check-out date is required';
      
      // Check if check-out date is after check-in date
      if (formData.checkInDate && formData.checkOutDate && 
          formData.checkOutDate <= formData.checkInDate) {
        newErrors.checkOutDate = 'Check-out date must be after check-in date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // Handle form submission - only called when the Create Reservation button is clicked
  const handleSubmit = async () => {
    // Validate form
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    // Format dates as strings
    const checkInDateStr = formData.checkInDate instanceof Date 
      ? formData.checkInDate.toISOString().split('T')[0] 
      : formData.checkInDate;
    
    const checkOutDateStr = formData.checkOutDate instanceof Date 
      ? formData.checkOutDate.toISOString().split('T')[0] 
      : formData.checkOutDate;
    
    // Create reservation object
    const reservationData = {
      guestName: formData.guestName,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      roomType: formData.roomType,
      roomNumber: formData.roomNumber,
      checkInDate: checkInDateStr,
      checkOutDate: checkOutDateStr,
      adults: formData.adults,
      children: formData.children,
      specialRequests: formData.specialRequests,
      paymentMethod: formData.paymentMethod
    };
    
    try {
      // Create the reservation in the context
      const result = await createReservation(parseInt(formData.roomNumber), reservationData);
      
      if (result.success) {
        // Call onAddReservation with the new reservation
        onAddReservation(result.data);
        
        // Refresh the reservations data to update the list
        refreshData();
        
        // Reset form and close modal
        handleModalClose();
      } else {
        setErrors({ general: result.error || 'Failed to create reservation' });
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      setErrors({ general: error.message || 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom styles for react-modal
  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: '750px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'visible',
      padding: 0,
      border: 'none',
      borderRadius: '16px',
      backgroundColor: 'transparent'
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000
    }
  };

  // When modal is closed, reset form
  const handleModalClose = () => {
    setFormData({
      guestName: '',
      email: '',
      phoneNumber: '',
      roomType: 'Standard',
      roomNumber: '',
      checkInDate: new Date(),
      checkOutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      adults: 1,
      children: 0,
      specialRequests: '',
      paymentMethod: 'Credit Card'
    });
    setErrors({});
    setCurrentStep(1);
    onRequestClose();
  };

  const renderStepIndicator = () => {
    return (
      <div className="step-indicator">
        <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-title">Guest Info</div>
        </div>
        <div className="step-connector">
          <div className={`connector-line ${currentStep >= 2 ? 'active' : ''}`}></div>
        </div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-title">Room & Dates</div>
        </div>
        <div className="step-connector">
          <div className={`connector-line ${currentStep >= 3 ? 'active' : ''}`}></div>
        </div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-title">Confirm</div>
        </div>
      </div>
    );
  };

  const renderGuestInfoStep = () => {
    return (
    <div className="step-content">
      <h3 className="step-heading">
          <i className="fas fa-user-plus"></i>
        Guest Information
      </h3>
      
      <div className="form-grid">
        <div className="form-group">
            <label className="form-label">
              Guest Name <span className="required">*</span>
            </label>
          <div className="input-wrapper">
              <span className="input-icon">
                <i className="fas fa-user"></i>
              </span>
            <input
              type="text"
              name="guestName"
              value={formData.guestName}
              onChange={handleChange}
                className={`form-input ${errors.guestName ? 'border-red-500' : ''}`}
                placeholder="Full name"
            />
            </div>
            {errors.guestName && <p className="text-red-500 text-xs mt-1">{errors.guestName}</p>}
        </div>
        
        <div className="form-group">
            <label className="form-label">
              Email <span className="required">*</span>
            </label>
          <div className="input-wrapper">
              <span className="input-icon">
                <i className="fas fa-envelope"></i>
              </span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
                className={`form-input ${errors.email ? 'border-red-500' : ''}`}
                placeholder="Email address"
            />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>
        
        <div className="form-group">
            <label className="form-label">
              Phone Number <span className="required">*</span>
            </label>
          <div className="input-wrapper">
              <span className="input-icon">
                <i className="fas fa-phone"></i>
              </span>
            <input
                type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
                className={`form-input ${errors.phoneNumber ? 'border-red-500' : ''}`}
                placeholder="Phone number"
            />
            </div>
            {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
        </div>
        
        <div className="form-group guests-group">
          <label className="form-label">Guests</label>
          <div className="guests-container">
            <div className="guest-select">
              <div className="guest-label">
                  <i className="fas fa-user"></i> Adults
              </div>
              <select
                name="adults"
                value={formData.adults}
                onChange={handleChange}
              >
                  {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <div className="guest-select">
              <div className="guest-label">
                  <i className="fas fa-child"></i> Children
              </div>
              <select
                name="children"
                value={formData.children}
                onChange={handleChange}
              >
                {[0, 1, 2, 3, 4].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  };

  const renderRoomSelectionStep = () => {
    return (
    <div className="step-content">
      <h3 className="step-heading">
          <i className="fas fa-hotel"></i>
        Room & Dates
      </h3>
      
      <div className="form-grid">
        <div className="form-group">
            <label className="form-label">
              Room Type <span className="required">*</span>
            </label>
            <select
              name="roomType"
              value={formData.roomType}
              onChange={handleChange}
              className="form-select"
            >
              <option value="Standard">Standard</option>
              <option value="Deluxe">Deluxe</option>
              <option value="Suite">Suite</option>
              <option value="Executive">Executive</option>
            </select>
        </div>
        
        <div className="form-group">
            <label className="form-label">
              Room <span className="required">*</span>
            </label>
          <div className="input-wrapper">
              <span className="input-icon">
                <i className="fas fa-door-open"></i>
              </span>
            <select
              name="roomNumber"
              value={formData.roomNumber}
              onChange={handleChange}
                className={`form-select ${errors.roomNumber ? 'border-red-500' : ''}`}
            >
              <option value="">Select a room</option>
              {rooms
                .filter(room => room.status === 'Available')
                .sort((a, b) => a.id - b.id)
                .map(room => (
                  <option key={room.id} value={room.id}>
                      {room.name || room.room_number} - {room.type}
                  </option>
                ))}
            </select>
          </div>
            {errors.roomNumber && <p className="text-red-500 text-xs mt-1">{errors.roomNumber}</p>}
        </div>
        
        <div className="form-group datepicker-group">
            <label className="form-label">
              Check-In Date <span className="required">*</span>
            </label>
            <div className="datepicker-wrapper">
            <div className="datepicker-icon-wrapper">
              <i className="fas fa-calendar-check"></i>
            </div>
            <DatePicker
              selected={formData.checkInDate}
              onChange={(date) => handleDateChange('checkInDate', date)}
              className="futuristic-datepicker"
                calendarClassName={isDarkMode ? "futuristic-calendar" : "light-calendar"}
              {...datePickerConfig}
            />
            </div>
        </div>
        
        <div className="form-group datepicker-group">
            <label className="form-label">
              Check-Out Date <span className="required">*</span>
            </label>
            <div className="datepicker-wrapper">
            <div className="datepicker-icon-wrapper checkout-icon">
                <i className="fas fa-calendar-alt"></i>
            </div>
            <DatePicker
              selected={formData.checkOutDate}
              onChange={(date) => handleDateChange('checkOutDate', date)}
              className="futuristic-datepicker"
                calendarClassName={isDarkMode ? "futuristic-calendar" : "light-calendar"}
              {...datePickerConfig}
              />
            </div>
            {errors.checkOutDate && (
              <p className="text-red-500 text-xs mt-1">{errors.checkOutDate}</p>
            )}
        </div>
      </div>
    </div>
  );
  };

  const renderConfirmationStep = () => {
    // Find selected room details
    const selectedRoom = rooms.find(room => room.id === parseInt(formData.roomNumber)) || {};
    
    // Calculate number of nights
    const nights = Math.ceil((formData.checkOutDate - formData.checkInDate) / (1000 * 60 * 60 * 24));
    
    // Calculate total price
    const roomPrice = selectedRoom.price || 0;
    const totalPrice = roomPrice * nights;
    
    return (
      <div className="step-content confirmation-step">
        <h3 className="step-heading">
          <i className="fas fa-clipboard-check"></i>
          Confirm Reservation
        </h3>
        
        <div className="confirmation-grid">
          <div className="confirmation-section">
            <h4 className="confirmation-heading">Guest Details</h4>
            <div className="confirmation-info">
              <div className="info-row">
                <div className="info-label"><i className="fas fa-user"></i> Name:</div>
                <div className="info-value">{formData.guestName}</div>
              </div>
              <div className="info-row">
                <div className="info-label"><i className="fas fa-envelope"></i> Email:</div>
                <div className="info-value">{formData.email}</div>
              </div>
              <div className="info-row">
                <div className="info-label"><i className="fas fa-phone"></i> Phone:</div>
                <div className="info-value">{formData.phoneNumber}</div>
              </div>
              <div className="info-row">
                <div className="info-label"><i className="fas fa-users"></i> Guests:</div>
                <div className="info-value">{formData.adults} Adults, {formData.children} Children</div>
              </div>
            </div>
          </div>
          
          <div className="confirmation-section">
            <h4 className="confirmation-heading">Reservation Details</h4>
            <div className="confirmation-info">
              <div className="info-row">
                <div className="info-label"><i className="fas fa-bed"></i> Room:</div>
                <div className="info-value">{selectedRoom.name || `Room ${selectedRoom.room_number}`} ({selectedRoom.type})</div>
              </div>
              <div className="info-row">
                <div className="info-label"><i className="fas fa-calendar-alt"></i> Check-in:</div>
                <div className="info-value">{formData.checkInDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
              </div>
              <div className="info-row">
                <div className="info-label"><i className="fas fa-calendar-alt"></i> Check-out:</div>
                <div className="info-value">{formData.checkOutDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
              </div>
              <div className="info-row">
                <div className="info-label"><i className="fas fa-moon"></i> Nights:</div>
                <div className="info-value">{nights}</div>
              </div>
            </div>
          </div>
          
          <div className="confirmation-section special-requests">
            <h4 className="confirmation-heading">Special Requests</h4>
            <div className="confirmation-info">
              <textarea
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleChange}
                rows="2"
                className="special-requests-input"
                placeholder="Any special requirements or notes"
              ></textarea>
            </div>
          </div>
          
          <div className="confirmation-section payment-section">
            <h4 className="confirmation-heading">Payment Method</h4>
            <div className="payment-methods">
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="payment-select"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
              </select>
            </div>
            
            <div className="price-summary">
              <div className="pricing-row">
                <div className="pricing-label">Room Rate:</div>
                <div className="pricing-value">GH₵{roomPrice.toFixed(2)} × {nights} nights</div>
              </div>
              <div className="pricing-row total-row">
                <div className="pricing-label">Total:</div>
                <div className="pricing-value total-price">GH₵{totalPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Confirmation Button */}
        <div className="confirm-button-container mt-6 flex justify-center">
          <button
            type="button"
            className="confirm-button bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-3 rounded-lg text-white font-semibold hover:from-green-600 hover:to-emerald-700 shadow-lg flex items-center justify-center space-x-2 transition-all"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="loading-spinner mr-2"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <i className="fas fa-check-circle mr-2"></i>
                <span>Confirm Reservation</span>
              </>
            )}
          </button>
        </div>
        
        {errors.general && (
          <div className="general-error mt-4">
            <i className="fas fa-exclamation-circle"></i>
            {errors.general}
          </div>
        )}
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch(currentStep) {
      case 1:
        return renderGuestInfoStep();
      case 2:
        return renderRoomSelectionStep();
      case 3:
        return renderConfirmationStep();
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleModalClose}
      style={customStyles}
      contentLabel="New Reservation"
    >
      <div className={`futuristic-modal ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
        <div className="modal-glow"></div>
        
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <div className="title-icon"><i className="fas fa-calendar-plus"></i></div>
            <h2>New Reservation</h2>
          </div>
          <button
            onClick={handleModalClose}
            className="close-button"
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Form */}
        <div>
          {renderStepIndicator()}
          
          <div className="modal-body">
            {renderCurrentStep()}
          </div>
          
          <div className="modal-footer">
            {currentStep > 1 && (
              <button
                type="button"
                className="back-button"
                onClick={goToPreviousStep}
                disabled={isSubmitting}
              >
                <i className="fas fa-chevron-left"></i>
                Back
              </button>
            )}
            
            {currentStep < 3 && (
              <button
                type="button"
                className="next-button"
                onClick={goToNextStep}
              >
                Next
                <i className="fas fa-chevron-right"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default NewReservationModal;
