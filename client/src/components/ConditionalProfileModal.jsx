import React from 'react';
import { useUser } from '../context/UserContext';
import ProfileModal from './ProfileModal';
import EnhancedProfileModal from './EnhancedProfileModal';

/**
 * ConditionalProfileModal - Renders either the standard ProfileModal or 
 * the EnhancedProfileModal based on the user's role
 */
const ConditionalProfileModal = ({ isOpen, onClose }) => {
  const { user } = useUser();
  
  // Check if user is admin or manager
  const isAdminOrManager = user && (user.role === 'admin' || user.role === 'manager');
  
  // Render the appropriate modal based on user role
  return isAdminOrManager ? (
    <EnhancedProfileModal isOpen={isOpen} onClose={onClose} />
  ) : (
    <ProfileModal isOpen={isOpen} onClose={onClose} />
  );
};

export default ConditionalProfileModal;
