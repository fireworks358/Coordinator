// src/services/dataTransformers.js
// Utilities for converting between localStorage arrays and Firebase objects

/**
 * Converts an array to a Firebase-friendly object indexed by a key field
 * @param {Array} array - Array of objects to convert
 * @param {string} keyField - Field name to use as object key (default: 'name')
 * @returns {Object} Object indexed by keyField values
 */
export const arrayToFirebaseObject = (array, keyField = 'name') => {
  if (!Array.isArray(array) || array.length === 0) {
    return {};
  }

  return array.reduce((acc, item) => {
    const key = item[keyField];
    if (key) {
      acc[key] = {
        ...item,
        lastUpdated: Date.now()
      };
    }
    return acc;
  }, {});
};

/**
 * Converts a Firebase object back to an array for component consumption
 * @param {Object} firebaseObject - Firebase object to convert
 * @returns {Array} Array of objects without lastUpdated timestamps
 */
export const firebaseObjectToArray = (firebaseObject) => {
  if (!firebaseObject || typeof firebaseObject !== 'object') {
    return [];
  }

  return Object.values(firebaseObject).map(({ lastUpdated, ...item }) => item);
};

/**
 * Merges local and remote data using last-write-wins strategy based on timestamps
 * @param {Array} localData - Local data array
 * @param {Array} remoteData - Remote data array
 * @param {string} keyField - Field to use as unique identifier (default: 'name')
 * @returns {Array} Merged array with most recent data
 */
export const mergeByTimestamp = (localData, remoteData, keyField = 'name') => {
  const merged = new Map();

  // Add all remote data
  if (Array.isArray(remoteData)) {
    remoteData.forEach(item => {
      merged.set(item[keyField], item);
    });
  }

  // Overwrite with local data if newer
  if (Array.isArray(localData)) {
    localData.forEach(item => {
      const existing = merged.get(item[keyField]);
      if (!existing || !item.lastUpdated || !existing.lastUpdated ||
          item.lastUpdated > existing.lastUpdated) {
        merged.set(item[keyField], item);
      }
    });
  }

  return Array.from(merged.values());
};

/**
 * Safely stringify data for localStorage
 * @param {*} data - Data to stringify
 * @returns {string|null} JSON string or null if error
 */
export const safeStringify = (data) => {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error('Error stringifying data:', error);
    return null;
  }
};

/**
 * Safely parse JSON data from localStorage
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed data or default value
 */
export const safeParse = (jsonString, defaultValue = null) => {
  try {
    return jsonString ? JSON.parse(jsonString) : defaultValue;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
};
