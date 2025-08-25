import React, { createContext, useState, useContext, useEffect } from 'react';
import supabase from '../supabaseClient';
import { toast } from 'react-hot-toast';

const StaffContext = createContext();

export const StaffProvider = ({ children }) => {
  const [staff, setStaff] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trainingModules, setTrainingModules] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState([]);
  const [staffTrainings, setStaffTrainings] = useState([]);
  const [lastFetchAttempt, setLastFetchAttempt] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(null);

  // Fetch all staff members
  const fetchStaff = async () => {
    // Prevent rapid re-fetching that might cause blinking
    const now = Date.now();
    if (now - lastFetchAttempt < 2000) {
      console.log('Skipping fetch due to recent attempt');
      return;
    }
    
    setLastFetchAttempt(now);
    
    // Use timeout to prevent quick loading/non-loading states that cause blinking
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      setLoading(true);
    }, 300);
    
    setLoadingTimeout(newTimeout);
    
    try {
      console.log('Fetching staff data from Supabase...');
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('last_name', { ascending: true });

      // Clear loading timeout
      clearTimeout(newTimeout);
      
      if (error) {
        console.error('Error fetching staff from Supabase:', error);
        throw error;
      }
      
      setStaff(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setError(error.message);
      
      // Check if we already have staff data before falling back to dummy data
      if (staff.length === 0) {
        console.log('Using fallback dummy staff data');
        // Create some dummy staff data for fallback
        const dummyStaff = [
          {
            id: 1,
            name: 'John Doe',
            position: 'Hotel Manager',
            department: 'Management',
            email: 'john.doe@lavimacroyalhotel.com',
            phone: '+233-555-1234',
            address: 'Accra, Ghana',
            hire_date: '2020-01-10',
            status: 'Active',
            photo_url: '/path/to/photo1.jpg'
          },
          {
            id: 2,
            name: 'Jane Smith',
            position: 'Receptionist',
            department: 'Front Desk',
            email: 'jane.smith@lavimacroyalhotel.com',
            phone: '+233-555-5678',
            address: 'Accra, Ghana',
            hire_date: '2021-03-15',
            status: 'Active',
            photo_url: '/path/to/photo2.jpg'
          },
          {
            id: 3,
            name: 'Michael Johnson',
            position: 'Housekeeping Manager',
            department: 'Housekeeping',
            email: 'michael.johnson@lavimacroyalhotel.com',
            phone: '+233-555-9012',
            address: 'Accra, Ghana',
            hire_date: '2019-11-05',
            status: 'Active',
            photo_url: '/path/to/photo3.jpg'
          }
        ];
        setStaff(dummyStaff);
      }
      
      // Only toast once to prevent multiple error messages
      if (!error.alreadyReported) {
        toast.error(`Failed to fetch staff: ${error.message}`, { id: 'staff-fetch-error' });
        error.alreadyReported = true;
      }
      
      setLoading(false);
    }
  };
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [loadingTimeout]);

  // Initialize staff data on component mount
  useEffect(() => {
    fetchStaff();
  }, []);

  // Fetch staff schedules
  const fetchSchedules = async (staffId = null, startDate = null, endDate = null) => {
    // Prevent rapid re-fetching that might cause blinking
    const now = Date.now();
    if (now - lastFetchAttempt < 2000) {
      console.log('Skipping schedules fetch due to recent attempt');
      return;
    }
    
    setLastFetchAttempt(now);
    
    // Use timeout to prevent quick loading/non-loading states
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      setLoading(true);
    }, 300);
    
    setLoadingTimeout(newTimeout);
    
    try {
      console.log('Fetching staff schedules from Supabase...');
      let query = supabase
        .from('staff_schedules')
        .select('*, staff(id, first_name, last_name, position)');

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      if (startDate) {
        query = query.gte('shift_date', startDate);
      }

      if (endDate) {
        query = query.lte('shift_date', endDate);
      }

      const { data, error } = await query.order('shift_date', { ascending: true });

      // Clear loading timeout
      clearTimeout(newTimeout);

      if (error) {
        console.error('Error fetching schedules from Supabase:', error);
        throw error;
      }
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setError(error.message);
      
      // Only toast once to prevent multiple error messages
      if (!error.alreadyReported) {
        toast.error(`Failed to fetch schedules: ${error.message}`, { id: 'schedules-fetch-error' });
        error.alreadyReported = true;
      }
    } finally {
      setLoading(false);
    }
  };

  // Add a new staff member
  const addStaff = async (staffData) => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .insert([staffData])
        .select();

      if (error) throw error;
      setStaff([...staff, data[0]]);
      toast.success('Staff member added successfully');
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error adding staff:', error);
      toast.error(`Failed to add staff: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Update a staff member
  const updateStaff = async (id, staffData) => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .update(staffData)
        .eq('id', id)
        .select();

      if (error) throw error;
      setStaff(staff.map(s => s.id === id ? data[0] : s));
      toast.success('Staff member updated successfully');
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error(`Failed to update staff: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Delete a staff member
  const deleteStaff = async (id) => {
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setStaff(staff.filter(s => s.id !== id));
      toast.success('Staff member deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error(`Failed to delete staff: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Add a new schedule
  const addSchedule = async (scheduleData) => {
    try {
      const { data, error } = await supabase
        .from('staff_schedules')
        .insert([scheduleData])
        .select();

      if (error) throw error;
      setSchedules([...schedules, data[0]]);
      toast.success('Schedule added successfully');
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error adding schedule:', error);
      toast.error(`Failed to add schedule: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Update a schedule
  const updateSchedule = async (id, scheduleData) => {
    try {
      const { data, error } = await supabase
        .from('staff_schedules')
        .update(scheduleData)
        .eq('id', id)
        .select();

      if (error) throw error;
      setSchedules(schedules.map(s => s.id === id ? data[0] : s));
      toast.success('Schedule updated successfully');
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error(`Failed to update schedule: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Delete a schedule
  const deleteSchedule = async (id) => {
    try {
      const { error } = await supabase
        .from('staff_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSchedules(schedules.filter(s => s.id !== id));
      toast.success('Schedule deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error(`Failed to delete schedule: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Record time entry (clock in/out)
  const recordTimeEntry = async (entryData) => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert([entryData])
        .select();

      if (error) throw error;
      setTimeEntries([...timeEntries, data[0]]);
      toast.success(`Time ${entryData.entry_type} recorded successfully`);
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error recording time entry:', error);
      toast.error(`Failed to record time ${entryData.entry_type}: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Fetch time entries
  const fetchTimeEntries = async (staffId = null, startDate = null, endDate = null) => {
    // Prevent rapid re-fetching
    const now = Date.now();
    if (now - lastFetchAttempt < 2000) {
      console.log('Skipping time entries fetch due to recent attempt');
      return;
    }
    
    setLastFetchAttempt(now);
    
    // Use timeout to prevent quick loading/non-loading states
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      setLoading(true);
    }, 300);
    
    setLoadingTimeout(newTimeout);
    
    try {
      console.log('Fetching time entries from Supabase...');
      let query = supabase
        .from('time_entries')
        .select('*, staff(id, first_name, last_name, position)');

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      if (startDate) {
        query = query.gte('entry_date', startDate);
      }

      if (endDate) {
        query = query.lte('entry_date', endDate);
      }

      const { data, error } = await query.order('entry_date', { ascending: false });

      // Clear loading timeout
      clearTimeout(newTimeout);

      if (error) {
        console.error('Error fetching time entries from Supabase:', error);
        throw error;
      }
      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setError(error.message);
      
      // Only toast once to prevent multiple error messages
      if (!error.alreadyReported) {
        toast.error(`Failed to fetch time entries: ${error.message}`, { id: 'time-entries-fetch-error' });
        error.alreadyReported = true;
      }
    } finally {
      setLoading(false);
    }
  };

  // Update time entries directly (for optimistic updates)
  const updateTimeEntries = (entries) => {
    setTimeEntries(entries);
  };

  // Add performance metric
  const addPerformanceMetric = async (metricData) => {
    try {
      const { data, error } = await supabase
        .from('performance_metrics')
        .insert([metricData])
        .select();

      if (error) throw error;
      setPerformanceMetrics([...performanceMetrics, data[0]]);
      toast.success('Performance metric added successfully');
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error adding performance metric:', error);
      toast.error(`Failed to add performance metric: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Fetch performance metrics
  const fetchPerformanceMetrics = async (staffId = null) => {
    // Prevent rapid re-fetching
    const now = Date.now();
    if (now - lastFetchAttempt < 2000) {
      console.log('Skipping performance metrics fetch due to recent attempt');
      return;
    }
    
    setLastFetchAttempt(now);
    
    // Use timeout to prevent quick loading/non-loading states
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      setLoading(true);
    }, 300);
    
    setLoadingTimeout(newTimeout);
    
    try {
      console.log('Fetching performance metrics from Supabase...');
      let query = supabase
        .from('performance_metrics')
        .select('*, staff(id, first_name, last_name, position)');

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data, error } = await query.order('date', { ascending: false });

      // Clear loading timeout
      clearTimeout(newTimeout);

      if (error) {
        console.error('Error fetching performance metrics from Supabase:', error);
        throw error;
      }
      setPerformanceMetrics(data || []);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      setError(error.message);
      
      // Only toast once to prevent multiple error messages
      if (!error.alreadyReported) {
        toast.error(`Failed to fetch performance metrics: ${error.message}`, { id: 'metrics-fetch-error' });
        error.alreadyReported = true;
      }
    } finally {
      setLoading(false);
    }
  };

  // Add training module
  const addTrainingModule = async (moduleData) => {
    try {
      const { data, error } = await supabase
        .from('training_modules')
        .insert([moduleData])
        .select();

      if (error) throw error;
      setTrainingModules([...trainingModules, data[0]]);
      toast.success('Training module added successfully');
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error adding training module:', error);
      toast.error(`Failed to add training module: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Fetch training modules
  const fetchTrainingModules = async () => {
    // Prevent rapid re-fetching
    const now = Date.now();
    if (now - lastFetchAttempt < 2000) {
      console.log('Skipping training modules fetch due to recent attempt');
      return;
    }
    
    setLastFetchAttempt(now);
    
    // Use timeout to prevent quick loading/non-loading states
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      setLoading(true);
    }, 300);
    
    setLoadingTimeout(newTimeout);
    
    try {
      console.log('Fetching training modules from Supabase...');
      const { data, error } = await supabase
        .from('training_modules')
        .select('*')
        .order('title', { ascending: true });

      // Clear loading timeout
      clearTimeout(newTimeout);

      if (error) {
        console.error('Error fetching training modules from Supabase:', error);
        throw error;
      }
      setTrainingModules(data || []);
    } catch (error) {
      console.error('Error fetching training modules:', error);
      setError(error.message);
      
      // Only toast once to prevent multiple error messages
      if (!error.alreadyReported) {
        toast.error(`Failed to fetch training modules: ${error.message}`, { id: 'modules-fetch-error' });
        error.alreadyReported = true;
      }
      
      // Use fallback dummy data if needed
      if (trainingModules.length === 0) {
        console.log('Using fallback dummy training modules data');
        const dummyModules = [
          {
            id: 1,
            title: 'Hotel Safety Procedures',
            description: 'Basic safety protocols for hotel staff',
            category: 'safety',
            content_type: 'document',
            duration_minutes: 60,
            required_for_roles: ['all']
          },
          {
            id: 2,
            title: 'Customer Service Excellence',
            description: 'Advanced customer service techniques',
            category: 'customer_service',
            content_type: 'video',
            duration_minutes: 90,
            required_for_roles: ['front_desk', 'concierge']
          },
          {
            id: 3,
            title: 'New Employee Orientation',
            description: 'Introduction to hotel policies and procedures',
            category: 'onboarding',
            content_type: 'course',
            duration_minutes: 120,
            required_for_roles: ['all']
          }
        ];
        setTrainingModules(dummyModules);
      }
    } finally {
      setLoading(false);
    }
  };

  // Assign training to staff
  const assignTrainingToStaff = async (assignmentData) => {
    try {
      const { data, error } = await supabase
        .from('staff_trainings')
        .insert([assignmentData])
        .select();

      if (error) throw error;
      toast.success('Training assigned successfully');
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error assigning training:', error);
      toast.error(`Failed to assign training: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Fetch staff training assignments
  const fetchStaffTrainings = async (staffId = null) => {
    // Prevent rapid re-fetching
    const now = Date.now();
    if (now - lastFetchAttempt < 2000) {
      console.log('Skipping staff trainings fetch due to recent attempt');
      return;
    }
    
    setLastFetchAttempt(now);
    
    // Use timeout to prevent quick loading/non-loading states
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      setLoading(true);
    }, 300);
    
    setLoadingTimeout(newTimeout);
    
    try {
      console.log('Fetching staff trainings from Supabase...');
      let query = supabase
        .from('staff_trainings')
        .select('*, staff(id, first_name, last_name), training_modules(id, title, description)');

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data, error } = await query.order('assigned_date', { ascending: false });

      // Clear loading timeout
      clearTimeout(newTimeout);

      if (error) {
        console.error('Error fetching staff trainings from Supabase:', error);
        throw error;
      }
      
      setStaffTrainings(data || []);
    } catch (error) {
      console.error('Error fetching staff trainings:', error);
      setError(error.message);
      
      // Only toast once to prevent multiple error messages
      if (!error.alreadyReported) {
        toast.error(`Failed to fetch staff trainings: ${error.message}`, { id: 'staff-trainings-fetch-error' });
        error.alreadyReported = true;
      }
      
      // Use fallback dummy data if needed
      if (staffTrainings.length === 0) {
        console.log('Using fallback dummy staff trainings data');
        const dummyTrainings = [];
        setStaffTrainings(dummyTrainings);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Mark training as complete
  const markTrainingComplete = async (trainingId) => {
    try {
      const { data, error } = await supabase
        .from('staff_trainings')
        .update({ 
          completed: true,
          completed_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', trainingId)
        .select();

      if (error) throw error;
      toast.success('Training marked as complete');
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error marking training as complete:', error);
      toast.error(`Failed to update training status: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  return (
    <StaffContext.Provider value={{
      staff,
      schedules,
      timeEntries,
      trainingModules,
      performanceMetrics,
      staffTrainings,
      loading,
      error,
      fetchStaff,
      fetchSchedules,
      fetchTimeEntries,
      fetchPerformanceMetrics,
      fetchTrainingModules,
      fetchStaffTrainings,
      addStaff,
      updateStaff,
      deleteStaff,
      addSchedule,
      updateSchedule,
      deleteSchedule,
      recordTimeEntry,
      updateTimeEntries,
      addPerformanceMetric,
      addTrainingModule,
      assignTrainingToStaff,
      markTrainingComplete
    }}>
      {children}
    </StaffContext.Provider>
  );
};

export const useStaff = () => useContext(StaffContext);

export default StaffContext;
