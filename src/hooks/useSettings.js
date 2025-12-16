// src/hooks/useSettings.js
// Custom hook for settings state management with Firebase sync

import { useState, useEffect, useRef, useCallback } from 'react';
import storageService from '../services/storageService.js';

const defaultHighlightSettings = {
  highlightEarlies: true,
  highlight1730s: true,
  highlight1830s: true,
  highlightLates: true
};

/**
 * Custom hook for managing theme setting with Firebase real-time sync
 * @returns {Object} { theme, setTheme, isLoading }
 */
export const useTheme = () => {
  const [theme, setTheme] = useState('dark');
  const [isLoading, setIsLoading] = useState(true);
  const isFirebaseUpdate = useRef(false);
  const unsubscribeRef = useRef(null);

  // Load initial data and subscribe to updates
  useEffect(() => {
    let mounted = true;

    const initializeTheme = async () => {
      try {
        // Load initial theme from storage
        const initialTheme = await storageService.getTheme();
        if (mounted && initialTheme) {
          isFirebaseUpdate.current = true;
          setTheme(initialTheme);
          // Apply theme to body element immediately
          document.body.className = initialTheme === 'light' ? 'light-theme' : 'dark-theme';
        }
      } catch (error) {
        console.error('Error loading initial theme:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }

      // Subscribe to real-time updates
      // Always subscribe - Firebase listeners work even when not connected yet
      try {
        unsubscribeRef.current = storageService.subscribeToSettings((settings) => {
          if (mounted && settings.theme) {
            isFirebaseUpdate.current = true;
            setTheme(settings.theme);
            // Apply theme to body element
            document.body.className = settings.theme === 'light' ? 'light-theme' : 'dark-theme';
          }
        });
      } catch (error) {
        console.error('Error subscribing to theme updates:', error);
      }
    };

    initializeTheme();

    // Cleanup
    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Save theme when it changes (but not on Firebase updates to prevent loops)
  useEffect(() => {
    if (isFirebaseUpdate.current) {
      isFirebaseUpdate.current = false;
      return;
    }

    // Only save if not a Firebase update (user-initiated change)
    if (!isLoading) {
      // Apply theme to body element
      document.body.className = theme === 'light' ? 'light-theme' : 'dark-theme';

      storageService.setTheme(theme).catch(error => {
        console.error('Error saving theme:', error);
      });
    }
  }, [theme, isLoading]);

  return {
    theme,
    setTheme,
    isLoading
  };
};

/**
 * Custom hook for managing highlight settings with Firebase real-time sync
 * @returns {Object} { highlightSettings, setHighlightSettings, updateHighlightSetting, isLoading }
 */
export const useHighlightSettings = () => {
  const [highlightSettings, setHighlightSettings] = useState(defaultHighlightSettings);
  const [isLoading, setIsLoading] = useState(true);
  const isFirebaseUpdate = useRef(false);
  const unsubscribeRef = useRef(null);

  // Load initial data and subscribe to updates
  useEffect(() => {
    let mounted = true;

    const initializeHighlightSettings = async () => {
      try {
        // Load initial settings from storage
        const initialSettings = await storageService.getHighlightSettings();
        if (mounted && initialSettings) {
          isFirebaseUpdate.current = true;
          setHighlightSettings(initialSettings);
        }
      } catch (error) {
        console.error('Error loading initial highlight settings:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }

      // Subscribe to real-time updates
      // Always subscribe - Firebase listeners work even when not connected yet
      try {
        unsubscribeRef.current = storageService.subscribeToSettings((settings) => {
          if (mounted && settings.highlightSettings) {
            isFirebaseUpdate.current = true;
            setHighlightSettings(settings.highlightSettings);
          }
        });
      } catch (error) {
        console.error('Error subscribing to highlight settings updates:', error);
      }
    };

    initializeHighlightSettings();

    // Cleanup
    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Save highlight settings when they change (but not on Firebase updates to prevent loops)
  useEffect(() => {
    if (isFirebaseUpdate.current) {
      isFirebaseUpdate.current = false;
      return;
    }

    // Only save if not a Firebase update (user-initiated change)
    if (!isLoading) {
      storageService.setHighlightSettings(highlightSettings).catch(error => {
        console.error('Error saving highlight settings:', error);
      });
    }
  }, [highlightSettings, isLoading]);

  /**
   * Toggle a single highlight setting
   * @param {string} setting - Setting key to toggle
   */
  const updateHighlightSetting = useCallback((setting) => {
    setHighlightSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  }, []);

  return {
    highlightSettings,
    setHighlightSettings,
    updateHighlightSetting,
    isLoading
  };
};
