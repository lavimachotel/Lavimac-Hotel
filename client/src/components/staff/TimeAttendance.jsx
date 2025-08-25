import React, { useState, useEffect } from 'react';
import { useStaff } from '../../context/StaffContext';
import { FaClock, FaPlay, FaStop, FaFileExport, FaFilter, FaCalendarAlt } from 'react-icons/fa';
import { format, parseISO, differenceInMinutes, startOfWeek, endOfWeek, addDays } from 'date-fns';

const TimeAttendance = () => {
  const { staff, timeEntries, loading, fetchStaff, fetchTimeEntries, recordTimeEntry } = useStaff();
  const [selectedStaff, setSelectedStaff] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfWeek(new Date()), 'yyyy-MM-dd')
  });
  const [clockingStaff, setClockingStaff] = useState('');
  const [clockType, setClockType] = useState('in');
  const [note, setNote] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'summary'

  useEffect(() => {
    fetchStaff();
    loadTimeEntries();
  }, [selectedStaff, dateRange]);

  const loadTimeEntries = () => {
    fetchTimeEntries(
      selectedStaff || null,
      dateRange.startDate,
      dateRange.endDate
    );
  };

  const handleClockInOut = async () => {
    if (!clockingStaff) {
      alert('Please select a staff member');
      return;
    }

    const entryData = {
      staff_id: clockingStaff,
      entry_type: clockType,
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      entry_time: format(new Date(), 'HH:mm:ss'),
      notes: note,
      location: 'Main Office', // This could be dynamic based on user location or selection
    };

    const result = await recordTimeEntry(entryData);
    if (result.success) {
      // Reset form
      setNote('');
      // Reload time entries
      loadTimeEntries();
    }
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

  // Group time entries by staff member and date
  const groupedEntries = timeEntries.reduce((acc, entry) => {
    const staffId = entry.staff_id;
    const date = entry.entry_date;
    const key = `${staffId}-${date}`;
    
    if (!acc[key]) {
      acc[key] = {
        staffId,
        date,
        staffName: `${entry.staff?.first_name || ''} ${entry.staff?.last_name || ''}`,
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

  // Calculate weekly hours for summary view
  const calculateWeeklySummary = () => {
    const summary = {};
    
    // Initialize summary for each staff member
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
    // This would generate a CSV or PDF of the timesheet data
    alert('Export functionality would generate a timesheet report here');
  };

  const renderListView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Staff Member
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Clock In
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Clock Out
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Duration
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Notes
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
          {Object.values(groupedEntries).map((group, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {group.staffName}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">
                  {format(parseISO(group.date), 'MMM d, yyyy')}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {format(parseISO(group.date), 'EEEE')}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {group.clockIn ? (
                  <div className="text-sm text-gray-900 dark:text-white">
                    {group.clockIn.entry_time}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Not clocked in
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {group.clockOut ? (
                  <div className="text-sm text-gray-900 dark:text-white">
                    {group.clockOut.entry_time}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Not clocked out
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">
                  {group.duration || 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {group.entries.map(e => e.notes).filter(Boolean).join(', ')}
                </div>
              </td>
            </tr>
          ))}
          {Object.keys(groupedEntries).length === 0 && (
            <tr>
              <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                No time entries found for the selected criteria
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderSummaryView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Staff Member
            </th>
            {weekDays.map((day, index) => (
              <th key={index} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                {format(day, 'EEE')}
                <div className="text-xxs normal-case">{format(day, 'MMM d')}</div>
              </th>
            ))}
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Total Hours
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
          {weeklySummary.map((summary, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {summary.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {summary.position}
                </div>
              </td>
              {summary.dailyHours.map((hours, dayIndex) => (
                <td key={dayIndex} className="px-6 py-4 whitespace-nowrap text-center">
                  <div className={`text-sm ${hours > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                    {hours > 0 ? hours.toFixed(1) : '-'}
                  </div>
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {(summary.totalMinutes / 60).toFixed(1)}
                </div>
              </td>
            </tr>
          ))}
          {weeklySummary.length === 0 && (
            <tr>
              <td colSpan={9} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                No time data available for the selected period
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            <FaClock className="inline mr-2" /> Clock In/Out
          </h3>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Staff Member</label>
            <select
              value={clockingStaff}
              onChange={(e) => setClockingStaff(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Select Staff Member</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Action</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setClockType('in')}
                className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center ${
                  clockType === 'in'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                <FaPlay className="mr-2" /> Clock In
              </button>
              <button
                type="button"
                onClick={() => setClockType('out')}
                className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center ${
                  clockType === 'out'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                <FaStop className="mr-2" /> Clock Out
              </button>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Note (Optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Add a note about this time entry"
              rows="2"
            ></textarea>
          </div>
          <button
            onClick={handleClockInOut}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
          >
            <FaClock className="mr-2" /> Record Time
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            <FaFilter className="inline mr-2" /> Filter Time Entries
          </h3>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Staff Member</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Staff Members</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaCalendarAlt className="text-gray-400" />
                </div>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  className="pl-10 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaCalendarAlt className="text-gray-400" />
                </div>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  className="pl-10 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`py-2 px-4 rounded-md ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`py-2 px-4 rounded-md ${
                  viewMode === 'summary'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Summary View
              </button>
            </div>
            <button
              onClick={exportTimesheet}
              className="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            >
              <FaFileExport className="mr-2" /> Export
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
          Time Entries
        </h3>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          viewMode === 'list' ? renderListView() : renderSummaryView()
        )}
      </div>
    </div>
  );
};

export default TimeAttendance;
