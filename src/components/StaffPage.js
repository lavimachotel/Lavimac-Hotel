import React, { useState, useEffect, useCallback } from 'react';
import { useStaff } from '../context/StaffContext';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import DashboardLayout from './DashboardLayout';
import { FaUserPlus, FaCalendarAlt, FaChartLine, FaGraduationCap, FaClock } from 'react-icons/fa';
import StaffList from './staff/StaffList';
import StaffScheduler from './staff/StaffScheduler';
import PerformanceTracking from './staff/PerformanceTracking';
import TrainingModules from './staff/TrainingModules';
import TimeAttendance from './staff/TimeAttendance';
import StaffModal from './staff/StaffModal';

const StaffPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { 
    staff, 
    loading, 
    fetchStaff,
    addStaff,
    updateStaff,
    deleteStaff
  } = useStaff();

  const [activeTab, setActiveTab] = useState('staff');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataFetched, setDataFetched] = useState(false);

  // Use useCallback to prevent creating a new function on each render
  const loadStaffData = useCallback(() => {
    // Only fetch if not already fetched or explicitly needed
    if (!dataFetched) {
      fetchStaff();
      setDataFetched(true);
    }
  }, [dataFetched, fetchStaff]);

  useEffect(() => {
    document.title = 'Staff Management | Hotel Management System';
    
    // Check if user has access to this page
    if (user && (user.role === 'admin' || user.role === 'manager' || user.role === 'hr')) {
      loadStaffData();
    } else {
      toast.error('You do not have permission to access this page');
      navigate('/dashboard');
    }
  }, [user, navigate, loadStaffData]);

  const handleAddStaff = () => {
    setCurrentStaff(null);
    setIsModalOpen(true);
  };

  const handleEditStaff = (staffMember) => {
    setCurrentStaff(staffMember);
    setIsModalOpen(true);
  };

  const handleDeleteStaff = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      const result = await deleteStaff(id);
      if (result.success) {
        toast.success('Staff member deleted successfully');
      }
    }
  };

  const handleSaveStaff = async (staffData) => {
    let result;
    
    if (currentStaff) {
      result = await updateStaff(currentStaff.id, staffData);
    } else {
      result = await addStaff(staffData);
    }
    
    if (result.success) {
      setIsModalOpen(false);
      // Only refetch data when needed
      fetchStaff();
    }
  };

  // Memoize this filtering operation to prevent unnecessary recalculations
  const filteredStaff = React.useMemo(() => 
    staff.filter(member => 
      member.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.department?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [staff, searchTerm]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'staff':
        return (
          <StaffList 
            staff={filteredStaff} 
            onEdit={handleEditStaff} 
            onDelete={handleDeleteStaff} 
          />
        );
      case 'scheduling':
        return <StaffScheduler />;
      case 'performance':
        return <PerformanceTracking />;
      case 'training':
        return <TrainingModules />;
      case 'timeAttendance':
        return <TimeAttendance />;
      default:
        return <StaffList staff={filteredStaff} onEdit={handleEditStaff} onDelete={handleDeleteStaff} />;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Staff Management</h1>
          {activeTab === 'staff' && (
            <button
              onClick={handleAddStaff}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md flex items-center"
            >
              <FaUserPlus className="mr-2" /> Add Staff
            </button>
          )}
        </div>

        <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            className={`mr-4 py-2 px-4 font-medium ${
              activeTab === 'staff'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('staff')}
          >
            <FaUserPlus className="inline mr-2" /> Staff Directory
          </button>
          <button
            className={`mr-4 py-2 px-4 font-medium ${
              activeTab === 'scheduling'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('scheduling')}
          >
            <FaCalendarAlt className="inline mr-2" /> Scheduling
          </button>
          <button
            className={`mr-4 py-2 px-4 font-medium ${
              activeTab === 'performance'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('performance')}
          >
            <FaChartLine className="inline mr-2" /> Performance
          </button>
          <button
            className={`mr-4 py-2 px-4 font-medium ${
              activeTab === 'training'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('training')}
          >
            <FaGraduationCap className="inline mr-2" /> Training
          </button>
          <button
            className={`mr-4 py-2 px-4 font-medium ${
              activeTab === 'timeAttendance'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('timeAttendance')}
          >
            <FaClock className="inline mr-2" /> Time & Attendance
          </button>
        </div>

        {activeTab === 'staff' && (
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search staff by name, position, or department..."
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>

      {isModalOpen && (
        <StaffModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveStaff}
          staff={currentStaff}
        />
      )}
    </DashboardLayout>
  );
};

export default StaffPage;
