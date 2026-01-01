// src/components/ChangeLogViewer.jsx
// Modal component for viewing change history

import React, { useState, useEffect } from 'react';
import changeLogService from '../services/changeLogService.js';
import '../styles/ChangeLogViewer.css';

const ChangeLogViewer = ({ isOpen, onClose, selectedDay }) => {
  const [changes, setChanges] = useState([]);
  const [filteredChanges, setFilteredChanges] = useState([]);
  const [filterItem, setFilterItem] = useState('');
  const [filterField, setFilterField] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'all'

  // Load changes when modal opens or day changes
  useEffect(() => {
    if (isOpen) {
      loadChanges();
    }
  }, [isOpen, selectedDay, viewMode]);

  // Apply filters when changes or filters change
  useEffect(() => {
    applyFilters();
  }, [changes, filterItem, filterField]);

  const loadChanges = async () => {
    setIsLoading(true);
    try {
      const data = viewMode === 'day'
        ? await changeLogService.getChangesForDay(selectedDay)
        : await changeLogService.getAllChanges();
      setChanges(data);
    } catch (error) {
      console.error('Failed to load change log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...changes];

    if (filterItem) {
      filtered = filtered.filter(change =>
        change.itemName.toLowerCase().includes(filterItem.toLowerCase())
      );
    }

    if (filterField) {
      filtered = filtered.filter(change =>
        change.field.toLowerCase().includes(filterField.toLowerCase())
      );
    }

    setFilteredChanges(filtered);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatFieldName = (field) => {
    const fieldNames = {
      currentOdp: 'Current ODP',
      theatreEta: 'Theatre ETA',
      practitionerEndTime: 'Practitioner End Time',
      nextPractitioner: 'Next Practitioner',
      status: 'Status',
      phoneExtension: 'Phone Extension',
      relieved: 'Relieved',
      supper: 'Supper'
    };
    return fieldNames[field] || field;
  };

  const exportToCSV = () => {
    if (filteredChanges.length === 0) {
      alert('No changes to export');
      return;
    }

    const headers = ['Timestamp', 'Day', 'Item', 'Field', 'Old Value', 'New Value'];
    const rows = filteredChanges.map(change => [
      formatTimestamp(change.timestamp),
      change.dayOfWeek,
      change.itemName,
      formatFieldName(change.field),
      change.oldValue,
      change.newValue
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `change-log-${selectedDay}-${Date.now()}.csv`;
    link.click();
  };

  const clearFilters = () => {
    setFilterItem('');
    setFilterField('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="change-log-modal" onClick={(e) => e.stopPropagation()}>
        <div className="change-log-header">
          <h2>Change Log</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="change-log-controls">
          <div className="view-mode-toggle">
            <button
              className={viewMode === 'day' ? 'active' : ''}
              onClick={() => setViewMode('day')}
            >
              {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} Only
            </button>
            <button
              className={viewMode === 'all' ? 'active' : ''}
              onClick={() => setViewMode('all')}
            >
              All Days
            </button>
          </div>

          <div className="filters">
            <input
              type="text"
              placeholder="Filter by item name..."
              value={filterItem}
              onChange={(e) => setFilterItem(e.target.value)}
              className="filter-input"
            />
            <input
              type="text"
              placeholder="Filter by field..."
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="filter-input"
            />
            {(filterItem || filterField) && (
              <button onClick={clearFilters} className="clear-filters-button">
                Clear Filters
              </button>
            )}
          </div>

          <div className="actions">
            <button onClick={exportToCSV} className="export-button">
              Export to CSV
            </button>
            <span className="result-count">
              {filteredChanges.length} change{filteredChanges.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="change-log-content">
          {isLoading ? (
            <div className="loading">Loading changes...</div>
          ) : filteredChanges.length === 0 ? (
            <div className="empty-state">
              {changes.length === 0
                ? 'No changes recorded yet'
                : 'No changes match your filters'}
            </div>
          ) : (
            <table className="changes-table">
              <thead>
                <tr>
                  <th>Time</th>
                  {viewMode === 'all' && <th>Day</th>}
                  <th>Item</th>
                  <th>Field</th>
                  <th>Old Value</th>
                  <th>New Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredChanges.map((change, index) => (
                  <tr key={index}>
                    <td className="timestamp">{formatTimestamp(change.timestamp)}</td>
                    {viewMode === 'all' && (
                      <td className="day">{change.dayOfWeek}</td>
                    )}
                    <td className="item-name">{change.itemName}</td>
                    <td className="field-name">{formatFieldName(change.field)}</td>
                    <td className="old-value">{change.oldValue || '(empty)'}</td>
                    <td className="new-value">{change.newValue || '(empty)'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangeLogViewer;
