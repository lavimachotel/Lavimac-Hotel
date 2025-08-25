import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

const OfflineTaskModal = ({ isOpen, onClose, onSave, task }) => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'Pending',
        priority: 'Medium',
        assigned_to: '',
        department: '',
        due_date: '',
        notes: ''
    });
    
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    // Initialize form data when task prop changes
    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || '',
                description: task.description || '',
                status: task.status || 'Pending',
                priority: task.priority || 'Medium',
                assigned_to: task.assigned_to || '',
                department: task.department || '',
                due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
                notes: task.notes || ''
            });
        } else {
            setFormData({
                title: '',
                description: '',
                status: 'Pending',
                priority: 'Medium',
                assigned_to: '',
                department: '',
                due_date: '',
                notes: ''
            });
        }
        setErrors({});
    }, [task]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }
        
        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }
        
        if (!formData.assigned_to.trim()) {
            newErrors.assigned_to = 'Assigned to is required';
        }
        
        if (!formData.department.trim()) {
            newErrors.department = 'Department is required';
        }
        
        if (!formData.due_date) {
            newErrors.due_date = 'Due date is required';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setIsLoading(true);
        
        try {
            // Convert date to ISO string for storage
            const taskData = {
                ...formData,
                due_date: new Date(formData.due_date).toISOString()
            };
            
            await onSave(taskData);
            onClose();
        } catch (error) {
            console.error('Error saving task:', error);
            setErrors({ submit: 'Failed to save task. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
                {/* Header */}
                <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        {task ? 'Edit Task' : 'Create New Task'}
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-md ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} transition-colors`}
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    {/* Error Messages */}
                    {errors.submit && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-400 rounded-md">
                            {errors.submit}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Title */}
                        <div className="md:col-span-2">
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Task Title *
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDarkMode 
                                        ? 'bg-gray-700 border-gray-600 text-white' 
                                        : 'bg-white border-gray-300 text-gray-900'
                                } ${errors.title ? 'border-red-500' : ''}`}
                                placeholder="Enter task title"
                            />
                            {errors.title && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Description *
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDarkMode 
                                        ? 'bg-gray-700 border-gray-600 text-white' 
                                        : 'bg-white border-gray-300 text-gray-900'
                                } ${errors.description ? 'border-red-500' : ''}`}
                                placeholder="Enter task description"
                            />
                            {errors.description && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                            )}
                        </div>

                        {/* Status */}
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Status
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDarkMode 
                                        ? 'bg-gray-700 border-gray-600 text-white' 
                                        : 'bg-white border-gray-300 text-gray-900'
                                }`}
                            >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Priority
                            </label>
                            <select
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDarkMode 
                                        ? 'bg-gray-700 border-gray-600 text-white' 
                                        : 'bg-white border-gray-300 text-gray-900'
                                }`}
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>

                        {/* Assigned To */}
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Assigned To *
                            </label>
                            <input
                                type="text"
                                name="assigned_to"
                                value={formData.assigned_to}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDarkMode 
                                        ? 'bg-gray-700 border-gray-600 text-white' 
                                        : 'bg-white border-gray-300 text-gray-900'
                                } ${errors.assigned_to ? 'border-red-500' : ''}`}
                                placeholder="Enter assignee name"
                            />
                            {errors.assigned_to && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.assigned_to}</p>
                            )}
                        </div>

                        {/* Department */}
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Department *
                            </label>
                            <select
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDarkMode 
                                        ? 'bg-gray-700 border-gray-600 text-white' 
                                        : 'bg-white border-gray-300 text-gray-900'
                                } ${errors.department ? 'border-red-500' : ''}`}
                            >
                                <option value="">Select Department</option>
                                <option value="Front Desk">Front Desk</option>
                                <option value="Housekeeping">Housekeeping</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Food & Beverage">Food & Beverage</option>
                                <option value="Security">Security</option>
                                <option value="Management">Management</option>
                                <option value="IT">IT</option>
                                <option value="Human Resources">Human Resources</option>
                            </select>
                            {errors.department && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.department}</p>
                            )}
                        </div>

                        {/* Due Date */}
                        <div className="md:col-span-2">
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Due Date *
                            </label>
                            <input
                                type="date"
                                name="due_date"
                                value={formData.due_date}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDarkMode 
                                        ? 'bg-gray-700 border-gray-600 text-white' 
                                        : 'bg-white border-gray-300 text-gray-900'
                                } ${errors.due_date ? 'border-red-500' : ''}`}
                            />
                            {errors.due_date && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.due_date}</p>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Additional Notes
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={3}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDarkMode 
                                        ? 'bg-gray-700 border-gray-600 text-white' 
                                        : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                placeholder="Enter any additional notes or instructions"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={`flex justify-end space-x-3 pt-6 mt-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                isDarkMode 
                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`px-4 py-2 rounded-md font-medium flex items-center space-x-2 transition-colors ${
                                isLoading
                                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            <FontAwesomeIcon icon={faSave} />
                            <span>{isLoading ? 'Saving...' : 'Save Task'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OfflineTaskModal; 