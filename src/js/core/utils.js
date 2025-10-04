class HelperFunctions {
    static matchesUrlPattern(patterns) {
        const currentUrl = window.location.href;

        const negativePatterns = patterns.filter(p => p.startsWith('!'));
        if (negativePatterns.some(p => currentUrl.startsWith(p.substring(1)))) {
            return false;
        }

        const positivePatterns = patterns.filter(p => !p.startsWith('!'));
        if (positivePatterns.length === 0) {
            return true;
        }

        return positivePatterns.some(p => currentUrl.startsWith(p));
    }

    static urlCheck(urlRules, func) {
        return function (...args) {
            if (HelperFunctions.matchesUrlPattern(urlRules)) {
                return func.apply(this, args);
            }
        };
    }

    static evaluateXPath(xpath, resultType = XPathResult.FIRST_ORDERED_NODE_TYPE) {
        return document.evaluate(xpath, document, null, resultType, null);
    }

    static async fetchData(url, options) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            ErrorHandler.showAlert(`Failed to fetch data from ${url}. Please check your connection and try again.`, 'error');
            throw error; // Or return { success: false, error: error.message }
        }
    }

    static getElementByXPath(xpathKey) {
        const xpath = SELECTORS[xpathKey];
        if (!xpath) return null;
        return this.evaluateXPath(xpath).singleNodeValue;
    }

    static createPaymentEmail(data) {
        const { name, breakdown, totalAmtPaid, campus } = data;

        if (!name || !breakdown || !Array.isArray(breakdown) || breakdown.length === 0) {
            console.error('Invalid data provided for payment email creation');
            return '';
        }

        console.log('tableRows', breakdown);

        const tableRows = breakdown.map(item => {
            if (item[2] < 0 && !item[3] && !item[4]) return `<tr><td>${item[0]}</td><td>${item[1]}</td><td>${item[2]}</td><td></td><td><b>Chargeback for cancelled student</b></td></tr>`;
            return `<tr><td>${campus}</td><td>${item[0]}</td><td>${item[1]}</td><td>${Math.round(parseInt(item[2]), 1)}</td><td>${Math.round(parseInt(item[3]), 1)}</)}</td></tr>`
        });


        const emailContent = `Hello ${name},<p></p><p></p>Hope this email finds you well.<p></p><p></p>We have initiated your commission payment for below mentioned.<p></p>If you have any questions, please "Reply All" to this email OR reach out to = Khushi.Aggarwal@aoltoronto.com<table border=\"1\" cellpadding=\"8\" cellspacing=\"0\" style=\"border-collapse: collapse; font-family: Arial, sans-serif;"><thead style=\"background-color: #f2f2f2;\"><tr><th>Campus</th><th>Fullname</th><th>V-number</th><th>1st Commission</th><th>2nd Commission</th></tr></thead><tbody>${tableRows.join('')}<tr><td>Total</td><td></td><td></td><td>${totalAmtPaid}</td></tr></tbody></table><br>Thanks & Regards,<br>Team Accounts`;

        // console.log(emailContent);
        return emailContent;

    }

    static findVNumber() {
        let vNumber = null;

        // Method 1: Check if vNumber is already stored in StateManager
        vNumber = StateManager.getVCodeText();
        if (vNumber && /^V[TBN]\d+$/.test(vNumber)) {
            return vNumber;
        }

        // Method 2: Scan through specific HTML elements for text nodes containing V-numbers
        const validTags = ['span', 'div', 'td', 'p'];
        for (const tag of validTags) {
            const elements = document.getElementsByTagName(tag);
            for (const element of elements) {
                if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
                    const text = element.textContent.trim();
                    if (/^V[TBN]\d+$/.test(text)) {
                        vNumber = text;
                        break;
                    }
                }
            }
            if (vNumber) break;
        }

        // Method 3: Look for VNumber in any td elements on the page (original approach)
        if (!vNumber) {
            const vNumberElements = document.querySelectorAll('td');
            for (const td of vNumberElements) {
                const text = td.textContent.trim();
                if (/^V[TBN]\d+$/.test(text)) {
                    vNumber = text;
                    break;
                }
            }
        }

        // Method 4: Use XPath to find VNumber
        if (!vNumber) {
            const vNumberXPath = "//td[contains(text(), 'VT') or contains(text(), 'VB') or contains(text(), 'VN')]";
            const vNumberResult = document.evaluate(vNumberXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            if (vNumberResult.singleNodeValue) {
                vNumber = vNumberResult.singleNodeValue.textContent.trim();
            }
        }

        // Method 5: Try to find using the pre-defined VNO XPath selector
        if (!vNumber) {
            const vNoElement = this.getElementByXPath('VNO');
            if (vNoElement) {
                vNumber = vNoElement.textContent.trim();
            }
        }

        // Store found vNumber for future use if valid
        if (vNumber && /^V[TBN]\d+$/.test(vNumber)) {
            StateManager.setVCodeText(vNumber);
        }

        return vNumber;
    }

    static getCampusFromVNumber(vNumber) {
        const campusMap = {
            'T': 'Toronto',
            'B': 'Brampton',
            'N': 'North York'
        };

        const vNumberPrefix = vNumber.substring(1, 2);
        return campusMap[vNumberPrefix] || 'Toronto';
    }

    static async getFallbackMappings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['rulesData'], (result) => {
                const rulesData = result.rulesData || {};
                const fallbackMappings = rulesData.fallback_mappings || {};

                // Combine course_codes and course_names into one object for backwards compatibility
                const combinedMappings = {
                    ...fallbackMappings.course_codes || {},
                    ...fallbackMappings.course_names || {}
                };

                resolve(combinedMappings);
            });
        });
    }

    static async findCourseMappingWithFallback(courseCode, customMappings = null) {
        try {
            // Get mappings from storage if not provided
            const courseMappings = customMappings || await this.getFallbackMappings();

            if (!courseMappings || Object.keys(courseMappings).length === 0) {
                return null;
            }

            // First try exact match
            if (courseMappings[courseCode]) {
                const mapping = courseMappings[courseCode];
                if (Array.isArray(mapping)) {
                    return mapping[0]; // Return first option for now (can be enhanced later)
                }
                return mapping;
            }

            // Then try pattern matching (same as existing code)
            for (const [pattern, mapping] of Object.entries(courseMappings)) {
                if (pattern.includes('*') || pattern.includes('?')) {
                    const regexPattern = pattern
                        .replace(/\*/g, '[A-Z0-9]*')
                        .replace(/\?/g, '[A-Z0-9]');
                    const regex = new RegExp(`^${regexPattern}$`, 'i');

                    if (regex.test(courseCode)) {
                        if (Array.isArray(mapping)) {
                            return mapping[0]; // Return first option
                        }
                        return mapping;
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Error finding course mapping:', error);
            return null;
        }
    }

    static showInlineCopyAlert(element) {
        try {
            const alert = document.createElement('div');
            alert.textContent = 'Copied';
            alert.style.cssText = CONFIG.INLINE_ALERT_STYLES;

            const rect = element.getBoundingClientRect();
            alert.style.left = `${rect.right + 5}px`;
            alert.style.top = `${rect.top + window.scrollY}px`;

            document.body.appendChild(alert);

            setTimeout(() => {
                alert.style.opacity = '1';
            }, 0);

            setTimeout(() => {
                alert.style.opacity = '0';
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.remove();
                    }
                }, 300);
            }, 2000);
        } catch (error) {
            console.log(error, 'showInlineCopyAlert');
        }
    }

    static createCopyIcon(text, style = {}) {
        const copyIcon = document.createElement('i');
        copyIcon.className = 'fas fa-copy';
        copyIcon.style.cursor = 'pointer';
        copyIcon.style.display = 'inline';
        copyIcon.title = 'Copy to Clipboard';
        Object.assign(copyIcon.style, style);

        copyIcon.addEventListener('click', () => {
            navigator.clipboard.writeText(text)
                .then(() => {
                    this.showInlineCopyAlert(copyIcon);
                })
                .catch(err => {
                    ErrorHandler.showAlert('Failed to copy text to clipboard.', 'error');
                });
        });

        return copyIcon;
    }

    static addCopyIconToElement(element, textToCopy, options = {}) {
        if (!element) return null;

        const position = options.position || 'before';
        const style = options.style || { marginRight: '5px' };
        const title = options.title || 'Copy to Clipboard';
        const addNoWrap = options.addNoWrap !== false; // Default to true unless explicitly set to false

        const copyIcon = this.createCopyIcon(textToCopy, style);
        copyIcon.title = title;

        const targetElement = ['before', 'after'].includes(position) ? element.parentNode : element;

        // Check if we're on active or deactive lists page
        const isListPage = window.location.href.includes(CONFIG.ACTIVE_LISTS_URL) ||
            window.location.href.includes(CONFIG.DEACTIVE_LISTS_URL);

        // Add white-space: nowrap if specified and target element doesn't already have it
        // BUT only if we're not on the lists pages
        if (addNoWrap && targetElement && !isListPage) {
            const computedStyle = window.getComputedStyle(targetElement);
            const hasNoWrap = computedStyle.whiteSpace === 'nowrap' ||
                targetElement.classList.contains('text-nowrap') ||
                targetElement.style.whiteSpace === 'nowrap';

            // Enhanced check for word-break that catches both computed and inline styles
            const hasWordBreak = computedStyle.wordBreak === 'break-all' ||
                targetElement.style.wordBreak === 'break-all' ||
                (targetElement.getAttribute('style') &&
                    targetElement.getAttribute('style').includes('word-break: break-all'));

            // Only add nowrap if element doesn't have nowrap styling AND doesn't have word-break: break-all
            if (!hasNoWrap && !hasWordBreak) {
                targetElement.style.whiteSpace = 'nowrap';
            }
        }

        switch (position) {
            case 'after':
                element.parentNode.insertBefore(copyIcon, element.nextSibling);
                break;
            case 'prepend':
                element.insertBefore(copyIcon, element.firstChild);
                break;
            case 'append':
                element.appendChild(copyIcon);
                break;
            default: // 'before'
                element.parentNode.insertBefore(copyIcon, element);
        }

        return copyIcon;
    }

    static capitalizeWords(str) {
        if (!str) return '';
        return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    static setButtonLoadingState(element, isLoading, originalIcon = 'fa-paper-plane', timeout = 3000, text = '') {
        if (isLoading) {
            element.disabled = true;
            element.classList.add('disabled');

            // Add spinner styles if needed
            const spinnerStyle = `
                @keyframes enhancerSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .enhancer-spinner {
                    display: inline-block;
                    animation: enhancerSpin 1s linear infinite;
                }
            `;

            if (!document.getElementById('enhancer-spinner-style')) {
                const styleEl = document.createElement('style');
                styleEl.id = 'enhancer-spinner-style';
                styleEl.textContent = spinnerStyle;
                document.head.appendChild(styleEl);
            }

            element.innerHTML = `<i class="fas fa-spinner enhancer-spinner"></i>${text ? '<span style="margin-left: 5px;">' + text + '</span>' : ''}`;

            if (timeout > 0) {
                setTimeout(() => this.setButtonLoadingState(element, false, originalIcon, 0, ''), timeout);
            }
        } else {
            element.disabled = false;
            element.classList.remove('disabled');
            element.innerHTML = `<i class="fas ${originalIcon}"></i>${text ? ' ' + text : ''}`;
        }
    }

    static async sendMessage(action, data = {}) {
        return new Promise(resolve => {
            chrome.runtime.sendMessage({ action, data }, resolve);
        });
    }

    static async downloadFile(url, fileName) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const tempLink = document.createElement('a');
            tempLink.href = blobUrl;
            tempLink.setAttribute('download', fileName);
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
            window.URL.revokeObjectURL(blobUrl);
            return true;
        } catch (error) {
            console.log(error, 'downloadFile');
            return false;
        }
    }

    static getColumnIndex(elements, columnName) {
        let columnIndex = 0;
        for (let i = 0; i < elements.snapshotLength; i++) {
            const th = elements.snapshotItem(i);
            if (th && th.textContent && th.textContent.toLowerCase().includes(columnName.toLowerCase())) {
                columnIndex = i + 1;
                break;
            }
        }
        return columnIndex;
    }

    static getCurrentMonday() {
        const today = new Date();
        today.setDate(today.getDate() - today.getDay() + 1); // Set to Monday of current week
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const year = today.getFullYear();
        return { month, day, year, formattedDate: `${month}/${day}/${year}` };
    }

    static getNextMonday() {
        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const day = today.getDay(); // 0 is Sunday, 1 is Monday
        const daysUntilNextMonday = day === 0 ? 1 : 8 - day;

        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + daysUntilNextMonday);

        return nextMonday.toLocaleDateString('en-CA');
    }

    static async fetchProgramMappings() {
        try {
            const result = await new Promise(resolve => {
                chrome.storage.local.get('allPrograms', result => {
                    resolve(result.allPrograms || []);
                });
            });

            // Transform allPrograms data into programNameMappings format
            const mappings = {};

            if (Array.isArray(result)) {
                result.forEach(program => {
                    // Skip undefined programs or those without programName
                    if (!program || !program.programName) return;

                    // Create an array with the main name and all alternative names
                    mappings[program.programName] = [
                        program.programName,
                        ...(Array.isArray(program.alternativeNames) ? program.alternativeNames : [])
                    ];
                });
            }

            // Store the mappings in the global variable
            programNameMappings = mappings;
        } catch (err) {
            console.error('Error loading program mappings from storage:', err);
            programNameMappings = {};
        }
    }

    static async processExcelBlob(blob, dateColumns = [], options = {}) {
        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = function (e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    const { sheetname } = options;

                    // Use provided sheetname or default to the first sheet
                    const firstSheetName = workbook.SheetNames.includes(sheetname) ? sheetname : workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // First get all rows with headers preserved
                    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                    if (!rawData || rawData.length === 0) {
                        console.warn('Excel data was empty or could not be parsed');
                        resolve(options.includeWorkbook ? { data: [], workbook } : []);
                        return;
                    }

                    // Get headers from the first row
                    const headers = rawData[0].map(header => String(header || '').trim());

                    // Create JSON with consistent columns for all rows
                    const jsonData = [];
                    let nameFieldsProcessed = 0;
                    let emailFieldsProcessed = 0;
                    let postalCodeFieldsProcessed = 0;

                    // Define possible name field variations - more comprehensive list
                    const nameFields = [
                        'Student Name', 'Fullname', 'Full Name', 'First Name', 'Last Name',
                        'Name', 'St.Name', 'St. Name', 'Student'
                    ];

                    // Define postal code field variations
                    const postalCodeFields = [
                        'Postal Code', 'PostalCode', 'Postal', 'ZIP', 'Zip Code', 'Post Code'
                    ];

                    // Log which name fields were found in the headers
                    const foundNameFields = nameFields.filter(field => headers.includes(field));
                    const foundPostalCodeFields = postalCodeFields.filter(field => headers.includes(field));

                    for (let i = 1; i < rawData.length; i++) {
                        const row = rawData[i];
                        if (!row || row.length === 0) continue; // Skip empty rows

                        const rowData = {};
                        // Ensure all headers exist in each row
                        headers.forEach((header, index) => {
                            if (header) { // Only add non-empty headers
                                let cellValue = index < row.length ? row[index] : '';

                                // Apply maximum cell length limit if specified
                                if (options.maxCellLength && typeof cellValue === 'string' &&
                                    cellValue.length > options.maxCellLength) {
                                    cellValue = cellValue.substring(0, options.maxCellLength) + '...';
                                }

                                rowData[header] = cellValue;
                            }
                        });

                        // 1. Clean name fields - remove Mr., Ms., etc. and extra spaces
                        foundNameFields.forEach(field => {
                            if (rowData[field] && typeof rowData[field] === 'string') {
                                const originalValue = rowData[field];

                                rowData[field] = rowData[field]
                                    .replace(/^(Mr\.?|Ms\.?|Mrs\.?|Dr\.?|Prof\.?|Miss|Mister|Madam|Sir)\s+\.?\s*/i, '')
                                    .replace(/^(Mr|Ms|Mrs|Dr|Prof)\s+\.\s*/i, '')
                                    .replace(/\s{2,}/g, ' ')
                                    .trim();

                                if (originalValue !== rowData[field]) {
                                    nameFieldsProcessed++;
                                }
                            }
                        });

                        // 2. FIRST: Check for email address shift and correct column alignment
                        const emailFields = ['Email Id', 'Email Address', 'Username(Email Id)', 'Email'];
                        let hasValidEmail = false;

                        // Clean and check email fields
                        emailFields.forEach(field => {
                            if (rowData[field] && typeof rowData[field] === 'string') {
                                const originalValue = rowData[field];
                                rowData[field] = rowData[field].replace(/[^\x00-\x7F]/g, '').trim();

                                if (originalValue !== rowData[field]) {
                                    emailFieldsProcessed++;
                                }

                                if (rowData[field].includes('@')) {
                                    hasValidEmail = true;
                                }
                            }
                        });

                        // If no valid email found in standard fields, scan all fields for email AND fix column shift
                        if (!hasValidEmail) {
                            const orderedFields = Object.keys(rowData);
                            let emailIndex = -1;
                            let emailFieldName = null;

                            emailFields.forEach(field => {
                                const index = orderedFields.indexOf(field);
                                if (index !== -1 && emailIndex === -1) {
                                    emailIndex = index;
                                    emailFieldName = field;
                                }
                            });

                            if (emailIndex !== -1) {
                                // Scan subsequent columns for email-like data
                                for (let j = emailIndex + 1; j < orderedFields.length; j++) {
                                    const field = orderedFields[j];
                                    const value = rowData[field];

                                    if (value && typeof value === 'string' && value.includes('@')) {
                                        const emailMatch = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

                                        if (emailMatch) {
                                            console.log(`Row ${i}: Found email "${value}" in wrong column (${field}). Shifting data.`);

                                            // Shift all columns backward starting from the email position
                                            for (let k = emailIndex; k < orderedFields.length - 1; k++) {
                                                rowData[orderedFields[k]] = rowData[orderedFields[k + 1]];
                                            }

                                            // Clear the last field to avoid duplication
                                            rowData[orderedFields[orderedFields.length - 1]] = '';

                                            if (rowData[emailFieldName] && rowData[emailFieldName].includes('@')) {
                                                hasValidEmail = true;
                                                if (i === 1) {
                                                    console.log(`Email column shift corrected. New ${emailFieldName}: ${rowData[emailFieldName]}`);
                                                }
                                            }
                                            break;
                                        }
                                    }
                                }
                            }

                            // Final scan for emails in any field if still not found
                            if (!hasValidEmail) {
                                for (const field in rowData) {
                                    const value = rowData[field];
                                    if (value && typeof value === 'string' && value.includes('@')) {
                                        const emailMatch = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                                        if (emailMatch) {
                                            if (!rowData['Email Id']) {
                                                rowData['Email Id'] = emailMatch[0];
                                                if (i === 1) {
                                                    console.log(`Found and moved email from ${field} to Email Id: ${emailMatch[0]}`);
                                                }
                                            }
                                            hasValidEmail = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        // 3. SECOND: Check for address field shift and correct column alignment
                        const addressFields = ['Address', 'Street Address', 'Residential Address', 'Home Address'];
                        let hasAddress = false;

                        // Check if any address field has data
                        addressFields.forEach(field => {
                            if (rowData[field] && typeof rowData[field] === 'string' && rowData[field].trim() !== '') {
                                hasAddress = true;
                            }
                        });

                        // If no address found, check for column shift
                        if (!hasAddress) {
                            const orderedFields = Object.keys(rowData);
                            let addressIndex = -1;

                            addressFields.forEach(field => {
                                const index = orderedFields.indexOf(field);
                                if (index !== -1) {
                                    addressIndex = index;
                                }
                            });

                            if (addressIndex !== -1) {
                                const addressPattern = /^\d+\s+[A-Za-z]/;
                                const postalPattern = /[A-Z]\d[A-Z]\s*\d[A-Z]\d|^\d{5}(-\d{4})?$/i;
                                const streetTerms = /\b(street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?|lane|ln\.?|way|circle|cir\.?|court|ct\.?|blvd\.?|boulevard)\b/i;

                                for (let j = addressIndex + 1; j < orderedFields.length; j++) {
                                    const field = orderedFields[j];
                                    const value = rowData[field];

                                    if (value && typeof value === 'string' &&
                                        (addressPattern.test(value) || postalPattern.test(value) || streetTerms.test(value))) {

                                        console.log(`Row ${i}: Found address "${value}" in wrong column (${field}). Shifting data.`);

                                        // Shift all columns backward starting from this position
                                        for (let k = addressIndex; k < orderedFields.length - 1; k++) {
                                            rowData[orderedFields[k]] = rowData[orderedFields[k + 1]];
                                        }

                                        // Clear the last field to avoid duplication
                                        rowData[orderedFields[orderedFields.length - 1]] = '';
                                        break;
                                    }
                                }
                            }
                        }

                        // 4. THIRD (LAST): Process postal code fields - clean and validate format
                        foundPostalCodeFields.forEach(field => {
                            if (rowData[field] !== undefined) {
                                const fieldValue = String(rowData[field] || '').trim();

                                if (fieldValue) {
                                    // Field has content - clean and validate it
                                    const originalValue = fieldValue;
                                    const cleanedPostal = fieldValue.replace(/\s+/g, '').toUpperCase();
                                    const postalPattern = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;

                                    if (postalPattern.test(cleanedPostal)) {
                                        rowData[field] = cleanedPostal;
                                        if (originalValue !== cleanedPostal) {
                                            postalCodeFieldsProcessed++;
                                        }
                                    }
                                } else {
                                    // Field is empty - check if postal code is in wrong column
                                    const orderedFields = Object.keys(rowData);
                                    const currentIndex = orderedFields.indexOf(field);

                                    if (currentIndex > 0) {
                                        const previousField = orderedFields[currentIndex - 1];
                                        const previousValue = String(rowData[previousField] || '').trim();

                                        if (previousValue) {
                                            const postalInPrevious = previousValue.match(/[A-Z]\d[A-Z]\s*\d[A-Z]\d/i);

                                            if (postalInPrevious) {
                                                const extractedPostal = postalInPrevious[0].replace(/\s+/g, '').toUpperCase();
                                                const postalPattern = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;

                                                if (postalPattern.test(extractedPostal)) {
                                                    console.log(`Row ${i}: Found postal code "${extractedPostal}" in wrong column (${previousField}). Current postal field is empty. Shifting data.`);

                                                    // Find the "Apt/Unit #" field or similar to start the shift from
                                                    const aptFields = ['Apt/Unit #', 'Unit #', 'Apt #', 'Apartment', 'Unit'];
                                                    let shiftStartIndex = -1;

                                                    aptFields.forEach(aptField => {
                                                        const aptIndex = orderedFields.indexOf(aptField);
                                                        if (aptIndex !== -1 && shiftStartIndex === -1) {
                                                            shiftStartIndex = aptIndex;
                                                        }
                                                    });

                                                    const startShiftFrom = shiftStartIndex !== -1 ? shiftStartIndex : currentIndex;

                                                    // Shift all columns to the right starting from the determined position
                                                    for (let k = orderedFields.length - 1; k > startShiftFrom; k--) {
                                                        if (k - 1 >= 0) {
                                                            rowData[orderedFields[k]] = rowData[orderedFields[k - 1]];
                                                        }
                                                    }

                                                    // Clear the field we're shifting from
                                                    rowData[orderedFields[startShiftFrom]] = '';

                                                    // Set the postal code in the correct field
                                                    rowData[field] = extractedPostal;

                                                    // Remove postal code from the previous field if it was there
                                                    if (rowData[previousField]) {
                                                        rowData[previousField] = rowData[previousField].replace(/[A-Z]\d[A-Z]\s*\d[A-Z]\d/i, '').trim();
                                                    }

                                                    postalCodeFieldsProcessed++;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        });

                        // 5. Process phone fields
                        const phoneFields = headers.filter(h => /phone/i.test(h));
                        phoneFields.forEach(field => {
                            if (rowData[field] && typeof rowData[field] === 'string') {
                                const originalValue = rowData[field];
                                const cleaned = originalValue.replace(/\D/g, '');

                                // Only update if we found digits and it's different from original
                                if (cleaned && cleaned !== originalValue) {
                                    rowData[field] = cleaned;
                                }
                            }
                        });

                        // Add the processed row data
                        jsonData.push(rowData);
                    }

                    const dateFieldsToProcess = new Set();

                    // Add explicitly defined date columns
                    if (dateColumns && dateColumns.length > 0) {
                        dateColumns.forEach(col => dateFieldsToProcess.add(col));
                    }

                    // Auto-detect date columns if requested
                    if (options.processAllDates) {
                        headers.forEach(header => {
                            const key = header.toLowerCase();
                            if (
                                key.includes('date') ||
                                key === 'dob' ||
                                key.includes('day')
                            ) {
                                dateFieldsToProcess.add(header);
                            }
                        });
                    }

                    let datesProcessed = 0;

                    // Now process all identified date fields
                    if (dateFieldsToProcess.size > 0 && jsonData.length > 0) {
                        try {
                            jsonData.forEach(row => {
                                dateFieldsToProcess.forEach(dateField => {
                                    if (row[dateField] !== undefined) {
                                        const originalValue = row[dateField];

                                        // Check if it's a numeric Excel date
                                        if (typeof originalValue === 'number') {
                                            try {
                                                const date = HelperFunctions.convertExcelDate(originalValue);
                                                row[dateField] = date.toISOString().split('T')[0]; // YYYY-MM-DD
                                                datesProcessed++;

                                            } catch (dateError) {
                                                console.log(`Error converting Excel date in ${dateField}:`, dateError);
                                            }
                                        }
                                        // If it's a string that looks like a date, standardize format
                                        else if (typeof originalValue === 'string' && originalValue) {
                                            const formatted = HelperFunctions.formatDateString(originalValue);
                                            if (formatted !== originalValue) {
                                                row[dateField] = formatted;
                                                datesProcessed++;

                                                if (datesProcessed <= 2) { // Log just a few examples
                                                    console.log(`Formatted date string ${dateField}: ${originalValue} → ${formatted}`);
                                                }
                                            }
                                        }
                                    }
                                });
                            });

                        } catch (formatError) {
                            console.error('Error formatting date columns:', formatError);
                        }
                    }

                    if (options.includeWorkbook) {
                        console.log(`processExcelBlob: Completed processing ${jsonData.length} rows of Excel data`);
                        resolve({ data: jsonData, workbook });
                    } else {
                        resolve(jsonData);
                    }
                } catch (error) {
                    console.error('Error processing Excel data:', error);
                    resolve(options.includeWorkbook ? { data: [], workbook: null } : []);
                }
            };

            reader.onerror = function (error) {
                console.error('FileReader error:', error);
                resolve(options.includeWorkbook ? { data: [], workbook: null } : []);
            };

            reader.readAsArrayBuffer(blob);
        });
    }

    static extractEmailFromRow(row) {
        try {
            // First try known email column names
            const emailFromKnownFields = row['Email Id'] || row['Email Address'] || row['Username(Email Id)'] || row['Email'] || '';

            // Ensure it's a string before using includes method
            if (emailFromKnownFields && typeof emailFromKnownFields === 'string' && emailFromKnownFields.includes('@')) {
                return emailFromKnownFields;
            }

            // If no email found in expected columns, check all other columns
            for (const key in row) {
                const value = row[key];
                if (value && typeof value === 'string' && value.includes('@')) {
                    return value;
                }
            }

            // If we got here, no email was found
            return '';
        } catch (error) {
            console.log(error, 'extractEmailFromRow');
            return ''; // Return empty string on error
        }
    }

    static formatExamDate(dateString) {
        if (!dateString || dateString === '-' || dateString.trim() === '') {
            return '-';
        }

        try {
            const date = new Date(dateString);

            if (isNaN(date.getTime())) {
                return dateString;
            }

            const month = date.getMonth() + 1; // 0-based index
            const day = date.getDate();
            const year = date.getFullYear();

            return `${month}/${day}/${year}`;
        } catch (error) {
            console.warn('Error formatting planned date:', dateString, error);
            return dateString;
        }
    }

    static convertExcelDate(date) {
        let formattedDate = new Date(Math.round((date - 25569) * 864e5));
        formattedDate.setMinutes(formattedDate.getMinutes() + formattedDate.getTimezoneOffset());
        return formattedDate;
    }

    static formatDateString(dateValue) {
        if (!dateValue) return "";

        // Try to create a Date object
        const jsDate = new Date(dateValue);
        if (!isNaN(jsDate.getTime())) {
            return jsDate.toISOString().split('T')[0]; // Returns YYYY-MM-DD
        }

        // If it's already in the correct format, return it
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
        }

        // Handle different date formats
        if (dateValue.includes('/')) {
            const parts = dateValue.split('/');
            if (parts.length === 3) {
                const year = parts[2].length === 4 ? parts[2] : `20${parts[2]}`;
                const month = parts[0].padStart(2, '0');
                const day = parts[1].padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        } else if (dateValue.includes('-')) {
            const parts = dateValue.split('-');
            if (parts.length === 3) {
                if (parts[0].length !== 4) {
                    const year = parts[2].length === 4 ? parts[2] : `20${parts[2]}`;
                    const month = parts[1].padStart(2, '0');
                    const day = parts[0].padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
                return dateValue;
            }
        }

        return dateValue;
    }

    static calculateTotalHours(data) {
        let totalSeconds = 0;

        for (let i = 0; i < data.length; i++) {
            const timeStr = data[i]["Total Time"] || "00:00:00";
            const timeParts = timeStr.split(':');

            if (timeParts.length === 3) {
                const hours = parseInt(timeParts[0]) || 0;
                const minutes = parseInt(timeParts[1]) || 0;
                const seconds = parseInt(timeParts[2]) || 0;
                totalSeconds += (hours * 3600) + (minutes * 60) + seconds;
            }
        }

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    static sanitizeHtml(html) {
        if (!html) return '';

        try {
            // Create a temporary div to work with the HTML content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // Define allowed tags (only basic formatting)
            const allowedTags = ['p', 'b', 'i', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br'];

            // Function to recursively clean nodes - with additional safety checks
            const cleanNode = (node) => {
                if (!node || node.nodeType !== Node.ELEMENT_NODE) return;

                try {
                    // Remove all attributes from elements
                    const attrs = Array.from(node.attributes || []);
                    attrs.forEach(attr => node.removeAttribute(attr.name));

                    // Check if this tag is in our allowed list
                    if (!allowedTags.includes(node.tagName.toLowerCase())) {
                        // For unwanted elements like images and scripts, remove completely
                        if (['IMG', 'SCRIPT', 'IFRAME', 'STYLE', 'LINK', 'OBJECT', 'EMBED'].includes(node.tagName)) {
                            if (node.parentNode) {
                                node.parentNode.removeChild(node);
                            }
                            return;
                        }

                        // For other disallowed tags, keep their content but remove the tag itself
                        if (node.parentNode) {
                            while (node.firstChild) {
                                node.parentNode.insertBefore(node.firstChild, node);
                            }
                            node.parentNode.removeChild(node);
                        }
                    } else {
                        // Process children of allowed tags
                        const childNodes = Array.from(node.childNodes || []);
                        childNodes.forEach(child => {
                            if (child && child.nodeType === Node.ELEMENT_NODE) {
                                cleanNode(child);
                            }
                        });
                    }
                } catch (nodeError) {
                    console.warn("Error processing node during HTML sanitization:", nodeError);
                }
            };

            // Convert NodeList to array first since we'll be modifying the DOM structure
            const nodes = Array.from(tempDiv.querySelectorAll('*') || []);
            for (const node of nodes) {
                if (node) cleanNode(node);
            }

            return tempDiv.innerHTML;
        } catch (error) {
            ErrorHandler.showAlert("Failed to sanitize HTML content.", "warning");
            return '';
        }
    }

    static decodeCfEmail(encoded) {
        let r = parseInt(encoded.substr(0, 2), 16);
        let email = '';
        for (let n = 2; n < encoded.length; n += 2) {
            let code = parseInt(encoded.substr(n, 2), 16) ^ r;
            email += String.fromCharCode(code);
        }
        return email;
    }

    static getCurrentUrlParams() {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);

        // Convert to regular object with default empty strings
        const params = {};
        for (const [key, value] of urlParams.entries()) {
            params[key] = value;
        }

        return params;
    }

    static getUrlParamsWithDefaults(defaults = {}) {
        const params = this.getCurrentUrlParams();

        // Fill in defaults for missing values
        for (const [key, value] of Object.entries(defaults)) {
            if (params[key] === undefined) {
                params[key] = value;
            }
        }

        return params;
    }

    static createUrlWithParams(baseUrl, params = {}, options = {}) {
        const urlParams = new URLSearchParams();

        // Add non-empty parameters to URLSearchParams
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                urlParams.append(key, value);
            }
        });

        // Special handling for ACME list date_monday parameter
        if (options.isAcmeList && params.date_monday === undefined) {
            const hasFilters = params.keywordLists || params.startFilter || params.statusFilter;
            urlParams.append('date_monday', hasFilters ? '' : this.getNextMonday());
        }

        const queryString = urlParams.toString();
        return queryString ? `${baseUrl}?${queryString}` : baseUrl;
    }

    static formatDateString(dateString) {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; // Return original if invalid date

            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateString; // Return original string if parsing fails
        }
    }

    static async getFallbackMappings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['rulesData'], (result) => {
                const rulesData = result.rulesData || {};
                const fallbackMappings = rulesData.fallback_mappings || {};

                // Combine course_codes and course_names into one object for backwards compatibility
                const combinedMappings = {
                    ...fallbackMappings.course_codes || {},
                    ...fallbackMappings.course_names || {}
                };

                resolve(combinedMappings);
            });
        });
    }

    static findCourseGrade(studentData, courseCode, contractCode, syncResponse = null) {
        try {
            // ✅ FIRST: Check sync response for examMark if available
            if (syncResponse && syncResponse.html) {
                try {
                    console.log(`🔍 Looking for examMark for course: ${courseCode}`);

                    // Method 1: Look for examMark directly in the JSON string
                    const examMarkPattern = new RegExp(`"examMark"\\s*:\\s*"([^"]+)"[^}]*"code"\\s*:\\s*"${courseCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'gi');
                    const examMarkMatch = syncResponse.html.match(examMarkPattern);

                    if (examMarkMatch && examMarkMatch[0]) {
                        const markValue = examMarkMatch[0].match(/"examMark"\s*:\s*"([^"]+)"/i);
                        if (markValue && markValue[1] && markValue[1] !== 'N/A' && !isNaN(parseFloat(markValue[1]))) {
                            console.log(`✅ Found examMark (Method 1): ${markValue[1]}`);

                            // Get status from the same JSON block
                            const statusPattern = new RegExp(`"studyStatusID"\\s*:\\s*([^,}\\s]+)[^}]*"code"\\s*:\\s*"${courseCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'gi');
                            const statusMatch = syncResponse.html.match(statusPattern);
                            let status = 2; // Default to Pass

                            if (statusMatch && statusMatch[0]) {
                                const statusValue = statusMatch[0].match(/"studyStatusID"\s*:\s*([^,}\\s]+)/i);
                                if (statusValue && statusValue[1]) {
                                    status = parseInt(statusValue[1]);
                                }
                            }

                            return {
                                status: status,
                                grade: parseFloat(markValue[1])
                            };
                        }
                    }

                    // Method 2: Look for courseCode first, then find examMark in the same block
                    const courseBlockPattern = new RegExp(`"code"\\s*:\\s*"${courseCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"([^}]*)"examMark"\\s*:\\s*"([^"]+)"`, 'gi');
                    const courseBlockMatch = syncResponse.html.match(courseBlockPattern);

                    if (courseBlockMatch && courseBlockMatch[0]) {
                        const markMatch = courseBlockMatch[0].match(/"examMark"\s*:\s*"([^"]+)"/i);
                        if (markMatch && markMatch[1] && markMatch[1] !== 'N/A' && !isNaN(parseFloat(markMatch[1]))) {
                            console.log(`✅ Found examMark (Method 2): ${markMatch[1]}`);

                            // Get status from the same block
                            const statusMatch = courseBlockMatch[0].match(/"studyStatusID"\s*:\s*([^,}\\s]+)/i);
                            let status = 2; // Default to Pass

                            if (statusMatch && statusMatch[1]) {
                                status = parseInt(statusMatch[1]);
                            }

                            return {
                                status: status,
                                grade: parseFloat(markMatch[1])
                            };
                        }
                    }

                    // Method 3: Find all examMark instances and match with courseCode
                    const allExamMarks = syncResponse.html.match(/"examMark"\s*:\s*"([^"]+)"/gi);
                    const allCourseCodes = syncResponse.html.match(/"code"\s*:\s*"([^"]+)"/gi);

                    if (allExamMarks && allCourseCodes) {
                        console.log(`🔍 Found ${allExamMarks.length} examMark instances and ${allCourseCodes.length} course codes`);

                        // Try to find a matching pair by looking at context around each examMark
                        for (let i = 0; i < allExamMarks.length; i++) {
                            const examMarkValue = allExamMarks[i].match(/"examMark"\s*:\s*"([^"]+)"/i);
                            if (!examMarkValue || !examMarkValue[1] || examMarkValue[1] === 'N/A' || isNaN(parseFloat(examMarkValue[1]))) {
                                continue;
                            }

                            // Find the position of this examMark in the response
                            const examMarkIndex = syncResponse.html.indexOf(allExamMarks[i]);

                            // Look for the courseCode within a reasonable distance (1000 chars before/after)
                            const contextStart = Math.max(0, examMarkIndex - 1000);
                            const contextEnd = Math.min(syncResponse.html.length, examMarkIndex + 1000);
                            const context = syncResponse.html.substring(contextStart, contextEnd);

                            if (context.includes(`"code":"${courseCode}"`)) {
                                console.log(`✅ Found examMark (Method 3): ${examMarkValue[1]} for course ${courseCode}`);

                                // Get status from the same context
                                const statusMatch = context.match(/"studyStatusID"\s*:\s*([^,}\\s]+)/i);
                                let status = 2; // Default to Pass

                                if (statusMatch && statusMatch[1]) {
                                    status = parseInt(statusMatch[1]);
                                }

                                return {
                                    status: status,
                                    grade: parseFloat(examMarkValue[1])
                                };
                            }
                        }
                    }

                    console.log(`❌ Could not find examMark for course ${courseCode} in sync response`);

                } catch (parseError) {
                    console.warn('Could not parse sync response for exammark:', parseError);
                }
            }

            // ✅ FALLBACK: Use student data as before
            if (!studentData || !studentData.studentProgram) {
                console.error('Invalid student data structure');
                return null;
            }

            const courseInStudentData = this.findCourseInStudentData(studentData, courseCode, contractCode);
            if (courseInStudentData) {
                console.log('Found course grade from student data:', {
                    courseCode: courseInStudentData.courseCode,
                    status: courseInStudentData.studyStatusID,
                    grade: courseInStudentData.gradeFinal || courseInStudentData.grade || 'N/A'
                });

                return {
                    status: parseInt(courseInStudentData.studyStatusID),
                    grade: courseInStudentData.gradeFinal || courseInStudentData.grade || 'N/A'
                };
            }

            console.error('Course not found for grade check:', courseCode);
            return null;
        } catch (error) {
            console.error('Error finding course grade:', error);
            return null;
        }
    }

    static findCourseInStudentData(studentData, courseCode, contractCode) {
        for (const program of studentData.studentProgram) {
            if (!program.studentContracts) continue;

            for (const contract of program.studentContracts) {
                if (contract.contractCode !== contractCode) continue;

                if (!contract.courses) continue;

                for (const course of contract.courses) {
                    if (course.courseCode === courseCode) {
                        return course;
                    }
                }
            }
        }
        return null;
    }

    static async findBestCourseMatch(launchCourse, scheduledCourses, fallbackMappings = null) {
        if (!launchCourse.name || !scheduledCourses.length) {
            return null;
        }

        if (!fallbackMappings) {
            fallbackMappings = await this.getFallbackMappings();
        }

        if (fallbackMappings && Object.keys(fallbackMappings).length > 0) {
            // Direct fallback mapping check
            const mappedName = fallbackMappings[launchCourse.name];
            if (mappedName) {
                const exactMatch = scheduledCourses.find(api =>
                    api.courseName === mappedName ||
                    api.courseCode === mappedName
                );
                if (exactMatch) {
                    console.log(`Fallback mapping match: "${launchCourse.name}" -> "${mappedName}"`);
                    return exactMatch;
                }
            }

            for (const [originalName, mappedName] of Object.entries(fallbackMappings)) {
                if (mappedName === launchCourse.name) {
                    const exactMatch = scheduledCourses.find(api =>
                        api.courseName === originalName ||
                        api.courseCode === originalName
                    );
                    if (exactMatch) {
                        console.log(`Reverse fallback mapping match: "${launchCourse.name}" -> "${originalName}"`);
                        return exactMatch;
                    }
                }
            }
        }

        const launchName = launchCourse.name.toLowerCase().trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
        const minLength = Math.ceil(launchName.length * 0.55);

        for (let currentLength = launchName.length; currentLength >= minLength; currentLength--) {
            const searchTerm = launchName.substring(0, currentLength).trim();

            const matches = scheduledCourses.filter(apiCourse => {
                if (!apiCourse.courseName) return false;

                const apiName = apiCourse.courseName.toLowerCase().trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');

                return apiName.includes(searchTerm) || searchTerm.includes(apiName);
            });

            if (matches.length === 1) {
                const matchPercentage = Math.round((currentLength / launchName.length) * 100);
                console.log(`Fuzzy match found: "${launchCourse.name}" -> "${matches[0].courseName}" (${matchPercentage}% match)`);
                return matches[0];
            }
        }

        return null;
    }
}

