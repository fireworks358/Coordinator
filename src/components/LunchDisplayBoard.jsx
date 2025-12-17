// src/components/LunchDisplayBoard.jsx
// Display page showing ordered list of pending lunch relief requests

import React, { useState, useEffect } from 'react';
import { useLunchRequests } from '../hooks/useLunchRequests.js';
import { useTheatreData } from '../hooks/useTheatreData.js';
import lunchRequestService from '../services/lunchRequestService.js';
import './LunchDisplayBoard.css';

const LunchDisplayBoard = () => {
  const { requests, fulfillRequest, isLoading } = useLunchRequests();
  const { theatres } = useTheatreData();
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [, setTriggerRefresh] = useState(0);
  const [cepodRequestsCreated, setCepodRequestsCreated] = useState(false);

  // Check if theatre is CEPOD & Trauma
  const isCepodTrauma = (theatreName) => {
    if (!theatreName) return false;

    const normalizedName = theatreName.toString().trim().toUpperCase();

    // Check if the name contains E13, E14, E17, or E18
    // This handles names like "CEPOD 2 E13", "Trauma 1 / E17", etc.
    return normalizedName.includes('E13') ||
           normalizedName.includes('E14') ||
           normalizedName.includes('E17') ||
           normalizedName.includes('E18');
  };

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
      );
      // Trigger re-render to update elapsed times
      setTriggerRefresh(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-create CEPOD & Trauma requests at 12:00
  useEffect(() => {
    const checkAndCreateCepodRequests = async () => {
      if (!theatres || theatres.length === 0) return;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Check if it's 12:00 (noon) and requests haven't been created yet today
      if (currentHour === 12 && currentMinute === 0 && !cepodRequestsCreated) {
        console.log('Creating CEPOD & Trauma lunch requests at 12:00');

        // Find CEPOD & Trauma theatres from dashboard data
        const cepodTheatres = theatres.filter(t => isCepodTrauma(t.name));

        for (const theatre of cepodTheatres) {
          // Check if theatre already has a pending request
          const hasPending = await lunchRequestService.hasPendingRequest(theatre.name);
          if (!hasPending) {
            await lunchRequestService.createLunchRequest(theatre.name);
            console.log(`Auto-created CEPOD & Trauma lunch request for ${theatre.name}`);
          } else {
            console.log(`${theatre.name} already has a pending request, skipping`);
          }
        }

        setCepodRequestsCreated(true);
      }

      // Reset the flag at midnight to allow creation again the next day
      if (currentHour === 0 && currentMinute === 0 && cepodRequestsCreated) {
        console.log('Resetting CEPOD request creation flag at midnight');
        setCepodRequestsCreated(false);
      }
    };

    // Check every minute
    const interval = setInterval(checkAndCreateCepodRequests, 60000);

    // Also check on mount
    checkAndCreateCepodRequests();

    return () => clearInterval(interval);
  }, [cepodRequestsCreated, theatres, isCepodTrauma]);

  // Handle marking request as fulfilled
  const handleFulfill = async (requestId, theatreName) => {
    const confirmed = window.confirm(
      `Mark lunch relief for ${theatreName} as fulfilled?`
    );

    if (confirmed) {
      await fulfillRequest(requestId);
    }
  };

  // Filter and sort pending requests
  const pendingRequests = requests
    .filter(req => req.status === 'pending')
    .sort((a, b) => {
      // CEPOD & Trauma always at the top
      const aIsCepod = isCepodTrauma(a.theatreName);
      const bIsCepod = isCepodTrauma(b.theatreName);

      if (aIsCepod && !bIsCepod) return -1;
      if (!aIsCepod && bIsCepod) return 1;

      // Otherwise sort by timestamp (oldest first)
      return a.timestamp - b.timestamp;
    });

  return (
    <div className="lunch-display-board">
      <header className="display-header">
        <div className="header-content">
          <h1>Lunch Relief Queue</h1>
          <div className="header-info">
            <span className="current-time">{currentTime}</span>
            <span className="request-count">
              {pendingRequests.length} Pending Request{pendingRequests.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      <main className="requests-container">
        {isLoading ? (
          <div className="loading-state">
            <p>Loading requests...</p>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h2>No Pending Requests</h2>
            <p>All lunch reliefs have been fulfilled</p>
          </div>
        ) : (
          <div className="requests-list">
            {pendingRequests.map((request) => {
              const requestTime = new Date(request.timestamp).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });

              const isCepod = isCepodTrauma(request.theatreName);

              return (
                <div key={request.id} className={`request-card ${isCepod ? 'cepod-trauma' : ''}`}>
                  <div className="request-header">
                    <h3 className="request-theatre-name">{request.theatreName}</h3>
                    <span className="request-time">{requestTime}</span>
                  </div>
                  <button
                    className="fulfill-button"
                    onClick={() => handleFulfill(request.id, request.theatreName)}
                  >
                    Mark as Fulfilled
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default LunchDisplayBoard;
