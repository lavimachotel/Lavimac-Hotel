import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useUser } from '../context/UserContext';
import { getPendingAccessRequests, updateAccessRequestStatus } from '../api/accessRequestService';
import { createUserAccount } from '../services/userService';
import { toast } from 'react-hot-toast';
import supabase from '../supabaseClient';

const ManagerAccessControl = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  
  // State for managing tabs, requests, and form data
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
    permissions: []
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  // Available permissions for staff members
  const availablePermissions = [
    { id: 'view_guests', label: 'View Guests' },
    { id: 'edit_guests', label: 'Edit Guests' },
    { id: 'view_rooms', label: 'View Rooms' },
    { id: 'edit_rooms', label: 'Edit Rooms' },
    { id: 'view_reservations', label: 'View Reservations' },
    { id: 'edit_reservations', label: 'Edit Reservations' },
    { id: 'view_reports', label: 'View Reports' }
  ];

  // Check if user is authenticated and is manager or admin
  useEffect(() => {
    if (!user) {
      setError('You must be logged in to access this page');
      const timer = setTimeout(() => {
        navigate('/landing');
      }, 2000);
      return () => clearTimeout(timer);
    }
    
    if (user && user.role !== 'manager' && user.role !== 'admin') {
      setError('Access denied. Manager or admin privileges required.');
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  // Fetch access requests on component mount and when activeTab changes
  useEffect(() => {
    fetchAccessRequests();
  }, [activeTab]);

  const fetchAccessRequests = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      console.log('ManagerAccessControl: fetching access requests, active tab:', activeTab);
      
      // Filter requests based on active tab
      let statusFilter;
      switch (activeTab) {
        case 'pending':
          statusFilter = 'pending';
          break;
        case 'approved':
          statusFilter = 'approved';
          break;
        case 'rejected':
          statusFilter = 'rejected';
          break;
        default:
          statusFilter = 'pending';
      }

      console.log('ManagerAccessControl: status filter set to:', statusFilter);
      console.log('ManagerAccessControl: executing query...');
      
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .eq('status', statusFilter)
        .order('request_date', { ascending: false });

      console.log('ManagerAccessControl: query completed');
      console.log('ManagerAccessControl: data received:', data);
      console.log('ManagerAccessControl: error (if any):', error);

      if (error) {
        console.error('ManagerAccessControl: error fetching access requests:', error);
        throw error;
      }

      console.log(`ManagerAccessControl: Successfully fetched ${data?.length || 0} ${statusFilter} requests`);
      
      // Update the appropriate state based on tab
      if (statusFilter === 'pending') {
        console.log('ManagerAccessControl: Setting pending requests:', data);
        setPendingRequests(data || []);
      } else if (statusFilter === 'approved') {
        console.log('ManagerAccessControl: Setting approved requests:', data);
        setApprovedRequests(data || []);
      } else if (statusFilter === 'rejected') {
        console.log('ManagerAccessControl: Setting rejected requests:', data);
        setRejectedRequests(data || []);
      }
    } catch (err) {
      console.error('ManagerAccessControl: Error fetching access requests:', err);
      setError(err.message || 'Failed to fetch access requests');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle permission checkbox changes
  const handlePermissionChange = (permissionId) => {
    setFormData(prev => {
      const permissions = [...prev.permissions];
      if (permissions.includes(permissionId)) {
        return { ...prev, permissions: permissions.filter(id => id !== permissionId) };
      } else {
        return { ...prev, permissions: [...permissions, permissionId] };
      }
    });
  };

  // Handle selecting a request to process
  const handleSelectRequest = (request) => {
    setSelectedRequest(request);
    // Pre-fill form with request data
    setFormData({
      email: request.email,
      password: '',
      confirmPassword: '',
      role: 'staff',
      permissions: [],
      fullName: request.full_name,
      position: request.position,
      department: request.department,
      contactNumber: request.contact_number
    });
  };

  // Handle approving a request and creating user account
  const handleApprove = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Create user account
      const result = await createUserAccount({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName || selectedRequest.full_name,
        role: formData.role,
        permissions: formData.permissions,
        department: formData.department || selectedRequest.department,
        position: formData.position || selectedRequest.position,
        contactNumber: formData.contactNumber || selectedRequest.contact_number
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create user account');
      }
      
      // Update request status
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({ status: 'approved' })
        .eq('id', selectedRequest.id);
        
      if (updateError) throw updateError;
      
      setSuccess(`User account for ${formData.email} created and request approved!`);
      toast.success('Access request approved and account created');
      
      // Refresh requests
      fetchAccessRequests();
      
      // Reset form and selected request
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'staff',
        permissions: []
      });
      setSelectedRequest(null);
      
    } catch (err) {
      console.error('Error approving request:', err);
      setError(err.message || 'Failed to approve request. Please try again.');
      toast.error('Failed to approve request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle rejecting a request
  const handleReject = async (requestId) => {
    setIsSubmitting(true);
    setError('');
    
    try {
      // Update request status
      const { error } = await supabase
        .from('access_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
        
      if (error) throw error;
      
      toast.success('Access request rejected');
      
      // Refresh requests
      fetchAccessRequests();
      
      // Reset selected request
      setSelectedRequest(null);
      
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError(err.message || 'Failed to reject request. Please try again.');
      toast.error('Failed to reject request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate a random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prevData => ({
      ...prevData,
      password,
      confirmPassword: password
    }));
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format department name for display
  const formatDepartment = (dept) => {
    if (!dept) return 'Unknown';
    return dept.charAt(0).toUpperCase() + dept.slice(1).replace(/_/g, ' ');
  };

  // Validate form before submission
  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    return true;
  };

  // If there's an error and user needs to be redirected
  if (error && ((!user) || (user && user.role !== 'manager' && user.role !== 'admin'))) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 light:bg-gray-100">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 dark:text-white light:text-gray-900">Access Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="dark:text-gray-300 light:text-gray-700 mb-6">Redirecting you to the appropriate page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-gray-900 light:bg-gray-100">
      <div className="absolute top-4 left-4 z-10">
        <Link to="/dashboard" className="flex items-center gap-2 dark:text-white light:text-gray-900 hover:underline">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </Link>
      </div>
      
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle className="bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 light:bg-gray-200 light:hover:bg-gray-300" />
      </div>
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 dark:text-white light:text-gray-900">Staff Access Control</h1>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              <p>{success}</p>
            </div>
          )}
          
          <div className="flex mb-6 border-b dark:border-gray-700 light:border-gray-300">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-3 font-medium ${activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'dark:text-gray-400 light:text-gray-600'}`}
            >
              Pending Requests
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-3 font-medium ${activeTab === 'approved' ? 'text-blue-600 border-b-2 border-blue-600' : 'dark:text-gray-400 light:text-gray-600'}`}
            >
              Approved Requests
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-4 py-3 font-medium ${activeTab === 'rejected' ? 'text-blue-600 border-b-2 border-blue-600' : 'dark:text-gray-400 light:text-gray-600'}`}
            >
              Rejected Requests
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Request List */}
            <div className="p-6 rounded-xl shadow-lg border dark:bg-gray-800 dark:border-gray-700 light:bg-white light:border-gray-200">
              <h2 className="text-xl font-semibold mb-4 dark:text-white light:text-gray-900">
                {activeTab === 'pending' ? 'Pending Requests' : 
                 activeTab === 'approved' ? 'Approved Requests' : 'Rejected Requests'}
              </h2>
              
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="flex space-x-2 animate-pulse">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {(activeTab === 'pending' ? pendingRequests : 
                    activeTab === 'approved' ? approvedRequests : rejectedRequests).length === 0 ? (
                    <div className="text-center py-8 dark:text-gray-400 light:text-gray-500">
                      No {activeTab} requests found
                    </div>
                  ) : (
                    (activeTab === 'pending' ? pendingRequests : 
                     activeTab === 'approved' ? approvedRequests : rejectedRequests).map(request => (
                      <div 
                        key={request.id} 
                        className={`p-4 rounded-lg cursor-pointer transition-colors
                          ${selectedRequest && selectedRequest.id === request.id ? 
                            'dark:bg-blue-900/30 light:bg-blue-100' :
                            'dark:bg-gray-700 light:bg-gray-50 hover:dark:bg-gray-600 hover:light:bg-gray-100'
                          }`}
                        onClick={() => activeTab === 'pending' ? handleSelectRequest(request) : null}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium dark:text-white light:text-gray-900">{request.full_name}</h3>
                          <span className="text-xs px-2 py-1 rounded-full 
                            ${request.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 
                              request.status === 'approved' ? 'bg-green-200 text-green-800' : 
                              'bg-red-200 text-red-800'}">
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm dark:text-gray-300 light:text-gray-700 mb-1">{request.email}</p>
                        <div className="flex justify-between items-center mt-2 text-xs">
                          <span className="dark:text-gray-400 light:text-gray-500">
                            {formatDate(request.request_date)}
                          </span>
                          <span className="text-sm dark:text-gray-300 light:text-gray-700">{request.position}</span>
                          <span className="text-sm dark:text-gray-400 light:text-gray-500">{formatDepartment(request.department)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Create Account Form */}
            {activeTab === 'pending' && (
              <div className="p-6 rounded-xl shadow-lg border dark:bg-gray-800 dark:border-gray-700 light:bg-white light:border-gray-200">
                <h2 className="text-xl font-semibold mb-4 dark:text-white light:text-gray-900">Create User Account</h2>
                
                {!selectedRequest ? (
                  <div className="text-center py-16 dark:text-gray-400 light:text-gray-500">
                    Select a request from the list to process
                  </div>
                ) : (
                  <form onSubmit={handleApprove} className="space-y-6">
                    <div className="p-4 rounded-lg dark:bg-gray-700 light:bg-gray-50 mb-6">
                      <h3 className="font-medium dark:text-white light:text-gray-900 mb-2">{selectedRequest.full_name}</h3>
                      <p className="text-sm dark:text-gray-300 light:text-gray-700 mb-1">
                        <span className="font-medium">Position:</span> {selectedRequest.position}
                      </p>
                      <p className="text-sm dark:text-gray-300 light:text-gray-700 mb-1">
                        <span className="font-medium">Department:</span> {formatDepartment(selectedRequest.department)}
                      </p>
                      <p className="text-sm dark:text-gray-300 light:text-gray-700 mb-1">
                        <span className="font-medium">Email:</span> {selectedRequest.email}
                      </p>
                      <p className="text-sm dark:text-gray-300 light:text-gray-700 mb-1">
                        <span className="font-medium">Contact:</span> {selectedRequest.contact_number}
                      </p>
                      <p className="text-sm dark:text-gray-300 light:text-gray-700 mt-2">
                        <span className="font-medium">Reason:</span> {selectedRequest.reason}
                      </p>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                        Email (Username)
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
                        disabled={isSubmitting}
                      >
                        Generate Password
                      </button>
                    </div>

                    <div>
                      <label htmlFor="role" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                        Role
                      </label>
                      <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={isSubmitting}
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                        Permissions
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {availablePermissions.map(permission => (
                          <div key={permission.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`permission-${permission.id}`}
                              checked={formData.permissions.includes(permission.id)}
                              onChange={() => handlePermissionChange(permission.id)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                              disabled={isSubmitting}
                            />
                            <label htmlFor={`permission-${permission.id}`} className="ml-2 text-sm dark:text-gray-300 light:text-gray-700">
                              {permission.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => handleReject(selectedRequest.id)}
                        className={`px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Processing...' : 'Reject Request'}
                      </button>
                      <button
                        type="submit"
                        className={`px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Creating Account...' : 'Approve & Create Account'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
            
            {/* Show details for approved or rejected requests */}
            {(activeTab === 'approved' || activeTab === 'rejected') && selectedRequest && (
              <div className="p-6 rounded-xl shadow-lg border dark:bg-gray-800 dark:border-gray-700 light:bg-white light:border-gray-200">
                <h2 className="text-xl font-semibold mb-4 dark:text-white light:text-gray-900">Request Details</h2>
                <div className="p-4 rounded-lg dark:bg-gray-700 light:bg-gray-50">
                  <h3 className="font-medium dark:text-white light:text-gray-900 mb-2">{selectedRequest.full_name}</h3>
                  <p className="text-sm dark:text-gray-300 light:text-gray-700 mb-1">
                    <span className="font-medium">Position:</span> {selectedRequest.position}
                  </p>
                  <p className="text-sm dark:text-gray-300 light:text-gray-700 mb-1">
                    <span className="font-medium">Department:</span> {formatDepartment(selectedRequest.department)}
                  </p>
                  <p className="text-sm dark:text-gray-300 light:text-gray-700 mb-1">
                    <span className="font-medium">Email:</span> {selectedRequest.email}
                  </p>
                  <p className="text-sm dark:text-gray-300 light:text-gray-700 mb-1">
                    <span className="font-medium">Contact:</span> {selectedRequest.contact_number}
                  </p>
                  <p className="text-sm dark:text-gray-300 light:text-gray-700 mb-1">
                    <span className="font-medium">Status:</span> {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </p>
                  <p className="text-sm dark:text-gray-300 light:text-gray-700 mb-1">
                    <span className="font-medium">Request Date:</span> {formatDate(selectedRequest.request_date)}
                  </p>
                  <p className="text-sm dark:text-gray-300 light:text-gray-700 mt-2">
                    <span className="font-medium">Reason:</span> {selectedRequest.reason}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerAccessControl; 