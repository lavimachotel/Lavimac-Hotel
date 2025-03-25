import React, { useState, useEffect } from 'react';
import { useStaff } from '../../context/StaffContext';
import { FaPlus, FaEdit, FaTrash, FaExchangeAlt, FaCalendarAlt } from 'react-icons/fa';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, parseISO } from 'date-fns';
import ScheduleModal from './ScheduleModal';

const StaffScheduler = () => {
  const { staff, schedules, loading, fetchStaff, fetchSchedules, addSchedule, updateSchedule, deleteSchedule } = useStaff();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(currentDate, { weekStartsOn: 0 }));
  const [weekEnd, setWeekEnd] = useState(endOfWeek(currentDate, { weekStartsOn: 0 }));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapSource, setSwapSource] = useState(null);
  const [swapTarget, setSwapTarget] = useState(null);

  // Generate array of days for the current week
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchStaff();
    
    // Format dates for API call
    const startDateStr = format(weekStart, 'yyyy-MM-dd');
    const endDateStr = format(weekEnd, 'yyyy-MM-dd');
    
    fetchSchedules(selectedStaff !== 'all' ? selectedStaff : null, startDateStr, endDateStr);
  }, [weekStart, weekEnd, selectedStaff, fetchStaff, fetchSchedules]);

  const nextWeek = () => {
    const newWeekStart = addWeeks(weekStart, 1);
    setWeekStart(newWeekStart);
    setWeekEnd(endOfWeek(newWeekStart, { weekStartsOn: 0 }));
  };

  const prevWeek = () => {
    const newWeekStart = subWeeks(weekStart, 1);
    setWeekStart(newWeekStart);
    setWeekEnd(endOfWeek(newWeekStart, { weekStartsOn: 0 }));
  };

  const handleAddSchedule = (day, staffId = null) => {
    setCurrentSchedule(null);
    setIsModalOpen(true);
    // Pre-fill the date and staff if provided
    if (day) {
      setCurrentSchedule({
        shift_date: format(day, 'yyyy-MM-dd'),
        staff_id: staffId || ''
      });
    }
  };

  const handleEditSchedule = (schedule) => {
    setCurrentSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleDeleteSchedule = async (id) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      await deleteSchedule(id);
      
      // Refresh schedules
      const startDateStr = format(weekStart, 'yyyy-MM-dd');
      const endDateStr = format(weekEnd, 'yyyy-MM-dd');
      fetchSchedules(selectedStaff !== 'all' ? selectedStaff : null, startDateStr, endDateStr);
    }
  };

  const handleSaveSchedule = async (scheduleData) => {
    let result;
    
    if (currentSchedule && currentSchedule.id) {
      result = await updateSchedule(currentSchedule.id, scheduleData);
    } else {
      result = await addSchedule(scheduleData);
    }
    
    if (result.success) {
      setIsModalOpen(false);
      
      // Refresh schedules
      const startDateStr = format(weekStart, 'yyyy-MM-dd');
      const endDateStr = format(weekEnd, 'yyyy-MM-dd');
      fetchSchedules(selectedStaff !== 'all' ? selectedStaff : null, startDateStr, endDateStr);
    }
  };

  const handleSwapShift = (schedule) => {
    if (!swapSource) {
      setSwapSource(schedule);
    } else {
      setSwapTarget(schedule);
      setShowSwapModal(true);
    }
  };

  const confirmSwapShift = async () => {
    if (swapSource && swapTarget) {
      // Swap staff IDs between the two schedules
      const sourceUpdate = { ...swapSource, staff_id: swapTarget.staff_id };
      const targetUpdate = { ...swapTarget, staff_id: swapSource.staff_id };
      
      await updateSchedule(swapSource.id, sourceUpdate);
      await updateSchedule(swapTarget.id, targetUpdate);
      
      // Reset swap state
      setSwapSource(null);
      setSwapTarget(null);
      setShowSwapModal(false);
      
      // Refresh schedules
      const startDateStr = format(weekStart, 'yyyy-MM-dd');
      const endDateStr = format(weekEnd, 'yyyy-MM-dd');
      fetchSchedules(selectedStaff !== 'all' ? selectedStaff : null, startDateStr, endDateStr);
    }
  };

  const cancelSwap = () => {
    setSwapSource(null);
    setSwapTarget(null);
    setShowSwapModal(false);
  };

  // Filter departments from staff data
  const departments = [...new Set(staff.map(s => s.department))];

  // Filter staff by department
  const filteredStaff = selectedDepartment === 'all' 
    ? staff 
    : staff.filter(s => s.department === selectedDepartment);

  // Get schedules for the current view
  const getSchedulesForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return schedules.filter(s => s.shift_date === dayStr);
  };

  // Get schedule for a specific staff member on a specific day
  const getScheduleForStaffDay = (staffId, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return schedules.find(s => s.staff_id === staffId && s.shift_date === dayStr);
  };

  // Render the schedule grid based on view type
  const renderScheduleGrid = () => {
    if (selectedStaff === 'all') {
      // Show all staff for each day
      return (
        <div className="grid grid-cols-8 gap-2 mt-4">
          {/* Header row with day names */}
          <div className="font-medium text-gray-500 dark:text-gray-400"></div>
          {weekDays.map((day, index) => (
            <div key={index} className="font-medium text-center">
              <div className="text-gray-800 dark:text-white">{format(day, 'EEE')}</div>
              <div className="text-gray-500 dark:text-gray-400">{format(day, 'MMM d')}</div>
            </div>
          ))}

          {/* Staff rows */}
          {filteredStaff.map(member => (
            <React.Fragment key={member.id}>
              <div className="py-2 font-medium text-gray-800 dark:text-white">
                {member.first_name} {member.last_name}
              </div>
              
              {/* Schedule cells for each day */}
              {weekDays.map((day, dayIndex) => {
                const schedule = getScheduleForStaffDay(member.id, day);
                return (
                  <div 
                    key={dayIndex} 
                    className={`p-2 border rounded-md ${
                      schedule 
                        ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800' 
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {schedule ? (
                      <div>
                        <div className="font-medium text-blue-700 dark:text-blue-300">
                          {schedule.shift_start} - {schedule.shift_end}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {schedule.shift_type}
                        </div>
                        <div className="mt-1 flex space-x-1">
                          <button 
                            onClick={() => handleEditSchedule(schedule)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            title="Edit"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <FaTrash size={14} />
                          </button>
                          <button 
                            onClick={() => handleSwapShift(schedule)}
                            className={`${
                              swapSource && swapSource.id === schedule.id
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300'
                            }`}
                            title="Swap Shift"
                          >
                            <FaExchangeAlt size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddSchedule(day, member.id)}
                        className="w-full h-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        title="Add Schedule"
                      >
                        <FaPlus size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      );
    } else {
      // Show detailed view for a single staff member
      const selectedMember = staff.find(s => s.id === selectedStaff);
      
      if (!selectedMember) return <div>Staff member not found</div>;
      
      return (
        <div className="mt-4">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
            Schedule for {selectedMember.first_name} {selectedMember.last_name}
          </h3>
          
          <div className="grid grid-cols-7 gap-4">
            {weekDays.map((day, index) => {
              const schedule = getScheduleForStaffDay(selectedMember.id, day);
              return (
                <div 
                  key={index} 
                  className={`p-4 border rounded-lg ${
                    schedule 
                      ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800' 
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="font-medium text-center mb-2">
                    <div className="text-gray-800 dark:text-white">{format(day, 'EEEE')}</div>
                    <div className="text-gray-500 dark:text-gray-400">{format(day, 'MMM d')}</div>
                  </div>
                  
                  {schedule ? (
                    <div>
                      <div className="font-medium text-blue-700 dark:text-blue-300 text-center">
                        {schedule.shift_start} - {schedule.shift_end}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 text-center mb-2">
                        {schedule.shift_type}
                      </div>
                      {schedule.notes && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 p-2 bg-white dark:bg-gray-700 rounded-md">
                          {schedule.notes}
                        </div>
                      )}
                      <div className="mt-3 flex justify-center space-x-2">
                        <button 
                          onClick={() => handleEditSchedule(schedule)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          title="Edit"
                        >
                          <FaEdit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <FaTrash size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-24">
                      <button
                        onClick={() => handleAddSchedule(day, selectedMember.id)}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border border-dashed border-gray-300 dark:border-gray-600 rounded-md"
                        title="Add Schedule"
                      >
                        <FaPlus size={16} className="mr-1 inline" /> Add Shift
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <button
            onClick={prevWeek}
            className="p-2 mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            &lt;
          </button>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h2>
          <button
            onClick={nextWeek}
            className="p-2 ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            &gt;
          </button>
          <button
            onClick={() => {
              const today = new Date();
              setWeekStart(startOfWeek(today, { weekStartsOn: 0 }));
              setWeekEnd(endOfWeek(today, { weekStartsOn: 0 }));
            }}
            className="ml-4 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
          >
            Today
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Departments</option>
              {departments.map((dept, index) => (
                <option key={index} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Staff</option>
              {filteredStaff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => handleAddSchedule()}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FaCalendarAlt className="mr-2" /> Add Schedule
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        renderScheduleGrid()
      )}

      {isModalOpen && (
        <ScheduleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveSchedule}
          schedule={currentSchedule}
          staff={staff}
        />
      )}

      {showSwapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Confirm Shift Swap</h3>
            
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400 mb-2">Are you sure you want to swap these shifts?</p>
              
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md mb-2">
                <p className="font-medium text-gray-800 dark:text-white">
                  {staff.find(s => s.id === swapSource?.staff_id)?.first_name} {staff.find(s => s.id === swapSource?.staff_id)?.last_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {format(parseISO(swapSource?.shift_date), 'MMM d, yyyy')} • {swapSource?.shift_start} - {swapSource?.shift_end}
                </p>
              </div>
              
              <div className="text-center my-2">
                <FaExchangeAlt className="inline text-yellow-500" />
              </div>
              
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                <p className="font-medium text-gray-800 dark:text-white">
                  {staff.find(s => s.id === swapTarget?.staff_id)?.first_name} {staff.find(s => s.id === swapTarget?.staff_id)?.last_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {format(parseISO(swapTarget?.shift_date), 'MMM d, yyyy')} • {swapTarget?.shift_start} - {swapTarget?.shift_end}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelSwap}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmSwapShift}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm Swap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffScheduler;
