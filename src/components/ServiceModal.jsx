import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import supabase from '../supabaseClient';

const ServiceModal = ({ isOpen, onClose, service = null, onSave }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    available: true
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // If editing, populate form with service data
  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        price: service.price || '',
        description: service.description || '',
        available: service.available !== undefined ? service.available : true
      });
    } else {
      // Reset form for new service
      setFormData({
        name: '',
        price: '',
        description: '',
        available: true
      });
    }
  }, [service, isOpen]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handlePriceChange = (e) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setFormData(prev => ({
        ...prev,
        price: value
      }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Validate price
    if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      setError('Please enter a valid price');
      setIsLoading(false);
      return;
    }
    
    try {
      const serviceData = {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        available: formData.available
      };
      
      let result;
      
      if (service) {
        // Update existing service
        const { data, error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', service.id)
          .select();
          
        if (error) throw error;
        result = data[0];
      } else {
        // Create new service
        const { data, error } = await supabase
          .from('services')
          .insert(serviceData)
          .select();
          
        if (error) throw error;
        result = data[0];
      }
      
      // Add notification to dashboard
      const notificationsStr = localStorage.getItem('hotelNotifications');
      const notifications = notificationsStr ? JSON.parse(notificationsStr) : [];
      
      const newNotification = {
        type: 'info',
        title: service ? 'Service Updated' : 'New Service',
        message: `${service ? 'Updated' : 'Added'} service: ${formData.name}`,
        time: 'Just now',
        timestamp: new Date().toISOString()
      };
      
      notifications.unshift(newNotification);
      localStorage.setItem('hotelNotifications', JSON.stringify(notifications.slice(0, 10)));
      
      // Call onSave callback with the result
      if (onSave) onSave(result);
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Error saving service:', error);
      setError(error.message);
      
      // Save to localStorage as fallback
      const localService = {
        id: service ? service.id : Date.now(),
        ...formData,
        price: parseFloat(formData.price),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Get existing local services
      const localServicesStr = localStorage.getItem('hotelServices');
      const localServices = localServicesStr ? JSON.parse(localServicesStr) : [];
      
      if (service) {
        // Update existing service
        const updatedServices = localServices.map(s => 
          s.id === service.id ? localService : s
        );
        localStorage.setItem('hotelServices', JSON.stringify(updatedServices));
      } else {
        // Add new service
        localServices.push(localService);
        localStorage.setItem('hotelServices', JSON.stringify(localServices));
      }
      
      // Still call onSave with the local service
      if (onSave) onSave(localService);
      
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
          <h2 className="text-xl font-semibold">{service ? 'Edit Service' : 'Add New Service'}</h2>
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
            <label className="block mb-2 text-sm font-medium">Service Name</label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="Service name"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Price (GH₵)</label>
            <input 
              type="text" 
              name="price"
              value={formData.price}
              onChange={handlePriceChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="0.00"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Description</label>
            <textarea 
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="Service description"
              rows="3"
            />
          </div>
          
          <div className="mb-6">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                name="available"
                checked={formData.available}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Available for booking</span>
            </label>
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
              ) : service ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceModal; 