// src/services/lunchRequestService.js
// Firebase service for lunch relief requests
// Always enabled for real-time synchronization (independent of storageService toggle)

import { ref, push, set, update, onValue, remove, get } from 'firebase/database';
import { database } from '../firebase.js';

const DB_PATH = 'coordinator/lunchRequests';

/**
 * Lunch Request Service Class
 * Handles all Firebase operations for lunch relief requests
 */
class LunchRequestService {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Create a new lunch relief request
   * @param {string} theatreName - Name of the theatre requesting relief
   * @returns {Promise<string>} Request ID
   */
  async createLunchRequest(theatreName) {
    try {
      const requestsRef = ref(database, DB_PATH);
      const newRequestRef = push(requestsRef);

      const timestamp = Date.now();
      const requestData = {
        theatreName,
        timestamp,
        status: 'pending',
        createdAt: timestamp
      };

      await set(newRequestRef, requestData);
      console.log(`Lunch request created for ${theatreName} with ID ${newRequestRef.key}`);

      return newRequestRef.key;
    } catch (error) {
      console.error('Error creating lunch request:', error);
      throw error;
    }
  }

  /**
   * Get all lunch requests
   * @returns {Promise<Array>} Array of lunch request objects
   */
  async getLunchRequests() {
    try {
      const requestsRef = ref(database, DB_PATH);
      const snapshot = await get(requestsRef);

      if (!snapshot.exists()) {
        return [];
      }

      const requestsObj = snapshot.val();
      const requestsArray = Object.keys(requestsObj).map(key => ({
        id: key,
        ...requestsObj[key]
      }));

      return requestsArray;
    } catch (error) {
      console.error('Error getting lunch requests:', error);
      throw error;
    }
  }

  /**
   * Mark a lunch request as fulfilled
   * @param {string} requestId - Request ID
   * @returns {Promise<void>}
   */
  async markAsFulfilled(requestId) {
    try {
      const requestRef = ref(database, `${DB_PATH}/${requestId}`);
      await update(requestRef, {
        status: 'fulfilled',
        fulfilledAt: Date.now()
      });
      console.log(`Lunch request ${requestId} marked as fulfilled`);
    } catch (error) {
      console.error('Error marking request as fulfilled:', error);
      throw error;
    }
  }

  /**
   * Delete a lunch request
   * @param {string} requestId - Request ID
   * @returns {Promise<void>}
   */
  async deleteLunchRequest(requestId) {
    try {
      const requestRef = ref(database, `${DB_PATH}/${requestId}`);
      await remove(requestRef);
      console.log(`Lunch request ${requestId} deleted`);
    } catch (error) {
      console.error('Error deleting lunch request:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time lunch request updates
   * @param {Function} callback - Callback function called when requests change
   * @returns {Function} Unsubscribe function
   */
  subscribeToLunchRequests(callback) {
    const requestsRef = ref(database, DB_PATH);

    const listener = onValue(requestsRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const requestsObj = snapshot.val();
      const requestsArray = Object.keys(requestsObj).map(key => ({
        id: key,
        ...requestsObj[key]
      }));

      callback(requestsArray);
    }, (error) => {
      console.error('Error in lunch requests subscription:', error);
      callback([]);
    });

    // Store listener for cleanup
    const listenerId = Date.now().toString();
    this.listeners.set(listenerId, { ref: requestsRef, listener });

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listenerId);
    };
  }

  /**
   * Clean expired lunch requests
   * Removes fulfilled requests after 16:00
   * @returns {Promise<void>}
   */
  async cleanExpiredRequests() {
    try {
      const now = new Date();
      const currentHour = now.getHours();

      // Only clean up after 16:00 (4 PM)
      if (currentHour < 16) {
        return;
      }

      const requests = await this.getLunchRequests();

      // Remove fulfilled requests
      const deletePromises = requests
        .filter(request => request.status === 'fulfilled')
        .map(request => this.deleteLunchRequest(request.id));

      await Promise.all(deletePromises);

      if (deletePromises.length > 0) {
        console.log(`Cleaned up ${deletePromises.length} fulfilled lunch requests`);
      }
    } catch (error) {
      console.error('Error cleaning expired requests:', error);
    }
  }

  /**
   * Check if a theatre already has a pending lunch request
   * @param {string} theatreName - Theatre name to check
   * @returns {Promise<boolean>} True if pending request exists
   */
  async hasPendingRequest(theatreName) {
    try {
      const requests = await this.getLunchRequests();
      return requests.some(
        request => request.theatreName === theatreName && request.status === 'pending'
      );
    } catch (error) {
      console.error('Error checking for pending request:', error);
      return false;
    }
  }
}

// Export singleton instance
const lunchRequestService = new LunchRequestService();
export default lunchRequestService;
