import React from 'react';
import './PractitionerDropModal.css';

const PractitionerDropModal = ({
    isOpen,
    theatreName,
    currentPractitioner,
    newPractitioner,
    onReplace,
    onSecondPractitioner,
    onRelief,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="drop-modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Assign Practitioner to {theatreName}</h2>
                <p className="modal-message">
                    <strong>{theatreName}</strong> already has <strong>{currentPractitioner}</strong> assigned.
                </p>
                <p className="modal-question">
                    How would you like to assign <strong>{newPractitioner}</strong>?
                </p>

                <div className="modal-buttons">
                    <button
                        className="modal-btn replace-btn"
                        onClick={onReplace}
                    >
                        Replace
                    </button>
                    <button
                        className="modal-btn second-btn"
                        onClick={onSecondPractitioner}
                    >
                        As Second Practitioner
                    </button>
                    <button
                        className="modal-btn relief-btn"
                        onClick={onRelief}
                    >
                        As Relief
                    </button>
                    <button
                        className="modal-btn cancel-btn"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PractitionerDropModal;
