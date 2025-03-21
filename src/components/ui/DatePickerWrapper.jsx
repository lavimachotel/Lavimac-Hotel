import React, { Component } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

/**
 * Error boundary specifically for DatePicker components
 */
class DatePickerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('DatePicker Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI with a simple input field
      const { isDarkMode, onChange, selected, field, error } = this.props;
      return (
        <div>
          <input
            type="text"
            className={`mt-1 block w-full border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md shadow-sm p-2`}
            value={selected ? selected.toLocaleDateString() : ''}
            onChange={(e) => {
              // Try to parse the date or just use today
              try {
                const date = new Date(e.target.value);
                if (!isNaN(date.getTime())) {
                  onChange(date);
                }
              } catch (err) {
                // Ignore parsing errors
              }
            }}
            placeholder="MM/DD/YYYY"
          />
          {error && <p className="text-red-500 text-xs italic">{error}</p>}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * A wrapper for DatePicker that adds error handling
 */
const DatePickerWrapper = ({
  selected,
  onChange,
  className,
  wrapperClassName,
  isDarkMode,
  field,
  error,
  ...restProps
}) => {
  return (
    <DatePickerErrorBoundary isDarkMode={isDarkMode} onChange={onChange} selected={selected} field={field} error={error}>
      <DatePicker
        selected={selected}
        onChange={onChange}
        className={className}
        wrapperClassName={wrapperClassName || 'w-full'}
        shouldCloseOnSelect={true}
        fixedHeight={true}
        dateFormat="MM/dd/yyyy"
        {...restProps}
      />
      {error && <p className="text-red-500 text-xs italic">{error}</p>}
    </DatePickerErrorBoundary>
  );
};

export default DatePickerWrapper; 