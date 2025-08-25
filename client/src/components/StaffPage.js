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
      <div className="p-6">
        {/* Futuristic Header Section */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-3xl"></div>
          <div className="relative bg-white/10 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Staff Management
              </h1>
          {activeTab === 'staff' && (
            <button
              onClick={handleAddStaff}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2.5 px-6 rounded-xl flex items-center space-x-2 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-blue-500/25"
            >
                  <FaUserPlus className="text-lg" />
                  <span>Add Staff</span>
            </button>
          )}
            </div>
          </div>
        </div>

        {/* Futuristic Tab Navigation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-xl blur-2xl"></div>
          <div className="relative bg-white/5 dark:bg-gray-800/30 backdrop-blur-lg rounded-xl p-1 border border-white/10 dark:border-gray-700/30">
            <div className="flex flex-wrap space-x-1">
          <button
                className={`py-3 px-4 font-medium rounded-lg transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'staff'
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 dark:text-blue-300'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-white/5 dark:hover:bg-gray-700/10'
            }`}
            onClick={() => setActiveTab('staff')}
          >
                <FaUserPlus className="text-lg" />
                <span>Staff Directory</span>
          </button>
          <button
                className={`py-3 px-4 font-medium rounded-lg transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'scheduling'
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 dark:text-blue-300'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-white/5 dark:hover:bg-gray-700/10'
            }`}
            onClick={() => setActiveTab('scheduling')}
          >
                <FaCalendarAlt className="text-lg" />
                <span>Scheduling</span>
          </button>
          <button
                className={`py-3 px-4 font-medium rounded-lg transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'performance'
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 dark:text-blue-300'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-white/5 dark:hover:bg-gray-700/10'
            }`}
            onClick={() => setActiveTab('performance')}
          >
                <FaChartLine className="text-lg" />
                <span>Performance</span>
          </button>
          <button
                className={`py-3 px-4 font-medium rounded-lg transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'training'
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 dark:text-blue-300'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-white/5 dark:hover:bg-gray-700/10'
            }`}
            onClick={() => setActiveTab('training')}
          >
                <FaGraduationCap className="text-lg" />
                <span>Training</span>
          </button>
          <button
                className={`py-3 px-4 font-medium rounded-lg transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'timeAttendance'
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 dark:text-blue-300'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-white/5 dark:hover:bg-gray-700/10'
            }`}
            onClick={() => setActiveTab('timeAttendance')}
          >
                <FaClock className="text-lg" />
                <span>Time & Attendance</span>
          </button>
            </div>
          </div>
        </div>

        {/* Futuristic Search Bar */}
        {activeTab === 'staff' && (
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-xl"></div>
            <div className="relative">
            <input
              type="text"
              placeholder="Search staff by name, position, or department..."
                className="w-full p-4 bg-white/5 dark:bg-gray-800/30 backdrop-blur-lg rounded-xl border border-white/10 dark:border-gray-700/30 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-2xl"></div>
          <div className="relative bg-white/5 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl p-6 border border-white/10 dark:border-gray-700/30 shadow-lg">
        {loading ? (
          <div className="flex justify-center items-center h-64">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-blue-500 animate-spin"></div>
                  <div className="absolute inset-2 rounded-full border-r-2 border-l-2 border-purple-500 animate-spin animation-delay-150"></div>
                  <div className="absolute inset-4 rounded-full border-t-2 border-b-2 border-pink-500 animate-spin animation-delay-300"></div>
                </div>
          </div>
        ) : (
          renderTabContent()
        )}
          </div>
        </div>
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
