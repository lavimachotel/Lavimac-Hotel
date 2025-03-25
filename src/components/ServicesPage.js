import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faCheck, faTimes, faEye } from '@fortawesome/free-solid-svg-icons';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useTheme } from '../context/ThemeContext';
import ServiceModal from './ServiceModal';
import ServiceRequestModal from './ServiceRequestModal';
import supabase from '../supabaseClient';

const ServicesPage = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const [services, setServices] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [currentServiceRequest, setCurrentServiceRequest] = useState(null);

  // Function to fetch services from Supabase
  const fetchServices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try fetching from Supabase first
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
        
      if (error) {
        console.error('Error fetching services from Supabase:', error);
        
        // Fallback to localStorage
        const localServicesStr = localStorage.getItem('hotelServices');
        if (localServicesStr) {
          setServices(JSON.parse(localServicesStr));
        }
      } else {
        setServices(data || []);
        // Also save to localStorage as backup
        localStorage.setItem('hotelServices', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Unexpected error fetching services:', err);
      setError('Failed to load services. Please try again later.');
      
      // Fallback to localStorage
      const localServicesStr = localStorage.getItem('hotelServices');
      if (localServicesStr) {
        setServices(JSON.parse(localServicesStr));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch service requests from Supabase
  const fetchServiceRequests = async () => {
    try {
      // Try fetching from Supabase first
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .order('requested_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching service requests from Supabase:', error);
        
        // Fallback to localStorage
        const localRequestsStr = localStorage.getItem('hotelServiceRequests');
        if (localRequestsStr) {
          setServiceRequests(JSON.parse(localRequestsStr));
        }
      } else {
        setServiceRequests(data || []);
        // Also save to localStorage as backup
        localStorage.setItem('hotelServiceRequests', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Unexpected error fetching service requests:', err);
      
      // Fallback to localStorage
      const localRequestsStr = localStorage.getItem('hotelServiceRequests');
      if (localRequestsStr) {
        setServiceRequests(JSON.parse(localRequestsStr));
      }
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchServices();
    fetchServiceRequests();
    
    // Set up real-time subscriptions
    const servicesSubscription = supabase
      .channel('services_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        (payload) => {
          console.log('Real-time service update received:', payload);
          fetchServices();
        }
      )
      .subscribe();
      
    const requestsSubscription = supabase
      .channel('service_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests' },
        (payload) => {
          console.log('Real-time service request update received:', payload);
          fetchServiceRequests();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(servicesSubscription);
      supabase.removeChannel(requestsSubscription);
    };
  }, []);

  // Handle opening modal for new service
  const handleAddService = () => {
    setCurrentService(null);
    setIsServiceModalOpen(true);
  };

  // Handle opening modal for editing service
  const handleEditService = (service) => {
    setCurrentService(service);
    setIsServiceModalOpen(true);
  };

  // Handle opening modal for new service request
  const handleAddServiceRequest = () => {
    setCurrentServiceRequest(null);
    setIsRequestModalOpen(true);
  };

  // Handle opening modal for editing service request
  const handleEditServiceRequest = (request) => {
    setCurrentServiceRequest(request);
    setIsRequestModalOpen(true);
  };

  // Handle deleting a service
  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setServices(services.filter(service => service.id !== serviceId));
      
      // Update localStorage
      const localServicesStr = localStorage.getItem('hotelServices');
      if (localServicesStr) {
        const localServices = JSON.parse(localServicesStr);
        localStorage.setItem('hotelServices', JSON.stringify(localServices.filter(service => service.id !== serviceId)));
      }
      
      // Add notification
      const notificationsStr = localStorage.getItem('hotelNotifications');
      const notifications = notificationsStr ? JSON.parse(notificationsStr) : [];
      
      notifications.unshift({
        type: 'info',
        title: 'Service Deleted',
        message: `Service has been removed from the system`,
        time: 'Just now',
        timestamp: new Date().toISOString()
      });
      
      localStorage.setItem('hotelNotifications', JSON.stringify(notifications.slice(0, 10)));
      
    } catch (err) {
      console.error('Error deleting service:', err);
      
      // Try deleting from localStorage as fallback
      const localServicesStr = localStorage.getItem('hotelServices');
      if (localServicesStr) {
        const localServices = JSON.parse(localServicesStr);
        const updatedServices = localServices.filter(service => service.id !== serviceId);
        localStorage.setItem('hotelServices', JSON.stringify(updatedServices));
        setServices(updatedServices);
      }
    }
  };

  // Handle updating service request status
  const handleUpdateRequestStatus = async (requestId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        completed_at: newStatus === 'Completed' ? new Date().toISOString() : null
      };
      
      const { data, error } = await supabase
        .from('service_requests')
        .update(updateData)
        .eq('id', requestId)
        .select();
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setServiceRequests(serviceRequests.map(req => 
        req.id === requestId ? { ...req, ...updateData } : req
      ));
      
      // Update localStorage
      const localRequestsStr = localStorage.getItem('hotelServiceRequests');
      if (localRequestsStr) {
        const localRequests = JSON.parse(localRequestsStr);
        const updatedRequests = localRequests.map(req => 
          req.id === requestId ? { ...req, ...updateData } : req
        );
        localStorage.setItem('hotelServiceRequests', JSON.stringify(updatedRequests));
      }
      
      // Add notification
      const notificationsStr = localStorage.getItem('hotelNotifications');
      const notifications = notificationsStr ? JSON.parse(notificationsStr) : [];
      
      const request = serviceRequests.find(req => req.id === requestId);
      
      notifications.unshift({
        type: newStatus === 'Completed' ? 'success' : newStatus === 'Cancelled' ? 'error' : 'info',
        title: `Service Request ${newStatus}`,
        message: `Request for ${request?.service_name} in Room ${request?.room} has been ${newStatus.toLowerCase()}`,
        time: 'Just now',
        timestamp: new Date().toISOString()
      });
      
      localStorage.setItem('hotelNotifications', JSON.stringify(notifications.slice(0, 10)));
      
    } catch (err) {
      console.error('Error updating service request:', err);
      
      // Try updating in localStorage as fallback
      const localRequestsStr = localStorage.getItem('hotelServiceRequests');
      if (localRequestsStr) {
        const localRequests = JSON.parse(localRequestsStr);
        const updatedRequests = localRequests.map(req => {
          if (req.id === requestId) {
            return { 
              ...req, 
              status: newStatus,
              completed_at: newStatus === 'Completed' ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            };
          }
          return req;
        });
        
        localStorage.setItem('hotelServiceRequests', JSON.stringify(updatedRequests));
        setServiceRequests(updatedRequests);
      }
    }
  };

  // Format date string for display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return isDarkMode ? 'bg-yellow-100 text-yellow-800' : 'bg-yellow-200 text-yellow-800';
      case 'In Progress':
        return isDarkMode ? 'bg-blue-100 text-blue-800' : 'bg-blue-200 text-blue-800';
      case 'Completed':
        return isDarkMode ? 'bg-green-100 text-green-800' : 'bg-green-200 text-green-800';
      case 'Cancelled':
        return isDarkMode ? 'bg-red-100 text-red-800' : 'bg-red-200 text-red-800';
      default:
        return isDarkMode ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-800';
    }
  };

    return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-gray-800'}`}>
      <Sidebar activeLink="Services" />
      <div className="flex-1 overflow-auto">
        <Navbar title="Hotel Services" />
        
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 mb-6">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} p-6 rounded-lg shadow-sm`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Services Management</h3>
                <button 
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  onClick={handleAddService}
                >
                  Add New Service
                </button>
              </div>
              
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  <p>{error}</p>
                </div>
              )}
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No services available. Create a new service to get started.</p>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {services.map((service) => (
                  <div key={service.id} className={`p-6 rounded-lg ${
                    service.available 
                      ? isDarkMode ? 'bg-gray-700' : 'bg-gray-200' 
                      : isDarkMode ? 'bg-gray-700 opacity-60' : 'bg-gray-200 opacity-60'
                  }`}>
                    <div className="flex justify-between items-start">
                      <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{service.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded ${service.available ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                        {service.available ? 'Available' : 'Unavailable'}
                      </span>
                            </div>
                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mt-2`}>{service.description}</p>
                    <div className="flex justify-between items-center mt-4">
                      <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>GH₵{service.price}</span>
                      <div>
                          <button 
                            className="text-blue-400 hover:text-blue-300 mr-3"
                            onClick={() => handleEditService(service)}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button 
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDeleteService(service.id)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                    </div>
                                </div>
                ))}
                                </div>
              )}
              
              <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} p-6 rounded-lg`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Service Requests</h3>
                  <button 
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    onClick={handleAddServiceRequest}
                  >
                    Add New Request
                  </button>
                </div>
                
                {serviceRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No service requests available.</p>
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Room</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Service</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Requested By</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Time</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Status</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`${isDarkMode ? 'bg-gray-700 divide-y divide-gray-600' : 'bg-white divide-y divide-gray-200'}`}>
                        {serviceRequests.map(request => (
                          <tr key={request.id}>
                            <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {request.room}
                        </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {request.service_name}
                        </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {request.requested_by}
                        </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {formatDateTime(request.requested_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs ${getStatusColor(request.status)} rounded`}>
                                {request.status}
                              </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {request.status === 'Pending' || request.status === 'In Progress' ? (
                                <>
                                  <button 
                                    className="text-green-400 hover:text-green-300 mr-3"
                                    onClick={() => handleUpdateRequestStatus(request.id, 'Completed')}
                                  >
                                    <FontAwesomeIcon icon={faCheck} className="mr-1" />
                                    Complete
                                  </button>
                                  <button 
                                    className="text-red-400 hover:text-red-300 mr-3"
                                    onClick={() => handleUpdateRequestStatus(request.id, 'Cancelled')}
                                  >
                                    <FontAwesomeIcon icon={faTimes} className="mr-1" />
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button 
                                  className="text-blue-400 hover:text-blue-300"
                                  onClick={() => handleEditServiceRequest(request)}
                                >
                                  <FontAwesomeIcon icon={faEye} className="mr-1" />
                                  View Details
                                </button>
                              )}
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
                    </div>
            </div>
      
      {/* Service Modal */}
      <ServiceModal 
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        service={currentService}
        onSave={fetchServices}
      />
      
      {/* Service Request Modal */}
      <ServiceRequestModal 
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        serviceRequest={currentServiceRequest}
        onSave={fetchServiceRequests}
      />
        </div>
    );
};

export default ServicesPage;
