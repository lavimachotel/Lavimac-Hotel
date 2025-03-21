import { useUser } from '../context/UserContext';

export const usePermission = () => {
  const { user } = useUser();
  
  // Check if user has a specific permission
  const hasPermission = (permission) => {
    if (!user) return false;
    
    // Admins have all permissions
    if (user.role === 'admin') return true;
    
    // Check if user has the specific permission
    return user.permissions && user.permissions.includes(permission);
  };
  
  // Check if user has any of the given permissions
  const hasAnyPermission = (permissions) => {
    if (!user) return false;
    
    // Admins have all permissions
    if (user.role === 'admin') return true;
    
    // Check if user has any of the permissions
    return permissions.some(permission => 
      user.permissions && user.permissions.includes(permission)
    );
  };
  
  // Check if user has all of the given permissions
  const hasAllPermissions = (permissions) => {
    if (!user) return false;
    
    // Admins have all permissions
    if (user.role === 'admin') return true;
    
    // Check if user has all of the permissions
    return permissions.every(permission => 
      user.permissions && user.permissions.includes(permission)
    );
  };
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}; 