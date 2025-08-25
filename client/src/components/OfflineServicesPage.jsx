import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faCheck, faTimes, faEye, faBellConcierge, faBell, faClipboardCheck, faList, faPlus, faSpa, faClipboard } from '@fortawesome/free-solid-svg-icons';
import OfflineSidebar from './OfflineSidebar';
import OfflineNavbar from './OfflineNavbar';
import { useTheme } from '../context/ThemeContext';

const OfflineServicesPage = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const [services, setServices] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('services');

  // Load data from localStorage on component mount
  useEffect(() => {
    setIsLoading(true);
    try {
      // Load services
      const savedServices = localStorage.getItem('offline_services');
      if (savedServices) {
        setServices(JSON.parse(savedServices));
      } else {
        // Initialize with sample services
        const sampleServices = [
          {
            id: 1,
            name: 'Room Service',
            description: '24/7 in-room dining service',
            category: 'Food & Beverage',
            price: 25.00,
            is_active: true,
            duration: 30,
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            name: 'Spa Treatment',
            description: 'Relaxing massage and wellness services',
            category: 'Wellness',
            price: 120.00,
            is_active: true,
            duration: 90,
            created_at: new Date().toISOString()
          },
          {
            id: 3,
            name: 'Laundry Service',
            description: 'Professional cleaning and pressing',
            category: 'Housekeeping',
            price: 15.00,
            is_active: true,
            duration: 240,
            created_at: new Date().toISOString()
          },
          {
            id: 4,
            name: 'Airport Transfer',
            description: 'Private transportation to/from airport',
            category: 'Transportation',
            price: 45.00,
            is_active: true,
            duration: 60,
            created_at: new Date().toISOString()
          }
        ];
        setServices(sampleServices);
        localStorage.setItem('offline_services', JSON.stringify(sampleServices));
      }

      // Load service requests
      const savedRequests = localStorage.getItem('offline_service_requests');
      if (savedRequests) {
        setServiceRequests(JSON.parse(savedRequests));
      } else {
        // Initialize with sample service requests
        const sampleRequests = [
          {
            id: 1,
            service_id: 1,
            service_name: 'Room Service',
            guest_name: 'John Doe',
            room_number: '101',
            status: 'Pending',
            requested_at: new Date().toISOString(),
            special_instructions: 'No onions please',
            total_cost: 25.00
          },
          {
            id: 2,
            service_id: 2,
            service_name: 'Spa Treatment',
            guest_name: 'Jane Smith',
            room_number: '205',
            status: 'In Progress',
            requested_at: new Date(Date.now() - 3600000).toISOString(),
            special_instructions: 'Deep tissue massage',
            total_cost: 120.00
          },
          {
            id: 3,
            service_id: 3,
            service_name: 'Laundry Service',
            guest_name: 'Mike Johnson',
            room_number: '307',
            status: 'Completed',
            requested_at: new Date(Date.now() - 86400000).toISOString(),
            completed_at: new Date(Date.now() - 3600000).toISOString(),
            special_instructions: 'Express service',
            total_cost: 15.00
          }
        ];
        setServiceRequests(sampleRequests);
        localStorage.setItem('offline_service_requests', JSON.stringify(sampleRequests));
      }
    } catch (err) {
      console.error('Error loading services data:', err);
      setError('Failed to load services data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (services.length > 0) {
      localStorage.setItem('offline_services', JSON.stringify(services));
    }
  }, [services]);

  useEffect(() => {
    if (serviceRequests.length > 0) {
      localStorage.setItem('offline_service_requests', JSON.stringify(serviceRequests));
    }
  }, [serviceRequests]);

  // Handle updating service request status
  const handleUpdateRequestStatus = async (requestId, newStatus) => {
    try {
      const updatedRequests = serviceRequests.map(request => 
        request.id === requestId 
          ? { 
              ...request, 
              status: newStatus,
              completed_at: newStatus === 'Completed' ? new Date().toISOString() : null
            }
          : request
      );
      
      setServiceRequests(updatedRequests);
      console.log('Service request status updated successfully');
      
    } catch (err) {
      console.error('Error updating service request status:', err);
      setError('Failed to update request status. Please try again.');
    }
  };

  // Handle deleting a service request
  const handleDeleteServiceRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this service request?')) {
      return;
    }
    
    try {
      const updatedRequests = serviceRequests.filter(request => request.id !== requestId);
      setServiceRequests(updatedRequests);
      
      console.log('Service request deleted successfully');
      
    } catch (err) {
      console.error('Error deleting service request:', err);
      setError('Failed to delete request. Please try again.');
    }
  };

  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get status badge classes
  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case 'Pending':
        return isDarkMode 
          ? 'bg-amber-900/30 text-amber-300 border-amber-700/50' 
          : 'bg-amber-100 text-amber-800 border-amber-200';
      case 'In Progress':
        return isDarkMode 
          ? 'bg-blue-900/30 text-blue-300 border-blue-700/50' 
          : 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed':
        return isDarkMode 
          ? 'bg-green-900/30 text-green-300 border-green-700/50' 
          : 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelled':
        return isDarkMode 
          ? 'bg-red-900/30 text-red-300 border-red-700/50' 
          : 'bg-red-100 text-red-800 border-red-200';
      default:
        return isDarkMode 
          ? 'bg-gray-800 text-gray-300 border-gray-700/50' 
          : 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <OfflineSidebar activeLink="Services" />
        <div className="flex-1 overflow-auto">
          <OfflineNavbar title="Hotel Services - Offline Mode" />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading services...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <OfflineSidebar activeLink="Services" />
      <div className="flex-1 overflow-auto">
        <OfflineNavbar title="Hotel Services - Offline Mode" />
        
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Hotel Services
            </h1>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-400 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                activeTab === 'services'
                  ? 'bg-blue-500 text-white shadow-md'
                  : isDarkMode
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
            >
              <FontAwesomeIcon icon={faBellConcierge} />
              <span>Services</span>
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                activeTab === 'requests'
                  ? 'bg-blue-500 text-white shadow-md'
                  : isDarkMode
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
            >
              <FontAwesomeIcon icon={faClipboardCheck} />
              <span>Service Requests</span>
            </button>
          </div>

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <div key={service.id} className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} hover:shadow-xl transition-shadow duration-300`}>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex-1`}>
                        {service.name}
                      </h3>
                    </div>
                    
                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 text-sm`}>
                      {service.description}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Category:</span>
                        <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>{service.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Price:</span>
                        <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                          GH₵{service.price?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Duration:</span>
                        <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>{service.duration} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Status:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          service.is_active 
                            ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                            : isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'
                        }`}>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State for Services */}
              {services.length === 0 && (
                <div className="text-center py-12">
                  <FontAwesomeIcon 
                    icon={faBellConcierge} 
                    className={`text-6xl ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-4`} 
                  />
                  <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                    No services found
                  </h3>
                  <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-4`}>
                    Sample hotel services are loaded in offline mode.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Service Requests Tab */}
          {activeTab === 'requests' && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {serviceRequests.map((request) => (
                  <div key={request.id} className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} hover:shadow-xl transition-shadow duration-300`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {request.service_name}
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Room {request.room_number} • {request.guest_name}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDeleteServiceRequest(request.id)}
                          className={`p-2 rounded ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700' : 'text-gray-500 hover:text-red-600 hover:bg-gray-100'} transition-colors`}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClasses(request.status)}`}>
                        {request.status}
                      </span>
                    </div>

                    {request.special_instructions && (
                      <div className="mb-4">
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                          Special Instructions:
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {request.special_instructions}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Requested:</span>
                        <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>
                          {formatDateTime(request.requested_at)}
                        </span>
                      </div>
                      {request.completed_at && (
                        <div className="flex justify-between">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Completed:</span>
                          <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>
                            {formatDateTime(request.completed_at)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Total Cost:</span>
                        <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                          GH₵{request.total_cost?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Status Update Buttons */}
                    {request.status !== 'Completed' && request.status !== 'Cancelled' && (
                      <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        {request.status === 'Pending' && (
                          <button
                            onClick={() => handleUpdateRequestStatus(request.id, 'In Progress')}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                          >
                            <FontAwesomeIcon icon={faCheck} />
                            <span>Start</span>
                          </button>
                        )}
                        {request.status === 'In Progress' && (
                          <button
                            onClick={() => handleUpdateRequestStatus(request.id, 'Completed')}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                          >
                            <FontAwesomeIcon icon={faCheck} />
                            <span>Complete</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateRequestStatus(request.id, 'Cancelled')}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Empty State for Service Requests */}
              {serviceRequests.length === 0 && (
                <div className="text-center py-12">
                  <FontAwesomeIcon 
                    icon={faClipboardCheck} 
                    className={`text-6xl ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-4`} 
                  />
                  <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                    No service requests found
                  </h3>
                  <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-4`}>
                    Service requests will appear here when guests make requests.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineServicesPage;
