import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import UserProfileModal from './UserProfileModal';
import { getPendingAccessRequests, updateAccessRequestStatus } from '../api/accessRequestService';
import { createUserAccount, getAllUsers } from '../services/userService';
import { useUser } from '../context/UserContext';
import { usePermission } from '../hooks/usePermission';
import supabase from '../supabaseClient';
// Import debug script
import '../debug_requests'; // Debug access requests
import '../create_test_request'; // Create test request

const AdminAccessControl = ({ children, requiredRole = 'admin' }) => {
  const { user } = useUser();
  const navigate = useNavigate();
  
  // State for requests, permissions, and form data
  const [pendingRequests, setPendingRequests] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'staff',
    department: '',
    position: '',
    contactNumber: '',
    permissions: []
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Available roles
  const availableRoles = [
    { id: 'staff', label: 'Staff' },
    { id: 'manager', label: 'Manager' },
    { id: 'admin', label: 'Administrator' }
  ];

  // Extract fetchData function with useCallback to handle dependencies properly
  const fetchData = useCallback(async () => {
    if (!user) return; // Don't fetch if not authenticated
    
    setIsLoading(true);
    setError(null);

    try {
      // CONSOLE LOG: Start of fetch operation
      console.log('Starting to fetch pending access requests...');

      // Direct Supabase query for debugging
      console.log('Attempting direct Supabase query for access_requests');
      const { data: directData, error: directError } = await supabase
        .from('access_requests')
        .select('*')
        .eq('status', 'pending');
        
      if (directError) {
        console.error('Direct Supabase query error:', directError);
      } else {
        console.log('Direct Supabase query result:', directData);
        // If we got data directly but the service function fails, use this data
        if (directData && directData.length > 0) {
          setPendingRequests(directData);
        }
      }

      // Try the service approach
      // Fetch pending requests with simplified error handling
      const requestsResult = await getPendingAccessRequests();
      console.log('getPendingAccessRequests result:', requestsResult);
      
      if (requestsResult.success) {
        console.log('Setting pending requests:', requestsResult.data);
        setPendingRequests(requestsResult.data || []);
      } else {
        console.error('Failed to fetch pending requests:', requestsResult.error);
        setError(requestsResult.error || 'Failed to fetch pending requests');
        
        // If there's an error, redirect to dashboard
        if (requestsResult.isAuthError) {
          const timer = setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
          return () => clearTimeout(timer);
        }
      }

      // Fetch all users
      const usersResult = await getAllUsers();
      console.log('getAllUsers result:', usersResult);
      
      if (usersResult.success) {
        console.log('Setting users:', usersResult.data);
        setUsers(usersResult.data || []);
      } else {
        console.error('Failed to fetch users:', usersResult.error);
        setError(usersResult.error || 'Failed to fetch users');
        
        // If there's an error, redirect to dashboard
        if (usersResult.isAuthError) {
          const timer = setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
          return () => clearTimeout(timer);
        }
      }
    } catch (err) {
      console.error('Unexpected error in fetchData:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [user, navigate]); // Include dependencies that fetchData uses from component scope

  useEffect(() => {
    setAvailablePermissions([
      { id: 'view_guests', label: 'View Guests' },
      { id: 'edit_guests', label: 'Edit Guests' },
      { id: 'delete_guests', label: 'Delete Guests' },
      { id: 'view_rooms', label: 'View Rooms' },
      { id: 'edit_rooms', label: 'Edit Rooms' },
      { id: 'view_reservations', label: 'View Reservations' },
      { id: 'edit_reservations', label: 'Edit Reservations' },
      { id: 'view_reports', label: 'View Reports' },
      { id: 'manage_users', label: 'Manage Users' }
    ]);
  }, []);

  // Check if user is authenticated and is admin
  useEffect(() => {
    if (!user) {
      setError('Please use the demo user to access this page.');
      // Redirect to dashboard after a short delay
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
    
    if (user && user.role !== 'admin') {
      setError('Access denied. Admin privileges required.');
      // Redirect to dashboard after a short delay
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  // Update useEffect to call fetchData properly
  useEffect(() => {
    fetchData();
  }, [fetchData]); // Only depend on fetchData which already has the correct dependencies

  // Fetch existing users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const result = await getAllUsers();
      if (result.success) {
        setUsers(result.data || []);
      } else {
        setError(result.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please try again.');
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
    // Pre-fill username with email
    setFormData({
      email: request.email,
      password: '',
      confirmPassword: '',
      role: 'staff',
      permissions: [],
      // Add these fields for user profile creation
      fullName: request.full_name,
      position: request.position,
      department: request.department,
      contactNumber: request.contact_number
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Use the service to create a user
      const result = await createUserAccount({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
        permissions: formData.permissions,
        department: formData.department,
        position: formData.position,
        contactNumber: formData.contactNumber
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user account');
      }
      
      // Update the access request status
      if (selectedRequest) {
        const { error: updateError } = await supabase
          .from('access_requests')
          .update({ status: 'approved' })
          .eq('id', selectedRequest.id);
          
        if (updateError) {
          console.error('Error updating access request status:', updateError);
          // Continue anyway since the account was created
        } else {
          console.log('Access request status updated to approved');
        }
      }
      
      setSuccess(`User account for ${formData.email} created successfully!`);
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'staff',
        department: '',
        position: '',
        contactNumber: '',
        permissions: []
      });
      
      // Reset selected request
      setSelectedRequest(null);
      
      // Refresh pending requests and users list
      fetchUsers();
      fetchData();
      
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error.message || 'Failed to create user account. Please try again.');
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

  // Format department name for display
  const formatDepartment = (dept) => {
    switch(dept) {
      case 'front_desk': return 'Front Desk';
      case 'housekeeping': return 'Housekeeping';
      case 'food_beverage': return 'Food & Beverage';
      case 'maintenance': return 'Maintenance';
      case 'management': return 'Management';
      case 'accounting': return 'Accounting';
      case 'hr': return 'Human Resources';
      default: return 'Other';
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Validate form
  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.fullName || !formData.role) {
      setError('Please fill in all required fields');
      return false;
    }
    
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

  // If user is not admin, show access denied
  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> You don't have permission to access this page.</span>
        </div>
      </div>
    );
  }

  const handleUserClick = () => {
    setIsModalOpen(true);
  };

  return (
    <div>
      <nav className="bg-white dark:bg-gray-800 shadow-md px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-xl font-bold dark:text-white light:text-gray-900">Hotel Management</h1>
        </div>
        <div 
          onClick={handleUserClick} 
          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium dark:text-white light:text-gray-900">{user?.fullName || 'User'}</span>
            <span className="text-xs dark:text-gray-400 light:text-gray-500">{user?.role || 'Staff'}</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 dark:text-gray-400 light:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </nav>
      <UserProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
      />
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative dark:bg-gray-900 light:bg-gray-100">
        <div className="absolute bottom-4 left-4 z-10">
          <ThemeToggle className="bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 light:bg-gray-200 light:hover:bg-gray-300" />
        </div>
        
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold dark:text-white light:text-gray-900">Access Control</h1>
              <p className="mt-2 text-lg dark:text-gray-300 light:text-gray-700">
                Manage access requests and create user accounts
              </p>
            </div>
            <Link to="/dashboard" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Back to Dashboard
            </Link>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6" role="alert">
              <strong className="font-bold">Success!</strong>
              <span className="block sm:inline"> {success}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-lg dark:text-gray-300 light:text-gray-700">Loading...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pending Requests List */}
              <div className="p-6 rounded-xl shadow-lg border dark:bg-gray-800 dark:border-gray-700 light:bg-white light:border-gray-200">
                <h2 className="text-xl font-semibold mb-4 dark:text-white light:text-gray-900">Pending Access Requests</h2>
                
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8 dark:text-gray-400 light:text-gray-500">
                    No pending requests
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map(request => (
                      <div 
                        key={request.id} 
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedRequest?.id === request.id 
                            ? 'dark:bg-blue-900/30 dark:border-blue-500 light:bg-blue-50 light:border-blue-300' 
                            : 'dark:bg-gray-700 dark:border-gray-600 light:bg-gray-50 light:border-gray-200 hover:dark:bg-gray-600 hover:light:bg-gray-100'
                        }`}
                        onClick={() => handleSelectRequest(request)}
                      >
                        <div className="flex justify-between">
                          <h3 className="font-medium dark:text-white light:text-gray-900">{request.full_name}</h3>
                          <span className="text-sm dark:text-gray-400 light:text-gray-500">{formatDate(request.request_date)}</span>
                        </div>
                        <p className="text-sm dark:text-blue-400 light:text-blue-600">{request.email}</p>
                        <div className="mt-2 flex justify-between">
                          <span className="text-sm dark:text-gray-300 light:text-gray-700">{request.position}</span>
                          <span className="text-sm dark:text-gray-400 light:text-gray-500">{formatDepartment(request.department)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create Account Form */}
              <div className="p-6 rounded-xl shadow-lg border dark:bg-gray-800 dark:border-gray-700 light:bg-white light:border-gray-200">
                <h2 className="text-xl font-semibold mb-4 dark:text-white light:text-gray-900">Create User Account</h2>
                
                {!selectedRequest ? (
                  <div className="text-center py-16 dark:text-gray-400 light:text-gray-500">
                    Select a request from the list to create an account
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
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
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg dark:bg-black/50 dark:border-white/10 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
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
                            className="w-full px-4 py-3 rounded-lg dark:bg-black/50 dark:border-white/10 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
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
                          className="w-full px-4 py-3 rounded-lg dark:bg-black/50 dark:border-white/10 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
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
                        className="w-full px-4 py-3 rounded-lg dark:bg-black/50 dark:border-white/10 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                        required
                        disabled={isSubmitting}
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrator</option>
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

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        className={`px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-gray-900 light:focus:ring-offset-white transition-all duration-300 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Creating Account...' : 'Create Account'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAccessControl; 