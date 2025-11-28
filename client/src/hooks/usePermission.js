import { useUser } from '../context/UserContext';

const usePermission = () => {
  const { currentUser } = useUser();

  // Helper function to check permissions array
  const checkPermissions = (userPermissions, requiredPermission) => {
    return userPermissions && userPermissions.includes(requiredPermission);
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    if (!currentUser) return false;

    // Admin and manager have all permissions
    if (currentUser.role === 'admin' || currentUser.role === 'manager') return true;

    if (!currentUser.permissions) return false;

    return checkPermissions(currentUser.permissions, permission);
  };

  // Check if user has any of the permissions in the array
  const hasAnyPermission = (permissions) => {
    if (!permissions || !permissions.length) return false;
    if (!currentUser) return false;

    // Admin and manager have all permissions
    if (currentUser.role === 'admin' || currentUser.role === 'manager') return true;

    if (!currentUser.permissions) return false;

    // Check if user has any of the provided permissions
    return permissions.some(p => checkPermissions(currentUser.permissions, p));
  };

  // Check if user has all permissions in the array
  const hasAllPermissions = (permissions) => {
    if (!permissions || !permissions.length) return false;
    if (!currentUser) return false;

    // Admin and manager have all permissions
    if (currentUser.role === 'admin' || currentUser.role === 'manager') return true;

    if (!currentUser.permissions) return false;

    // Check if user has all of the provided permissions
    return permissions.every(p => checkPermissions(currentUser.permissions, p));
  };

  // Check if user has access to a page based on their department
  const hasDepartmentAccess = (page) => {
    if (!currentUser) return false;

    // Admin and manager have access to all pages
    if (currentUser.role === 'admin' || currentUser.role === 'manager') return true;

    // Universal pages everyone can access
    const universalPages = ['End Shift', 'Logout', 'Time & Attendance'];
    if (universalPages.includes(page)) return true;

    // Normalize department name (handle both formats: 'front_desk' and 'Front Desk')
    const normalizeDepartment = (dept) => {
      if (!dept) return '';

      // Remove '&' and extra spaces, replace with single space
      let normalized = dept.replace(/\s*&\s*/g, ' ').trim();

      // Convert 'front_desk' to 'Front Desk' format
      normalized = normalized
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return normalized;
    };

    const normalizedDepartment = normalizeDepartment(currentUser.department);

    // Define department-specific access
    const departmentAccess = {
      'Front Desk': [
        'Dashboard', 'Reservations', 'Rooms', 'Guests', 'Billing',
        'Services', 'Bar', 'Settings'
      ],
      'Housekeeping': [
        'Dashboard', 'Tasks', 'Settings'
      ],
      'Food Beverage': [ // Both 'Food & Beverage' and 'Food Beverage' supported
        'Restaurant', 'Bar', 'Systems', 'Settings', 'Inventory'
      ],
      'Management': [
        'Dashboard', 'Reservations', 'Rooms', 'Guests', 'Staff',
        'Tasks', 'Billing', 'Services', 'Inventory', 'Bar',
        'Reports', 'Settings', 'Staff Access', 'Systems', 'Pool', 'Supermarket'
      ],
      'Maintenance': [
        'Dashboard', 'Tasks', 'Services', 'Settings'
      ],
      'Accounting': [
        'Dashboard', 'Billing', 'Reports', 'Settings'
      ],
      'Hr': [ // Human Resources
        'Dashboard', 'Staff', 'Reports', 'Settings', 'Staff Access'
      ],
      'Supermarket': [
        'Supermarket', 'Inventory', 'Settings'
      ]
    };

    // Check if user's department has access to the page
    return departmentAccess[normalizedDepartment]?.includes(page) || false;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasDepartmentAccess
  };
};

export default usePermission;