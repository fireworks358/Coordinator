// src/hooks/usePractitionerData.js
// Custom hook for practitioner state management with Firebase sync

import { useState, useEffect, useRef, useCallback } from 'react';
import storageService from '../services/storageService.js';

const defaultPractitioners = [
    { name: 'M Varghese', endTime: '17:30', relieved: false, supper: false },
    { name: 'K Bevis', endTime: '18:00', relieved: false, supper: false },
];

/**
 * Custom hook for managing practitioner data with Firebase real-time sync
 * @returns {Object} { practitionerList, setPractitionerList, updatePractitioner, isLoading }
 */
export const usePractitionerData = () => {
  const [practitionerList, setPractitionerList] = useState(defaultPractitioners);
  const [isLoading, setIsLoading] = useState(true);
  const isFirebaseUpdate = useRef(false);
  const unsubscribeRef = useRef(null);

  // Load initial data and subscribe to updates
  useEffect(() => {
    let mounted = true;

    const initializePractitioners = async () => {
      try {
        // Load initial data from storage
        const initialData = await storageService.getPractitioners();
        if (mounted && initialData.length > 0) {
          // Ensure all practitioners have relieved and supper properties
          const migratedData = initialData.map(p => ({
            ...p,
            relieved: p.relieved ?? false,
            supper: p.supper ?? false
          }));
          isFirebaseUpdate.current = true;
          setPractitionerList(migratedData);
        }
      } catch (error) {
        console.error('Error loading initial practitioner data:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }

      // Subscribe to real-time updates
      // Always subscribe - Firebase listeners work even when not connected yet
      try {
        unsubscribeRef.current = storageService.subscribeToPractitioners((updatedPractitioners) => {
          if (mounted && updatedPractitioners.length > 0) {
            // Ensure all practitioners have relieved and supper properties
            const migratedData = updatedPractitioners.map(p => ({
              ...p,
              relieved: p.relieved ?? false,
              supper: p.supper ?? false
            }));
            isFirebaseUpdate.current = true;
            setPractitionerList(migratedData);
          }
        });
      } catch (error) {
        console.error('Error subscribing to practitioner updates:', error);
      }
    };

    initializePractitioners();

    // Cleanup
    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Save practitioners when they change (but not on Firebase updates to prevent loops)
  useEffect(() => {
    if (isFirebaseUpdate.current) {
      isFirebaseUpdate.current = false;
      return;
    }

    // Only save if not a Firebase update (user-initiated change)
    if (!isLoading) {
      storageService.setPractitioners(practitionerList).catch(error => {
        console.error('Error saving practitioners:', error);
      });
    }
  }, [practitionerList, isLoading]);

  /**
   * Update a single practitioner field
   * @param {string} practitionerName - Practitioner name
   * @param {Object} updates - Fields to update
   */
  const updatePractitioner = useCallback((practitionerName, updates) => {
    setPractitionerList(prevList =>
      prevList.map(p =>
        p.name === practitionerName ? { ...p, ...updates } : p
      )
    );
  }, []);

  return {
    practitionerList,
    setPractitionerList,
    updatePractitioner,
    isLoading
  };
};
