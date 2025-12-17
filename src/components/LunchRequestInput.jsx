// src/components/LunchRequestInput.jsx
// Input page for ODPs to request lunch relief by pressing theatre buttons

import React, { useState, useEffect, useMemo } from 'react';
import { useLunchRequests } from '../hooks/useLunchRequests.js';
import { useTheatreData } from '../hooks/useTheatreData.js';
import './LunchRequestInput.css';

const LunchRequestInput = () => {
  const { requests, createRequest, fulfillRequest, error } = useLunchRequests();
  const { theatres, isLoading: theatresLoading } = useTheatreData();
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  // Generate theatre groups dynamically from dashboard theatre data
  const THEATRE_GROUPS = useMemo(() => {
    if (theatresLoading || !theatres || theatres.length === 0) {
      return [];
    }

    return [
      {
        title: '(E1-E11)',
        theatres: theatres.slice(0, 11).map(t => t.name)
      },
      {
        title: '(E12-E22)',
        theatres: theatres.slice(11, 22).map(t => t.name)
      },
      {
        title: 'Day Surgery (D1-D7)',
        theatres: theatres.slice(22, 29).map(t => t.name)
      },
      {
        title: 'Remote Areas',
        theatres: theatres.slice(29).map(t => t.name)
      }
    ];
  }, [theatres, theatresLoading]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message]);

  // Handle theatre button click
  const handleTheatreClick = async (theatreName) => {
    // Check if theatre already has pending request
    const hasPending = requests.some(
      req => req.theatreName === theatreName && req.status === 'pending'
    );

    if (hasPending) {
      setMessage(`${theatreName} already has a pending lunch request`);
      setMessageType('error');
      return;
    }

    // Create the request
    const success = await createRequest(theatreName);

    if (success) {
      setMessage(`Lunch relief requested for ${theatreName}`);
      setMessageType('success');
    } else {
      setMessage(error || 'Failed to create lunch request');
      setMessageType('error');
    }
  };

  // Handle cancel request
  const handleCancelRequest = async (requestId, theatreName) => {
    const confirmed = window.confirm(
      `Cancel lunch relief request for ${theatreName}?`
    );

    if (confirmed) {
      const success = await fulfillRequest(requestId);
      if (success) {
        setMessage(`Request for ${theatreName} cancelled`);
        setMessageType('success');
      } else {
        setMessage('Failed to cancel request');
        setMessageType('error');
      }
    }
  };

  // Get pending requests for display
  const pendingRequests = requests
    .filter(req => req.status === 'pending')
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-5); // Show last 5 requests

  return (
    <div className="lunch-request-input">
      <header className="lunch-request-header">
        <h1>Lunch Relief Request</h1>
        <div className="current-time">{currentTime}</div>
      </header>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      {theatresLoading ? (
        <div className="loading">Loading theatres...</div>
      ) : (
        <div className="theatre-groups">
          {THEATRE_GROUPS.map((group, groupIndex) => (
            <div key={groupIndex} className="theatre-group">
              <h2 className="group-title">{group.title}</h2>
              <div className="theatre-grid">
                {group.theatres.map((theatre, index) => {
                  const hasPending = requests.some(
                    req => req.theatreName === theatre && req.status === 'pending'
                  );

                  return (
                    <button
                      key={index}
                      className={`theatre-button ${hasPending ? 'has-pending' : ''}`}
                      onClick={() => handleTheatreClick(theatre)}
                      disabled={hasPending}
                    >
                      {theatre}
                      {hasPending && <span className="pending-indicator">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div className="recent-requests">
          <h3>Pending Requests ({pendingRequests.length})</h3>
          <ul>
            {pendingRequests.map((request) => {
              const requestTime = new Date(request.timestamp).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });

              return (
                <li key={request.id}>
                  <div className="request-info">
                    <span className="request-theatre">{request.theatreName}</span>
                    <span className="request-time">{requestTime}</span>
                  </div>
                  <button
                    className="cancel-request-btn"
                    onClick={() => handleCancelRequest(request.id, request.theatreName)}
                  >
                    Cancel
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LunchRequestInput;
