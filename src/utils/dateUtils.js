// src/utils/dateUtils.js
// Utility functions for day-of-week operations

/**
 * Get current day of week in lowercase
 * @returns {string} Day name (e.g., "monday", "tuesday")
 */
export const getCurrentDayOfWeek = () => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = new Date().getDay();
  return days[today];
};

/**
 * Get all day names in order (Monday first)
 * @returns {string[]} Array of day names
 */
export const getAllDays = () => [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

/**
 * Get short day name from full form
 * @param {string} fullDay - Full day (e.g., "monday")
 * @returns {string} Short day name (e.g., "Mon")
 */
export const getShortDayName = (fullDay) => {
  const map = {
    'monday': 'Mon',
    'tuesday': 'Tue',
    'wednesday': 'Wed',
    'thursday': 'Thu',
    'friday': 'Fri',
    'saturday': 'Sat',
    'sunday': 'Sun'
  };
  return map[fullDay] || 'Mon';
};

/**
 * Format a date string from DD/MM/YYYY to "DayName DDth Month"
 * @param {string} dateString - Date in format "DD/MM/YYYY" (e.g., "19/12/2025")
 * @returns {string} Formatted date (e.g., "Friday 19th Dec")
 */
export const formatRosterDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') {
    return '';
  }

  try {
    // Parse DD/MM/YYYY format
    const parts = dateString.split('/');
    if (parts.length !== 3) {
      console.error('Invalid date format:', dateString);
      return '';
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    const year = parseInt(parts[2], 10);

    // Create date object
    const date = new Date(year, month, day);

    // Get day name
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];

    // Get month abbreviation
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[month];

    // Get ordinal suffix for day
    const getOrdinal = (n) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return `${dayName} ${getOrdinal(day)} ${monthName}`;
  } catch (error) {
    console.error('Error formatting roster date:', error);
    return '';
  }
};
