// src/hooks/useTheatreData.js
// Custom hook for theatre state management with Firebase sync

import { useState, useEffect, useRef, useCallback } from 'react';
import storageService from '../services/storageService.js';

const initialTheatreData = [
    { name: 'Theatre E1', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 0},
    { name: 'Theatre E2', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 1},
    { name: 'Theatre E3', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 2},
    { name: 'Theatre E4', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 3},
    { name: 'Theatre E5', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 4},
    { name: 'Theatre E6', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 5},
    { name: 'Theatre E7', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 6},
    { name: 'Theatre E8', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 7},
    { name: 'Theatre E9', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 8},
    { name: 'Theatre E10', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 9},
    { name: 'Theatre E11', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 10},
    { name: 'Theatre E12', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 11},
    { name: 'CEPOD 2 E13', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 12},
    { name: 'CEPOD E14', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 13},
    { name: 'Theatre E15', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 14},
    { name: 'Theatre E16', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 15},
    { name: 'Trauma 1 / E17', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 16},
    { name: 'Trauma 2 / E18', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 17},
    { name: 'Theatre E19', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 18},
    { name: 'Theatre E20', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 19},
    { name: 'Theatre E21', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 20},
    { name: 'Theatre E22', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 21},
    { name: 'Theatre D1', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 22},
    { name: 'Theatre D2', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 23},
    { name: 'Theatre D3', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 24},
    { name: 'Theatre D4', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 25},
    { name: 'Theatre D5', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 26},
    { name: 'Theatre D6', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 27},
    { name: 'Theatre D7', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 28},
    { name: 'Maternity Emergency', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 29},
    { name: 'Maternity Elective', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 30},
    { name: 'Endoscopy', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 31},
    { name: 'IR', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 32},
    { name: 'MRI', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 33},
    { name: 'Cardiology', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 34},
    { name: 'Spare', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 35},
    { name: 'Spare 2', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running', phoneExtension: '', order: 36},
];

/**
 * Custom hook for managing theatre data with Firebase real-time sync
 * @param {string} selectedDay - Day of week (e.g., 'monday')
 * @returns {Object} { theatres, setTheatres, updateTheatre, isLoading }
 */
export const useTheatreData = (selectedDay) => {
  const [theatres, setTheatres] = useState(initialTheatreData);
  const [isLoading, setIsLoading] = useState(true);
  const isFirebaseUpdate = useRef(false);
  const unsubscribeRef = useRef(null);
  const previousDayRef = useRef(selectedDay);

  // Load initial data and subscribe to updates
  useEffect(() => {
    let mounted = true;

    // Reset loading state when day changes
    setIsLoading(true);

    console.log(`[useTheatreData] Effect running for day: ${selectedDay}`);

    const initializeTheatres = async () => {
      try {
        // Load initial data from storage for selected day
        const initialData = await storageService.getTheatresForDay(selectedDay);
        console.log(`[useTheatreData] Loaded ${initialData.length} theatres for ${selectedDay}`);

        if (mounted) {
          if (initialData.length > 0) {
            // Ensure theatres have order field and sort by it
            const sortedData = initialData.map((t, index) => ({
              ...t,
              order: t.order !== undefined ? t.order : index
            })).sort((a, b) => a.order - b.order);
            isFirebaseUpdate.current = true;
            console.log(`[useTheatreData] Setting ${sortedData.length} theatres for ${selectedDay}`);
            setTheatres(sortedData);
          } else {
            // Use default template if no data for this day
            isFirebaseUpdate.current = true;
            console.log(`[useTheatreData] No data for ${selectedDay}, using default template`);
            setTheatres(initialTheatreData);
          }
        }
      } catch (error) {
        console.error('Error loading initial theatre data:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }

      // Subscribe to real-time updates for selected day
      // Always subscribe - Firebase listeners work even when not connected yet
      try {
        unsubscribeRef.current = storageService.subscribeToTheatresForDay(selectedDay, (updatedTheatres) => {
          if (mounted && updatedTheatres.length > 0) {
            // Ensure theatres have order field and sort by it
            const sortedData = updatedTheatres.map((t, index) => ({
              ...t,
              order: t.order !== undefined ? t.order : index
            })).sort((a, b) => a.order - b.order);
            isFirebaseUpdate.current = true;
            setTheatres(sortedData);
          }
        });
      } catch (error) {
        console.error('Error subscribing to theatre updates:', error);
      }
    };

    initializeTheatres();

    // Cleanup
    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [selectedDay]); // Re-run when selected day changes

  // Save theatres when they change (but not on Firebase updates to prevent loops)
  useEffect(() => {
    if (isFirebaseUpdate.current) {
      console.log(`[useTheatreData] Skipping save - Firebase update flag set`);
      isFirebaseUpdate.current = false;
      return;
    }

    // Check if day changed - if so, don't save (we're loading new day's data)
    if (previousDayRef.current !== selectedDay) {
      console.log(`[useTheatreData] Day changed from ${previousDayRef.current} to ${selectedDay} - skipping save`);
      previousDayRef.current = selectedDay;
      return;
    }

    // Only save if not a Firebase update (user-initiated change)
    if (!isLoading) {
      console.log(`[useTheatreData] Saving ${theatres.length} theatres to ${selectedDay}`);
      storageService.setTheatresForDay(selectedDay, theatres).catch(error => {
        console.error('Error saving theatres:', error);
      });
    } else {
      console.log(`[useTheatreData] Skipping save - still loading`);
    }
  }, [theatres, selectedDay, isLoading]); // Re-save when day or theatres change

  /**
   * Update a single theatre
   * @param {string} theatreName - Theatre name
   * @param {Object} updates - Theatre data to update
   */
  const updateTheatre = useCallback((theatreName, updates) => {
    setTheatres(prevTheatres =>
      prevTheatres.map(t =>
        t.name === theatreName ? { ...t, ...updates } : t
      )
    );
  }, []);

  return {
    theatres,
    setTheatres,
    updateTheatre,
    isLoading
  };
};
