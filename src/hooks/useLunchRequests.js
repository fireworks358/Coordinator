// src/hooks/useLunchRequests.js
// Custom hook for lunch request state management with Firebase real-time sync

import { useState, useEffect, useRef, useCallback } from 'react';
import lunchRequestService from '../services/lunchRequestService.js';

/**
 * Custom hook for managing lunch relief requests with Firebase real-time sync
 * @returns {Object} { requests, isLoading, error, createRequest, fulfillRequest }
 */
export const useLunchRequests = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const isFirebaseUpdate = useRef(false);
  const unsubscribeRef = useRef(null);

  // Load initial data and subscribe to updates
  useEffect(() => {
    let mounted = true;

    const initializeLunchRequests = async () => {
      try {
        // Load initial data from Firebase
        const initialData = await lunchRequestService.getLunchRequests();
        if (mounted) {
          isFirebaseUpdate.current = true;
          setRequests(initialData);
        }

        // Clean expired requests on mount
        await lunchRequestService.cleanExpiredRequests();
      } catch (err) {
        console.error('Error loading initial lunch request data:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }

      // Subscribe to real-time updates
      try {
        unsubscribeRef.current = lunchRequestService.subscribeToLunchRequests((updatedRequests) => {
          if (mounted) {
            isFirebaseUpdate.current = true;
            setRequests(updatedRequests);

            // Clean expired requests when new data arrives
            lunchRequestService.cleanExpiredRequests().catch(err => {
              console.error('Error cleaning expired requests:', err);
            });
          }
        });
      } catch (err) {
        console.error('Error subscribing to lunch request updates:', err);
        if (mounted) {
          setError(err.message);
        }
      }
    };

    initializeLunchRequests();

    // Cleanup
    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  /**
   * Create a new lunch relief request
   * @param {string} theatreName - Theatre name requesting relief
   * @returns {Promise<boolean>} Success status
   */
  const createRequest = useCallback(async (theatreName) => {
    try {
      setError(null);

      // Check if theatre already has a pending request
      const hasPending = await lunchRequestService.hasPendingRequest(theatreName);
      if (hasPending) {
        setError(`${theatreName} already has a pending lunch request`);
        return false;
      }

      // Create the request
      await lunchRequestService.createLunchRequest(theatreName);
      return true;
    } catch (err) {
      console.error('Error creating lunch request:', err);
      setError(err.message);
      return false;
    }
  }, []);

  /**
   * Mark a lunch request as fulfilled
   * @param {string} requestId - Request ID to fulfill
   * @returns {Promise<boolean>} Success status
   */
  const fulfillRequest = useCallback(async (requestId) => {
    try {
      setError(null);
      await lunchRequestService.markAsFulfilled(requestId);
      return true;
    } catch (err) {
      console.error('Error fulfilling lunch request:', err);
      setError(err.message);
      return false;
    }
  }, []);

  return {
    requests,
    isLoading,
    error,
    createRequest,
    fulfillRequest
  };
};
