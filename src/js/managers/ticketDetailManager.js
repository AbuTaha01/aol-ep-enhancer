class TicketDetailManager {
    static selectedButton = null;
    static selectedIcon = null;
    static selectedGroup = null;
    static hasIcons = false;

    static studentData = {
        firstName: '',
        lastName: '',
        fullName: '',
        vNumber: '',
        programName: '',
        email: '',
        campus: ''
    };

    static initializeStudentData() {
        // Get and cache student data
        const firstNameElement = HelperFunctions.getElementByXPath('FIRST_NAME');
        const lastNameElement = HelperFunctions.getElementByXPath('LAST_NAME');
        const vNumber = HelperFunctions.findVNumber();
        const programNameElement = HelperFunctions.getElementByXPath('PROGRAM_NAME');

        // ✅ Capitalize first and last names
        const firstName = firstNameElement?.textContent.trim() || '';
        const lastName = lastNameElement?.textContent.trim() || '';

        this.studentData.firstName = HelperFunctions.capitalizeWords(firstName);
        this.studentData.lastName = HelperFunctions.capitalizeWords(lastName);
        this.studentData.fullName = `${this.studentData.firstName} ${this.studentData.lastName}`.trim();
        this.studentData.vNumber = vNumber || '';
        this.studentData.programName = programNameElement?.textContent.trim() || '';
        this.studentData.campus = HelperFunctions.getCampusFromVNumber(vNumber);
    }

    static updateStudentEmail(email) {
        this.studentData.email = email || '';
    }

    static async initializeStudentDetails() {
        return HelperFunctions.urlCheck([CONFIG.TICKET_DETAILS_URL], async function () {
            try {
                const firstNameElement = HelperFunctions.getElementByXPath('FIRST_NAME');
                const lastNameElement = HelperFunctions.getElementByXPath('LAST_NAME');
                const vNumber = HelperFunctions.findVNumber();

                if (!firstNameElement || !lastNameElement || !vNumber) {
                    console.log('Required elements not found on the page.');
                    return;
                }

                // Initialize centralized student data
                TicketDetailManager.initializeStudentData();

                // 1. Create UI Layout (combines addCourseDetails + student info area)
                TicketDetailManager.createCourseDetailsLayout();

                // 2. Get student data from API
                const loadingDiv = UIManager.createLoadingElement();
                document.body.appendChild(loadingDiv);
                loadingDiv.style.display = 'block';

                try {
                    const response = await chrome.runtime.sendMessage({
                        action: 'apiStudentSearch',
                        data: {
                            student_number: vNumber
                        }
                    });

                    if (response && response.success && response.data && response.data.length > 0) {
                        const studentData = response.data[0];
                        const studentMail = studentData.aolcc_email;
                        const examScheduleUrl = studentData.exam_schedule_url;
                        const examSchedule = studentData.exam_schedule;

                        TicketDetailManager.updateStudentEmail(studentMail);

                        const pdfLink = examScheduleUrl ? { href: examScheduleUrl } : null;
                        await TicketDetailManager.insertStudentInfoElements(studentMail, pdfLink);

                        // 4. Show loading in course tables
                        TicketDetailManager.showCourseTablesLoading();

                        // 5. Fetch course data from Launch
                        const launchResponse = await chrome.runtime.sendMessage({
                            action: 'getCourseDetails',
                            data: {
                                vNumber: vNumber,
                                student: studentData
                            }
                        });

                        if (launchResponse && launchResponse.success && launchResponse.data) {
                            // 6. Analyze course data
                            const analysisResult = await DataService.analyzeStudentCourses(launchResponse.data, examSchedule);

                            if (analysisResult.success) {
                                // 7. Get exam codes for current courses - FROM LOCAL STORAGE
                                if (analysisResult.currentCourses && analysisResult.currentCourses.length > 0) {
                                    // Determine campus from vNumber
                                    const campus = HelperFunctions.getCampusFromVNumber(vNumber);

                                    const examCodesResults = [];

                                    // Fetch exam codes for each current course from local storage
                                    for (const course of analysisResult.currentCourses) {
                                        if (course.code) {
                                            try {
                                                const examCodeResponse = await TicketDetailManager.getExamCodesFromStorage(course.code, campus);

                                                if (examCodeResponse && examCodeResponse.success && examCodeResponse.data) {
                                                    examCodesResults.push({
                                                        courseCode: course.code,
                                                        courseName: course.name,
                                                        examCodes: examCodeResponse.data
                                                    });
                                                } else {
                                                    console.log(`No exam codes found for ${course.code}`);
                                                }
                                            } catch (error) {
                                                console.error(`Error fetching exam codes for ${course.code}:`, error);
                                            }
                                        }
                                    }
                                }

                                // 8. Populate course tables
                                TicketDetailManager.populateCourseTables(
                                    analysisResult.currentCourses,
                                    analysisResult.nextCourse ? [analysisResult.nextCourse] : [],
                                    examSchedule,
                                    analysisResult.failCount || 0,
                                    analysisResult.nonILSFailCount || 0 // ✅ NEW: Pass nonILSFailCount
                                );
                            } else {
                                TicketDetailManager.showCourseTablesError('Failed to analyze course data: ' + analysisResult.error);
                                ErrorHandler.showAlert(analysisResult.error, 'error');
                            }
                        } else {
                            TicketDetailManager.showCourseTablesError('Failed to get course data from Launch');
                            ErrorHandler.showAlert('Student not found in Launch', 'error');
                        }
                    } else {
                        TicketDetailManager.showCourseTablesError('Student not found in API');
                        ErrorHandler.showAlert('Student not found in API', 'error');
                    }
                } finally {
                    loadingDiv.style.display = 'none';
                }

            } catch (error) {
                console.error('Error in initializeStudentDetails:', error);
                TicketDetailManager.showCourseTablesError(error.message);
            }
        })();
    }

    static showExamCodes(examCodesResults, campus) {
        if (!examCodesResults || examCodesResults.length === 0) {
            return;
        }

        const selectElement = document.getElementById('gettemplates');
        if (!selectElement) {
            return;
        }

        // Filter results that have actual exam codes
        const validResults = examCodesResults.filter(result =>
            result.examCodes &&
            result.examCodes.success &&
            result.examCodes.data &&
            Array.isArray(result.examCodes.data) &&
            result.examCodes.data.length > 0
        );

        if (validResults.length === 0) {
            return;
        }

        // Process exam codes and fetch appropriate template
        this.processExamCodesWithTemplate(validResults);
    }

    static async getExamCodesFromStorage(courseCode, campus) {
        return new Promise((resolve) => {
            chrome.storage.local.get(['allQuizCodes'], (result) => {
                try {
                    const allQuizCodes = result.allQuizCodes || [];

                    // Filter quiz codes by course code and campus
                    const filteredCodes = allQuizCodes.filter(quizCode => {
                        return quizCode.course_code === courseCode &&
                            (quizCode.campus === campus || quizCode.campus === 'ALL');
                    });

                    if (filteredCodes.length > 0) {
                        resolve({
                            success: true,
                            data: filteredCodes
                        });
                    } else {
                        resolve({
                            success: false,
                            error: `No quiz codes found for ${courseCode} in ${campus}`
                        });
                    }
                } catch (error) {
                    console.error('Error getting exam codes from storage:', error);
                    resolve({
                        success: false,
                        error: error.message
                    });
                }
            });
        });
    }

    static processExamCodesWithTemplate(validResults) {
        try {
            // Get the first result to determine template ID
            const firstResult = validResults[0];
            const firstExamData = firstResult.examCodes.data[0];

            const templateId = String(firstExamData.template_id);

            if (!templateId) {
                console.warn('No template ID found in exam data');
                return;
            }

            const studentName = TicketDetailManager.studentData.fullName;

            this.prepareExamData(templateId, validResults, studentName);

        } catch (error) {
            ErrorHandler.showAlert('Failed to process exam codes with template.', 'error');
        }
    }

    static prepareExamData(templateId, validResults, studentName) {
        const firstResult = validResults[0];
        const allExamData = firstResult.examCodes.data;
        const courseCode = allExamData[0].course_code;

        // Common data structure for all templates
        const baseData = {
            studentName: studentName,
            firstExam: allExamData[0],
            allExams: allExamData
        };

        // Synchronous processing to avoid timing issues
        chrome.storage.local.get(['rulesData'], (result) => {
            let templateConfig = null;

            if (result.rulesData && result.rulesData.templates && result.rulesData.templates.exam_codes) {
                const examTemplates = result.rulesData.templates.exam_codes.template_mappings;
                templateConfig = examTemplates[templateId];
            }

            // Process exam data based on template ID
            switch (templateId) {
                case '170':
                    baseData.examCodesList = allExamData.length === 1
                        ? `The exam code for ${allExamData[0].course_name} is: <b>${allExamData[0].exam_code}</b>`
                        : `The exam codes for ${allExamData[0].course_name} are:<br><br>` +
                        allExamData.map(exam => `<span style="padding-left: 20px;">${exam.exam_name}:</span>&nbsp;<b>${exam.exam_code}</b><br>`).join('');
                    break;

                case '171':
                    baseData.examCodesList = allExamData
                        .sort((a, b) => a.id - b.id)
                        .map(exam => `<span style="padding-left: 40px;">${exam.exam_name}:</span>&nbsp;<b>${exam.exam_code}</b><br>`)
                        .join('');
                    break;

                case '172':
                    const practicalExam = allExamData.find(exam => exam.exam_name?.toLowerCase().includes('practical'));
                    const finalExam = allExamData.find(exam => exam.exam_name && !exam.exam_name.toLowerCase().includes('practical'));

                    baseData.practicalExamName = practicalExam?.exam_name || '';
                    baseData.finalExamName = finalExam?.exam_name || '';
                    baseData.finalExamCode = finalExam?.exam_code || '';
                    baseData.practicalExamSection = practicalExam
                        ? `<li>60% of questions in the final exam will be from the practical</li><li><span style="background: rgb(181, 214, 165); padding: 5px;">${practicalExam.exam_name}:&nbsp;<b>${practicalExam.exam_code}</b></span></li>`
                        : '';
                    break;

                case '173':
                    // Use dynamic course instructions from health data if available
                    let courseInstructions = '';

                    if (templateConfig && templateConfig.course_instructions) {
                        courseInstructions = templateConfig.course_instructions[courseCode] || '';
                    } else {
                        // Fallback to static instructions
                        const courseInstructionsMap = {
                            'ACS19E1': '<li>Follow instructions on the page.</li>',
                            'ACS19E2': '<li>Follow instructions on the page.</li>',
                            'BSC13E1': '<li>Follow instructions on the page to complete the practical documents.</li>',
                            'BSC13E2': '<li>Follow instructions on the page to complete the practical documents.</li>',
                            'OFP10E1': '<li>Download the document on the page, fill in the document.</li>',
                            'OFP10E2': '<li>Download the document on the page, fill in the document.</li>'
                        };
                        courseInstructions = courseInstructionsMap[courseCode] || '';
                    }

                    baseData.finalExamName = allExamData[0].exam_name || '';
                    baseData.finalExamCode = allExamData[0].exam_code || '';
                    baseData.courseSpecificInstructions = courseInstructions;

                    // Add additional instructions for non-ACS courses
                    if (!['ACS19E1', 'ACS19E2'].includes(courseCode)) {
                        baseData.courseSpecificInstructions += '<li>60% of questions in the final exam will be from the practical.</li><li>Keep the Practical Assignment Document open during the exam.</li>';
                    }
                    break;

                default:
                    // For other templates, just use basic exam data
                    baseData.examCodesList = allExamData.map(exam => `${exam.exam_name}: ${exam.exam_code}`).join('<br>');
                    baseData.finalExamName = allExamData[0]?.exam_name || '';
                    baseData.finalExamCode = allExamData[0]?.exam_code || '';
                    break;
            }

            // Trigger template processing after data is prepared
            DataService.fetchTemplate(templateId, (templateContent) => {
                const processedTemplate = this.processTemplateWithExamData(templateContent, templateId, baseData);
                this.loadTemplateIntoEditor(processedTemplate);
            });
        });

        return baseData;
    }

    static processTemplateWithExamData(template, templateId, examData) {
        // Common replacements for all templates - studentName zaten capitalize edilmiş
        let result = template.replace(/\[student_name\]/g, examData.studentName || ''); // ✅ Zaten capitalize edilmiş

        // Template-specific replacements
        const replacements = {
            '170': {
                '[EXAM_CODES_LIST]': examData.examCodesList || ''
            },
            '171': {
                '[EXAM_CODES_LIST]': examData.examCodesList || ''
            },
            '172': {
                '[practical_exam_name]': examData.practicalExamName || '',
                '[final_exam_name]': examData.finalExamName || '',
                '[final_exam_code]': examData.finalExamCode || '',
                '[PRACTICAL_EXAM_SECTION]': examData.practicalExamSection || ''
            },
            '173': {
                '[final_exam_name]': examData.finalExamName || '',
                '[final_exam_code]': examData.finalExamCode || '',
                '[COURSE_SPECIFIC_INSTRUCTIONS]': examData.courseSpecificInstructions || ''
            }
        };

        const templateReplacements = replacements[templateId] || {};

        Object.entries(templateReplacements).forEach(([placeholder, value]) => {
            result = result.split(placeholder).join(value);
        });

        return result;
    }

    static loadTemplateIntoEditor(templateContent) {
        try {
            const noteEditableDiv = document.querySelector('.note-editable');
            if (noteEditableDiv) {
                noteEditableDiv.innerHTML = templateContent;

                // Trigger change events
                const changeEvent = new Event('change', { bubbles: true });
                const inputEvent = new Event('input', { bubbles: true });
                noteEditableDiv.dispatchEvent(changeEvent);
                noteEditableDiv.dispatchEvent(inputEvent);

                // Update hidden textarea
                const hiddenTextarea = document.querySelector('textarea[name="comment"]');
                if (hiddenTextarea) {
                    hiddenTextarea.value = noteEditableDiv.innerHTML;
                    hiddenTextarea.dispatchEvent(changeEvent);
                    hiddenTextarea.dispatchEvent(inputEvent);
                }
            } else {
                ErrorHandler.showAlert('Could not find the editor to load the template.', 'error');
            }
        } catch (error) {
            ErrorHandler.showAlert('Failed to load template into editor.', 'error');
        }
    }

    static createCourseDetailsLayout() {
        const targetDiv = document.querySelector('div.col-sm-12');
        const elementToRemove = targetDiv.querySelector('b.border-bottom.float-left.w-100');

        if (targetDiv) {
            targetDiv.classList.remove('col-sm-12');
            targetDiv.classList.add('col-sm-6');
            targetDiv.classList.add('d-flex');

            const firstNewDiv = document.createElement('div');
            firstNewDiv.className = 'card col-md-12 p-2';

            while (targetDiv.firstChild) {
                firstNewDiv.appendChild(targetDiv.firstChild);
            }

            targetDiv.appendChild(firstNewDiv);

            const secondNewDivWrapper = document.createElement('div');
            secondNewDivWrapper.className = 'col-sm-6 d-flex';

            const secondNewDiv = document.createElement('div');
            secondNewDiv.className = 'card col-md-12 p-2';
            secondNewDiv.id = 'course-tables-container';
            secondNewDiv.innerHTML = `
            <table id="current-course-table" style="margin-bottom: 2%;">
                <thead>
                    <tr>
                        <th style="width: 74%;">Current Course</th>
                        <th>Finish Date</th>
                        <th style="width: 12%;text-align: left;padding-right: 10px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Will be populated dynamically -->
                </tbody>
            </table>
            <table id="next-course-table">
                <thead>
                    <tr>
                        <th style="width: 74%;">Next Course</th>
                        <th>Start Date</th>
                        <th style="width: 12%;text-align: left;padding-right: 10px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Will be populated dynamically -->
                </tbody>
            </table>
        `;

            secondNewDivWrapper.appendChild(secondNewDiv);
            targetDiv.parentNode.insertBefore(secondNewDivWrapper, targetDiv.nextSibling);

            if (elementToRemove) {
                elementToRemove.remove();
            }
        }
    }

    static populateCourseTables(currentCourses, nextCourses, examSchedule, failCount = 0, nonILSFailCount = 0) {
        try {
            const currentTableBody = document.querySelector('#current-course-table tbody');
            const nextTableBody = document.querySelector('#next-course-table tbody');
            const isTicketActive = !!document.getElementById('manage_ticket');

            chrome.storage.local.get(['allCourses', 'rulesData', 'allQuizCodes'], (result) => {
                const allCoursesData = result.allCourses || [];
                const rulesData = result.rulesData || {};
                const allQuizCodes = result.allQuizCodes || [];

                // Helper functions
                const createCategoryBadge = (category) => {
                    if (!category || category === 'Academic' || category === 'Non-Academic') return '';
                    return `<span class="badge badge-danger" style="font-size: 0.7em; margin-left: 5px; vertical-align: bottom;">${category}</span>`;
                };

                const createBookIcon = (hasBookRequirement) => {
                    if (!hasBookRequirement) return '';
                    return `<i class="fas fa-book book-icon" style="color: #d24726; margin-right: 5px; cursor: help;"></i>`;
                };

                const createAttachmentIcon = (hasAttachmentRequirement) => {
                    if (!hasAttachmentRequirement) return '';
                    return `<i class="fas fa-paperclip attachment-icon" style="color: #ff6b35; margin-right: 5px; cursor: help;"></i>`;
                };

                // ✅ FIXED: Arrow function to preserve `this` context
                const processNextCourse = (courseToShow, index = -1) => {
                    const courseData = allCoursesData.find(c => c.courseCode === courseToShow.code);
                    const courseCategory = courseData ? courseData.courseCategory : '';
                    const hasBookRequirement = courseData ? courseData.bookRequirement === 'Yes' : false;
                    const categoryBadge = createCategoryBadge(courseCategory);
                    const bookIcon = createBookIcon(hasBookRequirement);

                    // Check ILS in progress
                    let hasILSInProgress = false;
                    if (currentCourses && currentCourses.length > 0) {
                        for (const course of currentCourses) {
                            const currentCourseData = allCoursesData.find(c => c.courseCode === course.code);
                            if (currentCourseData &&
                                currentCourseData.courseType === 'ILS' &&
                                currentCourseData.courseCategory !== 'Non-Academic' &&
                                (course.status === 'In Progress' || course.status === 1)) {
                                hasILSInProgress = true;
                                break;
                            }
                        }
                    }

                    const isHomeInspectionProgram = TicketDetailManager.studentData.programName &&
                        TicketDetailManager.studentData.programName.toLowerCase().includes('home inspection');

                    let canActivateByFailCount = false;
                    if (isHomeInspectionProgram) {
                        // ✅ SIMPLIFIED: Use the passed nonILSFailCount parameter
                        canActivateByFailCount = failCount === 0 || nonILSFailCount === 0;
                    } else {
                        canActivateByFailCount = failCount < 2;
                    }

                    const hasActivationPermission = courseData ? courseData.activationPermission === 'Yes' : false;

                    // Check prerequisites
                    let prerequisitesMet = true;
                    let prerequisiteMessage = '';
                    if (rulesData.course_rules && rulesData.course_rules.prerequisites) {
                        const prerequisites = rulesData.course_rules.prerequisites[courseToShow.code];
                        if (prerequisites) {
                            const requiredCourses = prerequisites.required_courses || [];
                            for (const requiredCourse of requiredCourses) {
                                const courseCompleted = TicketDetailManager.checkCourseCompleted(currentCourses, requiredCourse);
                                if (!courseCompleted) {
                                    prerequisitesMet = false;
                                    prerequisiteMessage = prerequisites.message || `${requiredCourse} must be completed first`;
                                    break;
                                }
                            }
                        }
                    }

                    // Check lab requirements
                    let labRequirementMet = true;
                    let labRequirementMessage = '';
                    if (rulesData.course_rules && rulesData.course_rules.lab_requirements) {
                        const labRules = rulesData.course_rules.lab_requirements;
                        const pattern = labRules.pattern || '';
                        const requiredText = labRules.required_text || '';
                        const message = labRules.message || '';

                        if (pattern && courseToShow.code && courseToShow.code.match(pattern.replace('*', '.*'))) {
                            if (requiredText && (!courseToShow.name || !courseToShow.name.includes(requiredText))) {
                                labRequirementMet = false;
                                labRequirementMessage = message;
                            }
                        }
                    }

                    const canActivate = canActivateByFailCount &&
                        isTicketActive &&
                        hasActivationPermission &&
                        prerequisitesMet &&
                        labRequirementMet &&
                        !hasILSInProgress &&
                        !courseToShow.notFoundInLaunch;

                    // ✅ Helper function for tooltip messages - UPDATED
                    const getCannotActivateReason = () => {
                        const reasons = [];

                        if (!canActivateByFailCount) {
                            if (isHomeInspectionProgram) {
                                if (nonILSFailCount > 0) {
                                    reasons.push(`Home Inspection student has non-ILS failed courses (${nonILSFailCount} non-ILS, ${failCount} total failed)`);
                                } else {
                                    reasons.push(`Home Inspection student with failed ILS courses only (${failCount} ILS failed)`);
                                }
                            } else {
                                reasons.push(`student has ${failCount} failed course${failCount > 1 ? 's' : ''}`);
                            }
                        }

                        if (!hasActivationPermission) reasons.push('activation permission disabled for this course');
                        if (!prerequisitesMet) reasons.push(prerequisiteMessage);
                        if (!labRequirementMet) reasons.push(labRequirementMessage);
                        if (hasILSInProgress) reasons.push('student has ILS course in progress');
                        if (courseToShow.notFoundInLaunch) reasons.push('course not found in Launch - manual activation required');

                        return `Cannot activate - ${reasons.join(', ')}`;
                    };


                    // Create row
                    const row = document.createElement('tr');
                    const courseLabel = index === 0 ? ' (Primary)' : index === 1 ? ' (Next Academic)' : '';
                    const rowClass = index === 0 ? 'primary-course' : index === 1 ? 'secondary-course' : '';
                    row.className = rowClass;

                    if (isTicketActive) {
                        row.innerHTML = `
                        <td>${bookIcon}${courseToShow.name || 'N/A'}${categoryBadge}<small style="color: #666; font-style: italic;">${courseLabel}</small></td>
                        <td style="white-space: nowrap;">${HelperFunctions.formatDateString(courseToShow.startDate || '')}</td>
                        <td>
                            <button class="btn btn-sm btn-success" 
                                    data-code="${courseToShow.code}" 
                                    data-name="${courseToShow.name || ''}" 
                                    ${!canActivate ? 'disabled' : ''}>
                                <i class="fas fa-check"></i> Activate
                            </button>
                        </td>
                    `;
                    } else {
                        row.innerHTML = `
                        <td>${bookIcon}${courseToShow.name || 'N/A'}${categoryBadge}<small style="color: #666; font-style: italic;">${courseLabel}</small></td>
                        <td style="white-space: nowrap;">${HelperFunctions.formatDateString(courseToShow.startDate || '')}</td>
                        <td></td>
                    `;
                    }

                    nextTableBody.appendChild(row);

                    // Add tooltips
                    if (hasBookRequirement) {
                        setTimeout(() => {
                            const bookIconElement = row.querySelector('.book-icon');
                            if (bookIconElement) {
                                const bookTooltip = UIManager.createTooltip(
                                    'Don\'t forget to provide information for book order after activating this course',
                                    { top: 'auto', left: '30px', minWidth: 'max-content', fontWeight: 'bold' }
                                );
                                bookIconElement.appendChild(bookTooltip);
                            }
                        }, 100);
                    }

                    // Add activation button tooltips
                    if (isTicketActive) {
                        const activateBtn = row.querySelector('button');
                        if (activateBtn) {
                            const tooltipText = canActivate ? 'Activate Course' : getCannotActivateReason();

                            if (!canActivate) {
                                const wrapper = document.createElement('div');
                                wrapper.className = 'disabled-button-wrapper';
                                activateBtn.parentNode.insertBefore(wrapper, activateBtn);
                                wrapper.appendChild(activateBtn);

                                activateBtn.disabled = true;
                                activateBtn.classList.add('disabled');
                                activateBtn.classList.remove('btn-success');
                                activateBtn.classList.add('btn-secondary');

                                const activateTooltip = UIManager.createTooltip(tooltipText, {
                                    right: '0', minWidth: 'max-content'
                                });
                                wrapper.appendChild(activateTooltip);
                            } else {
                                const activateTooltip = UIManager.createTooltip(tooltipText, { right: '0' });
                                activateBtn.appendChild(activateTooltip);
                            }
                        }
                    }
                };

                // ✅ EXISTING: Current courses table population
                if (currentTableBody) {
                    currentTableBody.innerHTML = '';

                    if (currentCourses && currentCourses.length > 0) {
                        currentCourses.forEach(course => {
                            const courseData = allCoursesData.find(c => c.courseCode === course.code);
                            const courseCategory = courseData ? courseData.courseCategory : '';
                            const hasBookRequirement = courseData ? courseData.bookRequirement === 'Yes' : false;

                            const campus = HelperFunctions.getCampusFromVNumber(HelperFunctions.findVNumber());
                            const quizCodeData = allQuizCodes.find(quiz =>
                                quiz.course_code === course.code &&
                                (quiz.campus === campus || quiz.campus === 'ALL')
                            );
                            const hasAttachmentRequirement = quizCodeData ? quizCodeData.attachment_required === 1 : false;

                            const categoryBadge = createCategoryBadge(courseCategory);
                            const bookIcon = createBookIcon(hasBookRequirement);
                            const attachmentIcon = createAttachmentIcon(hasAttachmentRequirement);

                            const finishDate = course.finishDate || course.expectedEndDate || '';
                            const currentDate = new Date();
                            const courseFinalDate = finishDate ? new Date(finishDate) : null;
                            const daysDifference = courseFinalDate ?
                                Math.ceil((courseFinalDate - currentDate) / (1000 * 60 * 60 * 24)) : null;

                            const isItExamRequest = TicketDetailManager.selectedGroup === 'exam';
                            const canSendExamCode = daysDifference !== null && daysDifference <= 2 && isTicketActive && isItExamRequest;
                            const canSync = courseData ? courseData.canSync === 'Yes' : false;
                            const courseFoundInLaunch = !course.notFoundInLaunch;

                            const row = document.createElement('tr');

                            if (isTicketActive) {
                                row.innerHTML = `
                                <td>${attachmentIcon}${bookIcon}${course.name || 'N/A'}${categoryBadge}</td>
                                <td style="white-space: nowrap;">${HelperFunctions.formatDateString(finishDate)}</td>
                                <td>
                                    <button class="comment-btn btn btn-sm btn-info" data-code="${course.code}">
                                        <i class="fas fa-comment-dots"></i>
                                    </button>
                                    <button class="sync-btn btn btn-sm btn-primary" ${!canSync || !courseFoundInLaunch ? 'disabled' : ''}>
                                        <i class="fas fa-sync"></i>
                                    </button>
                                </td>
                            `;
                            } else {
                                row.innerHTML = `
                                <td>${attachmentIcon}${bookIcon}${course.name || 'N/A'}${categoryBadge}</td>
                                <td style="white-space: nowrap;">${HelperFunctions.formatDateString(finishDate)}</td>
                                <td></td>
                            `;
                            }

                            currentTableBody.appendChild(row);

                            if (hasAttachmentRequirement) {
                                setTimeout(() => {
                                    const attachmentIconElement = row.querySelector('.attachment-icon');
                                    if (attachmentIconElement) {
                                        const attachmentTooltip = UIManager.createTooltip(
                                            'Attachment submission is required for this course along with the code',
                                            { top: 'auto', left: '30px', minWidth: 'max-content', fontWeight: 'bold' }
                                        );
                                        attachmentIconElement.appendChild(attachmentTooltip);
                                    }
                                }, 100);
                            }

                            if (hasBookRequirement) {
                                setTimeout(() => {
                                    const bookIconElement = row.querySelector('.book-icon');
                                    if (bookIconElement) {
                                        const bookTooltip = UIManager.createTooltip(
                                            'Don\'t forget to provide information for book order after activating this course',
                                            { top: 'auto', left: '30px', minWidth: 'max-content', fontWeight: 'bold' }
                                        );
                                        bookIconElement.appendChild(bookTooltip);
                                    }
                                }, 100);
                            }

                            if (isTicketActive) {
                                const commentBtn = row.querySelector('.comment-btn');
                                const syncBtn = row.querySelector('.sync-btn');

                                if (commentBtn) {
                                    let tooltipText = '';
                                    if (canSendExamCode) {
                                        tooltipText = 'Send Exam Code';
                                    } else {
                                        if (!isItExamRequest) {
                                            tooltipText = 'Ticket type is not Exam Request! Please check manually.';
                                        } else {
                                            tooltipText = `Cannot send exam code - exam date is ${daysDifference > 2 ? 'more than 2 days away' : 'invalid'}`;
                                        }
                                    }

                                    if (!canSendExamCode) {
                                        // For disabled buttons, wrap in a div for tooltip support
                                        const wrapper = document.createElement('div');
                                        wrapper.className = 'disabled-button-wrapper';
                                        commentBtn.parentNode.insertBefore(wrapper, commentBtn);
                                        wrapper.appendChild(commentBtn);

                                        // Disable the button
                                        commentBtn.disabled = true;
                                        commentBtn.classList.add('disabled');

                                        // Create tooltip for disabled button
                                        const commentTooltip = UIManager.createTooltip(tooltipText, {
                                            right: '0',
                                            minWidth: 'max-content'
                                        });
                                        wrapper.appendChild(commentTooltip);
                                    } else {
                                        // For enabled buttons, use normal tooltip
                                        const commentTooltip = UIManager.createTooltip(tooltipText, {
                                            right: '0'
                                        });
                                        commentBtn.appendChild(commentTooltip);
                                    }
                                }

                                if (syncBtn) {
                                    let syncTooltipText = '';
                                    if (canSync) {
                                        syncTooltipText = 'Sync myNewAOLCC';
                                    } else {
                                        syncTooltipText = 'Cannot Sync - Disabled for this course';
                                    }

                                    if (!canSync) {
                                        // For disabled buttons, wrap in a div for tooltip support
                                        const wrapper = document.createElement('div');
                                        wrapper.className = 'disabled-button-wrapper';
                                        syncBtn.parentNode.insertBefore(wrapper, syncBtn);
                                        wrapper.appendChild(syncBtn);

                                        // Disable the button
                                        syncBtn.disabled = true;
                                        syncBtn.classList.add('disabled');

                                        // Create tooltip for disabled button
                                        const syncTooltip = UIManager.createTooltip(syncTooltipText, {
                                            right: '0',
                                            minWidth: 'max-content'
                                        });
                                        wrapper.appendChild(syncTooltip);
                                    } else {
                                        // For enabled buttons, use normal tooltip
                                        const syncTooltip = UIManager.createTooltip(syncTooltipText, {
                                            right: '0'
                                        });
                                        syncBtn.appendChild(syncTooltip);
                                    }
                                }
                            }
                        });
                    } else {
                        currentTableBody.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center">No active courses found</td>
                    </tr>`;
                    }
                }

                // ✅ SIMPLIFIED Next courses table
                if (nextTableBody) {
                    nextTableBody.innerHTML = '';

                    if (nextCourses && nextCourses.length > 0) {
                        const nextCourse = nextCourses[0];

                        // ✅ NEW: Handle error messages for unmatched courses
                        if (nextCourse.isError) {
                            nextTableBody.innerHTML = `
                            <tr>
                                <td colspan="3" class="text-center text-danger">
                                    <i class="fas fa-exclamation-triangle"></i> ${nextCourse.errorMessage}
                                </td>
                            </tr>`;
                        }
                        else if (nextCourse.isMultiple) {
                            // Process both primary and secondary courses
                            const coursesToShow = [nextCourse.primary, nextCourse.secondary];
                            coursesToShow.forEach((courseToShow, index) => {
                                if (courseToShow) processNextCourse(courseToShow, index);
                            });
                        } else {
                            // Process single course
                            processNextCourse(nextCourse);
                        }
                    } else {
                        nextTableBody.innerHTML = `<tr><td colspan="3" class="text-center">No upcoming courses found</td></tr>`;
                    }
                }

                setTimeout(() => { TicketDetailManager.tableButtonsListeners(); }, 200);
            });
        } catch (error) {
            console.error('Error populating course tables:', error);
        }
    }

    static checkCourseCompleted(currentCourses, courseCode) {
        const course = currentCourses.find(c => c.code === courseCode);
        if (!course) return false;

        if (course.statusId !== undefined && course.statusId !== null) {
            return course.statusId !== 0 && course.statusId !== 1;
        }

        return course.status === 'Completed' || course.status === 'Pass';
    }

    static tableButtonsListeners() {
        const activateButtons = document.querySelectorAll('#next-course-table .btn-success:not([disabled])');
        const syncButtons = document.querySelectorAll('.sync-btn:not([disabled])');

        // Comment button listeners (Send Exam Code)
        const commentButtons = document.querySelectorAll('.comment-btn:not([disabled])');

        commentButtons.forEach(button => {
            // Zaten listener varsa ekleme
            if (button.hasAttribute('data-comment-listener-added')) return;

            button.addEventListener('click', async function (e) {
                e.preventDefault();

                const courseCode = this.dataset.code;
                const vNumber = HelperFunctions.findVNumber();

                if (!courseCode || !vNumber) {
                    ErrorHandler.showAlert('Course code or V-number not found', 'error');
                    return;
                }

                // Determine campus from vNumber
                const campus = HelperFunctions.getCampusFromVNumber(vNumber);

                // Get exam codes for this course from local storage
                try {
                    const examCodeResponse = await TicketDetailManager.getExamCodesFromStorage(courseCode, campus);

                    if (examCodeResponse && examCodeResponse.success && examCodeResponse.data) {
                        const examCodesResults = [{
                            courseCode: courseCode,
                            courseName: this.closest('tr').querySelector('td:first-child').textContent.trim(),
                            examCodes: examCodeResponse
                        }];

                        // Show exam codes
                        TicketDetailManager.showExamCodes(examCodesResults, campus);
                    } else {
                        ErrorHandler.showAlert('No exam codes found for this course', 'warning');
                    }
                } catch (error) {
                    ErrorHandler.showAlert('Error fetching exam codes', 'error');
                }
            });

            // Mark as listener added
            button.setAttribute('data-comment-listener-added', 'true');
        });

        // Activate buttons code with template functionality
        activateButtons.forEach(button => {
            // Zaten listener varsa ekleme
            if (button.hasAttribute('data-listener-added')) return;

            button.addEventListener('click', async function (e) {
                e.preventDefault();

                const courseCode = this.dataset.code;
                const vNumber = HelperFunctions.findVNumber();

                if (!courseCode || !vNumber) {
                    ErrorHandler.showAlert('Course code or V-number not found', 'error');
                    return;
                }

                let courseName = this.dataset.name || '';

                if (!courseCode || !vNumber) {
                    ErrorHandler.showAlert('Course code or V-number not found', 'error');
                    return;
                }

                // Start date kontrolü yapıyoruz
                const row = this.closest('tr');
                const courseDateCell = row.querySelector('td:nth-child(2)');
                const courseStartDate = courseDateCell ? courseDateCell.textContent.trim() : '';

                // Start date 2 günden fazla ise kontrol et
                const currentDate = new Date();
                const startDate = courseStartDate ? new Date(courseStartDate) : null;
                const daysDifference = startDate ?
                    Math.ceil((startDate - currentDate) / (1000 * 60 * 60 * 24)) : null;

                const isStartDateTooEarly = daysDifference !== null && daysDifference > 2;

                // Button loading state
                HelperFunctions.setButtonLoadingState(this, true, 'fa-spinner fa-spin', 0, 'Activating...');

                try {
                    const response = await TicketDetailManager.activateSelectedCourse(courseCode);

                    // Check if response has error messages even if success is true
                    const hasErrorMessages = response && response.messages &&
                        Array.isArray(response.messages) &&
                        response.messages.some(msg => msg.includes('There was an error'));

                    if (response && response.success && !hasErrorMessages) {
                        // Success state
                        this.innerHTML = '<i class="fas fa-check"></i> Activated';
                        this.classList.remove('btn-success');
                        this.classList.add('btn-info');

                        // Success alert
                        ErrorHandler.showAlert(`Course ${courseCode} activated successfully!`, 'success');

                        // Start date 2 günden fazla ise 177 templatei kullan, değilse normal template
                        if (isStartDateTooEarly) {
                            TicketDetailManager.handleDateTemplate(177);
                        } else {
                            // Show normal activation template on success
                            TicketDetailManager.showActivationTemplate(courseCode, courseName);
                        }

                        // Refresh course tables
                        await TicketDetailManager.refreshCourseTablesAfterActivation();

                    } else {
                        // Error state - Create HD Send button instead of Error button
                        this.innerHTML = '<i class="fas fa-paper-plane"></i> Send HD';
                        this.classList.remove('btn-success', 'disabled'); // ✅ disabled class'ını da kaldır
                        this.classList.add('btn-light');
                        this.style.border = '1px solid var(--secondary-color)';
                        this.disabled = false;
                        this.removeAttribute('disabled');

                        // Remove old event listener and add HD request functionality
                        const newButton = this.cloneNode(true);
                        newButton.disabled = false; // ✅ Clone'da da disabled'ı kaldır
                        newButton.removeAttribute('disabled'); // ✅ Attribute'unu da kaldır
                        this.parentNode.replaceChild(newButton, this);

                        // Add HD request click handler
                        newButton.addEventListener('click', async function (e) {
                            e.preventDefault();
                            await TicketDetailManager.handleHDRequest(courseCode, courseName);
                        });
                    }

                } catch (error) {
                    console.error('Activation error:', error);

                    // Error state - Create HD Send button instead of Error button
                    this.innerHTML = '<i class="fas fa-paper-plane"></i> Send HD';
                    this.classList.remove('btn-success', 'disabled'); // ✅ disabled class'ını da kaldır
                    this.classList.add('btn-light');
                    this.style.border = '1px solid var(--secondary-color)';
                    this.disabled = false;
                    this.removeAttribute('disabled');

                    ErrorHandler.showAlert('An error occurred during activation', 'error');

                    // Remove old event listener and add HD request functionality
                    const newButton = this.cloneNode(true);
                    newButton.disabled = false; // ✅ Clone'da da disabled'ı kaldır
                    newButton.removeAttribute('disabled'); // ✅ Attribute'unu da kaldır
                    this.parentNode.replaceChild(newButton, this);

                    // Add HD request click handler
                    newButton.addEventListener('click', async function (e) {
                        e.preventDefault();
                        await TicketDetailManager.handleHDRequest(courseCode, courseName);
                    });
                }
            });

            // Mark as listener added
            button.setAttribute('data-listener-added', 'true');
        });

        syncButtons.forEach(button => {
            if (button.hasAttribute('data-sync-listener-added')) return;

            button.addEventListener('click', async function (e) {
                e.preventDefault();

                // Save original button content
                const originalIcon = this.innerHTML;

                // Sync için courseCode'u parent row'dan al
                const row = this.closest('tr');
                const courseNameCell = row.querySelector('td:first-child');
                const courseName = courseNameCell ? courseNameCell.textContent.trim() : '';

                // courseCode'u comment butonundan al
                const commentBtn = row.querySelector('.comment-btn');
                const courseCode = commentBtn ? commentBtn.dataset.code : '';

                if (!courseCode) {
                    ErrorHandler.showAlert('Course code not found for sync', 'error');
                    return;
                }

                HelperFunctions.setButtonLoadingState(this, true, 'fa-spinner fa-spin', 0);

                try {
                    const response = await TicketDetailManager.syncSelectedCourse(courseCode, courseName);

                    if (response && response.success) {
                        // Success state
                        this.innerHTML = '<i class="fas fa-check text-success"></i>';

                        // ✅ NEW: Handle different alert types based on grade
                        if (response.showFailAlert && response.failMessage) {
                            // Show fail alert in red
                            ErrorHandler.showAlert(response.message, 'success');
                            setTimeout(() => {
                                ErrorHandler.showAlert(response.failMessage, 'error');
                            }, 1000);
                        } else {
                            // Show regular success alert
                            ErrorHandler.showAlert(response.message, 'success');
                        }

                        await TicketDetailManager.refreshCourseTablesAfterActivation();

                        // Reset button after 2 seconds
                        setTimeout(() => {
                            this.innerHTML = originalIcon;
                            this.disabled = false;
                        }, 2000);

                    } else {
                        // Error state
                        this.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i>';

                        const errorMessage = response?.message || response?.error || 'Course sync failed';
                        ErrorHandler.showAlert(errorMessage, 'error');

                        // Reset button after 3 seconds
                        setTimeout(() => {
                            this.innerHTML = originalIcon;
                            this.disabled = false;
                        }, 3000);
                    }

                } catch (error) {
                    this.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i>';
                    ErrorHandler.showAlert('An error occurred during sync', 'error');

                    // Reset button after 3 seconds
                    setTimeout(() => {
                        this.innerHTML = originalIcon;
                        this.disabled = false;
                    }, 3000);
                }
            });

            // Mark as listener added
            button.setAttribute('data-sync-listener-added', 'true');
        });
    }

    static getActivationTemplateId(courseCode, campus) {
        return new Promise(async (resolve) => {
            chrome.storage.local.get(['rulesData'], async (result) => {
                if (result.rulesData && result.rulesData.templates && result.rulesData.templates.activation) {
                    const activationTemplates = result.rulesData.templates.activation;
                    const specialCourses = activationTemplates.special_courses || {};
                    const defaultTemplate = activationTemplates.default_template || 175;

                    // ✅ UPDATED: Use the new helper function
                    const mappedCourse = await HelperFunctions.findCourseMappingWithFallback(courseCode, specialCourses);

                    if (mappedCourse) {
                        // mappedCourse is now the template config object
                        const courseTemplates = specialCourses[mappedCourse];

                        // Check if campus specific template exists
                        if (courseTemplates && courseTemplates[campus]) {
                            resolve(courseTemplates[campus]);
                            return;
                        }

                        // Check if ALL campus template exists
                        if (courseTemplates && courseTemplates['ALL']) {
                            resolve(courseTemplates['ALL']);
                            return;
                        }
                    }

                    // Use default template
                    resolve(defaultTemplate);
                } else {
                    // ✅ Fallback to static templates - also use the helper
                    console.warn('Health data not available, using static template mappings');
                    const specialCourses = {
                        'BAIP*E1': { Toronto: 76, Brampton: 169, 'North York': 169 },
                        'SFS*E1': { ALL: 105 },
                        'SG5*E1': { ALL: 127 },
                        'PMF*E1': { ALL: 140 },
                        'HICP*E1': { ALL: 142 },
                        'ITExamPrep': { ALL: 146 },
                        'BBK99E1': { ALL: 148 },
                        'TYP-A01': { ALL: 157 },
                        'TYP-A02': { ALL: 158 },
                        'TYP-A03': { ALL: 159 },
                        'BBK99E2': { ALL: 160 },
                        'QBO*E1': { ALL: 161 },
                        'MRPS00': { Toronto: 164, Brampton: 165, 'North York': 166 }
                    };

                    const mappedCourse = await HelperFunctions.findCourseMappingWithFallback(courseCode, specialCourses);

                    if (mappedCourse) {
                        const courseTemplates = specialCourses[mappedCourse];

                        if (courseTemplates && courseTemplates[campus]) {
                            resolve(courseTemplates[campus]);
                            return;
                        }

                        if (courseTemplates && courseTemplates['ALL']) {
                            resolve(courseTemplates['ALL']);
                            return;
                        }
                    }

                    resolve(175); // Default fallback
                }
            });
        });
    }

    static showActivationTemplate(courseCode, courseName) {
        try {
            // Determine campus from vNumber
            const campus = TicketDetailManager.studentData.campus;
            const studentName = TicketDetailManager.studentData.fullName;

            // ✅ No cleaning needed - courseName comes from data-name attribute which is already clean
            console.log('Course name for template:', courseName);

            // Get template ID dynamically
            this.getActivationTemplateId(courseCode, campus).then(templateId => {
                if (!templateId) {
                    console.warn('No template found for course:', courseCode, 'campus:', campus);
                    return;
                }

                // Fetch template and process it
                DataService.fetchTemplate(templateId, (templateContent) => {
                    const processedTemplate = templateContent
                        .replace(/\[student_name\]/g, studentName || '')
                        .replace(/\[course_name\]/g, courseName || '');

                    this.loadTemplateIntoEditor(processedTemplate);
                });
            });

        } catch (error) {
            ErrorHandler.showAlert('Failed to load activation template.', 'error');
        }
    }

    static async syncSelectedCourse(courseCode, courseName = '') {
        try {
            const vNumber = HelperFunctions.findVNumber();

            if (!courseCode) {
                throw new Error('Course code is required');
            }

            console.log('Starting sync for course:', courseCode);

            // Get student email from API first
            const apiResponse = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'apiStudentSearch',
                    data: {
                        student_number: vNumber
                    }
                }, resolve);
            });

            if (!apiResponse.success || !apiResponse.data || apiResponse.data.length === 0) {
                throw new Error('Student not found in API');
            }

            const studentData = apiResponse.data[0];
            const studentEmail = studentData.aolcc_email;

            if (!studentEmail) {
                throw new Error('Student email not found in API response');
            }

            console.log('Using student email for search:', studentEmail);

            // 1. getCourseDetails ile HTML çek - email kullan
            const htmlResponse = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'getCourseDetails',
                    data: {
                        vNumber: vNumber,
                        student: {
                            aolcc_email: studentEmail
                        }
                    }
                }, resolve);
            });

            console.log('HTML response:', htmlResponse?.success ? 'Success' : 'Failed');
            if (!htmlResponse.success) {
                throw new Error(htmlResponse.error);
            }

            // 2. DataService.parseUserDetailsFromHtml ile parse et
            const parseResult = DataService.parseUserDetailsFromHtml(htmlResponse.data);
            console.log('Parse result:', parseResult?.success ? 'Success' : 'Failed');

            if (!parseResult.success) {
                throw new Error(parseResult.error);
            }

            // 3. Find uniqueID for the course
            const uniqueID = TicketDetailManager.findCourseUniqueID(parseResult.data, courseCode, vNumber);
            console.log('Found uniqueID:', uniqueID);

            if (!uniqueID) {
                throw new Error(`Course ${courseCode} not found in student data`);
            }

            // 4. Sync için gerekli dataları hazırla
            console.log('Calling courseSyncHandler...');
            const syncPrepareResult = await new Promise((resolve) => {
                DataService.courseSyncHandler({
                    data: parseResult,
                    courseCode: courseCode,
                    contractCode: vNumber,
                    uniqueID: uniqueID
                }, resolve);
            });

            console.log('Sync prepare result:', syncPrepareResult);
            if (!syncPrepareResult.success) {
                throw new Error(syncPrepareResult.message);
            }

            // 5. Background'da sync işlemini çalıştır
            console.log('Sending to background sync...');
            const syncResponse = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'courseSync',
                    data: syncPrepareResult.data,
                    courseCode: courseCode,
                    contractCode: vNumber,
                    userID: syncPrepareResult.userID,
                    contractID: syncPrepareResult.contractID,
                    programID: syncPrepareResult.programID,
                    uniqueProgramID: syncPrepareResult.uniqueProgramID,
                    uniqueID: uniqueID
                }, resolve);
            });

            console.log('Final sync response:', syncResponse);

            if (syncResponse && syncResponse.message && syncResponse.message.includes('Grade item is missing')) {
                console.log('🎯 Grade item is missing detected - loading template 116');

                // Load template 116 automatically
                DataService.fetchTemplate(116, (templateContent) => {
                    const studentName = TicketDetailManager.studentData.fullName;
                    const processedTemplate = templateContent
                        .replace(/\[student_name\]/g, studentName || '')
                        .replace(/\[course_name\]/g, courseName || '');

                    TicketDetailManager.loadTemplateIntoEditor(processedTemplate);
                });
            }

            if (syncResponse && syncResponse.success) {
                try {
                    // Get fresh course data to check the grade
                    const freshHtmlResponse = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({
                            action: 'getCourseDetails',
                            data: {
                                vNumber: vNumber,
                                student: {
                                    aolcc_email: studentEmail
                                }
                            }
                        }, resolve);
                    });

                    if (freshHtmlResponse && freshHtmlResponse.success) {
                        const freshParseResult = DataService.parseUserDetailsFromHtml(freshHtmlResponse.data);

                        if (freshParseResult.success) {
                            // ✅ UPDATED: Pass syncResponse to get exammark
                            const courseGrade = HelperFunctions.findCourseGrade(
                                freshParseResult.data,
                                courseCode,
                                vNumber,
                                syncResponse
                            );

                            if (courseGrade) {
                                const { status, grade } = courseGrade;

                                if (status === 5) { // Fail status
                                    return {
                                        success: true,
                                        message: `Course ${courseCode} synced successfully!`,
                                        showFailAlert: true,
                                        failMessage: `Student failed the course with a grade of ${grade}%.`
                                    };
                                } else if ([2, 3, 10].includes(status)) { // ✅ UPDATED: Pass statuses
                                    const statusText = status === 3 ? 'Honours' : status === 2 ? 'Pass' : 'Complete';

                                    // ✅ UPDATED: Show grade only if it's a valid number
                                    const gradeText = (grade !== 'N/A' && !isNaN(parseFloat(grade)))
                                        ? `${grade}`
                                        : 'grade not available';

                                    return {
                                        success: true,
                                        message: `Course ${courseCode} synced successfully! Student passed with ${gradeText}% (${statusText}).`
                                    };
                                }
                            }
                        }
                    }
                } catch (gradeError) {
                    console.warn('Could not retrieve course grade after sync:', gradeError);
                }
            }

            return syncResponse;

        } catch (error) {
            console.error('Course sync error:', error);
            return { success: false, error: error.message };
        }
    }

    static findCourseUniqueID(studentData, courseCode, contractCode) {
        try {
            if (!studentData || !studentData.studentProgram) {
                console.error('Invalid student data structure');
                return null;
            }

            // studentProgram array'inde dolaş
            for (const program of studentData.studentProgram) {
                if (!program.studentContracts) continue;

                // studentContracts array'inde dolaş
                for (const contract of program.studentContracts) {
                    if (contract.contractCode !== contractCode) continue;

                    if (!contract.courses) continue;

                    // courses array'inde dolaş
                    for (const course of contract.courses) {
                        if (course.courseCode === courseCode) {
                            console.log('Found course uniqueID:', course.uniqueID, 'for course:', courseCode);
                            return course.uniqueID;
                        }
                    }
                }
            }

            console.error('Course not found:', courseCode, 'in contract:', contractCode);
            return null;
        } catch (error) {
            console.error('Error finding course uniqueID:', error);
            return null;
        }
    }

    static async activateSelectedCourse(courseCode) {
        try {
            const vNumber = HelperFunctions.findVNumber();

            if (!courseCode) {
                throw new Error('Course code is required');
            }

            // Get student email from API first
            const apiResponse = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'apiStudentSearch',
                    data: {
                        student_number: vNumber
                    }
                }, resolve);
            });

            if (!apiResponse.success || !apiResponse.data || apiResponse.data.length === 0) {
                throw new Error('Student not found in API');
            }

            const studentData = apiResponse.data[0];
            const studentEmail = studentData.aolcc_email;

            if (!studentEmail) {
                throw new Error('Student email not found in API response');
            }

            console.log('Using student email for activation:', studentEmail);

            // 1. getCourseDetails ile HTML çek - email kullan
            const htmlResponse = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'getCourseDetails',
                    data: {
                        vNumber: vNumber,
                        student: {
                            aolcc_email: studentEmail
                        }
                    }
                }, resolve);
            });

            if (!htmlResponse.success) {
                throw new Error(htmlResponse.error);
            }

            const parseResult = DataService.parseUserDetailsFromHtml(htmlResponse.data);

            if (!parseResult.success) {
                throw new Error(parseResult.error);
            }

            const handlerResult = await new Promise((resolve) => {
                DataService.courseActivationHandler({
                    data: parseResult.data,
                    courseCodes: [courseCode],
                    contractCode: vNumber,
                    isCPL: false,
                    useNextMonday: false
                }, resolve);
            });

            const activationResponse = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'courseActivation',
                    data: handlerResult, // Bu artık encoded data içeriyor
                    courseCodes: [courseCode], // Parameter olarak gelen courseCode
                    contractCode: vNumber,
                    isCPL: false // TicketDetailManager'da CPL yok
                }, resolve);
            });

            console.log('Activation response:', activationResponse);

            return activationResponse;
        } catch (error) {
            console.error('Course activation error:', error);
            return { success: false, error: error.message };
        }
    }

    static async refreshCourseTablesAfterActivation() {
        try {
            const vNumber = HelperFunctions.findVNumber();
            if (!vNumber) return;

            TicketDetailManager.showCourseTablesLoading();

            const response = await HelperFunctions.sendMessage('apiStudentSearch', {
                student_number: vNumber
            });

            if (response && response.success && response.data && response.data.length > 0) {
                const studentData = response.data[0];
                const examSchedule = studentData.exam_schedule;

                const launchResponse = await HelperFunctions.sendMessage('getCourseDetails', {
                    vNumber: vNumber,
                    student: {
                        aolcc_email: studentData.aolcc_email
                    }
                });

                if (launchResponse && launchResponse.success && launchResponse.data) {
                    const analysisResult = await DataService.analyzeStudentCourses(launchResponse.data, examSchedule);

                    if (analysisResult.success) {
                        // ✅ Pass both failCount and nonILSFailCount
                        TicketDetailManager.populateCourseTables(
                            analysisResult.currentCourses,
                            analysisResult.nextCourse ? [analysisResult.nextCourse] : [],
                            examSchedule,
                            analysisResult.failCount || 0,
                            analysisResult.nonILSFailCount || 0 // ✅ NEW: Pass nonILSFailCount
                        );
                    } else {
                        TicketDetailManager.showCourseTablesError('Failed to analyze refreshed course data');
                    }
                } else {
                    TicketDetailManager.showCourseTablesError('Failed to get refreshed course data');
                }
            } else {
                TicketDetailManager.showCourseTablesError('Failed to get refreshed student data');
            }

        } catch (error) {
            console.error('Error refreshing course tables:', error);
            TicketDetailManager.showCourseTablesError('Error refreshing course data');
        }
    }

    static async insertStudentInfoElements(studentMail, pdfLink) {
        const xpathQueries = [
            "//div[@class='col-sm-12']/parent::div",
            "//div[@class='col-sm-6 d-flex']/parent::div"
        ];

        let targetRow = null;
        for (let query of xpathQueries) {
            targetRow = HelperFunctions.evaluateXPath(query).singleNodeValue;
            if (targetRow) break;
        }

        if (targetRow && targetRow.parentNode) {
            const newRow = document.createElement('div');
            newRow.className = 'row';

            const mailDiv = TicketDetailManager.createStudentMailElement(studentMail);
            newRow.appendChild(mailDiv);

            const scheduleExamDiv = TicketDetailManager.createScheduleExamElement(pdfLink);
            newRow.appendChild(scheduleExamDiv);

            targetRow.parentNode.insertBefore(newRow, targetRow);
        }
    }

    static showCourseTablesLoading() {
        const currentTableBody = document.querySelector('#current-course-table tbody');
        const nextTableBody = document.querySelector('#next-course-table tbody');

        if (currentTableBody) {
            currentTableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">
                    <span class="loading-courses-current">Loading courses...</span>
                </td>
            </tr>`;

            // Apply loading state to the loading text
            const loadingElement = currentTableBody.querySelector('.loading-courses-current');
            if (loadingElement) {
                HelperFunctions.setButtonLoadingState(loadingElement, true, 'fa-spinner fa-spin', 0, 'Loading courses...');
            }
        }

        if (nextTableBody) {
            nextTableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">
                    <span class="loading-courses-next">Loading upcoming courses...</span>
                </td>
            </tr>`;

            // Apply loading state to the loading text
            const loadingElement = nextTableBody.querySelector('.loading-courses-next');
            if (loadingElement) {
                HelperFunctions.setButtonLoadingState(loadingElement, true, 'fa-spinner fa-spin', 0, 'Loading upcoming courses...');
            }
        }
    }

    static showCourseTablesError(errorMessage) {
        const currentTableBody = document.querySelector('#current-course-table tbody');
        const nextTableBody = document.querySelector('#next-course-table tbody');

        if (currentTableBody) {
            currentTableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle"></i> ${errorMessage}
                </td>
            </tr>`;
        }

        if (nextTableBody) {
            nextTableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle"></i> Unable to load upcoming courses
                </td>
            </tr>`;
        }
    }

    static async addTicketManagementButtons() {
        return HelperFunctions.urlCheck([CONFIG.TICKET_DETAILS_URL], async function () {
            try {
                const ticketId = new URLSearchParams(window.location.search).get('id');
                if (!ticketId) {
                    console.error('Could not extract ticket ID from URL');
                    return;
                }

                const studentId = HelperFunctions.findVNumber() || '';
                const adminId = await DataService.getAdminIdFromSource();

                const button = document.createElement('button');
                const isActive = document.getElementById('manage_ticket');
                const statusText = HelperFunctions.getElementByXPath('STATUS_TEXT').textContent.trim();

                if (isActive) {
                    button.innerHTML = '<i class="fas fa-undo-alt"></i> Return It';
                    button.className = 'return-it-btn';
                } else if (statusText.startsWith("Closed")) {
                    button.innerHTML = '<i class="fas fa-redo-alt"></i> Reactivate It';
                    button.className = 'reactivate-it-btn';
                } else if (statusText.startsWith("Pending") || statusText.startsWith("Processing")) {
                    button.innerHTML = '<i class="fas fa-user-plus"></i> Assign to Me';
                    button.className = 'assign-to-me-btn';
                } else { return; }

                button.addEventListener('click', async () => {
                    try {
                        HelperFunctions.setButtonLoadingState(button, true, '', 0, 'Processing...');

                        const response = await fetch('https://aoltorontoagents.ca/student_contract/chat/ajax.php?action=assin_tutors', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: `ticket=${ticketId}&tutors_id=${isActive ? '' : adminId}&admin_id=${adminId}&student_id=${studentId}`
                        });

                        if (response.ok) {
                            const result = await response.text();
                            if (result === '1') {
                                if (isActive) {
                                    window.location.href = 'https://aoltorontoagents.ca/student_contract/chat/mine_list.php';
                                } else {
                                    window.location.reload();
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Button action error:', error);
                        HelperFunctions.setButtonLoadingState(button, false, isActive ?
                            '<i class="fas fa-undo-alt"></i> Return It' :
                            '<i class="fas fa-redo-alt"></i> Reactivate It', 0);
                    }
                });

                const ticketNumberElement = document.querySelector('div.card-header > h4 > b[style*="font-size: 16px"]');
                if (ticketNumberElement) {
                    ticketNumberElement.parentNode.insertBefore(button, ticketNumberElement);
                }

            } catch (error) {
                console.error('Error adding button:', error);
            }
        })();
    }

    static addCopyIconToViewDetails() {
        return HelperFunctions.urlCheck([CONFIG.TICKET_DETAILS_URL], function () {
            try {
                const viewTicketsHeader = HelperFunctions.getElementByXPath('VIEW_TICKETS_HEADER');
                if (viewTicketsHeader) {
                    const copyIconViewTickets = HelperFunctions.addCopyIconToElement(viewTicketsHeader, '', {
                        position: 'append',
                        style: { marginLeft: '10px' },
                        title: 'Copy Combined Text'
                    });

                    copyIconViewTickets.addEventListener('click', () => {
                        const firstNameText = HelperFunctions.getElementByXPath('FIRST_NAME')
                            .textContent.trim() || '';
                        const lastNameText = HelperFunctions.getElementByXPath('LAST_NAME')
                            .textContent.trim() || '';
                        const vNoText = HelperFunctions.findVNumber() || '';
                        const programNameText = HelperFunctions.getElementByXPath('PROGRAM_NAME')
                            .textContent.trim() || '';
                        const combinedText = `${firstNameText} ${lastNameText} - ${vNoText} - ${programNameText}`;

                        navigator.clipboard.writeText(combinedText)
                            .then(() => {
                                HelperFunctions.showInlineCopyAlert(copyIconViewTickets);
                            })
                            .catch(err => {
                                console.error('Copy error: ', err);
                            });
                    });

                    viewTicketsHeader.appendChild(copyIconViewTickets);
                }

                const contactNumberElement = HelperFunctions.getElementByXPath('CONTACT_NUMBER');
                if (contactNumberElement) {
                    HelperFunctions.addCopyIconToElement(contactNumberElement, contactNumberElement.textContent.trim(), {
                        position: 'before',
                        style: { marginRight: '5px' }
                    });
                }

                const emailIdElement = HelperFunctions.getElementByXPath('EMAIL_ID');
                if (emailIdElement) {
                    HelperFunctions.addCopyIconToElement(emailIdElement, emailIdElement.textContent.trim(), {
                        position: 'before',
                        style: { marginRight: '5px' }
                    });
                }
            } catch (error) {
                console.error('Error adding copy functionality to View Details:', error);
            }
        })();
    }

    static addCopyIconToVCode() {
        return HelperFunctions.urlCheck([CONFIG.TICKET_DETAILS_URL], function () {
            try {
                const vCodeText = HelperFunctions.findVNumber();
                if (vCodeText) {
                    const vCodeTextNode = HelperFunctions.getElementByXPath('VNO');
                    if (vCodeTextNode) {
                        HelperFunctions.addCopyIconToElement(vCodeTextNode, vCodeText, {
                            position: 'before',
                            style: { marginRight: '5px' }
                        });
                    }
                    StateManager.setVCodeText(vCodeText);
                } else {
                    console.log("V.No. element not found!");
                }
            } catch (error) {
                console.log(error, 'addCopyIconToVCode');
            }
        })();
    }

    static addCopyIconToFirstName() {
        return HelperFunctions.urlCheck([CONFIG.TICKET_DETAILS_URL], function () {
            const firstNameElement = HelperFunctions.getElementByXPath('FIRST_NAME');
            const lastNameElement = HelperFunctions.getElementByXPath('LAST_NAME');
            try {
                if (firstNameElement && lastNameElement) {
                    const firstNameText = firstNameElement.textContent.trim();
                    const lastNameText = lastNameElement.textContent.trim();
                    const fullNameText = `${firstNameText} ${lastNameText}`;
                    HelperFunctions.addCopyIconToElement(firstNameElement, fullNameText, {
                        position: 'before',
                        style: { marginRight: '5px' }
                    });
                }
            } catch (error) {
                console.error('Error adding copy icon to full name:', error);
            }
        })();
    }

    static hideOptionsByCampus() {
        return HelperFunctions.urlCheck([CONFIG.TICKET_DETAILS_URL], function () {
            const selectElement = document.getElementById('gettemplates');
            if (!selectElement) {
                return;
            }

            chrome.storage.local.get(['sortOptionsAZ'], result => {
                if (result.sortOptionsAZ) {
                    const options = Array.from(selectElement.options);
                    options.sort((a, b) => a.textContent.trim().localeCompare(b.textContent.trim()));
                    selectElement.innerHTML = '';
                    options.forEach(option => selectElement.appendChild(option));
                }

                const vCodePrefix = StateManager.getVCodeText().substring(1, 2);
                let prefixesToHide = [];

                switch (vCodePrefix) {
                    case 'T':
                        prefixesToHide = ['BR', 'NY', 'XTN'];
                        break;
                    case 'B':
                        prefixesToHide = ['TO', 'NY', 'XTN'];
                        break;
                    case 'N':
                        prefixesToHide = ['TO', 'BR', 'XTN'];
                        break;
                    default:
                        return;
                }

                selectElement.querySelectorAll('option').forEach(option => {
                    if (prefixesToHide.some(prefix => option.textContent.trim().startsWith(prefix))) {
                        option.style.display = 'none';
                    }
                });
            });
        })();
    }

    static makeSelectSearchable() {
        return HelperFunctions.urlCheck([CONFIG.TICKET_DETAILS_URL], function () {

            try {
                const selectElement = document.getElementById('gettemplates');
                if (!selectElement) {
                    return;
                }

                const wrapperDiv = document.createElement('div');
                wrapperDiv.className = 'select-searchable';
                selectElement.parentNode.insertBefore(wrapperDiv, selectElement);
                wrapperDiv.appendChild(selectElement);

                const selectTemplateLabel = HelperFunctions.evaluateXPath("//label[contains(text(),'Select Template')]").singleNodeValue;
                if (selectTemplateLabel) {
                    selectTemplateLabel.style.display = 'none';
                }

                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.style.fontWeight = '600';
                searchInput.style.color = 'black';
                searchInput.value = 'Search or select template...';
                wrapperDiv.insertBefore(searchInput, selectElement);

                const clearButton = document.createElement('span');
                clearButton.innerHTML = '&times;';
                clearButton.className = 'clear-selection';
                wrapperDiv.appendChild(clearButton);

                const optionsList = document.createElement('ul');
                wrapperDiv.appendChild(optionsList);

                const optionsArray = Array.from(selectElement.options);

                chrome.storage.local.get(['sortOptionsAZ'], function (result) {
                    const sortOptionsAZ = result.sortOptionsAZ;
                    if (sortOptionsAZ) {
                        optionsArray.sort((a, b) => a.textContent.trim().localeCompare(b.textContent.trim()));
                    }

                    optionsArray.forEach((option) => {
                        if (option.style.display === 'none' || option.value === "") {
                            return;
                        }

                        const listItem = document.createElement('li');
                        listItem.textContent = option.textContent;
                        listItem.dataset.value = option.value;
                        optionsList.appendChild(listItem);

                        listItem.addEventListener('mousedown', (event) => {
                            event.preventDefault();
                            selectElement.value = listItem.dataset.value;
                            searchInput.value = listItem.textContent;
                            optionsList.style.display = 'none';
                            clearButton.style.display = 'block';
                            console.log(`Selected template: ${listItem.textContent}, Value: ${listItem.dataset.value}`);
                            DataService.fetchTemplate(listItem.dataset.value);
                        });
                    });
                });

                function showAllOptions() {
                    Array.from(optionsList.children).forEach(listItem => {
                        listItem.style.display = 'block';
                    });
                    optionsList.style.display = 'block';
                }

                function resetSelection() {
                    searchInput.value = 'Search or select template...';
                    selectElement.value = '';
                    clearButton.style.display = 'none';
                    showAllOptions();
                }

                clearButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    resetSelection();
                });

                searchInput.addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (searchInput.value === 'Search or select template...') {
                        searchInput.value = '';
                    }
                    showAllOptions();
                });

                searchInput.addEventListener('input', () => {
                    const searchTerm = searchInput.value.toLowerCase().trim();
                    clearButton.style.display = searchTerm ? 'block' : 'none';

                    if (searchTerm === '') {
                        showAllOptions();
                    } else {
                        let hasVisibleOptions = false;
                        Array.from(optionsList.children).forEach(listItem => {
                            if (listItem.textContent.toLowerCase().includes(searchTerm)) {
                                listItem.style.display = 'block';
                                hasVisibleOptions = true;
                            } else {
                                listItem.style.display = 'none';
                            }
                        });
                        optionsList.style.display = hasVisibleOptions ? 'block' : 'none';
                    }
                });

                searchInput.addEventListener('focus', () => {
                    if (searchInput.value === 'Search or select template...') {
                        searchInput.value = '';
                        clearButton.style.display = 'none';
                    }
                    showAllOptions();
                });

                document.addEventListener('click', (event) => {
                    if (!wrapperDiv.contains(event.target)) {
                        optionsList.style.display = 'none';
                        if (searchInput.value === '') {
                            resetSelection();
                        }
                    }
                });

                selectElement.style.display = 'none';
                const formGroupDiv = selectElement.closest('.form-group');
                formGroupDiv.classList.add('col-sm-6');
            } catch (error) {
                console.error('Error making select searchable:', error);
            }
        })();
    }

    static async getFirstNameLink(firstNameElement) {
        const link = firstNameElement.href;
        return link;
    }

    static countFailElements(doc) {
        const failElements = doc.querySelectorAll('td');
        let count = 0;
        failElements.forEach(el => {
            if (el.textContent.trim() === 'Fail') count++;
        });
        console.log('Fail Count:', count);
        return count;
    }

    static createStudentMailElement(studentMail) {
        const mailDiv = document.createElement('div');
        mailDiv.className = 'col-sm-6';

        const studentMailTitle = document.createElement('b');
        studentMailTitle.textContent = 'Student Mail';
        studentMailTitle.className = 'border-bottom';
        const studentMailP = document.createElement('p');
        studentMailP.appendChild(studentMailTitle);
        studentMailP.appendChild(document.createElement('br'));
        const studentMailLink = document.createElement('a');

        if (studentMail && studentMail.includes('@')) {
            const studentMailBold = document.createElement('b');
            studentMailBold.textContent = studentMail;
            studentMailLink.href = `https://mynew.aolcc.ca/accounts/22/users?search_term=${encodeURIComponent(studentMail)}`;
            studentMailLink.target = '_blank';

            HelperFunctions.addCopyIconToElement(studentMailP, studentMail, {
                position: 'append',
                style: { marginRight: '5px' }
            });

            studentMailLink.appendChild(studentMailBold);
            studentMailP.appendChild(studentMailLink);
        } else {
            const naText = document.createElement('b');
            naText.textContent = 'N/A';
            studentMailP.appendChild(naText);
        }
        mailDiv.appendChild(studentMailP);
        return mailDiv;
    }

    static createScheduleExamElement(pdfLink) {
        const scheduleExamDiv = document.createElement('div');
        scheduleExamDiv.className = 'col-sm-6 col-xl-4 col-md-5';

        const scheduleExamTitle = document.createElement('b');
        scheduleExamTitle.textContent = 'Schedule Exam Document';
        scheduleExamTitle.className = 'border-bottom';

        const scheduleExamP = document.createElement('p');
        scheduleExamP.appendChild(scheduleExamTitle);
        scheduleExamP.appendChild(document.createElement('br'));

        if (pdfLink) {
            const linkContainer = document.createElement('span');
            linkContainer.style.display = 'inline-flex';
            linkContainer.style.alignItems = 'center';
            linkContainer.style.gap = '10px';

            const viewLink = document.createElement('a');
            viewLink.href = 'javascript:void(0)';
            viewLink.style.cursor = 'pointer';
            const viewText = document.createElement('b');
            viewText.textContent = 'View';
            viewLink.appendChild(viewText);

            const newTabLink = document.createElement('a');
            newTabLink.href = pdfLink.href;
            newTabLink.target = '_blank';
            newTabLink.title = 'Open in new tab';
            newTabLink.innerHTML = '<i class="fas fa-external-link-alt"></i>';

            viewLink.addEventListener('click', (e) => {
                e.preventDefault();
                UIManager.showModal(
                    pdfLink.href.split('/').pop(),
                    `<div class="file-preview">
                        <iframe credentialless src="${pdfLink.href}#zoom=125" style="width:100%;height:80vh;border:none;"></iframe>
                    </div>`,
                    '',
                    ''
                );
            });

            linkContainer.appendChild(viewLink);
            linkContainer.appendChild(newTabLink);
            scheduleExamP.appendChild(linkContainer);
        } else {
            const naText = document.createElement('b');
            naText.textContent = 'N/A';
            scheduleExamP.appendChild(naText);
        }

        scheduleExamDiv.appendChild(scheduleExamP);
        return scheduleExamDiv;
    }

    static addTemplateButtons() {
        if (!document.getElementById('manage_ticket')) {
            return;
        }

        try {
            const typeTextElement = HelperFunctions.getElementByXPath('TYPE_TEXT');
            if (!typeTextElement) {
                console.log("Type text not found!");
                return;
            }

            const typeText = typeTextElement.textContent.trim();
            const vNumber = StateManager.getVCodeText();
            const vNumberPrefix = vNumber.substring(1, 2);

            const allButtons = {
                newCourseActivation: { text: "New Course", id: 29 },
                sfsActivation: { text: "SFS Act.", id: 105 },
                deniedFailed: { text: "Denied (Failed)", id: 115 },
                deniedMissingExams: { text: "Denied (Mis. Exams)", id: 116 },
                examCode: { text: "Exam Code", id: 1 },
                ldb: { text: "LDB", id: 30 },
                typazLevel1: { text: "Typaz-1", id: 157 },
                typazLevel2: { text: "Typaz-2", id: 158 },
                typazLevel3: { text: "Typaz-3", id: 159 },
                practicalWith: { text: "Practical with...", id: 14 },
                practicalWithout: { text: "Practical w/o.", id: 15 },
                examDenied: { text: "Exam Denied", id: 117 },
                examTooEarly: { text: "Exam Too Early", id: 17 },
                retakeWithPract: { text: "Retake with Pract.", id: 19 },
                retakeWoPract: { text: "Retake w/o Pract.", id: 20 },
                retakeImpMarks: { text: "Retake Imp. Marks", id: 21 },
                lateRequest: { text: "Late Request", id: 56 }
            };

            const buttonGroups = {
                exam: ['examCode', 'ldb', 'typazLevel1', 'typazLevel2', 'typazLevel3', 'practicalWith', 'practicalWithout', 'examDenied', 'examTooEarly'],
                newCourse: ['newCourseActivation', 'sfsActivation', 'typazLevel1', 'typazLevel2', 'typazLevel3', 'deniedFailed', 'deniedMissingExams'],
                retake: ['examCode', 'ldb', 'typazLevel1', 'typazLevel2', 'typazLevel3', 'retakeWithPract', 'retakeWoPract', 'retakeImpMarks', 'lateRequest'],
                all: Object.keys(allButtons)
            };

            if (typeText.startsWith("Exam")) {
                TicketDetailManager.selectedGroup = 'exam';
            } else if (typeText.includes("New course activation")) {
                TicketDetailManager.selectedGroup = 'newCourse';
            } else if (typeText.includes("Re-take of exam")) {
                TicketDetailManager.selectedGroup = 'retake';
            } else {
                TicketDetailManager.selectedGroup = 'all';
            }

            const newButtons = buttonGroups[TicketDetailManager.selectedGroup].map(key => allButtons[key]);

            const searchAndIconsContainer = document.createElement('div');
            searchAndIconsContainer.className = 'search-and-icons-container';
            const selectSearchableDiv = document.querySelector('.select-searchable');
            if (selectSearchableDiv) {
                searchAndIconsContainer.appendChild(selectSearchableDiv);
            }

            const newButtonsContainer = document.createElement('div');
            newButtonsContainer.className = 'template-buttons-inner new-buttons';
            const iconsContainer = document.createElement('div');
            iconsContainer.className = 'template-buttons-inner icons';

            newButtons.forEach(buttonData => {
                const button = document.createElement('button');
                button.textContent = buttonData.text;
                button.type = "button";
                button.style.margin = '2px';
                button.style.backgroundColor = '#4CAF50';
                button.style.border = 'none';
                button.style.color = 'white';
                button.style.padding = '7px';
                button.style.textAlign = 'center';
                button.style.textDecoration = 'none';
                button.style.display = 'inline-block';
                button.style.fontSize = '15px';
                button.style.fontWeight = '600';
                button.style.borderRadius = '5px';
                button.style.cursor = 'pointer';

                if (buttonData.text === "Retake with Pract." || buttonData.text === "Retake w/o Pract." || buttonData.text === "Retake Imp. Marks" || buttonData.text === "Late Request") {
                    button.style.backgroundColor = '#2b579a';
                }
                if (buttonData.text === "Denied (Failed)" || buttonData.text === "Exam Too Early" || buttonData.text === "Denied (Mis. Exams)" || buttonData.text === "Late Request" || buttonData.text === "Exam Denied") {
                    button.style.backgroundColor = '#d24726';
                }

                const originalColor = button.style.backgroundColor;

                button.addEventListener('mouseover', () => {
                    if (button !== TicketDetailManager.selectedButton) {
                        button.style.backgroundColor = TicketDetailManager.getHoverColor(originalColor);
                    }
                });
                button.addEventListener('mouseout', () => {
                    if (button !== TicketDetailManager.selectedButton) {
                        button.style.backgroundColor = originalColor;
                    }
                });

                button.addEventListener('click', e => {
                    e.preventDefault();
                    if (TicketDetailManager.selectedButton) {
                        TicketDetailManager.selectedButton.style.backgroundColor = TicketDetailManager.selectedButton.originalColor;
                    }
                    TicketDetailManager.selectedButton = button;
                    button.originalColor = originalColor;
                    button.style.backgroundColor = TicketDetailManager.getHoverColor(originalColor);

                    if (TicketDetailManager.selectedIcon) {
                        TicketDetailManager.selectedIcon.style.border = "2px solid transparent";
                        TicketDetailManager.selectedIcon = null;
                    }

                    if (buttonData.id === 177 || buttonData.id === 17) {
                        TicketDetailManager.handleDateTemplate(buttonData.id);
                    } else {
                        DataService.fetchTemplate(buttonData.id);
                    }
                });
                newButtonsContainer.appendChild(button);
            });

            if (vNumber.includes("VT") || vNumber.includes("VB") || vNumber.includes("VN")) {
                this.createIcon("file-word", 3, vNumberPrefix, iconsContainer);
                this.createIcon("file-excel", 3, vNumberPrefix, iconsContainer);
                this.createIcon("file-powerpoint", 2, vNumberPrefix, iconsContainer);
                this.createIcon("database", 2, vNumberPrefix, iconsContainer);
            }

            if (!TicketDetailManager.hasIcons) {
                iconsContainer.style.display = 'none';
            }

            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'template-buttons-container';
            buttonsContainer.appendChild(newButtonsContainer);
            buttonsContainer.appendChild(iconsContainer);

            searchAndIconsContainer.appendChild(buttonsContainer);
            const formGroupDiv = document.querySelector('.form-group.col-sm-6');
            formGroupDiv.parentNode.insertBefore(searchAndIconsContainer, formGroupDiv.nextSibling);

        } catch (error) {
            console.error('Error adding template buttons:', error);
        }
    }

    static handleDateTemplate(templateId) {
        try {
            // Get student name - zaten capitalize edilmiş
            const studentName = TicketDetailManager.studentData.fullName; // ✅ Zaten capitalize edilmiş

            // Get course information from next course table
            const nextCourseRow = document.querySelector('#next-course-table tbody tr');
            let courseName = '';
            let courseDate = '';

            if (nextCourseRow) {
                const courseNameCell = nextCourseRow.querySelector('td:first-child');
                const courseDateCell = nextCourseRow.querySelector('td:nth-child(2)');

                courseName = courseNameCell ? courseNameCell.textContent.trim() : '';
                courseDate = courseDateCell ? courseDateCell.textContent.trim() : '';
            }

            // Fetch template and process it
            DataService.fetchTemplate(templateId, (templateContent) => {
                let processedTemplate = templateContent.replace(/\[student_name\]/g, studentName); // ✅ Zaten capitalize edilmiş

                if (templateId === 177) {
                    processedTemplate = processedTemplate.replace(/\[start_date\]/g, courseDate);
                    processedTemplate = processedTemplate.replace(/\[course_name\]/g, courseName);
                } else if (templateId === 17) {
                    const currentCourseRow = document.querySelector('#current-course-table tbody tr');
                    if (currentCourseRow) {
                        const finishDateCell = currentCourseRow.querySelector('td:nth-child(2)');
                        const finishDate = finishDateCell ? finishDateCell.textContent.trim() : '';
                        processedTemplate = processedTemplate.replace(/\[finish_date\]/g, finishDate);
                    }
                }

                this.loadTemplateIntoEditor(processedTemplate);
            });

        } catch (error) {
            console.error('Error handling date template:', error);
            // Fallback to regular template fetch
            DataService.fetchTemplate(templateId);
        }
    }

    static createIcon(iconName, count, prefix, container) {
        for (let i = 1; i <= count; i++) {
            const icon = document.createElement('i');
            icon.className = `fas fa-${iconName}`;
            icon.style.color = this.getIconColor(iconName);
            icon.style.margin = '1%';
            icon.style.fontSize = 'x-large';
            icon.style.cursor = 'pointer';
            icon.style.padding = '5px';
            icon.style.borderRadius = '5px';
            icon.style.border = '2px solid transparent';

            const superscript = document.createElement('span');
            superscript.textContent = i;
            superscript.className = 'superscript';
            icon.appendChild(superscript);

            icon.addEventListener('click', () => {
                if (TicketDetailManager.selectedIcon) {
                    TicketDetailManager.selectedIcon.style.border = "2px solid transparent";
                }
                if (TicketDetailManager.selectedButton) {
                    TicketDetailManager.selectedButton.style.backgroundColor = TicketDetailManager.selectedButton.originalColor;
                    TicketDetailManager.selectedButton = null;
                }

                TicketDetailManager.selectedIcon = icon;
                icon.style.border = "2px solid blue";

                let optionCode;
                if (iconName === "database") {
                    optionCode = `ACS19L${i}`;
                } else if (iconName === "file-word") {
                    optionCode = `WRD19E${i}`;
                } else if (iconName === "file-excel") {
                    optionCode = `EXC19E${i}`;
                } else if (iconName === "file-powerpoint") {
                    optionCode = `PPT19E${i}`;
                }

                let optionPrefix;
                if (StateManager.getVCodeText().includes("VT")) {
                    optionPrefix = "TO";
                } else if (StateManager.getVCodeText().includes("VB")) {
                    optionPrefix = "BR";
                } else if (StateManager.getVCodeText().includes("VN")) {
                    optionPrefix = "NY";
                }

                const selectElement = document.getElementById('gettemplates');
                const selectedOption = Array.from(selectElement.options).find(
                    option =>
                        option.textContent.trim().startsWith(optionPrefix) &&
                        option.textContent.trim().includes(optionCode)
                );

                if (selectedOption) {
                    DataService.fetchTemplate(selectedOption.value);
                } else {
                    console.error(`Option that starts with "${optionPrefix}" and contains "${optionCode}" not found!`);
                }
            });

            container.appendChild(icon);
            TicketDetailManager.hasIcons = true;
        }
    }

    static getIconColor(iconName) {
        switch (iconName) {
            case "file-word":
                return "#2b579a";
            case "file-excel":
                return "#217346";
            case "file-powerpoint":
                return "#d24726";
            case "database":
                return "#a61d24";
            default:
                return "black";
        }
    }

    static getHoverColor(color) {
        const rgb = color.match(/\d+/g).map(Number);
        return `rgb(${rgb.map(v => Math.min(255, v - 20)).join(',')})`;
    }

    static initializeFilePreview() {
        const previewBoxes = document.querySelectorAll('.img-pre');

        previewBoxes.forEach(box => {
            const image = box.querySelector('img');
            const downloadLink = box.querySelector('a');

            if (image && downloadLink) {
                box.childNodes.forEach(node => {
                    if (node.nodeType === 3) {
                        node.remove();
                    }
                });

                const fileUrl = downloadLink.href;
                const fileExtension = fileUrl.split('.').pop().toLowerCase();

                let iconClass = 'fas fa-file';
                let iconColor = '#666666';

                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
                    iconClass = 'fas fa-file-image';
                    iconColor = '#4CAF50';
                } else if (fileExtension === 'pdf') {
                    iconClass = 'fas fa-file-pdf';
                    iconColor = '#FF0000';
                } else if (['doc', 'docx'].includes(fileExtension)) {
                    iconClass = 'fas fa-file-word';
                    iconColor = '#2B579A';
                } else if (['xls', 'xlsx'].includes(fileExtension)) {
                    iconClass = 'fas fa-file-excel';
                    iconColor = '#217346';
                }

                image.style.display = 'none';
                const iconElement = document.createElement('i');
                iconElement.className = iconClass;
                iconElement.style.fontSize = 'xxx-large';
                iconElement.style.color = iconColor;

                while (box.firstChild) {
                    box.firstChild.remove();
                }
                box.appendChild(iconElement);
                box.appendChild(image);
                box.appendChild(downloadLink);

                const downloadIcon = downloadLink.querySelector('i');
                if (downloadIcon) downloadIcon.remove();

                box.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (['jpg', 'jpeg', 'png', 'gif', 'pdf'].includes(fileExtension)) {
                        const firstNameText = HelperFunctions.getElementByXPath('FIRST_NAME')
                            .textContent.trim() || '';
                        const lastNameText = HelperFunctions.getElementByXPath('LAST_NAME')
                            .textContent.trim() || '';
                        const fullNameText = `${firstNameText} ${lastNameText}`;
                        const vNoText = HelperFunctions.findVNumber() || '';

                        UIManager.showModal(
                            fileUrl.split('/').pop(),
                            `<div class="file-preview">
                                ${fileExtension === 'pdf' ?
                                `<iframe credentialless src="${fileUrl}#zoom=125" style="width:100%;height:80vh;border:none;"></iframe>` :
                                `<img src="${fileUrl}" style="max-width:100%;max-height:80vh;">`
                            }
                            </div>`,
                            fullNameText,
                            vNoText
                        );
                    } else {
                        const downloadLink = document.createElement('a');
                        downloadLink.href = fileUrl;
                        downloadLink.download = fileUrl.split('/').pop();
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                    }
                });
            }
        });
    }

    static modifySendReplyButton() {
        const observer = new MutationObserver((mutations, obs) => {
            const sendReplyBtn = document.getElementById('manage_ticket');
            if (sendReplyBtn) {
                sendReplyBtn.textContent = 'Send & Close';

                sendReplyBtn.addEventListener('click', async function () {
                    const commentArea = document.querySelector('.note-editable');
                    const isEmpty = commentArea && commentArea.innerHTML.trim() === '<p><br></p>';

                    if (isEmpty) {
                        ErrorHandler.showAlert('<b>Comment area is empty.</b>&nbsp;The ticket could not be processed.', 'error', 3000);
                        return;
                    }

                    setTimeout(async () => {
                        const urlParams = new URLSearchParams(window.location.search);
                        const ticketId = urlParams.get('id');

                        if (ticketId) {
                            try {
                                const statusResponse = await fetch('https://aoltorontoagents.ca/student_contract/chat/ajax.php?action=update_status', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded'
                                    },
                                    body: new URLSearchParams({
                                        ticket: ticketId,
                                        status: '2'
                                    })
                                });

                                if (statusResponse.ok && await statusResponse.text() === '1') {
                                    chrome.storage.local.get(['closeTabAfterSave'], function (result) {
                                        if (result.closeTabAfterSave) {
                                            chrome.runtime.sendMessage({
                                                action: 'closeCurrentTab',
                                                targetUrl: window.location.href
                                            });
                                        } else {
                                            window.location.href = 'https://aoltorontoagents.ca/student_contract/chat/mine_list.php';
                                        }
                                    });
                                }
                            } catch (error) {
                                console.error('Error closing ticket:', error);
                            }
                        }
                    }, 1000);
                });

                observer.observe(document, {
                    childList: true,
                    subtree: true
                });

                window._sendReplyObserver = observer;

                // Add cleanup
                window.addEventListener('beforeunload', () => {
                    if (window._sendReplyObserver) {
                        window._sendReplyObserver.disconnect();
                        window._sendReplyObserver = null;
                    }
                });
            }

            const sendAndCloseBtn = document.querySelector('#manage_ticket');
            if (sendAndCloseBtn) {
                const buttonContainer = document.createElement('div');

                const sendButton = document.createElement('button');
                sendButton.id = 'manage_ticket';
                sendButton.className = 'btn btn-sm btn-info';
                sendButton.textContent = 'Send';
                sendButton.style.marginRight = '5px';

                sendButton.addEventListener('click', async function (e) {
                    const commentArea = document.querySelector('.note-editable');
                    const isEmpty = commentArea && commentArea.innerHTML.trim() === '<p><br></p>';

                    if (isEmpty) {
                        ErrorHandler.showAlert('<b>Comment area is empty.</b>&nbsp;The ticket could not be processed.', 'error', 3000);

                        e.preventDefault();
                        return false;
                    }
                });

                sendAndCloseBtn.parentNode.insertBefore(buttonContainer, sendAndCloseBtn);
                buttonContainer.appendChild(sendButton);
                buttonContainer.appendChild(sendAndCloseBtn);

                obs.disconnect();
            }
        });

        observer.observe(document, {
            childList: true,
            subtree: true
        });
    }

    static async handleHDRequest(courseCode, courseName) {
        try {
            if (!document.getElementById('hdRequestModal')) {
                TicketDetailManager.createHDRequestModal();
            }

            const fullName = TicketDetailManager.studentData.fullName;
            const vNumber = TicketDetailManager.studentData.vNumber;
            const programName = TicketDetailManager.studentData.programName;

            const subject = `${fullName} - ${vNumber} - ${programName}`;
            const description = `Hello,\n\nCould you activate "${courseCode}" for the above student, shows an error when we try to activate it on our end.\n\nThanks.`;

            // Show modal with content
            const modal = document.getElementById('hdRequestModal');
            const modalSubject = document.getElementById('hdModalSubject');
            const modalDescription = document.getElementById('hdModalDescription');

            modalSubject.textContent = subject;
            modalDescription.value = description;
            modal.style.display = 'block';

            // Store course code for later use
            modal.dataset.courseCode = courseCode;
            modal.dataset.courseName = courseName;

        } catch (error) {
            ErrorHandler.showAlert('Error preparing help desk request: ' + error.message, 'error');
        }
    }

    static createHDRequestModal() {
        const modalHtml = `
            <div id="hdRequestModal" class="modal" style="display:none; position: fixed;top: 0;left: 0;padding: 5% 30%; width: 100%;height: 100%;background-color: rgba(0, 0, 0, 0.5);display: flex;justify-content: center;align-items: center;z-index: 10000;">
                <div class="hd-modal-content" style="background:#fff; margin:10% auto; padding:20px; border-radius:5px;">
                    <h2>Confirm Help Desk Request</h2>
                    <div class="modal-body" style="margin-top: 5%;">
                        <p><strong>Subject:</strong> <span id="hdModalSubject"></span></p>
                        <div style="display:block; margin-top:10px;">
                            <p><strong>Description:</strong></p>
                            <textarea 
                                id="hdModalDescription" 
                                style="width:100%; 
                                min-height:150px; 
                                box-sizing: border-box;
                                padding:10px; 
                                border:1px solid #ccc; 
                                border-radius:4px; 
                                font-family:inherit; 
                                font-size:inherit;
                                resize:vertical;"
                            ></textarea>
                        </div>
                    </div>
                    <div class="modal-footer" style="margin-top:20px; text-align:right;">
                        <button id="hdCancelRequest" class="btn btn-secondary" style="margin-right:10px;">Cancel</button>
                        <button id="hdConfirmRequest" class="btn btn-primary">Send Request</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);


        // Add event listeners
        const modal = document.getElementById('hdRequestModal');
        const cancelButton = document.getElementById('hdCancelRequest');
        const confirmButton = document.getElementById('hdConfirmRequest');

        // Cancel button handler
        cancelButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Confirm button handler
        confirmButton.addEventListener('click', async () => {
            const subject = document.getElementById('hdModalSubject').textContent;
            const description = document.getElementById('hdModalDescription').value;
            const courseCode = modal.dataset.courseCode;

            // ✅ Use HelperFunctions.setButtonLoadingState instead of manual manipulation
            HelperFunctions.setButtonLoadingState(confirmButton, true, 'fa-spinner fa-spin', 0, 'Sending...');

            try {
                const result = await DataService.submitHDRequest(subject, description);

                if (result.success) {
                    modal.style.display = 'none';
                    ErrorHandler.showAlert(`Help desk request sent successfully for course ${courseCode}!`, 'success');

                    // Update the button to show success - also use btn-light here
                    const hdButtons = document.querySelectorAll('.btn-light'); // ✅ btn-warning yerine btn-light ara
                    hdButtons.forEach(btn => {
                        if (btn.dataset.code === courseCode) {
                            btn.innerHTML = '<i class="fas fa-check"></i> HD Sent';
                            btn.classList.remove('btn-light'); // ✅ btn-warning yerine btn-light
                            btn.classList.add('btn-info');
                            btn.disabled = true;
                        }
                    });

                } else {
                    throw new Error(result.error || 'Failed to submit help desk request');
                }
            } catch (error) {
                ErrorHandler.showAlert('Error sending help desk request: ' + error.message, 'error');
            } finally {
                // ✅ Reset button state using HelperFunctions.setButtonLoadingState
                HelperFunctions.setButtonLoadingState(confirmButton, false, 'fa-paper-plane', 0, 'Send Request');
            }
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

window.TicketDetailManager = TicketDetailManager;