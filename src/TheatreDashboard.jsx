import React, { useState, useMemo, useEffect, useCallback } from 'react';
import TheatreTile from './TheatreTile.jsx';
import EditModal from './EditModal.jsx';
import PractitionerSidebar from './components/PractitionerSidebar.jsx';
import PractitionerDropModal from './components/PractitionerDropModal.jsx';
import './TheatreDashboard.css';
import { useTheatreData } from './hooks/useTheatreData.js';
import { usePractitionerData } from './hooks/usePractitionerData.js';
import { useTheme, useHighlightSettings } from './hooks/useSettings.js';
import { useLunchRequests } from './hooks/useLunchRequests.js';
import { useRosterDate } from './hooks/useRosterDate.js';
import storageService from './services/storageService.js';
import * as XLSX from 'xlsx';
import { getCurrentDayOfWeek, formatRosterDate } from './utils/dateUtils.js';

const TheatreDashboard = () => {
    // Day selection state
    const [selectedDay, setSelectedDay] = useState(getCurrentDayOfWeek());

    // Use custom hooks for state management with Firebase sync
    const { theatres, setTheatres, updateTheatre } = useTheatreData(selectedDay);
    const { practitionerList, setPractitionerList, updatePractitioner } = usePractitionerData(selectedDay);
    const { rosterDate, setRosterDate } = useRosterDate(selectedDay);
    const { theme, setTheme } = useTheme();
    const { highlightSettings, updateHighlightSetting } = useHighlightSettings();
    const { requests } = useLunchRequests();

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

    // Day selector dropdown state
    const [isDayDropdownVisible, setIsDayDropdownVisible] = useState(false);

    // Data controls dropdown state
    const [isDataDropdownVisible, setIsDataDropdownVisible] = useState(false);

    // Practitioner drop modal state
    const [dropModalState, setDropModalState] = useState({
        isOpen: false,
        targetTheatreName: null,
        currentPractitioner: null,
        newPractitionerName: null,
        newPractitionerEndTime: null,
        sourceTheatreName: null
    });

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
        }, 1000);

        // Cleanup interval on component unmount
        return () => clearInterval(timer);
    }, []);

    // Load saved selected day on mount
    useEffect(() => {
        const loadSelectedDay = async () => {
            const savedDay = await storageService.getSelectedDay();
            setSelectedDay(savedDay || getCurrentDayOfWeek());
        };
        loadSelectedDay();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isDayDropdownVisible && !event.target.closest('.day-selector-dropdown')) {
                setIsDayDropdownVisible(false);
            }
            if (isDataDropdownVisible && !event.target.closest('.data-controls-dropdown')) {
                setIsDataDropdownVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDayDropdownVisible, isDataDropdownVisible]);

    // Day change handler
    const handleDayChange = async (newDay) => {
        if (newDay === selectedDay) return;

        console.log(`[TheatreDashboard] Switching from ${selectedDay} to ${newDay}`);

        // Close modal if open
        if (isModalOpen) {
            const confirm = window.confirm(
                'You have an unsaved edit open. Switching days will discard changes. Continue?'
            );
            if (!confirm) return;
            setIsModalOpen(false);
            setSelectedTheatre(null);
        }

        // Hooks auto-save current day and load new day
        await storageService.setSelectedDay(newDay);
        setSelectedDay(newDay);
        console.log(`[TheatreDashboard] selectedDay state updated to: ${newDay}`);
        setIsDayDropdownVisible(false); // Close dropdown after selection
    };

    // Get display name for selected day
    const getSelectedDayDisplay = () => {
        const dayMap = {
            'monday': 'Monday',
            'tuesday': 'Tuesday',
            'wednesday': 'Wednesday',
            'thursday': 'Thursday',
            'friday': 'Friday'
        };
        return dayMap[selectedDay] || 'Select Day';
    };


    // --- DATA EXPORT/IMPORT LOGIC ---
    const handleDownload = async () => {
        try {
            // Export only the currently viewed day
            const currentDayTheatres = await storageService.getTheatresForDay(selectedDay);
            const currentDayPractitioners = await storageService.getPractitionersForDay(selectedDay);
            const currentDayRosterDate = await storageService.getRosterDateForDay(selectedDay);
            const currentTheme = await storageService.getTheme();
            const currentHighlightSettings = await storageService.getHighlightSettings();

            const dashboardData = {
                selectedDay: selectedDay,
                theatres: currentDayTheatres,
                practitioners: currentDayPractitioners,
                rosterDate: currentDayRosterDate,
                theme: currentTheme,
                highlightSettings: currentHighlightSettings
            };

            const jsonString = JSON.stringify(dashboardData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            const filename = `theatre_dashboard_${selectedDay}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert(`Dashboard data for ${selectedDay} downloaded successfully! Filename: ${filename}`);
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

                // Handle new single-day format
                if (uploadedData.theatres && uploadedData.practitioners && uploadedData.selectedDay) {
                    // Ensure imported theatres have order field and are sorted
                    const theatresWithOrder = uploadedData.theatres.map((t, index) => ({
                        ...t,
                        order: t.order !== undefined ? t.order : index
                    })).sort((a, b) => a.order - b.order);

                    const dayToImport = uploadedData.selectedDay;

                    // Import to the specific day
                    await storageService.setTheatresForDay(dayToImport, theatresWithOrder);
                    await storageService.setPractitionersForDay(dayToImport, uploadedData.practitioners);

                    if (uploadedData.rosterDate) {
                        await storageService.setRosterDateForDay(dayToImport, uploadedData.rosterDate);
                    }

                    // Import settings if provided
                    if (uploadedData.theme) {
                        await storageService.setTheme(uploadedData.theme);
                    }
                    if (uploadedData.highlightSettings) {
                        await storageService.setHighlightSettings(uploadedData.highlightSettings);
                    }

                    // If importing to the current day, update local state
                    if (dayToImport === selectedDay) {
                        setTheatres(theatresWithOrder);
                        setPractitionerList(uploadedData.practitioners);
                        if (uploadedData.rosterDate) {
                            setRosterDate(uploadedData.rosterDate);
                        }
                    }

                    alert(`Successfully loaded ${theatresWithOrder.length} theatres and ${uploadedData.practitioners.length} staff for ${dayToImport}.`);
                }
                // Handle legacy format (old backup files with all days)
                else if (uploadedData.theatres && uploadedData.practitionerList) {
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

                    alert(`Successfully loaded ${theatresWithOrder.length} theatres and ${uploadedData.practitionerList.length} staff from legacy backup file.`);
                } else {
                    alert("Backup file format invalid. Expected format with 'theatres' and 'practitioners' (or 'practitionerList' for legacy files).");
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

        // ===== EXTRACT DATE FROM ROW 3, COLUMN 8 =====
        const DATE_ROW_INDEX = 3;
        const DATE_COLUMN_INDEX = 8;

        try {
            if (lines[DATE_ROW_INDEX]) {
                const dateRow = lines[DATE_ROW_INDEX].split(',');
                const dateValue = dateRow[DATE_COLUMN_INDEX]?.trim();
                console.log('Raw date value from CSV:', dateValue);

                if (dateValue && dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                    console.log('Extracted roster date:', dateValue);
                    setRosterDate(dateValue);
                } else {
                    console.warn('No valid date found at Row 3, Column 8 in CSV');
                }
            }
        } catch (dateError) {
            console.error('Error extracting date from CSV:', dateError);
        }
        // ============================================

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
                        supper: false,
                        sick: false
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

    const parseXLSX = (arrayBuffer) => {
        try {
            // Read workbook from array buffer
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            // Get first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert to array of arrays (preserves column indices)
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Validate minimum rows
            if (jsonData.length < 9) {
                alert("Excel file appears too short. Please ensure you are uploading the full Roster file.");
                return [];
            }

            // ===== EXTRACT DATE FROM ROW 3, COLUMN 8 =====
            const DATE_ROW_INDEX = 3;
            const DATE_COLUMN_INDEX = 8;

            try {
                const dateValue = jsonData[DATE_ROW_INDEX]?.[DATE_COLUMN_INDEX];
                console.log('Raw date value from Excel:', dateValue);

                if (dateValue) {
                    let extractedDate = null;

                    // Check if it's already a string in DD/MM/YYYY format
                    if (typeof dateValue === 'string' && dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                        extractedDate = dateValue;
                    }
                    // Check if it's an Excel date number
                    else if (typeof dateValue === 'number') {
                        // Excel dates are stored as days since 1900-01-01
                        const excelEpoch = new Date(1900, 0, 1);
                        const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        extractedDate = `${day}/${month}/${year}`;
                    }

                    if (extractedDate) {
                        console.log('Extracted roster date:', extractedDate);
                        setRosterDate(extractedDate);
                    } else {
                        console.warn('Could not parse date from Excel file');
                    }
                } else {
                    console.warn('No date value found at Row 3, Column 8');
                }
            } catch (dateError) {
                console.error('Error extracting date from Excel:', dateError);
            }
            // ============================================

            // Use same constants as parseCSV
            const DATA_START_INDEX = 8;
            const FORENAMES_INDEX = 4;
            const SURNAME_INDEX = 5;
            const END_TIME_INDEX = 16;

            // Extract data rows (skip first 8 header rows)
            const dataRows = jsonData.slice(DATA_START_INDEX);

            const newPractitioners = dataRows.map(row => {
                if (row.length >= END_TIME_INDEX + 1) {
                    // Handle undefined cells and convert to string
                    const forenames = (row[FORENAMES_INDEX] || '').toString().trim();
                    const surname = (row[SURNAME_INDEX] || '').toString().trim();
                    const endTime = (row[END_TIME_INDEX] || '').toString().trim();

                    if (forenames && surname && endTime) {
                        return {
                            name: `${forenames} ${surname}`,
                            endTime: endTime,
                            relieved: false,
                            supper: false,
                            sick: false
                        };
                    }
                }
                return null;
            }).filter(p => p !== null);

            if (newPractitioners.length === 0) {
                alert("Successfully read file, but extracted 0 valid staff entries. Check if column headers have shifted.");
            } else {
                console.log(`Parsed ${newPractitioners.length} Practitioners from Excel file.`);
            }

            return newPractitioners;

        } catch (error) {
            console.error("Error parsing Excel file:", error);
            alert("Error parsing Excel file. Please ensure it's a valid HealthRoster export.");
            return [];
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Determine file type by extension
        const fileExtension = file.name.split('.').pop().toLowerCase();

        const reader = new FileReader();

        if (fileExtension === 'csv') {
            // Handle CSV files (existing logic)
            reader.onload = (e) => {
                try {
                    const csvText = e.target.result;
                    const newPractitioners = parseCSV(csvText);

                    if (newPractitioners.length > 0) {
                        setPractitionerList(newPractitioners);
                        alert(`Successfully imported ${newPractitioners.length} practitioners for ${selectedDay.toUpperCase()}.`);
                    }
                } catch (error) {
                    console.error("Error reading CSV file:", error);
                    alert("An error occurred during CSV file processing.");
                }
                event.target.value = null;
            };
            reader.readAsText(file);

        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            // Handle Excel files (new logic)
            reader.onload = (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const newPractitioners = parseXLSX(arrayBuffer);

                    if (newPractitioners.length > 0) {
                        setPractitionerList(newPractitioners);
                        alert(`Successfully imported ${newPractitioners.length} practitioners for ${selectedDay.toUpperCase()}.`);
                    }
                } catch (error) {
                    console.error("Error reading Excel file:", error);
                    alert("An error occurred during Excel file processing.");
                }
                event.target.value = null;
            };
            reader.readAsArrayBuffer(file);

        } else {
            alert("Unsupported file type. Please upload a CSV or Excel (.xlsx/.xls) file.");
            event.target.value = null;
        }
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

    // --- Sick Status Handler ---
    const handleToggleSick = useCallback((practitionerName) => {
        const practitioner = practitionerList.find(p => p.name === practitionerName);
        if (!practitioner) return;

        const newSickStatus = !practitioner.sick;
        updatePractitioner(practitionerName, { sick: newSickStatus });
    }, [practitionerList, updatePractitioner]);

    // Helper function to check if a practitioner is sick
    const isPractitionerSick = useCallback((practitionerName) => {
        if (!practitionerName) return false;

        // Handle multi-practitioner names (with & separator)
        const names = practitionerName.split('&').map(name => name.trim());

        return names.some(name => {
            const practitioner = practitionerList.find(p => p.name === name);
            return practitioner && practitioner.sick;
        });
    }, [practitionerList]);

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
        if (window.confirm(
            `Are you sure you want to clear ALL tiles for ${selectedDay.toUpperCase()}? ` +
            `This will only affect ${selectedDay}'s allocations. This cannot be undone.`
        )) {
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

    const handleClearWholeWeek = async () => {
        if (window.confirm(
            'Are you sure you want to clear ALL tiles for THE ENTIRE WEEK (Monday-Friday)? ' +
            'This will reset all theatres and practitioners for all weekdays. ' +
            'This cannot be undone!'
        )) {
            const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

            // Get the initial theatres template from the first available day
            const templateTheatres = await storageService.getTheatresForDay('monday');

            // Create cleared theatre template
            const clearedTheatres = templateTheatres.map(t => ({
                ...t,
                currentOdp: '',
                theatreEta: '',
                practitionerEndTime: '',
                nextPractitioner: '',
                status: 'Not Running',
            }));

            // Clear all weekdays
            for (const day of weekdays) {
                await storageService.setTheatresForDay(day, clearedTheatres);
                await storageService.setPractitionersForDay(day, []);
            }

            // Refresh current day's view
            setTheatres(clearedTheatres);
            setPractitionerList([]);
            setShowAll(true);

            alert('Entire week (Monday-Friday) has been cleared successfully!');
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
        // Check if practitioner is sick
        const practitioner = practitionerList.find(p => p.name === practitionerName);
        if (practitioner && practitioner.sick) {
            alert(`Cannot allocate ${practitionerName} - practitioner is marked as sick.`);
            return;
        }

        // Find the target theatre to check its current status
        const targetTheatre = theatres.find(t => t.name === targetTheatreName);

        // Check if there's already a practitioner assigned
        if (targetTheatre && targetTheatre.currentOdp && targetTheatre.currentOdp.trim() !== '') {
            // Show modal for user to choose how to handle the second practitioner
            setDropModalState({
                isOpen: true,
                targetTheatreName,
                currentPractitioner: targetTheatre.currentOdp,
                newPractitionerName: practitionerName,
                newPractitionerEndTime: practitionerEndTime,
                sourceTheatreName
            });
            return;
        }

        // If no practitioner assigned, proceed with normal allocation
        // If reassigning from another tile, clear the source first
        if (sourceTheatreName) {
            updateTheatre(sourceTheatreName, {
                currentOdp: '',
                practitionerEndTime: '',
                status: 'Not Running'
            });
        }

        const wasNotRunning = targetTheatre && targetTheatre.status === 'Not Running';

        // Allocate to target, setting ETA to 17:30 if it was not running
        updateTheatre(targetTheatreName, {
            currentOdp: practitionerName,
            practitionerEndTime: practitionerEndTime,
            status: 'Running',
            ...(wasNotRunning && { theatreEta: '17:30' })
        });
    }, [updateTheatre, theatres, practitionerList]);

    // Handle modal option: Replace
    const handleDropReplace = useCallback(() => {
        const { targetTheatreName, newPractitionerName, newPractitionerEndTime, sourceTheatreName } = dropModalState;

        // Clear source theatre if reassigning
        if (sourceTheatreName) {
            updateTheatre(sourceTheatreName, {
                currentOdp: '',
                practitionerEndTime: '',
                status: 'Not Running'
            });
        }

        // Replace current practitioner with new one
        updateTheatre(targetTheatreName, {
            currentOdp: newPractitionerName,
            practitionerEndTime: newPractitionerEndTime,
            status: 'Running'
        });

        // Close modal
        setDropModalState({
            isOpen: false,
            targetTheatreName: null,
            currentPractitioner: null,
            newPractitionerName: null,
            newPractitionerEndTime: null,
            sourceTheatreName: null
        });
    }, [dropModalState, updateTheatre]);

    // Handle modal option: As Second Practitioner
    const handleDropSecondPractitioner = useCallback(() => {
        const { targetTheatreName, newPractitionerName, newPractitionerEndTime, sourceTheatreName } = dropModalState;
        const targetTheatre = theatres.find(t => t.name === targetTheatreName);

        // Clear source theatre if reassigning
        if (sourceTheatreName) {
            updateTheatre(sourceTheatreName, {
                currentOdp: '',
                practitionerEndTime: '',
                status: 'Not Running'
            });
        }

        // Add as second practitioner - append to currentOdp field with separator
        const updatedOdp = `${targetTheatre.currentOdp} & ${newPractitionerName}`;
        const updatedEndTime = `${targetTheatre.practitionerEndTime} & ${newPractitionerEndTime}`;

        updateTheatre(targetTheatreName, {
            currentOdp: updatedOdp,
            practitionerEndTime: updatedEndTime
        });

        // Close modal
        setDropModalState({
            isOpen: false,
            targetTheatreName: null,
            currentPractitioner: null,
            newPractitionerName: null,
            newPractitionerEndTime: null,
            sourceTheatreName: null
        });
    }, [dropModalState, theatres, updateTheatre]);

    // Handle modal option: As Relief
    const handleDropRelief = useCallback(() => {
        const { targetTheatreName, newPractitionerName, newPractitionerEndTime, sourceTheatreName } = dropModalState;

        // Clear source theatre if reassigning
        if (sourceTheatreName) {
            updateTheatre(sourceTheatreName, {
                currentOdp: '',
                practitionerEndTime: '',
                status: 'Not Running'
            });
        }

        // Add as relief practitioner in the nextPractitioner field with end time
        updateTheatre(targetTheatreName, {
            nextPractitioner: `${newPractitionerName} ${newPractitionerEndTime}`
        });

        // Close modal
        setDropModalState({
            isOpen: false,
            targetTheatreName: null,
            currentPractitioner: null,
            newPractitionerName: null,
            newPractitionerEndTime: null,
            sourceTheatreName: null
        });
    }, [dropModalState, updateTheatre]);

    // Handle modal option: Cancel
    const handleDropCancel = useCallback(() => {
        // Simply close the modal without making any changes
        setDropModalState({
            isOpen: false,
            targetTheatreName: null,
            currentPractitioner: null,
            newPractitionerName: null,
            newPractitionerEndTime: null,
            sourceTheatreName: null
        });
    }, []);

    // Handle practitioner deallocation
    const handlePractitionerDeallocate = useCallback((theatreName) => {
        updateTheatre(theatreName, {
            currentOdp: '',
            practitionerEndTime: '',
            status: 'Not Running'
        });
    }, [updateTheatre]);

    // Get lunch request status for each theatre
    const getLunchStatus = useCallback((theatreName) => {
        const pendingRequest = requests.find(
            req => req.theatreName === theatreName && req.status === 'pending'
        );
        const fulfilledRequest = requests.find(
            req => req.theatreName === theatreName && req.status === 'fulfilled'
        );

        return {
            hasPendingLunch: !!pendingRequest,
            hasFulfilledLunch: !!fulfilledRequest && !pendingRequest
        };
    }, [requests]);

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
                {/* --- Data Control Group (Left Side) with Dropdown --- */}
                <div className="data-control-group-left">
                    <div className="data-controls-dropdown">
                        <button
                            className="data-controls-btn"
                            onClick={() => setIsDataDropdownVisible(!isDataDropdownVisible)}
                        >
                            Data & Settings
                        </button>
                        {isDataDropdownVisible && (
                            <div className="data-dropdown-menu">
                                <div className="csv-upload-container">
                                    <label htmlFor="csv-upload" className="upload-label-dropdown">
                                        Upload Roster
                                    </label>
                                    <input
                                        type="file"
                                        id="csv-upload"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={(e) => {
                                            handleFileUpload(e);
                                            setIsDataDropdownVisible(false);
                                        }}
                                    />
                                </div>

                                <button
                                    className="dropdown-item-btn"
                                    onClick={() => {
                                        handleDownload();
                                        setIsDataDropdownVisible(false);
                                    }}
                                >
                                    Download State
                                </button>

                                <div className="upload-data-container">
                                    <label htmlFor="data-upload" className="upload-data-label-dropdown">
                                        Upload State
                                    </label>
                                    <input
                                        type="file"
                                        id="data-upload"
                                        accept=".json"
                                        onChange={(e) => {
                                            handleDataUpload(e);
                                            setIsDataDropdownVisible(false);
                                        }}
                                    />
                                </div>

                                <button
                                    className="dropdown-item-btn"
                                    onClick={() => {
                                        setTheme(theme === 'dark' ? 'light' : 'dark');
                                        setIsDataDropdownVisible(false);
                                    }}
                                >
                                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                </button>

                                <button
                                    className="dropdown-item-btn danger"
                                    onClick={() => {
                                        handleClearAll();
                                        setIsDataDropdownVisible(false);
                                    }}
                                >
                                    Clear ALL Tiles
                                </button>

                                <button
                                    className="dropdown-item-btn danger"
                                    onClick={() => {
                                        handleClearWholeWeek();
                                        setIsDataDropdownVisible(false);
                                    }}
                                >
                                    Clear Whole Week
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Center: Title and Time --- */}
                <div className="header-content">
                    <h1>{rosterDate ? formatRosterDate(rosterDate) : 'ODP Dashboard'}</h1>
                    <div className="time-display">{currentTime}</div>
                </div>

                {/* --- Action Buttons (Right Side) --- */}
                <div className="button-group-right">
                    <button
                        className="filter-toggle-btn"
                        onClick={() => setShowAll(!showAll)}
                    >
                        {showAll ? 'Hide Finished' : 'Show Finished'}
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
                        {isPractitionerSidebarVisible ? 'Hide Allocate' : 'Show Allocate'}
                    </button>

                    {/* Day Selector Dropdown */}
                    <div className="day-selector-dropdown">
                        <button
                            className="day-selector-btn"
                            onClick={() => setIsDayDropdownVisible(!isDayDropdownVisible)}
                        >
                            {getSelectedDayDisplay()}
                        </button>
                        {isDayDropdownVisible && (
                            <div className="day-dropdown-menu">
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
                                    <button
                                        key={day}
                                        className={`day-dropdown-item ${selectedDay === day ? 'active' : ''}`}
                                        onClick={() => handleDayChange(day)}
                                    >
                                        {day.charAt(0).toUpperCase() + day.slice(1)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="theatre-grid-full-width">
                <div className="theatre-rows-wrapper">
                    <div className="theatre-row">{group1.map(t => <TheatreTile key={t.name} {...t} handleTileClick={handleTileClick} handleStatusToggle={handleStatusToggle} highlightSettings={highlightSettings} onPractitionerDrop={handlePractitionerDrop} lunchStatus={getLunchStatus(t.name)} isPractitionerSick={isPractitionerSick(t.currentOdp)} />)}</div>
                    <div className="theatre-row">{group2.map(t => <TheatreTile key={t.name} {...t} handleTileClick={handleTileClick} handleStatusToggle={handleStatusToggle} highlightSettings={highlightSettings} onPractitionerDrop={handlePractitionerDrop} lunchStatus={getLunchStatus(t.name)} isPractitionerSick={isPractitionerSick(t.currentOdp)} />)}</div>
                    <div className="theatre-row">{group3.map(t => <TheatreTile key={t.name} {...t} handleTileClick={handleTileClick} handleStatusToggle={handleStatusToggle} highlightSettings={highlightSettings} onPractitionerDrop={handlePractitionerDrop} lunchStatus={getLunchStatus(t.name)} isPractitionerSick={isPractitionerSick(t.currentOdp)} />)}</div>
                    <div className="theatre-row specialized-row">{group4_Specialized.map(t => <TheatreTile key={t.name} {...t} handleTileClick={handleTileClick} handleStatusToggle={handleStatusToggle} highlightSettings={highlightSettings} onPractitionerDrop={handlePractitionerDrop} lunchStatus={getLunchStatus(t.name)} isPractitionerSick={isPractitionerSick(t.currentOdp)} />)}</div>
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
                        <label className="highlight-option">
                            <input
                                type="checkbox"
                                checked={highlightSettings.highlightPendingLunch}
                                onChange={() => handleHighlightToggle('highlightPendingLunch')}
                            />
                            Highlight Pending Lunch?
                        </label>
                        <label className="highlight-option">
                            <input
                                type="checkbox"
                                checked={highlightSettings.highlightFulfilledLunch}
                                onChange={() => handleHighlightToggle('highlightFulfilledLunch')}
                            />
                            Highlight Fulfilled Lunch?
                        </label>
                    </div>
                )}

                
                {isStaffPanelVisible && (
                    <div className="staff-overview-popup">
                        <h2>Staffing Overview ({practitionerList.length} Total Staff)</h2>

                        {/* Pending Lunch Requests Overview */}
                        {requests.filter(req => req.status === 'pending').length > 0 && (
                            <div className="lunch-overview">
                                <h3>Pending Lunch Requests ({requests.filter(req => req.status === 'pending').length})</h3>
                                <div className="lunch-list">
                                    {requests
                                        .filter(req => req.status === 'pending')
                                        .sort((a, b) => a.timestamp - b.timestamp)
                                        .map((request) => {
                                            const requestTime = new Date(request.timestamp).toLocaleTimeString('en-GB', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false
                                            });
                                            const isCepod = request.theatreName.toUpperCase().includes('E13') ||
                                                          request.theatreName.toUpperCase().includes('E14') ||
                                                          request.theatreName.toUpperCase().includes('E17') ||
                                                          request.theatreName.toUpperCase().includes('E18');

                                            return (
                                                <div key={request.id} className={`lunch-item ${isCepod ? 'cepod' : ''}`}>
                                                    <span className="lunch-theatre">{request.theatreName}</span>
                                                    <span className="lunch-time">{requestTime}</span>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

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
                        onToggleSick={handleToggleSick}
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

            {/* Practitioner Drop Options Modal */}
            <PractitionerDropModal
                isOpen={dropModalState.isOpen}
                theatreName={dropModalState.targetTheatreName}
                currentPractitioner={dropModalState.currentPractitioner}
                newPractitioner={dropModalState.newPractitionerName}
                onReplace={handleDropReplace}
                onSecondPractitioner={handleDropSecondPractitioner}
                onRelief={handleDropRelief}
                onCancel={handleDropCancel}
            />

            {/* Version and Copyright Footer */}
            <div className="version-footer">
                v0.1.3 (alpha) | © T Simons 2025
            </div>
        </div>
    );
};

export default TheatreDashboard;
