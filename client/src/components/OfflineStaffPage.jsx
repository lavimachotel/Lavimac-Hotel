import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FaUserPlus, FaCalendarAlt, FaChartLine, FaGraduationCap, FaClock, FaSearch, FaEdit, FaTrash, FaUsers } from 'react-icons/fa';
import OfflineSidebar from './OfflineSidebar';
import OfflineNavbar from './OfflineNavbar';
import { useTheme } from '../context/ThemeContext';
import OfflineStaffModal from './OfflineStaffModal';

const OfflineStaffPage = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('staff');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataFetched, setDataFetched] = useState(false);

  // Load staff data from localStorage
  const loadStaffData = useCallback(() => {
    setLoading(true);
    try {
      const savedStaff = localStorage.getItem('offline_staff');
      if (savedStaff) {
        setStaff(JSON.parse(savedStaff));
      } else {
        // Initialize with sample staff if none exist
        const sampleStaff = [
          {
            id: 1,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@hotel.com',
            phone: '+233 24 123 4567',
            position: 'Front Desk Manager',
            department: 'Front Desk',
            hire_date: '2023-01-15',
            salary: 3500,
            status: 'Active',
            avatar_url: null,
            address: '123 Main St, Accra',
            emergency_contact: 'Jane Doe - +233 24 765 4321',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 2,
            first_name: 'Sarah',
            last_name: 'Johnson',
            email: 'sarah.johnson@hotel.com',
            phone: '+233 24 234 5678',
            position: 'Housekeeping Supervisor',
            department: 'Housekeeping',
            hire_date: '2023-02-20',
            salary: 2800,
            status: 'Active',
            avatar_url: null,
            address: '456 Oak Ave, Kumasi',
            emergency_contact: 'Mike Johnson - +233 24 876 5432',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 3,
            first_name: 'Michael',
            last_name: 'Brown',
            email: 'michael.brown@hotel.com',
            phone: '+233 24 345 6789',
            position: 'Maintenance Technician',
            department: 'Maintenance',
            hire_date: '2023-03-10',
            salary: 2500,
            status: 'Active',
            avatar_url: null,
            address: '789 Pine St, Tamale',
            emergency_contact: 'Lisa Brown - +233 24 987 6543',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 4,
            first_name: 'Emma',
            last_name: 'Davis',
            email: 'emma.davis@hotel.com',
            phone: '+233 24 456 7890',
            position: 'Chef',
            department: 'Food & Beverage',
            hire_date: '2023-04-05',
            salary: 4000,
            status: 'Active',
            avatar_url: null,
            address: '321 Cedar Rd, Cape Coast',
            emergency_contact: 'David Davis - +233 24 098 7654',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setStaff(sampleStaff);
        localStorage.setItem('offline_staff', JSON.stringify(sampleStaff));
      }
      setDataFetched(true);
    } catch (error) {
      console.error('Error loading staff data:', error);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Staff Management - Offline Mode | Hotel Management System';
    
    if (!dataFetched) {
      loadStaffData();
    }
  }, [dataFetched, loadStaffData]);

  // Save staff data to localStorage whenever staff changes
  useEffect(() => {
    if (staff.length > 0 && dataFetched) {
      localStorage.setItem('offline_staff', JSON.stringify(staff));
    }
  }, [staff, dataFetched]);

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
      try {
        const updatedStaff = staff.filter(member => member.id !== id);
        setStaff(updatedStaff);
        localStorage.setItem('offline_staff', JSON.stringify(updatedStaff));
        console.log('Staff member deleted successfully');
      } catch (error) {
        console.error('Error deleting staff member:', error);
      }
    }
  };

  const handleSaveStaff = async (staffData) => {
    try {
      if (currentStaff) {
        // Update existing staff
        const updatedStaff = staff.map(member => 
          member.id === currentStaff.id 
            ? { ...staffData, id: currentStaff.id, updated_at: new Date().toISOString() }
            : member
        );
        setStaff(updatedStaff);
      } else {
        // Add new staff
        const newStaff = {
          ...staffData,
          id: Date.now(), // Simple ID generation for offline mode
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setStaff([...staff, newStaff]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving staff member:', error);
    }
  };

  // Filter staff based on search term
  const filteredStaff = React.useMemo(() => 
    staff.filter(member => 
      member.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.department?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [staff, searchTerm]);

  // Get staff statistics
  const activeStaff = staff.filter(member => member.status === 'Active');
  const departments = [...new Set(staff.map(member => member.department))];
  const totalSalaries = staff.reduce((sum, member) => sum + (member.salary || 0), 0);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'staff':
        return <StaffList staff={filteredStaff} onEdit={handleEditStaff} onDelete={handleDeleteStaff} isDarkMode={isDarkMode} />;
      case 'scheduling':
        return <SchedulingTab isDarkMode={isDarkMode} />;
      case 'performance':
        return <PerformanceTab isDarkMode={isDarkMode} />;
      case 'training':
        return <TrainingTab isDarkMode={isDarkMode} />;
      case 'timeAttendance':
        return <TimeAttendanceTab isDarkMode={isDarkMode} />;
      default:
        return <StaffList staff={filteredStaff} onEdit={handleEditStaff} onDelete={handleDeleteStaff} isDarkMode={isDarkMode} />;
    }
  };

  if (loading) {
    return (
      <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <OfflineSidebar activeLink="Staff" />
        <div className="flex-1 overflow-auto">
          <OfflineNavbar title="Staff Management - Offline Mode" />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading staff data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <OfflineSidebar activeLink="Staff" />
      <div className="flex-1 overflow-auto">
        <OfflineNavbar title="Staff Management - Offline Mode" />
        
        <div className="p-6">
          {/* Futuristic Header Section */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-3xl"></div>
            <div className="relative bg-white/10 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Staff Management - Offline Mode
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

          {/* Staff Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-center overflow-hidden relative`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
              <div className="flex items-center justify-center mb-3">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                  <FaUsers className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} text-xl`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{staff.length}</p>
              <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Total Staff</p>
            </div>
            
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-center overflow-hidden relative`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
              <div className="flex items-center justify-center mb-3">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                  <FaUserPlus className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} text-xl`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{activeStaff.length}</p>
              <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Active Staff</p>
            </div>
            
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-center overflow-hidden relative`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-600"></div>
              <div className="flex items-center justify-center mb-3">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                  <FaChartLine className={`${isDarkMode ? 'text-purple-400' : 'text-purple-600'} text-xl`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{departments.length}</p>
              <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Departments</p>
            </div>
            
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-center overflow-hidden relative`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600"></div>
              <div className="flex items-center justify-center mb-3">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-amber-900/30' : 'bg-amber-100'}`}>
                  <FaClock className={`${isDarkMode ? 'text-amber-400' : 'text-amber-600'} text-xl`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>GH₵{totalSalaries.toLocaleString()}</p>
              <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Total Salaries</p>
            </div>
          </div>

          {/* Futuristic Tab Navigation */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-xl blur-2xl"></div>
            <div className="relative bg-white/5 dark:bg-gray-800/30 backdrop-blur-lg rounded-xl p-1 border border-white/10 dark:border-gray-700/30">
              <div className="flex flex-wrap space-x-1">
                <TabButton 
                  id="staff" 
                  icon={FaUserPlus} 
                  label="Staff Directory" 
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab} 
                />
                <TabButton 
                  id="scheduling" 
                  icon={FaCalendarAlt} 
                  label="Scheduling" 
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab} 
                />
                <TabButton 
                  id="performance" 
                  icon={FaChartLine} 
                  label="Performance" 
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab} 
                />
                <TabButton 
                  id="training" 
                  icon={FaGraduationCap} 
                  label="Training" 
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab} 
                />
                <TabButton 
                  id="timeAttendance" 
                  icon={FaClock} 
                  label="Time & Attendance" 
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab} 
                />
              </div>
            </div>
          </div>

          {/* Search Bar for Staff Tab */}
          {activeTab === 'staff' && (
            <div className="mb-6">
              <div className="relative">
                <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  placeholder="Search staff by name, position, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="space-y-6">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Staff Modal */}
      {isModalOpen && (
        <OfflineStaffModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveStaff}
          staff={currentStaff}
        />
      )}
    </div>
  );
};

// Tab Button Component
const TabButton = ({ id, icon: Icon, label, activeTab, setActiveTab }) => (
  <button
    className={`py-3 px-4 font-medium rounded-lg transition-all duration-300 flex items-center space-x-2 ${
      activeTab === id
        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 dark:text-blue-300'
        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-white/5 dark:hover:bg-gray-700/10'
    }`}
    onClick={() => setActiveTab(id)}
  >
    <Icon className="text-lg" />
    <span>{label}</span>
  </button>
);

// Staff List Component
const StaffList = ({ staff, onEdit, onDelete, isDarkMode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {staff.map((member) => (
      <div key={member.id} className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} hover:shadow-xl transition-shadow duration-300`}>
        <div className="flex items-center mb-4">
          <div className={`w-12 h-12 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center mr-4`}>
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={`${member.first_name} ${member.last_name}`} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <span className={`text-lg font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {member.first_name.charAt(0)}{member.last_name.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {member.first_name} {member.last_name}
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{member.position}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(member)}
              className={`p-2 rounded ${isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'} transition-colors`}
            >
              <FaEdit />
            </button>
            <button
              onClick={() => onDelete(member.id)}
              className={`p-2 rounded ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700' : 'text-gray-500 hover:text-red-600 hover:bg-gray-100'} transition-colors`}
            >
              <FaTrash />
            </button>
          </div>
        </div>
        
        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} space-y-1`}>
          <p><strong>Department:</strong> {member.department}</p>
          <p><strong>Email:</strong> {member.email}</p>
          <p><strong>Phone:</strong> {member.phone}</p>
          <p><strong>Hired:</strong> {new Date(member.hire_date).toLocaleDateString()}</p>
          <p><strong>Salary:</strong> GH₵{member.salary?.toLocaleString()}</p>
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
            member.status === 'Active'
              ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
              : isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'
          }`}>
            {member.status}
          </span>
        </div>
      </div>
    ))}
    
    {staff.length === 0 && (
      <div className="col-span-full text-center py-12">
        <FaUsers className={`text-6xl ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-4 mx-auto`} />
        <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
          No staff members found
        </h3>
        <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          No staff members match your search criteria.
        </p>
      </div>
    )}
  </div>
);

// Placeholder tabs
const SchedulingTab = ({ isDarkMode }) => (
  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-8 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-center`}>
    <FaCalendarAlt className={`text-6xl ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-4 mx-auto`} />
    <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>Staff Scheduling</h3>
    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Schedule management features will be available here in offline mode.</p>
  </div>
);

const PerformanceTab = ({ isDarkMode }) => (
  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-8 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-center`}>
    <FaChartLine className={`text-6xl ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-4 mx-auto`} />
    <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>Performance Tracking</h3>
    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Performance evaluation features will be available here in offline mode.</p>
  </div>
);

const TrainingTab = ({ isDarkMode }) => (
  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-8 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-center`}>
    <FaGraduationCap className={`text-6xl ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-4 mx-auto`} />
    <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>Training Modules</h3>
    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Training and development features will be available here in offline mode.</p>
  </div>
);

const TimeAttendanceTab = ({ isDarkMode }) => (
  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-8 shadow-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-center`}>
    <FaClock className={`text-6xl ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-4 mx-auto`} />
    <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>Time & Attendance</h3>
    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Time tracking features will be available here in offline mode.</p>
  </div>
);

export default OfflineStaffPage; 