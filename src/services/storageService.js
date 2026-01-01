// src/services/storageService.js
// Firebase-only storage interface (localStorage removed)

import firebaseService from './firebaseService.js';
import { safeParse } from './dataTransformers.js';
import { getCurrentDayOfWeek, getAllDays } from '../utils/dateUtils.js';

// ===== FIREBASE TOGGLE =====
// Set to false to use localStorage only (no Firebase)
const USE_FIREBASE = true; // Change to true to re-enable Firebase
// ==========================

/**
 * Storage Service Class
 * Provides unified interface for data operations - Firebase only (localStorage removed)
 */
class StorageService {
  constructor() {
    this.mode = USE_FIREBASE ? 'firebase' : 'disabled';
    this.migrationComplete = false;

    if (USE_FIREBASE) {
      // Run one-time migration from localStorage to Firebase
      this.checkAndMigrateLocalStorage();
    } else {
      console.log('Firebase disabled - app will not function');
    }
  }

  /**
   * Check for localStorage data and migrate to Firebase if needed
   */
  async checkAndMigrateLocalStorage() {
    try {
      // Check if localStorage has data
      const hasLocalData = localStorage.getItem('theatresByDay') ||
                           localStorage.getItem('practitionersByDay') ||
                           localStorage.getItem('theatreData') ||
                           localStorage.getItem('practitionerListData');

      if (!hasLocalData) {
        console.log('[Migration] No localStorage data to migrate');
        this.migrationComplete = true;
        return;
      }

      // Check if already migrated
      const migrated = localStorage.getItem('migrationComplete');
      if (migrated === 'true') {
        console.log('[Migration] Already migrated');
        this.migrationComplete = true;
        return;
      }

      console.log('[Migration] Starting localStorage to Firebase migration...');
      await this.migrateLocalStorageToFirebase();

      // Mark migration complete
      localStorage.setItem('migrationComplete', 'true');
      this.migrationComplete = true;

      console.log('[Migration] Migration complete - localStorage data has been copied to Firebase');
      console.log('[Migration] You can now clear localStorage if desired');

    } catch (error) {
      console.error('[Migration] Migration failed:', error);
      console.error('[Migration] Please ensure Firebase is configured correctly');
      // Don't clear localStorage if migration failed
    }
  }

  /**
   * Migrate all localStorage data to Firebase (one-time operation)
   */
  async migrateLocalStorageToFirebase() {
    try {
      // Helper to safely parse localStorage
      const loadLocal = (key, defaultValue) => {
        try {
          const jsonString = localStorage.getItem(key);
          return safeParse(jsonString, defaultValue);
        } catch (error) {
          console.error(`Error loading ${key} from localStorage:`, error);
          return defaultValue;
        }
      };

      // Load all localStorage data
      const theatresByDay = loadLocal('theatresByDay', null);
      const practitionersByDay = loadLocal('practitionersByDay', null);
      const rosterDatesByDay = loadLocal('rosterDatesByDay', {});
      const theme = loadLocal('theme', 'dark');
      const highlightSettings = loadLocal('highlightSettings', null);

      // Also check for legacy data
      const legacyTheatres = loadLocal('theatreData', null);
      const legacyPractitioners = loadLocal('practitionerListData', null);

      // Migrate day-based data
      if (theatresByDay) {
        console.log('[Migration] Migrating theatresByDay...');
        const days = Object.keys(theatresByDay);
        for (const day of days) {
          if (theatresByDay[day] && theatresByDay[day].length > 0) {
            await firebaseService.setTheatresForDay(day, theatresByDay[day]);
            console.log(`[Migration] Migrated ${theatresByDay[day].length} theatres for ${day}`);
          }
        }
      } else if (legacyTheatres) {
        // Migrate legacy theatre data to current day
        console.log('[Migration] Migrating legacy theatreData...');
        const today = getCurrentDayOfWeek();
        await firebaseService.setTheatresForDay(today, legacyTheatres);
        console.log(`[Migration] Migrated ${legacyTheatres.length} legacy theatres to ${today}`);
      }

      if (practitionersByDay) {
        console.log('[Migration] Migrating practitionersByDay...');
        const days = Object.keys(practitionersByDay);
        for (const day of days) {
          if (practitionersByDay[day] && practitionersByDay[day].length > 0) {
            await firebaseService.setPractitionersForDay(day, practitionersByDay[day]);
            console.log(`[Migration] Migrated ${practitionersByDay[day].length} practitioners for ${day}`);
          }
        }
      } else if (legacyPractitioners) {
        // Migrate legacy practitioner data to current day
        console.log('[Migration] Migrating legacy practitionerListData...');
        const today = getCurrentDayOfWeek();
        await firebaseService.setPractitionersForDay(today, legacyPractitioners);
        console.log(`[Migration] Migrated ${legacyPractitioners.length} legacy practitioners to ${today}`);
      }

      // Migrate roster dates
      if (rosterDatesByDay && Object.keys(rosterDatesByDay).length > 0) {
        console.log('[Migration] Migrating rosterDatesByDay...');
        const days = Object.keys(rosterDatesByDay);
        for (const day of days) {
          if (rosterDatesByDay[day]) {
            await firebaseService.setRosterDateForDay(day, rosterDatesByDay[day]);
          }
        }
      }

      // Migrate settings
      if (theme) {
        console.log('[Migration] Migrating theme...');
        await firebaseService.setTheme(theme);
      }

      if (highlightSettings) {
        console.log('[Migration] Migrating highlightSettings...');
        await firebaseService.setHighlightSettings(highlightSettings);
      }

      console.log('[Migration] All data migrated to Firebase successfully');

    } catch (error) {
      console.error('[Migration] Error during migration:', error);
      throw error;
    }
  }

