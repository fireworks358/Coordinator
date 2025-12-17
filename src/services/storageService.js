// src/services/storageService.js
// Unified storage interface with Firebase and localStorage fallback

import firebaseService from './firebaseService.js';
import { safeStringify, safeParse } from './dataTransformers.js';

// ===== FIREBASE TOGGLE =====
// Set to false to use localStorage only (no Firebase)
const USE_FIREBASE = true; // Change to true to re-enable Firebase
// ===========================

/**
 * Storage Service Class
 * Provides unified interface for data operations with automatic fallback
 */
class StorageService {
  constructor() {
    this.mode = USE_FIREBASE ? 'firebase' : 'localStorage';
    if (USE_FIREBASE) {
      this.initializeConnectionMonitoring();
    } else {
      console.log('Firebase disabled - using localStorage only');
    }
  }

  /**
   * Monitor connection and switch modes automatically
   */
  initializeConnectionMonitoring() {
    // Check connection status periodically
    setInterval(() => {
      const isConnected = firebaseService.getConnectionStatus();
      if (this.mode === 'firebase' && !isConnected) {
        console.warn('Firebase disconnected. Switching to localStorage mode.');
        this.mode = 'localStorage';
      } else if (this.mode === 'localStorage' && isConnected) {
        console.log('Firebase reconnected. Switching back to Firebase mode.');
        this.mode = 'firebase';
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Get current storage mode
   * @returns {string} Current mode ('firebase' or 'localStorage')
   */
  getMode() {
    return this.mode;
  }

  /**
   * Check if Firebase is available
   * @returns {boolean}
   */
  isFirebaseAvailable() {
    return this.mode === 'firebase' && firebaseService.getConnectionStatus();
  }

  // ==================== LOCAL STORAGE HELPERS ====================

  /**
   * Save to localStorage with error handling
   * @param {string} key - Storage key
   * @param {*} data - Data to store
   */
  saveToLocalStorage(key, data) {
    try {
      const jsonString = safeStringify(data);
      if (jsonString) {
        localStorage.setItem(key, jsonString);
      }
    } catch (error) {
      console.error(`Error saving to localStorage (${key}):`, error);
    }
  }

  /**
   * Load from localStorage with error handling
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} Parsed data or default value
   */
  loadFromLocalStorage(key, defaultValue) {
    try {
      const jsonString = localStorage.getItem(key);
      return safeParse(jsonString, defaultValue);
    } catch (error) {
      console.error(`Error loading from localStorage (${key}):`, error);
      return defaultValue;
    }
  }

  // ==================== THEATRE OPERATIONS ====================

  /**
   * Get all theatres (from Firebase or localStorage)
   * @returns {Promise<Array>} Array of theatre objects
   */
  async getTheatres() {
    if (this.isFirebaseAvailable()) {
      try {
        return await firebaseService.getTheatres();
      } catch (error) {
        console.error('Error getting theatres from Firebase, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    return this.loadFromLocalStorage('theatreData', []);
  }

  /**
   * Set a single theatre
   * @param {string} theatreName - Theatre name
   * @param {Object} theatreData - Theatre data object
   * @returns {Promise<void>}
   */
  async setTheatre(theatreName, theatreData) {
    // Always save to localStorage for redundancy
    const currentTheatres = this.loadFromLocalStorage('theatreData', []);
    const updatedTheatres = currentTheatres.map(t =>
      t.name === theatreName ? { ...t, ...theatreData } : t
    );
    this.saveToLocalStorage('theatreData', updatedTheatres);

    // Try to save to Firebase if available
    if (this.isFirebaseAvailable()) {
      try {
        await firebaseService.setTheatre(theatreName, theatreData);
      } catch (error) {
        console.error('Error setting theatre in Firebase:', error);
      }
    }
  }

  /**
   * Set all theatres
   * @param {Array} theatresArray - Array of theatre objects
   * @returns {Promise<void>}
   */
  async setTheatres(theatresArray) {
    // Always save to localStorage for redundancy
    this.saveToLocalStorage('theatreData', theatresArray);

    // Try to save to Firebase if available
    if (this.isFirebaseAvailable()) {
      try {
        await firebaseService.setTheatres(theatresArray);
      } catch (error) {
        console.error('Error setting theatres in Firebase:', error);
      }
    }
  }

  /**
   * Subscribe to theatre changes
   * @param {Function} callback - Function to call when theatres change
   * @returns {Function} Unsubscribe function
   */
  subscribeToTheatres(callback) {
    // Always subscribe - Firebase listeners work even when not connected yet
    // They will automatically start receiving updates once connection is established
    return firebaseService.subscribeToTheatres(callback);
  }

  // ==================== PRACTITIONER OPERATIONS ====================

  /**
   * Get all practitioners (from Firebase or localStorage)
   * @returns {Promise<Array>} Array of practitioner objects
   */
  async getPractitioners() {
    if (this.isFirebaseAvailable()) {
      try {
        return await firebaseService.getPractitioners();
      } catch (error) {
        console.error('Error getting practitioners from Firebase, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    return this.loadFromLocalStorage('practitionerListData', []);
  }

  /**
   * Set all practitioners
   * @param {Array} practitionersArray - Array of practitioner objects
   * @returns {Promise<void>}
   */
  async setPractitioners(practitionersArray) {
    // Always save to localStorage for redundancy
    this.saveToLocalStorage('practitionerListData', practitionersArray);

    // Try to save to Firebase if available
    if (this.isFirebaseAvailable()) {
      try {
        await firebaseService.setPractitioners(practitionersArray);
      } catch (error) {
        console.error('Error setting practitioners in Firebase:', error);
      }
    }
  }

  /**
   * Update a single practitioner field
   * @param {string} practitionerName - Practitioner name
   * @param {Object} updates - Object with fields to update
   * @returns {Promise<void>}
   */
  async updatePractitioner(practitionerName, updates) {
    // Update in localStorage
    const currentPractitioners = this.loadFromLocalStorage('practitionerListData', []);
    const updatedPractitioners = currentPractitioners.map(p =>
      p.name === practitionerName ? { ...p, ...updates } : p
    );
    this.saveToLocalStorage('practitionerListData', updatedPractitioners);

    // Try to update in Firebase if available
    if (this.isFirebaseAvailable()) {
      try {
        await firebaseService.updatePractitioner(practitionerName, updates);
      } catch (error) {
        console.error('Error updating practitioner in Firebase:', error);
      }
    }
  }

  /**
   * Subscribe to practitioner changes
   * @param {Function} callback - Function to call when practitioners change
   * @returns {Function} Unsubscribe function
   */
  subscribeToPractitioners(callback) {
    // Always subscribe - Firebase listeners work even when not connected yet
    // They will automatically start receiving updates once connection is established
    return firebaseService.subscribeToPractitioners(callback);
  }

  // ==================== SETTINGS OPERATIONS ====================

  /**
   * Get theme setting
   * @returns {Promise<string>} Theme value ('dark' or 'light')
   */
  async getTheme() {
    if (this.isFirebaseAvailable()) {
      try {
        return await firebaseService.getTheme();
      } catch (error) {
        console.error('Error getting theme from Firebase, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    return this.loadFromLocalStorage('theme', 'dark');
  }

  /**
   * Set theme setting
   * @param {string} theme - Theme value ('dark' or 'light')
   * @returns {Promise<void>}
   */
  async setTheme(theme) {
    // Always save to localStorage
    this.saveToLocalStorage('theme', theme);

    // Try to save to Firebase if available
    if (this.isFirebaseAvailable()) {
      try {
        await firebaseService.setTheme(theme);
      } catch (error) {
        console.error('Error setting theme in Firebase:', error);
      }
    }
  }

  /**
   * Get highlight settings
   * @returns {Promise<Object>} Highlight settings object
   */
  async getHighlightSettings() {
    if (this.isFirebaseAvailable()) {
      try {
        return await firebaseService.getHighlightSettings();
      } catch (error) {
        console.error('Error getting highlight settings from Firebase, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    return this.loadFromLocalStorage('highlightSettings', {
      highlightEarlies: true,
      highlight1730s: true,
      highlight1830s: true,
      highlightLates: true
    });
  }

  /**
   * Set highlight settings
   * @param {Object} settings - Highlight settings object
   * @returns {Promise<void>}
   */
  async setHighlightSettings(settings) {
    // Always save to localStorage
    this.saveToLocalStorage('highlightSettings', settings);

    // Try to save to Firebase if available
    if (this.isFirebaseAvailable()) {
      try {
        await firebaseService.setHighlightSettings(settings);
      } catch (error) {
        console.error('Error setting highlight settings in Firebase:', error);
      }
    }
  }

  /**
   * Subscribe to settings changes
   * @param {Function} callback - Function to call when settings change
   * @returns {Function} Unsubscribe function
   */
  subscribeToSettings(callback) {
    // Always subscribe - Firebase listeners work even when not connected yet
    // They will automatically start receiving updates once connection is established
    return firebaseService.subscribeToSettings(callback);
  }

  // ==================== UTILITY OPERATIONS ====================

  /**
   * Export all data
   * @returns {Promise<Object>} Object with all data
   */
  async exportAllData() {
    if (this.isFirebaseAvailable()) {
      try {
        return await firebaseService.exportAllData();
      } catch (error) {
        console.error('Error exporting from Firebase, using localStorage:', error);
      }
    }

    // Fallback to localStorage
    return {
      theatres: this.loadFromLocalStorage('theatreData', []),
      practitionerList: this.loadFromLocalStorage('practitionerListData', []),
      theme: this.loadFromLocalStorage('theme', 'dark'),
      highlightSettings: this.loadFromLocalStorage('highlightSettings', {
        highlightEarlies: true,
        highlight1730s: true,
        highlight1830s: true,
        highlightLates: true
      })
    };
  }

  /**
   * Import all data
   * @param {Object} data - Data object with theatres and practitionerList
   * @returns {Promise<void>}
   */
  async importAllData(data) {
    // Save to localStorage
    if (data.theatres) {
      this.saveToLocalStorage('theatreData', data.theatres);
    }
    if (data.practitionerList) {
      this.saveToLocalStorage('practitionerListData', data.practitionerList);
    }
    if (data.theme) {
      this.saveToLocalStorage('theme', data.theme);
    }
    if (data.highlightSettings) {
      this.saveToLocalStorage('highlightSettings', data.highlightSettings);
    }

    // Try to save to Firebase if available
    if (this.isFirebaseAvailable()) {
      try {
        await firebaseService.importAllData(data);
      } catch (error) {
        console.error('Error importing to Firebase:', error);
      }
    }
  }
}

// Export singleton instance
const storageService = new StorageService();
export default storageService;
