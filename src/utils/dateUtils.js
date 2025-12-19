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
