import React, { useState, useMemo } from 'react';
import './EditModal.css';

const EditModal = ({ theatre, onClose, onSave, onReset, practitionerList }) => { 
    
    // --- UPDATED: Sort and Format Practitioner List ---
    const sortedPractitioners = useMemo(() => {
        // 1. Create a copy and sort it by name
        const sortedByName = [...practitionerList].sort((a, b) => a.name.localeCompare(b.name));

        // 2. Map to a list of formatted strings for the datalist (e.g., "M Varghese (End Time: 17:30)")
        return sortedByName.map(p => ({
            ...p,
            formattedName: `${p.name} (End Time: ${p.endTime})`
        }));
    }, [practitionerList]);
    
    // 3. Convert formatted list to a Map for O(1) lookup efficiency 
    // Key: "M Varghese (End Time: 17:30)", Value: "17:30"
    const practitionerMap = useMemo(() => {
        return new Map(sortedPractitioners.map(p => [p.formattedName, p.endTime]));
    }, [sortedPractitioners]);

    // Initial state logic (unchanged)
    const [formData, setFormData] = useState({
        currentOdp: theatre.currentOdp || '',
        theatreEta: theatre.theatreEta || '17:30', 
        practitionerEndTime: theatre.practitionerEndTime || '17:30',
        nextPractitioner: theatre.nextPractitioner || '',
        isComplete: theatre.status === 'Complete' ? 'Yes' : 'No', 
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        let newFormData = { ...formData };

        if (name === 'currentOdp') {
            newFormData.currentOdp = value;

            // --- CORE LOGIC: Auto-set Practitioner End Time ---
            if (practitionerMap.has(value)) {
                // User selected a formatted name from the list
                newFormData.practitionerEndTime = practitionerMap.get(value);
                
                // IMPORTANT: Extract CLEAN name to save to state
                const cleanNameMatch = value.match(/(.*) \(End Time:.*\)/);
                newFormData.currentOdp = cleanNameMatch ? cleanNameMatch[1].trim() : value;

            } else if (value === '') {
                 // Input is cleared
                newFormData.practitionerEndTime = ''; 
                newFormData.currentOdp = '';
            } else {
                 // User typed a custom name, use the custom input
                 newFormData.currentOdp = value;
            }
        }
        
        // Update the form data state
        setFormData({
            ...newFormData,
            // Ensure currentOdp uses the logic above, others use standard change
            [name]: name === 'currentOdp' ? newFormData.currentOdp : (type === 'checkbox' ? (checked ? 'Yes' : 'No') : value),
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(theatre.name, formData);
    };

    const handleResetClick = () => {
        if (window.confirm(`Are you sure you want to clear the data for ${theatre.name}?`)) {
            onReset(theatre.name);
        }
    };
    
    // Function to handle how the name is displayed in the input field
    const getCurrentOdpDisplayValue = () => {
        // Find the formatted string for the saved clean name
        const match = sortedPractitioners.find(p => p.name === formData.currentOdp);
        // If found, display the formatted string, otherwise display the saved name (which is custom)
        return match ? match.formattedName : formData.currentOdp;
    };


    // --- JSX RENDER ---
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>Edit {theatre.name}</h2>
                <form onSubmit={handleSubmit}>

                    {/* --- Datalist: The source list for both inputs, sorted alphabetically with end time --- */}
                    <datalist id="practitioner-names">
                        {sortedPractitioners.map((p, index) => (
                            <option key={index} value={p.formattedName} />
                        ))}
                    </datalist>

                    <label>
                        Current ODP:
                        <input
                            type="text"
                            list="practitioner-names"
                            name="currentOdp"
                            placeholder="Type or select name..."
                            value={getCurrentOdpDisplayValue()} // Display the formatted name or the custom text
                            onChange={handleChange}
                        />
                    </label>

                    <label>
                        Theatre ETA: (e.g., 17:30)
                        <input
                            type="time"
                            name="theatreEta"
                            value={formData.theatreEta}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    
                    <label>
                        Practitioner End Time: (Auto-set on ODP selection)
                        <input
                            type="time"
                            name="practitionerEndTime"
                            value={formData.practitionerEndTime}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Next Practitioner (Relief):
                        <input
                            type="text"
                            list="practitioner-names"
                            name="nextPractitioner"
                            placeholder="Type or select relief name..."
                            value={formData.nextPractitioner} // nextPractitioner holds the clean name
                            onChange={handleChange}
                        />
                    </label>
                    
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            name="isComplete"
                            checked={formData.isComplete === 'Yes'}
                            onChange={handleChange}
                        />
                        Mark as Complete?
                    </label>

                    <div className="modal-actions">
                        <button type="button" onClick={handleResetClick} className="reset-btn">
                            Clear Display
                        </button>
                        <button type="button" onClick={onClose} className="cancel-btn">
                            Cancel
                        </button>
                        <button type="submit" className="save-btn">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditModal;