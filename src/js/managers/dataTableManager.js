class DataTableManager {
    static processExcelFile(blob, tableContainer, loadingDiv) {
        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                // Update status: Parsing Excel
                HelperFunctions.setButtonLoadingState(loadingDiv, true, 'fa-spinner', 0, 'Parsing Excel file structure...');
                // Parse Excel file with optimized settings
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {
                    type: 'array',
                    cellDates: true,
                    dateNF: 'yyyy-mm-dd'
                });

                // Update status: Extracting data
                HelperFunctions.setButtonLoadingState(loadingDiv, true, 'fa-spinner', 0, 'Extracting attendance records...');

                // Get first worksheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Always treat it as attendance data since we're in the attendance page
                const isAttendanceData = true;

                // Convert to JSON with optimized settings
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    raw: false,
                    dateNF: 'yyyy-mm-dd',
                    defval: '' // Default empty string for missing cells
                });

                if (!jsonData || jsonData.length === 0) {
                    loadingDiv.className = 'alert alert-warning';
                    loadingDiv.innerHTML = 'No attendance data available.';
                    tableContainer.classList.remove('loading');
                    return;
                }

                // Update status: Processing data
                HelperFunctions.setButtonLoadingState(loadingDiv, true, 'fa-spinner', 0, 'Processing attendance records (' + jsonData.length + ' entries)...');

                // Process data in chunks to avoid memory spikes
                DataTableManager.processDataInChunks(jsonData, tableContainer, loadingDiv, isAttendanceData);

            } catch (error) {
                console.error('Error processing Excel data:', error);
                loadingDiv.className = 'alert alert-danger';
                loadingDiv.innerHTML = 'Error processing attendance data: ' + error.message;
                tableContainer.classList.remove('loading');
            }
        };

        // Update status: Reading file
        HelperFunctions.setButtonLoadingState(loadingDiv, true, 'fa-spinner', 0, 'Reading data and creating new tables...');
        reader.readAsArrayBuffer(blob);
    }

    static processDataInChunks(jsonData, tableContainer, loadingDiv, isAttendanceData) {
        // Process and normalize data - avoid creating unnecessary objects
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];

            // Format dates consistently
            if (row["Start Date"]) {
                row["Start Date"] = HelperFunctions.formatDateString(row["Start Date"]);
            }

            if (row["Date"]) {
                row["Date"] = HelperFunctions.formatDateString(row["Date"]);
            }

            // Ensure all required fields exist
            if (!row["Total Time"]) row["Total Time"] = "00:00:00";
            if (!row["Status"]) row["Status"] = "";
            if (!row["Continue Class"]) row["Continue Class"] = "";
        }

        const initialTotalHours = HelperFunctions.calculateTotalHours(jsonData);

        // Remove existing table and DataTable instance
        const oldTable = tableContainer.querySelector('table');
        if (oldTable) {
            if ($.fn.DataTable.isDataTable(oldTable)) {
                $(oldTable).DataTable().destroy();
            }
            oldTable.remove();
        }

        // Create the top control section with search and download button
        const controlSection = document.createElement('div');
        controlSection.className = 'attendance-controls';
        controlSection.innerHTML = `
            <div class="total-hours-display">
                <strong>Total Hours: <span id="totalHoursValue">${initialTotalHours}</span></strong>
            </div>
            <div class="attendance-search-box">
                <input type="text" id="attendanceGlobalSearch" class="form-control" placeholder="Search by Name, VNumber or Email...">
                <button type="button" class="search-button"><i class="fas fa-search"></i></button>
            </div>
        `;

        tableContainer.parentNode.insertBefore(controlSection, tableContainer);

        // Create new table
        const newTable = document.createElement('table');
        newTable.id = 'enhanced-attendance-table';
        newTable.className = 'table-bordered table-hover table-sm';
        tableContainer.appendChild(newTable);

        // Create and configure DataTable with optimized settings
        const table = $(newTable).DataTable({
            data: jsonData,
            columns: [
                { title: "Student Name", data: "Student Name" },
                { title: "VNumber", data: "VNumber" },
                { title: "Start Date", data: "Start Date" },
                { title: "Email Id", data: "Email Id" },
                { title: "Day", data: "Day" },
                { title: "Date", data: "Date" },
                { title: "Signin Time", data: "Signin Time" },
                { title: "Signout Time", data: "Signout Time" },
                { title: "Total Time", data: "Total Time" },
                { title: "Status", data: "Status" },
                { title: "Continue Class", data: "Continue Class" }
            ],
            responsive: true,
            pageLength: 50,
            lengthMenu: [[50, 100, 250, 500, -1], [50, 100, 250, 500, "All"]],
            ordering: true,
            deferRender: true,           // Optimize rendering for large datasets
            scroller: true,              // Enable virtual scrolling
            scrollY: '50vh',             // Set scroll height
            scrollCollapse: true,        // Enable scroll collapse
            searching: true,
            searchDelay: 400,            // Increase delay to reduce processing frequency
            dom: '<"attendance-table-wrapper"<"attendance-table-info"li>p>rt<"attendance-table-bottom"p>',
            language: {
                search: "",
                lengthMenu: "Show _MENU_ entries",
                paginate: {
                    first: '<i class="fas fa-angle-double-left"></i>',
                    last: '<i class="fas fa-angle-double-right"></i>',
                    next: '<i class="fas fa-angle-right"></i>',
                    previous: '<i class="fas fa-angle-left"></i>'
                },
                info: "Showing _START_ to _END_ of _TOTAL_ entries"
            },
            initComplete: function (settings, json) {
                // Access the DataTable API
                var api = this.api();

                // Hide the default search box
                $('.dataTables_filter').hide();

                // Add global search functionality with debounce
                let searchTimeout;
                $('#attendanceGlobalSearch').on('keyup', function () {
                    clearTimeout(searchTimeout);
                    const searchValue = this.value;

                    searchTimeout = setTimeout(() => {
                        api.search(searchValue).draw();
                        updateTotalHours();
                    }, 300);
                });

                // Search button click handler
                $('.search-button').on('click', function () {
                    const searchValue = $('#attendanceGlobalSearch').val();
                    api.search(searchValue).draw();
                    updateTotalHours();
                });

                // Function to update total hours
                function updateTotalHours() {
                    // Use DataTables API to get filtered data efficiently
                    const filteredData = api.rows({ search: 'applied' }).data().toArray();
                    const filteredTotalHours = HelperFunctions.calculateTotalHours(filteredData);
                    $('#totalHoursValue').text(filteredTotalHours);
                }

                // Add event listener for table events to update total hours
                api.on('length.dt page.dt search.dt', function () {
                    setTimeout(updateTotalHours, 100);
                });

                // Enable the Check Attendance button if it exists
                const checkButton = document.getElementById('checkAttendanceBtn');
                if (checkButton) {
                    // Always enable the button since we know we're on the attendance page
                    checkButton.disabled = false;

                    // Add event listener for the Check Attendance button
                    checkButton.addEventListener('click', function () {
                        DataTableManager.checkAttendanceOverages(api, jsonData);
                    });
                } else {
                    // If button doesn't exist yet, set up an observer to enable it when it appears
                    const buttonObserver = new MutationObserver((mutations, obs) => {
                        const btn = document.getElementById('checkAttendanceBtn');
                        if (btn) {
                            btn.disabled = false;
                            btn.addEventListener('click', function () {
                                DataTableManager.checkAttendanceOverages(api, jsonData);
                            });
                            obs.disconnect();
                        }
                    });

                    buttonObserver.observe(document.body, { childList: true, subtree: true });
                }

                // Remove loading indicator
                loadingDiv.remove();
                tableContainer.classList.remove('loading');
                tableContainer.style.opacity = '1';
            }
        });
    }

    static findAttendanceOverages(data) {
        // Helper function to convert time string to minutes
        function timeToMinutes(timeStr) {
            if (!timeStr) return 0;
            const parts = timeStr.split(':');
            if (parts.length !== 3) return 0;

            return parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60;
        }

        // Helper function to get the Monday of a given date's week
        function getMonday(dateStr) {
            try {
                // Ensure proper date format parsing
                let date;
                if (typeof dateStr === 'string') {
                    // Handle various date formats that might be coming in
                    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        // YYYY-MM-DD format
                        const [year, month, day] = dateStr.split('-');
                        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    } else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                        // MM/DD/YYYY format
                        const [month, day, year] = dateStr.split('/');
                        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    } else {
                        date = new Date(dateStr);
                    }
                } else {
                    date = new Date(dateStr);
                }

                // Validate the date object
                if (isNaN(date.getTime())) {
                    console.error(`Invalid date in getMonday: "${dateStr}"`);
                    return dateStr; // Return the original string if we can't parse it
                }

                // Clone the date to avoid modifying the original
                const result = new Date(date);

                // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
                const day = result.getDay();

                // Calculate how many days to subtract to get to Monday
                const diff = day === 0 ? 6 : day - 1;

                // Set the date to Monday
                result.setDate(result.getDate() - diff);

                // Return formatted as YYYY-MM-DD
                const mondayStr = result.toISOString().split('T')[0];
                return mondayStr;
            } catch (error) {
                console.error(`Error in getMonday function: ${error.message}`, error);
                return dateStr; // Return original string on error
            }
        }

        // Process daily attendance
        const dailyAttendance = {};
        const weeklyAttendance = {};

        // Track duplicate entries (same VNumber, date, and totalTime)
        const dailyDuplicatesMap = new Map();
        const dupeTracker = new Map();

        // Process the data
        data.forEach(row => {
            const student = {
                name: row["Student Name"] || "",
                vNumber: row["VNumber"] || "",
                email: row["Email Id"] || "",
                signInTime: row["Signin Time"] || "",
                signOutTime: row["Signout Time"] || "",
                status: row["Status"] || ""
            };

            const date = HelperFunctions.formatDateString(row["Date"]);
            const totalTimeMinutes = timeToMinutes(row["Total Time"]);
            const totalTime = row["Total Time"] || "";

            if (!date || !student.vNumber) return;

            // Process for duplicates
            const dupeKey = `${student.vNumber}-${date}-${totalTime}`;
            if (!dupeTracker.has(dupeKey)) {
                dupeTracker.set(dupeKey, []);
            }
            dupeTracker.get(dupeKey).push({
                ...student,
                date,
                totalTime,
                totalMinutes: totalTimeMinutes
            });

            // Process daily attendance
            const dailyKey = `${student.vNumber}-${date}`;
            if (!dailyAttendance[dailyKey]) {
                dailyAttendance[dailyKey] = {
                    ...student,
                    date,
                    totalMinutes: 0
                };
            }
            dailyAttendance[dailyKey].totalMinutes += totalTimeMinutes;

            // Process weekly attendance
            const weekStartDate = getMonday(date);
            const weekKey = `${student.vNumber}-${weekStartDate}`;

            if (!weeklyAttendance[weekKey]) {
                const weekEndDate = new Date(weekStartDate);
                weekEndDate.setDate(weekEndDate.getDate() + 6);

                weeklyAttendance[weekKey] = {
                    ...student,
                    weekStart: weekStartDate,
                    weekEnd: weekEndDate.toISOString().split('T')[0],
                    totalMinutes: 0
                };
            }
            weeklyAttendance[weekKey].totalMinutes += totalTimeMinutes;
        });

        let dailyDuplicates = [];
        dupeTracker.forEach((entries, key) => {
            if (entries.length > 1) {
                // Group duplicates by VNumber
                const vNumber = entries[0].vNumber;
                const date = entries[0].date;
                const totalTime = entries[0].totalTime;

                if (!dailyDuplicatesMap.has(vNumber)) {
                    dailyDuplicatesMap.set(vNumber, {
                        studentName: entries[0].name,
                        vNumber: vNumber,
                        email: entries[0].email,
                        duplicateRecords: []
                    });
                }

                // Add this set of duplicates to the VNumber group
                dailyDuplicatesMap.get(vNumber).duplicateRecords.push({
                    date,
                    totalTime,
                    entries: entries.map(entry => ({
                        signInTime: entry.signInTime,
                        signOutTime: entry.signOutTime,
                        status: entry.status
                    }))
                });
            }
        });

        // Convert map to array for display with date and totalTime fields
        dailyDuplicates = Array.from(dailyDuplicatesMap.values()).map(group => {
            // Find the record with the most duplicates to use as the main record
            const mostFrequentRecord = group.duplicateRecords.reduce(
                (prev, current) => (current.entries.length > prev.entries.length ? current : prev),
                group.duplicateRecords[0]
            );

            return {
                studentName: group.studentName,
                vNumber: group.vNumber,
                email: group.email,
                date: mostFrequentRecord.date,
                totalTime: mostFrequentRecord.totalTime,
                duplicatesCount: group.duplicateRecords.reduce((sum, record) => sum + record.entries.length, 0),
                duplicateRecords: group.duplicateRecords
            };
        }).sort((a, b) => b.duplicatesCount - a.duplicatesCount);

        // Find overages (daily > 8 hours, weekly > 40 hours)
        // 8 hours = 480 minutes, 40 hours = 2400 minutes
        // Allow 5 minutes tolerance (5 minutes = 5)
        const dailyLimit = 480 + 5;
        const weeklyLimit = 2400 + 5;

        const dailyOverages = Object.values(dailyAttendance)
            .filter(item => item.totalMinutes > dailyLimit)
            .map(item => ({
                studentName: item.name,
                vNumber: item.vNumber,
                email: item.email,
                day: item.date,
                totalHours: `${Math.floor(item.totalMinutes / 60)}:${Math.round(item.totalMinutes % 60).toString().padStart(2, '0')}`,
                _totalMinutes: item.totalMinutes
            }))
            .sort((a, b) => b._totalMinutes - a._totalMinutes);

        const weeklyOverages = Object.values(weeklyAttendance)
            .filter(item => item.totalMinutes > weeklyLimit)
            .map(item => ({
                studentName: item.name,
                vNumber: item.vNumber,
                email: item.email,
                week: `${item.weekStart} - ${item.weekEnd}`,
                totalHours: `${Math.floor(item.totalMinutes / 60)}:${Math.round(item.totalMinutes % 60).toString().padStart(2, '0')}`,
                _totalMinutes: item.totalMinutes
            }))
            .sort((a, b) => b._totalMinutes - a._totalMinutes);

        return { dailyOverages, weeklyOverages, dailyDuplicates };
    }

    static displayOverageTables(dailyOverages, weeklyOverages, dailyDuplicates = []) {
        const overageContainer = document.getElementById('attendance-overages');
        overageContainer.innerHTML = '';

        // Create main container with responsive design
        const alertContainer = document.createElement('div');
        alertContainer.className = 'alert alert-danger attendance-alert-container';

        // Create wrapper for all tables
        const tablesWrapper = document.createElement('div');
        tablesWrapper.className = 'attendance-tables-wrapper';

        // Daily duplicates section (NOW FIRST)
        const duplicatesSection = document.createElement('div');
        duplicatesSection.className = 'attendance-section duplicates-section';

        const duplicatesTitle = document.createElement('h5');
        duplicatesTitle.textContent = 'Daily Duplicates';
        duplicatesTitle.className = 'attendance-table-title';

        const duplicatesActions = document.createElement('div');
        duplicatesActions.className = 'attendance-table-actions';

        const duplicatesCopyIcon = document.createElement('i');
        duplicatesCopyIcon.className = 'fas fa-copy';
        duplicatesCopyIcon.title = 'Copy table data';

        const duplicatesExcelIcon = document.createElement('i');
        duplicatesExcelIcon.className = 'fas fa-file-excel';
        duplicatesExcelIcon.title = 'Export to Excel';

        duplicatesActions.appendChild(duplicatesCopyIcon);
        duplicatesActions.appendChild(duplicatesExcelIcon);

        duplicatesTitle.appendChild(duplicatesActions);
        duplicatesSection.appendChild(duplicatesTitle);

        const duplicatesTableContainer = document.createElement('div');
        duplicatesTableContainer.className = 'attendance-table-container';
        duplicatesSection.appendChild(duplicatesTableContainer);

        // Daily overages section (NOW SECOND)
        const dailySection = document.createElement('div');
        dailySection.className = 'attendance-section daily-section';

        // Daily table header
        const dailyTitle = document.createElement('h5');
        dailyTitle.textContent = 'Daily Overages';
        dailyTitle.className = 'attendance-table-title';

        // Action buttons for daily table
        const dailyActions = document.createElement('div');
        dailyActions.className = 'attendance-table-actions';

        const dailyCopyIcon = document.createElement('i');
        dailyCopyIcon.className = 'fas fa-copy';
        dailyCopyIcon.title = 'Copy table data';

        const dailyExcelIcon = document.createElement('i');
        dailyExcelIcon.className = 'fas fa-file-excel';
        dailyExcelIcon.title = 'Export to Excel';

        dailyActions.appendChild(dailyCopyIcon);
        dailyActions.appendChild(dailyExcelIcon);

        dailyTitle.appendChild(dailyActions);
        dailySection.appendChild(dailyTitle);

        // Daily table container
        const dailyTableContainer = document.createElement('div');
        dailyTableContainer.className = 'attendance-table-container';
        dailySection.appendChild(dailyTableContainer);

        // Weekly overages section (NOW THIRD)
        const weeklySection = document.createElement('div');
        weeklySection.className = 'attendance-section weekly-section';

        const weeklyTitle = document.createElement('h5');
        weeklyTitle.textContent = 'Weekly Overages';
        weeklyTitle.className = 'attendance-table-title';

        const weeklyActions = document.createElement('div');
        weeklyActions.className = 'attendance-table-actions';

        const weeklyCopyIcon = document.createElement('i');
        weeklyCopyIcon.className = 'fas fa-copy';
        weeklyCopyIcon.title = 'Copy table data';

        const weeklyExcelIcon = document.createElement('i');
        weeklyExcelIcon.className = 'fas fa-file-excel';
        weeklyExcelIcon.title = 'Export to Excel';

        weeklyActions.appendChild(weeklyCopyIcon);
        weeklyActions.appendChild(weeklyExcelIcon);

        weeklyTitle.appendChild(weeklyActions);
        weeklySection.appendChild(weeklyTitle);

        const weeklyTableContainer = document.createElement('div');
        weeklyTableContainer.className = 'attendance-table-container';
        weeklySection.appendChild(weeklyTableContainer);

        // Assemble the containers (CHANGED ORDER)
        tablesWrapper.appendChild(duplicatesSection);
        tablesWrapper.appendChild(dailySection);
        tablesWrapper.appendChild(weeklySection);
        alertContainer.appendChild(tablesWrapper);
        overageContainer.appendChild(alertContainer);

        // Create tables
        const dailyTable = document.createElement('table');
        dailyTable.className = 'display nowrap attendance-table';
        dailyTable.id = 'daily-overage-table';
        dailyTableContainer.appendChild(dailyTable);

        const weeklyTable = document.createElement('table');
        weeklyTable.className = 'display nowrap attendance-table';
        weeklyTable.id = 'weekly-overage-table';
        weeklyTableContainer.appendChild(weeklyTable);

        const duplicatesTable = document.createElement('table');
        duplicatesTable.className = 'display nowrap attendance-table';
        duplicatesTable.id = 'daily-duplicates-table';
        duplicatesTableContainer.appendChild(duplicatesTable);

        // Initialize DataTable for daily overages
        const dailyDataTable = $(dailyTable).DataTable({
            data: dailyOverages,
            columns: [
                { title: "Student Name", data: "studentName", width: "25%" },
                { title: "V Number", data: "vNumber", width: "15%" },
                { title: "Email", data: "email", width: "30%" },
                { title: "Day", data: "day", width: "15%" },
                { title: "Total", data: "totalHours", width: "15%" }
            ],
            scrollX: true,
            paging: dailyOverages.length > 10,
            pageLength: 10,
            searching: false,
            ordering: false,
            responsive: false,
            autoWidth: false,
            language: {
                emptyTable: "No daily overages found",
                lengthMenu: ""
            }
        });

        // Initialize DataTable for weekly overages
        const weeklyDataTable = $(weeklyTable).DataTable({
            data: weeklyOverages,
            columns: [
                { title: "Student Name", data: "studentName", width: "25%" },
                { title: "V Number", data: "vNumber", width: "15%" },
                { title: "Email", data: "email", width: "30%" },
                { title: "Week", data: "week", width: "15%" },
                { title: "Total", data: "totalHours", width: "15%" }
            ],
            scrollX: true,
            paging: weeklyOverages.length > 10,
            pageLength: 10,
            searching: false,
            ordering: false,
            responsive: false,
            autoWidth: false,
            language: {
                emptyTable: "No weekly overages found",
                lengthMenu: ""
            }
        });

        // Format for child rows in duplicates table
        function formatDuplicateDetails(d) {
            let html = '<div class="duplicate-details" style="padding: 5px; background-color: #f8f8f8; border-radius: 5px; margin: 10px 0;">';

            d.duplicateRecords.forEach(record => {
                html += `<div class="duplicate-record-group" style="margin-bottom: 10px;">`;
                html += `<table class="table table-sm" style="width: 100%; margin-top: 5px;">`;
                html += `<thead><tr><th>Sign-In Time</th><th>Sign-Out Time</th><th>Status</th></tr></thead><tbody>`;

                record.entries.forEach(entry => {
                    html += `<tr>
                        <td>${entry.signInTime}</td>
                        <td>${entry.signOutTime}</td>
                        <td>${entry.status}</td>
                    </tr>`;
                });

                html += `</tbody></table></div>`;
            });

            html += '</div>';
            return html;
        }

        // Initialize DataTable for daily duplicates with accordion
        const duplicatesDataTable = $(duplicatesTable).DataTable({
            data: dailyDuplicates,
            columns: [
                {
                    className: 'dt-control',
                    orderable: false,
                    data: null,
                    defaultContent: '<i class="fas fa-chevron-down" style="cursor: pointer;"></i>',
                    width: "5%"
                },
                { title: "Student Name", data: "studentName", width: "20%" },
                { title: "V Number", data: "vNumber", width: "10%" },
                { title: "Email", data: "email", width: "25%" },
                { title: "Date", data: "date", width: "10%" },
                { title: "Total Time", data: "totalTime", width: "10%" },
                { title: "Duplicate Count", data: "duplicatesCount", width: "10%" }
            ],
            scrollX: true,
            paging: dailyDuplicates.length > 10,
            pageLength: 10,
            searching: false,
            ordering: false,
            responsive: false,
            autoWidth: false,
            language: {
                emptyTable: "No duplicate attendance records found",
                lengthMenu: ""
            }
        });

        // Add event listener for expanding/collapsing rows
        $('#daily-duplicates-table tbody').on('click', 'td.dt-control', function () {
            const tr = $(this).closest('tr');
            const row = duplicatesDataTable.row(tr);

            if (row.child.isShown()) {
                // This row is already open - close it
                row.child.hide();
                tr.removeClass('shown');
                $(this).find('i').removeClass('fa-chevron-up').addClass('fa-chevron-down');
            } else {
                // Open this row
                row.child(formatDuplicateDetails(row.data())).show();
                tr.addClass('shown');
                $(this).find('i').removeClass('fa-chevron-down').addClass('fa-chevron-up');
            }
        });

        // Ensure correct alignment when the container becomes visible
        overageContainer.style.display = 'block';

        // Force tables to redraw to ensure proper alignment
        setTimeout(() => {
            dailyDataTable.columns.adjust().draw();
            weeklyDataTable.columns.adjust().draw();
            duplicatesDataTable.columns.adjust().draw();
        }, 10);

        // Add event handlers for copy buttons
        dailyCopyIcon.addEventListener('click', function (e) {
            e.preventDefault();
            DataTableManager.copyTableToClipboard(dailyOverages, 'daily');
        });

        weeklyCopyIcon.addEventListener('click', function (e) {
            e.preventDefault();
            DataTableManager.copyTableToClipboard(weeklyOverages, 'weekly');
        });

        duplicatesCopyIcon.addEventListener('click', function (e) {
            e.preventDefault();
            // Create a flattened version of the duplicates data
            const flattenedData = [];
            dailyDuplicates.forEach(student => {
                student.duplicateRecords.forEach(record => {
                    record.entries.forEach(entry => {
                        flattenedData.push({
                            studentName: student.studentName,
                            vNumber: student.vNumber,
                            email: student.email,
                            date: record.date,
                            totalTime: record.totalTime,
                            signInTime: entry.signInTime,
                            signOutTime: entry.signOutTime,
                            status: entry.status
                        });
                    });
                });
            });
            DataTableManager.copyTableToClipboard(flattenedData, 'duplicates');
        });

        // Add event handlers for excel buttons
        dailyExcelIcon.addEventListener('click', function (e) {
            e.preventDefault();
            DataTableManager.exportToExcel(dailyOverages, 'Daily_Overages');
        });

        weeklyExcelIcon.addEventListener('click', function (e) {
            e.preventDefault();
            DataTableManager.exportToExcel(weeklyOverages, 'Weekly_Overages');
        });

        duplicatesExcelIcon.addEventListener('click', function (e) {
            e.preventDefault();
            // Create a flattened version of the duplicates data
            const flattenedData = [];
            dailyDuplicates.forEach(student => {
                student.duplicateRecords.forEach(record => {
                    record.entries.forEach(entry => {
                        flattenedData.push({
                            "Student Name": student.studentName,
                            "V Number": student.vNumber,
                            "Email": student.email,
                            "Date": record.date,
                            "Total Time": record.totalTime,
                            "Sign In Time": entry.signInTime,
                            "Sign Out Time": entry.signOutTime,
                            "Status": entry.status
                        });
                    });
                });
            });
            DataTableManager.exportToExcel(flattenedData, 'Daily_Duplicates');
        });

        // Handle window resize to adjust table column widths
        $(window).on('resize', function () {
            dailyDataTable.columns.adjust();
            weeklyDataTable.columns.adjust();
            duplicatesDataTable.columns.adjust();
        });
    }

    static checkAttendanceOverages(api, jsonData) {
        const checkButton = document.getElementById('checkAttendanceBtn');
        const overageContainer = document.getElementById('attendance-overages');

        if (!DataTableManager.overageResults) {
            DataTableManager.overageResults = null;
        }

        if (overageContainer.style.display === 'block') {
            overageContainer.style.display = 'none';
            checkButton.innerHTML = '<i class="fas fa-eye"></i> Show Overages';
            return;
        }

        if (DataTableManager.overageResults) {
            overageContainer.style.display = 'block';
            checkButton.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Overages';
            return;
        }

        HelperFunctions.setButtonLoadingState(checkButton, true, 'fa-spinner fa-spin', 0, 'Checking...');

        setTimeout(() => {
            try {
                const results = DataTableManager.findAttendanceOverages(jsonData);

                DataTableManager.overageResults = results;

                DataTableManager.displayOverageTables(
                    results.dailyOverages,
                    results.weeklyOverages,
                    results.dailyDuplicates
                );

                HelperFunctions.setButtonLoadingState(checkButton, false, 'fa-eye-slash', 0, 'Hide Overages');

            } catch (error) {
                console.error('Error checking attendance overages:', error);

                HelperFunctions.setButtonLoadingState(checkButton, false, 'fa-eye', 0, 'Show Overages');
                DataTableManager.overageResults = null;

                const errorDiv = document.createElement('div');
                errorDiv.className = 'alert alert-danger';
                errorDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error analyzing attendance data: ' + error.message;
                overageContainer.innerHTML = '';
                overageContainer.appendChild(errorDiv);
                overageContainer.style.display = 'block';
            }
        }, 0);
    }

    static copyTableToClipboard(data, type) {
        if (!data || data.length === 0) return;

        try {
            // Create a formatted table for copying
            let headers;
            if (type === 'daily') {
                headers = ['Student Name', 'V Number', 'Email', 'Day', 'Total'];
            } else if (type === 'weekly') {
                headers = ['Student Name', 'V Number', 'Email', 'Week', 'Total'];
            } else if (type === 'duplicates') {
                headers = ['Student Name', 'V Number', 'Email', 'Date', 'Total Time', 'Sign In Time', 'Sign Out Time', 'Status'];
            }

            // Create HTML table
            let htmlContent = '<table border="1" cellpadding="3" cellspacing="0">';

            // Add header row
            htmlContent += '<tr>';
            headers.forEach(header => {
                htmlContent += `<th>${header}</th>`;
            });
            htmlContent += '</tr>';

            // Add data rows
            data.forEach(row => {
                htmlContent += '<tr>';
                if (type === 'daily') {
                    htmlContent += `<td>${row.studentName}</td>`;
                    htmlContent += `<td>${row.vNumber}</td>`;
                    htmlContent += `<td>${row.email}</td>`;
                    htmlContent += `<td>${row.day}</td>`;
                    htmlContent += `<td>${row.totalHours}</td>`;
                } else if (type === 'weekly') {
                    htmlContent += `<td>${row.studentName}</td>`;
                    htmlContent += `<td>${row.vNumber}</td>`;
                    htmlContent += `<td>${row.email}</td>`;
                    htmlContent += `<td>${row.week}</td>`;
                    htmlContent += `<td>${row.totalHours}</td>`;
                } else if (type === 'duplicates') {
                    htmlContent += `<td>${row.studentName}</td>`;
                    htmlContent += `<td>${row.vNumber}</td>`;
                    htmlContent += `<td>${row.email}</td>`;
                    htmlContent += `<td>${row.date}</td>`;
                    htmlContent += `<td>${row.totalTime}</td>`;
                    htmlContent += `<td>${row.signInTime}</td>`;
                    htmlContent += `<td>${row.signOutTime}</td>`;
                    htmlContent += `<td>${row.status}</td>`;
                }
                htmlContent += '</tr>';
            });
            htmlContent += '</table>';

            // Create plain text version (tab separated)
            const plainText = [headers.join('\t')].concat(
                data.map(row => {
                    if (type === 'daily') {
                        return [row.studentName, row.vNumber, row.email, row.day, row.totalHours].join('\t');
                    } else if (type === 'weekly') {
                        return [row.studentName, row.vNumber, row.email, row.week, row.totalHours].join('\t');
                    } else if (type === 'duplicates') {
                        return [
                            row.studentName,
                            row.vNumber,
                            row.email,
                            row.date,
                            row.totalTime,
                            row.signInTime,
                            row.signOutTime,
                            row.status
                        ].join('\t');
                    }
                })
            ).join('\n');

            // Use clipboard API
            navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': new Blob([htmlContent], { type: 'text/html' }),
                    'text/plain': new Blob([plainText], { type: 'text/plain' })
                })
            ]).then(() => {
                // Show success message
                const copyIcon = type === 'daily' ?
                    document.querySelector('.daily-section .fa-copy') :
                    (type === 'weekly' ?
                        document.querySelector('.weekly-section .fa-copy') :
                        document.querySelector('.duplicates-section .fa-copy')
                    );
                HelperFunctions.showInlineCopyAlert(copyIcon);
            }).catch(err => {
                console.error('Copy failed:', err);
                // Fallback to plain text
                navigator.clipboard.writeText(plainText)
                    .then(() => {
                        const copyIcon = type === 'daily' ?
                            document.querySelector('.daily-section .fa-copy') :
                            (type === 'weekly' ?
                                document.querySelector('.weekly-section .fa-copy') :
                                document.querySelector('.duplicates-section .fa-copy')
                            );
                        HelperFunctions.showInlineCopyAlert(copyIcon);
                    })
                    .catch(err => {
                        console.error('Plain text copy failed:', err);
                    });
            });

        } catch (error) {
            console.error('Error copying table data:', error);
        }
    }

    static exportToExcel(data, filename) {
        if (!data || data.length === 0) return;

        try {
            const exportData = data.map(item => {
                // Create a new object without internal properties (those starting with _)
                return Object.keys(item).reduce((obj, key) => {
                    // Skip properties that start with underscore (internal use)
                    if (!key.startsWith('_')) {
                        obj[key] = item[key];
                    }
                    return obj;
                }, {});
            });

            // Convert data to worksheet
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data");

            // Generate Excel file with current date
            const currentDate = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `${filename}_${currentDate}.xlsx`);

        } catch (error) {
            console.error('Error exporting to Excel:', error);
        }
    }

    static displayFollowUpsResults(data, container) {
        // Clear the container
        container.innerHTML = '';

        // Create card for the results
        const card = document.createElement('div');
        card.className = 'col-md-12';

        // Check if there are any results to determine if download button should be shown
        const downloadButtonHtml = data.length > 0 ? `
            <button class="btn btn-sm btn-light mr-2" id="followUpsExportBtn">
                <i class="fas fa-download"></i> Download Excel
            </button>
        ` : '';

        card.innerHTML = `
            <div class="card">
            <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Follow-ups Required (${data.length} students)</h5>
                <div>
            ${downloadButtonHtml}
                </div>
            </div>
            <div class="card-body p-0"> 
            ${data.length > 0 ? `
            <div class="table-responsive">
            <table id="followUpsTable" class="table table-striped table-bordered">
                <thead>
                <tr>
                    <th>Program</th>
                    <th>Student</th>
                    <th>V-Number</th>
                    <th>Personal Email</th>
                    <th>Campus Email</th>
                    <th>Phone</th>
                    <th>Start Date</th>
                    <th>Status</th>
                    <th>SP Status</th>
                    <th>Canvas Status</th>
                    <th>Admission Rep</th>
                </tr>
                </thead>
                <tbody>
                ${data.map(student => `
                    <tr>
                    <td>${student.programName}</td>
                    <td>${student.studentName}</td>
                    <td class="text-nowrap">
                        <i class="fas fa-copy copy-icon" title="Copy to clipboard" style="cursor:pointer; margin-right:5px;" data-copy="${student.vNumber}"></i>
                        <a href="https://aoltorontoagents.ca/student_contract/clgStActive/activeLists.php?keywordLists=${encodeURIComponent(student.vNumber)}" 
                            target="_blank">${student.vNumber}</a>
                    </td>
                    <td style="word-break: break-all;">
                        ${student.personalEmail !== 'N/A' ?
                `<i class="fas fa-copy copy-icon" title="Copy to clipboard" style="cursor:pointer; margin-right:5px;" data-copy="${student.personalEmail}"></i>` :
                'N/A'} ${student.personalEmail}
                    </td>
                    <td style="word-break: break-all;">
                        ${student.campusEmail !== 'N/A' ?
                `<i class="fas fa-copy copy-icon" title="Copy to clipboard" style="cursor:pointer; margin-right:5px;" data-copy="${student.campusEmail}"></i>
                        <a href="https://mynew.aolcc.ca/accounts/22/users?search_term=${encodeURIComponent(student.campusEmail)}" 
                            target="_blank">${student.campusEmail}</a>` :
                'N/A'}
                    </td>
                    <td class="text-nowrap">
                        <i class="fas fa-copy copy-icon" title="Copy to clipboard" style="cursor:pointer; margin-right:5px;" data-copy="${student.phoneNumber}"></i>
                        ${student.phoneNumber}
                    </td>
                    <td>${student.startDate}</td>
                    <td>${student.status}</td>
                    <td>
                        <span class="badge badge-${student.spStatus === 'Done' ? 'success' : 'danger'}">
                        ${student.spStatus}
                        </span>
                    </td>
                    <td>
                        <span class="badge badge-${student.canvasStatus === 'Done' ? 'success' : 'danger'}">
                        ${student.canvasStatus}
                        </span>
                    </td>
                    <td>${student.admissionRep}</td>
                    </tr>
                `).join('')}
                </tbody>
            </table>
            </div>
            ` : `
            <div class="alert alert-info m-3">
                <h4><i class="fas fa-check-circle"></i> No Follow-ups Required</h4>
                <p>All students have completed their setup requirements (both Student Portal password and Canvas login).</p>
            </div>
            `}
        </div>
        </div>
        `;

        container.appendChild(card);

        // Only initialize DataTable and download functionality if there are results
        if (data.length > 0) {
            // Initialize DataTable
            $(document).ready(function () {
                $('#followUpsTable').DataTable({
                    responsive: true,
                    dom: 'Bfrtip',
                    pageLength: 10,
                    searching: false,
                    ordering: false,
                    info: false,
                    buttons: [
                        {
                            extend: 'excel',
                            text: 'Export to Excel',
                            className: 'btn btn-success',
                            exportOptions: {
                                columns: ':not(:last-child)'
                            },
                            filename: `Follow-ups-${new Date().toISOString().split('T')[0]}`
                        }
                    ]
                });

                // Add click event for copy icons
                $('.copy-icon').on('click', function () {
                    const textToCopy = $(this).data('copy');
                    navigator.clipboard.writeText(textToCopy)
                        .then(() => {
                            HelperFunctions.showInlineCopyAlert(this);
                        })
                        .catch(err => {
                            console.error('Failed to copy text: ', err);
                        });
                });
            });

            // Add export functionality only if button exists
            const exportBtn = document.getElementById('followUpsExportBtn');
            if (exportBtn) {
                exportBtn.addEventListener('click', function () {
                    const dtButton = document.querySelector('.dt-button');
                    if (dtButton) {
                        dtButton.click();
                    } else {
                        // Fallback export
                        const wb = XLSX.utils.book_new();
                        const ws = XLSX.utils.table_to_sheet(document.getElementById('followUpsTable'));
                        XLSX.utils.book_append_sheet(wb, ws, 'Follow-ups');

                        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                        const blob = new Blob([wbout], { type: 'application/octet-stream' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `Follow-ups-${new Date().toISOString().split('T')[0]}.xlsx`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }
                });
            }
        }
    }

    static displayCoursesAnalysisResults(analysisResults, container) {
        // Create tabbed interface for different analysis types
        const tabbedHtml = `
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header bg-warning">
                        <h5 class="mb-0">Course Analysis Results</h5>
                    </div>
                    <div class="card-body">
                        <ul class="nav nav-tabs" id="analysisTabsNav" role="tablist" style="justify-content: center;">
                            <li class="nav-item">
                                <a class="nav-link active" id="sfs-tab" data-toggle="tab" href="#sfs-analysis" role="tab">
                                    SFS Analysis <span class="badge badge-light">${analysisResults.sfsData.length}</span>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="typaz-tab" data-toggle="tab" href="#typaz-analysis" role="tab">
                                    TYPAZ Analysis <span class="badge badge-light">${analysisResults.typazData.length}</span>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="non-progress-tab" data-toggle="tab" href="#non-progress-analysis" role="tab">
                                    Non-Progress Analysis <span class="badge badge-light">${analysisResults.nonProgressData.length}</span>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="fail-tab" data-toggle="tab" href="#fail-analysis" role="tab">
                                    Fail Analysis <span class="badge badge-light">${analysisResults.failData.length}</span>
                                </a>
                            </li>
                        </ul>
                        <div class="analysis-tab-content">
                            <div class="tab-panel fade show active" id="sfs-analysis" role="tabpanel">
                                <div id="sfs-analysis-content"></div>
                            </div>
                            <div class="tab-panel fade" id="typaz-analysis" role="tabpanel">
                                <div id="typaz-analysis-content"></div>
                            </div>
                            <div class="tab-panel fade" id="non-progress-analysis" role="tabpanel">
                                <div id="non-progress-analysis-content"></div>
                            </div>
                            <div class="tab-panel fade" id="fail-analysis" role="tabpanel">
                                <div id="fail-analysis-content"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = tabbedHtml;

        // Display each analysis type
        this.displayAnalysisTable(analysisResults.sfsData, 'sfs-analysis-content', 'SFS Analysis', 'sfs', false);
        this.displayAnalysisTable(analysisResults.typazData, 'typaz-analysis-content', 'TYPAZ Analysis', 'typaz', true);
        this.displayAnalysisTable(analysisResults.nonProgressData, 'non-progress-analysis-content', 'Non-Progress Analysis', 'non-progress', false);
        this.displayAnalysisTable(analysisResults.failData, 'fail-analysis-content', 'Fail Analysis', 'fail', false);

        // Initialize Bootstrap tab functionality
        $('#analysisTabsNav a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            // Ensure the tab content is visible
            $($(e.target).attr('href')).show();
        });
    }

    static displayAnalysisTable(data, containerId, title, tableId, includeCourse) {
        const containerElement = document.getElementById(containerId);
        if (!containerElement) return;

        if (data.length === 0) {
            containerElement.innerHTML = `
                <div class="alert alert-info mt-3">
                    <h5><i class="fas fa-info-circle"></i> No Results Found</h5>
                    <p>No students found for ${title.toLowerCase()}.</p>
                </div>
            `;
            return;
        }

        // Extract unique campus values for filter dropdown
        const uniqueCampuses = [...new Set(data.map(item => item.campus || 'Unknown'))].sort();

        // Create columns based on whether course should be included
        const baseColumns = [
            'Program Name',
            'Student Name',
            'V-Number',
            'Personal Email',
            'Campus Email',
            'Phone Number'
        ];

        if (includeCourse) {
            baseColumns.push('Course');
        }

        // Add status column only for tables that need it (not for non-progress)
        if (tableId !== 'non-progress') {
            baseColumns.push('Status');
        }

        baseColumns.push('Campus', 'Finish Date', 'Action');

        // Create filters HTML
        const filtersHtml = `
            <div class="card mt-3" style="margin-top: 0!important;">
                <div class="card-body">
                    <div class="row">
                        ${(includeCourse || tableId === 'sfs') ? `
                        <div class="col-md-3">
                            <div class="form-group">
                                <label for="${tableId}-status-filter">Status</label>
                                <select id="${tableId}-status-filter" class="form-control">
                                    <option value="">All</option>
                                    <option value="Fail">Fail</option>
                                    <option value="In Progress">In Progress</option>
                                </select>
                            </div>
                        </div>
                        ` : tableId === 'fail' ? `
                        <div class="col-md-3">
                            <div class="form-group">
                                <label for="${tableId}-status-filter">Status</label>
                                <select id="${tableId}-status-filter" class="form-control">
                                    <option value="">All</option>
                                    <option value="2+ Fails">2+ Fails</option>
                                    <option value="Completed with Fail(s)">Completed with Fail(s)</option>
                                </select>
                            </div>
                        </div>
                        ` : ''}
                        <div class="col-md-3">
                            <div class="form-group">
                                <label for="${tableId}-campus-filter">Campus</label>
                                <select id="${tableId}-campus-filter" class="form-control">
                                    <option value="">All</option>
                                    ${uniqueCampuses.map(campus => `<option value="${campus}">${campus}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="form-group">
                                <label for="${tableId}-finish-date-from">Finish Date From</label>
                                <input type="date" id="${tableId}-finish-date-from" class="form-control">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="form-group">
                                <label for="${tableId}-finish-date-to">Finish Date To</label>
                                <input type="date" id="${tableId}-finish-date-to" class="form-control">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Create table HTML
        const tableHtml = `
            <div class="card mt-3">
                <div class="card-header bg-info text-white">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${title} Students</h5>
                        <div>
                            <button id="${tableId}-download-excel" class="btn btn-success btn-sm">
                                <i class="fas fa-download"></i> Download Excel
                            </button>
                            <span class="badge badge-light ml-2">${data.length} Students</span>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table id="${tableId}-students-table" class="table table-sm table-striped table-bordered mt-3">
                            <thead>
                                <tr>
                                    ${baseColumns.map(col => `<th>${col}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        containerElement.innerHTML = filtersHtml + tableHtml;

        // Configure DataTable columns
        const columns = [
            { data: "programName" },
            {
                data: "studentName",
                createdCell: function (td) {
                    $(td).addClass('text-nowrap');
                }
            },
            {
                data: "vNumber",
                render: function (data) {
                    const link = `https://aoltorontoagents.ca/student_contract/clgStActive/activeLists.php?keywordLists=${data}`;
                    return `<a href="${link}" target="_blank">${data}</a>`;
                },
                createdCell: function (td, cellData) {
                    $(td).addClass('text-nowrap');
                    HelperFunctions.addCopyIconToElement(td, cellData, {
                        position: 'prepend',
                        style: { marginRight: '5px' }
                    });
                }
            },
            {
                data: "personalEmail",
                createdCell: function (td, cellData) {
                    $(td).addClass('text-nowrap');
                    if (cellData !== 'N/A') {
                        HelperFunctions.addCopyIconToElement(td, cellData, {
                            position: 'prepend',
                            style: { marginRight: '5px' }
                        });
                    }
                }
            },
            {
                data: "campusEmail",
                render: function (data) {
                    if (data === 'N/A') {
                        return data;
                    }
                    const searchUrl = `https://mynew.aolcc.ca/accounts/22/users?search_term=${encodeURIComponent(data)}`;
                    return `<a href="${searchUrl}" target="_blank" style="overflow-wrap: anywhere;">${data}</a>`;
                },
                createdCell: function (td, cellData) {
                    if (cellData !== 'N/A') {
                        HelperFunctions.addCopyIconToElement(td, cellData, {
                            position: 'prepend',
                            style: { marginRight: '5px' }
                        });
                    }
                }
            },
            {
                data: "phoneNumber",
                createdCell: function (td, cellData) {
                    $(td).addClass('text-nowrap');
                    if (cellData !== 'N/A') {
                        HelperFunctions.addCopyIconToElement(td, cellData, {
                            position: 'prepend',
                            style: { marginRight: '5px' }
                        });
                    }
                }
            }
        ];

        // Add course column if needed
        if (includeCourse) {
            columns.push({
                data: "course",
                createdCell: function (td) {
                    $(td).addClass('text-nowrap');
                }
            });
        }

        // Add status column only for tables that need it (not for non-progress)
        if (tableId !== 'non-progress') {
            columns.push({
                data: "status",
                createdCell: function (td) {
                    $(td).addClass('text-nowrap');
                }
            });
        }

        // Add campus and finish date columns
        columns.push(
            {
                data: "campus",
                createdCell: function (td) {
                    $(td).addClass('text-nowrap');
                }
            },
            {
                data: "finishDate",
                createdCell: function (td) {
                    $(td).addClass('text-nowrap');
                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    return `<button class="btn btn-sm btn-launch" 
                        data-vnum="${row.vNumber}" 
                        data-student="${row.studentName}"
                        data-email="${row.campusEmail !== 'N/A' ? row.campusEmail : row.personalEmail}">
                        <i class="fas fa-paper-plane"></i>
                    </button>`;
                },
                createdCell: function (td) {
                    $(td).addClass('text-nowrap');
                }
            }
        );

        // Initialize DataTable
        const dataTable = $(`#${tableId}-students-table`).DataTable({
            data: data,
            columns: columns,
            pageLength: 10,
            ordering: false,
            info: true,
            autoWidth: false,
            responsive: false,
            dom: 'lrtip',
            language: {
                emptyTable: `No ${title.toLowerCase()} students found`
            }
        });

        $(`#${tableId}-students-table`).on('click', '.btn-launch', function () {
            const vNumber = $(this).data('vnum');
            const email = $(this).data('email');

            const button = this;

            HelperFunctions.setButtonLoadingState(button, true, 'fa-spinner fa-spin', 0);

            chrome.runtime.sendMessage({
                action: 'launchStudentManager',
                data: {
                    vNumber: vNumber,
                    email: email
                }
            }, function (response) {
                HelperFunctions.setButtonLoadingState(button, false, 'fa-paper-plane', 0);

                if (response && response.success) {
                    console.log('Student manager launched successfully');
                } else {
                    ErrorHandler.showAlert('<b>Error:</b>&nbsp;Failed to launch Student Manager', 'error', 3000);
                }
            });
        });

        // Setup filters
        this.setupAnalysisFilters(dataTable, tableId, includeCourse);

        // Setup download functionality
        this.setupAnalysisDownload(data, `${tableId}-download-excel`, title);
    }

    static setupAnalysisFilters(dataTable, tableId, includeCourse) {
        // Status filter - for tables that have status column
        if ((includeCourse || tableId === 'sfs' || tableId === 'fail') && tableId !== 'non-progress') {
            $(`#${tableId}-status-filter`).on('change', function () {
                const statusValue = this.value;
                let statusColumnIndex;

                // Calculate correct status column index based on table structure
                if (tableId === 'sfs') {
                    // SFS table: Program, Student Name, V-Number, Personal Email, Campus Email, Phone Number, Status, Campus, Finish Date, Action
                    statusColumnIndex = 6; // Status is at index 6 (no Course column)
                } else if (includeCourse) {
                    // TYPAZ table: Program, Student Name, V-Number, Personal Email, Campus Email, Phone Number, Course, Status, Campus, Finish Date, Action
                    statusColumnIndex = 7; // Status is at index 7 (after Course column)
                } else if (tableId === 'fail') {
                    // Fail table: Program, Student Name, V-Number, Personal Email, Campus Email, Phone Number, Status, Campus, Finish Date, Action
                    statusColumnIndex = 6; // Status is at index 6 (no Course column)
                }

                dataTable.column(statusColumnIndex).search(statusValue).draw();
            });
        }

        // Campus filter
        let campusColumnIndex;
        if (tableId === 'non-progress') {
            // Non-progress table: Program, Student Name, V-Number, Personal Email, Campus Email, Phone Number, Campus, Finish Date, Action
            campusColumnIndex = 6; // Campus is at index 6
        } else if (includeCourse) {
            // Tables with course column: Program, Student Name, V-Number, Personal Email, Campus Email, Phone Number, Course, Status, Campus, Finish Date, Action
            campusColumnIndex = 8; // Campus is at index 8
        } else {
            // SFS/Fail table without course: Program, Student Name, V-Number, Personal Email, Campus Email, Phone Number, Status, Campus, Finish Date, Action
            campusColumnIndex = 7; // Campus is at index 7
        }

        $(`#${tableId}-campus-filter`).on('change', function () {
            const campusValue = this.value;
            dataTable.column(campusColumnIndex).search(campusValue).draw();
        });

        // Date range filters
        let fromDate = null;
        let toDate = null;

        // Finish date column index
        let finishDateColumnIndex;
        if (tableId === 'non-progress') {
            finishDateColumnIndex = 7; // Finish Date is at index 7
        } else if (includeCourse) {
            finishDateColumnIndex = 9; // Finish Date is at index 9
        } else {
            finishDateColumnIndex = 8; // Finish Date is at index 8
        }

        $(`#${tableId}-finish-date-from, #${tableId}-finish-date-to`).on('change', function () {
            const fromDateStr = $(`#${tableId}-finish-date-from`).val();
            const toDateStr = $(`#${tableId}-finish-date-to`).val();

            fromDate = fromDateStr ? new Date(fromDateStr) : null;
            toDate = toDateStr ? new Date(toDateStr) : null;

            // Create custom search function
            $.fn.dataTable.ext.search.push(function (settings, data) {
                if (settings.nTable.id !== `${tableId}-students-table`) return true;

                const finishDateStr = data[finishDateColumnIndex];
                if (!finishDateStr || finishDateStr === 'N/A') return false;

                try {
                    const rowDate = new Date(finishDateStr);
                    if (isNaN(rowDate.getTime())) return false;

                    if (fromDate && toDate) {
                        return (rowDate >= fromDate && rowDate <= toDate);
                    } else if (fromDate) {
                        return (rowDate >= fromDate);
                    } else if (toDate) {
                        return (rowDate <= toDate);
                    }
                    return true;
                } catch (e) {
                    return false;
                }
            });

            dataTable.draw();
        });
    }

    static setupAnalysisDownload(data, buttonId, title) {
        $(`#${buttonId}`).on('click', function () {
            try {
                if (!data || data.length === 0) {
                    ErrorHandler.showAlert('<b>Info:</b>&nbsp;No data to download.', 'info', 3000);
                    return;
                }

                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, title);

                const date = new Date().toISOString().split('T')[0];
                const filename = `${title.replace(/\s+/g, '_')}_${date}.xlsx`;

                XLSX.writeFile(wb, filename);
            } catch (err) {
                ErrorHandler.showAlert(`<b>Error:</b>&nbsp;Failed to download results: ${err.message}`, 'error', 5000);
            }
        });
    }
}

window.DataTableManager = DataTableManager;