  /**
   * Get current storage mode
   * @returns {string} Current mode ('firebase' or 'disabled')
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

  // ==================== DAY-BASED THEATRE OPERATIONS ====================

  /**
   * Get theatres for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @returns {Promise<Array>} Array of theatre objects
   * @throws {Error} If Firebase is offline
   */
  async getTheatresForDay(dayOfWeek) {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Cannot load theatres - Firebase is offline');
    }

    try {
      const firebaseData = await firebaseService.getTheatresForDay(dayOfWeek);
      console.log(`[StorageService] Loaded ${firebaseData?.length || 0} theatres for ${dayOfWeek} from Firebase`);
      return firebaseData;
    } catch (error) {
      console.error(`Error getting theatres for ${dayOfWeek} from Firebase:`, error);
      throw new Error(`Failed to load theatres for ${dayOfWeek}. Please check your connection.`);
    }
  }

  /**
   * Set theatres for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {Array} theatresArray - Array of theatre objects
   * @returns {Promise<void>}
   * @throws {Error} If Firebase is offline
   */
  async setTheatresForDay(dayOfWeek, theatresArray) {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Cannot save theatres - Firebase is offline');
    }

    try {
      console.log(`[StorageService] Saving ${theatresArray.length} theatres to ${dayOfWeek}`);
      await firebaseService.setTheatresForDay(dayOfWeek, theatresArray);
      console.log(`[StorageService] Successfully saved to Firebase for ${dayOfWeek}`);
    } catch (error) {
      console.error(`Error saving theatres for ${dayOfWeek} to Firebase:`, error);
      throw new Error(`Failed to save theatres for ${dayOfWeek}. Please check your connection.`);
    }
  }

  /**
   * Subscribe to theatre changes for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {Function} callback - Function to call when theatres change
   * @returns {Function} Unsubscribe function
   */
  subscribeToTheatresForDay(dayOfWeek, callback) {
    if (USE_FIREBASE) {
      return firebaseService.subscribeToTheatresForDay(dayOfWeek, callback);
    }
    // Return no-op unsubscribe function when Firebase is disabled
    console.log(`[StorageService] Firebase disabled - no subscription for theatres on ${dayOfWeek}`);
    return () => {};
  }

  // ==================== DAY-BASED PRACTITIONER OPERATIONS ====================

  /**
   * Get practitioners for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @returns {Promise<Array>} Array of practitioner objects
   * @throws {Error} If Firebase is offline
   */
  async getPractitionersForDay(dayOfWeek) {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Cannot load practitioners - Firebase is offline');
    }

    try {
      const firebaseData = await firebaseService.getPractitionersForDay(dayOfWeek);
      console.log(`[StorageService] Loaded ${firebaseData?.length || 0} practitioners for ${dayOfWeek} from Firebase`);
      return firebaseData;
    } catch (error) {
      console.error(`Error getting practitioners for ${dayOfWeek} from Firebase:`, error);
      throw new Error(`Failed to load practitioners for ${dayOfWeek}. Please check your connection.`);
    }
  }

  /**
   * Set practitioners for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {Array} practitionersArray - Array of practitioner objects
   * @returns {Promise<void>}
   * @throws {Error} If Firebase is offline
   */
  async setPractitionersForDay(dayOfWeek, practitionersArray) {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Cannot save practitioners - Firebase is offline');
    }

    try {
      console.log(`[StorageService] Saving ${practitionersArray.length} practitioners to ${dayOfWeek}`);
      await firebaseService.setPractitionersForDay(dayOfWeek, practitionersArray);
      console.log(`[StorageService] Successfully saved to Firebase for ${dayOfWeek}`);
    } catch (error) {
      console.error(`Error saving practitioners for ${dayOfWeek} to Firebase:`, error);
      throw new Error(`Failed to save practitioners for ${dayOfWeek}. Please check your connection.`);
    }
  }

  /**
   * Subscribe to practitioner changes for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {Function} callback - Function to call when practitioners change
   * @returns {Function} Unsubscribe function
   */
  subscribeToPractitionersForDay(dayOfWeek, callback) {
    if (USE_FIREBASE) {
      return firebaseService.subscribeToPractitionersForDay(dayOfWeek, callback);
    }
    // Return no-op unsubscribe function when Firebase is disabled
    console.log(`[StorageService] Firebase disabled - no subscription for practitioners on ${dayOfWeek}`);
    return () => {};
  }

  // ==================== ROSTER DATE OPERATIONS ====================

  /**
   * Get roster date for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @returns {Promise<string|null>} Roster date string or null
   * @throws {Error} If Firebase is offline
   */
  async getRosterDateForDay(dayOfWeek) {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Cannot load roster date - Firebase is offline');
    }

    try {
      const firebaseData = await firebaseService.getRosterDateForDay(dayOfWeek);
      console.log(`[StorageService] Loaded roster date for ${dayOfWeek} from Firebase:`, firebaseData || 'null');
      return firebaseData || null;
    } catch (error) {
      console.error(`Error getting roster date for ${dayOfWeek} from Firebase:`, error);
      throw new Error(`Failed to load roster date for ${dayOfWeek}. Please check your connection.`);
    }
  }

  /**
   * Set roster date for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @param {string} rosterDate - Roster date string
   * @returns {Promise<void>}
   * @throws {Error} If Firebase is offline
   */
  async setRosterDateForDay(dayOfWeek, rosterDate) {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Cannot save roster date - Firebase is offline');
    }

    try {
      console.log(`[StorageService] Saving roster date to ${dayOfWeek}:`, rosterDate);
      await firebaseService.setRosterDateForDay(dayOfWeek, rosterDate);
      console.log(`[StorageService] Successfully saved roster date to Firebase for ${dayOfWeek}`);
    } catch (error) {
      console.error(`Error saving roster date for ${dayOfWeek} to Firebase:`, error);
      throw new Error(`Failed to save roster date for ${dayOfWeek}. Please check your connection.`);
    }
  }

  // ==================== SETTINGS OPERATIONS ====================

  /**
   * Get theme setting
   * @returns {Promise<string>} Theme value ('dark' or 'light')
   * @throws {Error} If Firebase is offline
   */
  async getTheme() {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Cannot load theme - Firebase is offline');
    }

    try {
      return await firebaseService.getTheme();
    } catch (error) {
      console.error('Error getting theme from Firebase:', error);
      throw new Error('Failed to load theme. Please check your connection.');
    }
  }

  /**
   * Set theme setting
   * @param {string} theme - Theme value ('dark' or 'light')
   * @returns {Promise<void>}
   * @throws {Error} If Firebase is offline
   */
  async setTheme(theme) {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Cannot save theme - Firebase is offline');
    }

    try {
      console.log(`[StorageService] Saving theme: ${theme}`);
      await firebaseService.setTheme(theme);
      console.log(`[StorageService] Successfully saved theme to Firebase`);
    } catch (error) {
      console.error('Error setting theme in Firebase:', error);
      throw new Error('Failed to save theme. Please check your connection.');
    }
  }

  /**
   * Get highlight settings
   * @returns {Promise<Object>} Highlight settings object
   * @throws {Error} If Firebase is offline
   */
  async getHighlightSettings() {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Cannot load highlight settings - Firebase is offline');
    }

    try {
      return await firebaseService.getHighlightSettings();
    } catch (error) {
      console.error('Error getting highlight settings from Firebase:', error);
      throw new Error('Failed to load highlight settings. Please check your connection.');
    }
  }

  /**
   * Set highlight settings
   * @param {Object} settings - Highlight settings object
   * @returns {Promise<void>}
   * @throws {Error} If Firebase is offline
   */
  async setHighlightSettings(settings) {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Cannot save highlight settings - Firebase is offline');
    }

    try {
      console.log(`[StorageService] Saving highlight settings`);
      await firebaseService.setHighlightSettings(settings);
      console.log(`[StorageService] Successfully saved highlight settings to Firebase`);
    } catch (error) {
      console.error('Error setting highlight settings in Firebase:', error);
      throw new Error('Failed to save highlight settings. Please check your connection.');
    }
  }

  /**
   * Subscribe to settings changes
   * @param {Function} callback - Function to call when settings change
   * @returns {Function} Unsubscribe function
   */
  subscribeToSettings(callback) {
    return firebaseService.subscribeToSettings(callback);
  }

  /**
   * Get last access date (for rollover detection)
   * @returns {Promise<string|null>} Last access date in YYYY-MM-DD format or null
   * @throws {Error} If Firebase is offline
   */
  async getLastAccessDate() {
    if (!this.isFirebaseAvailable()) {
      // Silently return null if offline - this is not critical
      return null;
    }

    try {
      return await firebaseService.getLastAccessDate();
    } catch (error) {
      console.error('Error getting last access date from Firebase:', error);
      return null; // Return null instead of throwing - not critical
    }
  }

  /**
   * Set last access date (for rollover detection)
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<void>}
   */
  async setLastAccessDate(date) {
    if (!this.isFirebaseAvailable()) {
      // Silently fail if offline - will be set on next connection
      console.log('[StorageService] Offline - lastAccessDate will be set when connection restored');
      return;
    }

    try {
      await firebaseService.setLastAccessDate(date);
    } catch (error) {
      console.error('Error setting last access date in Firebase:', error);
      // Don't throw - this is not critical
    }
  }

  // ==================== LEGACY OPERATIONS (Kept for compatibility) ====================

  /**
   * Get all theatres (legacy - now redirects to current day)
   * @returns {Promise<Array>} Array of theatre objects
   * @deprecated Use getTheatresForDay instead
   */
  async getTheatres() {
    const today = getCurrentDayOfWeek();
    return this.getTheatresForDay(today);
  }

  /**
   * Set all theatres (legacy - now redirects to current day)
   * @param {Array} theatresArray - Array of theatre objects
   * @returns {Promise<void>}
   * @deprecated Use setTheatresForDay instead
   */
  async setTheatres(theatresArray) {
    const today = getCurrentDayOfWeek();
    return this.setTheatresForDay(today, theatresArray);
  }

  /**
   * Get all practitioners (legacy - now redirects to current day)
   * @returns {Promise<Array>} Array of practitioner objects
   * @deprecated Use getPractitionersForDay instead
   */
  async getPractitioners() {
    const today = getCurrentDayOfWeek();
    return this.getPractitionersForDay(today);
  }

  /**
   * Set all practitioners (legacy - now redirects to current day)
   * @param {Array} practitionersArray - Array of practitioner objects
   * @returns {Promise<void>}
   * @deprecated Use setPractitionersForDay instead
   */
  async setPractitioners(practitionersArray) {
    const today = getCurrentDayOfWeek();
    return this.setPractitionersForDay(today, practitionersArray);
  }

  // ==================== UTILITY OPERATIONS ====================

  /**
   * Export data for a specific day
   * @param {string} dayOfWeek - Day name (e.g., 'monday')
   * @returns {Promise<Object>} Object with data for the specified day
   */
  async exportDayData(dayOfWeek) {
    try {
      const theatres = await firebaseService.getTheatresForDay(dayOfWeek);
      const practitioners = await firebaseService.getPractitionersForDay(dayOfWeek);
      const rosterDate = await firebaseService.getRosterDateForDay(dayOfWeek);
      const theme = await firebaseService.getTheme();
      const highlightSettings = await firebaseService.getHighlightSettings();

      return {
        day: dayOfWeek,
        theatres,
        practitioners,
        rosterDate,
        theme,
        highlightSettings
      };
    } catch (error) {
      console.error(`Error exporting ${dayOfWeek} data from Firebase:`, error);
      throw new Error(`Failed to export data for ${dayOfWeek}. Please check your connection.`);
    }
  }

  /**
   * Export all data
   * @returns {Promise<Object>} Object with all data
   */
  async exportAllData() {
    try {
      const allData = {
        theatresByDay: {},
        practitionersByDay: {},
        rosterDatesByDay: {},
        theme: null,
        highlightSettings: null
      };

      // Get all days
      const days = getAllDays();

      // Fetch data for each day
      for (const day of days) {
        allData.theatresByDay[day] = await firebaseService.getTheatresForDay(day);
        allData.practitionersByDay[day] = await firebaseService.getPractitionersForDay(day);
        allData.rosterDatesByDay[day] = await firebaseService.getRosterDateForDay(day);
      }

      // Get settings
      allData.theme = await firebaseService.getTheme();
      allData.highlightSettings = await firebaseService.getHighlightSettings();

      return allData;
    } catch (error) {
      console.error('Error exporting all data from Firebase:', error);
      throw new Error('Failed to export all data. Please check your connection.');
    }
  }

  /**
   * Import all data
   * @param {Object} data - Data object with day-based or legacy format
   * @returns {Promise<void>}
   */
  async importAllData(data) {
    try {
      // Handle day-based format
      if (data.theatresByDay && data.practitionersByDay) {
        const days = Object.keys(data.theatresByDay);

        for (const day of days) {
          if (data.theatresByDay[day]) {
            await firebaseService.setTheatresForDay(day, data.theatresByDay[day]);
          }
          if (data.practitionersByDay[day]) {
            await firebaseService.setPractitionersForDay(day, data.practitionersByDay[day]);
          }
          if (data.rosterDatesByDay && data.rosterDatesByDay[day]) {
            await firebaseService.setRosterDateForDay(day, data.rosterDatesByDay[day]);
          }
        }
      }
      // Handle legacy format - convert to day-based
      else if (data.theatres && data.practitionerList) {
        const today = getCurrentDayOfWeek();
        await firebaseService.setTheatresForDay(today, data.theatres);
        await firebaseService.setPractitionersForDay(today, data.practitionerList);
      }

      // Import settings
      if (data.theme) {
        await firebaseService.setTheme(data.theme);
      }
      if (data.highlightSettings) {
        await firebaseService.setHighlightSettings(data.highlightSettings);
      }

      console.log('[StorageService] Import complete');
    } catch (error) {
      console.error('Error importing data to Firebase:', error);
      throw new Error('Failed to import data. Please check your connection.');
    }
  }
}

// Export singleton instance
const storageService = new StorageService();
export default storageService;
