import React, { useState, useMemo, useEffect } from 'react';
import TheatreTile from './TheatreTile.jsx'; 
import EditModal from './EditModal.jsx'; 
import './TheatreDashboard.css';

// --- INITIAL DATA DEFINITIONS (UNCHANGED) ---
const initialTheatreData = [
    { name: 'Theatre E1', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E2', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E3', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E4', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E5', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E6', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E7', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E8', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E9', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E10', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E11', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E12', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'CEPOD 2 E13', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'CEPOD E14', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E15', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E16', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Trauma 1 / E17', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Trauma 2 / E18', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E19', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E20', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E21', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre E22', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre D1', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre D2', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre D3', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre D4', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre D5', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre D6', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Theatre D7', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Maternity Emergency', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Maternity Elective', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Endoscopy', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'IR', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'MRI', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Cardiology', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Spare', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
    { name: 'Spare 2', currentOdp: '', theatreEta: '', practitionerEndTime: '', nextPractitioner: '', status: 'Not Running'},
];

const defaultPractitioners = [
    { name: 'M Varghese', endTime: '17:30' },
    { name: 'K Bevis', endTime: '18:00' },
];

// --- HELPER FUNCTION FOR LOCAL STORAGE (RESTORED) ---
const getInitialState = (key, defaultData) => {
    try {
        const storedData = localStorage.getItem(key);
        if (storedData) {
            return JSON.parse(storedData);
        }
    } catch (error) {
        console.error("Error loading state from localStorage:", error);
    }
    return defaultData;
};

// ----------------------------------------------


const TheatreDashboard = () => {
    // Load state from localStorage on startup (RESTORED)
    const [theatres, setTheatres] = useState(() => getInitialState('theatreData', initialTheatreData));
    const [practitionerList, setPractitionerList] = useState(() => getInitialState('practitionerListData', defaultPractitioners));
    const [theme, setTheme] = useState(() => getInitialState('theme', 'dark'));

    // Existing States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTheatre, setSelectedTheatre] = useState(null);
    const [isStaffPanelVisible, setIsStaffPanelVisible] = useState(false);
    const [showAll, setShowAll] = useState(true);
    const [activeTab, setActiveTab] = useState('17:30s'); 

    // useEffect to save data on state change (RESTORED)
    useEffect(() => {
        try {
            localStorage.setItem('theatreData', JSON.stringify(theatres));
        } catch (error) {
            console.error("Error saving theatre data to localStorage:", error);
        }
    }, [theatres]);

    useEffect(() => {
        try {
            localStorage.setItem('practitionerListData', JSON.stringify(practitionerList));
        } catch (error) {
            console.error("Error saving practitioner list to localStorage:", error);
        }
    }, [practitionerList]);

    useEffect(() => {
        try {
            localStorage.setItem('theme', JSON.stringify(theme));
            // Apply theme to body element
            document.body.className = theme === 'light' ? 'light-theme' : 'dark-theme';
        } catch (error) {
            console.error("Error saving theme to localStorage:", error);
        }
    }, [theme]);
    

    // --- DATA EXPORT/IMPORT LOGIC (RESTORED) ---
    const handleDownload = () => {
        const dashboardData = {
            theatres: theatres,
            practitionerList: practitionerList,
        };
        const jsonString = JSON.stringify(dashboardData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const filename = `theatre_dashboard_backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("Dashboard data downloaded successfully! Filename: " + filename);
    };

    const handleDataUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonText = e.target.result;
                const uploadedData = JSON.parse(jsonText);

                if (uploadedData.theatres && uploadedData.practitionerList) {
                    setTheatres(uploadedData.theatres);
                    setPractitionerList(uploadedData.practitionerList);
                    alert(`Successfully loaded ${uploadedData.theatres.length} theatres and ${uploadedData.practitionerList.length} staff from backup file.`);
                } else {
                    alert("Backup file format invalid. Missing 'theatres' or 'practitionerList' keys.");
                }
            } catch (error) {
                console.error("Error reading or parsing backup file:", error);
                alert("Error loading data. Please ensure the file is a valid JSON backup.");
            }
            event.target.value = null; 
        };
        reader.readAsText(file);
    };
    // -----------------------------------------


    // --- CSV Parsing and File Upload Logic (FROM USER UPLOAD) ---
    const parseCSV = (csvText) => {
        const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length < 9) {
            alert("CSV appears too short. Please ensure you are uploading the full Roster file.");
            return [];
        }

        const DATA_START_INDEX = 8;
        const FORENAMES_INDEX = 4;
        const SURNAME_INDEX = 5;
        const END_TIME_INDEX = 16; 
        
        const dataRows = lines.slice(DATA_START_INDEX); 
        
        const newPractitioners = dataRows.map(line => {
            const columns = line.split(','); 
            
            if (columns.length >= END_TIME_INDEX + 1) { 
                
                const forenames = columns[FORENAMES_INDEX].trim();
                const surname = columns[SURNAME_INDEX].trim();
                const endTime = columns[END_TIME_INDEX].trim();

                if (forenames && surname && endTime) {
                    return {
                        name: `${forenames} ${surname}`,
                        endTime: endTime,
                    };
                }
            }
            return null;
        }).filter(p => p !== null); 

        if (newPractitioners.length === 0) {
             alert("Successfully read file, but extracted 0 valid staff entries. Check if column headers have shifted.");
        } else {
             console.log(`Parsed ${newPractitioners.length} Practitioners.`);
        }
        return newPractitioners;
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target.result;
                const newPractitioners = parseCSV(csvText);

                if (newPractitioners.length > 0) {
                    setPractitionerList(newPractitioners); 
                    alert(`Successfully imported ${newPractitioners.length} practitioners from the roster.`);
                } else if (!newPractitioners.length) {
                    // Alert handled inside parseCSV if 0 valid entries are found
                } else {
                    alert("An error occurred during file parsing or no valid data was found.");
                }
            } catch (error) {
                console.error("Error reading file:", error);
                alert("An error occurred during file processing.");
            }
            event.target.value = null; 
        };
        reader.readAsText(file);
    };
    // ----------------------------------------------------

    // --- Practitioner Filtering Logic (RESTORED) ---
    const getFilteredPractitioners = (list, tab) => {
        return list.filter(p => {
            const endTime = p.endTime.replace(':', ''); 
            const endNumeric = parseInt(endTime, 10);

            switch (tab) {
                case 'Earlies':
                    return endNumeric >= 900 && endNumeric <= 1700;
                case '17:30s':
                    return endTime === '1730';
                case '18:30s':
                    return endTime === '1830';
                case 'Lates':
                    return endTime === '2000';
                case 'Nights':
                    return endTime === '0800'; 
                default:
                    return true;
            }
        });
    };

    const filteredPractitioners = useMemo(() => {
        return getFilteredPractitioners(practitionerList, activeTab);
    }, [practitionerList, activeTab]);
    // -----------------------------------------


    // --- Other Handlers (UNCHANGED) ---
    const handleStatusToggle = (name, newStatus) => {
        setTheatres(prevTheatres => prevTheatres.map(t => 
            t.name === name 
                ? { ...t, status: newStatus }
                : t
        ));
    };

    const handleTileClick = (theatreName) => {
        const theatreToEdit = theatres.find(t => t.name === theatreName);
        setSelectedTheatre(theatreToEdit);
        setIsModalOpen(true);
    };

    const handleSave = (name, formData) => {
        const updatedData = {
            currentOdp: formData.currentOdp,
            theatreEta: formData.theatreEta,
            practitionerEndTime: formData.practitionerEndTime,
            nextPractitioner: formData.nextPractitioner,
            status: formData.isComplete === 'Yes' ? 'Complete' : 'Running', 
        };

        setTheatres(prevTheatres => prevTheatres.map(t => 
            t.name === name
                ? { ...t, ...updatedData }
                : t
        ));
        setIsModalOpen(false); 
        setSelectedTheatre(null);
    };

    const handleReset = (name) => {
        setTheatres(prevTheatres => prevTheatres.map(t => 
            t.name === name
                ? { 
                    ...t, 
                    currentOdp: '', 
                    theatreEta: '', 
                    practitionerEndTime: '', 
                    nextPractitioner: '',
                    status: 'Not Running'
                  }
                : t
        ));
        setIsModalOpen(false); 
        setSelectedTheatre(null);
    };

    const handleClearAll = () => {
        if (window.confirm("Are you sure you want to clear ALL tiles back to the unallocated state? This cannot be undone.")) {
            setTheatres(prevTheatres => prevTheatres.map(t => ({
                ...t,
                currentOdp: '',
                theatreEta: '', 
                practitionerEndTime: '', 
                nextPractitioner: '',
                status: 'Not Running',
            })));
            setShowAll(true); 
        }
    };
    
    // Updated filter logic: Show only Running when filter is active
    const filteredTheatres = useMemo(() => {
        if (showAll) {
            return theatres;
        }
        return theatres.filter(t => t.status === 'Running'); 
    }, [theatres, showAll]);

    const group1 = filteredTheatres.slice(0, 11); 
    const group2 = filteredTheatres.slice(11, 22);
    const group3 = filteredTheatres.slice(22, 29);
    const group4_Specialized = filteredTheatres.slice(29); 
    
    const getCurrentTime = () => {
        return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    return (
        <div className="dashboard-container">
            <div className="main-header">
                {/* --- Data Control Group (Left Side) --- */}
                <div className="data-control-group-left">
                    <div className="csv-upload-container">
                        <label htmlFor="csv-upload" className="upload-label">
                            Upload Staff CSV ⬆️
                        </label>
                        <input
                            type="file"
                            id="csv-upload"
                            accept=".csv"
                            onChange={handleFileUpload}
                        />
                    </div>

                    <button
                        className="download-data-btn"
                        onClick={handleDownload}
                    >
                        Download State ↓
                    </button>

                    <div className="upload-data-container">
                        <label htmlFor="data-upload" className="upload-data-label">
                            Upload State ↑
                        </label>
                        <input
                            type="file"
                            id="data-upload"
                            accept=".json"
                            onChange={handleDataUpload}
                        />
                    </div>
                </div>

                {/* --- Center: Title and Time --- */}
                <div className="header-content">
                    <h1>ODP Coordination Dashboard</h1>
                    <div className="time-display">{getCurrentTime()}</div>
                </div>

                {/* --- Action Buttons (Right Side) --- */}
                <div className="button-group-right">
                    <button
                        className="theme-toggle-btn"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    >
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>

                    <button
                        className="clear-all-btn"
                        onClick={handleClearAll}
                    >
                        Clear ALL Tiles
                    </button>

                    <button
                        className="filter-toggle-btn"
                        onClick={() => setShowAll(!showAll)}
                    >
                        {showAll ? 'Show Only Running' : 'Show All Theatres'}
                    </button>

                    <button
                        className="staff-panel-toggle-btn"
                        onClick={() => setIsStaffPanelVisible(!isStaffPanelVisible)}
                    >
                        {isStaffPanelVisible ? 'Hide Staff Overview' : 'Show Staff Overview'}
                    </button>
                </div>
            </div>

            <div className="theatre-grid-full-width"> 
                <div className="theatre-rows-wrapper">
                    <div className="theatre-row">{group1.map(t => <TheatreTile key={t.name} {...t} handleTileClick={handleTileClick} handleStatusToggle={handleStatusToggle} />)}</div>
                    <div className="theatre-row">{group2.map(t => <TheatreTile key={t.name} {...t} handleTileClick={handleTileClick} handleStatusToggle={handleStatusToggle} />)}</div>
                    <div className="theatre-row">{group3.map(t => <TheatreTile key={t.name} {...t} handleTileClick={handleTileClick} handleStatusToggle={handleStatusToggle} />)}</div>
                    <div className="theatre-row specialized-row">{group4_Specialized.map(t => <TheatreTile key={t.name} {...t} handleTileClick={handleTileClick} handleStatusToggle={handleStatusToggle} />)}</div>
                </div>
                
                {isStaffPanelVisible && (
                    <div className="staff-overview-popup">
                        <h2>Staffing Overview ({practitionerList.length} Total Staff)</h2>
                        
                        <div className="tab-navigation">
                            {['Earlies', '17:30s', '18:30s', 'Lates', 'Nights'].map(tab => (
                                <button
                                    key={tab}
                                    className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab} ({getFilteredPractitioners(practitionerList, tab).length})
                                </button>
                            ))}
                        </div>
                        
                        <p className="tab-info">Showing staff with end time: {activeTab} ({filteredPractitioners.length} staff)</p>

                        <div className="practitioner-list">
                            {filteredPractitioners.length > 0 ? (
                                <ul>
                                    {filteredPractitioners.map((p, index) => (
                                        <li key={index}>
                                            {p.name} (End Time: {p.endTime})
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No staff loaded for this time category, or please upload a CSV roster.</p>
                            )}
                        </div>

                        <button onClick={() => setIsStaffPanelVisible(false)}>Close</button>
                    </div>
                )}
            </div>

            {isModalOpen && selectedTheatre && (
                <EditModal 
                    theatre={selectedTheatre}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    onReset={handleReset} 
                    practitionerList={practitionerList} 
                />
            )}
        </div>
    );
};

export default TheatreDashboard;
