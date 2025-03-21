import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useTheme } from '../context/ThemeContext';
import TaskModal from './TaskModal';
import supabase from '../supabaseClient';

const TasksPage = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);

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
                
                // Fallback to localStorage
                const localTasksStr = localStorage.getItem('hotelTasks');
                if (localTasksStr) {
                    setTasks(JSON.parse(localTasksStr));
                }
            } else {
                setTasks(data || []);
                // Also save to localStorage as backup
                localStorage.setItem('hotelTasks', JSON.stringify(data));
            }
        } catch (err) {
            console.error('Unexpected error fetching tasks:', err);
            setError('Failed to load tasks. Please try again later.');
            
            // Fallback to localStorage
            const localTasksStr = localStorage.getItem('hotelTasks');
            if (localTasksStr) {
                setTasks(JSON.parse(localTasksStr));
            }
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
            
            // Update localStorage
            const localTasksStr = localStorage.getItem('hotelTasks');
            if (localTasksStr) {
                const localTasks = JSON.parse(localTasksStr);
                localStorage.setItem('hotelTasks', JSON.stringify(localTasks.filter(task => task.id !== taskId)));
            }
            
            // Add notification
            const notificationsStr = localStorage.getItem('hotelNotifications');
            const notifications = notificationsStr ? JSON.parse(notificationsStr) : [];
            
            notifications.unshift({
                type: 'info',
                title: 'Task Deleted',
                message: `Task has been removed from the system`,
                time: 'Just now',
                timestamp: new Date().toISOString()
            });
            
            localStorage.setItem('hotelNotifications', JSON.stringify(notifications.slice(0, 10)));
            
        } catch (err) {
            console.error('Error deleting task:', err);
            
            // Try deleting from localStorage as fallback
            const localTasksStr = localStorage.getItem('hotelTasks');
            if (localTasksStr) {
                const localTasks = JSON.parse(localTasksStr);
                const updatedTasks = localTasks.filter(task => task.id !== taskId);
                localStorage.setItem('hotelTasks', JSON.stringify(updatedTasks));
                setTasks(updatedTasks);
            }
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
                return isDarkMode ? 'bg-red-100 text-red-800' : 'bg-red-200 text-red-800';
            case 'Medium':
                return isDarkMode ? 'bg-yellow-100 text-yellow-800' : 'bg-yellow-200 text-yellow-800';
            case 'Low':
                return isDarkMode ? 'bg-green-100 text-green-800' : 'bg-green-200 text-green-800';
            default:
                return isDarkMode ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-800';
        }
    };

    // Get color for status badge
    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending':
                return isDarkMode ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-800';
            case 'In Progress':
                return isDarkMode ? 'bg-blue-100 text-blue-800' : 'bg-blue-200 text-blue-800';
            case 'Completed':
                return isDarkMode ? 'bg-green-100 text-green-800' : 'bg-green-200 text-green-800';
            case 'Cancelled':
                return isDarkMode ? 'bg-red-100 text-red-800' : 'bg-red-200 text-red-800';
            default:
                return isDarkMode ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-800';
        }
    };

    return (
        <div className={`flex h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>
            <Sidebar activeLink="Tasks" />
            <div className="flex-1 overflow-auto">
                <Navbar title="Task Management" />
                
                <div className="p-6">
                    <div className="grid grid-cols-1 gap-6 mb-6">
                        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow-sm`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Task Overview</h3>
                                <button 
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                                    onClick={handleAddTask}
                                >
                                    Add New Task
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                    <p>{error}</p>
                                </div>
                            )}

                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                </div>
                            ) : tasks.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No tasks available. Create a new task to get started.</p>
                                </div>
                            ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Room</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Description</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Priority</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Assignee</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Status</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Due Date</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`${isDarkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
                                        {tasks.map(task => (
                                            <tr key={task.id}>
                                                <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                                    {task.room}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                                    {task.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs ${getPriorityColor(task.priority)} rounded`}>
                                                            {task.priority}
                                                        </span>
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                                    {task.assignee}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs ${getStatusColor(task.status)} rounded`}>
                                                            {task.status}
                                                        </span>
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                                        {task.due_date && new Date(task.due_date).toLocaleDateString()}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                        <button 
                                                            className="text-blue-500 hover:text-blue-400 mr-3"
                                                            onClick={() => handleEditTask(task)}
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} />
                                                        </button>
                                                        <button 
                                                            className="text-red-500 hover:text-red-400"
                                                            onClick={() => handleDeleteTask(task.id)}
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            )}
                        </div>
                    </div>
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
