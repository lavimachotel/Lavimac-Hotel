import React, { useState, useEffect } from 'react';
import { useStaff } from '../../context/StaffContext';
import { FaChartLine, FaStar, FaPlus, FaEdit, FaTrash, FaUser, FaCalendarAlt } from 'react-icons/fa';
import { format, parseISO, subMonths } from 'date-fns';

const PerformanceTracking = () => {
  const { staff, performanceMetrics, loading, fetchStaff, fetchPerformanceMetrics, addPerformanceMetric } = useStaff();
  const [selectedStaff, setSelectedStaff] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'guest_satisfaction',
    rating: 5,
    comments: '',
    reviewer: ''
  });
  const [timeRange, setTimeRange] = useState('3months');

  useEffect(() => {
    fetchStaff();
    loadPerformanceMetrics();
  }, [selectedStaff, timeRange]);

  const loadPerformanceMetrics = () => {
    let staffId = selectedStaff || null;
    fetchPerformanceMetrics(staffId);
  };

  const handleOpenModal = (staffId = null) => {
    setFormData({
      ...formData,
      staff_id: staffId || '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await addPerformanceMetric(formData);
    if (result.success) {
      handleCloseModal();
      loadPerformanceMetrics();
    }
  };

  const getTimeRangeDate = () => {
    switch (timeRange) {
      case '1month':
        return format(subMonths(new Date(), 1), 'yyyy-MM-dd');
      case '3months':
        return format(subMonths(new Date(), 3), 'yyyy-MM-dd');
      case '6months':
        return format(subMonths(new Date(), 6), 'yyyy-MM-dd');
      case '12months':
        return format(subMonths(new Date(), 12), 'yyyy-MM-dd');
      default:
        return format(subMonths(new Date(), 3), 'yyyy-MM-dd');
    }
  };

  // Filter metrics by time range
  const filteredMetrics = performanceMetrics.filter(metric => {
    const metricDate = parseISO(metric.date);
    const rangeDate = parseISO(getTimeRangeDate());
    return metricDate >= rangeDate;
  });

  // Group metrics by staff member
  const groupedMetrics = filteredMetrics.reduce((acc, metric) => {
    const staffId = metric.staff_id;
    if (!acc[staffId]) {
      acc[staffId] = {
        staffId,
        staffName: `${metric.staff?.first_name || ''} ${metric.staff?.last_name || ''}`,
        metrics: []
      };
    }
    acc[staffId].metrics.push(metric);
    return acc;
  }, {});

  // Calculate average ratings for each staff member
  Object.values(groupedMetrics).forEach(group => {
    group.averageRating = group.metrics.reduce((sum, metric) => sum + metric.rating, 0) / group.metrics.length;
    
    // Group by category
    group.categories = {};
    group.metrics.forEach(metric => {
      if (!group.categories[metric.category]) {
        group.categories[metric.category] = {
          ratings: [],
          average: 0
        };
      }
      group.categories[metric.category].ratings.push(metric.rating);
    });
    
    // Calculate average for each category
    Object.keys(group.categories).forEach(category => {
      const ratings = group.categories[category].ratings;
      group.categories[category].average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    });
  });

  const formatCategory = (category) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <FaStar
        key={i}
        className={i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
      />
    ));
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 md:mb-0">
          <FaChartLine className="inline mr-2" /> Performance Tracking
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
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="1month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
          </select>
          
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FaPlus className="mr-2" /> Add Performance Review
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.values(groupedMetrics).map((group, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                    {group.staffName}
                  </h3>
                  <div className="flex items-center mt-1">
                    {renderStars(group.averageRating)}
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      {group.averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenModal(group.staffId)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <FaPlus />
                </button>
              </div>
              
              <div className="space-y-3">
                {Object.keys(group.categories).map((category, catIndex) => (
                  <div key={catIndex} className="border-t border-gray-200 dark:border-gray-700 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatCategory(category)}
                      </span>
                      <div className="flex items-center">
                        {renderStars(group.categories[category].average)}
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {group.categories[category].average.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recent Reviews
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {group.metrics.slice(0, 3).map((metric, metricIndex) => (
                    <div key={metricIndex} className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="flex justify-between">
                        <span>{formatCategory(metric.category)}</span>
                        <span>{format(parseISO(metric.date), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center mt-1">
                        {renderStars(metric.rating)}
                      </div>
                      {metric.comments && (
                        <p className="mt-1 italic">{metric.comments}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          
          {Object.keys(groupedMetrics).length === 0 && (
            <div className="col-span-full text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">No performance metrics found</p>
              <button
                onClick={() => handleOpenModal()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add First Performance Review
              </button>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Add Performance Review
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FaTrash size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Staff Member *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="text-gray-400" />
                  </div>
                  <select
                    name="staff_id"
                    value={formData.staff_id}
                    onChange={handleChange}
                    required
                    className="pl-10 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select Staff Member</option>
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name} - {member.position}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaCalendarAlt className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="pl-10 w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="guest_satisfaction">Guest Satisfaction</option>
                  <option value="task_completion">Task Completion</option>
                  <option value="attendance">Attendance & Punctuality</option>
                  <option value="teamwork">Teamwork</option>
                  <option value="communication">Communication</option>
                  <option value="problem_solving">Problem Solving</option>
                  <option value="leadership">Leadership</option>
                  <option value="technical_skills">Technical Skills</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Rating *</label>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({...formData, rating})}
                      className="text-2xl mr-1 focus:outline-none"
                    >
                      <FaStar 
                        className={rating <= formData.rating 
                          ? 'text-yellow-400' 
                          : 'text-gray-300 dark:text-gray-600'
                        } 
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    {formData.rating} / 5
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Comments</label>
                <textarea
                  name="comments"
                  value={formData.comments}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Add comments about this performance review"
                  rows="3"
                ></textarea>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Reviewer</label>
                <input
                  type="text"
                  name="reviewer"
                  value={formData.reviewer}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Name of the reviewer"
                />
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
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
    </div>
  );
};

export default PerformanceTracking;
