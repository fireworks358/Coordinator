import React, { useState, useMemo } from 'react';
import PractitionerChip from './PractitionerChip.jsx';
import './PractitionerSidebar.css';

const PractitionerSidebar = ({
  practitionerList,
  allocatedPractitioners,
  isVisible,
  position,
  onTogglePosition,
  onClose,
  onPractitionerDeallocate
}) => {
  const [showAllPractitioners, setShowAllPractitioners] = useState(false);
  const [isSidebarDragOver, setIsSidebarDragOver] = useState(false);

  // Filter and sort practitioners
  const visiblePractitioners = useMemo(() => {
    // First, exclude night staff (0800 end time)
    let filtered = practitionerList.filter(p => {
      const endTime = p.endTime.replace(':', '');
      return endTime !== '0800';
    });

    // Then apply allocated/unallocated filter
    if (!showAllPractitioners) {
      filtered = filtered.filter(p => !allocatedPractitioners.has(p.name));
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [practitionerList, allocatedPractitioners, showAllPractitioners]);

  // Handle drag over sidebar (for deallocation)
  const handleSidebarDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsSidebarDragOver(true);
  };

  const handleSidebarDragLeave = (e) => {
    setIsSidebarDragOver(false);
  };

  // Handle drop on sidebar (for deallocation)
  const handleSidebarDrop = (e) => {
    e.preventDefault();
    setIsSidebarDragOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));

      if (data.type === 'TILE_DEALLOCATION') {
        // Deallocate practitioner from source tile
        onPractitionerDeallocate(data.sourceTile);
      }
    } catch (error) {
      console.error('Error parsing drop data:', error);
    }
  };

  return (
    <div
      className={`practitioner-sidebar ${position} ${!isVisible ? 'hidden' : ''} ${isSidebarDragOver ? 'drag-over' : ''}`}
      onDragOver={handleSidebarDragOver}
      onDragLeave={handleSidebarDragLeave}
      onDrop={handleSidebarDrop}
    >
      <div className="sidebar-header">
        <h2>Practitioners</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="sidebar-controls">
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={showAllPractitioners}
            onChange={() => setShowAllPractitioners(!showAllPractitioners)}
          />
          Show All Practitioners
        </label>

        <button className="position-toggle-btn" onClick={onTogglePosition}>
          Switch to {position === 'left' ? 'Right' : 'Left'}
        </button>
      </div>

      <div className="sidebar-content">
        <p className="practitioner-count">
          {visiblePractitioners.length} practitioner{visiblePractitioners.length !== 1 ? 's' : ''}
          {!showAllPractitioners && ' (unallocated)'}
        </p>

        <div className="practitioner-chips">
          {visiblePractitioners.length > 0 ? (
            visiblePractitioners.map((practitioner, index) => (
              <PractitionerChip
                key={index}
                practitioner={practitioner}
                isAllocated={allocatedPractitioners.has(practitioner.name)}
              />
            ))
          ) : (
            <p className="empty-state">
              {showAllPractitioners
                ? 'No practitioners in the list. Upload a CSV roster to add practitioners.'
                : 'All practitioners are currently allocated.'}
            </p>
          )}
        </div>
      </div>

      {isSidebarDragOver && (
        <div className="drop-indicator">
          Drop here to deallocate
        </div>
      )}
    </div>
  );
};

export default PractitionerSidebar;
