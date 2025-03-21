import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Button component that supports various styles, sizes and states
 * 
 * @param {Object} props - Component props
 * @param {string} props.variant - Button style variant (primary, secondary, success, danger, warning, info)
 * @param {string} props.size - Button size (sm, md, lg)
 * @param {boolean} props.isLoading - Whether the button is in loading state
 * @param {boolean} props.isFullWidth - Whether the button takes full width of its container
 * @param {boolean} props.isOutlined - Whether the button has outlined style
 * @param {boolean} props.isDisabled - Whether the button is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onClick - Click handler
 * @param {React.ReactNode} props.children - Button content
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isFullWidth = false,
  isOutlined = false,
  isDisabled = false,
  className = '',
  onClick,
  children,
  ...rest
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Base classes
  const baseClasses = 'font-medium rounded transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  // Variant classes for filled buttons
  const filledVariantClasses = {
    primary: `bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 ${isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    secondary: `bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-500 ${isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    success: `bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 ${isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    danger: `bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 ${isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    warning: `bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-500 ${isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    info: `bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-500 ${isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`
  };

  // Variant classes for outlined buttons
  const outlinedVariantClasses = {
    primary: `border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 ${isDarkMode ? 'hover:bg-blue-900 hover:bg-opacity-20 focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    secondary: `border border-gray-500 text-gray-500 hover:bg-gray-50 focus:ring-gray-500 ${isDarkMode ? 'hover:bg-gray-700 hover:bg-opacity-20 focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    success: `border border-green-600 text-green-600 hover:bg-green-50 focus:ring-green-500 ${isDarkMode ? 'hover:bg-green-900 hover:bg-opacity-20 focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    danger: `border border-red-600 text-red-600 hover:bg-red-50 focus:ring-red-500 ${isDarkMode ? 'hover:bg-red-900 hover:bg-opacity-20 focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    warning: `border border-yellow-500 text-yellow-500 hover:bg-yellow-50 focus:ring-yellow-500 ${isDarkMode ? 'hover:bg-yellow-900 hover:bg-opacity-20 focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    info: `border border-cyan-500 text-cyan-500 hover:bg-cyan-50 focus:ring-cyan-500 ${isDarkMode ? 'hover:bg-cyan-900 hover:bg-opacity-20 focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`
  };

  // Disabled classes
  const disabledClasses = 'opacity-50 cursor-not-allowed';

  // Full width class
  const fullWidthClass = isFullWidth ? 'w-full' : '';

  // Determine the variant classes based on outlined prop
  const variantClasses = isOutlined ? outlinedVariantClasses[variant] : filledVariantClasses[variant];

  // Combine all classes
  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses}
    ${isDisabled || isLoading ? disabledClasses : ''}
    ${fullWidthClass}
    ${className}
  `;

  return (
    <button
      className={buttonClasses}
      disabled={isDisabled || isLoading}
      onClick={onClick}
      {...rest}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {children}
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default Button; 