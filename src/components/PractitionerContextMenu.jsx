import React, { useEffect, useRef } from 'react';
import './PractitionerContextMenu.css';

const PractitionerContextMenu = ({
  practitioner,
  position,
  onToggleSick,
  onClose
}) => {
  const menuRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Prevent menu from going off-screen
  const getAdjustedPosition = () => {
    const menuWidth = 200;
    const menuHeight = 60;

    let { x, y } = position;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }

    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    return { x, y };
  };

  const adjustedPos = getAdjustedPosition();

  return (
    <div
      ref={menuRef}
      className="practitioner-context-menu"
      style={{
        position: 'fixed',
        left: `${adjustedPos.x}px`,
        top: `${adjustedPos.y}px`,
      }}
    >
      <button
        className="context-menu-item"
        onClick={() => {
          onToggleSick(practitioner.name);
          onClose();
        }}
      >
        {practitioner.sick ? 'Mark as Not Sick' : 'Mark as Sick'}
      </button>
    </div>
  );
};

export default PractitionerContextMenu;
