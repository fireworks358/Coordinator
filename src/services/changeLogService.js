// src/services/changeLogService.js
// Service for tracking and managing change logs

import { ref, push, get, remove } from 'firebase/database';
import { database } from '../firebase.js';

const DB_PATH = 'coordinator/changeLog';
const MAX_LOGS_PER_DAY = 1000; // Keep last 1000 changes per day

/**
 * Change Log Service Class
 * Tracks field-level changes to theatres and practitioners with timestamps
 */
class ChangeLogService {
  /**
   * Log a single field change
   * @param {string} dayOfWeek - Day of week (e.g., 'monday')
   * @param {string} itemName - Name of theatre or practitioner
   * @param {string} field - Field that changed
   * @param {*} oldValue - Previous value
   * @param {*} newValue - New value
   */
  async logChange(dayOfWeek, itemName, field, oldValue, newValue) {
    if (oldValue === newValue) return; // No change

    try {
      const changeEntry = {
        id: `${Date.now()}-${itemName}-${field}`,
        itemName,
        field,
        oldValue: String(oldValue || ''),
        newValue: String(newValue || ''),
        timestamp: Date.now(),
        dayOfWeek
      };

      const logRef = ref(database, `${DB_PATH}/${dayOfWeek}`);
      await push(logRef, changeEntry);

      console.log(`[ChangeLog] ${dayOfWeek}: ${itemName}.${field} changed from "${oldValue}" to "${newValue}"`);

      // Cleanup old logs asynchronously (don't await to avoid slowing down saves)
      this.cleanupOldLogs(dayOfWeek).catch(err =>
        console.error('[ChangeLog] Cleanup failed:', err)
      );
    } catch (error) {
      console.error('[ChangeLog] Failed to log change:', error);
      // Don't throw - change logging shouldn't block saves
    }
  }

  /**
   * Log multiple field changes for a theatre
   * @param {string} dayOfWeek - Day of week
   * @param {string} theatreName - Theatre name
   * @param {Object} oldTheatre - Old theatre state
   * @param {Object} newTheatre - New theatre state
   */
  async logTheatreChanges(dayOfWeek, theatreName, oldTheatre, newTheatre) {
    const fields = [
      'currentOdp',
      'theatreEta',
      'practitionerEndTime',
      'nextPractitioner',
      'status',
      'phoneExtension'
    ];

    const changePromises = [];
    for (const field of fields) {
      if (oldTheatre[field] !== newTheatre[field]) {
        changePromises.push(
          this.logChange(dayOfWeek, theatreName, field, oldTheatre[field], newTheatre[field])
        );
      }
    }

    // Log all changes in parallel
    await Promise.all(changePromises);
  }

  /**
   * Log multiple field changes for a practitioner
   * @param {string} dayOfWeek - Day of week
   * @param {string} practitionerName - Practitioner name
   * @param {Object} oldPractitioner - Old practitioner state
   * @param {Object} newPractitioner - New practitioner state
   */
  async logPractitionerChanges(dayOfWeek, practitionerName, oldPractitioner, newPractitioner) {
    const fields = ['relieved', 'supper'];

    const changePromises = [];
    for (const field of fields) {
      if (oldPractitioner[field] !== newPractitioner[field]) {
        changePromises.push(
          this.logChange(dayOfWeek, practitionerName, field, oldPractitioner[field], newPractitioner[field])
        );
      }
    }

    await Promise.all(changePromises);
  }

  /**
   * Get change log for a specific day
   * @param {string} dayOfWeek - Day of week
   * @returns {Promise<Array>} Array of change entries sorted by timestamp (newest first)
   */
  async getChangesForDay(dayOfWeek) {
    try {
      const logRef = ref(database, `${DB_PATH}/${dayOfWeek}`);
      const snapshot = await get(logRef);

      if (!snapshot.exists()) return [];

      return Object.values(snapshot.val())
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('[ChangeLog] Failed to get changes:', error);
      return [];
    }
  }

  /**
   * Get all changes across all days
   * @returns {Promise<Array>} Array of change entries sorted by timestamp (newest first)
   */
  async getAllChanges() {
    try {
      const logRef = ref(database, DB_PATH);
      const snapshot = await get(logRef);

      if (!snapshot.exists()) return [];

      const allChanges = [];
      const days = snapshot.val();

      for (const day in days) {
        const dayChanges = Object.values(days[day]);
        allChanges.push(...dayChanges);
      }

      return allChanges.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('[ChangeLog] Failed to get all changes:', error);
      return [];
    }
  }

  /**
   * Get changes for a specific item (theatre/practitioner)
   * @param {string} itemName - Item name to filter by
   * @returns {Promise<Array>} Array of change entries for this item
   */
  async getChangesForItem(itemName) {
    try {
      const allChanges = await this.getAllChanges();
      return allChanges.filter(change => change.itemName === itemName);
    } catch (error) {
      console.error('[ChangeLog] Failed to get changes for item:', error);
      return [];
    }
  }

  /**
   * Cleanup old logs (keep last MAX_LOGS_PER_DAY entries per day)
   * @param {string} dayOfWeek - Day of week
   */
  async cleanupOldLogs(dayOfWeek) {
    try {
      const logRef = ref(database, `${DB_PATH}/${dayOfWeek}`);
      const snapshot = await get(logRef);

      if (!snapshot.exists()) return;

      const logs = Object.entries(snapshot.val());
      if (logs.length <= MAX_LOGS_PER_DAY) return;

      // Sort by timestamp (newest first) and identify logs to delete
      logs.sort((a, b) => b[1].timestamp - a[1].timestamp);
      const toDelete = logs.slice(MAX_LOGS_PER_DAY);

      console.log(`[ChangeLog] Cleaning up ${toDelete.length} old logs for ${dayOfWeek}`);

      // Delete old logs
      const deletePromises = toDelete.map(([key]) =>
        remove(ref(database, `${DB_PATH}/${dayOfWeek}/${key}`))
      );

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('[ChangeLog] Cleanup failed:', error);
      // Don't throw - cleanup failure shouldn't break functionality
    }
  }

  /**
   * Clear all logs for a specific day
   * @param {string} dayOfWeek - Day of week
   */
  async clearLogsForDay(dayOfWeek) {
    try {
      const logRef = ref(database, `${DB_PATH}/${dayOfWeek}`);
      await remove(logRef);
      console.log(`[ChangeLog] Cleared all logs for ${dayOfWeek}`);
    } catch (error) {
      console.error('[ChangeLog] Failed to clear logs:', error);
      throw error;
    }
  }

  /**
   * Clear all logs across all days
   */
  async clearAllLogs() {
    try {
      const logRef = ref(database, DB_PATH);
      await remove(logRef);
      console.log('[ChangeLog] Cleared all logs');
    } catch (error) {
      console.error('[ChangeLog] Failed to clear all logs:', error);
      throw error;
    }
  }
}

export default new ChangeLogService();
