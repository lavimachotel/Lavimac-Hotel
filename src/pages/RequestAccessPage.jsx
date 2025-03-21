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
    'Maintenance',
    'Security',
    'Finance',
    'Human Resources',
    'Management',
    'Other'
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
      // First try with the service function
      try {
        const { success, error, data } = await import('../api/accessRequestService')
          .then(module => module.createAccessRequest({
            full_name: formData.full_name,
            email: formData.email,
            position: formData.position,
            department: formData.department,
            contact_number: formData.contact_number,
            reason: formData.reason
          }));

        if (!success) throw new Error(error);
        
        // If successful, continue with the success flow
        handleSuccessfulSubmission();
        return;
      } catch (serviceError) {
        console.log("Service approach failed, trying fallback method:", serviceError);
        
        // If the service approach fails with permission errors, try the direct table insertion
        // This works because we should have set up an "Anyone can insert" policy
        const { error: insertError } = await supabase
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
          ]);

        if (insertError) throw insertError;
        
        // If direct insertion was successful
        handleSuccessfulSubmission();
      }
    } catch (err) {
      console.error('Error submitting access request:', err);
      setError(err.message || 'Failed to submit access request. Please try again.');
      toast.error('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function for successful submission
  const handleSuccessfulSubmission = () => {
    setSuccess('Your access request has been submitted successfully. You will be notified once approved.');
    toast.success('Access request submitted successfully');

    // Reset form after successful submission
    setFormData({
      full_name: '',
      email: '',
      position: '',
      department: '',
      contact_number: '',
      reason: ''
    });

    // Redirect to landing page after 3 seconds
    setTimeout(() => {
      navigate('/landing');
    }, 3000);
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900 light:bg-gray-100">
      <div className="absolute top-4 left-4 z-10">
        <ThemeToggle className="bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 light:bg-gray-200 light:hover:bg-gray-300" />
      </div>
      
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold dark:text-white light:text-gray-900">Request Access</h1>
          <p className="mt-2 text-lg dark:text-gray-300 light:text-gray-700">
            Fill out this form to request access to the hotel management system
          </p>
        </div>

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

        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                Email Address
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

            <div>
              <label htmlFor="position" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                Position
              </label>
              <input
                type="text"
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                Department
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label htmlFor="contact_number" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                Contact Number
              </label>
              <input
                type="tel"
                id="contact_number"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium dark:text-gray-300 light:text-gray-700 mb-2">
                Reason for Access
              </label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white light:bg-white light:border-gray-300 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isSubmitting}
              ></textarea>
            </div>

            <div className="flex items-center justify-between pt-4">
              <Link
                to="/landing"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Back to Home
              </Link>
              <button
                type="submit"
                className={`px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestAccessPage; 