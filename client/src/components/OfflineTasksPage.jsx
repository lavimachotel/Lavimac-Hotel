import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faEdit, faTrash, faListCheck, faCheckCircle, faClock, faExclamationTriangle, faTasks, faPlus } from '@fortawesome/free-solid-svg-icons';
import OfflineSidebar from './OfflineSidebar';
import OfflineNavbar from './OfflineNavbar';
import { useTheme } from '../context/ThemeContext';
import OfflineTaskModal from './OfflineTaskModal';

const OfflineTasksPage = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState('all');

    // Load tasks from localStorage on component mount
    useEffect(() => {
        setIsLoading(true);
        try {
            const savedTasks = localStorage.getItem('offline_tasks');
            if (savedTasks) {
                setTasks(JSON.parse(savedTasks));
            } else {
                // Initialize with sample tasks if none exist
                const sampleTasks = [
                    {
                        id: 1,
                        title: 'Room 101 Maintenance',
                        description: 'Fix air conditioning unit',
                        status: 'Pending',
                        priority: 'High',
                        assigned_to: 'John Doe',
                        department: 'Maintenance',
                        due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    {
                        id: 2,
                        title: 'Inventory Check',
                        description: 'Monthly inventory audit for housekeeping supplies',
                        status: 'In Progress',
                        priority: 'Medium',
                        assigned_to: 'Jane Smith',
                        department: 'Housekeeping',
                        due_date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    {
                        id: 3,
                        title: 'Guest Welcome Package',
                        description: 'Prepare welcome packages for VIP guests',
                        status: 'Completed',
                        priority: 'Low',
                        assigned_to: 'Mike Johnson',
                        department: 'Front Desk',
                        due_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ];
                setTasks(sampleTasks);
                localStorage.setItem('offline_tasks', JSON.stringify(sampleTasks));
            }
        } catch (err) {
            console.error('Error loading tasks:', err);
            setError('Failed to load tasks');
            setTasks([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save tasks to localStorage whenever tasks change
    useEffect(() => {
        if (tasks.length > 0) {
            localStorage.setItem('offline_tasks', JSON.stringify(tasks));
        }
    }, [tasks]);

    // Handle opening modal for new task
    const handleAddTask = () => {
        setCurrentTask(null);
        setIsModalOpen(true);
    };

    // Handle opening modal for editing task
    const handleEditTask = (task) => {
        setCurrentTask(task);
        setIsModalOpen(true);
    };

    // Handle deleting a task
    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) {
            return;
        }
        
        try {
            // Update local state
            const updatedTasks = tasks.filter(task => task.id !== taskId);
            setTasks(updatedTasks);
            localStorage.setItem('offline_tasks', JSON.stringify(updatedTasks));
            
            console.log('Task deleted successfully');
            
        } catch (err) {
            console.error('Error deleting task:', err);
            setError('Failed to delete task. Please try again.');
        }
    };

    // Handle saving a task (from modal)
    const handleSaveTask = (taskData) => {
        try {
            if (currentTask) {
                // Update existing task
                const updatedTasks = tasks.map(task => 
                    task.id === currentTask.id 
                        ? { ...taskData, id: currentTask.id, updated_at: new Date().toISOString() }
                        : task
                );
                setTasks(updatedTasks);
            } else {
                // Add new task
                const newTask = {
                    ...taskData,
                    id: Date.now(), // Simple ID generation for offline mode
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                setTasks([newTask, ...tasks]);
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error('Error saving task:', err);
            setError('Failed to save task. Please try again.');
        }
    };

    // Get color for priority badge
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High':
                return isDarkMode 
                    ? 'bg-red-900/30 text-red-300 border-red-700/50' 
                    : 'bg-red-100 text-red-800 border-red-200'; 
            case 'Medium':
                return isDarkMode 
                    ? 'bg-amber-900/30 text-amber-300 border-amber-700/50' 
                    : 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Low':
                return isDarkMode 
                    ? 'bg-green-900/30 text-green-300 border-green-700/50' 
                    : 'bg-green-100 text-green-800 border-green-200';
            default:
                return isDarkMode 
                    ? 'bg-gray-800 text-gray-300 border-gray-700/50' 
                    : 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Get color for status badge
    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending':
                return isDarkMode 
                    ? 'bg-gray-800/60 text-gray-300 border-gray-700/50' 
                    : 'bg-gray-100 text-gray-800 border-gray-200';
            case 'In Progress':
                return isDarkMode 
                    ? 'bg-blue-900/30 text-blue-300 border-blue-700/50' 
                    : 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Completed':
                return isDarkMode 
                    ? 'bg-green-900/30 text-green-300 border-green-700/50' 
                    : 'bg-green-100 text-green-800 border-green-200';
            case 'Cancelled':
                return isDarkMode 
                    ? 'bg-red-900/30 text-red-300 border-red-700/50' 
                    : 'bg-red-100 text-red-800 border-red-200';
            default:
                return isDarkMode 
                    ? 'bg-gray-800 text-gray-300 border-gray-700/50' 
                    : 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Get filtered tasks
    const filteredTasks = selectedFilter === 'all' 
        ? tasks 
        : tasks.filter(task => task.status.toLowerCase() === selectedFilter);

    // Get tasks by status for statistics
    const pendingTasks = tasks.filter(task => task.status === 'Pending');
    const inProgressTasks = tasks.filter(task => task.status === 'In Progress');
    const completedTasks = tasks.filter(task => task.status === 'Completed');
    const highPriorityTasks = tasks.filter(task => task.priority === 'High');

    // Format date helper
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (isLoading) {
        return (
            <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <OfflineSidebar activeLink="Tasks" />
                <div className="flex-1 overflow-auto">
                    <OfflineNavbar title="Task Management - Offline Mode" />
                    <div className="flex items-center justify-center min-h-screen">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading tasks...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <OfflineSidebar activeLink="Tasks" />
            <div className="flex-1 overflow-auto">
                <OfflineNavbar title="Task Management - Offline Mode" />
                
                <div className="p-6 space-y-6">
                    {/* Header with Add Task Button */}
                    <div className="flex justify-between items-center">
                        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            Task Management
                        </h1>
                        <button
                            onClick={handleAddTask}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-2.5 px-6 rounded-xl flex items-center space-x-2 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-blue-500/25"
                        >
                            <FontAwesomeIcon icon={faPlus} />
                            <span>Add Task</span>
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-400 px-4 py-3 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* Task Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-center overflow-hidden relative`}>
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                            <div className="flex items-center justify-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} mb-3`}>
                                    <FontAwesomeIcon icon={faTasks} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} text-xl`} />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{tasks.length}</p>
                            <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Total Tasks</p>
                        </div>
                        
                        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-center overflow-hidden relative`}>
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-yellow-600"></div>
                            <div className="flex items-center justify-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-amber-900/30' : 'bg-amber-100'} mb-3`}>
                                    <FontAwesomeIcon icon={faClock} className={`${isDarkMode ? 'text-amber-400' : 'text-amber-600'} text-xl`} />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{pendingTasks.length}</p>
                            <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Pending</p>
                        </div>
                        
                        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-center overflow-hidden relative`}>
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-600"></div>
                            <div className="flex items-center justify-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} mb-3`}>
                                    <FontAwesomeIcon icon={faListCheck} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} text-xl`} />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{inProgressTasks.length}</p>
                            <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>In Progress</p>
                        </div>
                        
                        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-center overflow-hidden relative`}>
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
                            <div className="flex items-center justify-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'} mb-3`}>
                                    <FontAwesomeIcon icon={faCheckCircle} className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} text-xl`} />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{completedTasks.length}</p>
                            <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Completed</p>
                        </div>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex flex-wrap gap-2">
                        {['all', 'pending', 'in progress', 'completed', 'cancelled'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setSelectedFilter(filter)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                                    selectedFilter === filter
                                        ? 'bg-blue-500 text-white shadow-md'
                                        : isDarkMode
                                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Tasks List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTasks.map((task) => (
                            <div key={task.id} className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} hover:shadow-xl transition-shadow duration-300`}>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex-1`}>
                                        {task.title}
                                    </h3>
                                    <div className="flex space-x-2 ml-2">
                                        <button
                                            onClick={() => handleEditTask(task)}
                                            className={`p-2 rounded ${isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'} transition-colors`}
                                        >
                                            <FontAwesomeIcon icon={faEdit} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className={`p-2 rounded ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700' : 'text-gray-500 hover:text-red-600 hover:bg-gray-100'} transition-colors`}
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                </div>
                                
                                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 text-sm`}>
                                    {task.description}
                                </p>
                                
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                                        {task.status}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} space-y-1`}>
                                    <p><strong>Assigned to:</strong> {task.assigned_to}</p>
                                    <p><strong>Department:</strong> {task.department}</p>
                                    <p><strong>Due:</strong> {formatDate(task.due_date)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {filteredTasks.length === 0 && (
                        <div className="text-center py-12">
                            <FontAwesomeIcon 
                                icon={faTasks} 
                                className={`text-6xl ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-4`} 
                            />
                            <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                                No tasks found
                            </h3>
                            <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-4`}>
                                {selectedFilter === 'all' 
                                    ? 'No tasks have been created yet.' 
                                    : `No ${selectedFilter} tasks found.`}
                            </p>
                            <button
                                onClick={handleAddTask}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-300"
                            >
                                Create Your First Task
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Task Modal */}
            {isModalOpen && (
                <OfflineTaskModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveTask}
                    task={currentTask}
                />
            )}
        </div>
    );
};

export default OfflineTasksPage; 