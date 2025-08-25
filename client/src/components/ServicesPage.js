import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faCheck, faTimes, faEye, faBellConcierge, faBell, faClipboardCheck, faList, faPlus, faSpa, faClipboard } from '@fortawesome/free-solid-svg-icons';
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
        setServices([]);
      } else {
        setServices(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching services:', err);
      setError('Failed to load services. Please try again later.');
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch service requests from Supabase
  const fetchServiceRequests = async () => {
    try {
      // Try fetching from Supabase first - don't try to join with guests using guest_id
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .order('requested_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching service requests from Supabase:', error);
        setServiceRequests([]);
      } else {
        setServiceRequests(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching service requests:', err);
      setServiceRequests([]);
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
      // First check if there are any service requests associated with this service
      const { data: associatedRequests, error: checkError } = await supabase
        .from('service_requests')
        .select('id')
        .eq('service_id', serviceId)
        .limit(1);
        
      if (checkError) throw checkError;
      
      if (associatedRequests && associatedRequests.length > 0) {
        alert('Cannot delete this service as it has associated service requests. Please delete or reassign the requests first.');
        return;
      }
      
      // If no associated requests, proceed with deletion
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);
        
      if (error) {
        if (error.code === '23503') { // Foreign key violation
          alert('Cannot delete this service as it is being referenced by other records.');
          return;
        }
        throw error;
      }
      
      // Update local state
      setServices(services.filter(service => service.id !== serviceId));
      
      console.log('Service deleted successfully');
      
    } catch (err) {
      console.error('Error deleting service:', err);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to delete service. ';
      if (err.message.includes('foreign key')) {
        errorMessage += 'This service is being used by other records and cannot be deleted.';
      } else {
        errorMessage += 'Please try again later.';
      }
      alert(errorMessage);
      
      setError('Failed to delete service. Please try again.');
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
      
      console.log('Service request status updated successfully');
      
    } catch (err) {
      console.error('Error updating service request:', err);
      
      setError('Failed to update service request status. Please try again.');
    }
  };

  // Handle deleting service request
  const handleDeleteServiceRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this service request?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('service_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setServiceRequests(serviceRequests.filter(req => req.id !== requestId));
      
      console.log('Service request deleted successfully');

    } catch (err) {
      console.error('Error deleting service request:', err);
      
      setError('Failed to delete service request. Please try again.');
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
  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case 'Pending':
        return isDarkMode 
          ? 'bg-amber-900/30 text-amber-400 border border-amber-700/30' 
          : 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'In Progress':
        return isDarkMode 
          ? 'bg-blue-900/30 text-blue-400 border border-blue-700/30' 
          : 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Completed':
        return isDarkMode 
          ? 'bg-green-900/30 text-green-400 border border-green-700/30' 
          : 'bg-green-100 text-green-800 border border-green-200';
      case 'Cancelled':
        return isDarkMode 
          ? 'bg-red-900/30 text-red-400 border border-red-700/30' 
          : 'bg-red-100 text-red-800 border border-red-200';
      default:
        return isDarkMode 
          ? 'bg-gray-900/30 text-gray-400 border border-gray-700/30' 
          : 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Stats counters for services
  const totalServices = services.length;
  const availableServices = services.filter(s => s.available).length;
  const activeRequests = serviceRequests.filter(r => r.status === 'Pending' || r.status === 'In Progress').length;

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Sidebar activeLink="Services" />
      <div className="flex-1 overflow-auto">
        <Navbar title="Hotel Services" />
        
        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl
              ${isDarkMode 
                ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-lg border border-gray-700/50 text-white' 
                : 'bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-lg border border-gray-200/50 text-gray-800'}`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Services</h3>
                  <div className={`rounded-full p-2 ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <FontAwesomeIcon icon={faList} />
                  </div>
                </div>
                <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600">
                  {totalServices}
                </p>
              </div>
            </div>
            
            <div className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl
              ${isDarkMode 
                ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-lg border border-gray-700/50 text-white' 
                : 'bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-lg border border-gray-200/50 text-gray-800'}`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600"></div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Available Services</h3>
                  <div className={`rounded-full p-2 ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'}`}>
                    <FontAwesomeIcon icon={faBellConcierge} />
                  </div>
                </div>
                <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
                  {availableServices}
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
                  <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Active Requests</h3>
                  <div className={`rounded-full p-2 ${isDarkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                    <FontAwesomeIcon icon={faBell} />
                  </div>
                </div>
                <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600">
                  {activeRequests}
                </p>
              </div>
            </div>
          </div>
          
          {/* Services Section */}
          <div className={`relative overflow-hidden rounded-xl shadow-lg 
            ${isDarkMode 
              ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-lg border border-gray-700/50 text-white' 
              : 'bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-lg border border-gray-200/50 text-gray-800'}`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r ${isDarkMode ? 'from-blue-400 to-indigo-500' : 'from-blue-600 to-indigo-700'}`}>
                  Services Management
                </h3>
                <button 
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 transform hover:scale-105 flex items-center"
                  onClick={handleAddService}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add New Service
                </button>
              </div>
              
              {error && (
                <div className={`rounded-lg p-4 mb-6 ${isDarkMode ? 'bg-red-900/30 border border-red-800/50 text-red-300' : 'bg-red-100 border border-red-200 text-red-700'}`}>
                  <p>{error}</p>
                </div>
              )}
              
              {isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="relative w-16 h-16">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500/20 rounded-full animate-pulse"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-12">
                  <FontAwesomeIcon icon={faBellConcierge} className={`text-5xl mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>No services available.</p>
                  <button 
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg transition-all duration-200"
                    onClick={handleAddService}
                  >
                    Create Your First Service
                  </button>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {services.map((service) => (
                  <div 
                    key={service.id} 
                    className={`relative overflow-hidden rounded-lg shadow-md transition-all duration-300 transform hover:scale-102 hover:shadow-lg border
                      ${service.available 
                        ? isDarkMode 
                          ? 'bg-gray-800/70 border-gray-700/50' 
                          : 'bg-white/90 border-gray-200/50'
                        : isDarkMode 
                          ? 'bg-gray-800/40 border-gray-700/30 opacity-75' 
                          : 'bg-white/70 border-gray-200/30 opacity-75'
                      }`}
                  >
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                      service.available 
                        ? 'from-green-400 to-emerald-500' 
                        : 'from-gray-400 to-gray-500'
                    }`}></div>
                    <div className="p-5">
                      <div className="flex justify-between items-start">
                        <h4 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {service.name}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${service.available 
                            ? isDarkMode ? 'bg-green-900/30 text-green-400 border border-green-700/30' : 'bg-green-100 text-green-800 border border-green-200'
                            : isDarkMode ? 'bg-gray-900/30 text-gray-400 border border-gray-700/30' : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}>
                          {service.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mt-2 text-sm line-clamp-2`}>
                        {service.description}
                      </p>
                      <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-200/10">
                        <span className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600`}>
                          GH₵{service.price}
                        </span>
                        <div className="flex space-x-2">
                          <button 
                            className={`rounded-full p-1.5 transition-all duration-200 transform hover:scale-110
                              ${isDarkMode ? 'bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
                            onClick={() => handleEditService(service)}
                            title="Edit Service"
                          >
                            <FontAwesomeIcon icon={faEdit} size="sm" />
                          </button>
                          <button 
                            className={`rounded-full p-1.5 transition-all duration-200 transform hover:scale-110
                              ${isDarkMode ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                            onClick={() => handleDeleteService(service.id)}
                            title="Delete Service"
                          >
                            <FontAwesomeIcon icon={faTrash} size="sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
          
          {/* Service Requests Section */}
          <div className={`relative overflow-hidden rounded-xl shadow-lg 
            ${isDarkMode 
              ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-lg border border-gray-700/50 text-white' 
              : 'bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-lg border border-gray-200/50 text-gray-800'}`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r ${isDarkMode ? 'from-blue-400 to-indigo-500' : 'from-blue-600 to-indigo-700'}`}>
                  Service Requests
                </h3>
                <button 
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 transform hover:scale-105 flex items-center"
                  onClick={handleAddServiceRequest}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add New Request
                </button>
              </div>
              
              {serviceRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FontAwesomeIcon icon={faClipboardCheck} className={`text-5xl mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>No service requests available.</p>
                  <button 
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg transition-all duration-200"
                    onClick={handleAddServiceRequest}
                  >
                    Create Your First Request
                  </button>
                </div>
              ) : (
              <div className="overflow-auto rounded-lg">
                <table className="min-w-full divide-y divide-gray-200/10">
                  <thead className={isDarkMode ? 'bg-gray-800/60' : 'bg-gray-100/80'}>
                    <tr>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Room</th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Service</th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Requested By</th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Time</th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Status</th>
                      <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={isDarkMode ? 'divide-y divide-gray-700/30' : 'divide-y divide-gray-200/30'}>
                    {serviceRequests.map(request => (
                      <tr key={request.id} className={`transition-colors duration-150 ${isDarkMode ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50/70'}`}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {request.room}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {request.service_name}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {request.requested_by}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                          {formatDateTime(request.requested_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm flex justify-end space-x-2">
                          {request.status === 'Pending' || request.status === 'In Progress' ? (
                            <>
                              <button 
                                className={`rounded-full p-1.5 transition-all duration-200 transform hover:scale-110
                                  ${isDarkMode ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                                onClick={() => handleUpdateRequestStatus(request.id, 'Completed')}
                                title="Mark as Completed"
                              >
                                <FontAwesomeIcon icon={faCheck} size="sm" />
                              </button>
                              <button 
                                className={`rounded-full p-1.5 transition-all duration-200 transform hover:scale-110
                                  ${isDarkMode ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                                onClick={() => handleUpdateRequestStatus(request.id, 'Cancelled')}
                                title="Cancel Request"
                              >
                                <FontAwesomeIcon icon={faTimes} size="sm" />
                              </button>
                            </>
                          ) : (
                            <button 
                              className={`rounded-full p-1.5 transition-all duration-200 transform hover:scale-110
                                ${isDarkMode ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                              onClick={() => handleEditServiceRequest(request)}
                              title="View Details"
                            >
                              <FontAwesomeIcon icon={faEye} size="sm" />
                            </button>
                          )}
                          <button 
                            className={`rounded-full p-1.5 transition-all duration-200 transform hover:scale-110
                              ${isDarkMode ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                            onClick={() => handleDeleteServiceRequest(request.id)}
                            title="Delete Request"
                          >
                            <FontAwesomeIcon icon={faTrash} size="sm" />
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
