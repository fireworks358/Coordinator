// src/services/snapshotService.js
// Service for managing hourly state snapshots

import { ref, set, get, remove } from 'firebase/database';
import { database } from '../firebase.js';
import storageService from './storageService.js';

const DB_PATH = 'coordinator/snapshots';
const MAX_SNAPSHOTS_PER_DAY = 10;

/**
 * Snapshot Service Class
 * Automatically saves hourly snapshots of theatre/practitioner state
 * Keeps last 10 hours per day for state recovery
 */
class SnapshotService {
  constructor() {
    this.snapshotInterval = null;
    this.currentDay = null;
  }

  /**
   * Start automatic hourly snapshots
   * @param {string} selectedDay - Day of week to snapshot
   */
  startAutoSnapshots(selectedDay) {
    // Clear existing interval if any
    if (this.snapshotInterval) {
      this.stopAutoSnapshots();
    }

    this.currentDay = selectedDay;
    console.log(`[SnapshotService] Starting auto-snapshots for ${selectedDay}`);

    // Take initial snapshot immediately
    this.takeSnapshot(selectedDay);

    // Schedule hourly snapshots (every 60 minutes)
    this.snapshotInterval = setInterval(() => {
      if (this.currentDay) {
        this.takeSnapshot(this.currentDay);
      }
    }, 60 * 60 * 1000); // 1 hour in milliseconds
  }

