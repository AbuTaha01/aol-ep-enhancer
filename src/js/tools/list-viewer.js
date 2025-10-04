let allCourses = [];
let allPrograms = [];
let allProgramCourses = [];
const attemptedCplActivations = DataService.attemptedCplActivations || [];

const HELPDESK_CONFIG = {
    URLS: {
        NEW_REQUEST: 'https://hd.academyoflearning.net/HelpDesk/NewRequest.aspx',
    }
};

document.addEventListener('DOMContentLoaded', async () => {

    const fileInput = document.getElementById('excelFile');
    fileInput.addEventListener('change', handleFile);

    const pasteButton = document.createElement('button');
    pasteButton.id = 'pasteFromClipboard';
    pasteButton.className = 'action-btn paste-btn';
    pasteButton.innerHTML = '<i class="fas fa-paste"></i> Paste from Clipboard';
    pasteButton.addEventListener('click', handlePasteFromClipboard);

    const inputMethodsContainer = document.createElement('div');
    inputMethodsContainer.className = 'input-methods-container';

    const dropZone = document.getElementById('dropZone');
    dropZone.parentNode.insertBefore(inputMethodsContainer, dropZone);

    inputMethodsContainer.appendChild(dropZone);
    inputMethodsContainer.appendChild(pasteButton);

    const tableContainer = document.getElementById('tableContainer');

    const modalHtml = `<div id="confirmModal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5);z-index:9999;">
                            <div class="modal-content" style="background:#fff; margin:10% auto; padding:20px; width:50%; border-radius:5px;">
                                <h2>Confirm Help Desk Request</h2>
                                <div class="modal-body">
                                    <p><strong>Subject:</strong> <span id="modalSubject"></span></p>
                                    <div style="display:block">
                                        <p><strong>Description:</strong></p>
                                        <textarea 
                                            id="modalDescription" 
                                            style="width:100%; 
                                            min-height:200px; 
                                            box-sizing: border-box;
                                            padding:10px; 
                                            border:1px solid #ccc; 
                                            border-radius:4px; 
                                            font-family:inherit; 
                                            font-size:inherit;"
                                        ></textarea>
                                    </div>
                                </div>
                                <div class="modal-footer" style="margin-top:20px; text-align:right;">
                                    <button id="cancelRequest" class="danger-btn">Cancel</button>
                                    <button id="confirmRequest" class="action-btn">Send Request</button>
                                </div>
                            </div>
                        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    initializeStartActivation();
    initializeDownloadResults();
    setupDragAndDrop();

    function parseCSVLine(line, delimiter) {
        const result = [];
        let inQuotes = false;
        let currentValue = '';

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }

        // Add the last value
        result.push(currentValue);
        return result;
    }

    function setupDragAndDrop() {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.background = '#f0f0f0';
        });
        dropZone.addEventListener('dragleave', () => dropZone.style.background = '');
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.background = '';
            const file = e.dataTransfer.files[0];
            if (file) handleFile({ target: { files: [file] } });
        });
    }

    function handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const students = XLSX.utils.sheet_to_json(firstSheet);
            students.forEach(student => {
                const emailKey = Object.keys(student).find(key =>
                    key.toLowerCase().includes('email'));
                if (emailKey && student[emailKey]) {
                    student[emailKey] = cleanEmail(student[emailKey]);
                }
            });

            displayInitialTable(students);
        };
        reader.readAsArrayBuffer(file);
    }

    async function handlePasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();

            if (!text) {
                ErrorHandler.showCustomAlert('No data found in clipboard. Please copy data first.', 'info');
                return;
            }

            // Determine if data is tab-separated or comma-separated
            const firstLine = text.split(/\r?\n/)[0];
            const delimiter = firstLine.includes('\t') ? '\t' : ',';

            // Process with proper CSV parsing for comma-delimited data
            const rows = text.split(/\r?\n/).filter(row => row.trim());
            const headers = parseCSVLine(rows[0], delimiter);

            const students = [];
            for (let i = 1; i < rows.length; i++) {
                // Handle quoted fields properly
                const values = parseCSVLine(rows[i], delimiter);

                // Still skip if after proper parsing the lengths don't match
                if (values.length !== headers.length) continue;

                const student = {};
                headers.forEach((header, index) => {
                    // Clean up email addresses
                    if (header.trim().toLowerCase().includes('email')) {
                        student[header.trim()] = values[index] ? cleanEmail(values[index].trim()) : '';
                    } else {
                        student[header.trim()] = values[index] ? values[index].trim() : '';
                    }
                });

                students.push(student);
            }

            if (students.length === 0) {
                ErrorHandler.showCustomAlert('No valid data found in clipboard content. Please ensure you copied the correct table.', 'Information');
                return;
            }

            displayInitialTable(students);

        } catch (error) {
            ErrorHandler.showCustomAlert('Error reading from clipboard: ' + error.message, 'error');
        }
    }

    async function loadProgramDataFromStorage() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['allProgramCourses', 'allPrograms', 'allCourses'], function (result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                allProgramCourses = result.allProgramCourses || [];
                allPrograms = result.allPrograms || [];
                allCourses = result.allCourses || [];

                console.log(`Loaded ${allProgramCourses.length} program courses, ${allPrograms.length} programs, and ${allCourses.length} courses from storage`);
                resolve();
            });
        });
    }

    async function loadProgramData() {
        try {
            // Make sure program data is loaded from storage
            if (allProgramCourses.length === 0) {
                await loadProgramDataFromStorage();
            }

            console.log(`Loaded ${allProgramCourses.length} programs from storage`);

            // Track unmatched programs and CPL programs with empty courses
            const unmatchedPrograms = [];
            const cplProgramsWithEmptyCourses = [];

            // Debug: Check all CPL students first
            const cplStudents = [];
            document.querySelectorAll('tr[data-program]').forEach(row => {
                const cplCell = row.querySelector('#cpl-value');
                const isCPL = cplCell && cplCell.textContent &&
                    cplCell.textContent.trim().toLowerCase() === 'yes';

                if (isCPL) {
                    const programName = row.dataset.program;
                    cplStudents.push(programName);
                    console.log(`Found CPL student with program: ${programName}`);
                }
            });

            console.log(`Total CPL students found: ${cplStudents.length}`);

            document.querySelectorAll('tr[data-program]').forEach(row => {
                const programName = row.dataset.program;
                const program = findMatchingProgram(programName, allProgramCourses);

                // Check if this is a CPL student
                const cplCell = row.querySelector('#cpl-value');
                const isCPL = cplCell && cplCell.textContent &&
                    cplCell.textContent.trim().toLowerCase() === 'yes';

                if (program) {
                    // Debug the program structure
                    if (isCPL) {
                        console.log(`CPL Program found: ${programName}`);
                        console.log(`Program data:`, program);
                        console.log(`Has courses array: ${Boolean(program.courses)}`);
                        console.log(`Courses length: ${program.courses ? program.courses.length : 0}`);

                        // If it's a CPL student, check for empty courses array
                        if (!program.courses || program.courses.length === 0) {
                            console.log(`Adding to cplProgramsWithEmptyCourses: ${programName}`);
                            if (!cplProgramsWithEmptyCourses.includes(programName)) {
                                cplProgramsWithEmptyCourses.push(programName);
                            }
                        }
                    }

                    // Rest of your code for populating course data...
                    const courseCells = row.querySelectorAll('.course-data');
                    const launchBtn = row.querySelector('.launch-btn');
                    const hdRequestBtn = row.querySelector('.send-hd-btn');

                    courseCells[0].textContent = program.firstCourse || '-';
                    courseCells[1].textContent = program.secondCourse || '-';
                    courseCells[2].textContent = program.additionalCourse || '-';

                    launchBtn.dataset.firstCode = program.firstCourseCode || '';
                    launchBtn.dataset.secondCode = program.secondCourseCode || '';
                    launchBtn.dataset.additionalCode = program.additionalCourseCode || '';

                    if (hdRequestBtn) {
                        hdRequestBtn.dataset.firstCode = program.firstCourseCode || '';
                        hdRequestBtn.dataset.secondCode = program.secondCourseCode || '';
                        hdRequestBtn.dataset.additionalCode = program.additionalCourseCode || '';
                    }
                } else {
                    console.log(`No matching program found for: ${programName}`);
                    if (!unmatchedPrograms.includes(programName) && programName !== 'Program not found') {
                        unmatchedPrograms.push(programName);
                    }
                }
            });

            // Debug what we've found
            console.log('Unmatched programs:', unmatchedPrograms);
            console.log('CPL programs with empty courses:', cplProgramsWithEmptyCourses);

            // Show warnings if needed
            if (unmatchedPrograms.length > 0 || cplProgramsWithEmptyCourses.length > 0) {
                console.log('Showing warning for program issues');
                showProgramWarning(unmatchedPrograms, cplProgramsWithEmptyCourses);
            } else {
                console.log('No warnings needed - all programs found and CPL programs have courses');
            }
        } catch (error) {
            ErrorHandler.showCustomAlert('Error loading program data. Some course information might be missing or incorrect.', 'error');
        }
    }

    function findMatchingProgram(programName, allProgramCourses) {
        if (!programName) return null;

        // Helper function to clean program names by removing parentheses
        function cleanProgramName(name) {
            if (!name) return '';
            return name.toLowerCase()
                .replace(/\s*\([^)]*\)\s*/g, ' ') // Remove parentheses and their contents
                .replace(/\s+/g, ' ')             // Replace multiple spaces with a single space
                .trim();                          // Trim leading/trailing spaces
        }

        // Clean the search name
        const cleanedSearchName = cleanProgramName(programName);
        console.log(`Searching for program: "${programName}" (cleaned: "${cleanedSearchName}")`);

        // 1. First try match with program names in allProgramCourses
        let program = allProgramCourses.find(p => {
            const cleanedProgramName = cleanProgramName(p.programName || '');
            return cleanedProgramName === cleanedSearchName;
        });

        // 2. If no match, look for the program in allPrograms alternative names
        if (!program && allPrograms && allPrograms.length > 0) {
            // Find program ID by checking alternative names
            for (let i = 0; i < allPrograms.length; i++) {
                const p = allPrograms[i];

                // First check if the main program name matches
                const cleanedMainProgramName = cleanProgramName(p.programName || p.name || '');
                if (cleanedMainProgramName === cleanedSearchName) {
                    program = allProgramCourses.find(pc => pc.programId === p.programId);

                    if (program) {
                        const actualProgramName = p.name || p.programName || `Program ID: ${p.programId}`;
                        console.log(`Found match with cleaned names: "${programName}" matches "${actualProgramName}"`);
                        return program;
                    }
                }

                // Then check alternative names
                if (p.alternativeNames && Array.isArray(p.alternativeNames) && p.alternativeNames.length > 0) {
                    // Check if program name matches any of the alternative names
                    const matchingAltName = p.alternativeNames.find(altName => {
                        if (!altName) return false;
                        const cleanedAltName = cleanProgramName(altName);
                        return cleanedAltName === cleanedSearchName;
                    });

                    if (matchingAltName) {
                        // If match found, get corresponding program from allProgramCourses using programId
                        program = allProgramCourses.find(pc => pc.programId === p.programId);

                        if (program) {
                            // Get the ACTUAL program name from allPrograms first
                            const actualProgramName = p.name || p.programName || `Program ID: ${p.programId}`;

                            // Use a fallback for display name from the program courses data
                            const fallbackDisplayName = program.programName || program.firstCourse || `Program ID: ${program.programId}`;

                            console.log(`Found match: "${programName}" is an alternative name for "${actualProgramName}"`);

                            // If names don't match, provide additional info
                            if (actualProgramName !== fallbackDisplayName) {
                                console.log(`(Note: Program course data shows this as "${fallbackDisplayName}")`);
                            }

                            return program;
                        }
                    }
                }
            }
        }

        return program;
    }

    function showProgramWarning(unmatchedPrograms, cplProgramsWithEmptyCourses = []) {
        // Create warning element
        const warningEl = document.createElement('div');
        warningEl.className = 'warning-message';

        // Build warning content
        let warningContent = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center;">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 10px;  color: #d32f2f; font-size: 20px;"></i>
                    <div>
                        <p style="margin: 0; font-weight: bold; color: #d32f2f;">Warning: Program/Course issues detected</p>
                    </div>
                </div>
                <button id="closeWarning" style="background: none; border: none; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="margin-top: 10px;">
        `;

        // Add unmatched programs warning if needed
        if (unmatchedPrograms && unmatchedPrograms.length > 0) {
            warningContent += `
                <p style="margin: 5px 0 0 0;">The following programs do not match any entries in the database. Students with these programs will be skipped during activation.</p>
                <ul style="margin: 5px 0 0 25px; padding: 0;">
                    ${unmatchedPrograms.map(program => `<li>${program}</li>`).join('')}
                </ul>
            `;
        }

        // Add CPL programs with empty courses warning if needed
        if (cplProgramsWithEmptyCourses && cplProgramsWithEmptyCourses.length > 0) {
            warningContent += `
                <p style="margin: ${unmatchedPrograms && unmatchedPrograms.length > 0 ? '15px' : '5px'} 0 0 0;">
                    <strong>CPL students with these programs do not have any program schedule:</strong>
                </p>
                <ul style="margin: 5px 0 0 25px; padding: 0;">
                    ${cplProgramsWithEmptyCourses.map(program => `<li>${program}</li>`).join('')}
                </ul>
                <p style="margin: 5px 0 0 0; color: #d32f2f;">
                    <strong>CPL students with these programs will be skipped during activation.</strong>
                </p>
            `;
        }

        warningContent += '</div>';
        warningEl.innerHTML = warningContent;

        // Insert at the top of the table container
        const container = document.getElementById('tableContainer');
        container.insertBefore(warningEl, container.firstChild);

        // Remove the code that disables the activation button
        // const firstCourseActivatorButton = document.getElementById('startActivationBtn');
        // if (firstCourseActivatorButton) {
        //     firstCourseActivatorButton.disabled = true;
        // }

        // Add close handler
        document.getElementById('closeWarning').addEventListener('click', () => {
            warningEl.remove();
        });
    }

    function displayInitialTable(students) {
        const container = document.getElementById('list-container');
        container.innerHTML = `
        <div class="action-buttons">
            <button id="startActivationBtn" class="action-btn">
                <i class="fas fa-play"></i> Start Activation
            </button>
            <button id="bulkSendHDBtn" class="action-btn secondary-btn" disabled>
                <i class="fas fa-paper-plane" style="color: white;"></i> Send All HD Requests
            </button>
            <button id="downloadActivationResults" class="action-btn">
                <i class="fas fa-download"></i> Download Results
            </button>
        </div>
        <div class="search-container">
            <input type="text" id="tableSearch" class="search-input" placeholder="Search...">
            <i class="fas fa-search search-icon"></i>
        </div>
    `;

        // Add search functionality
        const searchInput = document.getElementById('tableSearch');
        searchInput.addEventListener('input', function (e) {
            const searchText = e.target.value.toLowerCase();
            document.querySelectorAll('tbody tr').forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchText) ? '' : 'none';
            });
        });

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const columns = [
            'Student Name', 'V-number', 'Email Address', 'Program Name',
            'CPL', '1st Course', '2nd Course', 'Adt. Courses', 'Status', 'Actions'
        ];

        // Create header
        thead.innerHTML = `<tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>`;

        // Create rows with loading placeholders for course data
        tbody.innerHTML = students.map((student, index) => {
            // Try to get name from combined Fullname field first, then try to combine First Name + Last Name
            let fullname = '';

            if (student['Fullname']) {
                fullname = formatName(student['Fullname']);
            } else {
                // Try to find First Name and Last Name columns (case insensitive)
                const firstNameKey = Object.keys(student).find(key =>
                    key.toLowerCase().includes('first') && key.toLowerCase().includes('name')
                );
                const lastNameKey = Object.keys(student).find(key =>
                    key.toLowerCase().includes('last') && key.toLowerCase().includes('name')
                );

                const firstName = firstNameKey ? student[firstNameKey] : '';
                const lastName = lastNameKey ? student[lastNameKey] : '';

                // Combine first and last name
                if (firstName && lastName) {
                    fullname = formatName(`${firstName} ${lastName}`);
                } else if (firstName) {
                    fullname = formatName(firstName);
                } else if (lastName) {
                    fullname = formatName(lastName);
                } else {
                    fullname = 'Name not found';
                }
            }

            const program = student['Program Name'] || 'Program not found';
            const programName = program;
            const vNumber = student['V-number'] || 'V-Number not found';
            const email = cleanEmail(student['Email Address'] || 'Email not found');
            const cpl = student['CPL'] || '-';

            return `
        <tr data-program="${programName}">
            <td id="student-name">${fullname}</td>
            <td id="v-number">${vNumber}</td>
            <td id="email">${email}</td>
            <td id="program-name">${programName}</td>
            <td id="cpl-value" style="width:30px">${cpl}</td>
            <td id="first-course" class="course-data">Loading...</td>
            <td id="second-course" class="course-data">Loading...</td>
            <td id="additional-course" class="course-data">Loading...</td>
            <td id="additional-status" class="status-cell">-</td>
            <td style="text-align:center; width:65px">
                <button class="launch-btn" 
                    data-vnumber="${vNumber}" 
                    data-email="${email}"
                    title="Open Launch Page">
                    <i class="fas fa-paper-plane" style="color:white"></i>
                </button>
                <button class="send-hd-btn"
                    data-fullname="${fullname}"
                    data-program="${programName}" 
                    data-vnumber="${vNumber.trim()}" 
                    data-email="${email}" 
                    disabled
                    title="Send HD Request">
                    <i class="fas fa-paper-plane" style="color:white"></i>
                </button>
            </td>
        </tr>`;
        }).join('');

        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.innerHTML = '';
        table.className = 'data-table';
        tableContainer.appendChild(table);

        // Add launch button handlers
        initializeDownloadResults();
        addLaunchHandlers();

        // Load and apply program data
        loadProgramData().then(() => {
            initializeStartActivation();
            initializeHDButtons();
            updateBulkHDButtonState();
        });
    }

    function formatName(name) {
        if (!name) return '';
        // Remove Mr, Mrs, Ms and multiple spaces
        return name.replace(/^(?:Mrs|Mr|Ms|Miss)(?:\s*\.)?\s*/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function cleanEmail(email) {
        if (!email) return '';
        // Remove non-ascii characters like Â and trim spaces
        return email.replace(/[^\x00-\x7F]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function initializeStartActivation() {
        const startBtn = document.getElementById('startActivationBtn');
        if (!startBtn) return;

        let downloadInProgress = false;
        let processingActive = false; // Flag to track process status
        let cancelRequested = false;  // Cancellation request status
        let currentProgress = { completed: 0, total: 0 }; // Track progress counters

        // Add Refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'refreshPageBtn';
        refreshBtn.className = 'action-btn refresh-btn';
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        refreshBtn.title = 'Clear data and refresh page';

        // Add the Refresh button next to the Start Activation button
        if (startBtn.parentNode) {
            startBtn.parentNode.insertBefore(refreshBtn, startBtn.nextSibling);
        }

        // Click handler for Refresh button
        refreshBtn.addEventListener('click', function () {
            ErrorHandler.showCustomConfirm('This will clear all data and reset the page. Continue?', 'Confirm Reset')
                .then(result => {
                    if (result) {
                        // Clear table container
                        const tableContainer = document.getElementById('tableContainer');
                        if (tableContainer) {
                            tableContainer.innerHTML = '';
                        }

                        // Initialize the page
                        const container = document.getElementById('list-container');
                        if (container) {
                            container.innerHTML = `
                                <div class="action-buttons">
                                    <button id="startActivationBtn" class="action-btn">
                                        <i class="fas fa-play"></i> Start Activation
                                    </button>
                                </div>
                            `;
                        }

                        // Reset file input field
                        const fileInput = document.getElementById('excelFile');
                        if (fileInput) {
                            fileInput.value = '';
                        }

                        // Reload the page
                        location.reload();
                    }
                });
        });

        startBtn.addEventListener('click', async () => {
            const tbody = document.querySelector('tbody');
            if (!tbody || !tbody.rows.length) return;

            // If the process is already active and the button is clicked again, request cancellation
            if (processingActive && !cancelRequested) {
                cancelRequested = true;
                // Keep showing the progress in the button but add a cancel indicator
                const percentage = Math.round((currentProgress.completed / currentProgress.total) * 100);
                startBtn.innerHTML = `<i class="fas fa-ban"></i> Cancelling (${currentProgress.completed}/${currentProgress.total}, ${percentage}%)`;
                startBtn.classList.add('cancel-in-progress');
                return;
            }

            // If the process was cancelled or completed, start a new process
            if (!processingActive) {
                processingActive = true;
                cancelRequested = false;
                startBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Processing';
                startBtn.classList.add('cancel-btn');
                startBtn.classList.remove('cancel-in-progress');

                // Reset progress counters
                currentProgress = { completed: 0, total: 0 };
            }

            try {
                const rows = Array.from(tbody.rows);
                currentProgress.total = rows.length; // Set total number of rows

                for (const [index, row] of rows.entries()) {
                    const statusCells = row.querySelectorAll('.status-cell');

                    if (cancelRequested) {
                        console.log("Process cancelled by user");
                        break;
                    }

                    currentProgress.completed = index; // Update current progress

                    const launchBtn = row.querySelector('.launch-btn');
                    if (!launchBtn) continue;

                    // Check if this program should be skipped BEFORE any processing
                    const programNameCell = row.querySelector('#program-name');
                    const programName = programNameCell ? programNameCell.textContent.trim() : '';

                    // Check if program exists in database
                    const programData = findMatchingProgram(programName, allProgramCourses);

                    if (!programData || programName === 'Program not found') {
                        // Skip this student and mark as skipped
                        statusCells.forEach(cell => {
                            cell.textContent = 'Skipped: Program not found in database';
                        });
                        launchBtn.innerHTML = '<i class="fas fa-minus-circle"></i>';
                        launchBtn.disabled = true;

                        // Update progress and continue to next student
                        currentProgress.completed = index + 1;
                        const percentage = Math.round((currentProgress.completed / currentProgress.total) * 100);

                        if (cancelRequested) {
                            startBtn.innerHTML = `<i class="fas fa-ban"></i> Cancelling (${currentProgress.completed}/${currentProgress.total}, ${percentage}%)`;
                        } else {
                            startBtn.innerHTML = `<i class="fas fa-stop"></i> Stop (${currentProgress.completed}/${currentProgress.total}, ${percentage}%)`;
                        }
                        continue;
                    }

                    // Check if this is a CPL student with empty courses
                    const cplCell = row.querySelector('#cpl-value');
                    const isCPL = cplCell && cplCell.textContent && cplCell.textContent.trim().toLowerCase() === 'yes';

                    if (isCPL && (!programData.courses || programData.courses.length === 0)) {
                        // Skip CPL student with empty course schedule
                        statusCells.forEach(cell => {
                            cell.textContent = 'Skipped: CPL program has no course schedule';
                        });
                        launchBtn.innerHTML = '<i class="fas fa-minus-circle"></i>';
                        launchBtn.disabled = true;

                        // Update progress and continue to next student
                        currentProgress.completed = index + 1;
                        const percentage = Math.round((currentProgress.completed / currentProgress.total) * 100);

                        if (cancelRequested) {
                            startBtn.innerHTML = `<i class="fas fa-ban"></i> Cancelling (${currentProgress.completed}/${currentProgress.total}, ${percentage}%)`;
                        } else {
                            startBtn.innerHTML = `<i class="fas fa-stop"></i> Stop (${currentProgress.completed}/${currentProgress.total}, ${percentage}%)`;
                        }
                        continue;
                    }

                    launchBtn.disabled = true;
                    launchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                    // Get CPL value from row
                    // const cplCell = row.querySelector('#cpl-value'); // This is already defined above
                    // const isCPL = cplCell && cplCell.textContent && cplCell.textContent.trim().toLowerCase() === 'yes'; // This is already defined above

                    // Get program name and find matching program data for CPL students
                    let finalProgramData = null;
                    if (isCPL) {
                        // We already have programData from above validation
                        finalProgramData = programData;
                    }

                    const response = await chrome.runtime.sendMessage({
                        action: 'getCourseDetails', // Önce HTML çek
                        data: {
                            vNumber: launchBtn.dataset.vnumber,
                            student: {
                                aolcc_email: launchBtn.dataset.email,
                                aolcc_first_name: '', // Bu bilgiler varsa ekle
                                aolcc_last_name: ''
                            }
                        }
                    });

                    if (response && response.success && response.data) {
                        // HTML'i parse et
                        const parseResult = DataService.parseUserDetailsFromHtml(response.data);

                        if (parseResult.success) {
                            const handlerResult = await new Promise((resolve) => {
                                DataService.courseActivationHandler({
                                    data: parseResult.data,
                                    courseCodes: [
                                        launchBtn.dataset.firstCode,
                                        launchBtn.dataset.secondCode,
                                        launchBtn.dataset.additionalCode
                                    ].filter(code => code),
                                    contractCode: launchBtn.dataset.vnumber,
                                    isCPL: isCPL,
                                    programData: finalProgramData,
                                    useNextMonday: true
                                }, resolve);
                            });

                            const activationResponse = await chrome.runtime.sendMessage({
                                action: 'courseActivation',
                                data: handlerResult, 
                                courseCodes: [
                                    launchBtn.dataset.firstCode,
                                    launchBtn.dataset.secondCode,
                                    launchBtn.dataset.additionalCode
                                ].filter(code => code),
                                contractCode: launchBtn.dataset.vnumber,
                                isCPL: isCPL,
                                programData: finalProgramData,
                                useNextMonday: true
                            });

                            const statusCells = row.querySelectorAll('.status-cell');
                            if (activationResponse?.success) {
                                const messages = [...new Set(activationResponse.messages || [])].join(', ');
                                statusCells.forEach(cell => {
                                    cell.textContent = messages || 'Activation successful';
                                });

                                if (messages.includes('error') || messages.includes('Error')) {
                                    launchBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                                } else {
                                    launchBtn.innerHTML = '<i class="fas fa-check"></i>';
                                }
                                launchBtn.disabled = false;

                                const hdButton = row.querySelector('.send-hd-btn');

                                if (hdButton &&
                                    !messages.includes('Courses list updated successfully') &&
                                    !messages.includes('CPL Activation: Courses list updated successfully') &&
                                    !messages.includes('No inactive courses found for CPL student')) {

                                    hdButton.disabled = false;
                                    console.log(`Enabling HD button for student: ${hdButton.dataset.fullname} - No success messages found`);
                                }
                            } else {
                                statusCells.forEach(cell => {
                                    const statusText = activationResponse?.loginError ?
                                        'Login failed: ' + activationResponse.message :
                                        'Error: Activation failed. Please check V-Number and Email.';
                                    cell.textContent = statusText;
                                });
                                launchBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                                launchBtn.disabled = false;
                            }
                        } else {
                            statusCells.forEach(cell => {
                                cell.textContent = 'Error: Failed to parse student data';
                            });
                        }
                    } else {
                        console.log('Failed to get student data:', response);
                        statusCells.forEach(cell => {
                            const errorMessage = response?.message || response?.error || 'Failed to get student data';
                            cell.textContent = `Error: ${errorMessage}`;
                        });

                        launchBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                        launchBtn.disabled = false;
                        continue;
                    }

                    currentProgress.completed = index + 1;
                    const percentage = Math.round((currentProgress.completed / currentProgress.total) * 100);

                    if (cancelRequested) {
                        startBtn.innerHTML = `<i class="fas fa-ban"></i> Cancelling (${currentProgress.completed}/${currentProgress.total}, ${percentage}%)`;
                    } else {
                        startBtn.innerHTML = `<i class="fas fa-stop"></i> Stop (${currentProgress.completed}/${currentProgress.total}, ${percentage}%)`;
                    }
                }

                updateBulkHDButtonState();

            } catch (error) {
                startBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
            } finally {
                processingActive = false;

                if (cancelRequested) {
                    const percentage = Math.round((currentProgress.completed / currentProgress.total) * 100);
                    startBtn.innerHTML = `<i class="fas fa-play"></i> Cancelled (${currentProgress.completed}/${currentProgress.total}, ${percentage}%)`;
                    startBtn.classList.remove('cancel-btn');
                    startBtn.classList.remove('cancel-in-progress');
                    cancelRequested = false;
                } else {
                    startBtn.classList.remove('cancel-btn');
                    startBtn.classList.remove('cancel-in-progress');
                    startBtn.innerHTML = '<i class="fas fa-play"></i> Start Activation';

                    setTimeout(() => {
                        if (!downloadInProgress && !cancelRequested) {
                            downloadInProgress = true;

                            if (currentProgress.completed === currentProgress.total) {
                                document.getElementById('downloadActivationResults').click();
                                setTimeout(() => {
                                    downloadInProgress = false;
                                }, 3000);
                            }
                        }
                    }, 1000);
                }
            }
        });

        initializeBulkHDRequests();
    }

    function initializeHDButtons() {
        chrome.runtime.sendMessage({
            action: "helpDeskLogin"
        }, function (loginResponse) {
            console.log("Help desk login attempt:", loginResponse.success ? "successful" : "failed");

            document.querySelectorAll('.send-hd-btn').forEach(btn => {
                btn.addEventListener('click', async function (e) {
                    e.preventDefault();

                    try {
                        this.disabled = true;
                        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                        const { subject, description } = generateHDRequestContent(this);

                        const modal = document.getElementById('confirmModal');
                        const modalSubject = document.getElementById('modalSubject');
                        const modalDescription = document.getElementById('modalDescription');

                        modalSubject.textContent = subject;
                        modalDescription.value = description;
                        modal.style.display = 'block';

                        const hdButton = this;

                        document.getElementById('cancelRequest').onclick = () => {
                            modal.style.display = 'none';
                            hdButton.disabled = false;
                            hdButton.innerHTML = '<i class="fas fa-paper-plane" style="color:white"></i>';
                            updateBulkHDButtonState();
                        };

                        document.getElementById('confirmRequest').onclick = async () => {
                            modal.style.display = 'none';

                            hdButton.disabled = true;
                            hdButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                            try {
                                const result = await submitHDRequest(subject, modalDescription.value, hdButton);

                                if (result.success) {
                                    hdButton.innerHTML = '<i class="fas fa-check"></i>';
                                    hdButton.disabled = true;

                                    const vNumber = hdButton.dataset.vnumber;
                                    if (attemptedCplActivations[vNumber]) {
                                        console.log(`Clearing CPL activation list for ${vNumber}: ${attemptedCplActivations[vNumber].join(', ')}`);
                                        delete attemptedCplActivations[vNumber]; // Öğrenciye ait liste kaydını sil
                                    }
                                } else {
                                    throw new Error(result.error || 'Failed to submit help desk request');
                                }
                            } catch (error) {
                                console.log(error, 'HD Request individual confirmRequest');
                                hdButton.disabled = false;
                                hdButton.innerHTML = '<i class="fas fa-paper-plane" style="color:white"></i>';
                                ErrorHandler.showCustomAlert('Error sending help desk request: ' + error.message, 'error');
                            }

                            updateBulkHDButtonState();
                        };

                    } catch (error) {
                        console.log(error, 'HD Request individual button click');
                        this.disabled = false;
                        this.innerHTML = '<i class="fas fa-paper-plane" style="color:white"></i>';
                        ErrorHandler.showCustomAlert('Error sending help desk request: ' + error.message, 'error');
                        updateBulkHDButtonState();
                    }
                });
            });

            updateBulkHDButtonState();
        });
    }

    function initializeBulkHDRequests() {
        const bulkSendButton = document.getElementById('bulkSendHDBtn');
        if (!bulkSendButton) return;

        bulkSendButton.disabled = true;

        bulkSendButton.addEventListener('click', async () => {
            const activeHDButtons = document.querySelectorAll('.send-hd-btn:not([disabled])');

            if (activeHDButtons.length === 0) {
                ErrorHandler.showCustomAlert('No help desk requests to send.', 'info');
                return;
            }

            ErrorHandler.showCustomConfirm(`Send ${activeHDButtons.length} help desk requests?`, 'Confirm Bulk HD Requests')
                .then(result => {
                    if (!result) {
                        return;
                    }

                    bulkSendButton.disabled = true;
                    bulkSendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

                    let successCount = 0;
                    let failCount = 0;

                    (async () => {
                        for (let i = 0; i < activeHDButtons.length; i++) {
                            const button = activeHDButtons[i];

                            bulkSendButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing ${i + 1}/${activeHDButtons.length}`;

                            try {
                                const { subject, description } = generateHDRequestContent(button);

                                const result = await submitHDRequest(subject, description, button);

                                if (result.success) {
                                    successCount++;
                                    button.innerHTML = '<i class="fas fa-check"></i>';
                                    button.disabled = true;

                                    const vNumber = button.dataset.vnumber;
                                    if (attemptedCplActivations[vNumber]) {
                                        console.log(`Clearing CPL activation list for ${vNumber} in bulk: ${attemptedCplActivations[vNumber].join(', ')}`);
                                        delete attemptedCplActivations[vNumber];
                                    }
                                } else {
                                    failCount++;
                                    button.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                                }

                                await new Promise(resolve => setTimeout(resolve, 500));

                            } catch (error) {
                                console.log(error, `Bulk HD Request for ${button.dataset.vnumber}`);
                                failCount++;
                                button.innerHTML = '<i class="fas fa-times"></i>';
                            }
                        }

                        updateBulkHDButtonState();

                        ErrorHandler.showCustomAlert(`Bulk HD Requests: ${successCount} successful, ${failCount} failed.`, failCount > 0 ? 'Warning' : 'Success');
                    })();
                });
        });
    }

    function updateBulkHDButtonState() {
        const bulkSendButton = document.getElementById('bulkSendHDBtn');
        if (bulkSendButton) {
            const activeHDButtons = document.querySelectorAll('.send-hd-btn:not([disabled])');
            bulkSendButton.disabled = activeHDButtons.length === 0;

            if (activeHDButtons.length > 0) {
                bulkSendButton.innerHTML = `<i class="fas fa-paper-plane" style="color: white;"></i> Send ${activeHDButtons.length} HD Request${activeHDButtons.length > 1 ? 's' : ''}`;
            } else {
                bulkSendButton.innerHTML = `<i class="fas fa-paper-plane" style="color: white;"></i> Send All HD Requests`;
            }
        }
    }

    function addLaunchHandlers() {
        document.querySelectorAll('.launch-btn').forEach(btn => {
            btn.onclick = async function () {
                const tr = this.closest('tr');
                const programName = tr.querySelector('td:nth-child(3)');
                const firstCourseCell = tr.querySelector('td:nth-child(4)');
                const firstCourseDateCell = tr.querySelector('td:nth-child(5)');
                const secondCourseCell = tr.querySelector('td:nth-child(7)');
                const secondCourseDateCell = tr.querySelector('td:nth-child(8)');
                const additionalCourseCell = tr.querySelector('td:nth-child(10)');
                const additionalCourseDateCell = tr.querySelector('td:nth-child(11)');

                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                try {
                    const response = await chrome.runtime.sendMessage({
                        action: 'launchStudentManager',
                        data: {
                            vNumber: this.dataset.vnumber,
                            email: this.dataset.email,
                        }
                    });

                    if (response?.success) {
                        this.innerHTML = '<i class="fas fa-check"></i>';

                        if (response.courseData) {
                            const program = programData.find(p =>
                                String(p['Program Name']).trim() === programName
                            );

                            if (program) {
                                const results = updateCourseResults(
                                    response.courseData,
                                    program['1st Course Code'],
                                    program['2nd Course Code'],
                                    program['Additional Course Code']
                                );

                                firstCourseCell.textContent = results.firstCourseStatus;
                                firstCourseDateCell.textContent = results.firstCourseDate;
                                secondCourseCell.textContent = results.secondCourseStatus;
                                secondCourseDateCell.textContent = results.secondCourseDate;
                                additionalCourseCell.textContent = results.additionalCourseStatus;
                                additionalCourseDateCell.textContent = results.additionalCourseDate;
                            }
                        }
                    } else {
                        this.innerHTML = '<i class="fas fa-times"></i>';
                        this.disabled = false;
                    }
                } catch (error) {
                    console.log(error, `Launch button for ${this.dataset.vnumber}`);
                    this.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                    this.disabled = false;
                }
            };
        });
    }

    function generateHDRequestContent(button) {
        // Get basic info from button
        const fullname = button.dataset.fullname;
        const program = button.dataset.program;

        // Get row and v-number directly from DOM
        const rowElement = button.closest('tr');
        const vNumberCell = rowElement ? rowElement.querySelector('#v-number') : null;
        const vNumber = vNumberCell ? vNumberCell.textContent.trim() : button.dataset.vnumber;

        // Create subject line
        const subject = `${fullname} - ${vNumber} - ${program}`;

        // Check if this is a CPL student
        const cplCell = rowElement ? rowElement.querySelector('#cpl-value') : null;
        const isCPL = cplCell && cplCell.textContent &&
            cplCell.textContent.trim().toLowerCase() === 'yes';

        let courses;

        // For CPL students, use saved activation attempts
        if (isCPL) {
            const activationAttempts = attemptedCplActivations[vNumber];

            if (Array.isArray(activationAttempts) && activationAttempts.length > 0) {
                courses = activationAttempts.join(', ').replace(/,([^,]*)$/, ' and$1');
                console.log(`Using ${activationAttempts.length} CPL courses for ${vNumber}: ${courses}`);
            } else {
                console.log(`No CPL activation attempts found for ${vNumber}, using standard courses`);
            }
        }

        // If no CPL courses found, use standard course codes
        if (!courses) {
            const firstCode = button.dataset.firstCode;
            const secondCode = button.dataset.secondCode;
            const additionalCode = button.dataset.additionalCode;

            const courseCodes = [firstCode, secondCode, additionalCode].filter(code => code);

            if (courseCodes.length === 1) {
                courses = courseCodes[0];
            } else if (courseCodes.length === 2) {
                courses = `${courseCodes[0]} and ${courseCodes[1]}`;
            } else if (courseCodes.length > 2) {
                courses = courseCodes.slice(0, -1).join(', ') + ' and ' + courseCodes[courseCodes.length - 1];
            } else {
                courses = '';
            }
        }

        // Create help desk description
        const description = `Hello.\n\nPlease activate the course '${courses}' with extra charge on the above student account. Kindly remove marks from previous contract so they do not transfer automatically with the new activation.\n\nThank you`;

        return { subject, description };
    }

    async function submitHDRequest(subject, description, button) {
        try {
            // Fetch NEW_REQUEST page
            const newRequestResponse = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: "helpDeskContent",
                    url: HELPDESK_CONFIG.URLS.NEW_REQUEST,
                    method: "GET"
                }, resolve);
            });

            if (!newRequestResponse.success) {
                throw new Error('Failed to fetch help desk page');
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(newRequestResponse.content, 'text/html');

            // Get form state values
            const viewState = doc.querySelector('#__VIEWSTATE')?.value;
            const viewStateGenerator = doc.querySelector('#__VIEWSTATEGENERATOR')?.value;
            const eventValidation = doc.querySelector('#__EVENTVALIDATION')?.value;

            const name = doc.getElementById('txtName')?.value.trim();
            const email = doc.getElementById('txtEmailAddress')?.value.trim();

            if (!name || !email || !viewState || !viewStateGenerator || !eventValidation) {
                console.log('Missing form state values from HelpDesk NewRequest page', 'submitHDRequest');
                throw new Error('Failed to get user information from Help Desk page. Ensure you are logged in.');
            }

            // Prepare form data
            const formData = {
                __VIEWSTATE: viewState,
                __VIEWSTATEGENERATOR: viewStateGenerator,
                __EVENTVALIDATION: eventValidation,
                ddlPriority: 2,
                txtName: name,
                txtEmailAddress: email,
                ddlCategory: 1,
                txtSubject: subject,
                txtDescription: description
            };

            // Send POST request
            console.log('Sending form data to background script');
            const result = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: "helpDeskContent",
                    url: HELPDESK_CONFIG.URLS.NEW_REQUEST,
                    method: "POST",
                    data: formData
                }, resolve);
            });

            return { success: result.success };
        } catch (error) {
            // Error is already logged by the caller usually, or here if it's specific to this function's direct logic
            // console.log(error, 'submitHDRequest'); // This might be too noisy if caller also logs.
            return { success: false, error: error.message };
        }
    }

    function initializeDownloadResults() {
        const downloadActivations = document.getElementById('downloadActivationResults');

        let downloadActivationsInProgress = false;

        const handleDownload = (tableSelector, fileName, inProgressFlag, setInProgressFlag) => {
            // Prevent duplicate downloads
            if (inProgressFlag) return;
            setInProgressFlag(true);

            const tbody = document.querySelector(tableSelector);
            if (!tbody || !tbody.rows.length) {
                ErrorHandler.showCustomAlert('No data to download.', 'info');
                setInProgressFlag(false);
                return;
            }

            const rows = Array.from(tbody.rows);

            const columns = [
                'Fullname',
                'V-number',
                'Email Address',
                'Program Name',
                'CPL',
                '1st Course',
                '2nd Course',
                'Adt. Course',
                'Status'
            ];

            const data = rows.map(row => {
                const rowData = {};
                columns.forEach(column => {
                    try {
                        switch (column) {
                            case 'Fullname': rowData[column] = row.querySelector('#student-name')?.textContent || ''; break;
                            case 'V-number': rowData[column] = row.querySelector('#v-number')?.textContent || ''; break;
                            case 'Email Address': rowData[column] = row.querySelector('#email')?.textContent || ''; break;
                            case 'Program Name': rowData[column] = row.querySelector('#program-name')?.textContent || ''; break;
                            case 'CPL': rowData[column] = row.querySelector('#cpl-value')?.textContent || ''; break;
                            case '1st Course': rowData[column] = row.querySelector('#first-course')?.textContent || ''; break;
                            case '2nd Course': rowData[column] = row.querySelector('#second-course')?.textContent || ''; break;
                            case 'Adt. Course': rowData[column] = row.querySelector('#additional-course')?.textContent || ''; break;
                            case 'Status': rowData[column] = row.querySelector('#additional-status')?.textContent || ''; break;
                        }
                    } catch (error) {
                        console.warn(`Error accessing column ${column}:`, error);
                        rowData[column] = '';
                    }
                });
                return rowData;
            });

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(link.href);
            setTimeout(() => {
                setInProgressFlag(false);
            }, 1000);
        };

        const now = new Date();
        const timestamp = `${new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).replace(/[/:]/g, '-').replace(',', '')}`;

        if (downloadActivations) {
            downloadActivations.addEventListener('click', () => {
                handleDownload(
                    '#tableContainer tbody',
                    `Course_Activation_Results_${timestamp}.xlsx`,
                    downloadActivationsInProgress,
                    (value) => { downloadActivationsInProgress = value; }
                );
            });
        }
    }

});