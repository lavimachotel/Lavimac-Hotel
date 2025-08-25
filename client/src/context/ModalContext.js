import React, { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

/**
 * ModalProvider manages the state of all modals in the application
 * It allows opening and closing modals from anywhere in the app
 * without prop drilling
 */
export const ModalProvider = ({ children }) => {
  const [modals, setModals] = useState({
    checkIn: { isOpen: false, props: {} },
    reservation: { isOpen: false, props: {} },
    guestView: { isOpen: false, props: {} },
    guestEdit: { isOpen: false, props: {} },
    userProfile: { isOpen: false, props: {} },
    deleteConfirmation: { isOpen: false, props: {} }
  });

  /**
   * Open a modal with the given props
   * @param {string} modalName - The name of the modal to open
   * @param {Object} props - Props to pass to the modal
   */
  const openModal = (modalName, props = {}) => {
    if (!modals.hasOwnProperty(modalName)) {
      console.warn(`Modal "${modalName}" is not registered in ModalContext`);
      return;
    }

    setModals(prev => ({
      ...prev,
      [modalName]: { isOpen: true, props }
    }));
  };

  /**
   * Close a modal
   * @param {string} modalName - The name of the modal to close
   */
  const closeModal = (modalName) => {
    if (!modals.hasOwnProperty(modalName)) {
      console.warn(`Modal "${modalName}" is not registered in ModalContext`);
      return;
    }

    setModals(prev => ({
      ...prev,
      [modalName]: { isOpen: false, props: {} }
    }));
  };

  /**
   * Close all modals
   */
  const closeAllModals = () => {
    const resetModals = Object.keys(modals).reduce((acc, modalName) => {
      acc[modalName] = { isOpen: false, props: {} };
      return acc;
    }, {});
    
    setModals(resetModals);
  };

  /**
   * Register a new modal dynamically
   * @param {string} modalName - The name of the modal to register
   */
  const registerModal = (modalName) => {
    if (modals.hasOwnProperty(modalName)) {
      console.warn(`Modal "${modalName}" is already registered`);
      return;
    }

    setModals(prev => ({
      ...prev,
      [modalName]: { isOpen: false, props: {} }
    }));
  };

  return (
    <ModalContext.Provider
      value={{
        modals,
        openModal,
        closeModal,
        closeAllModals,
        registerModal
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModals = () => useContext(ModalContext); 