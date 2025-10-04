// Change tracking variables
let hasUnsavedChanges = false;
let originalProgramCourses = null;

window.allCourses = [];
window.allPrograms = [];
window.allProgramCourses = [];
window.selectedProgram = null;
window.hasUnsavedChanges = false;
window.originalProgramCourses = null;

// Define storage keys/stores
const STORES = {
    COURSES: 'allCourses',
    PROGRAMS: 'allPrograms',
    PROGRAM_COURSES: 'allProgramCourses'
};

// Chrome Storage Management Functions
const StorageManager = {
    // Load data from storage
    getAllRecords: function (storeName) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(storeName, function (result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(result[storeName] || []);
            });
        });
    },

    // Save record to storage
    saveRecord: function (storeName, record) {
        return new Promise((resolve, reject) => {
            this.getAllRecords(storeName)
                .then(records => {
                    const key = storeName === STORES.COURSES ? 'courseCode' :
                        storeName === STORES.PROGRAMS ? 'programId' : 'programId';

                    const index = records.findIndex(r => r[key] === record[key]);
                    if (index >= 0) {
                        records[index] = record; // Update existing
                    } else {
                        records.push(record); // Add new
                    }

                    const data = {};
                    data[storeName] = records;

                    chrome.storage.local.set(data, function () {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                            return;
                        }
                        resolve();
                    });
                })
                .catch(reject);
        });
    },

    // Delete record from storage
    deleteRecord: function (storeName, keyValue) {
        return new Promise((resolve, reject) => {
            this.getAllRecords(storeName)
                .then(records => {
                    const key = storeName === STORES.COURSES ? 'courseCode' : 'programId';
                    const filteredRecords = records.filter(r => r[key] !== keyValue);

                    const data = {};
                    data[storeName] = filteredRecords;

                    chrome.storage.local.set(data, function () {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                            return;
                        }
                        resolve();
                    });
                })
                .catch(reject);
        });
    },

    // Reset data to defaults
    resetToDefaults: function () {
        return new Promise((resolve, reject) => {
            // Send message to background script to update data from API
            chrome.runtime.sendMessage({
                action: 'loadDefaultData'
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                if (response && response.success) {
                    resolve();
                } else {
                    reject(new Error(response ? response.error : 'Failed to load data from API'));
                }
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Load data directly from Chrome storage
    loadSettingsData().catch(error => {
        console.log(error, 'loadSettingsData initial call');
        ErrorHandler.showCustomAlert('Failed to load settings: ' + error.message, 'Error');
    });


    // DOM Elements
    const backButton = document.getElementById('backButton');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const downloadProgramCoursesBtn = document.getElementById('downloadProgramCoursesBtn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const resetDatabaseBtn = document.getElementById('resetDatabaseBtn');

    if (downloadProgramCoursesBtn) {
        downloadProgramCoursesBtn.addEventListener('click', async () => {
            try {
                // Get data from Chrome storage
                const result = await new Promise((resolve, reject) => {
                    chrome.storage.local.get([
                        STORES.COURSES,
                        STORES.PROGRAMS,
                        STORES.PROGRAM_COURSES
                    ], function (result) {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                            return;
                        }
                        resolve(result);
                    });
                });

                const allCourses = result[STORES.COURSES] || [];
                const allPrograms = result[STORES.PROGRAMS] || [];
                const allProgramCourses = result[STORES.PROGRAM_COURSES] || [];

                // Prepare data for Excel export
                const excelData = [];

                // Add headers
                excelData.push([
                    'Program ID',
                    'Program Name',
                    'Course Sequence',
                    'Course Code',
                    'Course Name',
                    'Duration'
                ]);

                // Process each program
                allProgramCourses.forEach(program => {
                    const programId = program.programId;

                    // Get program name from allPrograms if available (in case allProgramCourses is missing the name)
                    let programName = program.programName || '';
                    if (!programName) {
                        const matchingProgram = allPrograms.find(p => p.programId === programId);
                        if (matchingProgram) {
                            programName = matchingProgram.programName;
                        }
                    }

                    if (program.courses && program.courses.length > 0) {
                        // Add each course as a row
                        program.courses.forEach(course => {
                            // Get full course details if available
                            let courseName = course.name || '';
                            let courseDuration = course.duration || 0;

                            if (!courseName) {
                                const matchingCourse = allCourses.find(c => c.courseCode === course.code);
                                if (matchingCourse) {
                                    courseName = matchingCourse.courseName;
                                    courseDuration = matchingCourse.courseDuration || 0;
                                }
                            }

                            excelData.push([
                                programId,
                                programName,
                                course.sequence,
                                course.code,
                                courseName,
                                courseDuration
                            ]);
                        });
                    } else {
                        // Add empty row for programs with no courses
                        excelData.push([programId, programName, '', '', '', '']);
                    }
                });

                // Create worksheet
                const ws = XLSX.utils.aoa_to_sheet(excelData);

                // Set column widths
                const wscols = [
                    { wch: 10 },  // Program ID
                    { wch: 30 },  // Program Name
                    { wch: 10 },  // Course Sequence
                    { wch: 15 },  // Course Code
                    { wch: 40 },  // Course Name
                    { wch: 10 }   // Duration
                ];
                ws['!cols'] = wscols;

                // Create workbook
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Program Courses');

                // Generate Excel file
                const dateStr = new Date().toISOString().split('T')[0];
                const fileName = `aol-program-and-courses-${dateStr}.xlsx`;

                // Export to file
                XLSX.writeFile(wb, fileName);

                ErrorHandler.showCustomAlert('Program courses exported to Excel successfully!', 'Success');
            } catch (error) {
                console.log(error, 'downloadProgramCoursesBtn click');
                ErrorHandler.showCustomAlert('Error exporting program courses: ' + error.message, 'Error');
            }
        });
    }

    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', async () => {
            try {
                // Get data from Chrome storage
                const result = await new Promise((resolve, reject) => {
                    chrome.storage.local.get([
                        STORES.COURSES,
                        STORES.PROGRAMS,
                        STORES.PROGRAM_COURSES
                    ], function (result) {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                            return;
                        }
                        resolve(result);
                    });
                });

                // Create export object with metadata
                const exportData = {
                    exportDate: new Date().toISOString(),
                    exportVersion: '1.0',
                    allCourses: result[STORES.COURSES] || [],
                    allPrograms: result[STORES.PROGRAMS] || [],
                    allProgramCourses: result[STORES.PROGRAM_COURSES] || []
                };

                // Convert to JSON
                const jsonStr = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });

                // Create and trigger download
                const dateStr = new Date().toISOString().split('T')[0];
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `aol-programs-and-courses-${dateStr}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);

                ErrorHandler.showCustomAlert('Settings exported successfully!', 'Success');
            } catch (error) {
                console.log(error, 'exportDataBtn click');
                ErrorHandler.showCustomAlert('Error exporting settings: ' + error.message, 'Error');
            }
        });
    }

    // Add Import functionality
    if (importDataBtn) {
        importDataBtn.addEventListener('click', async () => {
            // Create file input for selection
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';

            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        // Parse the imported JSON
                        const importedData = JSON.parse(e.target.result);

                        // Validate imported data
                        if (!importedData.allCourses || !Array.isArray(importedData.allCourses) ||
                            !importedData.allPrograms || !Array.isArray(importedData.allPrograms) ||
                            !importedData.allProgramCourses || !Array.isArray(importedData.allProgramCourses)) {
                            throw new Error('Invalid data format');
                        }

                        // Ask for confirmation
                        const confirmed = await ErrorHandler.showCustomConfirm(
                            'This will replace all your current settings. Are you sure you want to continue?',
                            'Import Settings'
                        );

                        if (confirmed) {
                            // Store imported data
                            await new Promise((resolve, reject) => {
                                chrome.storage.local.set({
                                    [STORES.COURSES]: importedData.allCourses,
                                    [STORES.PROGRAMS]: importedData.allPrograms,
                                    [STORES.PROGRAM_COURSES]: importedData.allProgramCourses
                                }, function () {
                                    if (chrome.runtime.lastError) {
                                        reject(chrome.runtime.lastError);
                                        return;
                                    }
                                    resolve();
                                });
                            });

                            await ErrorHandler.showCustomAlert('Settings imported successfully. The page will now reload.', 'Success');

                            // Reload the page to show imported data
                            window.location.reload();
                        }
                    } catch (error) {
                        console.log(error, 'importData file read');
                        ErrorHandler.showCustomAlert('Error importing settings: ' + error.message, 'Error');
                    }
                };

                reader.readAsText(file);
            });

            // Trigger the file selection dialog
            fileInput.click();
        });
    }
    // Course tab elements
    const courseSearch = document.getElementById('courseSearch');
    const addCourseBtn = document.getElementById('addCourseBtn');
    const coursesTableBody = document.getElementById('coursesTableBody');

    // Program tab elements
    const programSearch = document.getElementById('programSearch');
    const addProgramBtn = document.getElementById('addProgramBtn');
    const programsTableBody = document.getElementById('programsTableBody');

    // Program courses tab elements
    const programCourseSearch = document.getElementById('programCourseSearch');
    const programSelect = document.getElementById('programSelect');
    const firstCourseSelect = document.getElementById('firstCourseSelect');
    const secondCourseSelect = document.getElementById('secondCourseSelect');
    const additionalCourseSelect = document.getElementById('additionalCourseSelect');
    const updateProgramCoursesBtn = document.getElementById('updateProgramCoursesBtn');
    const programCoursesList = document.getElementById('programCoursesList');

    // Additional elements for program course management
    const addCourseSelect = document.getElementById('addCourseSelect');
    const addCourseToProgram = document.getElementById('addCourseToProgram');
    const saveProgramCourses = document.getElementById('saveProgramCourses');
    const resetProgramCourses = document.getElementById('resetProgramCourses');
    const resetBtn = document.getElementById('resetBtn');

    // Add event listener to back button for unsaved changes warning
    backButton.addEventListener('click', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            ErrorHandler.showCustomConfirm('You have unsaved changes. Are you sure you want to exit?', 'Unsaved Changes')
                .then(result => {
                    if (result) {
                        // Reset the flag before navigating to prevent the browser's alert
                        hasUnsavedChanges = false;
                        window.location.href = 'list-viewer.html';
                    }
                });
            return;
        }
        window.location.href = 'list-viewer.html';
    });

    // Handle tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Check for unsaved changes if switching from program courses tab
            const currentTab = document.querySelector('.tab-content.active').id;
            if (currentTab === 'programCoursesTab' && hasUnsavedChanges) {
                ErrorHandler.showCustomConfirm('You have unsaved changes. Changing tabs will cancel these changes. Do you want to continue?', 'Unsaved Changes')
                    .then(result => {
                        if (result) {
                            // Reset changes and switch tab
                            hasUnsavedChanges = false;
                            if (originalProgramCourses && selectedProgram) {
                                selectedProgram.courses = JSON.parse(JSON.stringify(originalProgramCourses.courses));
                                originalProgramCourses = null;
                            }
                            switchTab(button);
                        }
                    });
            } else {
                switchTab(button);
            }
        });
    });

    function switchTab(button) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active class from all tab buttons
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab content
        const tabId = button.dataset.tab + 'Tab';
        document.getElementById(tabId).classList.add('active');

        // Add active class to clicked button
        button.classList.add('active');
    }

    // Update the reset database button
    resetDatabaseBtn.addEventListener('click', async () => {
        ErrorHandler.showCustomConfirm('Are you sure you want to reset all settings to defaults? This will overwrite all your customizations.', 'Reset Settings')
            .then(async (confirmed) => {
                if (confirmed) {
                    try {
                        await StorageManager.resetToDefaults();
                        await loadSettingsData();
                        ErrorHandler.showCustomAlert('Settings have been reset to defaults.', 'Success');
                    } catch (error) {
                        console.log(error, 'resetDatabaseBtn click');
                        ErrorHandler.showCustomAlert('Failed to reset settings: ' + error.message, 'Error');
                    }
                }
            });
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            ErrorHandler.showCustomConfirm('Are you sure you want to reset all settings to defaults? This will overwrite all your customizations.', 'Reset Settings')
                .then(async (confirmed) => {
                    if (confirmed) {
                        try {
                            await StorageManager.resetToDefaults();
                            await loadSettingsData();
                            ErrorHandler.showCustomAlert('Settings have been reset to defaults.', 'Success');
                        } catch (error) {
                            console.log(error, 'resetBtn click');
                            ErrorHandler.showCustomAlert('Failed to reset settings: ' + error.message, 'Error');
                        }
                    }
                });
        });
    }

    // Load settings data from Chrome storage
    async function loadSettingsData() {
        try {
            // Load data directly from storage.local
            const result = await new Promise((resolve, reject) => {
                chrome.storage.local.get([
                    STORES.COURSES,
                    STORES.PROGRAMS,
                    STORES.PROGRAM_COURSES
                ], function (result) {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve(result);
                });
            });

            window.allCourses = result[STORES.COURSES] || [];
            window.allPrograms = result[STORES.PROGRAMS] || [];
            window.allProgramCourses = result[STORES.PROGRAM_COURSES] || [];

            console.log(`Loaded ${window.allCourses.length} courses, ${window.allPrograms.length} programs, and ${window.allProgramCourses.length} program courses from storage`);

            // If no data, try loading defaults
            if (!window.allCourses.length || !window.allPrograms.length || !window.allProgramCourses.length) {
                console.log("No data found, loading defaults...");
                await StorageManager.resetToDefaults();

                // Reload data after defaults are set
                const defaultsResult = await new Promise((resolve, reject) => {
                    chrome.storage.local.get([
                        STORES.COURSES,
                        STORES.PROGRAMS,
                        STORES.PROGRAM_COURSES
                    ], function (result) {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                            return;
                        }
                        resolve(result);
                    });
                });

                window.allCourses = defaultsResult[STORES.COURSES] || [];
                window.allPrograms = defaultsResult[STORES.PROGRAMS] || [];
                window.allProgramCourses = defaultsResult[STORES.PROGRAM_COURSES] || [];
            }

            // Populate UI
            populateCoursesTable();
            populateProgramsTable();
            populateProgramSelect();
            populateCourseSelects();
            populateAddCourseSelect();

            makeSelectSearchable(programSelect, 'Search programs...');
            makeSelectSearchable(firstCourseSelect, 'Search courses...');
            makeSelectSearchable(secondCourseSelect, 'Search courses...');
            makeSelectSearchable(additionalCourseSelect, 'Search courses...');
            makeSelectSearchable(addCourseSelect, 'Search courses to add...');
        } catch (error) {
            console.log(error, 'loadSettingsData main catch');
            throw error; // Rethrow so the initial caller can see it.
        }
    }

    // Update functions to use StorageManager
    function saveRecord(storeName, record) {
        return StorageManager.saveRecord(storeName, record);
    }

    function deleteRecord(storeName, key) {
        return StorageManager.deleteRecord(storeName, key);
    }

    // Update the populateCoursesTable function to include duration
    function populateCoursesTable(searchText = '') {
        coursesTableBody.innerHTML = '';

        const filteredCourses = searchText
            ? allCourses.filter(course =>
                course.courseCode.toLowerCase().includes(searchText.toLowerCase()) ||
                course.courseName.toLowerCase().includes(searchText.toLowerCase()))
            : allCourses;

        filteredCourses.forEach(course => {
            const row = document.createElement('tr');
            row.dataset.code = course.courseCode;
            row.innerHTML = `
            <td>${course.courseCode}</td>
            <td>${course.courseName}</td>
            <td>${course.courseDuration || 0}</td>
            <td>
                <button class="edit-btn" data-code="${course.courseCode}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" data-code="${course.courseCode}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;

            coursesTableBody.appendChild(row);
        });

        // Add event listeners to edit and delete buttons
        document.querySelectorAll('#coursesTableBody .edit-btn').forEach(button => {
            button.addEventListener('click', () => makeRowEditable(button.closest('tr')));
        });

        document.querySelectorAll('#coursesTableBody .delete-btn').forEach(button => {
            button.addEventListener('click', () => deleteCourse(button.dataset.code));
        });
    }

    // Update the makeRowEditable function to include duration field
    function makeRowEditable(row) {
        if (!row) return;

        // Get current values
        const courseCode = row.dataset.code;
        const course = allCourses.find(c => c.courseCode === courseCode);
        if (!course) return;

        // Add editable class
        row.classList.add('editable-row');

        // Save original HTML to restore if canceled
        row.dataset.originalHtml = row.innerHTML;
        row.dataset.originalCode = courseCode;

        // Replace with editable fields - now including course duration
        row.innerHTML = `
        <td>
            <input type="text" class="edit-course-code" value="${courseCode}" />
        </td>
        <td>
            <input type="text" class="edit-course-name" value="${course.courseName}" />
        </td>
        <td>
            <input type="number" class="edit-course-duration" value="${course.courseDuration || 0}" min="0" />
        </td>
        <td>
            <button class="save-btn">
                <i class="fas fa-save"></i>
            </button>
            <button class="cancel-btn">
                <i class="fas fa-times"></i>
            </button>
        </td>
    `;

        // Add event listeners for save and cancel buttons
        row.querySelector('.save-btn').addEventListener('click', () => saveEditedCourse(row));
        row.querySelector('.cancel-btn').addEventListener('click', () => cancelEditCourse(row));
    }

    // Update the saveEditedCourse function to handle duration
    function saveEditedCourse(row) {
        const originalCode = row.dataset.originalCode;
        const newCourseCode = row.querySelector('.edit-course-code').value.trim();
        const newCourseName = row.querySelector('.edit-course-name').value.trim();
        const newCourseDuration = parseInt(row.querySelector('.edit-course-duration').value) || 0;

        if (!newCourseCode) {
            ErrorHandler.showCustomAlert('Course code cannot be empty', 'Validation Error');
            return;
        }

        if (!newCourseName) {
            ErrorHandler.showCustomAlert('Course name cannot be empty', 'Validation Error');
            return;
        }

        const course = allCourses.find(c => c.courseCode === originalCode);
        if (!course) return;

        // Check if the code is being changed and if the new code already exists
        if (newCourseCode !== originalCode) {
            const existingCourse = allCourses.find(c => c.courseCode === newCourseCode);
            if (existingCourse) {
                ErrorHandler.showCustomAlert('A course with this code already exists.', 'Validation Error');
                return;
            }
        }

        // Handle code change by deleting old record and creating new one
        let saveOperation;

        if (newCourseCode !== originalCode) {
            // Delete old record
            saveOperation = deleteRecord(STORES.COURSES, originalCode)
                .then(() => {
                    // Create new record with updated code
                    const updatedCourse = {
                        courseCode: newCourseCode,
                        courseName: newCourseName,
                        courseDuration: newCourseDuration
                    };
                    return saveRecord(STORES.COURSES, updatedCourse);
                })
                .then(() => {
                    // Update allCourses array
                    const index = allCourses.findIndex(c => c.courseCode === originalCode);
                    if (index !== -1) {
                        allCourses[index] = {
                            courseCode: newCourseCode,
                            courseName: newCourseName,
                            courseDuration: newCourseDuration
                        };
                    }
                });
        } else {
            // Just update the name and duration
            course.courseName = newCourseName;
            course.courseDuration = newCourseDuration;
            saveOperation = saveRecord(STORES.COURSES, course);
        }

        saveOperation
            .then(() => {
                // Remove editable class and restore normal view with updated values
                row.classList.remove('editable-row');
                row.dataset.code = newCourseCode;
                row.innerHTML = `
                <td>${newCourseCode}</td>
                <td>${newCourseName}</td>
                <td>${newCourseDuration}</td>
                <td>
                    <button class="edit-btn" data-code="${newCourseCode}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" data-code="${newCourseCode}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;

                // Re-add event listeners
                row.querySelector('.edit-btn').addEventListener('click', () => makeRowEditable(row));
                row.querySelector('.delete-btn').addEventListener('click', () => deleteCourse(newCourseCode));

                // Update dependent dropdowns
                populateCourseSelects();
                populateAddCourseSelect();
            })
            .catch(error => {
                console.log(error, `saveEditedCourse for ${originalCode}`);
                ErrorHandler.showCustomAlert('Failed to update course: ' + error.message, 'Error');
            });
    }

    // Function to cancel editing and restore row
    function cancelEditCourse(row) {
        if (!row.dataset.originalHtml) return;

        row.innerHTML = row.dataset.originalHtml;
        row.classList.remove('editable-row');
        delete row.dataset.originalHtml;
        delete row.dataset.originalCode;

        // Re-add event listeners
        row.querySelector('.edit-btn').addEventListener('click', () => makeRowEditable(row));
        row.querySelector('.delete-btn').addEventListener('click', () => deleteCourse(row.querySelector('.delete-btn').dataset.code));
    }

    // Handle course search
    courseSearch.addEventListener('input', () => {
        populateCoursesTable(courseSearch.value);
    });

    // Update the addCourseBtn event listener to include duration field
    addCourseBtn.addEventListener('click', () => {
        // Remove any existing new row first
        const existingNewRow = coursesTableBody.querySelector('.new-row');
        if (existingNewRow) {
            existingNewRow.remove();
        }

        const newRow = document.createElement('tr');
        newRow.className = 'editable-row new-row';
        newRow.innerHTML = `
        <td>
            <input type="text" class="new-course-code" placeholder="Course Code" />
        </td>
        <td>
            <input type="text" class="new-course-name" placeholder="Course Name" />
        </td>
        <td>
            <input type="number" class="new-course-duration" placeholder="Duration" min="0" value="0" />
        </td>
        <td>
            <button class="save-btn">
                <i class="fas fa-save"></i>
            </button>
            <button class="cancel-btn">
                <i class="fas fa-times"></i>
            </button>
        </td>
    `;

        // Insert at the top of the table
        if (coursesTableBody.firstChild) {
            coursesTableBody.insertBefore(newRow, coursesTableBody.firstChild);
        } else {
            coursesTableBody.appendChild(newRow);
        }

        // Add event listeners
        newRow.querySelector('.save-btn').addEventListener('click', () => saveNewCourse(newRow));
        newRow.querySelector('.cancel-btn').addEventListener('click', () => newRow.remove());

        // Focus the first field
        newRow.querySelector('.new-course-code').focus();
    });

    function saveNewCourse(row) {
        const courseCode = row.querySelector('.new-course-code').value.trim();
        const courseName = row.querySelector('.new-course-name').value.trim();
        const courseDuration = parseInt(row.querySelector('.new-course-duration').value) || 0;

        if (!courseCode) {
            ErrorHandler.showCustomAlert('Course code cannot be empty', 'Validation Error');
            return;
        }

        if (!courseName) {
            ErrorHandler.showCustomAlert('Course name cannot be empty', 'Validation Error');
            return;
        }

        // Check for existing course with same code
        const existingCourse = allCourses.find(c => c.courseCode === courseCode);
        if (existingCourse) {
            ErrorHandler.showCustomAlert('Course with this code already exists.', 'Validation Error');
            return;
        }

        const newCourse = {
            courseCode,
            courseName,
            courseDuration
        };

        saveRecord(STORES.COURSES, newCourse)
            .then(() => {
                allCourses.push(newCourse);

                // Replace the editable row with a normal row
                row.classList.remove('editable-row', 'new-row');
                row.innerHTML = `
                    <td>${courseCode}</td>
                    <td>${courseName}</td>
                    <td>${courseDuration}</td>
                    <td>
                        <button class="edit-btn" data-code="${courseCode}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" data-code="${courseCode}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;

                // Add event listeners to the new row's buttons
                row.querySelector('.edit-btn').addEventListener('click', () => makeRowEditable(row));
                row.querySelector('.delete-btn').addEventListener('click', () => deleteCourse(courseCode));

                // Update dependent dropdowns
                populateCourseSelects();
                populateAddCourseSelect();
            })
            .catch(error => {
                console.log(error, `saveNewCourse for ${courseCode}`);
                ErrorHandler.showCustomAlert('Failed to add course: ' + error.message, 'Error');
            });
    }

    // Delete course
    function deleteCourse(courseCode) {
        ErrorHandler.showCustomConfirm('Are you sure you want to delete this course?', 'Delete Course')
            .then(confirmed => {
                if (confirmed) {
                    deleteRecord(STORES.COURSES, courseCode)
                        .then(() => {
                            allCourses = allCourses.filter(c => c.courseCode !== courseCode);
                            populateCoursesTable(courseSearch.value);
                            populateCourseSelects();
                            populateAddCourseSelect();
                            ErrorHandler.showCustomAlert('Course deleted successfully.', 'Success');
                        })
                        .catch(error => {
                            console.log(error, `deleteCourse for ${courseCode}`);
                            ErrorHandler.showCustomAlert('Failed to delete course: ' + error.message, 'Error');
                        });
                }
            });
    }

    // Populate programs table
    function populateProgramsTable(searchText = '') {
        programsTableBody.innerHTML = '';

        const filteredPrograms = searchText
            ? allPrograms.filter(program => {
                // Check if program ID or name includes the search text
                const idMatch = program.programId.toString().includes(searchText.toLowerCase());
                const nameMatch = program.programName.toLowerCase().includes(searchText.toLowerCase());

                // Check if any alternative name includes the search text
                let alternativeNameMatch = false;
                if (program.alternativeNames && Array.isArray(program.alternativeNames)) {
                    alternativeNameMatch = program.alternativeNames.some(altName =>
                        altName && altName.toLowerCase().includes(searchText.toLowerCase())
                    );
                }

                // Return true if ID, name or any alternative name matches
                return idMatch || nameMatch || alternativeNameMatch;
            })
            : allPrograms;

        filteredPrograms.forEach(program => {
            const row = document.createElement('tr');
            row.dataset.id = program.programId;

            // Highlight row if matched by alternative name (not by primary name)
            if (searchText &&
                !program.programId.toString().includes(searchText.toLowerCase()) &&
                !program.programName.toLowerCase().includes(searchText.toLowerCase()) &&
                program.alternativeNames &&
                program.alternativeNames.some(altName =>
                    altName && altName.toLowerCase().includes(searchText.toLowerCase())
                )) {
                row.classList.add('alt-name-match');
            }

            // Generate alternative names HTML
            const alternativeNamesHtml = program.alternativeNames && program.alternativeNames.length
                ? `
                <ul class="alt-names-list">
                    ${program.alternativeNames.map((name, index) => {
                    // Highlight the matching alternative name in the list
                    const isMatch = searchText && name &&
                        name.toLowerCase().includes(searchText.toLowerCase());

                    return `<li class="alt-name-item ${isMatch ? 'matched-term' : ''}">
                            ${name}
                        </li>`;
                }).join('')}
                </ul>
            `
                : 'None';

            row.innerHTML = `
                <td>${program.programId}</td>
                <td>${program.programName}</td>
                <td class="alt-names-cell">${alternativeNamesHtml}</td>
                <td>
                    <button class="edit-btn" data-id="${program.programId}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" data-id="${program.programId}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;

            programsTableBody.appendChild(row);
        });

        // Add event listeners to edit and delete buttons
        document.querySelectorAll('#programsTableBody .edit-btn').forEach(button => {
            button.addEventListener('click', () => makeProgramRowEditable(button.closest('tr')));
        });

        document.querySelectorAll('#programsTableBody .delete-btn').forEach(button => {
            button.addEventListener('click', () => deleteProgram(button.dataset.id));
        });
    }

    // Function to make a program row editable
    function makeProgramRowEditable(row) {
        if (!row) return;

        // Get current values
        const programId = parseInt(row.dataset.id);
        const program = allPrograms.find(p => p.programId === programId);
        if (!program) return;

        // Add editable class
        row.classList.add('editable-row');

        // Save original HTML to restore if canceled
        row.dataset.originalHtml = row.innerHTML;
        row.dataset.originalId = programId;

        // Create alternative names inputs
        const alternativeNamesHtml = (program.alternativeNames || []).map((name, index) => `
            <div class="alt-name-row" data-index="${index}">
                <input type="text" class="edit-alt-name" value="${name}" />
                <button class="remove-alt-name-btn" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        // Replace with editable fields - now with editable ID
        row.innerHTML = `
            <td>
                <input type="number" class="edit-program-id" value="${programId}" />
            </td>
            <td>
                <input type="text" class="edit-program-name" value="${program.programName}" />
            </td>
            <td class="alt-names-cell">
                <div class="alt-names-container">
                    ${alternativeNamesHtml}
                </div>
                <button class="add-alt-name-btn">
                    <i class="fas fa-plus"></i> Add Alternative Name
                </button>
            </td>
            <td>
                <button class="save-btn">
                    <i class="fas fa-save"></i>
                </button>
                <button class="cancel-btn">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;

        // Add event listeners for save and cancel buttons
        row.querySelector('.save-btn').addEventListener('click', () => saveEditedProgram(row));
        row.querySelector('.cancel-btn').addEventListener('click', () => cancelEditProgram(row));

        // Add event listener for "Add Alternative Name" button
        row.querySelector('.add-alt-name-btn').addEventListener('click', () => {
            addAlternativeNameField(row.querySelector('.alt-names-container'));
        });

        // Add event listeners for remove buttons
        row.querySelectorAll('.remove-alt-name-btn').forEach(button => {
            button.addEventListener('click', () => {
                button.closest('.alt-name-row').remove();
            });
        });
    }

    // Function to add a new alternative name field
    function addAlternativeNameField(container) {
        const newIndex = container.children.length;
        const altNameRow = document.createElement('div');
        altNameRow.className = 'alt-name-row';
        altNameRow.dataset.index = newIndex;
        altNameRow.innerHTML = `
            <input type="text" class="edit-alt-name" placeholder="Alternative Name" />
            <button class="remove-alt-name-btn" data-index="${newIndex}">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(altNameRow);

        // Add event listener for remove button
        altNameRow.querySelector('.remove-alt-name-btn').addEventListener('click', () => {
            altNameRow.remove();
        });

        // Focus the new input
        altNameRow.querySelector('.edit-alt-name').focus();
    }

    // Function to save edited program
    function saveEditedProgram(row) {
        const originalId = parseInt(row.dataset.originalId);
        const newProgramIdInput = row.querySelector('.edit-program-id').value.trim();
        const newProgramName = row.querySelector('.edit-program-name').value.trim();

        if (!newProgramIdInput) {
            ErrorHandler.showCustomAlert('Program ID cannot be empty', 'Error');
            return;
        }

        const newProgramId = parseInt(newProgramIdInput);
        if (isNaN(newProgramId)) {
            ErrorHandler.showCustomAlert('Program ID must be a number', 'Error');
            return;
        }

        if (!newProgramName) {
            ErrorHandler.showCustomAlert('Program name cannot be empty', 'Error');
            return;
        }

        const program = allPrograms.find(p => p.programId === originalId);
        if (!program) return;

        // Check if ID is being changed and if the new ID already exists
        if (newProgramId !== originalId) {
            const existingProgram = allPrograms.find(p => p.programId === newProgramId);
            if (existingProgram) {
                ErrorHandler.showCustomAlert('A program with this ID already exists.', 'Error');
                return;
            }
        }

        // Collect all alternative names
        const altNameInputs = row.querySelectorAll('.edit-alt-name');
        const alternativeNames = [];
        altNameInputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                alternativeNames.push(value);
            }
        });

        // Handle ID change by deleting old record and creating new one
        let saveOperation;

        if (newProgramId !== originalId) {
            // Delete old records
            saveOperation = deleteRecord(STORES.PROGRAMS, originalId)
                .then(() => deleteRecord(STORES.PROGRAM_COURSES, originalId))
                .then(() => {
                    // Create new program record with updated ID
                    const updatedProgram = {
                        programId: newProgramId,
                        programName: newProgramName,
                        alternativeNames: alternativeNames
                    };
                    return saveRecord(STORES.PROGRAMS, updatedProgram);
                })
                .then(() => {
                    // Create new program courses record with updated ID
                    const programCourse = allProgramCourses.find(pc => pc.programId === originalId);
                    if (programCourse) {
                        const updatedProgramCourse = {
                            ...programCourse,
                            programId: newProgramId,
                            programName: newProgramName
                        };
                        return saveRecord(STORES.PROGRAM_COURSES, updatedProgramCourse);
                    }
                    return Promise.resolve();
                })
                .then(() => {
                    // Update arrays
                    const programIndex = allPrograms.findIndex(p => p.programId === originalId);
                    if (programIndex !== -1) {
                        allPrograms[programIndex] = {
                            programId: newProgramId,
                            programName: newProgramName,
                            alternativeNames: alternativeNames
                        };
                    }

                    const programCourseIndex = allProgramCourses.findIndex(pc => pc.programId === originalId);
                    if (programCourseIndex !== -1) {
                        allProgramCourses[programCourseIndex] = {
                            ...allProgramCourses[programCourseIndex],
                            programId: newProgramId,
                            programName: newProgramName
                        };
                    }
                });
        } else {
            // Just update the name and alternative names
            program.programName = newProgramName;
            program.alternativeNames = alternativeNames;

            saveOperation = saveRecord(STORES.PROGRAMS, program)
                .then(() => {
                    // Also update program name in program courses
                    const programCourse = allProgramCourses.find(pc => pc.programId === originalId);
                    if (programCourse) {
                        programCourse.programName = newProgramName;
                        return saveRecord(STORES.PROGRAM_COURSES, programCourse);
                    }
                    return Promise.resolve();
                });
        }

        saveOperation
            .then(() => {
                // Refresh the table view
                ErrorHandler.showCustomAlert('Program updated successfully.', 'Successful')
                    .then(() => {
                        populateProgramsTable(programSearch.value);
                        populateProgramSelect();
                    });
            })
            .catch(error => {
                console.log(error, `saveEditedProgram for ${originalId}`);
                ErrorHandler.showCustomAlert('The program could not be updated: ' + error.message, 'Error');
            });
    }

    // Function to cancel editing and restore row
    function cancelEditProgram(row) {
        if (!row.dataset.originalHtml) return;

        row.innerHTML = row.dataset.originalHtml;
        row.classList.remove('editable-row');
        delete row.dataset.originalHtml;
        delete row.dataset.originalId;

        // Re-add event listeners
        row.querySelector('.edit-btn').addEventListener('click', () => makeProgramRowEditable(row));
        row.querySelector('.delete-btn').addEventListener('click', () => deleteProgram(row.querySelector('.delete-btn').dataset.id));
    }

    // Handle program search
    programSearch.addEventListener('input', () => {
        populateProgramsTable(programSearch.value);
    });

    // Add new program - now adds a new row at the top of the table
    addProgramBtn.addEventListener('click', () => {
        // Remove any existing new row first
        const existingNewRow = programsTableBody.querySelector('.new-row');
        if (existingNewRow) {
            existingNewRow.remove();
        }

        const newRow = document.createElement('tr');
        newRow.className = 'editable-row new-row';
        newRow.innerHTML = `
            <td>
                <input type="number" class="new-program-id" placeholder="Program ID" />
            </td>
            <td>
                <input type="text" class="new-program-name" placeholder="Program Name" />
            </td>
            <td class="alt-names-cell">
                <div class="alt-names-container"></div>
                <button class="add-alt-name-btn">
                    <i class="fas fa-plus"></i> Add Alternative Name
                </button>
            </td>
            <td>
                <button class="save-btn">
                    <i class="fas fa-save"></i>
                </button>
                <button class="cancel-btn">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;

        // Insert at the top of the table
        if (programsTableBody.firstChild) {
            programsTableBody.insertBefore(newRow, programsTableBody.firstChild);
        } else {
            programsTableBody.appendChild(newRow);
        }

        // Add event listeners
        newRow.querySelector('.save-btn').addEventListener('click', () => saveNewProgram(newRow));
        newRow.querySelector('.cancel-btn').addEventListener('click', () => newRow.remove());

        // Add event listener for "Add Alternative Name" button
        newRow.querySelector('.add-alt-name-btn').addEventListener('click', () => {
            addAlternativeNameField(newRow.querySelector('.alt-names-container'));
        });

        // Focus the first field
        newRow.querySelector('.new-program-id').focus();
    });

    // Function to save a new program
    function saveNewProgram(row) {
        const programIdInput = row.querySelector('.new-program-id').value.trim();
        const programName = row.querySelector('.new-program-name').value.trim();

        if (!programIdInput) {
            ErrorHandler.showCustomAlert('Program ID cannot be empty', 'Error');
            return;
        }

        const programId = parseInt(programIdInput);
        if (isNaN(programId)) {
            ErrorHandler.showCustomAlert('Program ID must be a number', 'Error');
            return;
        }

        if (!programName) {
            ErrorHandler.showCustomAlert('Program name cannot be empty', 'Error');
            return;
        }

        // Check for existing program with same ID
        const existingProgram = allPrograms.find(p => p.programId === programId);
        if (existingProgram) {
            ErrorHandler.showCustomAlert('A program with this ID already exists.', 'Error');
            return;
        }

        // Collect all alternative names
        const altNameInputs = row.querySelectorAll('.edit-alt-name');
        const alternativeNames = [];
        altNameInputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                alternativeNames.push(value);
            }
        });

        const newProgram = {
            programId,
            programName,
            alternativeNames
        };

        let newProgramCourses;

        saveRecord(STORES.PROGRAMS, newProgram)
            .then(() => {
                allPrograms.push(newProgram);

                // Also add empty program courses entry
                newProgramCourses = {
                    programId,
                    programName,
                    firstCourseCode: '',
                    firstCourse: '',
                    secondCourseCode: '',
                    secondCourse: '',
                    additionalCourseCode: '',
                    additionalCourse: '',
                    courses: []
                };

                return saveRecord(STORES.PROGRAM_COURSES, newProgramCourses);
            })
            .then(() => {
                allProgramCourses.push(newProgramCourses);

                // Replace the editable row with a normal row
                row.classList.remove('editable-row', 'new-row');
                row.dataset.id = programId;

                // Create HTML for the alternative names list
                const altNamesHtml = alternativeNames.length > 0
                    ? `<ul class="alt-names-list">${alternativeNames.map(name => `<li class="alt-name-item">${name}</li>`).join('')}</ul>`
                    : 'None';

                row.innerHTML = `
                    <td>${programId}</td>
                    <td>${programName}</td>
                    <td class="alt-names-cell">${altNamesHtml}</td>
                    <td>
                        <button class="edit-btn" data-id="${programId}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" data-id="${programId}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;

                // Add event listeners to the new row's buttons
                row.querySelector('.edit-btn').addEventListener('click', () => makeProgramRowEditable(row));
                row.querySelector('.delete-btn').addEventListener('click', () => deleteProgram(programId));

                // Update program select dropdown
                populateProgramSelect();

                return ErrorHandler.showCustomAlert('Program successfully added.', 'Successful');
            })
            .catch(error => {
                console.log(error, `saveNewProgram for ${programId}`);
                ErrorHandler.showCustomAlert('The program could not be added: ' + error.message, 'Error');
            });
    }

    // Delete program
    function deleteProgram(programIdStr) {
        ErrorHandler.showCustomConfirm('Are you sure you want to delete this program?', 'Delete Program')
            .then(confirmed => {
                if (confirmed) {
                    const programId = parseInt(programIdStr);

                    Promise.all([
                        deleteRecord(STORES.PROGRAMS, programId),
                        deleteRecord(STORES.PROGRAM_COURSES, programId)
                    ])
                        .then(() => {
                            allPrograms = allPrograms.filter(p => p.programId !== programId);
                            allProgramCourses = allProgramCourses.filter(pc => pc.programId !== programId);
                            populateProgramsTable(programSearch.value);
                            populateProgramSelect();
                            ErrorHandler.showCustomAlert('Program deleted successfully.', 'Successful');
                        })
                        .catch(error => {
                            console.log(error, `deleteProgram for ${programId}`);
                            ErrorHandler.showCustomAlert('The program could not be deleted: ' + error.message, 'Error');
                        });
                }
            });
    }

    // Populate program select dropdown
    function populateProgramSelect(searchText = '') {
        programSelect.innerHTML = '<option value=""></option>';

        const filteredPrograms = searchText
            ? allPrograms.filter(program => {
                // Check if program name or ID includes the search text
                const nameMatch = program.programName.toLowerCase().includes(searchText.toLowerCase());

                // Check if any alternative name includes the search text
                let alternativeNameMatch = false;
                if (program.alternativeNames && Array.isArray(program.alternativeNames)) {
                    alternativeNameMatch = program.alternativeNames.some(altName =>
                        altName && altName.toLowerCase().includes(searchText.toLowerCase())
                    );
                }

                // Return true if the name or any alternative name matches
                return nameMatch || alternativeNameMatch;
            })
            : allPrograms;

        filteredPrograms.forEach(program => {
            const option = document.createElement('option');
            option.value = program.programId;
            option.textContent = program.programName;

            // Add indicator if matched by alternative name
            if (searchText && program.alternativeNames &&
                !program.programName.toLowerCase().includes(searchText.toLowerCase()) &&
                program.alternativeNames.some(altName =>
                    altName && altName.toLowerCase().includes(searchText.toLowerCase())
                )) {
                option.textContent += ' (Alt. Name Match)';
            }

            programSelect.appendChild(option);
        });
    }

    // Populate course select dropdowns
    function populateCourseSelects() {
        [firstCourseSelect, secondCourseSelect, additionalCourseSelect].forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value=""></option>';

            allCourses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.courseCode;
                option.textContent = `${course.courseCode} - ${course.courseName}`;
                select.appendChild(option);
            });

            // Restore selected value if possible
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }

    // Populate the "Add Course" dropdown
    function populateAddCourseSelect() {
        if (!addCourseSelect) return;

        addCourseSelect.innerHTML = '<option value=""></option>';

        if (!selectedProgram) return;

        // Get courses that are not already in the program
        const programCourseCodes = selectedProgram.courses.map(c => c.code);
        const availableCourses = allCourses.filter(c => !programCourseCodes.includes(c.courseCode));

        availableCourses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.courseCode;
            option.textContent = `${course.courseCode} - ${course.courseName}`;
            addCourseSelect.appendChild(option);
        });
    }

    // Populate program courses list
    function populateProgramCoursesList(programId) {
        programCoursesList.innerHTML = '';
        selectedProgram = allProgramCourses.find(pc => pc.programId === parseInt(programId));
        hasUnsavedChanges = false;
        originalProgramCourses = null;

        if (!selectedProgram) return;

        // Set current course selections
        firstCourseSelect.value = selectedProgram.firstCourseCode || '';
        secondCourseSelect.value = selectedProgram.secondCourseCode || '';
        additionalCourseSelect.value = selectedProgram.additionalCourseCode || '';

        // Update the add course dropdown
        populateAddCourseSelect();

        // Disable save/reset buttons initially
        if (saveProgramCourses) saveProgramCourses.disabled = true;
        if (resetProgramCourses) resetProgramCourses.disabled = true;

        // Populate courses list
        updateProgramCoursesUI();
    }

    const originalPopulateProgramCoursesList = populateProgramCoursesList;

    // Override the function with our enhanced version
    populateProgramCoursesList = function (programId) {
        console.log('Populating program courses for program ID:', programId);

        // Call the original function
        originalPopulateProgramCoursesList(programId);

        // Update the searchable selects after setting values
        // Use a longer timeout to ensure the DOM has been updated
        setTimeout(() => {
            console.log('Updating searchable selects for program courses');
            updateSearchableSelectsForProgram();
        }, 100);
    };

    // Update program courses UI with current data
    function updateProgramCoursesUI() {
        programCoursesList.innerHTML = '';

        if (!selectedProgram) return;

        // Show unsaved changes indicator if needed
        if (hasUnsavedChanges) {
            programCoursesList.classList.add('unsaved-changes');
            if (saveProgramCourses) { saveProgramCourses.disabled = false; saveProgramCourses.style.display = 'inline-block'; }
            if (resetProgramCourses) { resetProgramCourses.disabled = false; resetProgramCourses.style.display = 'inline-block'; }
            if (resetBtn) resetBtn.style.display = 'none';
        } else {
            programCoursesList.classList.remove('unsaved-changes');
            if (saveProgramCourses) saveProgramCourses.disabled = true;
            if (resetProgramCourses) resetProgramCourses.disabled = true;
        }

        // Populate courses list
        if (selectedProgram.courses && selectedProgram.courses.length > 0) {
            selectedProgram.courses.forEach((course, index) => {
                const li = document.createElement('li');
                li.className = 'course-item';
                li.dataset.code = course.code;
                li.dataset.index = index;
                li.draggable = true;

                li.innerHTML = `
                    <span class="drag-handle"><i class="fas fa-grip-lines"></i></span>
                    <span class="course-info">${course.code} - ${course.name}</span>
                    <span class="course-actions">
                        <button class="remove-course-btn" data-index="${index}">
                            <i class="fas fa-times"></i>
                        </button>
                    </span>
                `;

                programCoursesList.appendChild(li);
            });

            // Add event listeners to remove buttons
            document.querySelectorAll('.remove-course-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    const index = parseInt(button.dataset.index);
                    removeCourseFromProgram(index);
                });
            });

            // Initialize drag and drop
            initializeDragAndDrop();
        } else {
            const emptyMessage = document.createElement('li');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No courses assigned to this program.';
            programCoursesList.appendChild(emptyMessage);
        }

        // Update the add course dropdown
        populateAddCourseSelect();
    }

    if (programCourseSearch) {
        programCourseSearch.addEventListener('input', () => {
            populateProgramSelect(programCourseSearch.value);
        });
    }

    if (programSelect) {
        // Program select change handler
        programSelect.addEventListener('change', () => {
            // Check for unsaved changes
            if (hasUnsavedChanges) {
                ErrorHandler.showCustomConfirm('You have unsaved changes. Changing the program will cancel these changes. Do you want to continue?', 'Unsaved Changes')
                    .then(confirmed => {
                        if (confirmed) {
                            // Reset change tracking
                            hasUnsavedChanges = false;
                            originalProgramCourses = null;

                            // Change program
                            changeProgramSelection();
                        } else {
                            // Restore previous selection
                            programSelect.value = selectedProgram ? selectedProgram.programId : '';
                        }
                    });
            } else {
                changeProgramSelection();
            }
        });
    }

    // Helper function for changing program selection
    function changeProgramSelection() {
        const programId = programSelect.value;
        if (programId) {
            populateProgramCoursesList(programId);
        } else {
            programCoursesList.innerHTML = '';
            firstCourseSelect.value = '';
            secondCourseSelect.value = '';
            additionalCourseSelect.value = '';
            selectedProgram = null;
        }
    }

    if (updateProgramCoursesBtn) {
        updateProgramCoursesBtn.addEventListener('click', () => {
            const programId = programSelect.value;
            if (!programId) {
                ErrorHandler.showCustomAlert('Please select a program.', 'Warning');
                return;
            }

            const selectedProgram = allProgramCourses.find(pc => pc.programId === parseInt(programId));
            if (!selectedProgram) return;

            // Update first course
            const firstCourseCode = firstCourseSelect.value;
            const firstCourse = firstCourseCode ? allCourses.find(c => c.courseCode === firstCourseCode) : null;

            selectedProgram.firstCourseCode = firstCourseCode;
            selectedProgram.firstCourse = firstCourse ? firstCourse.courseName : '';

            // Update second course
            const secondCourseCode = secondCourseSelect.value;
            const secondCourse = secondCourseCode ? allCourses.find(c => c.courseCode === secondCourseCode) : null;

            selectedProgram.secondCourseCode = secondCourseCode;
            selectedProgram.secondCourse = secondCourse ? secondCourse.courseName : '';

            // Update additional course
            const additionalCourseCode = additionalCourseSelect.value;
            const additionalCourse = additionalCourseCode ? allCourses.find(c => c.courseCode === additionalCourseCode) : null;

            selectedProgram.additionalCourseCode = additionalCourseCode;
            selectedProgram.additionalCourse = additionalCourse ? additionalCourse.courseName : '';

            // Save changes
            saveRecord(STORES.PROGRAM_COURSES, selectedProgram)
                .then(() => {
                    ErrorHandler.showCustomAlert('Program courses successfully updated.', 'Successful')
                        .then(() => {
                            populateProgramCoursesList(programId);
                        });
                })
                .catch(error => {
                    console.log(error, `updateProgramCoursesBtn for program ${programId}`);
                    ErrorHandler.showCustomAlert('Program courses could not be updated: ' + error.message, 'Error');
                });
        });
    }

    // Add course to program
    if (addCourseToProgram) {
        addCourseToProgram.addEventListener('click', () => {
            if (!addCourseSelect || !selectedProgram) {
                ErrorHandler.showCustomAlert('Please select a program and a course to add.', 'Warning');
                return;
            }

            const courseCode = addCourseSelect.value;
            if (!courseCode) {
                ErrorHandler.showCustomAlert('Please select a course to add.', 'Warning');
                return;
            }

            const course = allCourses.find(c => c.courseCode === courseCode);
            if (!course) return;

            // Check if course already exists in the program
            const exists = selectedProgram.courses.some(c => c.code === courseCode);
            if (exists) {
                ErrorHandler.showCustomAlert('This course has already been added to the program.', 'Warning');
                return;
            }

            // Create a working copy if not already created
            if (!originalProgramCourses) {
                originalProgramCourses = JSON.parse(JSON.stringify(selectedProgram));
            }

            // Add course to the working copy
            const newCourse = {
                code: course.courseCode,
                name: course.courseName,
                sequence: selectedProgram.courses.length + 1,
                duration: course.courseDuration || 0
            };

            selectedProgram.courses.push(newCourse);
            hasUnsavedChanges = true;

            // Update UI
            updateProgramCoursesUI();
        });
    }

    // Save program courses changes
    if (saveProgramCourses) {
        saveProgramCourses.addEventListener('click', () => {
            if (!selectedProgram || !hasUnsavedChanges) return;

            saveRecord(STORES.PROGRAM_COURSES, selectedProgram)
                .then(() => {
                    return ErrorHandler.showCustomAlert('Program courses were successfully registered.', 'Successful');
                })
                .then(() => {
                    hasUnsavedChanges = false;
                    originalProgramCourses = null;
                    updateProgramCoursesUI();
                })
                .catch(error => {
                    console.log(error, `saveProgramCourses for program ${selectedProgram.programId}`);
                    ErrorHandler.showCustomAlert('Program courses could not be saved:' + error.message, 'Error');
                });
        });
    }

    // Reset program courses changes
    if (resetProgramCourses) {
        resetProgramCourses.addEventListener('click', () => {
            if (!selectedProgram || !hasUnsavedChanges) return;

            ErrorHandler.showCustomConfirm('Are you sure you want to reset all changes?', 'Reset Changes')
                .then(confirmed => {
                    if (confirmed) {
                        // Restore from original
                        if (originalProgramCourses) {
                            selectedProgram.courses = JSON.parse(JSON.stringify(originalProgramCourses.courses));
                            hasUnsavedChanges = false;
                            originalProgramCourses = null;
                            updateProgramCoursesUI();
                        }
                    }
                });
        });
    }

    // Remove course from program
    function removeCourseFromProgram(index) {
        if (!selectedProgram) return;

        // Create a working copy if not already created
        if (!originalProgramCourses) {
            originalProgramCourses = JSON.parse(JSON.stringify(selectedProgram));
        }

        // Remove course
        selectedProgram.courses.splice(index, 1);

        // Update sequence numbers
        selectedProgram.courses.forEach((course, idx) => {
            course.sequence = idx + 1;
        });

        hasUnsavedChanges = true;

        // Update UI
        updateProgramCoursesUI();
    }

    // Initialize drag and drop for course ordering
    function initializeDragAndDrop() {
        const courseItems = document.querySelectorAll('.course-item');
        let draggedItem = null;

        courseItems.forEach(item => {
            // Drag start
            item.addEventListener('dragstart', function (e) {
                draggedItem = this;
                setTimeout(() => this.style.opacity = '0.5', 0);
            });

            // Drag end
            item.addEventListener('dragend', function () {
                draggedItem = null;
                this.style.opacity = '1';
            });

            // Drag over
            item.addEventListener('dragover', function (e) {
                e.preventDefault();
            });

            // Drag enter
            item.addEventListener('dragenter', function (e) {
                e.preventDefault();
                this.classList.add('drag-over');
            });

            // Drag leave
            item.addEventListener('dragleave', function () {
                this.classList.remove('drag-over');
            });

            // Drop
            item.addEventListener('drop', function (e) {
                e.preventDefault();
                this.classList.remove('drag-over');

                if (draggedItem !== this) {
                    const allItems = Array.from(programCoursesList.querySelectorAll('.course-item'));
                    const draggedIndex = allItems.indexOf(draggedItem);
                    const targetIndex = allItems.indexOf(this);

                    if (draggedIndex !== -1 && targetIndex !== -1) {
                        // Create a working copy if not already created
                        if (!originalProgramCourses) {
                            originalProgramCourses = JSON.parse(JSON.stringify(selectedProgram));
                        }

                        // Reorder in the DOM
                        if (draggedIndex < targetIndex) {
                            programCoursesList.insertBefore(draggedItem, this.nextSibling);
                        } else {
                            programCoursesList.insertBefore(draggedItem, this);
                        }

                        // Reorder in the data
                        const movedCourse = selectedProgram.courses[draggedIndex];
                        selectedProgram.courses.splice(draggedIndex, 1);
                        selectedProgram.courses.splice(targetIndex, 0, movedCourse);

                        // Update sequence numbers
                        selectedProgram.courses.forEach((course, idx) => {
                            course.sequence = idx + 1;
                        });

                        hasUnsavedChanges = true;
                        updateProgramCoursesUI();
                    }
                }
            });
        });
    }

    // Add event listener for page unload
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            // Standard way to show a confirmation dialog on page close
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });
});

