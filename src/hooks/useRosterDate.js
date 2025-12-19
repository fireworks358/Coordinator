// src/hooks/useRosterDate.js
// Custom hook for roster date management with per-day persistence

import { useState, useEffect, useRef } from 'react';
import storageService from '../services/storageService.js';

/**
 * Custom hook for managing roster date per day
 * @param {string} selectedDay - Day of week (e.g., 'monday')
 * @returns {Object} { rosterDate, setRosterDate }
 */
export const useRosterDate = (selectedDay) => {
  const [rosterDate, setRosterDate] = useState(null);
  const isStorageUpdate = useRef(false);
  const previousDayRef = useRef(selectedDay);

  // Load date when component mounts or day changes
  useEffect(() => {
    let mounted = true;

    const loadRosterDate = async () => {
      try {
        const date = await storageService.getRosterDateForDay(selectedDay);
        console.log(`[useRosterDate] Loaded date for ${selectedDay}:`, date);

        if (mounted) {
          isStorageUpdate.current = true;
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

  // Save date when it changes (but not on initial load)
  useEffect(() => {
    if (isStorageUpdate.current) {
      console.log(`[useRosterDate] Skipping save - storage update flag set`);
      isStorageUpdate.current = false;
      return;
    }

    // Check if day changed - if so, don't save
    if (previousDayRef.current !== selectedDay) {
      console.log(`[useRosterDate] Day changed - skipping save`);
      previousDayRef.current = selectedDay;
      return;
    }

    // Save to storage
    if (rosterDate !== null) {
      console.log(`[useRosterDate] Saving date for ${selectedDay}:`, rosterDate);
      storageService.setRosterDateForDay(selectedDay, rosterDate).catch(error => {
        console.error('Error saving roster date:', error);
      });
    }
  }, [rosterDate, selectedDay]);

  return {
    rosterDate,
    setRosterDate
  };
};
