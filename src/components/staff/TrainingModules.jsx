import React, { useState, useEffect } from 'react';
import { useStaff } from '../../context/StaffContext';
import { FaGraduationCap, FaPlus, FaEdit, FaTrash, FaCheck, FaFilePdf, FaVideo, FaBook, FaLink, FaDownload } from 'react-icons/fa';
import { format, parseISO } from 'date-fns';

const TrainingModules = () => {
  const { 
    staff, 
    trainingModules = [], 
    staffTrainings = [],
    loading, 
    fetchStaff, 
    fetchTrainingModules,
    fetchStaffTrainings,
    addTrainingModule,
    assignTrainingToStaff,
    markTrainingComplete
  } = useStaff();
  
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [moduleFormData, setModuleFormData] = useState({
    title: '',
    description: '',
    category: 'onboarding',
    content_url: '',
    content_type: 'document',
    duration_minutes: 30,
    required_for_roles: []
  });
  const [assignFormData, setAssignFormData] = useState({
    staff_id: '',
    module_id: '',
    due_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') // Default due date: 1 week from now
  });

  useEffect(() => {
    fetchStaff();
    fetchTrainingModules();
    fetchStaffTrainings();
  }, [fetchStaff, fetchTrainingModules, fetchStaffTrainings]);

  // Filter modules by category
  const filteredModules = selectedCategory && trainingModules 
    ? trainingModules.filter(module => module.category === selectedCategory)
    : trainingModules || [];

  // Filter staff trainings by staff member
  const filteredStaffTrainings = selectedStaff && staffTrainings
    ? staffTrainings.filter(training => training.staff_id === selectedStaff)
    : staffTrainings || [];

  // Group staff trainings by module with null check
  const groupedTrainings = filteredStaffTrainings && filteredStaffTrainings.length > 0
    ? filteredStaffTrainings.reduce((acc, training) => {
        if (!acc[training.module_id]) {
          acc[training.module_id] = [];
        }
        acc[training.module_id].push(training);
        return acc;
      }, {})
    : {};

  const handleModuleModalOpen = () => {
    setModuleFormData({
      title: '',
      description: '',
      category: 'onboarding',
      content_url: '',
      content_type: 'document',
      duration_minutes: 30,
      required_for_roles: []
    });
    setIsModuleModalOpen(true);
  };

  const handleAssignModalOpen = (moduleId = null) => {
    setAssignFormData({
      staff_id: selectedStaff || '',
      module_id: moduleId || '',
      due_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    });
    setIsAssignModalOpen(true);
  };

  const handleModuleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'required_for_roles') {
      // Handle multi-select for roles
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      setModuleFormData({
        ...moduleFormData,
        [name]: selectedOptions
      });
    } else {
      setModuleFormData({
        ...moduleFormData,
        [name]: value
      });
    }
  };

  const handleAssignFormChange = (e) => {
    const { name, value } = e.target;
    setAssignFormData({
      ...assignFormData,
      [name]: value
    });
  };

  const handleModuleSubmit = async (e) => {
    e.preventDefault();
    const result = await addTrainingModule(moduleFormData);
    if (result.success) {
      setIsModuleModalOpen(false);
      fetchTrainingModules();
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    const result = await assignTrainingToStaff(assignFormData);
    if (result.success) {
      setIsAssignModalOpen(false);
      fetchStaffTrainings();
    }
  };

  const handleMarkComplete = async (trainingId) => {
    const result = await markTrainingComplete(trainingId);
    if (result.success) {
      fetchStaffTrainings();
    }
  };

  const getCategoryLabel = (category) => {
    const categories = {
      'onboarding': 'Onboarding',
      'safety': 'Safety & Security',
      'customer_service': 'Customer Service',
      'technical': 'Technical Skills',
      'compliance': 'Compliance',
      'management': 'Management',
      'software': 'Software Training'
    };
    return categories[category] || category;
  };

  const getContentTypeIcon = (contentType) => {
    switch (contentType) {
      case 'document':
        return <FaFilePdf className="text-red-500" />;
      case 'video':
        return <FaVideo className="text-blue-500" />;
      case 'course':
        return <FaBook className="text-green-500" />;
      case 'link':
        return <FaLink className="text-purple-500" />;
      default:
        return <FaFilePdf className="text-gray-500" />;
    }
  };

  const getTrainingStatus = (moduleId) => {
    if (!groupedTrainings[moduleId] || groupedTrainings[moduleId].length === 0) {
      return { status: 'not_assigned', label: 'Not Assigned', color: 'gray' };
    }

    const trainings = groupedTrainings[moduleId];
    const completed = trainings.some(t => t.completed);
    
    if (completed) {
      return { status: 'completed', label: 'Completed', color: 'green' };
    }
    
    const upcoming = trainings.find(t => new Date(t.due_date) > new Date());
    if (upcoming) {
      return { status: 'assigned', label: 'Assigned', color: 'blue' };
    }
    
    return { status: 'overdue', label: 'Overdue', color: 'red' };
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 md:mb-0">
          <FaGraduationCap className="inline mr-2" /> Training Modules
        </h2>
        
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">All Staff Members</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </option>
            ))}
          </select>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">All Categories</option>
            <option value="onboarding">Onboarding</option>
            <option value="safety">Safety & Security</option>
            <option value="customer_service">Customer Service</option>
            <option value="technical">Technical Skills</option>
            <option value="compliance">Compliance</option>
            <option value="management">Management</option>
            <option value="software">Software Training</option>
          </select>
          
          <button
            onClick={handleModuleModalOpen}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FaPlus className="mr-2" /> Add Training Module
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredModules.map((module) => {
            const trainingStatus = getTrainingStatus(module.id);
            
            return (
              <div key={module.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        {getContentTypeIcon(module.content_type)}
                        <h3 className="ml-2 text-lg font-medium text-gray-800 dark:text-white">
                          {module.title}
                        </h3>
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {getCategoryLabel(module.category)}
                        </span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {module.duration_minutes} min
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {selectedStaff && (
                        <button
                          onClick={() => handleAssignModalOpen(module.id)}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            trainingStatus.status === 'not_assigned'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {trainingStatus.status === 'not_assigned' ? 'Assign' : 'Reassign'}
                        </button>
                      )}
                      
                      {!selectedStaff && (
                        <button
                          onClick={() => handleAssignModalOpen(module.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                        >
                          Assign
                        </button>
                      )}
                      
                      <a
                        href={module.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center"
                      >
                        <FaDownload className="mr-1" /> View
                      </a>
                    </div>
                  </div>
                  
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {module.description}
                  </p>
                </div>
                
                {selectedStaff && groupedTrainings[module.id] && groupedTrainings[module.id].length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Training Status
                    </h4>
                    
                    {groupedTrainings[module.id].map((training) => (
                      <div key={training.id} className="flex justify-between items-center py-2">
                        <div>
                          <div className="flex items-center">
                            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                              training.completed 
                                ? 'bg-green-500' 
                                : new Date(training.due_date) < new Date() 
                                  ? 'bg-red-500' 
                                  : 'bg-blue-500'
                            }`}></span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {training.completed 
                                ? 'Completed' 
                                : `Due: ${format(parseISO(training.due_date), 'MMM d, yyyy')}`
                              }
                            </span>
                          </div>
                          {training.completed_date && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 ml-5">
                              Completed on: {format(parseISO(training.completed_date), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                        
                        {!training.completed && (
                          <button
                            onClick={() => handleMarkComplete(training.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center"
                          >
                            <FaCheck className="mr-1" /> Mark Complete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredModules.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">No training modules found</p>
              <button
                onClick={handleModuleModalOpen}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add First Training Module
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Training Module Modal */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Add Training Module
              </h2>
              <button 
                onClick={() => setIsModuleModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FaTrash size={20} />
              </button>
            </div>

            <form onSubmit={handleModuleSubmit} className="p-4">
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={moduleFormData.title}
                  onChange={handleModuleFormChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Training module title"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  name="description"
                  value={moduleFormData.description}
                  onChange={handleModuleFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Describe the training module"
                  rows="3"
                ></textarea>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                <select
                  name="category"
                  value={moduleFormData.category}
                  onChange={handleModuleFormChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="onboarding">Onboarding</option>
                  <option value="safety">Safety & Security</option>
                  <option value="customer_service">Customer Service</option>
                  <option value="technical">Technical Skills</option>
                  <option value="compliance">Compliance</option>
                  <option value="management">Management</option>
                  <option value="software">Software Training</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Content URL *</label>
                <input
                  type="url"
                  name="content_url"
                  value={moduleFormData.content_url}
                  onChange={handleModuleFormChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="URL to training content"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Content Type *</label>
                <select
                  name="content_type"
                  value={moduleFormData.content_type}
                  onChange={handleModuleFormChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="document">Document</option>
                  <option value="video">Video</option>
                  <option value="course">Online Course</option>
                  <option value="link">External Link</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Duration (minutes) *</label>
                <input
                  type="number"
                  name="duration_minutes"
                  value={moduleFormData.duration_minutes}
                  onChange={handleModuleFormChange}
                  required
                  min="1"
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Required for Roles</label>
                <select
                  name="required_for_roles"
                  value={moduleFormData.required_for_roles}
                  onChange={handleModuleFormChange}
                  multiple
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  size="4"
                >
                  <option value="manager">Manager</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="housekeeper">Housekeeper</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="chef">Chef</option>
                  <option value="waiter">Waiter</option>
                  <option value="security">Security</option>
                  <option value="all">All Staff</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Hold Ctrl/Cmd to select multiple roles
                </p>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setIsModuleModalOpen(false)}
                  className="mr-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Training Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Assign Training
              </h2>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FaTrash size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-4">
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Staff Member *</label>
                <select
                  name="staff_id"
                  value={assignFormData.staff_id}
                  onChange={handleAssignFormChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select Staff Member</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name} - {member.position}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Training Module *</label>
                <select
                  name="module_id"
                  value={assignFormData.module_id}
                  onChange={handleAssignFormChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select Training Module</option>
                  {trainingModules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title} ({getCategoryLabel(module.category)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
                <input
                  type="date"
                  name="due_date"
                  value={assignFormData.due_date}
                  onChange={handleAssignFormChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="mr-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingModules;
