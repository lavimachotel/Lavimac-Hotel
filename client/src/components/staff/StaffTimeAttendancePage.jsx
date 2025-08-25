import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useStaff } from '../../context/StaffContext';
import { format, parseISO, differenceInMinutes, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { FaClock, FaPlay, FaStop, FaFilter, FaCalendarAlt, FaFileExport, FaArrowRight, 
  FaUserClock, FaListAlt, FaChartBar, FaRegCalendarCheck, FaUsersCog, FaHome, FaSignOutAlt } from 'react-icons/fa';
import ThemeToggle from '../ThemeToggle';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

const StaffTimeAttendancePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logoutUser } = useUser();
  const { staff, timeEntries, loading, fetchStaff, fetchTimeEntries, recordTimeEntry, updateTimeEntries } = useStaff();
  
  const [clockType, setClockType] = useState('in');
  const [note, setNote] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [filterStaff, setFilterStaff] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd')
  });
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'summary'
  const [animateCards, setAnimateCards] = useState(true);
  const [lastClockAction, setLastClockAction] = useState(null); // To track the most recent clock action

  // Find the staff record that matches the current user
  const currentStaffMember = staff.find(
    s => user && (s.email === user.email || `${s.first_name} ${s.last_name}` === user.fullName)
  );

  useEffect(() => {
    document.title = 'Time & Attendance | Hotel Management System';
    
    // Fetch staff data
    fetchStaff();
    
    // If current user is staff, pre-select their record
    if (currentStaffMember) {
      setSelectedStaff(currentStaffMember.id);
    }
    
    // Load time entries with initial filters
    loadTimeEntries();
    
    // Check if user is admin/manager, redirect if needed
    if (user && (user.role === 'admin' || user.role === 'manager')) {
      navigate('/dashboard');
    }

    // Check if we were directed here from the End Shift button
    if (location.state?.clockType === 'out') {
      setClockType('out');
    }
  }, [user, navigate, fetchStaff, currentStaffMember, location.state]);

  const loadTimeEntries = () => {
    fetchTimeEntries(
      filterStaff || null,
      dateRange.startDate,
      dateRange.endDate
    );
  };

  // Reload entries when filters change or after a clock in/out action
  useEffect(() => {
    loadTimeEntries();
  }, [filterStaff, dateRange]);

  const handleClockInOut = async () => {
    if (!selectedStaff) {
      toast.error('Please select a staff member');
      return;
    }

    // Find the selected staff member in the staff directory
    const staffMember = staff.find(member => member.id === selectedStaff);
    if (!staffMember) {
      toast.error('Selected staff member not found in directory');
      return;
    }

    const currentDate = format(new Date(), 'yyyy-MM-dd');
    const currentTime = format(new Date(), 'HH:mm:ss');
    
    const entryData = {
      staff_id: selectedStaff,
      entry_type: clockType,
      entry_date: currentDate,
      entry_time: currentTime,
      notes: note,
      location: 'Main Office',
    };

    // Create optimistic update to show immediately
    const newEntry = {
      ...entryData,
      id: `temp-${Date.now()}`, // Temporary ID until real one comes back
      staff: {
        id: staffMember.id,
        first_name: staffMember.first_name,
        last_name: staffMember.last_name,
        position: staffMember.position
      },
    };

    // Apply optimistic update to timeEntries
    const updatedEntries = [...timeEntries, newEntry];
    // Update time entries optimistically
    updateTimeEntries(updatedEntries);
    
    // Store details of the last clock action for highlighting
    setLastClockAction({
      staffId: selectedStaff,
      date: currentDate,
      time: currentTime,
      type: clockType,
      staffName: `${staffMember.first_name} ${staffMember.last_name}`
    });
    
    // Auto-switch to the other clock type for convenience
    setClockType(clockType === 'in' ? 'out' : 'in');
    
    // Auto-set filter to the current staff member to see their entries
    setFilterStaff(selectedStaff);
    
    // Adjust date range to include today if needed
    const today = format(new Date(), 'yyyy-MM-dd');
    if (today < dateRange.startDate || today > dateRange.endDate) {
      setDateRange({
        startDate: today,
        endDate: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd')
      });
    }
    
    // Reset form
    setNote('');

    // Make API call
    try {
      const result = await recordTimeEntry(entryData);
      if (!result.success) {
        toast.error('Failed to record time entry');
        // Reload time entries to revert optimistic update on failure
        loadTimeEntries();
      }
    } catch (error) {
      console.error('Error recording time entry:', error);
      toast.error('An error occurred while recording time entry');
      // Reload time entries to revert optimistic update on error
      loadTimeEntries();
    }
  };

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logoutUser();
    toast.success('Logged out successfully');
  };

  const calculateDuration = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return 'N/A';
    
    const inTime = parseISO(`${clockIn.entry_date}T${clockIn.entry_time}`);
    const outTime = parseISO(`${clockOut.entry_date}T${clockOut.entry_time}`);
    
    const minutes = differenceInMinutes(outTime, inTime);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m`;
  };

  // Group time entries by staff member and date, ensuring staff data is pulled from staff directory
  const groupedEntries = timeEntries.reduce((acc, entry) => {
    const staffId = entry.staff_id;
    const date = entry.entry_date;
    const key = `${staffId}-${date}`;
    
    // Find the staff member in the staff directory for accurate data
    const staffMember = staff.find(s => s.id === staffId);
    const staffName = staffMember 
      ? `${staffMember.first_name} ${staffMember.last_name}`
      : `${entry.staff?.first_name || ''} ${entry.staff?.last_name || ''}`;
    
    if (!acc[key]) {
      acc[key] = {
        staffId,
        date,
        staffName,
        entries: []
      };
    }
    
    acc[key].entries.push(entry);
    return acc;
  }, {});

  // Sort entries by date and type for each staff-date group
  Object.values(groupedEntries).forEach(group => {
    group.entries.sort((a, b) => {
      // First by time
      const aTime = `${a.entry_date}T${a.entry_time}`;
      const bTime = `${b.entry_date}T${b.entry_time}`;
      return aTime.localeCompare(bTime);
    });
    
    // Find clock in and clock out entries
    group.clockIn = group.entries.find(e => e.entry_type === 'in');
    group.clockOut = group.entries.find(e => e.entry_type === 'out');
    
    // Calculate duration if both clock in and out exist
    if (group.clockIn && group.clockOut) {
      group.duration = calculateDuration(group.clockIn, group.clockOut);
    }
  });

  // For the summary view, ensure staff data comes from staff directory
  const calculateWeeklySummary = () => {
    const summary = {};
    
    // Initialize summary for each staff member directly from staff directory
    staff.forEach(member => {
      summary[member.id] = {
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        position: member.position,
        totalMinutes: 0,
        dailyHours: Array(7).fill(0), // One entry per day of the week
        clockInCount: 0
      };
    });
    
    // Calculate total minutes for each staff member
    Object.values(groupedEntries).forEach(group => {
      if (group.clockIn && group.clockOut && summary[group.staffId]) {
        const inTime = parseISO(`${group.clockIn.entry_date}T${group.clockIn.entry_time}`);
        const outTime = parseISO(`${group.clockOut.entry_date}T${group.clockOut.entry_time}`);
        const minutes = differenceInMinutes(outTime, inTime);
        
        summary[group.staffId].totalMinutes += minutes;
        summary[group.staffId].clockInCount++;
        
        // Add to daily hours
        const date = parseISO(group.date);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        summary[group.staffId].dailyHours[dayOfWeek] += minutes / 60;
      }
    });
    
    return Object.values(summary);
  };

  const weeklySummary = calculateWeeklySummary();

  // Generate days of the week for the summary view
  const weekStart = parseISO(dateRange.startDate);
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));

  const exportTimesheet = () => {
    // Check if there are any entries to export
    if (Object.keys(groupedEntries).length === 0) {
      toast.error('No time entries to export');
      return;
    }

    try {
      // Create worksheet data
      const worksheetData = [];
      
      // Add headers
      worksheetData.push([
        'Staff Name', 
        'Position', 
        'Date', 
        'Day', 
        'Clock In', 
        'Clock Out', 
        'Duration', 
        'Notes'
      ]);
      
      // Add data rows
      Object.values(groupedEntries).forEach(group => {
        const staffMemberDetails = staff.find(s => s.id === group.staffId);
        const staffPosition = staffMemberDetails?.position || 'Staff Member';
        const formattedDate = format(parseISO(group.date), 'MMM d, yyyy');
        const dayOfWeek = format(parseISO(group.date), 'EEEE');
        const clockInTime = group.clockIn ? group.clockIn.entry_time : 'Not clocked in';
        const clockOutTime = group.clockOut ? group.clockOut.entry_time : 'Not clocked out';
        const duration = group.duration || 'N/A';
        const notes = group.entries.map(e => e.notes).filter(Boolean).join(', ');
        
        worksheetData.push([
          group.staffName,
          staffPosition,
          formattedDate,
          dayOfWeek,
          clockInTime,
          clockOutTime,
          duration,
          notes
        ]);
      });
      
      // Create workbook and worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      const columnWidths = [
        { wch: 20 }, // Staff Name
        { wch: 20 }, // Position
        { wch: 12 }, // Date
        { wch: 10 }, // Day
        { wch: 10 }, // Clock In
        { wch: 10 }, // Clock Out
        { wch: 10 }, // Duration
        { wch: 40 }  // Notes
      ];
      
      worksheet['!cols'] = columnWidths;
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Entries');
      
      // Generate filename with current date
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      let filename = `Timesheet_${currentDate}`;
      
      // If filtering by a specific staff member, add their name to the filename
      if (filterStaff) {
        const filteredStaffMember = staff.find(s => s.id === filterStaff);
        if (filteredStaffMember) {
          const staffName = `${filteredStaffMember.first_name}_${filteredStaffMember.last_name}`;
          filename += `_${staffName}`;
        }
      }
      
      // Export to Excel file
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      
      toast.success('Timesheet exported successfully');
    } catch (error) {
      console.error('Error exporting timesheet:', error);
      toast.error('Failed to export timesheet');
    }
  };

  const renderListView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700 dark:divide-gray-700 light:divide-gray-300 border-collapse">
        <thead>
          <tr className="bg-gray-900 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 light:bg-blue-100 light:bg-opacity-50">
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-300 dark:text-blue-300 light:text-blue-700 border-b border-gray-700 dark:border-gray-700 light:border-gray-300">
              Staff Member
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-300 dark:text-blue-300 light:text-blue-700 border-b border-gray-700 dark:border-gray-700 light:border-gray-300">
              Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-300 dark:text-blue-300 light:text-blue-700 border-b border-gray-700 dark:border-gray-700 light:border-gray-300">
              Clock In
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-300 dark:text-blue-300 light:text-blue-700 border-b border-gray-700 dark:border-gray-700 light:border-gray-300">
              Clock Out
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-300 dark:text-blue-300 light:text-blue-700 border-b border-gray-700 dark:border-gray-700 light:border-gray-300">
              Duration
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-300 dark:text-blue-300 light:text-blue-700 border-b border-gray-700 dark:border-gray-700 light:border-gray-300">
              Notes
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-800 bg-opacity-30 dark:bg-gray-800 dark:bg-opacity-30 light:bg-white light:bg-opacity-70 divide-y divide-gray-700 dark:divide-gray-700 light:divide-gray-200">
          {Object.values(groupedEntries).map((group, index) => {
            // Find the staff member in the directory to get additional details
            const staffMemberDetails = staff.find(s => s.id === group.staffId);
            const staffPosition = staffMemberDetails?.position || '';
            
            // Check if this entry corresponds to the last clock action (for highlighting)
            const isRecentClockAction = 
              lastClockAction && 
              lastClockAction.staffId === group.staffId && 
              lastClockAction.date === group.date;
            
            return (
              <tr 
                key={index}
                className={`hover:bg-gray-700 dark:hover:bg-gray-700 light:hover:bg-blue-50 transition-all duration-150 ${isRecentClockAction ? 'bg-blue-900 bg-opacity-20 dark:bg-blue-900 dark:bg-opacity-20 light:bg-blue-100 light:bg-opacity-50' : ''}`}
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                  animationDuration: "0.2s",
                  animationFillMode: "both"
                }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`${isRecentClockAction ? 'bg-blue-600 dark:bg-blue-600 light:bg-blue-500' : 'bg-indigo-600 dark:bg-indigo-600 light:bg-indigo-500'} h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium text-white ${isRecentClockAction ? 'ring-2 ring-blue-300 dark:ring-blue-300 light:ring-blue-400' : ''}`}>
                      {group.staffName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-white dark:text-white light:text-gray-900">
                        {group.staffName}
                        {isRecentClockAction && (
                          <span className="ml-2 text-xs bg-blue-600 dark:bg-blue-600 light:bg-blue-500 text-white px-2 py-0.5 rounded-full">
                            Recent
                          </span>
                        )}
                      </div>
                      {staffPosition && (
                        <div className="text-xs text-blue-300 dark:text-blue-300 light:text-blue-600">
                          {staffPosition}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-white dark:text-white light:text-gray-800">
                    {format(parseISO(group.date), 'MMM d, yyyy')}
                  </div>
                  <div className="text-xs text-blue-300 dark:text-blue-300 light:text-blue-600">
                    {format(parseISO(group.date), 'EEEE')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {group.clockIn ? (
                    <div className="flex items-center">
                      <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                      <div className={`text-sm font-medium ${isRecentClockAction && lastClockAction.type === 'in' ? 'text-green-300 dark:text-green-300 light:text-green-600' : 'text-white dark:text-white light:text-gray-800'}`}>
                        {group.clockIn.entry_time}
                        {isRecentClockAction && lastClockAction.type === 'in' && (
                          <span className="ml-2 text-xs bg-green-700 dark:bg-green-700 light:bg-green-600 text-white px-1.5 py-0.5 rounded">New</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="h-2 w-2 bg-gray-500 rounded-full mr-2"></div>
                      <div className="text-sm text-gray-400 dark:text-gray-400 light:text-gray-500">
                        Not clocked in
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {group.clockOut ? (
                    <div className="flex items-center">
                      <div className="h-2 w-2 bg-red-500 rounded-full mr-2"></div>
                      <div className={`text-sm font-medium ${isRecentClockAction && lastClockAction.type === 'out' ? 'text-red-300 dark:text-red-300 light:text-red-600' : 'text-white dark:text-white light:text-gray-800'}`}>
                        {group.clockOut.entry_time}
                        {isRecentClockAction && lastClockAction.type === 'out' && (
                          <span className="ml-2 text-xs bg-red-700 dark:bg-red-700 light:bg-red-600 text-white px-1.5 py-0.5 rounded">New</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="h-2 w-2 bg-gray-500 rounded-full mr-2"></div>
                      <div className="text-sm text-gray-400 dark:text-gray-400 light:text-gray-500">
                        Not clocked out
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {group.duration ? (
                    <div className="text-sm text-white dark:text-white light:text-gray-800 font-medium px-3 py-1 bg-indigo-900 bg-opacity-50 dark:bg-indigo-900 dark:bg-opacity-50 light:bg-indigo-100 light:bg-opacity-70 rounded-full inline-block">
                      {group.duration}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 dark:text-gray-400 light:text-gray-500">
                      N/A
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-300 dark:text-gray-300 light:text-gray-600 max-w-xs truncate">
                    {group.entries.map(e => e.notes).filter(Boolean).join(', ')}
                  </div>
                </td>
              </tr>
            );
          })}
          {Object.keys(groupedEntries).length === 0 && (
            <tr>
              <td colSpan="6" className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-400 light:text-gray-500">
                  <FaClock className="text-4xl mb-3 text-gray-600 dark:text-gray-600 light:text-gray-400" />
                  <p className="text-lg font-medium">No time entries found</p>
                  <p className="text-sm">Try adjusting your filter criteria</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderSummaryView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700 dark:divide-gray-700 light:divide-gray-300 border-collapse">
        <thead>
          <tr className="bg-gray-900 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 light:bg-blue-100 light:bg-opacity-50">
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-300 dark:text-blue-300 light:text-blue-700 border-b border-gray-700 dark:border-gray-700 light:border-gray-300">
              Staff Member
            </th>
            {weekDays.map((day, index) => (
              <th key={index} scope="col" className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-blue-300 dark:text-blue-300 light:text-blue-700 border-b border-gray-700 dark:border-gray-700 light:border-gray-300">
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold">{format(day, 'EEE')}</span>
                  <span className="text-xs opacity-80 font-normal">{format(day, 'MMM d')}</span>
                </div>
              </th>
            ))}
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-blue-300 dark:text-blue-300 light:text-blue-700 border-b border-gray-700 dark:border-gray-700 light:border-gray-300">
              Total Hours
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-800 bg-opacity-30 dark:bg-gray-800 dark:bg-opacity-30 light:bg-white light:bg-opacity-70 divide-y divide-gray-700 dark:divide-gray-700 light:divide-gray-200">
          {weeklySummary.map((summary, index) => (
            <tr 
              key={index}
              className="hover:bg-gray-700 dark:hover:bg-gray-700 light:hover:bg-blue-50 transition-all duration-150"
              style={{ 
                animationDelay: `${index * 0.05}s`,
                animationDuration: "0.2s",
                animationFillMode: "both"
              }}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="bg-indigo-600 dark:bg-indigo-600 light:bg-indigo-500 h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium text-white">
                    {summary.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-white dark:text-white light:text-gray-900">
                      {summary.name}
                    </div>
                    <div className="text-xs text-blue-300 dark:text-blue-300 light:text-blue-600">
                      {summary.position}
                    </div>
                  </div>
                </div>
              </td>
              {summary.dailyHours.map((hours, dayIndex) => (
                <td key={dayIndex} className="px-4 py-4 whitespace-nowrap text-center">
                  {hours > 0 ? (
                    <div className="inline-flex items-center justify-center">
                      <div 
                        className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium text-white"
                        style={{ 
                          backgroundColor: hours > 8 ? '#4F46E5' : hours > 4 ? '#6366F1' : '#818CF8',
                          opacity: Math.min(0.4 + (hours / 10), 1)
                        }}
                      >
                        {hours.toFixed(1)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">-</div>
                  )}
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="text-sm font-bold text-white dark:text-white light:text-gray-800 bg-indigo-900 bg-opacity-60 dark:bg-indigo-900 dark:bg-opacity-60 light:bg-indigo-100 light:bg-opacity-70 px-3 py-1 rounded-full inline-block">
                  {(summary.totalMinutes / 60).toFixed(1)} hrs
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-500 mt-1">
                  {summary.clockInCount} shifts
                </div>
              </td>
            </tr>
          ))}
          {weeklySummary.length === 0 && (
            <tr>
              <td colSpan={9} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-400 light:text-gray-500">
                  <FaChartBar className="text-4xl mb-3 text-gray-600 dark:text-gray-600 light:text-gray-400" />
                  <p className="text-lg font-medium">No time data available</p>
                  <p className="text-sm">Try adjusting your date range</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-dark-gradient dark:bg-dark-gradient light:bg-light-gradient">
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-900 dark:to-gray-800 light:from-blue-50 light:to-gray-100 text-white dark:text-white light:text-gray-800 staff-time-attendance-page">
        {/* Enhanced header with gradient and better spacing */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 light:from-blue-100 light:via-blue-50 light:to-blue-100 px-8 py-4 flex flex-col md:flex-row justify-between items-center border-b border-gray-700 dark:border-gray-700 light:border-blue-200 shadow-lg">
          <div className="flex items-center mb-3 md:mb-0">
            <div className="bg-blue-600 light:bg-blue-500 p-2 rounded-lg mr-3 shadow-md">
              <FaUserClock className="text-white light:text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white light:text-gray-800 tracking-tight">Time & Attendance</h1>
              <p className="text-blue-300 light:text-blue-600 text-sm font-medium">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <button 
              className="flex items-center space-x-1 px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-600 light:bg-blue-600 light:hover:bg-blue-500 transition"
              onClick={goToDashboard}
            >
              <FaHome className="mr-1" />
              <span>Dashboard</span>
            </button>
            <button 
              className="flex items-center space-x-1 px-3 py-1 rounded bg-red-600 hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600 light:bg-red-600 light:hover:bg-red-500 transition"
              onClick={handleLogout}
            >
              <FaSignOutAlt className="mr-1" />
              <span>Logout</span>
            </button>
          </div>
        </div>
        
        {/* Database Storage Notice */}
        <div className="bg-green-600 bg-opacity-90 dark:bg-green-700 dark:bg-opacity-90 light:bg-green-500 light:bg-opacity-80 text-white px-4 py-1 text-center text-sm shadow">
          <p className="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
            </svg>
            All time entries are now securely stored in the database for accurate record keeping
          </p>
        </div>

        <div className="container mx-auto px-4 md:px-8 py-8 animate-fadeIn flex flex-col"
          style={{ animation: 'fadeIn 0.5s ease-in-out' }}
        >
          {/* Top Section - Clock In/Out and Filter Cards Side by Side */}
          <section className="w-full mb-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Clock In/Out Card */}
              <div 
                className="bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-800 dark:to-gray-900 light:from-white light:to-blue-50 rounded-xl p-6 shadow-xl border border-gray-700 dark:border-gray-700 light:border-gray-200 transform transition-all duration-300"
                style={{ 
                  animation: 'fadeInUp 0.3s ease-out',
                  animationFillMode: 'both'
                }}
              >
                <h2 className="text-xl font-medium text-white light:text-gray-800 mb-5 flex items-center">
                  <div className="bg-green-600 light:bg-green-500 p-1.5 rounded mr-3 shadow">
                    <FaClock className="text-white" />
                  </div>
                  Clock In/Out
                </h2>
                
                <div className="mb-5">
                  <label className="block text-blue-300 light:text-blue-600 mb-2 font-medium">Staff Member</label>
                  <div className="relative">
                    <select
                      value={selectedStaff}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                      className="w-full p-3 border border-gray-600 dark:border-gray-600 light:border-gray-300 rounded-lg bg-gray-800 dark:bg-gray-800 light:bg-white text-white dark:text-white light:text-gray-800 shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select Staff Member</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.first_name} {member.last_name} - {member.position || 'Staff Member'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mb-5">
                  <label className="block text-blue-300 light:text-blue-600 mb-2 font-medium">Action</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setClockType('in')}
                      className={`py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-200 shadow-md transform hover:scale-103 active:scale-97 ${
                        clockType === 'in'
                          ? 'bg-gradient-to-r from-green-600 to-green-700 light:from-green-500 light:to-green-600 text-white'
                          : 'bg-gray-700 dark:bg-gray-700 light:bg-gray-200 text-gray-300 dark:text-gray-300 light:text-gray-700 hover:bg-gray-600 light:hover:bg-gray-300'
                      }`}
                    >
                      <FaPlay className="mr-2" /> Clock In
                    </button>
                    <button
                      type="button"
                      onClick={() => setClockType('out')}
                      className={`py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-200 shadow-md transform hover:scale-103 active:scale-97 ${
                        clockType === 'out'
                          ? 'bg-gradient-to-r from-red-600 to-red-700 light:from-red-500 light:to-red-600 text-white clock-out-pulse'
                          : 'bg-gray-700 dark:bg-gray-700 light:bg-gray-200 text-gray-300 dark:text-gray-300 light:text-gray-700 hover:bg-gray-600 light:hover:bg-gray-300'
                      }`}
                    >
                      <FaStop className="mr-2" /> Clock Out
                    </button>
                  </div>
                </div>
                
                <div className="mb-5">
                  <label className="block text-blue-300 light:text-blue-600 mb-2 font-medium">Note (Optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-3 border border-gray-600 dark:border-gray-600 light:border-gray-300 rounded-lg bg-gray-800 dark:bg-gray-800 light:bg-white text-white dark:text-white light:text-gray-800 shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Add a note about this time entry..."
                    rows="3"
                  ></textarea>
                </div>
                
                <button
                  onClick={handleClockInOut}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 light:from-blue-500 light:to-blue-600 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 light:hover:from-blue-600 light:hover:to-blue-700 shadow-lg flex items-center justify-center transition-all duration-200 transform hover:scale-102 active:scale-98"
                >
                  <FaClock className="mr-2" /> Record Time
                </button>
              </div>

              {/* Filter Time Entries Card */}
              <div 
                className="bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-800 dark:to-gray-900 light:from-white light:to-blue-50 rounded-xl p-6 shadow-xl border border-gray-700 dark:border-gray-700 light:border-gray-200 transform transition-all duration-300"
                style={{ 
                  animation: 'fadeInUp 0.3s ease-out 0.1s',
                  animationFillMode: 'both'
                }}
              >
                <h2 className="text-xl font-medium text-white light:text-gray-800 mb-5 flex items-center">
                  <div className="bg-blue-600 light:bg-blue-500 p-1.5 rounded mr-3 shadow">
                    <FaFilter className="text-white" />
                  </div>
                  Filter Time Entries
                </h2>
                
                <div className="mb-5">
                  <label className="block text-blue-300 light:text-blue-600 mb-2 font-medium">Staff Member</label>
                  <select
                    value={filterStaff}
                    onChange={(e) => setFilterStaff(e.target.value)}
                    className="w-full p-3 border border-gray-600 dark:border-gray-600 light:border-gray-300 rounded-lg bg-gray-800 dark:bg-gray-800 light:bg-white text-white dark:text-white light:text-gray-800 shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">All Staff Members</option>
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name} - {member.position || 'Staff Member'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-blue-300 light:text-blue-600 mb-2 font-medium">Start Date</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaCalendarAlt className="text-blue-400 light:text-blue-500" />
                      </div>
                      <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                        className="pl-10 w-full p-3 border border-gray-600 dark:border-gray-600 light:border-gray-300 rounded-lg bg-gray-800 dark:bg-gray-800 light:bg-white text-white dark:text-white light:text-gray-800 shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-blue-300 light:text-blue-600 mb-2 font-medium">End Date</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaCalendarAlt className="text-blue-400 light:text-blue-500" />
                      </div>
                      <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                        className="pl-10 w-full p-3 border border-gray-600 dark:border-gray-600 light:border-gray-300 rounded-lg bg-gray-800 dark:bg-gray-800 light:bg-white text-white dark:text-white light:text-gray-800 shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                  <div className="flex space-x-2 bg-gray-900 dark:bg-gray-900 light:bg-gray-200 p-1 rounded-lg">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`py-2 px-4 rounded-md flex items-center transition-all duration-200 transform hover:scale-103 active:scale-97 ${
                        viewMode === 'list'
                          ? 'bg-blue-600 light:bg-blue-500 text-white shadow'
                          : 'bg-transparent text-gray-300 dark:text-gray-300 light:text-gray-600 hover:text-white dark:hover:text-white light:hover:text-gray-900'
                      }`}
                    >
                      <FaListAlt className="mr-2" /> List View
                    </button>
                    <button
                      onClick={() => setViewMode('summary')}
                      className={`py-2 px-4 rounded-md flex items-center transition-all duration-200 transform hover:scale-103 active:scale-97 ${
                        viewMode === 'summary'
                          ? 'bg-blue-600 light:bg-blue-500 text-white shadow'
                          : 'bg-transparent text-gray-300 dark:text-gray-300 light:text-gray-600 hover:text-white dark:hover:text-white light:hover:text-gray-900'
                      }`}
                    >
                      <FaChartBar className="mr-2" /> Summary
                    </button>
                  </div>
                  <button
                    onClick={exportTimesheet}
                    className="py-2 px-4 bg-gradient-to-r from-green-600 to-green-700 light:from-green-500 light:to-green-600 text-white rounded-lg hover:from-green-700 hover:to-green-800 light:hover:from-green-600 light:hover:to-green-700 shadow flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95"
                  >
                    <FaFileExport className="mr-2" /> Export Data
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom Section - Time Entries in its own row */}
          <section className="w-full mt-4 border-t border-gray-700 dark:border-gray-700 light:border-gray-300 pt-8">
            <div 
              className="bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-800 dark:to-gray-900 light:from-white light:to-blue-50 rounded-xl p-6 shadow-xl border border-gray-700 dark:border-gray-700 light:border-gray-200"
              style={{ 
                animation: 'fadeInUp 0.3s ease-out 0.2s',
                animationFillMode: 'both'
              }}
            >
              <h2 className="text-xl font-medium text-white light:text-gray-800 mb-6 flex items-center border-b border-gray-700 dark:border-gray-700 light:border-gray-300 pb-4">
                <div className="bg-indigo-600 light:bg-indigo-500 p-1.5 rounded mr-3 shadow">
                  <FaRegCalendarCheck className="text-white" />
                </div>
                Time Entries
                <span className="ml-3 text-xs bg-gray-700 dark:bg-gray-700 light:bg-gray-200 text-gray-300 dark:text-gray-300 light:text-gray-700 px-2 py-1 rounded-full">
                  {Object.keys(groupedEntries).length} Records
                </span>
              </h2>
              
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-blue-400 light:text-blue-500">Loading time records...</span>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg">
                  {viewMode === 'list' ? renderListView() : renderSummaryView()}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeInUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulseOutline {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        
        .clock-out-pulse {
          animation: pulseOutline 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default StaffTimeAttendancePage;