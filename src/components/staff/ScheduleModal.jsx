import React, { useState, useEffect } from 'react';
import { FaTimes, FaCalendarAlt, FaClock, FaUser, FaClipboardList } from 'react-icons/fa';
import { format } from 'date-fns';

const ScheduleModal = ({ isOpen, onClose, onSave, schedule, staff }) => {
  const [formData, setFormData] = useState({
    staff_id: '',
    shift_date: format(new Date(), 'yyyy-MM-dd'),
    shift_start: '09:00',
    shift_end: '17:00',
    shift_type: 'regular',
    location: '',
    notes: '',
    is_published: true
  });

  useEffect(() => {
    if (schedule) {
      setFormData({
        staff_id: schedule.staff_id || '',
        shift_date: schedule.shift_date || format(new Date(), 'yyyy-MM-dd'),
        shift_start: schedule.shift_start || '09:00',
        shift_end: schedule.shift_end || '17:00',
        shift_type: schedule.shift_type || 'regular',
        location: schedule.location || '',
        notes: schedule.notes || '',
        is_published: schedule.is_published !== undefined ? schedule.is_published : true
      });
    }
  }, [schedule]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {schedule && schedule.id ? 'Edit Schedule' : 'Add New Schedule'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Staff Member *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="text-gray-400" />
              </div>
              <select
                name="staff_id"
                value={formData.staff_id}
                onChange={handleChange}
                required
                className="pl-10 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Staff Member</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.first_name} {member.last_name} - {member.position}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Shift Date *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaCalendarAlt className="text-gray-400" />
              </div>
              <input
                type="date"
                name="shift_date"
                value={formData.shift_date}
                onChange={handleChange}
                required
                className="pl-10 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-1">Start Time *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaClock className="text-gray-400" />
                </div>
                <input
                  type="time"
                  name="shift_start"
                  value={formData.shift_start}
                  onChange={handleChange}
                  required
                  className="pl-10 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-1">End Time *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaClock className="text-gray-400" />
                </div>
                <input
                  type="time"
                  name="shift_end"
                  value={formData.shift_end}
                  onChange={handleChange}
                  required
                  className="pl-10 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Shift Type *</label>
            <select
              name="shift_type"
              value={formData.shift_type}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="regular">Regular</option>
              <option value="overtime">Overtime</option>
              <option value="holiday">Holiday</option>
              <option value="weekend">Weekend</option>
              <option value="night">Night Shift</option>
              <option value="on_call">On Call</option>
              <option value="training">Training</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Location (e.g., Front Desk, Pool Area)"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaClipboardList className="text-gray-400" />
              </div>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="pl-10 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Any special instructions or notes"
                rows="3"
              ></textarea>
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                name="is_published"
                checked={formData.is_published}
                onChange={handleChange}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              Publish this schedule (visible to staff)
            </label>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {schedule && schedule.id ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleModal;
