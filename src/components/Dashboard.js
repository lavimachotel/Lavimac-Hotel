import React, { useState, useEffect } from 'react';
import * as echarts from 'echarts';
import '@fortawesome/fontawesome-free/css/all.min.css';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tasks, setTasks] = useState([
    { room: 'Room 204', description: 'Cleaning', priority: 'High', duration: '30 min' },
    { room: 'Room 308', description: 'Inspection', priority: 'Medium', duration: '1 hour' },
    { room: 'Room 415', description: 'Maintenance', priority: 'Low', duration: '2 hours' },
  ]);

  const [checkIns, setCheckIns] = useState([
    { room: 'Room 301', guest: 'James Wilson', arrival: '2:00 PM', status: 'Pending' },
    { room: 'Room 405', guest: 'Sarah Chen', arrival: '3:30 PM', status: 'Pending' },
    { room: 'Room 512', guest: 'Michael Brown', arrival: '4:15 PM', status: 'Confirmed' },
  ]);

  const [notifications, setNotifications] = useState([
    {
      type: 'error',
      title: 'Maintenance Required',
      message: 'AC unit in Room 302 needs immediate attention',
      time: '5 minutes ago'
    },
    {
      type: 'info',
      title: 'New Booking',
      message: 'Room 405 booked for next week',
      time: '15 minutes ago'
    },
    {
      type: 'success',
      title: 'Payment Received',
      message: '$580 received for Room 201',
      time: '30 minutes ago'
    }
  ]);

  // Sidebar menu items
  const sidebarLinks = [
    { icon: 'fa-tachometer-alt', text: 'Dashboard', active: true },
    { icon: 'fa-calendar-check', text: 'Reservations' },
    { icon: 'fa-bed', text: 'Rooms' },
    { icon: 'fa-users', text: 'Guests' },
    { icon: 'fa-clipboard-list', text: 'Tasks' },
    { icon: 'fa-chart-line', text: 'Reports' },
    { icon: 'fa-dollar-sign', text: 'Billing' },
    { icon: 'fa-concierge-bell', text: 'Services' },
    { icon: 'fa-cog', text: 'Settings' },
  ];

  useEffect(() => {
    const chartDom = document.getElementById('revenueChart');
    if (chartDom) {
      const myChart = echarts.init(chartDom);
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          axisLine: {
            lineStyle: {
              color: '#666'
            }
          }
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '${value}k'
          },
          splitLine: {
            lineStyle: {
              color: '#ddd'
            }
          }
        },
        series: [{
          name: 'Revenue',
          type: 'bar',
          barWidth: '60%',
          data: [10, 12, 11, 13, 15, 16, 12],
          itemStyle: {
            color: '#3b82f6'
          }
        }]
      };
      myChart.setOption(option);

      const handleResize = () => {
        myChart.resize();
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <div className={`bg-gray-900 ${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          {sidebarOpen && <h2 className="text-xl font-bold text-white">HotelMS</h2>}
          <button onClick={toggleSidebar} className="p-1 rounded hover:bg-gray-800 text-gray-400">
            <i className={`fas ${sidebarOpen ? 'fa-chevron-left' : 'fa-chevron-right'}`}></i>
          </button>
        </div>
        
        {/* Sidebar Links */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-2">
            <ul className="space-y-2">
              {sidebarLinks.map((link, index) => (
                <li key={index}>
                  <a 
                    href="#" 
                    className={`flex items-center p-3 rounded-lg ${link.active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                  >
                    <i className={`fas ${link.icon} ${sidebarOpen ? 'mr-3' : 'mx-auto'} text-xl`}></i>
                    {sidebarOpen && <span>{link.text}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        
        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-800">
          <a href="/" className="flex items-center p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white">
            <i className={`fas fa-sign-out-alt ${sidebarOpen ? 'mr-3' : 'mx-auto'} text-xl`}></i>
            {sidebarOpen && <span>Logout</span>}
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="bg-black p-8">
          <div className="max-w-[1440px] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative cursor-pointer">
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  <i className="fas fa-bell text-gray-400 text-xl"></i>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://public.readdy.ai/ai/img_res/aef84bf6e150de792303d2b013c8d32c.jpg" 
                       alt="Profile" 
                       className="w-10 h-10 rounded-full object-cover" />
                  <span className="text-gray-400">John Smith</span>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 mb-1">Occupancy Rate</p>
                    <h2 className="text-3xl font-bold text-white">85%</h2>
                    <p className="text-green-500 text-sm mt-1">
                      <i className="fas fa-arrow-up mr-1"></i>
                      12% vs last week
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <i className="fas fa-bed text-blue-600 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 mb-1">Today's Revenue</p>
                    <h2 className="text-3xl font-bold text-white">₵1,800</h2>
                    <p className="text-green-500 text-sm mt-1">
                      <i className="fas fa-arrow-up mr-1"></i>
                      8% vs yesterday
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <i className="fas fa-dollar-sign text-green-600 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 mb-1">Pending Check-ins</p>
                    <h2 className="text-3xl font-bold text-white">24</h2>
                    <p className="text-gray-500 text-sm mt-1">Next check-in in 35 mins</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <i className="fas fa-sign-in-alt text-yellow-600 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 mb-1">Pending Check-outs</p>
                    <h2 className="text-3xl font-bold text-white">18</h2>
                    <p className="text-gray-500 text-sm mt-1">Next check-out in 1h 15m</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-full">
                    <i className="fas fa-sign-out-alt text-red-600 text-xl"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Occupancy Overview */}
                <div className="bg-gray-800 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-white mb-4">Occupancy Overview</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {[...Array(20)].map((_, index) => {
                      const roomNumber = 101 + index;
                      const isAvailable = [101, 104, 107, 109, 115, 117, 119].includes(roomNumber);
                      return (
                        <div
                          key={roomNumber}
                          className={`p-2 rounded text-center ${
                            isAvailable ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}
                        >
                          {roomNumber}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-sm text-gray-400">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-sm text-gray-400">Occupied</span>
                    </div>
                  </div>
                </div>

                {/* Today's Check-ins */}
                <div className="bg-gray-800 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-white mb-4">Today's Check-ins</h3>
                  <div className="space-y-4">
                    {checkIns.map((checkIn, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-white">{checkIn.room} - {checkIn.guest}</h4>
                          <p className="text-gray-400">Arrival: {checkIn.arrival}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          checkIn.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {checkIn.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Revenue Analytics */}
                <div className="bg-gray-800 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-white mb-4">Revenue Analytics</h3>
                  <div id="revenueChart" className="w-full h-[300px]"></div>
                </div>

                {/* Housekeeping Tasks */}
                <div className="bg-gray-800 rounded-xl p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-white mb-4">Housekeeping Tasks</h3>
                  <div className="space-y-4">
                    {tasks.map((task, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
                        <input type="checkbox" className="w-5 h-5 rounded text-blue-600" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{task.room} {task.description}</h4>
                          <p className="text-gray-400">Priority: {task.priority}</p>
                        </div>
                        <span className="text-gray-500">{task.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Notifications */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-white mb-4">Recent Notifications</h3>
              <div className="space-y-4">
                {notifications.map((notification, index) => (
                  <div key={index} className={`p-4 rounded-lg ${
                    notification.type === 'error' ? 'bg-red-900 bg-opacity-30' :
                    notification.type === 'info' ? 'bg-blue-900 bg-opacity-30' : 'bg-green-900 bg-opacity-30'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${
                        notification.type === 'error' ? 'bg-red-100 text-red-600' :
                        notification.type === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      }`}>
                        <i className={`fas ${
                          notification.type === 'error' ? 'fa-exclamation-circle' :
                          notification.type === 'info' ? 'fa-info-circle' : 'fa-check-circle'
                        }`}></i>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{notification.title}</h4>
                        <p className="text-gray-400">{notification.message}</p>
                        <p className="text-sm text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;