// Function to create searchable select elements with clear button and alternative names support
function makeSelectSearchable(selectElement, placeholder = 'Search...') {
    // Skip if already enhanced or element doesn't exist
    if (!selectElement || selectElement.dataset.searchable) return;

    // Mark as enhanced
    selectElement.dataset.searchable = 'true';

    // Get parent element that contains the select
    const parentElement = selectElement.parentElement;

    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'searchable-select-wrapper';

    // Create search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'searchable-select-input';
    searchInput.placeholder = placeholder;
    searchInput.readOnly = true; // Make input readonly to prevent keyboard on mobile initially

    // Create clear button (X)
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'searchable-select-clear';
    clearButton.innerHTML = '&times;'; // X symbol
    clearButton.title = 'Clear selection';
    clearButton.style.display = 'none'; // Hide initially if no selection

    // Create dropdown container
    const dropdown = document.createElement('div');
    dropdown.className = 'searchable-select-dropdown';

    // Hide original select (but keep it for form submission)
    selectElement.style.display = 'none';

    // Insert new elements
    parentElement.insertBefore(wrapper, selectElement);
    wrapper.appendChild(searchInput);
    wrapper.appendChild(clearButton);
    wrapper.appendChild(dropdown);
    wrapper.appendChild(selectElement); // Move select into wrapper

    // Populate dropdown with initial options
    populateDropdown(dropdown, selectElement, '');

    // Show dropdown on click (not focus)
    searchInput.addEventListener('click', (e) => {
        e.preventDefault();

        // Toggle dropdown visibility
        if (dropdown.style.display === 'block') {
            dropdown.style.display = 'none';
        } else {
            // Close any other open dropdowns first
            document.querySelectorAll('.searchable-select-dropdown').forEach(d => {
                if (d !== dropdown) d.style.display = 'none';
            });

            dropdown.style.display = 'block';

            // Remove readonly to allow typing after clicking
            searchInput.readOnly = false;

            // Important fix: Show all options on initial click regardless of current text
            populateDropdown(dropdown, selectElement, '');

            searchInput.focus();

            // Only select all text on first click
            if (!searchInput.dataset.clicked) {
                searchInput.select();
                searchInput.dataset.clicked = 'true';
            }
        }
    });

    // Clear button click event
    clearButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent dropdown from opening

        // Reset select value
        selectElement.value = '';
        searchInput.value = '';

        // Update clear button visibility
        clearButton.style.display = 'none';

        // Special handling for program select (clear course list)
        if (selectElement.id === 'programSelect') {
            // Clear program courses list
            const programCoursesList = document.getElementById('programCoursesList');
            if (programCoursesList) {
                programCoursesList.innerHTML = '';
                const emptyMessage = document.createElement('li');
                emptyMessage.className = 'empty-message';
                emptyMessage.textContent = 'No program selected.';
                programCoursesList.appendChild(emptyMessage);
            }

            // Reset course selects
            const firstCourseSelect = document.getElementById('firstCourseSelect');
            const secondCourseSelect = document.getElementById('secondCourseSelect');
            const additionalCourseSelect = document.getElementById('additionalCourseSelect');

            if (firstCourseSelect) firstCourseSelect.value = '';
            if (secondCourseSelect) secondCourseSelect.value = '';
            if (additionalCourseSelect) additionalCourseSelect.value = '';

            // Update their searchable select UI
            updateSpecificSearchableSelect(firstCourseSelect);
            updateSpecificSearchableSelect(secondCourseSelect);
            updateSpecificSearchableSelect(additionalCourseSelect);

            // Reset selected program
            selectedProgram = null;
            hasUnsavedChanges = false;
            originalProgramCourses = null;
        }

        // Open the dropdown to show all options
        dropdown.style.display = 'block';

        // Trigger change event
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.style.display = 'none';
            searchInput.readOnly = true; // Make readonly again when dropdown closes
            searchInput.dataset.clicked = ''; // Reset click state
        }
    });

    // Filter options as user types
    searchInput.addEventListener('input', () => {
        populateDropdown(dropdown, selectElement, searchInput.value.toLowerCase());
    });

    // Set initial value if one is selected
    updateInputFromSelect(selectElement, searchInput);

    // Show/hide clear button based on initial value
    clearButton.style.display = selectElement.value ? 'block' : 'none';

    // Function to populate dropdown with filtered options
    function populateDropdown(dropdown, select, filter) {
        dropdown.innerHTML = '';

        // Add a "None" option at the top if original has it
        if (select.options[0] && select.options[0].value === '') {
            const noneOption = document.createElement('div');
            noneOption.className = 'searchable-select-option';
            noneOption.dataset.value = '';
            noneOption.textContent = select.options[0].textContent;
            noneOption.addEventListener('click', () => {
                select.value = '';
                updateInputFromSelect(select, searchInput);
                clearButton.style.display = 'none'; // Hide clear button
                dropdown.style.display = 'none';
                searchInput.readOnly = true; // Make readonly again
                select.dispatchEvent(new Event('change', { bubbles: true })); // Trigger change event
            });
            dropdown.appendChild(noneOption);
        }

        // Add all matching options
        let hasResults = false;

        // For Program Select, search in both program names and alternative names
        if (select.id === 'programSelect') {
            // Get all programs to search alternative names
            const allProgramOptions = Array.from(select.options).filter(option => option.value);

            allProgramOptions.forEach(option => {
                const programId = parseInt(option.value);
                const program = allPrograms.find(p => p.programId === programId);

                if (!program) return;

                // Check if the program name matches the filter
                const nameMatches = !filter || program.programName.toLowerCase().includes(filter);

                // Check if any alternative name matches the filter
                let alternativeNameMatches = false;
                if (program.alternativeNames && Array.isArray(program.alternativeNames)) {
                    alternativeNameMatches = program.alternativeNames.some(altName =>
                        altName && altName.toLowerCase().includes(filter)
                    );
                }

                // If either the name or an alternative name matches, show this option
                if (nameMatches || alternativeNameMatches) {
                    hasResults = true;
                    const optionElement = document.createElement('div');
                    optionElement.className = 'searchable-select-option';
                    optionElement.dataset.value = option.value;

                    // If matched by alternative name, add indicator
                    if (!nameMatches && alternativeNameMatches) {
                        optionElement.textContent = `${program.programName} (Alt. Name Match)`;
                    } else {
                        optionElement.textContent = program.programName;
                    }

                    // Highlight the currently selected option
                    if (option.value === select.value) {
                        optionElement.classList.add('selected');
                    }

                    // Handle option click
                    optionElement.addEventListener('click', () => {
                        // Store previous value to check if it changed
                        const previousValue = select.value;

                        // Update the select value
                        select.value = option.value;
                        updateInputFromSelect(select, searchInput);
                        clearButton.style.display = 'block'; // Show clear button
                        dropdown.style.display = 'none';
                        searchInput.readOnly = true;

                        // Only trigger change event if value actually changed
                        if (previousValue !== option.value) {
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });

                    dropdown.appendChild(optionElement);
                }
            });
        } else {
            // Standard search for regular selects
            Array.from(select.options).forEach(option => {
                if (option.value === '') return; // Skip empty option

                if (!filter || option.textContent.toLowerCase().includes(filter)) {
                    hasResults = true;
                    const optionElement = document.createElement('div');
                    optionElement.className = 'searchable-select-option';
                    optionElement.dataset.value = option.value;
                    optionElement.textContent = option.textContent;

                    // Highlight the currently selected option
                    if (option.value === select.value) {
                        optionElement.classList.add('selected');
                    }

                    // Handle option click
                    optionElement.addEventListener('click', () => {
                        // Store previous value to check if it changed
                        const previousValue = select.value;

                        // Update the select value
                        select.value = option.value;
                        updateInputFromSelect(select, searchInput);
                        clearButton.style.display = 'block'; // Show clear button
                        dropdown.style.display = 'none';
                        searchInput.readOnly = true;

                        // Only trigger change event if value actually changed
                        if (previousValue !== option.value) {
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });

                    dropdown.appendChild(optionElement);
                }
            });
        }

        // Show "no results" message if needed
        if (!hasResults && filter) {
            const noResults = document.createElement('div');
            noResults.className = 'searchable-select-no-results';
            noResults.textContent = 'No matching results';
            dropdown.appendChild(noResults);
        }
    }

    // Update the input value based on the select's selected option
    function updateInputFromSelect(select, input) {
        const selectedOption = select.options[select.selectedIndex];
        input.value = selectedOption ? selectedOption.textContent : '';
        clearButton.style.display = selectedOption && selectedOption.value ? 'block' : 'none';
    }

    // Handle reset of program selection
    selectElement.addEventListener('change', () => {
        updateInputFromSelect(selectElement, searchInput);
    });
}

// Add this helper function to update searchable selects after program change
function updateSearchableSelectsForProgram() {
    console.log('Updating searchable select fields');

    // Update each specific select we care about
    updateSpecificSearchableSelect(firstCourseSelect);
    updateSpecificSearchableSelect(secondCourseSelect);
    updateSpecificSearchableSelect(additionalCourseSelect);
    updateSpecificSearchableSelect(addCourseSelect);
}

function updateSpecificSearchableSelect(selectElement) {
    if (!selectElement) return;

    const wrapper = selectElement.closest('.searchable-select-wrapper');
    if (!wrapper) return;

    const searchInput = wrapper.querySelector('.searchable-select-input');
    if (!searchInput) return;

    const selectedOption = selectElement.options[selectElement.selectedIndex];
    searchInput.value = selectedOption ? selectedOption.textContent : '';

    console.log(`Updated ${selectElement.id} to: ${searchInput.value}`);
}
