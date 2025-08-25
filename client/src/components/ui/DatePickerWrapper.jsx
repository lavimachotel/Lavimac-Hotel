import React, { Component } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { datePickerConfig } from '../../utils/dateUtils';

/**
 * Error boundary specifically for DatePicker components
 */
class DatePickerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('DatePicker Error:', error, errorInfo);
  }

  render() {
    const { isDarkMode, onChange, selected, field, error, children } = this.props;
    
    if (this.state.hasError) {
      return (
        <div className={`w-full h-10 px-3 py-2 rounded-md border ${error ? 'border-red-500' : isDarkMode ? 'border-gray-600' : 'border-gray-300'} ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}>
          <div className="flex items-center justify-between">
            <div className="text-sm text-red-500">Error displaying date picker</div>
            <button 
              onClick={() => onChange(null)} 
              className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Clear
            </button>
          </div>
          {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
        </div>
      );
    }

    return children;
  }
}

/**
 * A wrapper for DatePicker that adds error handling
 */
const DatePickerWrapper = ({
  selected, 
  onChange, 
  isDarkMode, 
  field,
  error,
  ...props
}) => {
  return (
    <DatePickerErrorBoundary isDarkMode={isDarkMode} onChange={onChange} selected={selected} field={field} error={error}>
      <DatePicker
        selected={selected}
        onChange={onChange}
        className={`w-full h-10 px-3 py-2 rounded-md border ${error ? 'border-red-500' : isDarkMode ? 'border-gray-600' : 'border-gray-300'} ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
        wrapperClassName="w-full"
        popperClassName={isDarkMode ? 'react-datepicker-dark' : ''}
        {...datePickerConfig}
        {...props}
      />
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </DatePickerErrorBoundary>
  );
};

export default DatePickerWrapper; 