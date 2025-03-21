import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import supabase from '../supabaseClient';

const TaskModal = ({ isOpen, onClose, task = null, onSave }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const [formData, setFormData] = useState({
    room: '',
    description: '',
    priority: 'Medium',
    assignee: '',
    status: 'Pending',
    dueDate: new Date().toISOString().split('T')[0],
    duration: '30 min'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // If editing, populate form with task data
  useEffect(() => {
    if (task) {
      setFormData({
        room: task.room || '',
        description: task.description || '',
        priority: task.priority || 'Medium',
        assignee: task.assignee || '',
        status: task.status || 'Pending',
        dueDate: task.due_date || new Date().toISOString().split('T')[0],
        duration: task.duration || '30 min'
      });
    } else {
      // Reset form for new task
      setFormData({
        room: '',
        description: '',
        priority: 'Medium',
        assignee: '',
        status: 'Pending',
        dueDate: new Date().toISOString().split('T')[0],
        duration: '30 min'
      });
    }
  }, [task, isOpen]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const taskData = {
        room: formData.room,
        description: formData.description,
        priority: formData.priority,
        assignee: formData.assignee,
        status: formData.status,
        due_date: formData.dueDate,
        duration: formData.duration
      };
      
      let result;
      
      if (task) {
        // Update existing task
        const { data, error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', task.id)
          .select();
          
        if (error) throw error;
        result = data[0];
      } else {
        // Create new task
        const { data, error } = await supabase
          .from('tasks')
          .insert(taskData)
          .select();
          
        if (error) throw error;
        result = data[0];
      }
      
      // Add notification to dashboard
      const notificationsStr = localStorage.getItem('hotelNotifications');
      const notifications = notificationsStr ? JSON.parse(notificationsStr) : [];
      
      const newNotification = {
        type: 'info',
        title: task ? 'Task Updated' : 'New Task',
        message: `${task ? 'Updated' : 'Created'} task: ${formData.description} for ${formData.room}`,
        time: 'Just now',
        timestamp: new Date().toISOString()
      };
      
      notifications.unshift(newNotification);
      localStorage.setItem('hotelNotifications', JSON.stringify(notifications.slice(0, 10)));
      
      // Call onSave callback with the result
      if (onSave) onSave(result);
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Error saving task:', error);
      setError(error.message);
      
      // Save to localStorage as fallback
      const localTask = {
        id: task ? task.id : Date.now(),
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Get existing local tasks
      const localTasksStr = localStorage.getItem('hotelTasks');
      const localTasks = localTasksStr ? JSON.parse(localTasksStr) : [];
      
      if (task) {
        // Update existing task
        const updatedTasks = localTasks.map(t => 
          t.id === task.id ? localTask : t
        );
        localStorage.setItem('hotelTasks', JSON.stringify(updatedTasks));
      } else {
        // Add new task
        localTasks.push(localTask);
        localStorage.setItem('hotelTasks', JSON.stringify(localTasks));
      }
      
      // Still call onSave with the local task
      if (onSave) onSave(localTask);
      
      // Close modal
      onClose();
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg p-6 w-full max-w-md`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{task ? 'Edit Task' : 'Add New Task'}</h2>
          <button 
            onClick={onClose}
            className={`${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Room</label>
            <input 
              type="text" 
              name="room"
              value={formData.room}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="Room number or area"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Description</label>
            <input 
              type="text" 
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="Task description"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Priority</label>
            <select 
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              required
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Assignee</label>
            <input 
              type="text" 
              name="assignee"
              value={formData.assignee}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="Person assigned to task"
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Status</label>
            <select 
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              required
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Due Date</label>
            <input 
              type="date" 
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Duration</label>
            <input 
              type="text" 
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="e.g. 30 min, 1 hour"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <button 
              type="button" 
              onClick={onClose}
              className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal; 