class ValidationHelper {
    static checkIdVerification(response) {
        if (!response || !response.success || !response.data || !Array.isArray(response.data)) {
            return {
                isVerified: false,
                status: 'Student Not Found',
                date: '',
                rawStatus: response?.rawStatus || 'not_found'
            };
        }

        let hasVerified = false;
        let latestVerifiedApplication = null;
        let latestVerifiedId = 0;

        // First, check for any "verified" status applications
        for (const emailData of response.data) {
            if (emailData.applications && emailData.applications.length > 0) {
                for (const app of emailData.applications) {
                    if (app.identity_approval_status === 'verified') {
                        hasVerified = true;
                        // Find the application with highest ID
                        if (!latestVerifiedApplication || (app.id && app.id > latestVerifiedId)) {
                            latestVerifiedApplication = app;
                            latestVerifiedId = app.id || 0;
                        }
                    }
                }
            }
        }

        // If verified application found, return it
        if (hasVerified && latestVerifiedApplication) {
            return {
                isVerified: true,
                status: 'ID Verified',
                date: this.formatDateToToronto(new Date(latestVerifiedApplication.application_created_at)),
                rawStatus: 'verified'
            };
        }

        // If no verified status, look for non-unverified statuses first
        let latestNonUnverifiedApplication = null;
        let latestNonUnverifiedId = 0;

        for (const emailData of response.data) {
            if (emailData.applications && emailData.applications.length > 0) {
                for (const app of emailData.applications) {
                    if (['rejected', 'requires_review'].includes(app.identity_approval_status)) {
                        if (!latestNonUnverifiedApplication || (app.id && app.id > latestNonUnverifiedId)) {
                            latestNonUnverifiedApplication = app;
                            latestNonUnverifiedId = app.id || 0;
                        }
                    }
                }
            }
        }

        // If non-unverified status found, return it
        if (latestNonUnverifiedApplication) {
            let status = '';
            switch (latestNonUnverifiedApplication.identity_approval_status) {
                case 'rejected':
                    status = 'Rejected (ID Connected)';
                    break;
                case 'requires_review':
                    status = 'Requires Review (ID Connected)';
                    break;
                default:
                    status = 'Unknown Status';
            }

            return {
                isVerified: false,
                status: status,
                date: this.formatDateToToronto(new Date(latestNonUnverifiedApplication.application_created_at)),
                rawStatus: latestNonUnverifiedApplication.identity_approval_status
            };
        }

        // Finally, look for unverified statuses (lowest priority)
        let latestUnverifiedApplication = null;
        let latestUnverifiedId = 0;

        for (const emailData of response.data) {
            if (emailData.applications && emailData.applications.length > 0) {
                for (const app of emailData.applications) {
                    if (app.identity_approval_status === 'unverified') {
                        if (!latestUnverifiedApplication || (app.id && app.id > latestUnverifiedId)) {
                            latestUnverifiedApplication = app;
                            latestUnverifiedId = app.id || 0;
                        }
                    }
                }
            }
        }

        // Return unverified result if found
        if (latestUnverifiedApplication) {
            return {
                isVerified: false,
                status: 'ID Not Verified',
                date: this.formatDateToToronto(new Date(latestUnverifiedApplication.application_created_at)),
                rawStatus: 'unverified'
            };
        }

        // No applications found
        return {
            isVerified: false,
            status: 'Student Not Found',
            date: '',
            rawStatus: 'not_found'
        };
    }

