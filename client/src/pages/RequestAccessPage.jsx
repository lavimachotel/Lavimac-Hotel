import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { toast } from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';

const RequestAccessPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    position: '',
    department: '',
    contact_number: '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Available departments
  const departments = [
    'Front Desk',
    'Housekeeping',
    'Food & Beverage',
    'Management'
  ];

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit the access request
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.full_name || !formData.email || !formData.department || !formData.contact_number || !formData.reason) {
        throw new Error('Please fill in all required fields');
      }

      // Create the access request
      const { data, error } = await supabase
        .from('access_requests')
        .insert([
          {
            full_name: formData.full_name,
            email: formData.email,
            position: formData.position,
            department: formData.department,
            contact_number: formData.contact_number,
            reason: formData.reason,
            status: 'pending',
            request_date: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Add notification for managers
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([
          {
            type: 'access_request',
            title: 'New Access Request',
            message: `${formData.full_name} from ${formData.department} has requested access to the system`,
            priority: 'high',
            created_at: new Date().toISOString()
          }
        ]);

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      // Clear form and show success message
      setFormData({
        full_name: '',
        email: '',
        position: '',
        department: '',
        contact_number: '',
        reason: ''
      });
      
      setSuccess('Your access request has been submitted successfully. A manager will review your request shortly.');
      toast.success('Access request submitted successfully');

      // Redirect to landing page after 3 seconds
      setTimeout(() => {
        navigate('/landing');
      }, 3000);

    } catch (error) {
      console.error('Error during registration:', error);
      setError(error.message || 'Failed to submit access request. Please try again.');
      toast.error('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900 light:bg-gray-100 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-radial from-indigo-500/5 to-transparent dark:from-indigo-500/10"></div>
      <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-3xl rounded-full"></div>
      <div className="absolute bottom-[10%] -right-[5%] w-[35%] h-[50%] bg-gradient-to-l from-blue-500/10 to-cyan-500/10 blur-3xl rounded-full"></div>
      
      <div className="absolute top-4 left-4 z-10">
        <ThemeToggle className="bg-gray-800/70 backdrop-blur-md hover:bg-gray-700/70 dark:bg-gray-800/70 dark:hover:bg-gray-700/70 light:bg-gray-200/70 light:hover:bg-gray-300/70 rounded-full shadow-lg" />
      </div>
      
      <div className="max-w-md mx-auto relative z-10">
        {/* Futuristic Header */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl"></div>
          <div className="relative bg-white/10 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Request Access
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
              Fill out this form to request access to the hotel management system
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-400/10 backdrop-blur-sm border border-red-400/30 text-red-500 dark:text-red-400 rounded-xl">
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-400/10 backdrop-blur-sm border border-green-400/30 text-green-500 dark:text-green-400 rounded-xl">
            <p>{success}</p>
          </div>
        )}

        {/* Futuristic Form Card */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl"></div>
          <div className="relative bg-white/10 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 dark:bg-gray-700/50 border border-white/10 dark:border-gray-600/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition-all duration-300"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 dark:bg-gray-700/50 border border-white/10 dark:border-gray-600/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition-all duration-300"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 dark:bg-gray-700/50 border border-white/10 dark:border-gray-600/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition-all duration-300"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department
                </label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 dark:bg-gray-700/50 border border-white/10 dark:border-gray-600/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition-all duration-300"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="contact_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Number
                </label>
                <input
                  type="tel"
                  id="contact_number"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 dark:bg-gray-700/50 border border-white/10 dark:border-gray-600/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition-all duration-300"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Access
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 dark:bg-gray-700/50 border border-white/10 dark:border-gray-600/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition-all duration-300"
                  required
                  disabled={isSubmitting}
                ></textarea>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Link
                  to="/landing"
                  className="px-6 py-2.5 border border-gray-300/30 dark:border-gray-600/30 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100/10 dark:hover:bg-gray-700/30 transition-all duration-300 backdrop-blur-sm"
                >
                  Back to Home
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-indigo-500/25 backdrop-blur-sm"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestAccessPage; 