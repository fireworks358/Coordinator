// src/services/firebaseService.js
// Firebase Realtime Database operations

import { ref, set, get, update, onValue, off } from 'firebase/database';
import { database } from '../firebase.js';
import { arrayToFirebaseObject, firebaseObjectToArray } from './dataTransformers.js';

const DB_PATH = 'coordinator';

/**
 * Firebase Service Class
 * Handles all Firebase Realtime Database operations
 */
class FirebaseService {
  constructor() {
    this.listeners = new Map();
    this.isConnected = false;
    this.connectionCallbacks = new Set();
    this.initConnectionMonitor();
  }

  /**
   * Monitor Firebase connection status
   */
  initConnectionMonitor() {
    const connectedRef = ref(database, '.info/connected');
    onValue(connectedRef, (snapshot) => {
      const wasConnected = this.isConnected;
      this.isConnected = snapshot.val() === true;
      console.log(`Firebase connection status: ${this.isConnected ? 'connected' : 'disconnected'}`);

      // Notify callbacks when connection state changes from disconnected to connected
      if (!wasConnected && this.isConnected) {
        console.log('[FirebaseService] Connection established, notifying callbacks');
        this.connectionCallbacks.forEach(callback => {
          try {
            callback(true);
          } catch (error) {
            console.error('Error in connection callback:', error);
          }
        });
      }
    });
  }

