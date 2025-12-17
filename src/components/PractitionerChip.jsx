import React, { useState } from 'react';
import './PractitionerChip.css';

const PractitionerChip = ({ practitioner, isAllocated }) => {
  const [isDragging, setIsDragging] = useState(false);

  // Determine color class based on end time
  const getTimeColorClass = (endTime) => {
    const timeNumeric = parseInt(endTime.replace(':', ''), 10);

    if (timeNumeric <= 1601) {
      return 'time-earlies'; // Earlies (≤16:01)
    } else if (timeNumeric >= 1602 && timeNumeric <= 1759) {
      return 'time-1730s'; // 17:30s (16:02-17:59)
    } else if (timeNumeric === 1830) {
      return 'time-1830s'; // 18:30s
    } else if (timeNumeric === 2000) {
      return 'time-lates'; // Lates (20:00)
    }
    return ''; // Default/no color
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'PRACTITIONER',
      practitionerName: practitioner.name,
      practitionerEndTime: practitioner.endTime
    }));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const timeColorClass = getTimeColorClass(practitioner.endTime);

  return (
    <div
      className={`practitioner-chip ${timeColorClass} ${isDragging ? 'dragging' : ''} ${isAllocated ? 'allocated' : ''}`}
      draggable={!isAllocated}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="chip-name">{practitioner.name}</div>
      <div className="chip-end-time">End Time: {practitioner.endTime}</div>
      {isAllocated && <div className="chip-allocated-indicator">(Allocated)</div>}
    </div>
  );
};

export default PractitionerChip;
