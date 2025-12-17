import React, { useState, useMemo, useEffect, useCallback } from 'react';
import TheatreTile from './TheatreTile.jsx';
import EditModal from './EditModal.jsx';
import PractitionerSidebar from './components/PractitionerSidebar.jsx';
import './TheatreDashboard.css';
import { useTheatreData } from './hooks/useTheatreData.js';
import { usePractitionerData } from './hooks/usePractitionerData.js';
import { useTheme, useHighlightSettings } from './hooks/useSettings.js';
import storageService from './services/storageService.js';

const TheatreDashboard = () => {
    // Use custom hooks for state management with Firebase sync
    const { theatres, setTheatres, updateTheatre } = useTheatreData();
    const { practitionerList, setPractitionerList, updatePractitioner } = usePractitionerData();
    const { theme, setTheme } = useTheme();
    const { highlightSettings, updateHighlightSetting } = useHighlightSettings();

    // Existing States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTheatre, setSelectedTheatre] = useState(null);
    const [isStaffPanelVisible, setIsStaffPanelVisible] = useState(false);
    const [showAll, setShowAll] = useState(true);
    const [activeTab, setActiveTab] = useState('17:30s');
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
    const [isHighlightPanelVisible, setIsHighlightPanelVisible] = useState(false);

    // Practitioner Sidebar States
    const [isPractitionerSidebarVisible, setIsPractitionerSidebarVisible] = useState(false);
    const [sidebarPosition, setSidebarPosition] = useState('right');

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
        }, 1000);

        // Cleanup interval on component unmount
        return () => clearInterval(timer);
    }, []);
    

    // --- DATA EXPORT/IMPORT LOGIC ---
    const handleDownload = async () => {
        try {
            const dashboardData = await storageService.exportAllData();
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
        } catch (error) {
            console.error("Error exporting data:", error);
            alert("Error downloading data. Please try again.");
        }
    };

    const handleDataUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonText = e.target.result;
                const uploadedData = JSON.parse(jsonText);

                if (uploadedData.theatres && uploadedData.practitionerList) {
                    // Ensure imported theatres have order field and are sorted
                    const theatresWithOrder = uploadedData.theatres.map((t, index) => ({
                        ...t,
                        order: t.order !== undefined ? t.order : index
                    })).sort((a, b) => a.order - b.order);

                    // Import to both Firebase and localStorage via storageService
                    await storageService.importAllData({
                        ...uploadedData,
                        theatres: theatresWithOrder
                    });

                    // Update local state to reflect imported data
                    setTheatres(theatresWithOrder);
                    setPractitionerList(uploadedData.practitionerList);

                    alert(`Successfully loaded ${theatresWithOrder.length} theatres and ${uploadedData.practitionerList.length} staff from backup file.`);
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
                        relieved: false,
                        supper: false
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
                case 'All Staff':
                    return true;
                default:
                    return true;
            }
        });
    };

    const filteredPractitioners = useMemo(() => {
        return getFilteredPractitioners(practitionerList, activeTab);
    }, [practitionerList, activeTab]);
    // -----------------------------------------


    // --- Checkbox Handler for Staff Status ---
    const handleCheckboxChange = (practitionerName, checkboxType) => {
        setPractitionerList(prevList =>
            prevList.map(p =>
                p.name === practitionerName
                    ? { ...p, [checkboxType]: !p[checkboxType] }
                    : p
            )
        );
    };

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
            name: formData.name,
            currentOdp: formData.currentOdp,
            theatreEta: formData.theatreEta,
            practitionerEndTime: formData.practitionerEndTime,
            nextPractitioner: formData.nextPractitioner,
            phoneExtension: formData.phoneExtension,
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

            // Reset all checkbox states
            setPractitionerList(prevList =>
                prevList.map(p => ({
                    ...p,
                    relieved: false,
                    supper: false
                }))
            );

            setShowAll(true);
        }
    };

    const handleHighlightToggle = (setting) => {
        updateHighlightSetting(setting);
    };

    // Compute allocated practitioners from theatres
    const allocatedPractitioners = useMemo(() => {
        const allocated = new Set();
        theatres.forEach(theatre => {
            if (theatre.currentOdp) {
                allocated.add(theatre.currentOdp);
            }
        });
        return allocated;
    }, [theatres]);

    // Handle practitioner drop (allocation and reassignment)
    const handlePractitionerDrop = useCallback((targetTheatreName, practitionerName, practitionerEndTime, sourceTheatreName = null) => {
        // If reassigning from another tile, clear the source first
        if (sourceTheatreName) {
            updateTheatre(sourceTheatreName, {
                currentOdp: '',
                practitionerEndTime: '',
                status: 'Not Running'
            });
        }

        // Allocate to target
        updateTheatre(targetTheatreName, {
            currentOdp: practitionerName,
            practitionerEndTime: practitionerEndTime,
            status: 'Running'
        });
    }, [updateTheatre]);

    // Handle practitioner deallocation
    const handlePractitionerDeallocate = useCallback((theatreName) => {
        updateTheatre(theatreName, {
            currentOdp: '',
            practitionerEndTime: '',
            status: 'Not Running'
        });
    }, [updateTheatre]);

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
                    <h1>ODP Dashboard</h1>
                    <div className="time-display">{currentTime}</div>
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

                    <button
                        className="practitioner-sidebar-toggle-btn"
                        onClick={() => setIsPractitionerSidebarVisible(!isPractitionerSidebarVisible)}
                    >
                        {isPractitionerSidebarVisible ? 'Hide Practitioner Sidebar' : 'Show Practitioner Sidebar'}
                    </button>
                </div>
            </div>

            <div className="theatre-grid-full-width">
                <div className="theatre-rows-wrapper">
                    <div className="theatre-row">{group1.map(t => <TheatreTile key={t.name} {...t} handleTileClick={handleTileClick} handleStatusToggle={handleStatusToggle} highlightSettings={highlightSettings} onPractitionerDrop={handlePractitionerDrop} />)}</div>
                    <div className="theatre-row">{group2.map(t => <TheatreTile key={t.name} {...t} handleTileClick={handleTileClick} handleStatusToggle={handleStatusToggle} highlightSettings={highlightSettings} onPractitionerDrop={handlePractitionerDrop} />)}</div>
                    <div className="theatre-row">{group3.map(t => <TheatreTile key={t.name} {...t} handleTileClick={handleTileClick} handleStatusToggle={handleStatusToggle} highlightSettings={highlightSettings} onPractitionerDrop={handlePractitionerDrop} />)}</div>
                    <div className="theatre-row specialized-row">{group4_Specialized.map(t => <TheatreTile key={t.name} {...t} handleTileClick={handleTileClick} handleStatusToggle={handleStatusToggle} highlightSettings={highlightSettings} onPractitionerDrop={handlePractitionerDrop} />)}</div>
                </div>

                {/* Highlight Settings Toggle Button - Bottom Right Corner */}
                <button
                    className="highlight-panel-toggle"
                    onClick={() => setIsHighlightPanelVisible(!isHighlightPanelVisible)}
                >
                    {isHighlightPanelVisible ? 'Close Highlights' : 'Highlight Settings'}
                </button>

                {/* Highlight Settings Panel */}
                {isHighlightPanelVisible && (
                    <div className="highlight-settings-panel">
                        <h3>Highlight Settings</h3>
                        <label className="highlight-option">
                            <input
                                type="checkbox"
                                checked={highlightSettings.highlightEarlies}
                                onChange={() => handleHighlightToggle('highlightEarlies')}
                            />
                            Highlight Earlies? (≤16:01)
                        </label>
                        <label className="highlight-option">
                            <input
                                type="checkbox"
                                checked={highlightSettings.highlight1730s}
                                onChange={() => handleHighlightToggle('highlight1730s')}
                            />
                            Highlight 17:30s?
                        </label>
                        <label className="highlight-option">
                            <input
                                type="checkbox"
                                checked={highlightSettings.highlight1830s}
                                onChange={() => handleHighlightToggle('highlight1830s')}
                            />
                            Highlight 18:30s?
                        </label>
                        <label className="highlight-option">
                            <input
                                type="checkbox"
                                checked={highlightSettings.highlightLates}
                                onChange={() => handleHighlightToggle('highlightLates')}
                            />
                            Highlight Lates? (20:00)
                        </label>
                    </div>
                )}

                
                {isStaffPanelVisible && (
                    <div className="staff-overview-popup">
                        <h2>Staffing Overview ({practitionerList.length} Total Staff)</h2>
                        
                        <div className="tab-navigation">
                            {['Earlies', '17:30s', '18:30s', 'Lates', 'Nights', 'All Staff'].map(tab => (
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
                                    {filteredPractitioners.map((p, index) => {
                                        // Determine checkbox visibility based on tab
                                        const endTime = p.endTime.replace(':', '');
                                        const endNumeric = parseInt(endTime, 10);
                                        const isEarly = endNumeric >= 900 && endNumeric <= 1701;
                                        const is1730 = endTime === '1730';
                                        const isLate = endTime === '2000';

                                        const showRelievedCheckbox =
                                            activeTab === 'Earlies' || activeTab === '17:30s' ||
                                            (activeTab === 'All Staff' && (isEarly || is1730));
                                        const showSupperCheckbox =
                                            activeTab === 'Lates' ||
                                            (activeTab === 'All Staff' && isLate);

                                        // Apply strikethrough if either relieved or supper is checked
                                        const shouldStrikethrough =
                                            (p.relieved && showRelievedCheckbox) ||
                                            (p.supper && showSupperCheckbox);

                                        return (
                                            <li key={index} className="practitioner-item">
                                                <div className="practitioner-info">
                                                    <span className={shouldStrikethrough ? 'relieved-name' : ''}>
                                                        {p.name} (End Time: {p.endTime})
                                                    </span>
                                                </div>

                                                {showRelievedCheckbox && (
                                                    <label className="checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={p.relieved || false}
                                                            onChange={() => handleCheckboxChange(p.name, 'relieved')}
                                                        />
                                                        Relieved?
                                                    </label>
                                                )}

                                                {showSupperCheckbox && (
                                                    <label className="checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={p.supper || false}
                                                            onChange={() => handleCheckboxChange(p.name, 'supper')}
                                                        />
                                                        Supper?
                                                    </label>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p>No staff loaded for this time category, or please upload a CSV roster.</p>
                            )}
                        </div>

                        <button onClick={() => setIsStaffPanelVisible(false)}>Close</button>
                    </div>
                )}

                {/* Practitioner Sidebar */}
                {isPractitionerSidebarVisible && (
                    <PractitionerSidebar
                        practitionerList={practitionerList}
                        allocatedPractitioners={allocatedPractitioners}
                        isVisible={isPractitionerSidebarVisible}
                        position={sidebarPosition}
                        onTogglePosition={() => setSidebarPosition(prev => prev === 'left' ? 'right' : 'left')}
                        onClose={() => setIsPractitionerSidebarVisible(false)}
                        onPractitionerDeallocate={handlePractitionerDeallocate}
                    />
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
