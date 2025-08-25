import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import supabase from '../supabaseClient';

const ServiceRequestModal = ({ isOpen, onClose, serviceRequest = null, onSave }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    room: '',
    serviceId: '',
    serviceName: '',
    requestedBy: '',
    status: 'Pending',
    notes: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load available services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Try to fetch from Supabase first
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('name');
          
        if (error) {
          console.error('Error loading services from Supabase:', error);
          setServices([]);
        } else if (data) {
          setServices(data);
        }
      } catch (err) {
        console.error('Unexpected error loading services:', err);
        setServices([]);
      }
    };
    
    if (isOpen) {
      fetchServices();
    }
  }, [isOpen]);
  
  // If editing, populate form with service request data
  useEffect(() => {
    if (serviceRequest) {
      setFormData({
        room: serviceRequest.room || '',
        serviceId: serviceRequest.service_id || '',
        serviceName: serviceRequest.service_name || '',
        requestedBy: serviceRequest.requested_by || '',
        status: serviceRequest.status || 'Pending',
        notes: serviceRequest.notes || ''
      });
    } else {
      // Reset form for new service request
      setFormData({
        room: '',
        serviceId: '',
        serviceName: '',
        requestedBy: '',
        status: 'Pending',
        notes: ''
      });
    }
  }, [serviceRequest, isOpen]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If selecting a service, also update serviceName
    if (name === 'serviceId' && value) {
      const selectedService = services.find(s => s.id.toString() === value);
      if (selectedService) {
        setFormData(prev => ({
          ...prev,
          serviceId: value,
          serviceName: selectedService.name
        }));
      }
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!formData.room || !formData.serviceName || !formData.requestedBy) {
        setError('Please fill all required fields');
        setIsLoading(false);
        return;
      }
      
      const requestData = {
        room: formData.room,
        service_id: formData.serviceId ? parseInt(formData.serviceId) : null,
        service_name: formData.serviceName,
        requested_by: formData.requestedBy,
        status: formData.status,
        notes: formData.notes,
        requested_at: new Date().toISOString(),
        completed_at: formData.status === 'Completed' ? new Date().toISOString() : null
      };
      
      let result;
      
      if (serviceRequest) {
        // Update existing service request
        const { data, error } = await supabase
          .from('service_requests')
          .update(requestData)
          .eq('id', serviceRequest.id)
          .select();
          
        if (error) throw error;
        result = data[0];
      } else {
        // Create new service request
        const { data, error } = await supabase
          .from('service_requests')
          .insert(requestData)
          .select();
          
        if (error) throw error;
        result = data[0];
      }
      
      // Log success
      console.log(serviceRequest ? 'Service request updated successfully' : 'Service request created successfully');
      
      // Call onSave callback with the result
      if (onSave) onSave(result);
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Error saving service request:', error);
      setError(error.message);
      
      // Handle error gracefully
      console.error('Failed to save service request to database');
      
      // Close modal even if save failed
      if (onSave) onSave(null);
      
      // Close modal
      onClose();
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg p-6 w-full max-w-md`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{serviceRequest ? 'Edit Service Request' : 'New Service Request'}</h2>
          <button 
            onClick={onClose}
            className={`${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Room</label>
            <input 
              type="text" 
              name="room"
              value={formData.room}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="Room number"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Service</label>
            <select 
              name="serviceId"
              value={formData.serviceId}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            >
              <option value="">Select a service...</option>
              {services.filter(s => s.available).map(service => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
            
            {!formData.serviceId && (
              <div className="mt-2">
                <label className="block mb-2 text-sm font-medium">Custom Service</label>
                <input 
                  type="text" 
                  name="serviceName"
                  value={formData.serviceName}
                  onChange={handleChange}
                  className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                  placeholder="Enter service name"
                  required={!formData.serviceId}
                />
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Requested By</label>
            <input 
              type="text" 
              name="requestedBy"
              value={formData.requestedBy}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="Guest name"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Status</label>
            <select 
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              required
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium">Notes</label>
            <textarea 
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="Additional notes"
              rows="3"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
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
              className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : serviceRequest ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceRequestModal; 