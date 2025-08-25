import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useTheme } from '../context/ThemeContext';
import { datePickerConfig } from '../utils/dateUtils';
import '../styles/FuturisticDatepicker.css';

const ReservationEditModal = ({ isOpen, onClose, reservation, onUpdate, rooms }) => {
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
  const [currentStep, setCurrentStep] = useState(1);

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

  // Handle next step
  const goToNextStep = () => {
    // Only validate the current step's fields
    let formErrors = {};
    
    if (currentStep === 1) {
      // Validate guest info fields
      if (!formData.guestName.trim()) formErrors.guestName = 'Guest name is required';
      if (!formData.email.trim()) formErrors.email = 'Email is required';
      else if (!/^\S+@\S+\.\S+$/.test(formData.email)) formErrors.email = 'Email is invalid';
      if (!formData.phoneNumber.trim()) formErrors.phoneNumber = 'Phone number is required';
    } else if (currentStep === 2) {
      // Validate room and dates fields
      if (!formData.roomNumber) formErrors.roomNumber = 'Please select a room';
      
      // Check if check-out date is after check-in date
      if (formData.checkInDate && formData.checkOutDate) {
        const checkIn = new Date(formData.checkInDate);
        const checkOut = new Date(formData.checkOutDate);
        
        if (checkOut <= checkIn) {
          formErrors.checkOutDate = 'Check-out date must be after check-in date';
        }
      }
    }
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    // Move to the next step
    setCurrentStep(currentStep + 1);
    setErrors({});
  };
  
  // Handle previous step
  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
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
    onUpdate(updatedReservation)
      .then(() => {
        setIsLoading(false);
        onClose();
      })
      .catch(error => {
        setIsLoading(false);
        setErrors({ submit: error.message || 'Failed to update reservation' });
      });
  };

  // Custom styles for modal
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
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(5px)',
      zIndex: 1000
    }
  };

  // Function to render step indicators
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
          <div className="step-title">Details</div>
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

  // Render the guest info step
  const renderGuestInfoStep = () => {
    return (
      <div className="step-content">
        <h3 className="step-heading">
          <i className="fas fa-user-edit"></i>
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

  // Render the reservation details step
  const renderDetailsStep = () => {
    return (
      <div className="step-content">
        <h3 className="step-heading">
          <i className="fas fa-hotel"></i>
          Reservation Details
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
                {rooms && rooms.map(room => (
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
                
          <div className="form-group">
            <label className="form-label">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
              className="form-select"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Checked In">Checked In</option>
                    <option value="Checked Out">Checked Out</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

          <div className="form-group">
            <label className="form-label">Payment Method</label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
              className="form-select"
                  >
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Mobile Money">Mobile Money</option>
                  </select>
                </div>
                
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Special Requests</label>
                  <textarea 
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleChange}
              className="form-input"
              rows="3"
              placeholder="Any special requirements or requests"
            ></textarea>
          </div>
        </div>
      </div>
    );
  };

  // Render confirmation step
  const renderConfirmationStep = () => {
    // Find selected room details
    const selectedRoom = rooms.find(room => room.id.toString() === formData.roomNumber.toString()) || {};
    
    // Calculate number of nights
    const nights = Math.ceil(
      (new Date(formData.checkOutDate) - new Date(formData.checkInDate)) / (1000 * 60 * 60 * 24)
    );
    
    return (
      <div className="step-content">
        <h3 className="step-heading">
          <i className="fas fa-check-circle"></i>
          Confirm Reservation Details
        </h3>
        
        <div className="confirmation-container">
          <div className="confirmation-section">
            <h4 className="confirmation-heading">Guest Information</h4>
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
              <div className="info-row">
                <div className="info-label"><i className="fas fa-tag"></i> Status:</div>
                <div className="info-value">{formData.status}</div>
              </div>
              <div className="info-row">
                <div className="info-label"><i className="fas fa-credit-card"></i> Payment:</div>
                <div className="info-value">{formData.paymentMethod}</div>
              </div>
            </div>
                </div>
          
          {formData.specialRequests && (
            <div className="confirmation-section">
              <h4 className="confirmation-heading">Special Requests</h4>
              <div className="confirmation-info">
                <p className="special-requests-text">{formData.specialRequests}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Function to render the current step
  const renderCurrentStep = () => {
    switch(currentStep) {
      case 1:
        return renderGuestInfoStep();
      case 2:
        return renderDetailsStep();
      case 3:
        return renderConfirmationStep();
      default:
        return null;
    }
  };

  if (!isOpen || !reservation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div className={`futuristic-modal ${isDarkMode ? 'dark-mode' : 'light-mode'}`} style={{ maxWidth: '750px' }}>
        <div className="modal-glow"></div>
        
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <div className="title-icon"><i className="fas fa-edit"></i></div>
            <h2>Edit Reservation</h2>
          </div>
          <button
            onClick={onClose}
            className="close-button"
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {renderStepIndicator()}
          
          <div className="modal-body">
            {errors.submit && (
              <div className="general-error">
                <i className="fas fa-exclamation-triangle"></i>
                {errors.submit}
              </div>
            )}
            
            {renderCurrentStep()}
          </div>
          
          <div className="modal-footer">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={goToPreviousStep}
                className="back-button"
              >
                <i className="fas fa-arrow-left"></i>
                Back
              </button>
            )}
            
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="next-button"
              >
                Next
                <i className="fas fa-arrow-right"></i>
              </button>
            ) : (
              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Update Reservation
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

export default ReservationEditModal; 