  /**
   * Stop automatic snapshots
   */
  stopAutoSnapshots() {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
      this.currentDay = null;
      console.log('[SnapshotService] Stopped auto-snapshots');
    }
  }

  /**
   * Update the current day for snapshots (when user changes day)
   * @param {string} newDay - New day of week
   */
  updateDay(newDay) {
    if (this.currentDay !== newDay) {
      console.log(`[SnapshotService] Updating day from ${this.currentDay} to ${newDay}`);
      this.currentDay = newDay;
      // Take snapshot of new day immediately
      this.takeSnapshot(newDay);
    }
  }

  /**
   * Take a snapshot of current state
   * @param {string} dayOfWeek - Day of week
   */
  async takeSnapshot(dayOfWeek) {
    try {
      const now = Date.now();
      const hour = new Date(now).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });

      console.log(`[SnapshotService] Taking snapshot for ${dayOfWeek} at ${hour}`);

      // Get current state
      const theatres = await storageService.getTheatresForDay(dayOfWeek);
      const practitioners = await storageService.getPractitionersForDay(dayOfWeek);
      const rosterDate = await storageService.getRosterDateForDay(dayOfWeek);

      const snapshot = {
        timestamp: now,
        hour,
        dayOfWeek,
        theatres,
        practitioners,
        rosterDate
      };

      // Round timestamp to hour for consistent keys (removes minutes/seconds)
      const hourKey = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000);

      const snapshotRef = ref(database, `${DB_PATH}/${dayOfWeek}/${hourKey}`);
      await set(snapshotRef, snapshot);

      console.log(`[SnapshotService] Snapshot saved for ${dayOfWeek} at ${hour} (key: ${hourKey})`);

      // Cleanup old snapshots asynchronously
      this.cleanupOldSnapshots(dayOfWeek).catch(err =>
        console.error('[SnapshotService] Cleanup failed:', err)
      );
    } catch (error) {
      console.error('[SnapshotService] Failed to take snapshot:', error);
      // Don't throw - snapshot failure shouldn't break app
    }
  }

  /**
   * Get all snapshots for a specific day
   * @param {string} dayOfWeek - Day of week
   * @returns {Promise<Array>} Array of snapshots sorted by timestamp (newest first)
   */
  async getSnapshotsForDay(dayOfWeek) {
    try {
      const snapshotsRef = ref(database, `${DB_PATH}/${dayOfWeek}`);
      const snapshot = await get(snapshotsRef);

      if (!snapshot.exists()) return [];

      return Object.values(snapshot.val())
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('[SnapshotService] Failed to get snapshots:', error);
      return [];
    }
  }

  /**
   * Get a specific snapshot by timestamp
   * @param {string} dayOfWeek - Day of week
   * @param {number} snapshotTimestamp - Timestamp of snapshot
   * @returns {Promise<Object|null>} Snapshot data or null if not found
   */
  async getSnapshot(dayOfWeek, snapshotTimestamp) {
    try {
      // Round timestamp to hour key
      const hourKey = Math.floor(snapshotTimestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
      const snapshotRef = ref(database, `${DB_PATH}/${dayOfWeek}/${hourKey}`);
      const snapshot = await get(snapshotRef);

      if (!snapshot.exists()) return null;

      return snapshot.val();
    } catch (error) {
      console.error('[SnapshotService] Failed to get snapshot:', error);
      return null;
    }
  }

  /**
   * Restore state from a snapshot
   * @param {string} dayOfWeek - Day of week
   * @param {number} snapshotTimestamp - Timestamp of snapshot to restore
   * @returns {Promise<Object>} Restored snapshot data
   */
  async restoreSnapshot(dayOfWeek, snapshotTimestamp) {
    try {
      const data = await this.getSnapshot(dayOfWeek, snapshotTimestamp);

      if (!data) {
        throw new Error('Snapshot not found');
      }

      console.log(`[SnapshotService] Restoring snapshot for ${dayOfWeek} from ${data.hour}`);

      // Restore state to storage
      await storageService.setTheatresForDay(dayOfWeek, data.theatres);
      await storageService.setPractitionersForDay(dayOfWeek, data.practitioners);
      await storageService.setRosterDateForDay(dayOfWeek, data.rosterDate);

      console.log(`[SnapshotService] Successfully restored snapshot from ${data.hour}`);

      return data;
    } catch (error) {
      console.error('[SnapshotService] Failed to restore snapshot:', error);
      throw error;
    }
  }

  /**
   * Cleanup old snapshots (keep last MAX_SNAPSHOTS_PER_DAY)
   * @param {string} dayOfWeek - Day of week
   */
  async cleanupOldSnapshots(dayOfWeek) {
    try {
      const snapshotsRef = ref(database, `${DB_PATH}/${dayOfWeek}`);
      const snapshot = await get(snapshotsRef);

      if (!snapshot.exists()) return;

      const snapshots = Object.entries(snapshot.val());
      if (snapshots.length <= MAX_SNAPSHOTS_PER_DAY) return;

      // Sort by timestamp (newest first) and identify snapshots to delete
      snapshots.sort((a, b) => b[1].timestamp - a[1].timestamp);
      const toDelete = snapshots.slice(MAX_SNAPSHOTS_PER_DAY);

      console.log(`[SnapshotService] Cleaning up ${toDelete.length} old snapshots for ${dayOfWeek}`);

      // Delete old snapshots
      const deletePromises = toDelete.map(([key]) =>
        remove(ref(database, `${DB_PATH}/${dayOfWeek}/${key}`))
      );

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('[SnapshotService] Cleanup failed:', error);
      // Don't throw - cleanup failure shouldn't break functionality
    }
  }

  /**
   * Delete a specific snapshot
   * @param {string} dayOfWeek - Day of week
   * @param {number} snapshotTimestamp - Timestamp of snapshot to delete
   */
  async deleteSnapshot(dayOfWeek, snapshotTimestamp) {
    try {
      const hourKey = Math.floor(snapshotTimestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
      const snapshotRef = ref(database, `${DB_PATH}/${dayOfWeek}/${hourKey}`);
      await remove(snapshotRef);
      console.log(`[SnapshotService] Deleted snapshot for ${dayOfWeek} at ${snapshotTimestamp}`);
    } catch (error) {
      console.error('[SnapshotService] Failed to delete snapshot:', error);
      throw error;
    }
  }

  /**
   * Delete all snapshots for a specific day
   * @param {string} dayOfWeek - Day of week
   */
  async deleteSnapshotsForDay(dayOfWeek) {
    try {
      const snapshotsRef = ref(database, `${DB_PATH}/${dayOfWeek}`);
      await remove(snapshotsRef);
      console.log(`[SnapshotService] Deleted all snapshots for ${dayOfWeek}`);
    } catch (error) {
      console.error('[SnapshotService] Failed to delete snapshots:', error);
      throw error;
    }
  }

  /**
   * Delete all snapshots across all days
   */
  async deleteAllSnapshots() {
    try {
      const snapshotsRef = ref(database, DB_PATH);
      await remove(snapshotsRef);
      console.log('[SnapshotService] Deleted all snapshots');
    } catch (error) {
      console.error('[SnapshotService] Failed to delete all snapshots:', error);
      throw error;
    }
  }
}

export default new SnapshotService();
