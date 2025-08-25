import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaIdCard, FaEnvelope, FaPhone, FaBuilding, FaUserTie } from 'react-icons/fa';

const StaffModal = ({ isOpen, onClose, onSave, staff }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    hire_date: '',
    status: 'active',
    emergency_contact: '',
    emergency_phone: '',
    address: '',
    hourly_rate: '',
    weekly_hours: 40
  });

  useEffect(() => {
    if (staff) {
      setFormData({
        first_name: staff.first_name || '',
        last_name: staff.last_name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        position: staff.position || '',
        department: staff.department || '',
        hire_date: staff.hire_date || '',
        status: staff.status || 'active',
        emergency_contact: staff.emergency_contact || '',
        emergency_phone: staff.emergency_phone || '',
        address: staff.address || '',
        hourly_rate: staff.hourly_rate || '',
        weekly_hours: staff.weekly_hours || 40
      });
    }
  }, [staff]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-2xl">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl"></div>
        
        <div className="relative bg-white/10 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-gray-700/50">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-lg p-6 border-b border-white/10 dark:border-gray-700/30 flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-300 bg-white/5 hover:bg-white/10 backdrop-blur-lg p-2 rounded-full"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Form section with smooth scrolling */}
          <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">First Name *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                      className="pl-10 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                      placeholder="First Name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Last Name *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                      className="pl-10 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                      placeholder="Last Name"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaEnvelope className="text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="pl-10 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                      placeholder="Email"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Phone *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaPhone className="text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="pl-10 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                      placeholder="Phone Number"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Position *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUserTie className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      required
                      className="pl-10 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                      placeholder="Position"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Department *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaBuilding className="text-gray-400" />
                    </div>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                      className="pl-10 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                    >
                      <option value="">Select Department</option>
                      <option value="Front Desk">Front Desk</option>
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Food & Beverage">Food & Beverage</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Management">Management</option>
                      <option value="Security">Security</option>
                      <option value="HR">Human Resources</option>
                      <option value="Accounting">Accounting</option>
                      <option value="IT">IT</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Hire Date</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaIdCard className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      name="hire_date"
                      value={formData.hire_date}
                      onChange={handleChange}
                      className="pl-10 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="terminated">Terminated</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Hourly Rate ($)</label>
                  <input
                    type="number"
                    name="hourly_rate"
                    value={formData.hourly_rate}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                    placeholder="Hourly Rate"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Weekly Hours</label>
                  <input
                    type="number"
                    name="weekly_hours"
                    value={formData.weekly_hours}
                    onChange={handleChange}
                    min="0"
                    max="168"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                    placeholder="Weekly Hours"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                  placeholder="Address"
                  rows="2"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Emergency Contact</label>
                  <input
                    type="text"
                    name="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                    placeholder="Emergency Contact Name"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">Emergency Phone</label>
                  <input
                    type="tel"
                    name="emergency_phone"
                    value={formData.emergency_phone}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                    placeholder="Emergency Contact Phone"
                  />
                </div>
              </div>

              {/* Form actions */}
              <div className="flex justify-end space-x-4 mt-8">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-blue-500/25"
                >
                  {staff ? 'Update Staff' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffModal;
