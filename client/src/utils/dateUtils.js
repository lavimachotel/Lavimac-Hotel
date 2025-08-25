import { format, isValid, parse, parseISO } from 'date-fns';

/**
 * Format a date to DD/MM/YYYY
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date in DD/MM/YYYY format
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  try {
    let dateObj;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      // Try parsing as ISO string first
      dateObj = parseISO(date);
      
      // If not valid, try other common formats
      if (!isValid(dateObj)) {
        // Try MM/DD/YYYY (US format)
        dateObj = parse(date, 'MM/dd/yyyy', new Date());
      }
      
      // If still not valid, try DD/MM/YYYY (UK format)
      if (!isValid(dateObj)) {
        dateObj = parse(date, 'dd/MM/yyyy', new Date());
      }
      
      // If still not valid, use the original string
      if (!isValid(dateObj)) {
        return date;
      }
    } else {
      return '';
    }
    
    return format(dateObj, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Date formatting error:', error, date);
    return date?.toString() || '';
  }
};

/**
 * Configuration for DatePicker components
 */
export const datePickerConfig = {
  dateFormat: 'dd/MM/yyyy',
  showMonthDropdown: true,
  showYearDropdown: true,
  dropdownMode: 'select',
  yearDropdownItemNumber: 15
}; 