import { useOfflineUser } from '../context/OfflineUserContext';

const useOfflinePermission = () => {
  const { user } = useOfflineUser();

  const hasDepartmentAccess = (department) => {
    if (!user) return false;
    
    // Admin has access to everything
    if (user.role === 'admin') return true;
    
    // Manager has access to most things
    if (user.role === 'manager') {
      const managerRestricted = ['Access Control'];
      return !managerRestricted.includes(department);
    }
    
    // Staff has limited access
    if (user.role === 'staff') {
      const staffAllowed = ['Dashboard', 'Rooms', 'Reservations', 'Guests', 'Tasks', 'Services'];
      return staffAllowed.includes(department);
    }
    
    return false;
  };

  const hasRoleAccess = (requiredRole) => {
    if (!user) return false;
    
    const roleHierarchy = {
      'admin': 3,
      'manager': 2,
      'staff': 1,
      'guest': 0
    };
    
    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  };

  const canAccessFeature = (feature) => {
    if (!user) return false;
    
    // Define feature access rules
    const featureAccess = {
      'admin_panel': ['admin'],
      'manager_panel': ['admin', 'manager'],
      'staff_management': ['admin', 'manager'],
      'reports': ['admin', 'manager'],
      'billing': ['admin', 'manager', 'staff'],
      'room_management': ['admin', 'manager', 'staff'],
      'guest_management': ['admin', 'manager', 'staff'],
      'reservation_management': ['admin', 'manager', 'staff'],
      'inventory': ['admin', 'manager'],
      'restaurant': ['admin', 'manager', 'staff']
    };
    
    const allowedRoles = featureAccess[feature] || [];
    return allowedRoles.includes(user.role);
  };

  return {
    user,
    hasDepartmentAccess,
    hasRoleAccess,
    canAccessFeature,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isStaff: user?.role === 'staff'
  };
};

export default useOfflinePermission; 