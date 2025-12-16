import React from 'react';
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
        case 'Complete':
            return 'Running'; // Cycle from Complete to Running
        case 'Running':
            return 'Not Running'; // Cycle from Running to Not Running
        case 'Not Running':
        case 'No': // Default initial state will be 'No' from old data or 'Not Running' from new reset.
        default:
            return 'Complete'; // Cycle from Not Running/Default to Complete
    }
};

const TheatreTile = ({ name, currentOdp, theatreEta, practitionerEndTime, nextPractitioner, phoneExtension, status, handleTileClick, handleStatusToggle }) => {

    // Status is now used for both color and toggle logic
    const tileStatusClass = getTileColor(theatreEta, status, currentOdp);

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

    return (
        <div
            className={`theatre-tile ${tileStatusClass}`}
            // Allow tile click to open modal, but prevent if practitioner is empty
            onClick={() => handleTileClick(name)}
        >
            <div className="header">
                <span className="theatre-name">{name}</span>
                {theatreEta && <span className="eta">ETA: {theatreEta}</span>}
            </div>

            <div className="content">
                {currentOdp ? (
                    <>
                        <p className="practitioner-info">
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