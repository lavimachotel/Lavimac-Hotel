import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const GuestEditModal = ({ isOpen, onClose, guest, onUpdateGuest }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    room: '',
    checkIn: '',
    checkOut: '',
    status: '',
    notes: ''
  });

  useEffect(() => {
    if (guest) {
      setFormData({
        name: guest.name || '',
        email: guest.email || '',
        phone: guest.phone || '',
        room: guest.room || '',
        checkIn: guest.checkIn || '',
        checkOut: guest.checkOut || '',
        status: guest.status || 'Reserved',
        notes: guest.notes || ''
      });
    }
  }, [guest]);

  if (!isOpen || !guest) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateGuest(guest.id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg p-6 w-full max-w-md`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Guest</h2>
          <button 
            onClick={onClose}
            className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'} text-xl font-bold`}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium">Name</label>
              <input 
                type="text" 
                name="name"
                value={formData.name} 
                onChange={handleChange} 
                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                required
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Email</label>
              <input 
                type="email" 
                name="email"
                value={formData.email} 
                onChange={handleChange} 
                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Phone</label>
              <input 
                type="text" 
                name="phone"
                value={formData.phone} 
                onChange={handleChange} 
                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Room</label>
              <input 
                type="text" 
                name="room"
                value={formData.room_name || ''} 
                onChange={handleChange} 
                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                readOnly
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Check In</label>
                <input 
                  type="date" 
                  name="checkIn"
                  value={formData.checkIn} 
                  onChange={handleChange} 
                  className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Check Out</label>
                <input 
                  type="date" 
                  name="checkOut"
                  value={formData.checkOut} 
                  onChange={handleChange} 
                  className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                />
              </div>
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Status</label>
              <select 
                name="status"
                value={formData.status} 
                onChange={handleChange} 
                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              >
                <option value="Reserved">Reserved</option>
                <option value="Checked In">Checked In</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Notes</label>
              <textarea 
                name="notes"
                value={formData.notes} 
                onChange={handleChange} 
                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                rows="3"
              ></textarea>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-2">
            <button 
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuestEditModal; 