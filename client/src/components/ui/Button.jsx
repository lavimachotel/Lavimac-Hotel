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
  const baseClasses = 'font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 border border-transparent backdrop-blur-sm';

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  // Variant classes for filled buttons
  const filledVariantClasses = {
    primary: `bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white focus:ring-blue-500 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-600/30 ${isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    secondary: `bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-700 hover:to-gray-600 text-white focus:ring-gray-500 shadow-md shadow-gray-500/10 hover:shadow-lg hover:shadow-gray-600/20 ${isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    success: `bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white focus:ring-green-500 shadow-md shadow-green-500/20 hover:shadow-lg hover:shadow-green-600/30 ${isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    danger: `bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white focus:ring-red-500 shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-600/30 ${isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    warning: `bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white focus:ring-yellow-500 shadow-md shadow-yellow-500/20 hover:shadow-lg hover:shadow-yellow-600/30 ${isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    info: `bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white focus:ring-cyan-500 shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-600/30 ${isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`
  };

  // Variant classes for outlined buttons
  const outlinedVariantClasses = {
    primary: `border border-blue-500 text-blue-500 hover:bg-blue-500/10 focus:ring-blue-500 ${isDarkMode ? 'text-blue-400 border-blue-400 hover:text-blue-300 hover:border-blue-300 focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    secondary: `border border-gray-500 text-gray-500 hover:bg-gray-500/10 focus:ring-gray-500 ${isDarkMode ? 'text-gray-400 border-gray-400 hover:text-gray-300 hover:border-gray-300 focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    success: `border border-green-500 text-green-500 hover:bg-green-500/10 focus:ring-green-500 ${isDarkMode ? 'text-green-400 border-green-400 hover:text-green-300 hover:border-green-300 focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    danger: `border border-red-500 text-red-500 hover:bg-red-500/10 focus:ring-red-500 ${isDarkMode ? 'text-red-400 border-red-400 hover:text-red-300 hover:border-red-300 focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    warning: `border border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 focus:ring-yellow-500 ${isDarkMode ? 'text-yellow-400 border-yellow-400 hover:text-yellow-300 hover:border-yellow-300 focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`,
    info: `border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 focus:ring-cyan-500 ${isDarkMode ? 'text-cyan-400 border-cyan-400 hover:text-cyan-300 hover:border-cyan-300 focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`
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