  /**
   * Get connection status
   * @returns {boolean} True if connected to Firebase
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Subscribe to connection state changes
   * @param {Function} callback - Function to call when connected
   * @returns {Function} Unsubscribe function
   */
  onConnectionChange(callback) {
    this.connectionCallbacks.add(callback);

    // If already connected, call immediately
    if (this.isConnected) {
      callback(true);
    }

    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  // ==================== THEATRE OPERATIONS ====================

  /**
   * Get all theatres from Firebase
   * @returns {Promise<Array>} Array of theatre objects
   */
  async getTheatres() {
    try {
      const theatresRef = ref(database, `${DB_PATH}/theatres`);
      const snapshot = await get(theatresRef);
      return firebaseObjectToArray(snapshot.val());
    } catch (error) {
      console.error('Error getting theatres from Firebase:', error);
      throw error;
    }
  }

  /**
   * Set a single theatre in Firebase
   * @param {string} theatreName - Theatre name (key)
   * @param {Object} theatreData - Theatre data object
   * @returns {Promise<void>}
   */
  async setTheatre(theatreName, theatreData) {
    try {
      const theatreRef = ref(database, `${DB_PATH}/theatres/${theatreName}`);
      await set(theatreRef, {
        ...theatreData,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Error setting theatre in Firebase:', error);
      throw error;
    }
  }

  /**
   * Update multiple theatres at once
   * @param {Array} theatresArray - Array of theatre objects
   * @returns {Promise<void>}
   */
  async setTheatres(theatresArray) {
    try {
      const theatresRef = ref(database, `${DB_PATH}/theatres`);
      const theatresObject = arrayToFirebaseObject(theatresArray);
      await set(theatresRef, theatresObject);
    } catch (error) {
      console.error('Error setting theatres in Firebase:', error);
      throw error;
    }
  }

  /**
   * Subscribe to theatre changes in real-time
   * @param {Function} callback - Function to call when theatres change
   * @returns {Function} Unsubscribe function
   */
  subscribeToTheatres(callback) {
    const theatresRef = ref(database, `${DB_PATH}/theatres`);

    const listener = onValue(theatresRef, (snapshot) => {
      const theatresArray = firebaseObjectToArray(snapshot.val());
      callback(theatresArray);
    }, (error) => {
      console.error('Error in theatres subscription:', error);
    });

    this.listeners.set('theatres', { ref: theatresRef, listener });

    return () => {
      off(theatresRef);
      this.listeners.delete('theatres');
    };
  }

  // ==================== PRACTITIONER OPERATIONS ====================

  /**
   * Get all practitioners from Firebase
   * @returns {Promise<Array>} Array of practitioner objects
   */
  async getPractitioners() {
    try {
      const practitionersRef = ref(database, `${DB_PATH}/practitioners`);
      const snapshot = await get(practitionersRef);
      return firebaseObjectToArray(snapshot.val());
    } catch (error) {
      console.error('Error getting practitioners from Firebase:', error);
      throw error;
    }
  }

  /**
   * Set all practitioners in Firebase
   * @param {Array} practitionersArray - Array of practitioner objects
   * @returns {Promise<void>}
   */
  async setPractitioners(practitionersArray) {
    try {
      const practitionersRef = ref(database, `${DB_PATH}/practitioners`);
      const practitionersObject = arrayToFirebaseObject(practitionersArray);
      await set(practitionersRef, practitionersObject);
    } catch (error) {
      console.error('Error setting practitioners in Firebase:', error);
      throw error;
    }
  }

  /**
   * Update a single practitioner in Firebase
   * @param {string} practitionerName - Practitioner name (key)
   * @param {Object} updates - Object with fields to update
   * @returns {Promise<void>}
   */
  async updatePractitioner(practitionerName, updates) {
    try {
      const practitionerRef = ref(database, `${DB_PATH}/practitioners/${practitionerName}`);
      await update(practitionerRef, {
        ...updates,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Error updating practitioner in Firebase:', error);
      throw error;
    }
  }

  /**
   * Subscribe to practitioner changes in real-time
   * @param {Function} callback - Function to call when practitioners change
   * @returns {Function} Unsubscribe function
   */
  subscribeToPractitioners(callback) {
    const practitionersRef = ref(database, `${DB_PATH}/practitioners`);

    const listener = onValue(practitionersRef, (snapshot) => {
      const practitionersArray = firebaseObjectToArray(snapshot.val());
      callback(practitionersArray);
    }, (error) => {
      console.error('Error in practitioners subscription:', error);
    });

    this.listeners.set('practitioners', { ref: practitionersRef, listener });

    return () => {
      off(practitionersRef);
      this.listeners.delete('practitioners');
    };
  }

  // ==================== DAY-BASED THEATRE OPERATIONS ====================

  /**
   * Get theatres for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @returns {Promise<Array>} Array of theatre objects
   */
  async getTheatresForDay(dayOfWeek) {
    try {
      const theatresRef = ref(database, `${DB_PATH}/theatresByDay/${dayOfWeek}`);
      const snapshot = await get(theatresRef);
      return firebaseObjectToArray(snapshot.val());
    } catch (error) {
      console.error(`Error getting theatres for ${dayOfWeek} from Firebase:`, error);
      throw error;
    }
  }

  /**
   * Set theatres for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {Array} theatresArray - Array of theatre objects
   * @returns {Promise<void>}
   */
  async setTheatresForDay(dayOfWeek, theatresArray) {
    try {
      const theatresRef = ref(database, `${DB_PATH}/theatresByDay/${dayOfWeek}`);
      const theatresObject = arrayToFirebaseObject(theatresArray);
      await set(theatresRef, theatresObject);
    } catch (error) {
      console.error(`Error setting theatres for ${dayOfWeek} in Firebase:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to theatre changes for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {Function} callback - Function to call when theatres change
   * @returns {Function} Unsubscribe function
   */
  subscribeToTheatresForDay(dayOfWeek, callback) {
    const theatresRef = ref(database, `${DB_PATH}/theatresByDay/${dayOfWeek}`);
    console.log(`[FirebaseService] Subscribing to theatres for ${dayOfWeek} at path: ${DB_PATH}/theatresByDay/${dayOfWeek}`);

    const listener = onValue(theatresRef, (snapshot) => {
      const theatresArray = firebaseObjectToArray(snapshot.val());
      console.log(`[FirebaseService] Received update for ${dayOfWeek}: ${theatresArray.length} theatres`);
      callback(theatresArray);
    }, (error) => {
      console.error(`Error in theatres subscription for ${dayOfWeek}:`, error);
    });

    this.listeners.set(`theatres-${dayOfWeek}`, { ref: theatresRef, listener });

    return () => {
      console.log(`[FirebaseService] Unsubscribing from theatres for ${dayOfWeek}`);
      off(theatresRef);
      this.listeners.delete(`theatres-${dayOfWeek}`);
    };
  }

  // ==================== DAY-BASED PRACTITIONER OPERATIONS ====================

  /**
   * Get practitioners for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @returns {Promise<Array>} Array of practitioner objects
   */
  async getPractitionersForDay(dayOfWeek) {
    try {
      const practitionersRef = ref(database, `${DB_PATH}/practitionersByDay/${dayOfWeek}`);
      const snapshot = await get(practitionersRef);
      return firebaseObjectToArray(snapshot.val());
    } catch (error) {
      console.error(`Error getting practitioners for ${dayOfWeek} from Firebase:`, error);
      throw error;
    }
  }

  /**
   * Set practitioners for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {Array} practitionersArray - Array of practitioner objects
   * @returns {Promise<void>}
   */
  async setPractitionersForDay(dayOfWeek, practitionersArray) {
    try {
      const practitionersRef = ref(database, `${DB_PATH}/practitionersByDay/${dayOfWeek}`);
      const practitionersObject = arrayToFirebaseObject(practitionersArray);
      await set(practitionersRef, practitionersObject);
    } catch (error) {
      console.error(`Error setting practitioners for ${dayOfWeek} in Firebase:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to practitioner changes for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {Function} callback - Function to call when practitioners change
   * @returns {Function} Unsubscribe function
   */
  subscribeToPractitionersForDay(dayOfWeek, callback) {
    const practitionersRef = ref(database, `${DB_PATH}/practitionersByDay/${dayOfWeek}`);

    const listener = onValue(practitionersRef, (snapshot) => {
      const practitionersArray = firebaseObjectToArray(snapshot.val());
      callback(practitionersArray);
    }, (error) => {
      console.error(`Error in practitioners subscription for ${dayOfWeek}:`, error);
    });

    this.listeners.set(`practitioners-${dayOfWeek}`, { ref: practitionersRef, listener });

    return () => {
      off(practitionersRef);
      this.listeners.delete(`practitioners-${dayOfWeek}`);
    };
  }

  // ==================== ROSTER DATE OPERATIONS ====================

  /**
   * Get roster date for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @returns {Promise<string|null>} Roster date string or null
   */
  async getRosterDateForDay(dayOfWeek) {
    try {
      const rosterDateRef = ref(database, `${DB_PATH}/rosterDatesByDay/${dayOfWeek}`);
      const snapshot = await get(rosterDateRef);
      return snapshot.val() || null;
    } catch (error) {
      console.error(`Error getting roster date for ${dayOfWeek} from Firebase:`, error);
      throw error;
    }
  }

  /**
   * Set roster date for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {string} rosterDate - Roster date string (e.g., '25/12/2024')
   * @returns {Promise<void>}
   */
  async setRosterDateForDay(dayOfWeek, rosterDate) {
    try {
      const rosterDateRef = ref(database, `${DB_PATH}/rosterDatesByDay/${dayOfWeek}`);
      await set(rosterDateRef, rosterDate);
    } catch (error) {
      console.error(`Error setting roster date for ${dayOfWeek} in Firebase:`, error);
      throw error;
    }
  }

  // ==================== SETTINGS OPERATIONS ====================

  /**
   * Get theme setting from Firebase
   * @returns {Promise<string>} Theme value ('dark' or 'light')
   */
  async getTheme() {
    try {
      const themeRef = ref(database, `${DB_PATH}/settings/theme`);
      const snapshot = await get(themeRef);
      return snapshot.val() || 'dark';
    } catch (error) {
      console.error('Error getting theme from Firebase:', error);
      throw error;
    }
  }

  /**
   * Set theme setting in Firebase
   * @param {string} theme - Theme value ('dark' or 'light')
   * @returns {Promise<void>}
   */
  async setTheme(theme) {
    try {
      const themeRef = ref(database, `${DB_PATH}/settings/theme`);
      await set(themeRef, theme);
    } catch (error) {
      console.error('Error setting theme in Firebase:', error);
      throw error;
    }
  }

  /**
   * Get highlight settings from Firebase
   * @returns {Promise<Object>} Highlight settings object
   */
  async getHighlightSettings() {
    try {
      const highlightRef = ref(database, `${DB_PATH}/settings/highlightSettings`);
      const snapshot = await get(highlightRef);
      return snapshot.val() || {
        highlightEarlies: true,
        highlight1730s: true,
        highlight1830s: true,
        highlightLates: true
      };
    } catch (error) {
      console.error('Error getting highlight settings from Firebase:', error);
      throw error;
    }
  }

  /**
   * Set highlight settings in Firebase
   * @param {Object} settings - Highlight settings object
   * @returns {Promise<void>}
   */
  async setHighlightSettings(settings) {
    try {
      const highlightRef = ref(database, `${DB_PATH}/settings/highlightSettings`);
      await set(highlightRef, settings);
    } catch (error) {
      console.error('Error setting highlight settings in Firebase:', error);
      throw error;
    }
  }

  /**
   * Subscribe to settings changes in real-time
   * @param {Function} callback - Function to call when settings change
   * @returns {Function} Unsubscribe function
   */
  subscribeToSettings(callback) {
    const settingsRef = ref(database, `${DB_PATH}/settings`);

    const listener = onValue(settingsRef, (snapshot) => {
      const settings = snapshot.val() || {};
      callback(settings);
    }, (error) => {
      console.error('Error in settings subscription:', error);
    });

    this.listeners.set('settings', { ref: settingsRef, listener });

    return () => {
      off(settingsRef);
      this.listeners.delete('settings');
    };
  }

  /**
   * Get selected day from Firebase
   * @returns {Promise<string>} Selected day name (e.g., 'monday')
   */
  async getSelectedDay() {
    try {
      const dayRef = ref(database, `${DB_PATH}/settings/selectedDay`);
      const snapshot = await get(dayRef);
      return snapshot.val() || null;
    } catch (error) {
      console.error('Error getting selected day from Firebase:', error);
      throw error;
    }
  }

  /**
   * Set selected day in Firebase
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @returns {Promise<void>}
   */
  async setSelectedDay(dayOfWeek) {
    try {
      const dayRef = ref(database, `${DB_PATH}/settings/selectedDay`);
      await set(dayRef, dayOfWeek);
    } catch (error) {
      console.error('Error setting selected day in Firebase:', error);
      throw error;
    }
  }

  // ==================== UTILITY OPERATIONS ====================

  /**
   * Export all data from Firebase
   * @returns {Promise<Object>} Object with all data
   */
  async exportAllData() {
    try {
      const [theatres, practitioners, theme, highlightSettings] = await Promise.all([
        this.getTheatres(),
        this.getPractitioners(),
        this.getTheme(),
        this.getHighlightSettings()
      ]);

      return {
        theatres,
        practitionerList: practitioners,
        theme,
        highlightSettings
      };
    } catch (error) {
      console.error('Error exporting data from Firebase:', error);
      throw error;
    }
  }

  /**
   * Import all data to Firebase
   * @param {Object} data - Data object with theatres and practitionerList
   * @returns {Promise<void>}
   */
  async importAllData(data) {
    try {
      const promises = [];

      if (data.theatres) {
        promises.push(this.setTheatres(data.theatres));
      }

      if (data.practitionerList) {
        promises.push(this.setPractitioners(data.practitionerList));
      }

      if (data.theme) {
        promises.push(this.setTheme(data.theme));
      }

      if (data.highlightSettings) {
        promises.push(this.setHighlightSettings(data.highlightSettings));
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Error importing data to Firebase:', error);
      throw error;
    }
  }

  /**
   * Cleanup all listeners
   */
  cleanup() {
    this.listeners.forEach(({ ref: dbRef }) => {
      off(dbRef);
    });
    this.listeners.clear();
  }
}

// Export singleton instance
const firebaseService = new FirebaseService();
export default firebaseService;
