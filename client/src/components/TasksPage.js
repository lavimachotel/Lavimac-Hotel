import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faEdit, faTrash, faListCheck, faCheckCircle, faClock, faExclamationTriangle, faTasks } from '@fortawesome/free-solid-svg-icons';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useTheme } from '../context/ThemeContext';
import TaskModal from './TaskModal';
import supabase from '../supabaseClient';
import Card from './ui/Card';

const TasksPage = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState('all');

    // Function to fetch tasks from Supabase
    const fetchTasks = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Try fetching from Supabase first
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error('Error fetching tasks from Supabase:', error);
                setTasks([]);
            } else {
                setTasks(data || []);
            }
        } catch (err) {
            console.error('Unexpected error fetching tasks:', err);
            setError('Failed to load tasks. Please try again later.');
            setTasks([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch tasks on component mount
    useEffect(() => {
        fetchTasks();
        
        // Set up real-time subscription
        const tasksSubscription = supabase
            .channel('tasks_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks' },
                (payload) => {
                    console.log('Real-time update received:', payload);
                    fetchTasks();
                }
            )
            .subscribe();
            
        return () => {
            supabase.removeChannel(tasksSubscription);
        };
    }, []);

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
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);
                
            if (error) {
                throw error;
            }
            
            // Update local state
            setTasks(tasks.filter(task => task.id !== taskId));
            
            // Add notification
            console.log('Task deleted successfully');
            
        } catch (err) {
            console.error('Error deleting task:', err);
            setError('Failed to delete task. Please try again.');
        }
    };

    // Handle saving a task (from modal)
    const handleSaveTask = (taskData) => {
        fetchTasks(); // Refetch all tasks to ensure we have the latest data
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

    return (
        <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <Sidebar activeLink="Tasks" />
            <div className="flex-1 overflow-auto">
                <Navbar title="Task Management" />
                
                <div className="p-6 space-y-6">
                    {/* Task Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="text-center overflow-hidden relative">
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600`}></div>
                            <div className="flex items-center justify-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} mb-3`}>
                                    <FontAwesomeIcon icon={faTasks} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} text-xl`} />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{tasks.length}</p>
                            <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Total Tasks</p>
                        </Card>
                        
                        <Card className="text-center overflow-hidden relative">
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-yellow-600`}></div>
                            <div className="flex items-center justify-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-amber-900/30' : 'bg-amber-100'} mb-3`}>
                                    <FontAwesomeIcon icon={faClock} className={`${isDarkMode ? 'text-amber-400' : 'text-amber-600'} text-xl`} />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                                {pendingTasks.length}
                            </p>
                            <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Pending</p>
                        </Card>
                        
                        <Card className="text-center overflow-hidden relative">
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-600`}></div>
                            <div className="flex items-center justify-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'} mb-3`}>
                                    <FontAwesomeIcon icon={faCheckCircle} className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} text-xl`} />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                {completedTasks.length}
                            </p>
                            <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Completed</p>
                        </Card>
                        
                        <Card className="text-center overflow-hidden relative">
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-pink-600`}></div>
                            <div className="flex items-center justify-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-red-900/30' : 'bg-red-100'} mb-3`}>
                                    <FontAwesomeIcon icon={faExclamationTriangle} className={`${isDarkMode ? 'text-red-400' : 'text-red-600'} text-xl`} />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                {highPriorityTasks.length}
                            </p>
                            <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>High Priority</p>
                        </Card>
                    </div>

                    {/* Task List */}
                    <Card title="Task Overview" className="overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                        
                        <div className="flex justify-between items-center mb-6 px-6 pt-2">
                            <div className="flex space-x-2">
                                <button 
                                    onClick={() => setSelectedFilter('all')} 
                                    className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${
                                        selectedFilter === 'all' 
                                            ? isDarkMode 
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                                                : 'bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                                            : isDarkMode 
                                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    All
                                </button>
                                <button 
                                    onClick={() => setSelectedFilter('pending')} 
                                    className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${
                                        selectedFilter === 'pending' 
                                            ? isDarkMode 
                                                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20' 
                                                : 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                                            : isDarkMode 
                                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    Pending
                                </button>
                                <button 
                                    onClick={() => setSelectedFilter('in progress')} 
                                    className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${
                                        selectedFilter === 'in progress' 
                                            ? isDarkMode 
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                                                : 'bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                                            : isDarkMode 
                                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    In Progress
                                </button>
                                <button 
                                    onClick={() => setSelectedFilter('completed')} 
                                    className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${
                                        selectedFilter === 'completed' 
                                            ? isDarkMode 
                                                ? 'bg-green-600 text-white shadow-md shadow-green-500/20' 
                                                : 'bg-green-500 text-white shadow-md shadow-green-500/20' 
                                            : isDarkMode 
                                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    Completed
                                </button>
                            </div>
                            <button 
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center"
                                onClick={handleAddTask}
                            >
                                <FontAwesomeIcon icon={faListCheck} className="mr-2" />
                                    Add New Task
                                </button>
                            </div>

                            {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-6 mb-4">
                                    <p>{error}</p>
                                </div>
                            )}

                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                </div>
                        ) : filteredTasks.length === 0 ? (
                                <div className="text-center py-8">
                                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {selectedFilter === 'all' 
                                        ? 'No tasks available. Create a new task to get started.' 
                                        : `No ${selectedFilter} tasks found.`}
                                </p>
                                </div>
                            ) : (
                        <div className="overflow-x-auto px-2">
                                <table className="min-w-full">
                                    <thead>
                                    <tr className={`border-b ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Room</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Description</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Priority</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Assignee</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Status</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Due Date</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Actions</th>
                                        </tr>
                                    </thead>
                                <tbody className="divide-y divide-gray-200/10">
                                    {filteredTasks.map(task => (
                                        <tr key={task.id} className={`${isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors duration-150`}>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                <span className={`px-2 py-1 rounded-full text-xs border ${isDarkMode ? 'bg-blue-900/30 text-blue-300 border-blue-700/50' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                                                    {task.room}
                                                </span>
                                                </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                                    {task.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs ${getPriorityColor(task.priority)} rounded-full border`}>
                                                            {task.priority}
                                                        </span>
                                                </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {task.assignee || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs ${getStatusColor(task.status)} rounded-full border`}>
                                                            {task.status}
                                                        </span>
                                                </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                        {task.due_date && new Date(task.due_date).toLocaleDateString()}
                                                </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex space-x-2">
                                                        <button 
                                                        className={`p-1.5 rounded-full ${isDarkMode ? 'bg-blue-900/30 text-blue-400 hover:text-blue-300 hover:bg-blue-800/50' : 'bg-blue-100/80 text-blue-600 hover:text-blue-700 hover:bg-blue-200/70'} transition-colors`}
                                                            onClick={() => handleEditTask(task)}
                                                        title="Edit Task"
                                                        >
                                                        <FontAwesomeIcon icon={faEdit} size={14} />
                                                        </button>
                                                        <button 
                                                        className={`p-1.5 rounded-full ${isDarkMode ? 'bg-red-900/30 text-red-400 hover:text-red-300 hover:bg-red-800/50' : 'bg-red-100/80 text-red-600 hover:text-red-700 hover:bg-red-200/70'} transition-colors`}
                                                            onClick={() => handleDeleteTask(task.id)}
                                                        title="Delete Task"
                                                        >
                                                        <FontAwesomeIcon icon={faTrash} size={14} />
                                                        </button>
                                                </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            )}
                    </Card>
                </div>
            </div>
            
            {/* Task Modal */}
            <TaskModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                task={currentTask}
                onSave={handleSaveTask}
            />
        </div>
    );
};

export default TasksPage;
