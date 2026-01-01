// src/components/OfflineBanner.jsx
// Banner component to display offline/online status

import React, { useState, useEffect } from 'react';
import firebaseService from '../services/firebaseService.js';
import '../styles/OfflineBanner.css';

const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check initial connection status
    const checkConnection = () => {
      const connected = firebaseService.getConnectionStatus();
      setIsOnline(connected);
      setShowBanner(!connected);
    };

    // Check immediately
    checkConnection();

    // Set up interval to check connection status
    const intervalId = setInterval(checkConnection, 3000); // Check every 3 seconds

    // Cleanup
    return () => clearInterval(intervalId);
  }, []);

  // Auto-hide banner after coming back online
  useEffect(() => {
    if (isOnline && showBanner) {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 3000); // Hide "Back online" message after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isOnline, showBanner]);

  if (!showBanner && isOnline) return null;

  return (
    <div className={`offline-banner ${isOnline ? 'online' : 'offline'}`}>
      <div className="banner-content">
        {isOnline ? (
          <>
            <span className="status-icon">✓</span>
            <span className="status-message">Back online! Changes are being saved.</span>
          </>
        ) : (
          <>
            <span className="status-icon">⚠</span>
            <span className="status-message">
              You are offline. Changes cannot be saved until connection is restored.
            </span>
          </>
        )}
      </div>
      {isOnline && (
        <button
          className="dismiss-button"
          onClick={() => setShowBanner(false)}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default OfflineBanner;
