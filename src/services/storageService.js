// src/services/storageService.js
// Unified storage interface with Firebase and localStorage fallback

import firebaseService from './firebaseService.js';
import { safeStringify, safeParse } from './dataTransformers.js';
import { getCurrentDayOfWeek, getAllDays } from '../utils/dateUtils.js';

// ===== FIREBASE TOGGLE =====
// Set to false to use localStorage only (no Firebase)
const USE_FIREBASE = true; // Change to true to re-enable Firebase
// ==========================

/**
 * Storage Service Class
 * Provides unified interface for data operations with automatic fallback
 */
class StorageService {
  constructor() {
    this.mode = USE_FIREBASE ? 'firebase' : 'localStorage';

    // Run migration before anything else
    this.migrateToWeeklyStructure();

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
    // Log initial connection status
    const initialStatus = firebaseService.getConnectionStatus();
    console.log(`[StorageService] Initial Firebase connection status: ${initialStatus}`);

    // Check connection status periodically
    setInterval(() => {
      const isConnected = firebaseService.getConnectionStatus();
      if (this.mode === 'firebase' && !isConnected) {
        console.warn('[StorageService] Firebase disconnected. Switching to localStorage mode.');
        this.mode = 'localStorage';
      } else if (this.mode === 'localStorage' && isConnected) {
        console.log('[StorageService] Firebase reconnected. Switching back to Firebase mode.');
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

  // ==================== DAY-BASED THEATRE OPERATIONS ====================

  /**
   * Get theatres for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @returns {Promise<Array>} Array of theatre objects
   */
  async getTheatresForDay(dayOfWeek) {
    // Try Firebase first if available
    if (this.isFirebaseAvailable()) {
      try {
        const firebaseData = await firebaseService.getTheatresForDay(dayOfWeek);
        console.log(`[StorageService] Loaded ${firebaseData?.length || 0} theatres for ${dayOfWeek} from Firebase`);

        // Always trust Firebase as source of truth when it's available
        // Also sync this data to localStorage for offline access
        if (firebaseData) {
          const data = this.loadFromLocalStorage('theatresByDay', {});
          data[dayOfWeek] = firebaseData;
          this.saveToLocalStorage('theatresByDay', data);
          return firebaseData;
        }
      } catch (error) {
        console.error(`Error getting theatres for ${dayOfWeek} from Firebase:`, error);
      }
    }

    // Only fallback to localStorage if Firebase is NOT available (disconnected)
    const data = this.loadFromLocalStorage('theatresByDay', {});
    console.log(`[StorageService] Firebase unavailable - loading theatres for ${dayOfWeek} from localStorage:`, data[dayOfWeek]?.length || 0, 'theatres');
    return data[dayOfWeek] || [];
  }

  /**
   * Set theatres for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {Array} theatresArray - Array of theatre objects
   * @returns {Promise<void>}
   */
  async setTheatresForDay(dayOfWeek, theatresArray) {
    const firebaseAvailable = this.isFirebaseAvailable();
    console.log(`[StorageService] Saving ${theatresArray.length} theatres to ${dayOfWeek}, Firebase available: ${firebaseAvailable}, mode: ${this.mode}`);

    // Save to Firebase FIRST if available (Firebase is source of truth)
    if (firebaseAvailable) {
      try {
        console.log(`[StorageService] Writing ${theatresArray.length} theatres to Firebase for ${dayOfWeek}`);
        await firebaseService.setTheatresForDay(dayOfWeek, theatresArray);
        console.log(`[StorageService] Successfully wrote to Firebase for ${dayOfWeek}`);

        // Only update localStorage AFTER Firebase write succeeds
        const allData = this.loadFromLocalStorage('theatresByDay', {});
        allData[dayOfWeek] = theatresArray;
        this.saveToLocalStorage('theatresByDay', allData);
        console.log(`[StorageService] Cached to localStorage for ${dayOfWeek}`);
      } catch (error) {
        console.error(`Error saving theatres for ${dayOfWeek} to Firebase:`, error);
        // Don't update localStorage if Firebase write failed to avoid data inconsistency
        throw error;
      }
    } else {
      // Firebase not available - save to localStorage only (offline mode)
      console.warn(`[StorageService] Firebase NOT available - saving to localStorage only for ${dayOfWeek}`);
      const allData = this.loadFromLocalStorage('theatresByDay', {});
      allData[dayOfWeek] = theatresArray;
      this.saveToLocalStorage('theatresByDay', allData);
    }
  }

  /**
   * Subscribe to theatre changes for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {Function} callback - Function to call when theatres change
   * @returns {Function} Unsubscribe function
   */
  subscribeToTheatresForDay(dayOfWeek, callback) {
    // Always subscribe if Firebase is enabled, even if not connected yet
    // Firebase listeners will automatically sync when connection is established
    if (USE_FIREBASE) {
      return firebaseService.subscribeToTheatresForDay(dayOfWeek, callback);
    }
    // Return no-op unsubscribe function when Firebase is toggled off
    console.log(`[StorageService] Firebase toggled off - no subscription for theatres on ${dayOfWeek}`);
    return () => {};
  }

  // ==================== DAY-BASED PRACTITIONER OPERATIONS ====================

  /**
   * Get practitioners for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @returns {Promise<Array>} Array of practitioner objects
   */
  async getPractitionersForDay(dayOfWeek) {
    // Try Firebase first if available
    if (this.isFirebaseAvailable()) {
      try {
        const firebaseData = await firebaseService.getPractitionersForDay(dayOfWeek);
        console.log(`[StorageService] Loaded ${firebaseData?.length || 0} practitioners for ${dayOfWeek} from Firebase`);

        // Always trust Firebase as source of truth when it's available
        // Also sync this data to localStorage for offline access
        if (firebaseData) {
          const data = this.loadFromLocalStorage('practitionersByDay', {});
          data[dayOfWeek] = firebaseData;
          this.saveToLocalStorage('practitionersByDay', data);
          return firebaseData;
        }
      } catch (error) {
        console.error(`Error getting practitioners for ${dayOfWeek} from Firebase:`, error);
      }
    }

    // Only fallback to localStorage if Firebase is NOT available (disconnected)
    const data = this.loadFromLocalStorage('practitionersByDay', {});
    console.log(`[StorageService] Firebase unavailable - loading practitioners for ${dayOfWeek} from localStorage:`, data[dayOfWeek]?.length || 0, 'practitioners');
    return data[dayOfWeek] || [];
  }

  /**
   * Set practitioners for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {Array} practitionersArray - Array of practitioner objects
   * @returns {Promise<void>}
   */
  async setPractitionersForDay(dayOfWeek, practitionersArray) {
    const firebaseAvailable = this.isFirebaseAvailable();
    console.log(`[StorageService] Saving ${practitionersArray.length} practitioners to ${dayOfWeek}, Firebase available: ${firebaseAvailable}, mode: ${this.mode}`);

    // Save to Firebase FIRST if available (Firebase is source of truth)
    if (firebaseAvailable) {
      try {
        console.log(`[StorageService] Writing ${practitionersArray.length} practitioners to Firebase for ${dayOfWeek}`);
        await firebaseService.setPractitionersForDay(dayOfWeek, practitionersArray);
        console.log(`[StorageService] Successfully wrote to Firebase for ${dayOfWeek}`);

        // Only update localStorage AFTER Firebase write succeeds
        const allData = this.loadFromLocalStorage('practitionersByDay', {});
        allData[dayOfWeek] = practitionersArray;
        this.saveToLocalStorage('practitionersByDay', allData);
        console.log(`[StorageService] Cached to localStorage for ${dayOfWeek}`);
      } catch (error) {
        console.error(`Error saving practitioners for ${dayOfWeek} to Firebase:`, error);
        // Don't update localStorage if Firebase write failed to avoid data inconsistency
        throw error;
      }
    } else {
      // Firebase not available - save to localStorage only (offline mode)
      console.warn(`[StorageService] Firebase NOT available - saving to localStorage only for ${dayOfWeek}`);
      const allData = this.loadFromLocalStorage('practitionersByDay', {});
      allData[dayOfWeek] = practitionersArray;
      this.saveToLocalStorage('practitionersByDay', allData);
    }
  }

  /**
   * Subscribe to practitioner changes for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {Function} callback - Function to call when practitioners change
   * @returns {Function} Unsubscribe function
   */
  subscribeToPractitionersForDay(dayOfWeek, callback) {
    // Always subscribe if Firebase is enabled, even if not connected yet
    // Firebase listeners will automatically sync when connection is established
    if (USE_FIREBASE) {
      return firebaseService.subscribeToPractitionersForDay(dayOfWeek, callback);
    }
    // Return no-op unsubscribe function when Firebase is toggled off
    console.log(`[StorageService] Firebase toggled off - no subscription for practitioners on ${dayOfWeek}`);
    return () => {};
  }

  // ==================== ROSTER DATE OPERATIONS ====================

  /**
   * Get roster date for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @returns {Promise<string|null>} Roster date string or null
   */
  async getRosterDateForDay(dayOfWeek) {
    // Try Firebase first if available
    if (this.isFirebaseAvailable()) {
      try {
        const firebaseData = await firebaseService.getRosterDateForDay(dayOfWeek);
        console.log(`[StorageService] Loaded roster date for ${dayOfWeek} from Firebase:`, firebaseData || 'null');

        // Always trust Firebase as source of truth when it's available
        // Also sync this data to localStorage for offline access
        const data = this.loadFromLocalStorage('rosterDatesByDay', {});
        data[dayOfWeek] = firebaseData || null;
        this.saveToLocalStorage('rosterDatesByDay', data);
        return firebaseData || null;
      } catch (error) {
        console.error(`Error getting roster date for ${dayOfWeek} from Firebase:`, error);
      }
    }

    // Only fallback to localStorage if Firebase is NOT available (disconnected)
    const data = this.loadFromLocalStorage('rosterDatesByDay', {});
    console.log(`[StorageService] Firebase unavailable - loading roster date for ${dayOfWeek} from localStorage:`, data[dayOfWeek]);
    return data[dayOfWeek] || null;
  }

  /**
   * Set roster date for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {string} rosterDate - Roster date string
   * @returns {Promise<void>}
   */
  async setRosterDateForDay(dayOfWeek, rosterDate) {
    const firebaseAvailable = this.isFirebaseAvailable();
    console.log(`[StorageService] Saving roster date to ${dayOfWeek}:`, rosterDate, `Firebase available: ${firebaseAvailable}, mode: ${this.mode}`);

    // Save to Firebase FIRST if available (Firebase is source of truth)
    if (firebaseAvailable) {
      try {
        console.log(`[StorageService] Writing roster date to Firebase for ${dayOfWeek}`);
        await firebaseService.setRosterDateForDay(dayOfWeek, rosterDate);
        console.log(`[StorageService] Successfully wrote to Firebase for ${dayOfWeek}`);

        // Only update localStorage AFTER Firebase write succeeds
        const allData = this.loadFromLocalStorage('rosterDatesByDay', {});
        allData[dayOfWeek] = rosterDate;
        this.saveToLocalStorage('rosterDatesByDay', allData);
        console.log(`[StorageService] Cached to localStorage for ${dayOfWeek}`);
      } catch (error) {
        console.error(`Error saving roster date for ${dayOfWeek} to Firebase:`, error);
        // Don't update localStorage if Firebase write failed to avoid data inconsistency
        throw error;
      }
    } else {
      // Firebase not available - save to localStorage only (offline mode)
      console.warn(`[StorageService] Firebase NOT available - saving to localStorage only for ${dayOfWeek}`);
      const allData = this.loadFromLocalStorage('rosterDatesByDay', {});
      allData[dayOfWeek] = rosterDate;
      this.saveToLocalStorage('rosterDatesByDay', allData);
    }
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
    const firebaseAvailable = this.isFirebaseAvailable();
    console.log(`[StorageService] Saving theme: ${theme}, Firebase available: ${firebaseAvailable}, mode: ${this.mode}`);

    // Save to Firebase FIRST if available (Firebase is source of truth)
    if (firebaseAvailable) {
      try {
        console.log(`[StorageService] Writing theme to Firebase: ${theme}`);
        await firebaseService.setTheme(theme);
        console.log(`[StorageService] Successfully wrote theme to Firebase`);

        // Only update localStorage AFTER Firebase write succeeds
        this.saveToLocalStorage('theme', theme);
        console.log(`[StorageService] Cached theme to localStorage`);
      } catch (error) {
        console.error('Error setting theme in Firebase:', error);
        // Don't update localStorage if Firebase write failed to avoid data inconsistency
        throw error;
      }
    } else {
      // Firebase not available - save to localStorage only (offline mode)
      console.warn(`[StorageService] Firebase NOT available - saving theme to localStorage only`);
      this.saveToLocalStorage('theme', theme);
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
    const firebaseAvailable = this.isFirebaseAvailable();
    console.log(`[StorageService] Saving highlight settings, Firebase available: ${firebaseAvailable}, mode: ${this.mode}`);

    // Save to Firebase FIRST if available (Firebase is source of truth)
    if (firebaseAvailable) {
      try {
        console.log(`[StorageService] Writing highlight settings to Firebase`);
        await firebaseService.setHighlightSettings(settings);
        console.log(`[StorageService] Successfully wrote highlight settings to Firebase`);

        // Only update localStorage AFTER Firebase write succeeds
        this.saveToLocalStorage('highlightSettings', settings);
        console.log(`[StorageService] Cached highlight settings to localStorage`);
      } catch (error) {
        console.error('Error setting highlight settings in Firebase:', error);
        // Don't update localStorage if Firebase write failed to avoid data inconsistency
        throw error;
      }
    } else {
      // Firebase not available - save to localStorage only (offline mode)
      console.warn(`[StorageService] Firebase NOT available - saving highlight settings to localStorage only`);
      this.saveToLocalStorage('highlightSettings', settings);
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

  /**
   * Get selected day
   * @returns {Promise<string>} Selected day name (e.g., 'monday')
   */
  async getSelectedDay() {
    if (this.isFirebaseAvailable()) {
      try {
        const day = await firebaseService.getSelectedDay();
        if (day) return day;
      } catch (error) {
        console.error('Error getting selected day from Firebase:', error);
      }
    }

    // Fallback to localStorage
    return this.loadFromLocalStorage('selectedDay', null) || getCurrentDayOfWeek();
  }

  /**
   * Set selected day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @returns {Promise<void>}
   */
  async setSelectedDay(dayOfWeek) {
    // Save to localStorage
    this.saveToLocalStorage('selectedDay', dayOfWeek);

    // Save to Firebase if available
    if (this.isFirebaseAvailable()) {
      try {
        await firebaseService.setSelectedDay(dayOfWeek);
      } catch (error) {
        console.error('Error setting selected day in Firebase:', error);
      }
    }
  }

  // ==================== DATA MIGRATION ====================

  /**
   * Migrate legacy flat structure to day-based structure
   * Called automatically on initialization
   */
  async migrateToWeeklyStructure() {
    const oldTheatres = this.loadFromLocalStorage('theatreData', null);
    const oldPractitioners = this.loadFromLocalStorage('practitionerListData', null);
    const newExists = this.loadFromLocalStorage('theatresByDay', null);

    // Only migrate if old data exists and new structure doesn't
    if ((oldTheatres || oldPractitioners) && !newExists) {
      console.log('Migrating to weekly structure...');

      const today = getCurrentDayOfWeek();
      const theatresByDay = {};
      const practitionersByDay = {};

      // Initialize all days
      getAllDays().forEach(day => {
        // Assign existing data to current day, empty arrays for others
        theatresByDay[day] = day === today && oldTheatres ? oldTheatres : [];
        practitionersByDay[day] = day === today && oldPractitioners ? oldPractitioners : [];
      });

      // Save new structure
      this.saveToLocalStorage('theatresByDay', theatresByDay);
      this.saveToLocalStorage('practitionersByDay', practitionersByDay);
      this.saveToLocalStorage('selectedDay', today);

      // Backup old data (keep for 7 days in case of rollback)
      if (oldTheatres) {
        this.saveToLocalStorage('theatreData_legacy', oldTheatres);
      }
      if (oldPractitioners) {
        this.saveToLocalStorage('practitionerListData_legacy', oldPractitioners);
      }

      console.log(`Migration complete. Data assigned to ${today}.`);
    }
  }

  // ==================== UTILITY OPERATIONS ====================

  /**
   * Export data for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @returns {Promise<Object>} Object with data for the specified day
   */
  async exportDayData(dayOfWeek) {
    if (this.isFirebaseAvailable()) {
      try {
        const theatres = await firebaseService.getTheatresForDay(dayOfWeek);
        const practitioners = await firebaseService.getPractitionersForDay(dayOfWeek);
        const rosterDate = await firebaseService.getRosterDateForDay(dayOfWeek);

        return {
          day: dayOfWeek,
          theatres,
          practitioners,
          rosterDate,
          theme: this.loadFromLocalStorage('theme', 'dark'),
          highlightSettings: this.loadFromLocalStorage('highlightSettings', {
            highlightEarlies: true,
            highlight1730s: true,
            highlight1830s: true,
            highlightLates: true
          })
        };
      } catch (error) {
        console.error(`Error exporting ${dayOfWeek} data from Firebase, using localStorage:`, error);
      }
    }

    // Fallback to localStorage
    const theatresByDay = this.loadFromLocalStorage('theatresByDay', {});
    const practitionersByDay = this.loadFromLocalStorage('practitionersByDay', {});
    const rosterDatesByDay = this.loadFromLocalStorage('rosterDatesByDay', {});

    return {
      day: dayOfWeek,
      theatres: theatresByDay[dayOfWeek] || [],
      practitioners: practitionersByDay[dayOfWeek] || [],
      rosterDate: rosterDatesByDay[dayOfWeek] || null,
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

    // Fallback to localStorage - export day-based structure
    const theatresByDay = this.loadFromLocalStorage('theatresByDay', null);
    const practitionersByDay = this.loadFromLocalStorage('practitionersByDay', null);

    // If new structure exists, export it
    if (theatresByDay && practitionersByDay) {
      return {
        theatresByDay,
        practitionersByDay,
        rosterDatesByDay: this.loadFromLocalStorage('rosterDatesByDay', {}),
        theme: this.loadFromLocalStorage('theme', 'dark'),
        highlightSettings: this.loadFromLocalStorage('highlightSettings', {
          highlightEarlies: true,
          highlight1730s: true,
          highlight1830s: true,
          highlightLates: true
        }),
        selectedDay: this.loadFromLocalStorage('selectedDay', getCurrentDayOfWeek())
      };
    }

    // Fallback to legacy format if day-based doesn't exist
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
   * @param {Object} data - Data object with theatres and practitionerList (legacy or day-based)
   * @returns {Promise<void>}
   */
  async importAllData(data) {
    // Handle new day-based format
    if (data.theatresByDay && data.practitionersByDay) {
      this.saveToLocalStorage('theatresByDay', data.theatresByDay);
      this.saveToLocalStorage('practitionersByDay', data.practitionersByDay);
      if (data.rosterDatesByDay) {
        this.saveToLocalStorage('rosterDatesByDay', data.rosterDatesByDay);
      }
      if (data.selectedDay) {
        this.saveToLocalStorage('selectedDay', data.selectedDay);
      }
    }
    // Handle legacy format - convert to day-based
    else if (data.theatres && data.practitionerList) {
      const today = getCurrentDayOfWeek();
      const theatresByDay = {};
      const practitionersByDay = {};

      getAllDays().forEach(day => {
        theatresByDay[day] = day === today ? data.theatres : [];
        practitionersByDay[day] = day === today ? data.practitionerList : [];
      });

      this.saveToLocalStorage('theatresByDay', theatresByDay);
      this.saveToLocalStorage('practitionersByDay', practitionersByDay);
      this.saveToLocalStorage('selectedDay', today);
    }

    // Save other settings
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