    static extractVerifiedDate(response) {
        const result = this.checkIdVerification(response);
        return result.date;
    }

    static extractVerificationStatus(response) {
        const result = this.checkIdVerification(response);
        return result.status;
    }

    static formatDateToToronto(date) {
        if (!date || !(date instanceof Date)) return '';
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'America/Toronto',
            hour12: true
        };
        const formattedDate = new Intl.DateTimeFormat('en-CA', options).format(date);
        return formattedDate.replace(
            /(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+) (AM|PM)/,
            '$3-$1-$2 $4:$5:$6 $7'
        );
    }

    static verifyContractData(data) {
        if (data.error || data.launchData.error || data.epData.error) {
            return {
                success: false,
                error: [data.error || data.launchData.error || data.epData.error]
            };
        }
        let { launchData, epData } = data;
        let errorMessages = [];

        if (launchData.data.vNumber && launchData.data.vNumber !== epData.vNumber) {
            errorMessages.push(`VNumber Mismatch: \n Launch: ${launchData.data.vNumber}; EP: ${epData.vNumber}\n`);
        }

        if (epData.campus === "Toronto" &&
            ((launchData.data.programName === "Business Administration (2013)-ON" || epData.programName === "Business Administration") ||
                epData.programName.toLowerCase().includes("computer service technician")
            )) {
            errorMessages.push(`${epData.programName} Program in Launch or EP \n Launch: ${launchData.data.school}; EP: ${epData.campus}\n`);
        }

        if ((epData.campus === "Brampton" || epData.campus === "North York") &&
            (
                epData.programName.toLowerCase().includes("business office skills") ||
                epData.programName.toLowerCase().includes("it security specialist") ||
                epData.programName.toLowerCase().includes("marketing coordinator") ||
                epData.programName.toLowerCase().includes("medical receptionist") ||
                epData.programName.toLowerCase() == "web developer"
            )) {
            errorMessages.push(`${epData.programName} Program in Launch or EP \n Launch: ${launchData.data.school}; EP: ${epData.campus}\n`);
        }

        // TODO: Add more checks for invalid program names
        console.log(programNameMappings);

        const programMatch = programNameMappings[launchData.data.programName] ?
            programNameMappings[launchData.data.programName].includes(epData.programName.trim()) :
            false;
        if (!programMatch) {
            errorMessages.push(`Program mismatch: \n Launch:${launchData.data.programName}; EP: ${epData.programName}\n`);
        }

        const standardDate = new Date('2023-07-03');
        const startDate = new Date(launchData.data.createdDate);
        const startDateMatch = startDate >= standardDate;

        if (!startDateMatch) {
            errorMessages.push(`Created date before July 23rd 2023: \n EP: ${launchData.data.createdDate}\n`);
        }

        if (epData.vNumber && epData.vNumber.length > 1) {
            const prefix = epData.vNumber.substring(1, 2);
            const launchCampus = launchData.data.school || '';
            const epCampus = epData.campus || '';

            // TODO: Add Kitchener and BelleVille when available
            if (prefix === 'T' && !(launchCampus.includes('Bay/Queen') && epCampus.includes('Toronto'))
                || (prefix === 'N' && !(launchCampus.includes('North York - Yonge') && epCampus.includes('North York')))
                || (prefix === 'B' && !(launchCampus.includes('Brampton East') && epCampus.includes('Brampton')))) {
                errorMessages.push(`Campus mismatch:\n Launch: ${launchCampus}; EP: ${epCampus}\n`);
            }
        }

        if (launchData.data.has_CPL !== epData.has_CPL) {
            errorMessages.push(`CPL mismatch: \n Launch: ${launchData.data.has_CPL} ; EP: ${epData.has_CPL}\n`);
        }

        if (launchData.data.status !== "In Progress") {
            errorMessages.push(`Program status is not "In Progress": \n Launch: ${launchData.data.status}\n`);
        }

        return {
            success: errorMessages.length === 0,
            error: errorMessages
        }
    }
}

window.HelperFunctions = HelperFunctions;
window.ValidationHelper = ValidationHelper;