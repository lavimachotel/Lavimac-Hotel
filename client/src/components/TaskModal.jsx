import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import supabase from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTasks, faCalendarAlt, faUser, faClipboardList } from '@fortawesome/free-solid-svg-icons';

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
      
      // Log success
      console.log(task ? 'Task updated successfully' : 'Task created successfully');
      
      // Call onSave callback with the result
      if (onSave) onSave(result);
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Error saving task:', error);
      setError(error.message);
      
      // Handle error gracefully
      console.error('Failed to save task to database');
      
      // Close modal even if save failed
      if (onSave) onSave(null);
      
      // Close modal
      onClose();
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  // Get priority badge color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return isDarkMode 
          ? 'from-red-600 to-pink-600' 
          : 'from-red-500 to-pink-500'; 
      case 'Medium':
        return isDarkMode 
          ? 'from-amber-600 to-yellow-600' 
          : 'from-amber-500 to-yellow-500';
      case 'Low':
        return isDarkMode 
          ? 'from-green-600 to-emerald-600' 
          : 'from-green-500 to-emerald-500';
      default:
        return isDarkMode 
          ? 'from-blue-600 to-indigo-600' 
          : 'from-blue-500 to-indigo-500';
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${isDarkMode ? 'bg-gray-800/90 text-white border-gray-700/50' : 'bg-white/95 text-gray-800 border-gray-200/50'} rounded-xl p-6 w-full max-w-md border shadow-lg backdrop-blur-md relative overflow-hidden`}>
        {/* Header gradient bar */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${getPriorityColor(formData.priority)}`}></div>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        {error && (
          <div className={`${isDarkMode ? 'bg-red-900/30 border-red-800/50 text-red-300' : 'bg-red-100 border-red-200 text-red-700'} px-4 py-3 rounded-lg border mb-4`}>
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block mb-1.5 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} flex items-center`}>
              <FontAwesomeIcon icon={faTasks} className={`mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              Room
            </label>
            <input 
              type="text" 
              name="room"
              value={formData.room}
              onChange={handleChange}
              className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700/60 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400 focus:border-blue-500'} focus:ring-2 focus:ring-blue-500/30 outline-none transition-all duration-200`}
              placeholder="Room number or area"
              required
            />
          </div>
          
          <div>
            <label className={`block mb-1.5 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} flex items-center`}>
              <FontAwesomeIcon icon={faClipboardList} className={`mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              Description
            </label>
            <input 
              type="text" 
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700/60 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400 focus:border-blue-500'} focus:ring-2 focus:ring-blue-500/30 outline-none transition-all duration-200`}
              placeholder="Task description"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1.5 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Priority
              </label>
            <select 
              name="priority"
              value={formData.priority}
              onChange={handleChange}
                className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700/60 border-gray-600 text-white focus:border-blue-500' : 'bg-white border-gray-300 text-gray-700 focus:border-blue-500'} focus:ring-2 focus:ring-blue-500/30 outline-none transition-all duration-200`}
              required
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          
            <div>
              <label className={`block mb-1.5 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Status
              </label>
              <select 
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700/60 border-gray-600 text-white focus:border-blue-500' : 'bg-white border-gray-300 text-gray-700 focus:border-blue-500'} focus:ring-2 focus:ring-blue-500/30 outline-none transition-all duration-200`}
                required
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className={`block mb-1.5 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} flex items-center`}>
              <FontAwesomeIcon icon={faUser} className={`mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              Assignee
            </label>
            <input 
              type="text" 
              name="assignee"
              value={formData.assignee}
              onChange={handleChange}
              className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700/60 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400 focus:border-blue-500'} focus:ring-2 focus:ring-blue-500/30 outline-none transition-all duration-200`}
              placeholder="Person assigned to task"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1.5 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} flex items-center`}>
                <FontAwesomeIcon icon={faCalendarAlt} className={`mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                Due Date
              </label>
            <input 
              type="date" 
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
                className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700/60 border-gray-600 text-white focus:border-blue-500' : 'bg-white border-gray-300 text-gray-700 focus:border-blue-500'} focus:ring-2 focus:ring-blue-500/30 outline-none transition-all duration-200`}
              required
            />
          </div>
          
            <div>
              <label className={`block mb-1.5 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Duration
              </label>
            <input 
              type="text" 
              name="duration"
              value={formData.duration}
              onChange={handleChange}
                className={`w-full p-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700/60 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400 focus:border-blue-500'} focus:ring-2 focus:ring-blue-500/30 outline-none transition-all duration-200`}
              placeholder="e.g. 30 min, 1 hour"
            />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-700/60 hover:bg-gray-600 text-gray-300 border-gray-600' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
              }`}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 transform hover:scale-105"
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
              ) : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal; 