import React, { useState } from 'react';
import './TheatreTile.css';

// --- CORE COLOR LOGIC (Uses theatreEta and new status) ---
const getTileColor = (theatreEta, status, currentOdp) => {
    if (!currentOdp) return 'neutral';
    if (status === 'Complete') return 'complete';
    if (status === 'Not Running') return 'neutral'; // Neutral/grey for not running

    // If running, proceed with risk assessment using theatreEta
    if (!theatreEta) return 'neutral'; 

    const etaNumeric = parseInt(theatreEta.replace(':', ''), 10);

    if (etaNumeric > 1830) return 'high-risk-red'; 
    if (etaNumeric > 1801 && etaNumeric <= 1830) return 'mid-risk-orange'; 
    
    return 'on-time-green'; 
};

// --- Helper to determine button text and next status ---
const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
        case 'Running':
            return 'Complete'; // Cycle from Running to Complete
        case 'Complete':
            return 'Not Running'; // Cycle from Complete to Not Running
        case 'Not Running':
        case 'No': // Default initial state will be 'No' from old data or 'Not Running' from new reset.
        default:
            return 'Running'; // Cycle from Not Running/Default to Running
    }
};

const TheatreTile = ({ name, currentOdp, theatreEta, practitionerEndTime, nextPractitioner, phoneExtension, status, handleTileClick, handleStatusToggle, highlightSettings, onPractitionerDrop, lunchStatus }) => {

    // Drag-over state for drop target visual feedback
    const [isDragOver, setIsDragOver] = useState(false);

    // Status is now used for both color and toggle logic
    const tileStatusClass = getTileColor(theatreEta, status, currentOdp);

    // Determine lunch request highlight classes
    const lunchHighlightClass = () => {
        if (!lunchStatus || !highlightSettings) return '';

        if (highlightSettings.highlightPendingLunch && lunchStatus.hasPendingLunch) {
            return 'lunch-pending';
        }
        if (highlightSettings.highlightFulfilledLunch && lunchStatus.hasFulfilledLunch) {
            return 'lunch-fulfilled';
        }
        return '';
    };

    // Determine practitioner time highlight class based on settings
    const getPractitionerTimeClass = (endTime) => {
        // Don't highlight if status is "Not Running" or "Complete"
        if (status === 'Not Running' || status === 'Complete') return '';

        if (!endTime || !highlightSettings) return '';
        const timeNumeric = parseInt(endTime.replace(':', ''), 10);

        // Check each time category and whether it should be highlighted
        if (timeNumeric <= 1601 && highlightSettings.highlightEarlies) {
            return 'early-finish'; // Finishing at or before 16:01
        } else if (timeNumeric >= 1602 && timeNumeric <= 1759 && highlightSettings.highlight1730s) {
            return 'mid-finish'; // 17:30s (16:02-17:59)
        } else if (timeNumeric === 1830 && highlightSettings.highlight1830s) {
            return 'late-1830-finish'; // 18:30
        } else if (timeNumeric === 2000 && highlightSettings.highlightLates) {
            return 'late-2000-finish'; // 20:00 (Lates)
        }
        return ''; // No highlight
    };

    // Determine button text
    let buttonText;
    switch (status) {
        case 'Complete':
            buttonText = 'Complete!';
            break;
        case 'Running':
            buttonText = 'Running';
            break;
        case 'Not Running':
            buttonText = 'Not Running';
            break;
        default:
            buttonText = 'Set Status';
    }

    // Drag and drop handlers for tile as drop target
    const handleDragOver = (e) => {
        e.preventDefault(); // Required to allow drop
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));

            if (data.type === 'PRACTITIONER') {
                // Practitioner dragged from sidebar
                onPractitionerDrop(name, data.practitionerName, data.practitionerEndTime);
            } else if (data.type === 'TILE_DEALLOCATION') {
                // Practitioner dragged from another tile (reassignment)
                onPractitionerDrop(name, data.practitionerName, data.practitionerEndTime, data.sourceTile);
            }
        } catch (error) {
            console.error('Error parsing drop data:', error);
        }
    };

    // Drag handler for current ODP (make it draggable for deallocation/reassignment)
    const handleOdpDragStart = (e) => {
        e.stopPropagation(); // Prevent tile click
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'TILE_DEALLOCATION',
            sourceTile: name,
            practitionerName: currentOdp,
            practitionerEndTime: practitionerEndTime
        }));
    };

    return (
        <div
            className={`theatre-tile ${tileStatusClass} ${isDragOver ? 'drag-over' : ''} ${lunchHighlightClass()}`}
            onClick={() => handleTileClick(name)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="header">
                <span className="theatre-name">{name}</span>
                {theatreEta && <span className="eta">ETA: {theatreEta}</span>}
            </div>

            <div className="content">
                {currentOdp ? (
                    <>
                        <p
                            className={`practitioner-info ${getPractitionerTimeClass(practitionerEndTime)}`}
                            draggable={currentOdp ? true : false}
                            onDragStart={handleOdpDragStart}
                            style={{ cursor: currentOdp ? 'move' : 'default' }}
                        >
                            {currentOdp} {practitionerEndTime}
                        </p>

                        {/* --- CHANGE HERE: Only display if nextPractitioner is present --- */}
                        {nextPractitioner && (
                            <p className="relief-info">
                                Relief: {nextPractitioner}
                            </p>
                        )}
                        {/* ----------------------------------------------------------------- */}
                    </>
                ) : (
                    <p className="unallocated-text">Click to Allocate</p>
                )}
            </div>

            <div className="footer">
                {/* Phone extension display on hover - bottom left */}
                {phoneExtension && (
                    <span className="phone-extension">
                        {phoneExtension}
                    </span>
                )}

                {/* Use onMouseDown to prevent the click from also triggering handleTileClick */}
                <button
                    className={`complete-toggle ${status === 'Running' ? 'running' : ''} ${status === 'Completed' ? 'completed' : ''} ${status === 'Not Running' ? 'not-running' : ''}`}
                    onMouseDown={(e) => e.stopPropagation()} // Stop click propagating to the tile wrapper
                    onClick={(e) => {
                        e.stopPropagation(); // Stop click propagating to the tile wrapper
                        handleStatusToggle(name, getNextStatus(status));
                    }}
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
};

export default TheatreTile;