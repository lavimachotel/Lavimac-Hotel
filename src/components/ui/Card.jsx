import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Header component for Card
 */
const Header = ({ children, className = '', ...rest }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  return (
    <div 
      className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} px-6 py-4 ${className}`} 
      {...rest}
    >
      {children}
    </div>
  );
};

/**
 * Body component for Card
 */
const Body = ({ children, className = '', ...rest }) => {
  return (
    <div className={`px-6 py-4 ${className}`} {...rest}>
      {children}
    </div>
  );
};

/**
 * Footer component for Card
 */
const Footer = ({ children, className = '', ...rest }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  return (
    <div 
      className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} px-6 py-3 ${className}`} 
      {...rest}
    >
      {children}
    </div>
  );
};

/**
 * Card component for displaying content in a box
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {React.ReactNode} props.children - Card content
 * @param {React.ReactNode} props.footer - Card footer content
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.hoverable - Whether the card has hover effect
 * @param {boolean} props.noPadding - Whether to remove padding
 */
const Card = ({
  title,
  children,
  footer,
  className = '',
  hoverable = false,
  noPadding = false,
  ...rest
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Base classes
  const baseClasses = `
    rounded-lg shadow-sm overflow-hidden
    ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}
    ${hoverable ? (isDarkMode ? 'hover:bg-gray-700 hover:shadow-md' : 'hover:shadow-md transition-shadow') : ''}
    ${className}
  `;

  return (
    <div className={baseClasses} {...rest}>
      {title && (
        <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${noPadding ? '' : 'px-6 py-4'}`}>
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
      )}
      
      <div className={noPadding ? '' : 'px-6 py-4'}>
        {children}
      </div>
      
      {footer && (
        <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${noPadding ? '' : 'px-6 py-3'}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

// Attach subcomponents to Card
Card.Header = Header;
Card.Body = Body;
Card.Footer = Footer;

export default Card; 