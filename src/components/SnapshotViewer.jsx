// src/components/SnapshotViewer.jsx
// Modal component for viewing and restoring state snapshots

import React, { useState, useEffect } from 'react';
import snapshotService from '../services/snapshotService.js';
import '../styles/SnapshotViewer.css';

const SnapshotViewer = ({ isOpen, onClose, selectedDay, onRestore }) => {
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);

  // Load snapshots when modal opens or day changes
  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
    }
  }, [isOpen, selectedDay]);

  const loadSnapshots = async () => {
    setIsLoading(true);
    try {
      const data = await snapshotService.getSnapshotsForDay(selectedDay);
      setSnapshots(data);
      setSelectedSnapshot(null);
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const handleRestore = async () => {
    if (!selectedSnapshot) return;

    const confirmed = window.confirm(
      `Are you sure you want to restore the snapshot from ${selectedSnapshot.hour}?\n\n` +
      'This will OVERWRITE all current data for this day.\n\n' +
      'Current data will be lost unless you have a more recent snapshot.'
    );

    if (!confirmed) return;

    setIsRestoring(true);
    try {
      await snapshotService.restoreSnapshot(selectedDay, selectedSnapshot.timestamp);
      alert(`Successfully restored snapshot from ${selectedSnapshot.hour}`);

      // Call onRestore callback to refresh the dashboard
      if (onRestore) {
        onRestore();
      }

      onClose();
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      alert('Failed to restore snapshot. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDelete = async (snapshot, event) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to delete the snapshot from ${snapshot.hour}?\n\n` +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      await snapshotService.deleteSnapshot(selectedDay, snapshot.timestamp);
      // Reload snapshots
      await loadSnapshots();
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
      alert('Failed to delete snapshot. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="snapshot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="snapshot-header">
          <h2>Restore from Snapshot</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="snapshot-info">
          <p>Select a snapshot to restore {selectedDay}'s data to a previous state.</p>
          <p className="warning">⚠️ Restoring will overwrite all current data for this day.</p>
        </div>

        <div className="snapshot-content">
          {isLoading ? (
            <div className="loading">Loading snapshots...</div>
          ) : snapshots.length === 0 ? (
            <div className="empty-state">
              No snapshots available for {selectedDay}.
              <br />
              Snapshots are created automatically every hour.
            </div>
          ) : (
            <div className="snapshots-list">
              {snapshots.map((snapshot, index) => (
                <div
                  key={index}
                  className={`snapshot-item ${selectedSnapshot === snapshot ? 'selected' : ''}`}
                  onClick={() => setSelectedSnapshot(snapshot)}
                >
                  <div className="snapshot-main">
                    <div className="snapshot-time">
                      <strong>{snapshot.hour}</strong>
                      <span className="time-ago">{getTimeAgo(snapshot.timestamp)}</span>
                    </div>
                    <div className="snapshot-date">
                      {formatTimestamp(snapshot.timestamp)}
                    </div>
                  </div>

                  <div className="snapshot-details">
                    <div className="detail-item">
                      <span className="detail-label">Theatres:</span>
                      <span className="detail-value">
                        {snapshot.theatres?.length || 0} items
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Practitioners:</span>
                      <span className="detail-value">
                        {snapshot.practitioners?.length || 0} items
                      </span>
                    </div>
                    {snapshot.rosterDate && (
                      <div className="detail-item">
                        <span className="detail-label">Roster Date:</span>
                        <span className="detail-value">{snapshot.rosterDate}</span>
                      </div>
                    )}
                  </div>

                  <button
                    className="delete-snapshot-button"
                    onClick={(e) => handleDelete(snapshot, e)}
                    title="Delete this snapshot"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="snapshot-footer">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={isRestoring}
          >
            Cancel
          </button>
          <button
            className="restore-button"
            onClick={handleRestore}
            disabled={!selectedSnapshot || isRestoring}
          >
            {isRestoring ? 'Restoring...' : 'Restore Selected Snapshot'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SnapshotViewer;
