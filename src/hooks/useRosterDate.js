// src/hooks/useRosterDate.js
// Custom hook for roster date management with per-day persistence

import { useState, useEffect, useRef } from 'react';
import storageService from '../services/storageService.js';
import firebaseService from '../services/firebaseService.js';

/**
 * Custom hook for managing roster date per day
 * @param {string} selectedDay - Day of week (e.g., 'monday')
 * @returns {Object} { rosterDate, setRosterDate }
 */
export const useRosterDate = (selectedDay) => {
  const [rosterDate, setRosterDate] = useState(null);
  const loadedValueRef = useRef(null);
  const previousDayRef = useRef(selectedDay);
  const isInitialMount = useRef(true);

  // Load date when component mounts or day changes
  useEffect(() => {
    let mounted = true;

    const loadRosterDate = async () => {
      try {
        const date = await storageService.getRosterDateForDay(selectedDay);
        console.log(`[useRosterDate] Loaded date for ${selectedDay}:`, date);

        if (mounted) {
          loadedValueRef.current = date;
          setRosterDate(date);
        }
      } catch (error) {
        console.error('Error loading roster date:', error);
      }
    };

    loadRosterDate();

    return () => {
      mounted = false;
    };
  }, [selectedDay]);

  // Reload data when Firebase connects
  useEffect(() => {
    const unsubscribe = firebaseService.onConnectionChange(async (isConnected) => {
      if (isConnected) {
        console.log(`[useRosterDate] Firebase connected, reloading data for ${selectedDay}`);
        try {
          const date = await storageService.getRosterDateForDay(selectedDay);
          console.log(`[useRosterDate] Reloaded date after connection: ${date}`);
          loadedValueRef.current = date;
          setRosterDate(date);
        } catch (error) {
          console.error('[useRosterDate] Error reloading after connection:', error);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedDay]);

  // Save date when it changes (but not on initial load)
  useEffect(() => {
    // Skip save on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Check if day changed - if so, don't save yet (wait for new data to load)
    if (previousDayRef.current !== selectedDay) {
      console.log(`[useRosterDate] Day changed - skipping save`);
      previousDayRef.current = selectedDay;
      return;
    }

    // Don't save if this value was just loaded from storage
    if (rosterDate === loadedValueRef.current) {
      console.log(`[useRosterDate] Skipping save - value matches loaded value`);
      return;
    }

    // Save to storage (including null values, which clears the date)
    console.log(`[useRosterDate] Saving date for ${selectedDay}:`, rosterDate);
    storageService.setRosterDateForDay(selectedDay, rosterDate).catch(error => {
      console.error('Error saving roster date:', error);
    });
  }, [rosterDate, selectedDay]);

  return {
    rosterDate,
    setRosterDate
  };
};
