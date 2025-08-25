import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useUser } from '../context/UserContext';
import { getPendingAccessRequests, updateAccessRequestStatus } from '../api/accessRequestService';
import { createUserAccount } from '../services/userService';
import { toast } from 'react-hot-toast';
import supabase from '../supabaseClient';
import GridBackground from './GridBackground';

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

  // Fetch access requests on component mount and when activeTab changes
  useEffect(() => {
    if (user && (user.role === 'manager' || user.role === 'admin')) {
      fetchAccessRequests();
    }
  }, [activeTab, user]);

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
      
      // Handle case where user already exists
      if (!result.success && (result.error === 'User already registered' || result.code === 'USER_ALREADY_EXISTS')) {
        // Just update the request status since user already exists
        const { error: updateError } = await supabase
          .from('access_requests')
          .update({ status: 'approved' })
          .eq('id', selectedRequest.id);
          
        if (updateError) throw updateError;
        
        setSuccess(`User with email ${formData.email} already exists. Access request approved!`);
        toast.success('Access request approved for existing user');
        
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
        setIsSubmitting(false);
        return;
      }
      
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
      
      // Handle case where error indicates user already exists
      if (err.message && err.message.includes('already registered')) {
        setError('User with this email already exists. Please use a different email or update the existing account.');
        toast.error('User already exists');
      } else {
        setError(`Error: ${err.message}`);
        toast.error(`Failed to approve request: ${err.message}`);
      }
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

  // Display error screen if user is not authenticated or not a manager/admin
  if (error && (!user || (user && user.role !== 'manager' && user.role !== 'admin'))) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="relative max-w-md w-full">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 rounded-2xl blur-xl"></div>
          <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Access Error</h1>
            <div className="text-red-300 mb-4">
              {error}
            </div>
            <p className="text-gray-300 mb-6">Redirecting you to the appropriate page...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-400 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B101E] text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 -left-20 w-72 h-72 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 -right-20 w-72 h-72 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-20 w-72 h-72 bg-pink-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        <div className="absolute -bottom-20 right-20 w-72 h-72 bg-indigo-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-6000"></div>
        <GridBackground />
      </div>
      
      {/* Main Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <Link to="/dashboard" className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
          <ThemeToggle className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-2 rounded-full transition-colors" />
      </div>
      
        {/* Header Section with Hexagonal Design */}
        <div className="relative mb-10">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl blur-xl"></div>
          <div className="relative px-8 py-10 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Hexagonal Grid Background */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                    <polygon points="24.8,22 37.3,29.2 37.3,43.7 24.8,50.9 12.4,43.7 12.4,29.2" fill="none" stroke="currentColor" strokeWidth="0.6"></polygon>
                    <polygon points="0,22 12.4,29.2 12.4,43.7 0,50.9 -12.4,43.7 -12.4,29.2" fill="none" stroke="currentColor" strokeWidth="0.6"></polygon>
                    <polygon points="24.8,-7.3 37.3,0 37.3,14.6 24.8,21.9 12.4,14.6 12.4,0" fill="none" stroke="currentColor" strokeWidth="0.6"></polygon>
                    <polygon points="0,-7.3 12.4,0 12.4,14.6 0,21.9 -12.4,14.6 -12.4,0" fill="none" stroke="currentColor" strokeWidth="0.6"></polygon>
                    <polygon points="12.4,-21.9 24.8,-14.6 24.8,0 12.4,7.3 0,0 0,-14.6" fill="none" stroke="currentColor" strokeWidth="0.6"></polygon>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#hexagons)"></rect>
              </svg>
            </div>
            
            <div className="relative">
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400">
                Staff Access Control
              </h1>
              <p className="mt-2 text-lg text-white/60">
                Review and manage staff access requests. Approve or reject requests and set appropriate permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area - Continued in next edit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Tabs and Request List */}
          <div className="lg:col-span-1">
            {/* Futuristic Tab Navigation */}
            <div className="relative mb-6">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/30 to-blue-600/30 rounded-xl blur-sm"></div>
              <div className="relative bg-black/20 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10">
                <div className="flex">
                  {['pending', 'approved', 'rejected'].map((tab) => (
            <button
                      key={tab}
                      className={`relative flex-1 py-3 px-2 font-medium transition-all duration-300 ${
                        activeTab === tab 
                          ? 'text-white' 
                          : 'text-white/50 hover:text-white/80'
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      <span className="relative z-10 capitalize">{tab}</span>
                      {activeTab === tab && (
                        <span className="absolute inset-0 z-0">
                          <span className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></span>
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-400"></span>
                        </span>
                      )}
            </button>
                  ))}
                </div>
              </div>
          </div>
          
            {/* Requests List */}
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl blur-sm"></div>
              <div className="relative bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-5 h-[calc(100vh-260px)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">
                {activeTab === 'pending' ? 'Pending Requests' : 
                 activeTab === 'approved' ? 'Approved Requests' : 'Rejected Requests'}
              </h2>
                  <div className="text-xs px-2.5 py-1.5 rounded-full bg-white/10 text-white/70">
                    {(activeTab === 'pending' ? pendingRequests : 
                      activeTab === 'approved' ? approvedRequests : rejectedRequests).length} request{(activeTab === 'pending' ? pendingRequests : 
                      activeTab === 'approved' ? approvedRequests : rejectedRequests).length !== 1 ? 's' : ''}
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-14 h-14 relative">
                      <div className="absolute top-0 left-0 right-0 bottom-0 opacity-40">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle className="stroke-cyan-400" cx="50" cy="50" r="40" strokeWidth="8" fill="none"/>
                        </svg>
                      </div>
                      <div className="absolute top-0 left-0 right-0 bottom-0 animate-spin">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle className="stroke-purple-400" cx="50" cy="50" r="40" strokeWidth="8" fill="none" strokeDasharray="60 175"/>
                        </svg>
                      </div>
                    </div>
                    <p className="mt-4 text-white/50 text-sm">Loading requests...</p>
                </div>
              ) : (
                  <div className="space-y-3 overflow-y-auto pr-2 styled-scrollbar h-[calc(100vh-320px)]">
                  {(activeTab === 'pending' ? pendingRequests : 
                    activeTab === 'approved' ? approvedRequests : rejectedRequests).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-white/50">
                        <svg className="w-12 h-12 mb-3 opacity-30" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 100-12 6 6 0 000 12zm0-9a1 1 0 011 1v3a1 1 0 01-2 0V8a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path>
                        </svg>
                        <p>No {activeTab} requests found</p>
                    </div>
                  ) : (
                    (activeTab === 'pending' ? pendingRequests : 
                     activeTab === 'approved' ? approvedRequests : rejectedRequests).map(request => (
                      <div 
                        key={request.id} 
                          className={`relative cursor-pointer group`}
                          onClick={() => handleSelectRequest(request)}
                        >
                          <div className={`absolute -inset-0.5 rounded-xl transition-all duration-300 ${
                            selectedRequest && selectedRequest.id === request.id 
                              ? 'opacity-100 bg-gradient-to-r from-cyan-400/40 to-purple-400/40 blur-sm' 
                              : 'opacity-0 group-hover:opacity-60 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 blur-sm'
                          }`}></div>

                          <div className={`relative p-4 rounded-xl transition-all duration-300 ${
                            selectedRequest && selectedRequest.id === request.id 
                              ? 'bg-white/10 border-white/20' 
                              : 'bg-white/5 border-white/10 group-hover:bg-white/7'
                          } backdrop-blur-sm border`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-medium text-white truncate">{request.full_name}</h3>
                                <p className="text-sm text-white/70 truncate">{request.email}</p>
                              </div>
                              <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                                request.status === 'pending' 
                                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30' 
                                  : request.status === 'approved' 
                                    ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30' 
                                    : 'bg-rose-400/10 text-rose-300 border border-rose-400/30'
                              }`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>
                            
                            <div className="mt-2 flex justify-between items-center text-xs">
                              <div className="flex items-center text-white/50">
                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            {formatDate(request.request_date)}
                              </div>
                              <span className="px-2 py-1 rounded bg-white/10 text-white/70">{request.position}</span>
                            </div>
                          </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              </div>
            </div>
            </div>

          {/* Right Column - Form or Details */}
          <div className="lg:col-span-2">
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl blur-sm"></div>
              <div className="relative bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6 min-h-[calc(100vh-260px)]">
                {error && (
                  <div className="mb-6 p-4 bg-rose-500/10 backdrop-blur-sm border border-rose-500/30 text-rose-300 rounded-xl">
                    <p>{error}</p>
                  </div>
                )}
                
                {success && (
                  <div className="mb-6 p-4 bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/30 text-emerald-300 rounded-xl">
                    <p>{success}</p>
                  </div>
                )}
                
                {activeTab === 'pending' ? (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-300">
                        {selectedRequest ? 'Create User Account' : 'Select a Request'}
                      </h2>
                      {selectedRequest && (
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handleReject(selectedRequest.id)}
                            className="px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-colors"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? 'Processing...' : 'Reject'}
                          </button>
                          <button
                            type="button"
                            onClick={handleApprove}
                            className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? 'Processing...' : 'Approve'}
                          </button>
                        </div>
                      )}
                    </div>

                    {!selectedRequest ? (
                      <div className="flex flex-col items-center justify-center py-12 text-white/50">
                        <svg className="w-16 h-16 mb-4 opacity-30" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd"></path>
                        </svg>
                        <p className="text-center text-lg">Select a request from the list<br/>to process</p>
                      </div>
                    ) : (
                      <form onSubmit={handleApprove} className="space-y-6">
                        <div className="p-5 rounded-xl bg-white/5 border border-white/10 mb-6">
                          <h3 className="font-medium text-white mb-3 pb-2 border-b border-white/10">{selectedRequest.full_name}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-white/50">Position:</span> 
                              <span className="ml-2 text-white">{selectedRequest.position}</span>
                            </div>
                            <div>
                              <span className="text-white/50">Department:</span> 
                              <span className="ml-2 text-white">{formatDepartment(selectedRequest.department)}</span>
                            </div>
                            <div>
                              <span className="text-white/50">Email:</span> 
                              <span className="ml-2 text-white">{selectedRequest.email}</span>
                            </div>
                            <div>
                              <span className="text-white/50">Contact:</span> 
                              <span className="ml-2 text-white">{selectedRequest.contact_number}</span>
                            </div>
                          </div>
                          <div className="mt-3 pt-2 border-t border-white/10">
                            <span className="text-white/50">Reason:</span> 
                            <p className="mt-1 text-white/90">{selectedRequest.reason}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                            <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
                        Email (Username)
                      </label>
                            <div className="relative">
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                                className="w-full px-4 py-3 pl-10 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                        required
                        disabled={isSubmitting}
                      />
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <svg className="w-5 h-5 text-white/30" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                                </svg>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="role" className="block text-sm font-medium text-white/70 mb-2">
                              Role
                            </label>
                            <div className="relative">
                              <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full px-4 py-3 pl-10 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none"
                                required
                                disabled={isSubmitting}
                              >
                                <option value="staff">Staff</option>
                                <option value="manager">Manager</option>
                              </select>
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <svg className="w-5 h-5 text-white/30" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                                </svg>
                              </div>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-5 h-5 text-white/30" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                                </svg>
                              </div>
                            </div>
                          </div>
                    </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                            <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                                className="w-full px-4 py-3 pl-10 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                            required
                            disabled={isSubmitting}
                          />
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <svg className="w-5 h-5 text-white/30" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                                </svg>
                              </div>
                        </div>
                      </div>

                      <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/70 mb-2">
                          Confirm Password
                        </label>
                            <div className="relative">
                        <input
                          type="password"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                                className="w-full px-4 py-3 pl-10 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                          required
                          disabled={isSubmitting}
                        />
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <svg className="w-5 h-5 text-white/30" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                                </svg>
                              </div>
                            </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={generatePassword}
                            className="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white/80 hover:bg-white/10 transition-colors flex items-center space-x-2"
                        disabled={isSubmitting}
                      >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                            </svg>
                            <span>Generate Password</span>
                      </button>
                    </div>

                    <div>
                          <label className="block text-sm font-medium text-white/70 mb-3">
                        Permissions
                      </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
                        {availablePermissions.map(permission => (
                          <div key={permission.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`permission-${permission.id}`}
                              checked={formData.permissions.includes(permission.id)}
                              onChange={() => handlePermissionChange(permission.id)}
                                  className="w-4 h-4 bg-white/5 border-white/20 rounded focus:ring-cyan-500 focus:ring-opacity-25 text-cyan-500"
                              disabled={isSubmitting}
                            />
                                <label htmlFor={`permission-${permission.id}`} className="ml-2 text-sm text-white/80">
                              {permission.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                      </form>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-300 mb-6">
                      {selectedRequest ? 'Request Details' : 'Select a Request'}
                    </h2>
                    
                    {!selectedRequest ? (
                      <div className="flex flex-col items-center justify-center py-12 text-white/50">
                        <svg className="w-16 h-16 mb-4 opacity-30" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path>
                        </svg>
                        <p className="text-center text-lg">Select a request from the list<br/>to view details</p>
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/10">
                          <h3 className="text-xl font-medium text-white">{selectedRequest.full_name}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            selectedRequest.status === 'approved' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-white/50 text-sm">Position</h4>
                              <p className="text-white mt-1">{selectedRequest.position}</p>
                            </div>
                            
                            <div>
                              <h4 className="text-white/50 text-sm">Department</h4>
                              <p className="text-white mt-1">{formatDepartment(selectedRequest.department)}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-white/50 text-sm">Email</h4>
                              <p className="text-white mt-1">{selectedRequest.email}</p>
                            </div>
                            
                            <div>
                              <h4 className="text-white/50 text-sm">Contact</h4>
                              <p className="text-white mt-1">{selectedRequest.contact_number}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <h4 className="text-white/50 text-sm">Request Date</h4>
                          <p className="text-white mt-1">{formatDate(selectedRequest.request_date)}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-white/50 text-sm">Reason for Access</h4>
                          <p className="text-white mt-2 p-4 bg-white/5 rounded-lg border border-white/10">{selectedRequest.reason}</p>
                        </div>
                    </div>
                    )}
                  </>
                )}
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerAccessControl; 