// Script to set up initial notifications in localStorage for the Dashboard

// Sample notifications data
const notifications = [
  {
    type: 'success',
    title: 'System Update',
    message: 'Hotel Management System has been updated successfully',
    time: 'Just now',
    timestamp: new Date().toISOString()
  },
  {
    type: 'info',
    title: 'New Booking',
    message: 'A new booking has been made for Room 305',
    time: '30 minutes ago',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    type: 'error',
    title: 'Maintenance Required',
    message: 'Room 203 needs maintenance - AC not functioning',
    time: '2 hours ago',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    type: 'info',
    title: 'New Task Added',
    message: 'Deep cleaning task added for Room 401',
    time: '3 hours ago',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    type: 'success',
    title: 'Service Completed',
    message: 'Room service completed for Room 102',
    time: '5 hours ago',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  }
];

// Check if notifications already exist in localStorage
const existingNotifications = localStorage.getItem('hotelNotifications');

// Only set notifications if they don't already exist
if (!existingNotifications) {
  localStorage.setItem('hotelNotifications', JSON.stringify(notifications));
  console.log('Initial notifications set up successfully!');
} else {
  console.log('Notifications already exist in localStorage. No changes made.');
}

// Function to display the current notifications
function displayNotifications() {
  const storedNotifications = localStorage.getItem('hotelNotifications');
  if (storedNotifications) {
    console.log('Current notifications:');
    console.log(JSON.parse(storedNotifications));
  } else {
    console.log('No notifications found in localStorage.');
  }
}

// Display current notifications
displayNotifications();

// Usage instructions
console.log('\nINSTRUCTIONS:');
console.log('- Run this script in the browser console to initialize notifications');
console.log('- To clear notifications, run: localStorage.removeItem("hotelNotifications")');
console.log('- To add a new notification, run:');
console.log(`
  const notificationsStr = localStorage.getItem('hotelNotifications');
  const notifications = notificationsStr ? JSON.parse(notificationsStr) : [];
  
  notifications.unshift({
    type: 'success', // or 'info', 'error'
    title: 'New Notification',
    message: 'Your notification message here',
    time: 'Just now',
    timestamp: new Date().toISOString()
  });
  
  localStorage.setItem('hotelNotifications', JSON.stringify(notifications.slice(0, 10)));
`); 