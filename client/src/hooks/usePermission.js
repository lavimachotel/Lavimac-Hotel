import { useUser } from '../context/UserContext';

const usePermission = () => {
  const { currentUser } = useUser();
  
  // Check if user has permission
  const hasPermission = (permission) => {
    if (!currentUser) return false;
    
    // Admin and manager have all permissions
    if (currentUser.role === 'admin' || currentUser.role === 'manager') return true;
    
    return currentUser.permissions && currentUser.permissions.includes(permission);
  };
  
  // Check if user has any of the permissions in the array
  const hasAnyPermission = (permissions) => {
    if (!permissions || !permissions.length) return false;
    if (!currentUser) return false;
    
    // Admin and manager have all permissions
    if (currentUser.role === 'admin' || currentUser.role === 'manager') return true;
    
    // Check if user has any of the provided permissions
    return permissions.some(permission => 
      currentUser.permissions && currentUser.permissions.includes(permission)
    );
  };
  
  // Check if user has all permissions in the array
  const hasAllPermissions = (permissions) => {
    if (!permissions || !permissions.length) return false;
    if (!currentUser) return false;
    
    // Admin and manager have all permissions
    if (currentUser.role === 'admin' || currentUser.role === 'manager') return true;
    
    // Check if user has all of the provided permissions
    return permissions.every(permission => 
      currentUser.permissions && currentUser.permissions.includes(permission)
    );
  };
  
  // Check if user has access to a page based on their department
  const hasDepartmentAccess = (page) => {
    if (!currentUser) return false;
    
    // Admin and manager have access to all pages
    if (currentUser.role === 'admin' || currentUser.role === 'manager') return true;
    
    // Universal pages everyone can access
    const universalPages = ['End Shift', 'Logout'];
    if (universalPages.includes(page)) return true;
    
    // Define department-specific access
    const departmentAccess = {
      'Front Desk': [
        'Dashboard', 'Reservations', 'Rooms', 'Guests', 'Tasks', 
        'Billing', 'Services', 'Settings'
      ],
      'Housekeeping': [
        'Dashboard', 'Tasks', 'Rooms', 'Services', 'Settings'
      ],
      'Food & Beverage': [
        'Dashboard', 'Tasks', 'Restaurant', 'Services', 'Inventory'
      ],
      'Management': [
        'Dashboard', 'Reservations', 'Rooms', 'Guests', 'Staff', 
        'Tasks', 'Billing', 'Services', 'Inventory', 'Restaurant', 
        'Reports', 'Settings', 'Staff Access'
      ]
    };
    
    // Check if user's department has access to the page
    return departmentAccess[currentUser.department]?.includes(page) || false;
  };
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasDepartmentAccess
  };
};

export default usePermission; 