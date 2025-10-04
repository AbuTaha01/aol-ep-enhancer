class WeeklyReports {
    constructor() {
        this.reportData = [];
        this.filteredData = [];
        this.headers = [];
        this.rawHeaders = [];
        this.uniquePrograms = new Set();
        this.uniqueStatuses = new Set();
        this.uniqueCampuses = new Set();
        this.uniqueCPLs = new Set();
        this.allPrograms = []; // Store programs from Chrome storage

        // Filter state
        this.selectedPrograms = new Set(['all']); // Multi-select program filters
        this.selectedStatuses = new Set();
        this.selectedCampuses = new Set();
        this.selectedCPLs = new Set();
        this.selectedTimeFilters = new Set();
        this.selectedCourseFilters = new Set();
        this.selectedMarksFilters = new Set();
        this.selectedPendingHoursFilters = new Set(); // Pending hours filtresi için
        this.selectedStartDate = null;
        this.selectedFinishDate = null;

        // Pagination
        this.currentPage = 1;
        this.itemsPerPage = 50;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadProgramsFromStorage().then(() => {
            this.loadReports();
        });
    }

    async loadProgramsFromStorage() {
        try {
            return new Promise((resolve) => {
                chrome.storage.local.get(['allPrograms'], (result) => {
                    if (result.allPrograms) {
                        this.allPrograms = result.allPrograms;
                    }
                    resolve();
                });
            });
        } catch (error) {
            console.error('Error loading programs from storage:', error);
            this.allPrograms = [];
        }
    }

    bindEvents() {
        // Download Excel buttons
        const downloadFilteredBtn = document.getElementById('downloadExcelBtn');
        const downloadAllBtn = document.getElementById('downloadAllReportsBtn');

        if (downloadFilteredBtn) {
            downloadFilteredBtn.addEventListener('click', () => this.downloadFilteredExcel());
        }

        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', () => this.downloadAllReports());
        }

        // Alert modal events
        const alertOkBtn = document.getElementById('alertOkButton');
        if (alertOkBtn) {
            alertOkBtn.addEventListener('click', () => this.hideAlert());
        }

        // Pagination
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.changePage(-1));
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.changePage(1));
        }
    }

    async loadReports() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const filterSection = document.getElementById('filterSection');
        const downloadFilteredBtn = document.getElementById('downloadExcelBtn');
        const downloadAllBtn = document.getElementById('downloadAllReportsBtn');

        try {
            loadingIndicator.style.display = 'block';
            filterSection.style.display = 'none';
            if (downloadFilteredBtn) downloadFilteredBtn.disabled = true;
            if (downloadAllBtn) downloadAllBtn.disabled = true;

            const response = await this.makeAPIRequest();

            if (response.success) {
                this.parseCSVData(response.data);
                this.populateFilters();
                this.applyFilters();
                filterSection.style.display = 'block';

                // All Reports butonu hep aktif
                if (downloadAllBtn) downloadAllBtn.disabled = false;

                // Filtered Reports butonunu filtre durumuna göre ayarla
                this.updateFilteredDownloadButton();
            } else {
                this.showAlert('Error', response.error || 'Failed to load reports');
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showAlert('Error', 'Failed to load reports: ' + error.message);
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    async makeAPIRequest() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'getWeeklyReports'
            }, (response) => {
                resolve(response);
            });
        });
    }

    isHeaderExcluded(header) {
        const cleanHeader = header.trim().replace(/^"|"$/g, '');
        if (cleanHeader.startsWith('Week') && cleanHeader.includes('(')) return true;
        if (cleanHeader === '3W Total Hrs' || cleanHeader === '4W Total Hrs') return true;
        return false;
    }

    parseCSVData(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');

        if (lines.length === 0) {
            throw new Error('No data found in the response');
        }

        this.rawHeaders = this.parseCSVLine(lines[0]);

        // "Pend. Last W." sütununu "Pend. Hrs (4W)" sütunundan hemen sonra ekle
        const pendHrs4WIndex = this.rawHeaders.findIndex(header => header === 'Pend. Hrs (4W)');
        if (pendHrs4WIndex !== -1) {
            this.rawHeaders.splice(pendHrs4WIndex + 1, 0, 'Pend. Last W.');
        } else {
            // Eğer "Pend. Hrs (4W)" bulunamazsa en sona ekle
            this.rawHeaders.push('Pend. Last W.');
        }

        this.headers = this.rawHeaders.filter(header => !this.isHeaderExcluded(header));

        this.reportData = [];
        for (let i = 1; i < lines.length; i++) {
            const rowData = this.parseCSVLine(lines[i]);
            if (rowData.length === this.rawHeaders.length - 1) { // -1 çünkü yeni sütun eklendi
                const rowObject = {};

                // Önce tüm orijinal verileri yükle
                this.rawHeaders.forEach((header, index) => {
                    if (header !== 'Pend. Last W.') {
                        // Adjust index for original data since we inserted a new column
                        let dataIndex = index;
                        const lastWeekIndex = this.rawHeaders.findIndex(h => h === 'Pend. Last W.');
                        if (index > lastWeekIndex) {
                            dataIndex = index - 1;
                        }

                        let value = rowData[dataIndex];

                        // Process percentage values
                        if (header.includes('%') && value !== 'N/A' && value !== '') {
                            value = parseFloat(value.replace('%', ''));
                        } else if (header === 'Average Marks' && value !== 'N/A' && value !== '') {
                            value = parseFloat(value);
                        }

                        rowObject[header] = value;
                    }
                });

                // Week 4 ile başlayan sütunu dinamik olarak bul
                const week4Header = this.rawHeaders.find(header => header.startsWith('Week 4'));
                const week4Hours = this.parseTimeToHours(rowObject[week4Header] || '0:00:00');
                const remaining = Math.max(0, 20 - week4Hours);

                // Kalan saatleri saat:dakika:saniye formatında göster
                rowObject['Pend. Last W.'] = this.formatHoursToTime(remaining);

                if (rowObject['Program Name']) this.uniquePrograms.add(rowObject['Program Name']);
                if (rowObject['Progress Status']) this.uniqueStatuses.add(rowObject['Progress Status']);
                if (rowObject['VNumber']) {
                    const campus = this.getCampusFromVNumber(rowObject['VNumber']);
                    if (campus) this.uniqueCampuses.add(campus);
                }
                if (rowObject['CPL']) this.uniqueCPLs.add(rowObject['CPL']);

                this.reportData.push(rowObject);
            }
        }
    }

    formatHoursToTime(hours) {
        if (hours === 0) {
            return '0:00:00';
        }

        const totalMinutes = hours * 60;
        const totalSeconds = totalMinutes * 60;

        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        const s = Math.floor(((hours - h) * 60 - m) * 60);

        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    parseCSVLine(line) {
        const result = [];
        let inQuote = false;
        let currentField = '';

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuote && line[i + 1] === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuote = !inQuote;
                }
            } else if (char === ';' && !inQuote) {
                result.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }

        result.push(currentField.trim());
        return result.map(field => field.replace(/^"|"$/g, ''));
    }

    getCampusFromVNumber(vNumber) {
        if (!vNumber || vNumber.length < 2) return null;
        const prefix = vNumber.substring(0, 2).toUpperCase();
        const campusMap = {
            'VT': 'Toronto',
            'VB': 'Brampton',
            'VN': 'North York'
        };
        return campusMap[prefix] || null;
    }

    convertDateFormat(dateString) {
        if (!dateString || dateString === 'N/A') return null;

        try {
            if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return dateString;
            }

            const parts = dateString.split('/');
            if (parts.length === 3) {
                const month = parts[0].padStart(2, '0');
                const day = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    getMondaysInRange(startDate, endDate) {
        const mondays = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        const firstMonday = new Date(start);
        const daysUntilMonday = (1 - firstMonday.getDay() + 7) % 7;
        firstMonday.setDate(firstMonday.getDate() + daysUntilMonday);

        while (firstMonday <= end) {
            mondays.push(new Date(firstMonday));
            firstMonday.setDate(firstMonday.getDate() + 7);
        }

        return mondays;
    }

    createDatePicker(header, isStartDate = false) {
        // Only create date picker for Start Date
        if (header !== 'Start Date') {
            return null;
        }

        const picker = document.createElement('input');
        picker.type = 'text';
        picker.className = 'date-picker';
        picker.placeholder = 'Select date...';
        picker.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            z-index: 1000;
            margin-top: 5px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            min-width: 150px;
        `;

        return picker;
    }

    initializeFlatpickr(picker) {
        const availableDates = this.getAvailableStartDates();

        // Initialize Flatpickr
        const flatpickrInstance = flatpickr(picker, {
            dateFormat: 'Y-m-d',
            maxDate: 'today',
            minDate: new Date(new Date().getFullYear() - 2, 0, 1), // 2 yıl geriye
            enable: availableDates, // Sadece CSV'deki tarihleri aktif et
            defaultDate: this.selectedStartDate,
            allowInput: false,
            clickOpens: true,
            onChange: (selectedDates, dateStr) => {
                if (selectedDates.length > 0) {
                    this.selectedStartDate = dateStr;
                    this.currentPage = 1;
                    this.applyFilters();
                    this.updateFilteredDownloadButton();

                    // Close picker after selection
                    setTimeout(() => {
                        if (flatpickrInstance && flatpickrInstance.close) {
                            flatpickrInstance.close();
                        }
                    }, 100);
                } else {
                    // When date is cleared (empty dateStr or no selected dates)
                    this.selectedStartDate = null;
                    this.currentPage = 1;
                    this.applyFilters();
                    this.updateFilteredDownloadButton();

                    // Close picker after clearing
                    setTimeout(() => {
                        if (flatpickrInstance && flatpickrInstance.close) {
                            flatpickrInstance.close();
                        }
                    }, 100);
                }
            },
            onReady: (selectedDates, dateStr, instance) => {
                // Add custom clear button manually
                this.addClearButton(instance);

                // Position calendar correctly
                this.positionCalendar(instance, picker);
            },
            onClose: () => {
                // Remove the picker element after closing
                setTimeout(() => {
                    if (picker && picker.parentElement) {
                        picker.remove();
                    }
                }, 100);
            }
        });

        // Open the picker immediately if it exists
        if (flatpickrInstance && flatpickrInstance.open) {
            setTimeout(() => {
                flatpickrInstance.open();
                // Reposition after opening
                setTimeout(() => {
                    this.positionCalendar(flatpickrInstance, picker);
                }, 50);
            }, 10);
        }

        return flatpickrInstance;
    }

    getAvailableStartDates() {
        const uniqueDates = new Set();

        this.reportData.forEach(row => {
            const startDate = this.convertDateFormat(row['Start Date']);
            if (startDate && startDate !== 'N/A') {
                uniqueDates.add(startDate);
            }
        });

        return Array.from(uniqueDates).sort();
    }

    populateFilters() {
        this.populateProgramFilters();
        this.populateStatusFilters();
        this.populateCampusFilters();
        this.populateCPLFilters();
        this.bindFilterEvents();
    }

    populateProgramFilters() {
        const container = document.getElementById('program-buttons');
        container.innerHTML = '';

        // Add "All Programs" button
        const allBtn = document.createElement('button');
        allBtn.className = 'filter-button';
        if (this.selectedPrograms.has('all')) {
            allBtn.classList.add('active');
        }
        allBtn.textContent = 'All Programs';
        allBtn.dataset.value = 'all';
        container.appendChild(allBtn);

        // Add program type buttons based on available programs in data
        const availableTypes = this.getAvailableProgramTypes();

        if (availableTypes.has('ILS')) {
            const ilsBtn = document.createElement('button');
            ilsBtn.className = 'filter-button program-type-button';
            if (this.selectedPrograms.has('all_ils')) {
                ilsBtn.classList.add('active');
            }
            ilsBtn.textContent = 'All ILS Programs';
            ilsBtn.dataset.value = 'all_ils';
            container.appendChild(ilsBtn);
        }

        if (availableTypes.has('ILP')) {
            const ilpBtn = document.createElement('button');
            ilpBtn.className = 'filter-button program-type-button';
            if (this.selectedPrograms.has('all_ilp')) {
                ilpBtn.classList.add('active');
            }
            ilpBtn.textContent = 'All ILP Programs';
            ilpBtn.dataset.value = 'all_ilp';
            container.appendChild(ilpBtn);
        }

        // Add individual program buttons
        Array.from(this.uniquePrograms).sort().forEach(program => {
            const btn = document.createElement('button');
            btn.className = 'filter-button';
            if (this.selectedPrograms.has(program)) {
                btn.classList.add('active');
            }
            btn.textContent = program;
            btn.dataset.value = program;
            container.appendChild(btn);
        });
    }

    getAvailableProgramTypes() {
        const types = new Set();

        // Check each program in the report data
        this.uniquePrograms.forEach(programName => {
            const programType = this.getProgramType(programName);
            if (programType) {
                types.add(programType);
            }
        });

        return types;
    }

    getProgramType(programName) {
        if (!this.allPrograms || this.allPrograms.length === 0) {
            return null;
        }

        // First try exact match with programName
        let program = this.allPrograms.find(p => p.programName === programName);

        // If no exact match, try alternative names
        if (!program) {
            program = this.allPrograms.find(p =>
                p.alternativeNames && p.alternativeNames.includes(programName)
            );
        }

        return program ? program.programType : null;
    }

    getProgramsByType(type) {
        const programsOfType = new Set();

        this.uniquePrograms.forEach(programName => {
            const programType = this.getProgramType(programName);
            if (programType === type) {
                programsOfType.add(programName);
            }
        });

        return programsOfType;
    }

    populateStatusFilters() {
        const container = document.getElementById('status-filters');
        container.innerHTML = '';

        Array.from(this.uniqueStatuses).sort().forEach(status => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'status-filter';
            checkbox.value = status;
            checkbox.checked = this.selectedStatuses.has(status);

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(status));
            container.appendChild(label);
        });
    }

    populateCampusFilters() {
        const container = document.getElementById('campus-filters');
        container.innerHTML = '';

        Array.from(this.uniqueCampuses).sort().forEach(campus => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'campus-filter';
            checkbox.value = campus;
            checkbox.checked = this.selectedCampuses.has(campus);

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(campus));
            container.appendChild(label);
        });
    }

    populateCPLFilters() {
        const container = document.getElementById('cpl-filters');
        container.innerHTML = '';

        Array.from(this.uniqueCPLs).sort().forEach(cpl => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'cpl-filter';
            checkbox.value = cpl;
            checkbox.checked = this.selectedCPLs.has(cpl);

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(cpl));
            container.appendChild(label);
        });
    }

    bindFilterEvents() {
        // Program buttons - with multi-select support
        document.querySelectorAll('#program-buttons .filter-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleProgramFilter(e));
        });

        // Checkbox filters
        document.querySelectorAll('.status-filter, .campus-filter, .cpl-filter, .time-filter, .course-filter, .marks-filter, .pending-hours-filter').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.currentPage = 1;
                this.applyFilters();
                this.updateFilteredDownloadButton();
            });
        });
    }

    updateFilteredDownloadButton() {
        const downloadFilteredBtn = document.getElementById('downloadExcelBtn');
        if (!downloadFilteredBtn) return;

        const hasActiveFilters = this.hasActiveFilters();

        downloadFilteredBtn.disabled = !hasActiveFilters;

        if (hasActiveFilters) {
            downloadFilteredBtn.classList.remove('disabled-filter');
        } else {
            downloadFilteredBtn.classList.add('disabled-filter');
        }
    }

    hasActiveFilters() {
        const hasSpecificPrograms = !this.selectedPrograms.has('all');

        const hasStatusFilters = document.querySelectorAll('.status-filter:checked').length > 0;
        const hasCampusFilters = document.querySelectorAll('.campus-filter:checked').length > 0;
        const hasCPLFilters = document.querySelectorAll('.cpl-filter:checked').length > 0;
        const hasMarksFilters = document.querySelectorAll('.marks-filter:checked').length > 0;
        const hasTimeFilters = document.querySelectorAll('.time-filter:checked').length > 0;
        const hasCourseFilters = document.querySelectorAll('.course-filter:checked').length > 0;
        const hasPendingHoursFilters = document.querySelectorAll('.pending-hours-filter:checked').length > 0;

        const hasDateFilters = this.selectedStartDate;

        return hasSpecificPrograms || hasStatusFilters || hasCampusFilters || hasCPLFilters ||
            hasMarksFilters || hasTimeFilters || hasCourseFilters || hasPendingHoursFilters || hasDateFilters;
    }

    handleProgramFilter(event) {
        const value = event.target.dataset.value;

        // Multi-select program filters logic
        if (value === 'all') {
            // If "All Programs" is clicked
            if (this.selectedPrograms.has('all')) {
                // If already selected, do nothing
                return;
            } else {
                // Clear all other selections and select "all"
                this.selectedPrograms.clear();
                this.selectedPrograms.add('all');
            }
        } else if (value === 'all_ils') {
            // If "All ILS Programs" is clicked
            if (this.selectedPrograms.has('all_ils')) {
                // If already selected, do nothing
                return;
            } else {
                // Clear all selections and add all ILS programs
                this.selectedPrograms.clear();
                const ilsPrograms = this.getProgramsByType('ILS');
                ilsPrograms.forEach(program => this.selectedPrograms.add(program));
                this.selectedPrograms.add('all_ils'); // Add the type selector for visual state
            }
        } else if (value === 'all_ilp') {
            // If "All ILP Programs" is clicked
            if (this.selectedPrograms.has('all_ilp')) {
                // If already selected, do nothing
                return;
            } else {
                // Clear all selections and add all ILP programs
                this.selectedPrograms.clear();
                const ilpPrograms = this.getProgramsByType('ILP');
                ilpPrograms.forEach(program => this.selectedPrograms.add(program));
                this.selectedPrograms.add('all_ilp'); // Add the type selector for visual state
            }
        } else {
            // If a specific program is clicked
            if (this.selectedPrograms.has('all') || this.selectedPrograms.has('all_ils') || this.selectedPrograms.has('all_ilp')) {
                // If any "all" was selected, remove them
                this.selectedPrograms.delete('all');
                this.selectedPrograms.delete('all_ils');
                this.selectedPrograms.delete('all_ilp');
            }

            // Toggle the selected state
            if (this.selectedPrograms.has(value)) {
                this.selectedPrograms.delete(value);
                // If no programs selected, revert to "all"
                if (this.selectedPrograms.size === 0) {
                    this.selectedPrograms.add('all');
                }
            } else {
                this.selectedPrograms.add(value);
            }
        }

        // Update visual state of buttons
        document.querySelectorAll('#program-buttons .filter-button').forEach(btn => {
            const btnValue = btn.dataset.value;
            if (this.selectedPrograms.has(btnValue)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.currentPage = 1;
        this.applyFilters();
        this.updateFilteredDownloadButton();
    }

    applyFilters() {
        let filtered = [...this.reportData];

        // Filter by program (multi-select)
        if (!this.selectedPrograms.has('all')) {
            // Remove type selectors from the actual filtering
            const actualPrograms = new Set([...this.selectedPrograms].filter(p =>
                p !== 'all_ils' && p !== 'all_ilp'
            ));

            if (actualPrograms.size > 0) {
                filtered = filtered.filter(row =>
                    actualPrograms.has(row['Program Name'])
                );
            }
        }

        // Filter by Start Date only
        if (this.selectedStartDate) {
            filtered = filtered.filter(row => {
                const startDate = this.convertDateFormat(row['Start Date']);

                if (startDate) {
                    return startDate === this.selectedStartDate;
                }
                return false; // Don't include rows without dates
            });
        }

        // Filter by status
        const selectedStatuses = Array.from(document.querySelectorAll('.status-filter:checked')).map(cb => cb.value);
        this.selectedStatuses = new Set(selectedStatuses);
        if (selectedStatuses.length > 0) {
            filtered = filtered.filter(row =>
                selectedStatuses.includes(row['Progress Status'])
            );
        }

        // Filter by campus
        const selectedCampuses = Array.from(document.querySelectorAll('.campus-filter:checked')).map(cb => cb.value);
        this.selectedCampuses = new Set(selectedCampuses);
        if (selectedCampuses.length > 0) {
            filtered = filtered.filter(row => {
                const campus = this.getCampusFromVNumber(row['VNumber']);
                return selectedCampuses.includes(campus);
            });
        }

        // Filter by CPL
        const selectedCPLs = Array.from(document.querySelectorAll('.cpl-filter:checked')).map(cb => cb.value);
        this.selectedCPLs = new Set(selectedCPLs);
        if (selectedCPLs.length > 0) {
            filtered = filtered.filter(row =>
                selectedCPLs.includes(row['CPL'])
            );
        }

        // Filter by Average Marks
        const selectedMarksFilters = Array.from(document.querySelectorAll('.marks-filter:checked')).map(cb => cb.value);
        this.selectedMarksFilters = new Set(selectedMarksFilters);
        if (selectedMarksFilters.length > 0) {
            filtered = filtered.filter(row => {
                const studentMarks = row['Average Marks'];
                return selectedMarksFilters.some(filter => {
                    switch (filter) {
                        case 'below_70':
                            return typeof studentMarks === 'number' && studentMarks < 70;
                        case '70_80':
                            return typeof studentMarks === 'number' && studentMarks >= 70 && studentMarks < 80;
                        case '80_90':
                            return typeof studentMarks === 'number' && studentMarks >= 80 && studentMarks < 90;
                        case 'above_90':
                            return typeof studentMarks === 'number' && studentMarks >= 90;
                        case 'n_a_marks':
                            return studentMarks === 'N/A' || studentMarks === undefined;
                        default:
                            return false;
                    }
                });
            });
        }

        // Filter by time completion
        const selectedTimeFilters = Array.from(document.querySelectorAll('.time-filter:checked')).map(cb => cb.value);
        this.selectedTimeFilters = new Set(selectedTimeFilters);
        if (selectedTimeFilters.length > 0) {
            filtered = filtered.filter(row => {
                const timeComp = row['TIME COMP %'];
                if (timeComp === 'N/A' || timeComp === undefined) return false;

                return selectedTimeFilters.some(filter => {
                    switch (filter) {
                        case 'below_50': return timeComp < 50;
                        case '50_80': return timeComp >= 50 && timeComp < 80;
                        case '80_90': return timeComp >= 80 && timeComp < 90;
                        case 'above_90': return timeComp >= 90;
                        default: return false;
                    }
                });
            });
        }

        // Filter by course completion
        const selectedCourseFilters = Array.from(document.querySelectorAll('.course-filter:checked')).map(cb => cb.value);
        this.selectedCourseFilters = new Set(selectedCourseFilters);
        if (selectedCourseFilters.length > 0) {
            filtered = filtered.filter(row => {
                const courseComp = row['CRS COMP %'];
                if (courseComp === 'N/A' || courseComp === undefined) return false;

                return selectedCourseFilters.some(filter => {
                    switch (filter) {
                        case 'below_50': return courseComp < 50;
                        case '50_80': return courseComp >= 50 && courseComp < 80;
                        case '80_90': return courseComp >= 80 && courseComp < 90;
                        case 'above_90': return courseComp >= 90;
                        default: return false;
                    }
                });
            });
        }

        // Filter by pending hours
        const selectedPendingHoursFilters = Array.from(document.querySelectorAll('.pending-hours-filter:checked')).map(cb => cb.value);
        this.selectedPendingHoursFilters = new Set(selectedPendingHoursFilters);
        if (selectedPendingHoursFilters.length > 0) {
            filtered = filtered.filter(row => {
                // Hem 3W hem 4W pending hours'ını kontrol et
                const pendingHours3W = this.parseTimeToHours(row['Pend. Hrs (3W)'] || '');
                const pendingHours4W = this.parseTimeToHours(row['4W Hours'] || '');

                return selectedPendingHoursFilters.some(filter => {
                    switch (filter) {
                        case 'low_pending':
                            return (pendingHours3W >= 1 && pendingHours3W <= 20) ||
                                (pendingHours4W >= 1 && pendingHours4W <= 20);
                        case 'medium_pending':
                            return (pendingHours3W >= 21 && pendingHours3W <= 40) ||
                                (pendingHours4W >= 21 && pendingHours4W <= 40);
                        case 'high_pending':
                            return pendingHours3W >= 41 || pendingHours4W >= 41;
                        default:
                            return false;
                    }
                });
            });
        }

        this.filteredData = filtered;
        this.renderTable();
        this.updatePagination();
    }

    renderTable() {
        const container = document.getElementById('tableContainer');

        // Always show table headers
        let tableHTML = `
    <table class="student-table">
        <thead>
            <tr>
                ${this.headers.map((header, index) => {
            const isStartDate = header === 'Start Date';
            const calendarIcon = isStartDate ? '<i class="fas fa-calendar-alt" style="margin-left: 5px; cursor: pointer;"></i>' : '';
            return `<th style="position: relative; ${isStartDate ? 'cursor: pointer;' : ''}">${this.escapeHtml(header)}${calendarIcon}</th>`;
        }).join('')}
            </tr>
        </thead>
        <tbody>
        `;

        if (this.filteredData.length === 0) {
            // Show no data message in table body but keep headers
            tableHTML += `
            <tr>
                <td colspan="${this.headers.length}" style="text-align: center; padding: 20px; color: #666;">
                    No reports data available with current filters.
                </td>
            </tr>
        `;
        } else {
            const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredData.length);
            const pageData = this.filteredData.slice(startIndex, endIndex);

            pageData.forEach(row => {
                const statusClass = row['Progress Status'] ? `status-${row['Progress Status'].replace(/\s+/g, '_').replace(/\//g, '_')}` : '';
                tableHTML += `<tr class="${statusClass}">`;

                this.headers.forEach((header, index) => {
                    let cellValue = row[header] || '';

                    // Format percentage values
                    if (header.includes('%') && typeof cellValue === 'number') {
                        cellValue = cellValue.toFixed(2) + '%';
                    }

                    // Pending Hours sütunları için renklendirme
                    let cellClass = '';
                    if (header === 'Pend. Hrs (3W)' || header === 'Pend. Hrs (4W)') {
                        const pendingHours = this.parseTimeToHours(cellValue);

                        if (pendingHours === 0) {
                            cellClass = 'pending-none';
                        } else if (pendingHours > 0 && pendingHours <= 20) {
                            cellClass = 'pending-low';
                        } else if (pendingHours > 20 && pendingHours <= 40) {
                            cellClass = 'pending-medium';
                        } else if (pendingHours > 40) {
                            cellClass = 'pending-high';
                        }
                    }

                    if (header === 'Pend. Last W.') {
                        const remainingHours = parseFloat(cellValue.replace('h', '')) || 0;

                        if (remainingHours === 0) {
                            cellClass = 'pending-none';
                        } else if (remainingHours > 0 && remainingHours <= 5) {
                            cellClass = 'pending-low';
                        } else if (remainingHours > 5 && remainingHours <= 10) {
                            cellClass = 'pending-medium';
                        } else if (remainingHours > 10) {
                            cellClass = 'pending-high';
                        }
                    }

                    if (index === 4 || index === 5) {
                        tableHTML += `<td class="${cellClass}" style="white-space: nowrap;">${this.escapeHtml(cellValue)}</td>`;
                    } else {
                        tableHTML += `<td class="${cellClass}">${this.escapeHtml(cellValue)}</td>`;
                    }
                });

                tableHTML += '</tr>';
            });
        }

        tableHTML += `
            </tbody>
        </table>
    `;

        container.innerHTML = tableHTML;

        container.innerHTML = tableHTML;

        document.querySelectorAll('th').forEach((th, index) => {
            const header = this.headers[index];
            if (header === 'Start Date') {
                th.addEventListener('click', (e) => {
                    e.stopPropagation();

                    document.querySelectorAll('.date-picker').forEach(picker => {
                        if (picker && picker.parentElement) {
                            picker.remove();
                        }
                    });

                    const picker = this.createDatePicker(header, true);
                    if (picker) {
                        th.style.position = 'relative';
                        th.appendChild(picker);

                        setTimeout(() => {
                            this.initializeFlatpickr(picker);
                        }, 10);
                    }
                });
            }
        });

        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        document.getElementById('paginationControls').style.display = totalPages > 1 ? 'flex' : 'none';
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${totalPages} (${this.filteredData.length} entries)`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage === 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;
        }
    }

    changePage(direction) {
        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        const newPage = this.currentPage + direction;

        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderTable();
            this.updatePagination();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    downloadFilteredExcel() {
        if (!this.hasActiveFilters()) {
            this.showAlert('Warning', 'Please select at least one filter to download filtered reports');
            return;
        }

        if (this.filteredData.length === 0) {
            this.showAlert('Warning', 'No filtered data available to download');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            // Use all headers (including Week columns) for Excel download
            const allHeaders = this.rawHeaders;
            const wsData = [allHeaders];

            this.filteredData.forEach(row => {
                const rowArray = allHeaders.map(header => {
                    let value = row[header] || '';
                    if (header.includes('%') && typeof value === 'number') {
                        value = value.toFixed(2) + '%';
                    }
                    return value;
                });
                wsData.push(rowArray);
            });

            const ws = XLSX.utils.aoa_to_sheet(wsData);

            const colWidths = allHeaders.map(() => ({ width: 15 }));
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, 'Filtered Reports');

            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours12 = now.getHours() % 12 || 12;
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
            const formattedHours = String(hours12).padStart(2, '0');

            const filename = `Weekly-Filtered-Reports_${year}-${month}-${day}_${formattedHours}-${minutes}-${ampm}.xlsx`;
            console.log('Generated filename:', filename);

            // Create blob and download link
            try {
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/octet-stream' });

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (fallbackError) {
                // If blob method fails, use regular XLSX.writeFile
                XLSX.writeFile(wb, filename);
            }

        } catch (error) {
            console.error('Error downloading filtered Excel:', error);
            this.showAlert('Error', 'Failed to download filtered Excel file: ' + error.message);
        }
    }

    downloadAllReports() {
        if (this.reportData.length === 0) {
            this.showAlert('Warning', 'No report data available to download');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            // Use all headers (including Week columns) for Excel download
            const allHeaders = this.rawHeaders;
            const wsData = [allHeaders];

            this.reportData.forEach(row => {
                const rowArray = allHeaders.map(header => {
                    let value = row[header] || '';
                    if (header.includes('%') && typeof value === 'number') {
                        value = value.toFixed(2) + '%';
                    }
                    return value;
                });
                wsData.push(rowArray);
            });

            const ws = XLSX.utils.aoa_to_sheet(wsData);

            const colWidths = allHeaders.map(() => ({ width: 15 }));
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, 'All Reports');

            // Generate filename with timestamp
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours12 = now.getHours() % 12 || 12;
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
            const formattedHours = String(hours12).padStart(2, '0');

            const filename = `Weekly-All-Reports_${year}-${month}-${day}_${formattedHours}-${minutes}-${ampm}.xlsx`;

            // Create a temporary link element to force download with specific filename
            try {
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/octet-stream' });

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (fallbackError) {
                // If blob method fails, use regular XLSX.writeFile
                XLSX.writeFile(wb, filename);
            }

        } catch (error) {
            console.error('Error downloading all reports Excel:', error);
            this.showAlert('Error', 'Failed to download all reports Excel file: ' + error.message);
        }
    }

    showAlert(title, message) {
        const modal = document.getElementById('customAlertModal');
        const titleElement = document.getElementById('alertTitle');
        const messageElement = document.getElementById('alertMessage');

        if (modal && titleElement && messageElement) {
            titleElement.textContent = title;
            messageElement.textContent = message;
            modal.style.display = 'flex';
        }
    }

    hideAlert() {
        const modal = document.getElementById('customAlertModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    addClearButton(instance) {
        // Check if clear button already exists
        const existingClearButton = instance.calendarContainer.querySelector('.custom-clear-button');
        if (existingClearButton) {
            return;
        }

        // Create clear button
        const clearButton = document.createElement('button');
        clearButton.className = 'custom-clear-button';
        clearButton.innerHTML = '<i class="fas fa-times"></i>';
        clearButton.type = 'button';
        clearButton.title = 'Clear date selection';

        // Style the clear button
        clearButton.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            z-index: 1001;
            background-color: #f44336;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            line-height: 1;
            transition: background-color 0.3s ease;
        `;

        clearButton.addEventListener('mouseenter', () => {
            clearButton.style.backgroundColor = '#d32f2f';
        });
        clearButton.addEventListener('mouseleave', () => {
            clearButton.style.backgroundColor = '#f44336';
        });

        // Add click event
        clearButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Clear the date
            instance.clear();
            this.selectedStartDate = null;
            this.currentPage = 1;
            this.applyFilters();
            this.updateFilteredDownloadButton();

            // Close the picker
            setTimeout(() => {
                if (instance && instance.close) {
                    instance.close();
                }
            }, 100);
        });

        // Add to calendar container
        instance.calendarContainer.style.position = 'relative';
        instance.calendarContainer.appendChild(clearButton);
    }

    positionCalendar(instance, picker) {
        if (!instance || !instance.calendarContainer || !picker) {
            return;
        }

        // Get the picker's position
        const pickerRect = picker.getBoundingClientRect();
        const calendar = instance.calendarContainer;

        // Position the calendar below the picker
        calendar.style.position = 'absolute';
        calendar.style.top = `${pickerRect.bottom + window.scrollY}px`;
        calendar.style.left = `${pickerRect.left + window.scrollX}px`;
        calendar.style.zIndex = '1000';

        // Ensure calendar doesn't go off-screen
        const calendarRect = calendar.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Adjust horizontal position if needed
        if (calendarRect.right > windowWidth) {
            calendar.style.left = `${windowWidth - calendarRect.width - 10}px`;
        }

        // Adjust vertical position if needed
        if (calendarRect.bottom > windowHeight) {
            calendar.style.top = `${pickerRect.top + window.scrollY - calendarRect.height - 5}px`;
        }
    }

    generateFileName(baseName) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
        const hours12 = now.getHours() % 12 || 12;
        const formattedHours = String(hours12).padStart(2, '0');

        const dateStr = `${year}-${month}-${day}_${formattedHours}-${minutes}-${ampm}`;
        const filename = `${baseName}_${dateStr}.xlsx`;

        // Ensure filename is valid
        return filename.replace(/[<>:"/\\|?*]/g, '-');
    }

    // parseTimeToHours fonksiyonunu da ekleyelim
    parseTimeToHours(timeString) {
        if (!timeString || timeString === 'N/A' || timeString === '') {
            return 0;
        }

        try {
            // "50:00:00" formatını parse et
            const parts = timeString.split(':');
            if (parts.length >= 2) {
                const hours = parseInt(parts[0]) || 0;
                const minutes = parseInt(parts[1]) || 0;
                const seconds = parseInt(parts[2]) || 0;

                // Dakika ve saniyeyi saate çevir
                return hours + (minutes / 60) + (seconds / 3600);
            }

            // Eğer sadece sayı varsa direkt döndür
            return parseFloat(timeString) || 0;
        } catch (error) {
            console.error('Error parsing time string:', timeString, error);
            return 0;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WeeklyReports();
});