class DataService {
    static attemptedCplActivations = {};

    static findCoursesFromContract(studentData, contractCode = null, options = {}) {
        try {
            const {
                includeInactive = true,        // Status 0 kursları dahil et
                includeInProgress = true,      // Status 1 kursları dahil et  
                includeCompleted = true,       // Status 2,3,4 kursları dahil et
                includeFailed = true,          // Status 5 kursları dahil et
                contractStatus = "In Progress", // Hangi contract status'ları işle
                returnFirstMatch = false       // İlk eşleşen kursu döndür (tek kurs için)
            } = options;

            let programID = null;
            let contractID = null;
            let uniqueProgramID = null;
            let allCourses = [];
            let targetContract = null;

            // Contract code verilmişse programID ve contractID bul
            if (contractCode) {
                for (const program of studentData.studentProgram) {
                    for (const contract of program.studentContracts) {
                        if (contract.contractCode === contractCode) {
                            programID = program.userProgramID;
                            contractID = contract.contractID;
                            uniqueProgramID = program.uniqueProgramId;
                            targetContract = contract;
                            break;
                        }
                    }
                    if (contractID) break;
                }

                if (!programID || !contractID) {
                    return {
                        success: false,
                        error: 'Program or Contract not found',
                        courses: [],
                        programID: null,
                        contractID: null,
                        uniqueProgramID: null
                    };
                }
            }

            // Kursları topla
            studentData.studentProgram.forEach((program) => {
                if (program.studentContracts) {
                    program.studentContracts.forEach((contract) => {
                        // Contract code filtresi
                        if (contractCode && contract.contractCode !== contractCode) {
                            return;
                        }

                        // Contract status filtresi
                        if (contractStatus && contract.status !== contractStatus) {
                            return;
                        }

                        if (contract.courses) {
                            contract.courses.forEach((course) => {
                                const status = Number(course.studyStatusID);

                                // Status filtresi
                                let includeThisCourse = false;
                                if (status === 0 && includeInactive) includeThisCourse = true;
                                if (status === 1 && includeInProgress) includeThisCourse = true;
                                if ([2, 3, 4].includes(status) && includeCompleted) includeThisCourse = true;
                                if (status === 5 && includeFailed) includeThisCourse = true;

                                if (includeThisCourse) {
                                    allCourses.push({
                                        ...course,
                                        contractID: contract.contractID,
                                        contractCode: contract.contractCode,
                                        contractStatus: contract.status,
                                        programID: program.userProgramID,
                                        uniqueProgramID: program.uniqueProgramId,
                                        statusName: this.getStatusName(status)
                                    });

                                    // İlk eşleşeni döndür seçeneği
                                    if (returnFirstMatch) {
                                        return;
                                    }
                                }
                            });
                        }
                    });
                }
            });

            return {
                success: true,
                courses: allCourses,
                programID: programID,
                contractID: contractID,
                uniqueProgramID: uniqueProgramID,
                targetContract: targetContract
            };

        } catch (error) {
            console.error('Error in findCoursesFromContract:', error);
            return {
                success: false,
                error: error.message,
                courses: [],
                programID: null,
                contractID: null,
                uniqueProgramID: null
            };
        }
    }

    static getStatusName(statusID) {
        const statusMap = {
            // Course statuses
            0: 'Not Started',
            1: 'In Progress',
            2: 'Complete',
            3: 'Pass',
            4: 'Honours',
            5: 'Fail',
            9: 'Medical Exemption',
            10: 'Complete',
            100: 'Abandoned',
            101: 'Dropped Out',
            102: 'Dismissed',
            103: 'On Hold',
            104: 'Cancelled',
            105: 'Finished',
            106: 'Withdrawn',
            107: 'Void',
            108: 'Transferred',
            109: 'Incomplete',
            999: 'Deleted'
        };
        return statusMap[statusID] || 'Unknown';
    }

    static courseSyncHandler(request, sendResponse) {
        try {
            console.log('Received sync request:', {
                courseCode: request.courseCode,
                contractCode: request.contractCode,
                uniqueID: request.uniqueID
            });

            const originalData = request.data;
            const { courseCode, contractCode, uniqueID } = request;
            const studentData = originalData.data;

            // ✅ Yeni utility kullanımı
            const contractResult = DataService.findCoursesFromContract(studentData, contractCode);

            if (!contractResult.success) {
                throw new Error(contractResult.error);
            }

            // Kursu verify et
            const courseExists = contractResult.courses.some(course => course.uniqueID === uniqueID);

            if (!courseExists) {
                throw new Error('Course not found for sync');
            }

            console.log('Sync data prepared successfully:', {
                userID: studentData.userID,
                contractID: contractResult.contractID,
                programID: contractResult.programID,
                uniqueProgramID: contractResult.uniqueProgramID,
                uniqueID,
                contractCode,
                courseCode
            });

            sendResponse({
                success: true,
                data: studentData,
                userID: studentData.userID,
                contractID: contractResult.contractID,
                programID: contractResult.programID,
                uniqueProgramID: contractResult.uniqueProgramID,
                uniqueID,
                contractCode,
                courseCode
            });

        } catch (error) {
            console.error('Error in courseSyncHandler:', error);
            sendResponse({
                success: false,
                message: 'Error preparing sync data: ' + error.message
            });
        }
    }

    static async courseActivationHandler(request, sendResponse) {
        try {
            console.log('Received request:', {
                courseCodes: request.courseCodes,
                isCPL: request.isCPL,
                vNumber: request.contractCode,
                useNextMonday: request.useNextMonday
            });

            const originalData = request.data;
            const courseCodes = Array.isArray(request.courseCodes) ? request.courseCodes : [];
            const useNextMonday = request.useNextMonday !== undefined ? request.useNextMonday : true;

            console.log('Original data:', originalData);

            if (originalData.studentProgram) {
                let updateCount = 0;
                let activatedCourses = [];

                // Helper function to update a course's start date
                function updateCourseStartDate(course, activate = false) {
                    // ✅ UPDATED: Determine date based on useNextMonday flag
                    let formattedDate;
                    if (useNextMonday) {
                        formattedDate = HelperFunctions.getCurrentMonday().formattedDate;
                        console.log(`Using Monday for activation date: ${formattedDate}`);
                    } else {
                        const today = new Date();
                        formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
                        console.log(`Using today for activation date: ${formattedDate}`);
                    }

                    // Activate course if requested
                    if (activate && Number(course.studyStatusID) === 0) {
                        // For CPL students, store course codes in a buffer
                        if (request.isCPL === true) {
                            const vNumber = request.contractCode;

                            console.log(`Processing CPL course ${course.code} for student ${vNumber}`);

                            if (vNumber && vNumber.trim() !== '') {
                                if (!DataService.attemptedCplActivations[vNumber]) {
                                    DataService.attemptedCplActivations[vNumber] = [];
                                }

                                if (!DataService.attemptedCplActivations[vNumber].includes(course.code)) {
                                    DataService.attemptedCplActivations[vNumber].push(course.code);
                                    console.log(`CPL activation recorded: ${course.code} for student ${vNumber}`);
                                }
                            } else {
                                console.warn(`CPL activation - V-number not found in request.contractCode for course: ${course.code}`);
                            }
                        }

                        course.studyStatusID = 1;
                        course.status = "In Progress";
                        console.log(`Status updated to In Progress - Course: ${course.code}`);
                    }

                    // Update dates and mark as modified
                    course.datestart = formattedDate;
                    course.dateStarted = formattedDate;
                    course.courseStatus = "UpdateCourse";
                    course.isDirty = true;
                    updateCount++;
                    activatedCourses.push(course.code);
                    return true;
                }

                // For CPL students, we need to handle activation differently
                if (request.isCPL === true) {
                    console.log('Processing CPL student');

                    // 1. SETUP - Get course codes and program data
                    const courseCodes = request.courseCodes.filter(c => c);
                    const firstCourseCode = courseCodes[0];
                    const secondCourseCode = courseCodes[1];
                    const additionalCourseCode = courseCodes[2];

                    // Get course data from the request
                    let localProgramCourses = [];
                    if (request.programData && request.programData.courses) {
                        localProgramCourses = request.programData.courses.slice();
                        console.log(`Using program courses from request: ${localProgramCourses.length} courses found`);
                    } else {
                        console.log('Warning: No program courses found in request data');
                    }

                    // Helper function to determine max allowed courses
                    function getMaxAllowedCourses(typExists) {
                        return typExists ? 2 : 1;
                    }

                    // Extract contracts calculation to avoid repetition
                    const contracts = originalData.studentProgram.flatMap(p => p.studentContracts || []);
                    console.log(`Extracted ${contracts.length} contracts for TYP course validation`);

                    // Helper function to check if a TYP course can be activated
                    function canActivateTypCourse(courseCode, contracts) {
                        if (!courseCode.startsWith('TYP')) return true;

                        const typMatch = courseCode.match(/TYP-?([A-Z])(\d+)/i);
                        if (!typMatch) return true;

                        const typPrefix = typMatch[1].toUpperCase();
                        const typNumber = parseInt(typMatch[2]);

                        if (typNumber <= 1) return true;

                        let allPreviousActive = true;

                        contracts.forEach(contract => {
                            if (contract.status === "In Progress") {
                                contract.courses?.forEach(course => {
                                    if (course.code?.startsWith('TYP')) {
                                        const prevMatch = course.code.match(/TYP-?([A-Z])(\d+)/i);
                                        if (prevMatch) {
                                            const prevPrefix = prevMatch[1].toUpperCase();
                                            const prevNumber = parseInt(prevMatch[2]);

                                            if (prevPrefix === typPrefix && prevNumber < typNumber) {
                                                if (Number(course.studyStatusID) === 0) {
                                                    console.log(`Cannot activate ${courseCode}: Previous TYP course ${course.code} is inactive (status 0)`);
                                                    allPreviousActive = false;
                                                }
                                            }
                                        }
                                    }
                                });
                            }
                        });

                        return allPreviousActive;
                    }

                    // Track activations and active course counts
                    let inProgressCoursesCount = 0;
                    let activeTYPCourseExists = false;
                    let hasInactiveTYPCourse = false;
                    let additionalCourseActivated = false;

                    // 1.5. SCAN FOR INACTIVE TYP COURSES
                    originalData.studentProgram.forEach(program => {
                        program.studentContracts?.forEach(contract => {
                            if (contract.status === "In Progress") {
                                contract.courses?.forEach(course => {
                                    if (course.code?.startsWith('TYP') && Number(course.studyStatusID) === 0) {
                                        hasInactiveTYPCourse = true;
                                        console.log(`Found inactive TYP course: ${course.code}`);
                                    }
                                });
                            }
                        });
                    });

                    if (hasInactiveTYPCourse) {
                        console.log("Warning: Inactive TYP course found - will not activate additional TYP courses");
                    }

                    // 2. COUNT ACTIVE COURSES (excluding additional)
                    originalData.studentProgram.forEach(program => {
                        program.studentContracts?.forEach(contract => {
                            if (contract.status === "In Progress") {
                                contract.courses?.forEach(course => {
                                    if (Number(course.studyStatusID) === 1) {
                                        if (course.code === additionalCourseCode) {
                                            console.log(`Found active additional course: ${course.code} (not counting toward total)`);
                                            return;
                                        }

                                        inProgressCoursesCount++;
                                        console.log(`Found active course: ${course.code}, count: ${inProgressCoursesCount}`);

                                        if (course.code.startsWith('TYP')) {
                                            activeTYPCourseExists = true;
                                            console.log(`Active TYP course found: ${course.code}`);
                                        }
                                    }
                                });
                            }
                        });
                    });

                    console.log(`Initial course count: ${inProgressCoursesCount}, TYP active: ${activeTYPCourseExists}`);

                    // 3. PROCESS ADDITIONAL COURSE
                    if (additionalCourseCode) {
                        let additionalCourseHandled = false;
                        console.log(`Checking additional course: ${additionalCourseCode}`);

                        originalData.studentProgram.forEach(program => {
                            if (additionalCourseHandled) return;

                            program.studentContracts?.forEach(contract => {
                                if (additionalCourseHandled || contract.status !== "In Progress") return;

                                contract.courses?.forEach(course => {
                                    if (additionalCourseHandled) return;

                                    if (course.code === additionalCourseCode) {
                                        const currentStatus = Number(course.studyStatusID);
                                        console.log(`Found additional course ${course.code}, status: ${currentStatus}`);

                                        // According to rules: Only activate if status is 0, otherwise do nothing
                                        if (currentStatus === 0) {
                                            updateCourseStartDate(course, true);
                                            additionalCourseHandled = true;
                                            additionalCourseActivated = true;
                                            console.log(`Activated additional course: ${course.code}`);
                                        } else {
                                            console.log(`Additional course status is ${currentStatus}, no action needed`);
                                            additionalCourseHandled = true;
                                        }
                                    }
                                });
                            });
                        });
                    }

                    // 4. PROCESS FIRST COURSE
                    let firstCourseActivated = false;
                    let firstCourseStatus = -1;

                    if (firstCourseCode) {
                        let firstCourseHandled = false;

                        originalData.studentProgram.forEach(program => {
                            if (firstCourseHandled) return;

                            program.studentContracts?.forEach(contract => {
                                if (firstCourseHandled || contract.status !== "In Progress") return;

                                contract.courses?.forEach(course => {
                                    if (firstCourseHandled) return;

                                    if (course.code === firstCourseCode) {
                                        firstCourseStatus = Number(course.studyStatusID);
                                        console.log(`Found first course ${course.code}, status: ${firstCourseStatus}`);

                                        // If status is 0, activate it
                                        if (firstCourseStatus === 0) {
                                            // Check if we have reached the maximum allowed active courses
                                            const maxAllowed = getMaxAllowedCourses(activeTYPCourseExists);

                                            // Check for TYP course with the sequence rule
                                            if (course.code.startsWith('TYP')) {
                                                // If there's an inactive TYP course and this is NOT it, skip activation
                                                if (hasInactiveTYPCourse && course.code !== firstCourseCode) {
                                                    console.log(`Skipping TYP course activation: ${course.code} - Another inactive TYP course exists`);
                                                    firstCourseHandled = true;
                                                    return;
                                                }

                                                // Check sequence (using pre-extracted contracts)
                                                if (!canActivateTypCourse(course.code, contracts)) {
                                                    console.log(`Cannot activate first course ${course.code} - Previous TYP courses in sequence must be completed first`);
                                                    firstCourseHandled = true;
                                                    return;
                                                }
                                            }

                                            if (inProgressCoursesCount < maxAllowed || course.code.startsWith('TYP')) {
                                                updateCourseStartDate(course, true);
                                                firstCourseActivated = true;
                                                firstCourseHandled = true;

                                                if (course.code.startsWith('TYP')) {
                                                    activeTYPCourseExists = true;
                                                    console.log(`Activated TYP first course: ${course.code}`);
                                                } else {
                                                    inProgressCoursesCount++;
                                                    console.log(`Activated first course: ${course.code}, new count: ${inProgressCoursesCount}`);
                                                }
                                            } else {
                                                console.log(`Max active courses reached (${inProgressCoursesCount}), cannot activate first course`);
                                                firstCourseHandled = true;
                                            }
                                        } else if (firstCourseStatus === 1) {
                                            // Just update date for active course
                                            updateCourseStartDate(course, false);
                                            firstCourseHandled = true;
                                            console.log(`Updated date for active first course: ${course.code}`);
                                        } else {
                                            // Non 0/1 status, just mark as handled
                                            firstCourseHandled = true;
                                            console.log(`First course has status ${firstCourseStatus}, skipping`);
                                        }
                                    }
                                });
                            });
                        });
                    }

                    // 5. PROCESS SECOND COURSE
                    let secondCourseActivated = false;

                    if (secondCourseCode) {
                        let secondCourseHandled = false;

                        // Only check second course if first course was status 1 or non-0/1
                        if (firstCourseStatus !== 0 || firstCourseActivated) {
                            originalData.studentProgram.forEach(program => {
                                if (secondCourseHandled) return;

                                program.studentContracts?.forEach(contract => {
                                    if (secondCourseHandled || contract.status !== "In Progress") return;

                                    contract.courses?.forEach(course => {
                                        if (secondCourseHandled) return;

                                        if (course.code === secondCourseCode) {
                                            const secondStatus = Number(course.studyStatusID);
                                            console.log(`Found second course ${course.code}, status: ${secondStatus}`);

                                            if (secondStatus === 0) {
                                                // Check maximum active courses
                                                const maxAllowed = getMaxAllowedCourses(activeTYPCourseExists);

                                                // Check for TYP course with the sequence rule
                                                if (course.code.startsWith('TYP')) {
                                                    // If there's an inactive TYP course and this is NOT it, skip activation
                                                    if (hasInactiveTYPCourse && course.code !== secondCourseCode) {
                                                        console.log(`Skipping TYP course activation: ${course.code} - Another inactive TYP course exists`);
                                                        secondCourseHandled = true;
                                                        return;
                                                    }

                                                    // Check sequence (using pre-extracted contracts)
                                                    if (!canActivateTypCourse(course.code, contracts)) {
                                                        console.log(`Cannot activate second course ${course.code} - Previous TYP courses in sequence must be completed first`);
                                                        secondCourseHandled = true;
                                                        return;
                                                    }
                                                }

                                                if (inProgressCoursesCount < maxAllowed || course.code.startsWith('TYP')) {
                                                    updateCourseStartDate(course, true);
                                                    secondCourseActivated = true;
                                                    secondCourseHandled = true;

                                                    if (course.code.startsWith('TYP')) {
                                                        activeTYPCourseExists = true;
                                                        console.log(`Activated TYP second course: ${course.code}`);
                                                    } else {
                                                        inProgressCoursesCount++;
                                                        console.log(`Activated second course: ${course.code}, new count: ${inProgressCoursesCount}`);
                                                    }
                                                } else {
                                                    console.log(`Max active courses reached (${inProgressCoursesCount}), cannot activate second course`);
                                                    secondCourseHandled = true;
                                                }
                                            } else if (secondStatus === 1) {
                                                // Just update date for active course
                                                updateCourseStartDate(course, false);
                                                secondCourseHandled = true;
                                                console.log(`Updated date for active second course: ${course.code}`);
                                            } else {
                                                // Non 0/1 status, just mark as handled
                                                secondCourseHandled = true;
                                                console.log(`Second course has status ${secondStatus}, skipping`);
                                            }
                                        }
                                    });
                                });
                            });
                        }
                    }

                    // 6. CHECK IF WE NEED MORE ACTIVATIONS FOR NEXT COURSES
                    if (localProgramCourses.length > 0) {
                        console.log(`After first/second processing: ${inProgressCoursesCount} active courses, TYP active: ${activeTYPCourseExists}`);

                        // NEW: Check if we activated both first and second courses in this session
                        const bothCoursesActivatedNow = firstCourseActivated && secondCourseActivated;

                        // NEW: Count total active courses including additional
                        let totalActiveCourses = 0;
                        originalData.studentProgram.forEach(program => {
                            program.studentContracts?.forEach(contract => {
                                if (contract.status === "In Progress") {
                                    contract.courses?.forEach(course => {
                                        if (Number(course.studyStatusID) === 1) {
                                            totalActiveCourses++;
                                        }
                                    });
                                }
                            });
                        });

                        console.log(`Total active courses (including additional): ${totalActiveCourses}`);
                        console.log(`Both first and second activated in this session: ${bothCoursesActivatedNow}`);

                        const maxAllowed = getMaxAllowedCourses(activeTYPCourseExists);

                        if (inProgressCoursesCount < maxAllowed &&
                            totalActiveCourses < 3 &&
                            !bothCoursesActivatedNow) {
                            console.log(`Looking for next course to activate (max allowed: ${maxAllowed})`);
                            let nextCourseActivated = false;
                            let anyInactiveCourseFound = false;
                            let firstNonActiveStatus = null; // Track the first course with status != 1
                            let updatedActiveCourses = [];   // Track which active courses we've updated

                            // Go through program courses in sequence
                            for (const programCourse of localProgramCourses) {
                                if (nextCourseActivated) continue;

                                const courseCode = programCourse.code;
                                if (!courseCode) continue;

                                // Skip first, second, and additional courses
                                if (courseCode === firstCourseCode || courseCode === secondCourseCode || courseCode === additionalCourseCode) {
                                    continue;
                                }

                                // NEW: Skip SFS courses for CPL students
                                if (courseCode.startsWith('SFS')) {
                                    console.log(`Skipping SFS course for CPL student: ${courseCode}`);
                                    continue;
                                }

                                // Check if course is in student data
                                originalData.studentProgram.forEach(program => {
                                    if (nextCourseActivated) return;

                                    program.studentContracts?.forEach(contract => {
                                        if (nextCourseActivated || contract.status !== "In Progress") return;

                                        contract.courses?.forEach(course => {
                                            if (nextCourseActivated) return;

                                            if (course.code === courseCode) {
                                                const currentStatus = Number(course.studyStatusID);
                                                console.log(`Found next course ${course.code}, status: ${currentStatus}`);

                                                // Track if we found a non-active course 
                                                if (currentStatus !== 1) {
                                                    anyInactiveCourseFound = true;

                                                    // Save reference to first non-active course found
                                                    if (firstNonActiveStatus === null) {
                                                        firstNonActiveStatus = { course: course, status: currentStatus };
                                                    }
                                                }

                                                if (currentStatus === 1) {
                                                    // Update the date for In Progress courses as well
                                                    updateCourseStartDate(course, false);
                                                    updatedActiveCourses.push(course.code);
                                                    console.log(`Updated date for active course: ${course.code}`);
                                                }

                                                // Preferred case: If status is 0, activate immediately
                                                if (currentStatus === 0) {
                                                    // Check for TYP course with the sequence rule
                                                    if (course.code.startsWith('TYP')) {
                                                        // If there's an inactive TYP course and this is NOT it, skip activation
                                                        if (hasInactiveTYPCourse) {
                                                            console.log(`Cannot activate TYP course: ${course.code} - Another TYP course is not started yet`);
                                                            return;
                                                        }

                                                        // Check sequence (using pre-extracted contracts)
                                                        if (!canActivateTypCourse(course.code, contracts)) {
                                                            console.log(`Cannot activate next course ${course.code} - Previous TYP courses in sequence must be completed first`);
                                                            return;
                                                        }
                                                    }

                                                    updateCourseStartDate(course, true);
                                                    nextCourseActivated = true;
                                                    console.log(`Activated status 0 course: ${course.code}`);

                                                    if (course.code.startsWith('TYP')) {
                                                        activeTYPCourseExists = true;
                                                    } else {
                                                        inProgressCoursesCount++;
                                                    }
                                                }
                                                // Otherwise log but continue searching
                                                else if (currentStatus !== 1) {
                                                    console.log(`Found course with status ${currentStatus}: ${course.code}`);
                                                }
                                            }
                                        });
                                    });
                                });
                            }

                            // If we didn't activate anything but found courses with status != 1,
                            // activate the first such course (but check if it's not SFS)
                            if (!nextCourseActivated && firstNonActiveStatus) {
                                // NEW: Check if the first non-active course is SFS, if so, skip it
                                if (firstNonActiveStatus.course.code.startsWith('SFS')) {
                                    console.log(`First non-active course is SFS (${firstNonActiveStatus.course.code}), looking for next non-SFS course...`);

                                    // Look for next non-SFS course to activate
                                    let nextNonSfsCourse = null;
                                    for (const programCourse of localProgramCourses) {
                                        const courseCode = programCourse.code;
                                        if (!courseCode || courseCode.startsWith('SFS')) continue;

                                        // Skip first, second, and additional courses
                                        if (courseCode === firstCourseCode || courseCode === secondCourseCode || courseCode === additionalCourseCode) {
                                            continue;
                                        }

                                        // Find this course in student data
                                        originalData.studentProgram.forEach(program => {
                                            if (nextNonSfsCourse) return;

                                            program.studentContracts?.forEach(contract => {
                                                if (nextNonSfsCourse || contract.status !== "In Progress") return;

                                                contract.courses?.forEach(course => {
                                                    if (nextNonSfsCourse) return;

                                                    if (course.code === courseCode && Number(course.studyStatusID) !== 1) {
                                                        nextNonSfsCourse = course;
                                                    }
                                                });
                                            });
                                        });

                                        if (nextNonSfsCourse) break;
                                    }

                                    if (nextNonSfsCourse) {
                                        firstNonActiveStatus = { course: nextNonSfsCourse, status: Number(nextNonSfsCourse.studyStatusID) };
                                        console.log(`Found next non-SFS course to activate: ${firstNonActiveStatus.course.code}`);
                                    } else {
                                        console.log(`No non-SFS courses found to activate`);
                                        firstNonActiveStatus = null;
                                    }
                                }

                                if (firstNonActiveStatus) {
                                    // Check for TYP course with the sequence rule
                                    if (firstNonActiveStatus.course.code.startsWith('TYP')) {
                                        // If there's an inactive TYP course and this is NOT it, skip activation
                                        if (hasInactiveTYPCourse) {
                                            console.log(`Cannot activate TYP course: ${firstNonActiveStatus.course.code} - Another TYP course is not started yet`);
                                        } else {
                                            // Check sequence (using pre-extracted contracts)
                                            if (!canActivateTypCourse(firstNonActiveStatus.course.code, contracts)) {
                                                console.log(`Cannot activate non-active course ${firstNonActiveStatus.course.code} - Previous TYP courses in sequence must be completed first`);
                                            } else {
                                                console.log(`No status 0 course found, activating first non-active course: ${firstNonActiveStatus.course.code} (status ${firstNonActiveStatus.status})`);
                                                updateCourseStartDate(firstNonActiveStatus.course, true);

                                                if (firstNonActiveStatus.course.code.startsWith('TYP')) {
                                                    activeTYPCourseExists = true;
                                                } else {
                                                    inProgressCoursesCount++;
                                                }
                                                nextCourseActivated = true;
                                            }
                                        }
                                    } else {
                                        console.log(`No status 0 course found, activating first non-active course: ${firstNonActiveStatus.course.code} (status ${firstNonActiveStatus.status})`);
                                        updateCourseStartDate(firstNonActiveStatus.course, true);
                                        inProgressCoursesCount++;
                                        nextCourseActivated = true;
                                    }
                                }
                            }
                            // Only report no courses found if truly nothing was found
                            else if (!anyInactiveCourseFound && !nextCourseActivated) {
                                console.log("No inactive courses found for CPL student");

                                // NEW CODE: Update all active courses even if no inactive courses were found
                                console.log("Updating dates for all In Progress courses...");

                                originalData.studentProgram.forEach(program => {
                                    program.studentContracts?.forEach(contract => {
                                        if (contract.status !== "In Progress") return;

                                        contract.courses?.forEach(course => {
                                            if (Number(course.studyStatusID) === 1 && !updatedActiveCourses.includes(course.code)) {
                                                updateCourseStartDate(course, false);
                                                console.log(`Updated date for active course: ${course.code}`);
                                            }
                                        });
                                    });
                                });
                            }
                        } else {
                            if (bothCoursesActivatedNow) {
                                console.log(`Skipping next course search - both first and second courses were activated in this session`);
                            } else {
                                console.log(`Cannot activate more courses - Logic: ${inProgressCoursesCount}/${maxAllowed}, Total: ${totalActiveCourses}/3`);
                            }

                            // Update dates for all active courses
                            console.log("Updating dates for all In Progress courses...");
                            originalData.studentProgram.forEach(program => {
                                program.studentContracts?.forEach(contract => {
                                    if (contract.status !== "In Progress") return;

                                    contract.courses?.forEach(course => {
                                        if (Number(course.studyStatusID) === 1) {
                                            updateCourseStartDate(course, false);
                                            console.log(`Updated date for active course: ${course.code}`);
                                        }
                                    });
                                });
                            });
                        }
                    }

                    // 7. SPECIAL TYP RULE - ENSURE AT LEAST ONE NON-TYP COURSE IS ACTIVE
                    if (activeTYPCourseExists && inProgressCoursesCount < 1) {
                        console.log(`TYP course is active, but no other regular course is active. Finding one to activate...`);

                        let nonTypActivated = false;

                        for (const programCourse of localProgramCourses) {
                            if (nonTypActivated) continue;

                            const courseCode = programCourse.code;
                            if (!courseCode) continue;

                            // Skip TYP and additional courses
                            if (courseCode.startsWith('TYP') || courseCode === additionalCourseCode) {
                                continue;
                            }

                            // Check if this course is in student data and can be activated
                            originalData.studentProgram.forEach(program => {
                                if (nonTypActivated) return;

                                program.studentContracts?.forEach(contract => {
                                    if (nonTypActivated || contract.status !== "In Progress") return;

                                    contract.courses?.forEach(course => {
                                        if (nonTypActivated) return;

                                        if (course.code === courseCode && Number(course.studyStatusID) === 0) {
                                            console.log(`Found non-TYP course to activate with TYP rule: ${course.code}`);
                                            updateCourseStartDate(course, true);
                                            nonTypActivated = true;
                                            console.log(`Activated non-TYP course per TYP rule: ${course.code}`);
                                            inProgressCoursesCount++;
                                        }
                                    });
                                });
                            });
                        }
                    }

                    console.log(`Final count: ${inProgressCoursesCount} active courses, TYP active: ${activeTYPCourseExists}`);
                } else {
                    // Regular non-CPL student activation logic
                    originalData.studentProgram.forEach(program => {
                        program.studentContracts?.forEach(contract => {
                            if (contract.contractCode === request.contractCode) {
                                console.log(`Processing contract: ${contract.contractCode}`);

                                contract.courses?.forEach(course => {
                                    if (courseCodes.includes(course.code)) {
                                        const currentStatus = Number(course.studyStatusID);

                                        console.log(`Found course ${course.code} in contract ${contract.contractCode}`);
                                        console.log(`Current status: ${course.studyStatusID}`);
                                        console.log(`Course found - Previous status: ${currentStatus}`);

                                        updateCourseStartDate(course, currentStatus === 0);
                                        console.log(`Course marked for update - Course: ${course.code}`);
                                    }
                                });
                            }
                        });
                    });
                }

                console.log('Updated data:', originalData);
                console.log('Activated courses:', activatedCourses);

                const encodedData = encodeURIComponent(JSON.stringify(originalData));
                console.log('Encoded successfully');
                sendResponse({
                    encodedData: encodedData,
                    updateCount: updateCount,
                    activatedCourses: activatedCourses
                });
            } else {
                sendResponse({
                    encodedData: null,
                    updateCount: 0,
                    message: "Course not found or already activated"
                });
            }

        } catch (error) {
            console.log(error, 'courseActivationHandler');
            sendResponse({ success: false, message: `Error parsing user details: ${error.message}` });
        }
        return true;
    }

    static async getAdminIdFromSource() {
        try {
            const result = await chrome.runtime.sendMessage({
                action: 'getAdminId'
            });

            if (result && result.success) {
                return result.adminId;
            }

            const response = await fetch('https://aoltorontoagents.ca/student_contract/chat/pending_list.php');
            const html = await response.text();
            let adminId = null;
            const lines = html.split('\n');
            for (const line of lines) {
                if (line.includes('var admin_id =')) {
                    const parts = line.split('=');
                    if (parts.length > 1) {
                        adminId = parts[1].trim().replace(/"/g, '');
                        break;
                    }
                }
            }
            return adminId;
        } catch (error) {
            console.log(error, 'getAdminIdFromSource');
            return null;
        }
    }

    static async apiStudentSearch(searchParams) {
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'apiStudentSearch',
                    data: searchParams
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            return response || {
                success: false,
                error: 'API student search failed',
                data: []
            };

        } catch (error) {
            console.error('Error in apiStudentSearch:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    static async sendAutoDuplicateMessage(ticketId, vNumber, originalTicket, row, button) {
        try {
            const adminId = await DataService.getAdminIdFromSource();
            if (adminId) {
                const numericTicketId = ticketId.replace(/\D/g, '');
                const formData = new FormData();
                formData.append('id', ''); formData.append('ticket_id', numericTicketId); formData.append('reciver_id', adminId);
                formData.append('customer_id', vNumber);
                formData.append('comment', `<p>Hello,</p><p>Please follow ticket # <b>${originalTicket}</b> for our reply.</p><p>We will now close this duplicate ticket.</p><p>Best,</p>`);
                const emptyFile = new File([], '', { type: 'application/octet-stream' });
                formData.append('files', emptyFile); formData.append('files_data[]', emptyFile);
                await fetch('https://aoltorontoagents.ca/student_contract/chat/ajax.php?action=save_comment', { method: 'POST', body: formData });
                const statusResponse = await fetch('https://aoltorontoagents.ca/student_contract/chat/ajax.php?action=update_status', {
                    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ ticket: numericTicketId, status: '2' })
                });
                const statusData = await statusResponse.text();
                if (statusData.trim() === '1') row.fadeOut(50, function () { StateManager.getDataTable().row(row).remove().draw(); });
                else button.text('Error!').css('background-color', 'red');
            } else button.text('Error!').css('background-color', 'red');
        } catch (error) { console.error('Error sending auto message:', error); button.text('Error!').css('background-color', 'red'); }
    }

    static async assignTicket(selectElement, button) {
        const ticketId = selectElement.getAttribute('ticket-id');
        const studentId = selectElement.getAttribute('student-id');
        try {
            const adminId = await DataService.getAdminIdFromSource();
            if (adminId === null) {
                chrome.runtime.sendMessage({ action: 'login' }, () => setTimeout(() => TicketManager.assignTicket(selectElement, button), 2000));
            } else {
                const response = await fetch('https://aoltorontoagents.ca/student_contract/chat/ajax.php?action=assin_tutors', {
                    method: 'POST', mode: 'cors', credentials: 'include',
                    headers: { 'accept': '*/*', 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                    body: `ticket=${ticketId}&tutors_id=${adminId}&admin_id=${adminId}&student_id=${studentId}`
                });
                const data = await response.text();
                if (data.trim() === '1') { button.textContent = "Assigned"; button.disabled = true; }
                else throw new Error('Unexpected response from assignTicket');
            }
        } catch (error) { console.error('Ticket assignment error:', error); button.textContent = "Error!"; }
    }

    static async sendMail(data) {
        const { email, title, cc, bcc, body } = data;

        const formdata = new FormData();

        formdata.append("title", title);
        formdata.append("campus", "Toronto");
        formdata.append("sendercc", email);
        formdata.append("ancment", body);
        formdata.append("sbmitAncmnt", "");

        cc && formdata.append("add_cc", cc);
        bcc && formdata.append("add_bcc", bcc);

        console.log(formdata);

        // formdata.append("start_date", "2024-07-22");
        // formdata.append("program", "Business Administration Coop Year 1");
        // formdata.append("files", fileInput.files[0], "/path/to/file");
        // formdata.append("filenaeme", fileInput.files[0], "/path/to/file");
        // formdata.append("templte_id", "");

        const requestOptions = {
            method: "POST",
            body: formdata,
        };

        fetch("https://aoltorontoagents.ca/student_contract/clgStActive/studentProfile.php?spSno=0", requestOptions)
            .then((response) => response.text())
            .then((result) => console.log(result))
            .catch((error) => console.error(error));

    }

    static async fetchTemplate(selectedOptionValue, callback = null) {
        const currentUrl = window.location.href;
        const userAgent = navigator.userAgent;

        fetch("https://aoltorontoagents.ca/student_contract/chat/response11.php?tag=addtempts", {
            method: "POST",
            headers: {
                "accept": "*/*",
                "accept-language": navigator.languages.join(','),
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "sec-ch-ua": `"${userAgent.replace(/,/g, '').replace(/;/g, '')}"`,
                "sec-ch-ua-mobile": navigator.userAgentData.mobile ? "?1" : "?0",
                "sec-ch-ua-platform": `"${navigator.platform}"`,
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest"
            },
            body: `templte_id=${selectedOptionValue}`,
            referrer: currentUrl,
            referrerPolicy: "strict-origin-when-cross-origin",
            mode: "cors",
            credentials: "include"
        })
            .then(response => response.json())
            .then(data => {
                if (data.data && data.data[0] && data.data[0].templates) {
                    const templatesHtml = data.data[0].templates;

                    // If callback is provided, call it with the template content
                    if (callback && typeof callback === 'function') {
                        callback(templatesHtml);
                    } else {
                        // Default behavior - load into editor
                        const noteEditableDiv = document.querySelector('.note-editable');
                        if (noteEditableDiv) {
                            noteEditableDiv.innerHTML = templatesHtml;
                            console.log('Template loaded into editor');

                            const changeEvent = new Event('change', { bubbles: true });
                            const inputEvent = new Event('input', { bubbles: true });
                            noteEditableDiv.dispatchEvent(changeEvent);
                            noteEditableDiv.dispatchEvent(inputEvent);

                            const hiddenTextarea = document.querySelector('textarea[name="comment"]');
                            if (hiddenTextarea) {
                                hiddenTextarea.value = noteEditableDiv.innerHTML;
                                hiddenTextarea.dispatchEvent(changeEvent);
                                hiddenTextarea.dispatchEvent(inputEvent);
                            }
                        } else {
                            console.log(new Error('Div with class "note-editable" not found'), 'fetchTemplate');
                            ErrorHandler.showAlert('Could not find the editor to load the template.', 'error');
                        }
                    }
                } else {
                    ErrorHandler.showAlert('Failed to load template due to unexpected data format.', 'error');
                }
            })
            .catch(error => {
                ErrorHandler.showAlert('Failed to fetch template from server.', 'error');
            });
    }

    static async fetchStudentData(url) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            return html;
        } catch (error) {
            return null;
        }
    }

    static async processStudentData(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const pdfLink = doc.querySelector(`a[href^="../Schedule_Program/"][href$=".pdf"]`);

        let studentMail = null;
        const emailCell = doc.querySelector('td:nth-child(5)');

        if (emailCell) {
            const cfEmailElement = emailCell.querySelector('[data-cfemail]');

            if (cfEmailElement && cfEmailElement.dataset.cfemail) {
                studentMail = HelperFunctions.decodeCfEmail(cfEmailElement.dataset.cfemail);
                console.log('Decoded Cloudflare email:', studentMail);
            } else {
                studentMail = emailCell.textContent.trim();
            }
        }

        const failCount = TicketDetailManager.countFailElements(doc);
        if (failCount > 0) ErrorHandler.showAlert(`This student has <b>&nbsp;${failCount} failed course${failCount > 1 ? 's' : ''}.</b>`, 'error');

        if (studentMail || pdfLink) {
            await TicketDetailManager.addStudentInfoElements(studentMail, pdfLink);
        }
    }

    static async verifastCheck(email, vNumber = null) {
        const normalizedEmail = email ? email.toLowerCase().trim() : null;
        const cacheKey = CacheManager.getVerifastCacheKey(normalizedEmail, vNumber);

        if (!cacheKey) {
            console.warn("Verifast check skipped: Not enough information to generate a cache key.", { email, vNumber });
            if (!normalizedEmail) return { success: false, error: "Email is required for Verifast check.", fromCache: false };
        }

        try {
            // Cache check - only "ID Verified" statuses are cached
            const cachedEntry = cacheKey ? await CacheManager.getVerifastResult(cacheKey) : null;
            if (cachedEntry && cachedEntry.data && cachedEntry.data.verifastStatus === 'ID Verified') {
                console.log(`Using cached Verifast result for ${email} (vNumber: ${vNumber})`);
                return {
                    success: true,
                    fromCache: true,
                    data: (cachedEntry.data.apiResponseData ? cachedEntry.data.apiResponseData : [{ identity_verified: 1, date: cachedEntry.data.verifiedDate }]),
                    verifastStatus: cachedEntry.data.verifastStatus,
                    verifiedDate: cachedEntry.data.verifiedDate,
                    checkDate: cachedEntry.data.checkDate,
                    apiResponseData: cachedEntry.data.apiResponseData,
                    isVerified: true
                };
            }
        } catch (cacheError) {
            console.log(cacheError, `Verifast cache read for ${cacheKey}`);
        }

        try {
            const apiResponse = await HelperFunctions.sendMessage('verifastCheck', { email });

            if (apiResponse && apiResponse.success) {
                const verificationResult = ValidationHelper.checkIdVerification(apiResponse);

                // Only cache "ID Verified" statuses
                if (verificationResult.isVerified && verificationResult.status === 'ID Verified') {
                    const checkDate = new Date().toLocaleString();
                    const verifastDataToCache = {
                        verifastStatus: 'ID Verified',
                        verifiedDate: verificationResult.date,
                        checkDate: checkDate,
                        apiResponseData: apiResponse.data
                    };

                    if (cacheKey) {
                        await CacheManager.updateVerifastCache(normalizedEmail, vNumber, verifastDataToCache);
                    }
                }

                return {
                    ...apiResponse,
                    fromCache: false,
                    isVerified: verificationResult.isVerified,
                    verifastStatus: verificationResult.status,
                    verifiedDate: verificationResult.date,
                    rawStatus: verificationResult.rawStatus
                };
            }

            return { ...apiResponse, fromCache: false };
        } catch (error) {
            console.log(error, 'verifastCheck API call');
            return { success: false, error: error.message, fromCache: false };
        }
    }

    static async launchCheck(email, vNumber = null, firstName = null, lastName = null, status = null) {
        const normalizedEmail = email ? email.toLowerCase().trim() : null;
        // Centralize cache key generation via CacheManager method
        const cacheKey = CacheManager.getLaunchCacheKey(normalizedEmail, vNumber);

        if (!cacheKey) {
            console.warn("Launch check cache lookup skipped: Not enough information to generate a cache key.", { email, vNumber });
            // If no cache key, we might still proceed to API if enough info for that,
            // but caching will be skipped.
        }

        try {
            // Create a data object with available parameters for the API call
            const data = {};
            if (email) data.email = email; // API needs email regardless of cache key for actual fetch
            if (vNumber) data.vNumber = vNumber;
            if (firstName) data.firstName = firstName;
            if (lastName) data.lastName = lastName;
            if (status) data.status = status;

            const apiResponse = await HelperFunctions.sendMessage('launchCheck', data);

            let studentList = [];
            let rawResponseForCache = apiResponse; // Default to actual API response

            if (typeof apiResponse === 'string') {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = apiResponse;
                const studentListInput = tempDiv.querySelector('#studentSchoolList');
                if (studentListInput && studentListInput.value) {
                    try {
                        studentList = JSON.parse(studentListInput.value);
                    } catch (e) {
                        ErrorHandler.showAlert('Failed to parse student list from Launch check.', 'warning');
                    }
                }
                if (studentList.length === 0) {
                    const rows = tempDiv.querySelectorAll('#students tbody tr');
                    if (rows.length > 0) {
                        Array.from(rows).forEach(row => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length >= 5) {
                                const usernameText = cells[0].textContent;
                                const vNumberMatch = usernameText.match(/\(([^)]+)\)/);
                                studentList.push({
                                    userID: cells[0].textContent.trim(),
                                    firstName: cells[1] ? cells[1].textContent.trim() : '',
                                    lastName: cells[2] ? cells[2].textContent.trim() : '',
                                    registryDate: cells[3] ? cells[3].textContent.trim() : '',
                                    school: cells[4] ? cells[4].textContent.trim() : '',
                                    code: vNumberMatch ? vNumberMatch[1] : ''
                                });
                            }
                        });
                    }
                }
            } else if (apiResponse && typeof apiResponse === 'object' && apiResponse.students) {
                // If API response is already structured (e.g. from a mock or future API enhancement)
                studentList = apiResponse.students;
                rawResponseForCache = apiResponse.rawResponse !== undefined ? apiResponse.rawResponse : apiResponse;
            }


            if (studentList.length > 0 && cacheKey) { // Only cache if we have a key and data
                const launchDataToCache = {
                    students: studentList,
                    checkDate: new Date().toLocaleString(),
                    rawResponse: rawResponseForCache // Store the original response for fidelity if needed
                };
                // Ensure updateLaunchCache is called with parameters that allow it to reconstruct the same key
                await CacheManager.updateLaunchCache(normalizedEmail, vNumber, launchDataToCache);
            }

            return {
                success: studentList.length > 0,
                students: studentList,
                rawResponse: rawResponseForCache, // Return the original API response
                fromCache: false
            };
        } catch (error) {
            console.log(error, 'launchCheck API call');
            return { success: false, error: error.message, fromCache: false };
        }
    }

    static async getStudentListExcel(options = {}, url = null) {
        try {
            // Find the Excel download form on the current page
            const downloadForm = document.querySelector('form:has(button[name="studentlist"])');

            if (!downloadForm) {
                throw new Error('Excel download form not found on this page');
            }

            // Get the form action URL (using provided URL or form's action)
            let actionUrl = url || downloadForm.getAttribute('action');

            // If it's a relative URL, convert to absolute
            if (actionUrl.startsWith('../') || actionUrl.startsWith('./') || (!actionUrl.startsWith('http') && !actionUrl.startsWith('/'))) {
                const basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
                actionUrl = new URL(actionUrl, basePath).href;
            } else if (actionUrl.startsWith('/')) {
                actionUrl = window.location.origin + actionUrl;
            }

            // Create form data from all inputs in the form
            const formData = new FormData();
            const formInputs = downloadForm.querySelectorAll('input[type="hidden"]');

            // Add all hidden inputs to the form data
            formInputs.forEach(input => {
                const name = input.getAttribute('name');
                const value = input.value || '';
                formData.append(name, value);
            });

            // Add studentlist parameter (the submit button name)
            formData.append('studentlist', '');

            // Override with any options passed to the function
            for (const [key, value] of Object.entries(options)) {
                if (key !== 'useNextMonday') {
                    formData.set(key, value || '');
                }
            }

            // Special handling for date_monday parameter if form has that field
            const hasDateMonday = Array.from(formInputs).some(input => input.name === 'date_monday');
            if (hasDateMonday) {
                const { useNextMonday = true } = options;
                const hasFilters = formData.get('keywordLists') || formData.get('startFilter') || formData.get('statusFilter');

                if (useNextMonday && !hasFilters) {
                    formData.set('date_monday', HelperFunctions.getNextMonday());
                } else {
                    formData.set('date_monday', '');
                }
            }

            // Get the referrer URL from current location
            const referrer = window.location.href;

            // Make the POST request to get Excel file with the EXACT headers needed by the server
            const response = await fetch(actionUrl, {
                method: 'POST',
                headers: {
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'content-type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(formData),
                credentials: 'include',
                referrer: referrer,
                referrerPolicy: 'strict-origin-when-cross-origin',
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch Excel data: ${response.status} ${response.statusText}`);
            }

            return await response.blob();
        } catch (error) {
            console.log(error, 'getStudentListExcel');
            throw error; // Rethrow for the caller to handle and potentially show alert
        }
    }

    static async addContractRemarks(data_id, status, remarks) {
        fetch("https://aoltorontoagents.ca/student_contract/campusLists/acmeLists.php?msg=Successfully&keywordLists=&startFilter=&statusFilter=", {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
                "content-type": "application/x-www-form-urlencoded",
            },
            "body": `acme_status=${status}&acme_remarks=${remarks}&ppp_form_id=${data_id}&submitbtn=`,
            "method": "POST",
            "mode": "cors",
            "credentials": "include"
        }).then(response => response.text())
            .then(() => console.log('Remarks added successfully'))
            .catch(err => console.log(err, 'addContractRemarks API Call'));
    }

    static getCurrentUserName() {
        try {
            // Get current user name from sidebar menu
            const sidebarMenu = document.querySelector('#sidebar-menu #side-menu li a.active span');
            if (sidebarMenu) {
                return sidebarMenu.textContent.trim();
            }

            // Fallback: try different selectors
            const altSelector = document.querySelector('#side-menu li a span');
            if (altSelector) {
                return altSelector.textContent.trim();
            }

            return null;
        } catch (error) {
            console.log(error, 'getCurrentUserName');
            return null;
        }
    }

    static async getStudentNotes(vNumber) {
        try {

            const response = await fetch("https://aoltorontoagents.ca/student_contract/clgStActive/json_get.php?tag=search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                },
                body: `v_number=${vNumber}`,
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch notes: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data && data.status === 200 && Array.isArray(data.data)) {
                // Sanitize each note's HTML content and return the data
                return data.data.map(note => ({
                    ...note,
                    notes: HelperFunctions.sanitizeHtml(note.notes)
                }));
            }

            return [];
        } catch (error) {
            console.log(error, `getStudentNotes for ${vNumber}`);
            return [];
        }
    }

    static async deleteStudentNote(noteId, vNumber) {
        try {
            // Create FormData object
            const formData = new FormData();
            formData.append("id", noteId); // ✅ Use full noteId (including "nd" prefix)
            formData.append("vno", vNumber);

            // Send the delete request
            const response = await fetch("https://aoltorontoagents.ca/student_contract/clgStActive/response.php?tag=deleteNotes", {
                method: "POST",
                body: formData,
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error(`Failed to delete note: ${response.status} ${response.statusText}`);
            }

            const responseText = await response.text();

            // After successful deletion, refresh the notes display
            const refreshedNotes = await DataService.getStudentNotes(vNumber);
            return {
                success: true,
                message: responseText,
                notes: refreshedNotes
            };
        } catch (error) {
            console.log(error, `deleteStudentNote for ID ${noteId}, vNumber ${vNumber}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getStudentMessages(vNumber) {
        try {

            const response = await fetch("https://aoltorontoagents.ca/student_contract/clgStActive/json_get.php?getInfo=search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                },
                body: `v_number=${vNumber}`,
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data && data.status === 200 && Array.isArray(data.data)) {
                // Sanitize each message's HTML content before returning
                return data.data.map(message => ({
                    ...message,
                    description: HelperFunctions.sanitizeHtml(message.description)
                }));
            }

            return [];
        } catch (error) {
            console.log(error, `getStudentMessages for ${vNumber}`);
            return [];
        }
    }

    static async submitStudentNote(title, notes, vNumber) {
        try {
            console.log("Submitting note for student:", vNumber);

            // Get the hidden form field values
            const loginId = document.getElementById('login_id')?.value;
            const loginName = document.getElementById('login_name')?.value;
            const studentId = document.getElementById('student_id')?.value;

            if (!loginId || !loginName || !studentId) {
                throw new Error("Missing required form fields");
            }

            // Create FormData object
            const formData = new FormData();
            formData.append("title", title);
            formData.append("login_id", loginId);
            formData.append("login_name", loginName);
            formData.append("student_id", studentId);
            formData.append("v_number", vNumber);
            formData.append("notes", notes);

            // Add empty files as required by API
            const emptyBlob = new Blob([''], { type: 'application/octet-stream' });
            formData.append("files", emptyBlob);
            formData.append("files_data[]", emptyBlob);

            // Send the request - don't set content-type header, browser will set it with boundary
            const response = await fetch("https://aoltorontoagents.ca/student_contract/clgStActive/notessubmit.php?action=save_notes", {
                method: "POST",
                body: formData,
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error(`Failed to submit note: ${response.status} ${response.statusText}`);
            }

            // After successful submission, refresh the notes display
            const refreshedNotes = await DataService.getStudentNotes(vNumber);
            return {
                success: true,
                notes: refreshedNotes
            };
        } catch (error) {
            console.log(error, `submitStudentNote for ${vNumber}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async submitStudentMessage(message, vNumber, file = null) {
        try {
            console.log("Submitting message for student:", vNumber);

            // Get the hidden form field values - update these IDs to match the original form
            const loginId = document.getElementById('login_id')?.value;
            const loginName = document.getElementById('login_name')?.value;
            const studentId = document.getElementById('student_id')?.value;

            if (!loginId || !loginName || !studentId) {
                throw new Error("Missing required form fields");
            }

            // Create FormData object
            const formData = new FormData();
            formData.append("login_id", loginId);
            formData.append("login_name", loginName);
            formData.append("student_id", studentId);
            formData.append("v_number", vNumber);
            formData.append("description", message);

            // Handle file attachments exactly like the original form
            if (file) {
                // The original form is using empty "files" with the actual file in "files_data"
                const emptyBlob = new Blob([''], { type: 'application/octet-stream' });
                formData.append("files", emptyBlob, '');
                formData.append("files_data", file, file.name);
            } else {
                // No file case - both fields must be present but empty
                const emptyBlob = new Blob([''], { type: 'application/octet-stream' });
                formData.append("files", emptyBlob, '');
                formData.append("files_data", emptyBlob, '');
            }

            // Send the request with the same settings as the original code
            // Replace 'cache: false' with 'cache: "no-store"' which is the fetch API equivalent
            const response = await fetch("https://aoltorontoagents.ca/student_contract/clgStActive/notessubmit.php?send_mssg=send_mssg", {
                method: "POST",
                body: formData,
                cache: "no-store",
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error(`Failed to submit message: ${response.status} ${response.statusText}`);
            }

            const responseText = await response.text();
            console.log("Message submission server response:", responseText);

            if (responseText.trim() !== '1') {
                throw new Error('Server returned unexpected response');
            }

            // Wrapped in try/catch to prevent refresh failure from making the whole process fail
            let refreshedMessages = [];
            try {
                // Try to get refreshed messages, but don't fail if this part fails
                refreshedMessages = await DataService.getStudentMessages(vNumber);
                console.log("Successfully retrieved refreshed messages:", refreshedMessages.length);
            } catch (refreshError) {
                console.warn("Failed to refresh messages, but message was sent successfully:", refreshError);
                // Continue with empty messages array
            }

            // Return success even if refresh failed
            console.log("Returning success response with messages");
            return {
                success: true,
                messages: refreshedMessages
            };
        } catch (error) {
            console.log(error, `submitStudentMessage for ${vNumber}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getStudentTickets(vNumber) {
        try {
            const params = {
                start: 0,
                length: 1000,
                vno: vNumber,
                file_name_page: 'ticket_list'
            };

            const response = await fetch("https://aoltorontoagents.ca/student_contract/chat/ticket_list_responce.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                },
                body: new URLSearchParams(params).toString(),
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data || !data.aaData || !Array.isArray(data.aaData)) {
                return { success: false, error: "Invalid data structure received", tickets: [] };
            }

            return {
                success: true,
                tickets: data.aaData,
                totalCount: data.iTotalRecords || data.aaData.length
            };
        } catch (error) {
            console.log(error, `getStudentTickets for ${vNumber}`);
            return { success: false, error: error.message, tickets: [] };
        }
    }

    static async handleCoursesAnalysis() {
        try {
            let progressListener = null;
            let storageListener = null;

            const cleanupListeners = () => {
                if (progressListener) {
                    chrome.runtime.onMessage.removeListener(progressListener);
                    progressListener = null;
                }
                if (storageListener) {
                    chrome.storage.onChanged.removeListener(storageListener);
                    storageListener = null;
                }
                console.log("Courses analysis listeners cleaned up successfully");
            };

            cleanupListeners();

            const analyseCoursesButton = document.getElementById('analyseCoursesButton');
            if (analyseCoursesButton) {
                HelperFunctions.setButtonLoadingState(analyseCoursesButton, true, 'fa-chart-line', 0, 'Processing...');
            }

            // Create or find result container
            let coursesResultContainer = document.getElementById('coursesResultContainer');
            if (!coursesResultContainer) {
                coursesResultContainer = document.createElement('div');
                coursesResultContainer.id = 'coursesResultContainer';
                coursesResultContainer.className = 'row mt-3 mb-3';

                const existingTableContainer = document.querySelector('.scroll-container');
                if (existingTableContainer && existingTableContainer.parentElement) {
                    existingTableContainer.parentElement.insertBefore(coursesResultContainer, existingTableContainer);
                } else {
                    const innerForm = document.querySelector('.inner-form');
                    if (innerForm && innerForm.parentElement) {
                        innerForm.parentElement.insertBefore(coursesResultContainer, innerForm.nextSibling);
                    } else {
                        const targetContainer = document.querySelector('.container-fluid');
                        if (targetContainer) {
                            targetContainer.appendChild(coursesResultContainer);
                        }
                    }
                }
            } else {
                if (window.getComputedStyle(coursesResultContainer).display !== 'none') {
                    coursesResultContainer.style.display = 'none';
                    HelperFunctions.setButtonLoadingState(analyseCoursesButton, false, 'fa-eye', 0, 'Show Analysis Results');
                    return;
                } else {
                    coursesResultContainer.style.display = 'block';
                    HelperFunctions.setButtonLoadingState(analyseCoursesButton, false, 'fa-eye-slash', 0, 'Hide Analysis Results');
                    return;
                }
            }

            coursesResultContainer.innerHTML = `
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header bg-warning text-black">
                            <h5 class="mb-0">Course Analysis Progress</h5>
                        </div>
                        <div class="card-body text-center">
                            <div class="progress mb-3" style="height: 40px; font-size: inherit; font-weight: 600; display: block; position: relative;">
                                <div id="coursesFetchProgress" class="progress-bar progress-bar-striped progress-bar-animated" 
                                    role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                                <button id="coursesStopProgressBtn" class="btn btn-sm btn-danger" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%);" type="button">
                                    <i class="fas fa-stop"></i> Stop
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const abortController = new AbortController();
            const stopProgressBtn = document.getElementById('coursesStopProgressBtn');
            if (stopProgressBtn) {
                stopProgressBtn.addEventListener('click', () => {
                    abortController.abort();
                    stopProgressBtn.disabled = true;
                    stopProgressBtn.textContent = 'Stopping...';
                    chrome.runtime.sendMessage({ action: 'stopProgressSheetData' });
                });
            }

            const progressBar = document.getElementById('coursesFetchProgress');
            progressBar.dataset.cancelled = 'false';

            progressListener = (message) => {
                if (message.action === 'progressUpdate' && progressBar.dataset.cancelled !== 'true') {
                    progressBar.style.width = message.data.progress + '%';
                    progressBar.textContent = message.data.message;
                } else if (message.action === 'progressError') {
                    progressBar.className = 'progress-bar bg-danger';
                    progressBar.style.width = '100%';
                    progressBar.textContent = `Error: ${message.data.error}`;
                    if (stopProgressBtn) stopProgressBtn.style.display = 'none';
                }
            };
            chrome.runtime.onMessage.addListener(progressListener);

            storageListener = (changes, namespace) => {
                if (changes.progressSheetProgress && namespace === 'local' && progressBar.dataset.cancelled !== 'true') {
                    const newValue = changes.progressSheetProgress.newValue;
                    if (newValue) {
                        progressBar.style.width = newValue.progress + '%';
                        progressBar.textContent = `${Math.round(newValue.progress)}%`;
                        if (newValue.isError) {
                            progressBar.className = 'progress-bar bg-danger';
                            if (stopProgressBtn) stopProgressBtn.style.display = 'none';
                        }
                    }
                }
            };
            chrome.storage.onChanged.addListener(storageListener);

            try {
                await chrome.storage.local.remove('progressSheetProgress');
                const response = await new Promise((resolve, reject) => {
                    let retries = 0;
                    const maxRetries = 3;
                    const sendMessage = () => {
                        chrome.runtime.sendMessage({ action: 'progressSheetData' }, (result) => {
                            if (chrome.runtime.lastError) {
                                console.log(chrome.runtime.lastError, 'Courses Analysis SendMessageToBackground');
                                if (retries < maxRetries) {
                                    retries++;
                                    setTimeout(sendMessage, 1000);
                                } else {
                                    reject(new Error('Failed to communicate with background script after multiple attempts'));
                                }
                            } else {
                                resolve(result);
                            }
                        });
                    };
                    sendMessage();
                });

                if (abortController.signal.aborted) throw new Error('Operation cancelled by user');
                if (!response || !response.success) throw new Error(response?.error || 'Failed to fetch data from T2202 portal');

                const csvData = await new Promise(resolve => {
                    chrome.storage.local.get(response.dataKey, result => resolve(result[response.dataKey] || []));
                });

                if (abortController.signal.aborted) throw new Error('Operation cancelled by user');

                progressBar.textContent = 'Analyzing student data...';
                const activeStudentsResponse = await fetch('https://aoltorontoagents.ca/student_contract/clgStActive/activeStExcel.php', {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                        'cache-control': 'no-cache',
                        'pragma': 'no-cache',
                    },
                    body: "campusFltr=&campusFix=AND+(ppp_form.campus%3D%27Toronto%27+OR+ppp_form.campus%3D%27Toronto%27++OR+ppp_form.campus%3D%27Brampton%27++OR+ppp_form.campus%3D%27North+York%27++OR+ppp_form.campus%3D%27Kitchener%27++OR+ppp_form.campus%3D%27Belleville%27++)&crsFltr=&startDFltr=&keywordLists=&csFltr=&pagename=Active&studentlist=",
                    credentials: 'include'
                });

                let activeStudentsExcelData = [];
                if (activeStudentsResponse.ok) {
                    const activeStudentsBlob = await activeStudentsResponse.blob();
                    const activeStudentsBuffer = await activeStudentsBlob.arrayBuffer();
                    const workbook = XLSX.read(new Uint8Array(activeStudentsBuffer), { type: 'array' });
                    activeStudentsExcelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                } else {
                    console.warn("Could not fetch active students list for course analysis, proceeding with CSV data only.");
                }

                if (abortController.signal.aborted) throw new Error('Operation cancelled by user');

                progressBar.textContent = 'Processing course data...';
                const analysisResults = await DataService.processCoursesAnalysisData(csvData, activeStudentsExcelData);

                progressBar.className = 'progress-bar bg-success';
                progressBar.style.width = '100%';
                const totalResults = analysisResults.sfsData.length + analysisResults.typazData.length + analysisResults.nonProgressData.length + analysisResults.failData.length;
                progressBar.textContent = `Analysis Complete - ${totalResults} students found across all categories`;

                DataTableManager.displayCoursesAnalysisResults(analysisResults, coursesResultContainer);

                setTimeout(() => { if (stopProgressBtn) stopProgressBtn.style.display = 'none'; }, 2000);
                chrome.runtime.sendMessage({ action: 'cleanProgressSheetData' });

            } catch (error) {
                if (error.message !== 'Operation cancelled by user') {
                    console.log(error, 'handleCoursesAnalysis - data processing part');
                    progressBar.className = 'progress-bar bg-danger';
                    progressBar.style.width = '100%';
                    progressBar.textContent = `Error: ${error.message}`;
                } else {
                    progressBar.className = 'progress-bar bg-info';
                    progressBar.style.width = '100%';
                    progressBar.textContent = 'Courses Analysis Cancelled';
                }
            } finally {
                cleanupListeners();
            }
            HelperFunctions.setButtonLoadingState(analyseCoursesButton, false, 'fa-eye-slash', 0, 'Hide Analysis Results');
        } catch (error) {
            console.log(error, 'handleCoursesAnalysis - main try');
            if (error.name !== 'AbortError' && error.message !== 'Operation cancelled by user') {
                const coursesResultContainer = document.getElementById('coursesResultContainer');
                if (coursesResultContainer) {
                    coursesResultContainer.innerHTML = `
                        <div class="col-md-12">
                            <div class="alert alert-danger">
                                <h5>Error in Course Analysis</h5>
                                <p>${error.message}</p>
                            </div>
                        </div>
                    `;
                }
                const analyseCoursesButton = document.getElementById('analyseCoursesButton');
                if (analyseCoursesButton) {
                    HelperFunctions.setButtonLoadingState(analyseCoursesButton, false, 'fa-chart-line', 0, 'Analyse Courses');
                }
            }
        }
    }

    static async processCoursesAnalysisData(csvData, activeStudentsExcelData) {
        // Process SFS data (Strategies for Success)
        const sfsData = csvData.filter(row => {
            const courseName = (row.Course || '').toLowerCase();
            const status = (row.CourseStatus || '').trim();
            return courseName.includes('strategies for success') &&
                (status === 'Fail' || status === 'In Progress');
        });

        // Process TYPAZ data
        const typazData = csvData.filter(row => {
            const courseName = (row.Course || '').toLowerCase();
            const status = (row.CourseStatus || '').trim();
            return courseName.includes('typaz') &&
                (status === 'Fail' || status === 'In Progress');
        });

        // Find students with "Not Started" courses but no "In Progress" courses
        const studentCourseMap = new Map();
        csvData.forEach(row => {
            const vNumber = row.Vnumber || '';
            const status = (row.CourseStatus || '').trim();
            if (vNumber) {
                if (!studentCourseMap.has(vNumber)) {
                    studentCourseMap.set(vNumber, { notStarted: false, inProgress: false, studentData: row });
                }
                const student = studentCourseMap.get(vNumber);
                if (status === 'Not Started') student.notStarted = true;
                if (status === 'In Progress') student.inProgress = true;
            }
        });

        const nonProgressStudents = [];
        studentCourseMap.forEach((student, vNumber) => {
            if (student.notStarted && !student.inProgress) {
                nonProgressStudents.push({ ...student.studentData, vNumber });
            }
        });

        // Find students with 2+ fail courses or completed with fails
        const studentFailMap = new Map();
        csvData.forEach(row => {
            const vNumber = row.Vnumber || '';
            const status = (row.CourseStatus || '').trim();
            if (vNumber) {
                if (!studentFailMap.has(vNumber)) {
                    studentFailMap.set(vNumber, {
                        failCount: 0,
                        completedCount: 0,
                        notStartedCount: 0,
                        inProgressCount: 0,
                        studentData: row
                    });
                }
                const student = studentFailMap.get(vNumber);
                if (status === 'Fail') student.failCount++;
                else if (status === 'Completed') student.completedCount++;
                else if (status === 'Not Started') student.notStartedCount++;
                else if (status === 'In Progress') student.inProgressCount++;
            }
        });

        const failStudents = [];
        studentFailMap.forEach((student, vNumber) => {
            // Students with 2+ Fail courses
            if (student.failCount >= 2) {
                failStudents.push({ ...student.studentData, vNumber, failStatus: '2+ Fails' });
            }
            // Students who have completed all courses (no "Not Started" left) but have at least one Fail
            else if (student.failCount > 0 && student.notStartedCount === 0) {
                failStudents.push({ ...student.studentData, vNumber, failStatus: 'Completed with Fail(s)' });
            }
        });

        // Helper function to format student data
        const formatStudentData = (students, includeFailStatus = false, includeCourse = false) => {
            const uniqueStudents = new Map();
            students.forEach(row => {
                const vNumber = row.Vnumber || row.vNumber || '';
                if (vNumber) {
                    if (!uniqueStudents.has(vNumber.toLowerCase())) {
                        uniqueStudents.set(vNumber.toLowerCase(), {
                            vNumber: vNumber,
                            studentName: row.Contact || 'N/A',
                            courses: [],
                            failStatus: row.failStatus || ''
                        });
                    }
                    if (includeCourse && row.Course) {
                        uniqueStudents.get(vNumber.toLowerCase()).courses.push({
                            course: row.Course || '',
                            status: row.CourseStatus || ''
                        });
                    }
                }
            });

            let formattedData = [];
            if (activeStudentsExcelData && activeStudentsExcelData.length > 0) {
                uniqueStudents.forEach((student, vNumberKey) => {
                    const matchingStudent = activeStudentsExcelData.find(s => {
                        const vNum = s['VNumber'] || s['V-number'] || s['Vnumber'] || '';
                        return vNum.toLowerCase() === vNumberKey;
                    });

                    if (matchingStudent) {
                        let startDate = matchingStudent['Start Date'];
                        let finishDate = matchingStudent['Finish Date'];

                        if (typeof startDate === 'number') {
                            startDate = HelperFunctions.convertExcelDate(startDate).toISOString().split('T')[0];
                        } else if (startDate) {
                            startDate = HelperFunctions.formatDateString(startDate);
                        }

                        if (typeof finishDate === 'number') {
                            finishDate = HelperFunctions.convertExcelDate(finishDate).toISOString().split('T')[0];
                        } else if (finishDate) {
                            finishDate = HelperFunctions.formatDateString(finishDate);
                        }

                        const baseData = {
                            programName: matchingStudent['Program'] || matchingStudent['Program Name'] || 'N/A',
                            studentName: matchingStudent['Full Name'] || matchingStudent['Student Name'] || student.studentName,
                            vNumber: student.vNumber,
                            personalEmail: matchingStudent['EP(Email Id)'] || matchingStudent['Email Id'] || matchingStudent['Email'] || 'N/A',
                            campusEmail: matchingStudent['Username(Email Id)'] || 'N/A',
                            phoneNumber: matchingStudent['Contact No.'] || matchingStudent['Phone'] || 'N/A',
                            campus: matchingStudent['Campus'] || 'N/A',
                            finishDate: finishDate || 'N/A'
                        };

                        if (includeFailStatus) {
                            baseData.status = student.failStatus;
                        }

                        if (includeCourse && student.courses.length > 0) {
                            student.courses.forEach(courseEntry => {
                                formattedData.push({
                                    ...baseData,
                                    course: courseEntry.course,
                                    status: courseEntry.status
                                });
                            });
                        } else {
                            formattedData.push(baseData);
                        }
                    }
                });
            }
            return formattedData;
        };

        return {
            sfsData: formatStudentData(sfsData, false, true),
            typazData: formatStudentData(typazData, false, true),
            nonProgressData: formatStudentData(nonProgressStudents),
            failData: formatStudentData(failStudents, true)
        };
    }

    static async processFollowUpsData(excelJsonData, canvasResults) {
        // Filter for students with empty passwords or no Canvas login
        const followUpStudents = excelJsonData.filter(student => {
            const email = student['Username(Email Id)'] || '';
            const password = student['Password'] || '';
            const canvasResult = canvasResults[email] || { found: false, hasLoggedIn: false };

            const passwordValid = password &&
                (typeof password === 'string' ? password.trim() !== '' : true) &&
                password !== 'Not Updated Password';
            const canvasLoginValid = email && canvasResult.found && canvasResult.hasLoggedIn;

            return !passwordValid || !canvasLoginValid;
        });

        // Format data for display
        return followUpStudents.map(student => {
            const email = student['Username(Email Id)'] || '';
            const password = student['Password'] || '';
            const canvasResult = canvasResults[email] || { found: false, hasLoggedIn: false };

            return {
                programName: student['Program'] || student['Program Name'] || 'N/A',
                studentName: student['Full Name'] || student['Student Name'] || `${student['First Name'] || ''} ${student['Last Name'] || ''}`.trim() || 'N/A',
                vNumber: student['VNumber'] || student['Vnumber'] || student['V-number'] || 'N/A',
                personalEmail: student['EP(Email Id)'] || student['Email Id'] || student['Email'] || 'N/A',
                campusEmail: email || 'N/A',
                phoneNumber: student['Contact No.'] || student['Phone'] || 'N/A',
                startDate: HelperFunctions.formatDateString(student['Start Date']) || 'N/A', // Ensure date is formatted
                status: student['Status'] || 'N/A',
                spStatus: password && password.trim() !== '' && password !== 'Not Updated Password' ? 'Done' : 'Undone',
                canvasStatus: canvasResult.hasLoggedIn ? 'Done' : 'Undone',
                admissionRep: student['Admission Rep'] || student['Admission Representative'] || 'N/A',
            };
        });
    }

    static async handleFollowUpsCheck() {
        try {
            let progressListener = null;
            let storageListener = null;

            const cleanupListeners = () => {
                if (progressListener) {
                    chrome.runtime.onMessage.removeListener(progressListener);
                    progressListener = null;
                }
                if (storageListener) {
                    chrome.storage.onChanged.removeListener(storageListener);
                    storageListener = null;
                }
            };

            cleanupListeners();

            const followUpsButton = document.getElementById('followUpsButton');
            if (followUpsButton) {
                HelperFunctions.setButtonLoadingState(followUpsButton, true, 'fa-user-clock', 0, 'Processing...');
            }

            let followUpsResultContainer = document.getElementById('followUpsResultContainer');
            if (!followUpsResultContainer) {
                followUpsResultContainer = document.createElement('div');
                followUpsResultContainer.id = 'followUpsResultContainer';
                followUpsResultContainer.className = 'row mt-3 mb-3';
                const existingTableContainer = document.querySelector('.scroll-container');
                if (existingTableContainer && existingTableContainer.parentElement) {
                    existingTableContainer.parentElement.insertBefore(followUpsResultContainer, existingTableContainer);
                } else {
                    const innerForm = document.querySelector('.inner-form');
                    if (innerForm && innerForm.parentElement) {
                        innerForm.parentElement.insertBefore(followUpsResultContainer, innerForm.nextSibling);
                    } else {
                        const targetContainer = document.querySelector('.container-fluid');
                        if (targetContainer) targetContainer.appendChild(followUpsResultContainer);
                    }
                }
            } else {
                if (window.getComputedStyle(followUpsResultContainer).display !== 'none') {
                    followUpsResultContainer.style.display = 'none';
                    HelperFunctions.setButtonLoadingState(followUpsButton, false, 'fa-eye', 0, 'Show Follow-ups');
                    return;
                } else {
                    followUpsResultContainer.style.display = 'block';
                    HelperFunctions.setButtonLoadingState(followUpsButton, false, 'fa-eye-slash', 0, 'Hide Follow-ups');
                    return;
                }
            }

            followUpsResultContainer.innerHTML = `
                <div class="col-md-12">
                    <div class="card">
                    <div class="card-header bg-success text-white">
                        <h5 class="mb-0">Follow-ups Analysis</h5>
                    </div>
                    <div class="card-body text-center">
                        <div class="progress mb-3" style="height: 40px; font-size: inherit; font-weight: 600; display: block; position: relative;">
                        <div id="followUpsFetchProgress" class="progress-bar progress-bar-striped progress-bar-animated" 
                            role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                        <button id="followUpsStopProgressBtn" class="btn btn-sm btn-danger" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%);" type="button">
                            <i class="fas fa-stop"></i> Stop
                        </button>
                        </div>
                    </div>
                    </div>
                </div>`;

            const abortController = new AbortController();
            const stopProgressBtn = document.getElementById('followUpsStopProgressBtn');
            if (stopProgressBtn) {
                stopProgressBtn.addEventListener('click', async () => {
                    try {
                        abortController.abort();
                        stopProgressBtn.disabled = true;
                        stopProgressBtn.textContent = 'Stopping...';
                        await chrome.runtime.sendMessage({ action: 'stopCanvasChecks' });
                        progressBar.className = 'progress-bar bg-danger';
                        progressBar.style.width = '100%';
                        progressBar.textContent = 'Operation cancelled by user';
                        progressBar.dataset.cancelled = 'true';
                        setTimeout(() => {
                            HelperFunctions.setButtonLoadingState(followUpsButton, false, 'fa-user-clock', 0, 'Check Follow-ups');
                            if (followUpsResultContainer) followUpsResultContainer.style.display = 'none';
                        }, 1500);
                    } catch (error) {
                        console.log(error, 'handleFollowUpsCheck - stopProgressBtn click');
                    }
                });
            }

            const progressBar = document.getElementById('followUpsFetchProgress');
            progressBar.dataset.cancelled = 'false';

            const updateProgress = (progress, message) => {
                if (abortController.signal.aborted) return Promise.resolve();
                progressBar.style.width = `${Math.min(Math.round(progress), 100)}%`;
                progressBar.setAttribute('aria-valuenow', Math.min(Math.round(progress), 100));
                progressBar.textContent = message;
                return new Promise(resolve => setTimeout(resolve, 10));
            };

            try {
                await updateProgress(5, "Determining date parameters...");
                let selectedDate = null;
                const startDateInput = document.querySelector('input[name="startDFltr"]');
                if (startDateInput && startDateInput.value) {
                    selectedDate = startDateInput.value;
                    await updateProgress(10, `Using selected date: ${selectedDate}`);
                } else {
                    const nextMonday = new Date(HelperFunctions.getNextMonday());
                    nextMonday.setDate(nextMonday.getDate() - 6);
                    selectedDate = nextMonday.toLocaleDateString('en-CA');
                    await updateProgress(10, `Using current week's Monday: ${selectedDate}`);
                }

                const requestOptions = { startDFltr: selectedDate };
                await updateProgress(15, "Downloading Excel data...");
                const blob = await this.getStudentListExcel(requestOptions);
                await updateProgress(30, "Processing Excel data...");
                const excelJsonData = await HelperFunctions.processExcelBlob(blob, ['Start Date', 'Finish Date']);
                await updateProgress(40, `Processing ${excelJsonData.length} student records...`);

                const campusEmails = excelJsonData.map(student => student['Username(Email Id)'] || '').filter(email => email && email.includes('@'));
                await updateProgress(60, `Checking ${campusEmails.length} emails on Canvas...`);

                const canvasResults = await this.sendCanvasCheckRequest(campusEmails, (processed, total, email) => {
                    const progress = 60 + Math.floor((processed / total) * 30);
                    updateProgress(progress, `Checking Canvas (${processed}/${total}): ${email}`);
                });

                if (abortController.signal.aborted) throw new Error('Operation cancelled by user');
                await updateProgress(90, "Analyzing results...");

                const formattedData = await DataService.processFollowUpsData(excelJsonData, canvasResults);

                await updateProgress(100, `Analysis complete. Found ${formattedData.length} students requiring follow-up.`);

                DataTableManager.displayFollowUpsResults(formattedData, followUpsResultContainer);

                setTimeout(() => { if (stopProgressBtn) stopProgressBtn.style.display = 'none'; }, 2000);
            } catch (error) {
                console.log(error, 'handleFollowUpsCheck - data processing part');
                if (progressBar) {
                    progressBar.className = 'progress-bar bg-danger';
                    progressBar.style.width = '100%';
                    progressBar.textContent = `Error: ${error.message}`;
                } else {
                    ErrorHandler.showAlert(`Error in Follow-ups check: ${error.message}`, 'error');
                }
            } finally {
                cleanupListeners();
                HelperFunctions.setButtonLoadingState(followUpsButton, false, 'fa-eye-slash', 0, 'Hide Follow-ups');
            }
        } catch (error) {
            console.log(error, 'handleFollowUpsCheck - main try');
            const followUpsResultContainer = document.getElementById('followUpsResultContainer');
            if (followUpsResultContainer) {
                followUpsResultContainer.innerHTML = `
                <div class="col-md-12">
                <div class="card">
                    <div class="card-header bg-danger text-white">
                    <h5 class="mb-0">Error Processing Follow-ups Data</h5>
                    </div>
                    <div class="card-body">
                    <p><i class="fas fa-exclamation-triangle"></i> An error occurred: ${error.message}</p>
                    </div>
                </div>
                </div>`;
            }
            const followUpsButton = document.getElementById('followUpsButton');
            if (followUpsButton) {
                HelperFunctions.setButtonLoadingState(followUpsButton, false, 'fa-user-clock', 0, 'Check Follow-ups');
            }
        }
    }

    static async sendCanvasCheckRequest(emails, progressCallback) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'canvasLoginBatchCheck',
                emails: emails
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                if (!response?.success) {
                    reject(new Error(response?.error || 'Canvas check failed'));
                    return;
                }

                resolve(response.results);
            });

            // Handle progress updates
            chrome.runtime.onMessage.addListener(function progressListener(message) {
                if (message.action === 'canvasCheckProgress' && typeof progressCallback === 'function') {
                    progressCallback(message.processed, message.total, message.currentEmail);
                }
            });
        });
    }

    static parseUserDetailsFromHtml(htmlContent) {
        try {
            // Validate input
            if (!htmlContent) {
                return { success: false, error: 'Empty HTML content' };
            }

            // Parse HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');

            // Get hidden program contract model
            const hidProgramContractModel = doc.querySelector('#hidProgramContractModel');
            if (!hidProgramContractModel) {
                return { success: false, error: "Course data not found" };
            }

            // Parse JSON data
            const originalData = JSON.parse(decodeURIComponent(hidProgramContractModel.value));

            return {
                success: true,
                data: originalData
            };
        } catch (error) {
            console.error('Error parsing user details:', error);
            return { success: false, error: error.message };
        }
    }

    static async analyzeStudentCourses(launchHtmlData, examSchedule) {
        try {
            if (!launchHtmlData || !examSchedule) {
                return { success: false, error: 'Missing required data', currentCourses: [], nextCourse: null };
            }

            // Parse Launch data
            const parseResult = DataService.parseUserDetailsFromHtml(launchHtmlData);
            if (!parseResult.success) {
                return { success: false, error: parseResult.error, currentCourses: [], nextCourse: null };
            }

            const studentData = parseResult.data;
            let allCourses = [];
            let failCount = 0;
            let nonILSFailCount = 0;

            // Get course data for type checking
            const allCoursesData = await new Promise((resolve) => {
                chrome.storage.local.get(['allCourses'], (result) => {
                    resolve(result.allCourses || []);
                });
            });

            // Extract courses ONLY from "In Progress" contracts with enhanced fail tracking
            if (studentData && studentData.studentProgram) {
                studentData.studentProgram.forEach((program) => {
                    if (program.studentContracts) {
                        program.studentContracts.forEach((contract) => {
                            if (contract.status === "In Progress" && contract.courses) {
                                contract.courses.forEach((course) => {
                                    const courseData = allCoursesData.find(c => c.courseCode === course.courseCode);
                                    const courseType = courseData ? courseData.courseType : '';
                                    const courseCategory = courseData ? courseData.courseCategory : '';

                                    allCourses.push({
                                        code: course.courseCode,
                                        name: course.courseName,
                                        status: parseInt(course.studyStatusID),
                                        statusId: parseInt(course.studyStatusID),
                                        uniqueID: course.uniqueID
                                    });

                                    if (parseInt(course.studyStatusID) === 5) {
                                        failCount++;
                                        if (courseType !== 'ILS' || courseCategory === 'Non-Academic') {
                                            nonILSFailCount++;
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            }

            if (failCount > 0) {
                ErrorHandler.showAlert(`This student has <b>&nbsp;${failCount} failed course${failCount > 1 ? 's' : ''}.</b>`, 'error');
            }

            const scheduledCourses = examSchedule.courses?.courses || [];
            const currentCourses = allCourses.filter(course => course.status === 1);
            const notStartedCourses = allCourses.filter(course => course.status === 0);
            const fallbackMappings = await HelperFunctions.getFallbackMappings();

            console.log('🔍 Course Analysis Debug:', {
                launchCurrentCourses: currentCourses.length,
                launchNotStartedCourses: notStartedCourses.length,
                apiScheduledCourses: scheduledCourses.length,
                fallbackMappings: Object.keys(fallbackMappings).length
            });

            // ✅ STEP 1: Match Current Courses (Launch In Progress → API)
            for (const launchCourse of currentCourses) {
                let matchedApiCourse = null;

                // 1.1: Direct match by course code
                matchedApiCourse = scheduledCourses.find(api => api.courseCode === launchCourse.code);

                // 1.2: If no direct match, try mapping (API code → Launch code)
                if (!matchedApiCourse && fallbackMappings) {
                    // Find API course code that maps to this Launch course code
                    const apiCodeThatMapsToLaunch = Object.entries(fallbackMappings).find(
                        ([apiCode, launchCode]) => {
                            if (Array.isArray(launchCode)) {
                                return launchCode.includes(launchCourse.code);
                            }
                            return launchCode === launchCourse.code;
                        }
                    );

                    if (apiCodeThatMapsToLaunch) {
                        const [apiCode] = apiCodeThatMapsToLaunch;
                        matchedApiCourse = scheduledCourses.find(api => api.courseCode === apiCode);
                        console.log(`📝 Current Course Mapping: API ${apiCode} → Launch ${launchCourse.code}`);
                    }
                }

                // 1.3: Apply API data to Launch course
                if (matchedApiCourse) {
                    launchCourse.startDate = matchedApiCourse.startDate;
                    launchCourse.finishDate = matchedApiCourse.finishDate;
                    launchCourse.apiSequence = parseInt(matchedApiCourse.courseSequence);
                    console.log(`✅ Current Course Matched: ${launchCourse.code} with API sequence ${launchCourse.apiSequence}`);
                } else {
                    launchCourse.notFoundInAPI = true;
                    console.log(`❌ Current Course Not Found in API: ${launchCourse.code}`);
                }
            }

            // ✅ STEP 2: Match Next Courses (Launch Not Started → API)
            const matchedNotStartedCourses = [];
            const unmatchedApiCourses = [];
            const sortedApiCourses = scheduledCourses.sort((a, b) => parseInt(a.courseSequence) - parseInt(b.courseSequence));

            for (const apiCourse of sortedApiCourses) {
                let matchedLaunchCourse = null;

                // 2.1: Direct match by course code
                matchedLaunchCourse = notStartedCourses.find(launch => launch.code === apiCourse.courseCode);

                // 2.2: If no direct match, try mapping (API code → Launch code)
                if (!matchedLaunchCourse && fallbackMappings) {
                    const mappedLaunchCode = await HelperFunctions.findCourseMappingWithFallback(apiCourse.courseCode, fallbackMappings);

                    if (mappedLaunchCode) {
                        matchedLaunchCourse = notStartedCourses.find(launch => launch.code === mappedLaunchCode);
                    }
                }

                if (matchedLaunchCourse) {
                    const courseWithApiData = {
                        ...matchedLaunchCourse,
                        startDate: apiCourse.startDate,
                        finishDate: apiCourse.finishDate,
                        apiSequence: parseInt(apiCourse.courseSequence)
                    };
                    matchedNotStartedCourses.push(courseWithApiData);
                } else {
                    unmatchedApiCourses.push(apiCourse.courseCode);
                }
            }

            // ✅ STEP 3: Determine Next Course to Show
            let finalNextCourse = null;

            if (matchedNotStartedCourses.length > 0) {
                // Sort by API sequence and get first course
                const sortedMatched = matchedNotStartedCourses.sort((a, b) => a.apiSequence - b.apiSequence);
                const nextCourse = sortedMatched[0];

                // Check if first course is Non-Academic, then find next Academic course for secondary
                const nextCourseData = allCoursesData.find(c => c.courseCode === nextCourse.code);
                const nextCourseCategory = nextCourseData ? nextCourseData.courseCategory : '';

                let secondaryCourse = null;
                if (nextCourseCategory === 'Non-Academic') {
                    secondaryCourse = sortedMatched.find(course => {
                        const courseData = allCoursesData.find(c => c.courseCode === course.code);
                        return courseData && courseData.courseCategory === 'Academic';
                    });
                }

                if (secondaryCourse) {
                    finalNextCourse = {
                        primary: nextCourse,
                        secondary: secondaryCourse,
                        isMultiple: true
                    };
                } else {
                    finalNextCourse = nextCourse;
                }
            }

            // ✅ STEP 4: Handle Unmatched Courses Message
            if (unmatchedApiCourses.length > 0) {
                const unmatchedMessage = unmatchedApiCourses.length === 1
                    ? `The course code "${unmatchedApiCourses[0]}" in the Exam Schedule could not be matched, so the next course to be activated cannot be displayed.`
                    : `The course codes "${unmatchedApiCourses.join('", "')}" in the Exam Schedule could not be matched, so the next courses to be activated cannot be displayed.`;

                // If no matched courses but have unmatched, show error message as next course
                if (!finalNextCourse) {
                    finalNextCourse = {
                        isError: true,
                        errorMessage: unmatchedMessage,
                        unmatchedCourses: unmatchedApiCourses
                    };
                }
            }

            console.log('🎯 Final Analysis Result:', {
                currentCoursesCount: currentCourses.length,
                nextCourse: finalNextCourse?.code || finalNextCourse?.primary?.code || 'Error/None',
                unmatchedApiCourses: unmatchedApiCourses.length,
                failCount,
                nonILSFailCount
            });

            return {
                success: true,
                currentCourses: currentCourses,
                nextCourse: finalNextCourse,
                failCount: failCount,
                nonILSFailCount: nonILSFailCount,
                allCourses: allCourses,
                unmatchedApiCourses: unmatchedApiCourses
            };

        } catch (error) {
            console.error('ERROR in course analysis:', error);
            return { success: false, error: error.message, currentCourses: [], nextCourse: null };
        }
    }

    static async submitHDRequest(subject, description) {
        try {
            // First, login to help desk
            const loginResponse = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: "helpDeskLogin"
                }, resolve);
            });

            if (!loginResponse.success) {
                throw new Error('Failed to login to help desk');
            }

            // Get help desk form
            const newRequestResponse = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: "helpDeskContent",
                    url: "https://hd.academyoflearning.net/HelpDesk/NewRequest.aspx",
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

            // Submit form
            const submitResponse = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: "helpDeskContent",
                    url: "https://hd.academyoflearning.net/HelpDesk/NewRequest.aspx",
                    method: "POST",
                    data: formData
                }, resolve);
            });

            return { success: submitResponse.success };

        } catch (error) {
            console.error('Error in submitHDRequest:', error);
            return { success: false, error: error.message };
        }
    }
}

class CacheManager {
    static DB_NAME = 'aolEnhancerDB';
    static STORES = {
        VERIFAST: 'verifast_results',
        LAUNCH: 'launch_results'
    };
    static DB_VERSION = 2; // Keep version to avoid breaking changes
    static MAX_CACHE_SIZE_MB = 2000; // 2GB maximum cache size
    static MAX_CACHE_ENTRIES = 10000; // Maximum number of entries

    static init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = event => {
                console.log(event.target.error, 'CacheManager.init DB open onerror');
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = event => {
                resolve(event.target.result);
            };

            request.onupgradeneeded = event => {
                const db = event.target.result;
                console.log('Database upgrade needed');

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains(this.STORES.VERIFAST)) {
                    db.createObjectStore(this.STORES.VERIFAST, { keyPath: 'cacheKey' });
                    console.log(`Created ${this.STORES.VERIFAST} store`);
                }

                if (!db.objectStoreNames.contains(this.STORES.LAUNCH)) {
                    db.createObjectStore(this.STORES.LAUNCH, { keyPath: 'cacheKey' });
                    console.log(`Created ${this.STORES.LAUNCH} store`);
                }
            };
        });
    }

    static openDB() {
        return this.init();
    }

    static async cleanupIfNeeded(storeName, newEntrySize = 0) {
        try {
            const db = await this.openDB();
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);

            // Get all records and their sizes
            const allRecords = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            // Calculate total size
            let totalSize = newEntrySize;
            const recordsWithMetadata = allRecords.map(record => {
                // Estimate size in bytes
                const size = JSON.stringify(record).length;
                return { record, size, timestamp: record.timestamp || Date.now() };
            });

            recordsWithMetadata.forEach(item => {
                totalSize += item.size;
            });

            // Convert MB to bytes
            const maxSizeBytes = this.MAX_CACHE_SIZE_MB * 1024 * 1024;

            // If we're over the limit or have too many entries, start pruning
            if (totalSize > maxSizeBytes || recordsWithMetadata.length > this.MAX_CACHE_ENTRIES) {
                console.log(`Cache cleanup needed: ${totalSize} bytes / ${recordsWithMetadata.length} entries`);

                // Sort by timestamp (oldest first)
                recordsWithMetadata.sort((a, b) => a.timestamp - b.timestamp);

                // Perform deletion
                const deleteTransaction = db.transaction(storeName, 'readwrite');
                const deleteStore = deleteTransaction.objectStore(storeName);

                let deletedSize = 0;
                let deletedCount = 0;

                for (const item of recordsWithMetadata) {
                    if (totalSize <= maxSizeBytes * 0.8 && recordsWithMetadata.length - deletedCount <= this.MAX_CACHE_ENTRIES * 0.8) {
                        // Stop once we're below 80% of limits
                        break;
                    }

                    const deleteRequest = deleteStore.delete(item.record.cacheKey);
                    await new Promise(resolve => {
                        deleteRequest.onsuccess = resolve;
                    });

                    deletedSize += item.size;
                    totalSize -= item.size;
                    deletedCount++;
                }

                console.log(`Cache cleanup completed: deleted ${deletedCount} entries (${deletedSize} bytes)`);
            }
        } catch (error) {
            console.log(error, `CacheManager.cleanupIfNeeded for ${storeName}`);
        }
    }

    static async clearCache(storeName = null) {
        try {
            const db = await this.openDB();

            if (storeName) {
                // Clear specific store
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);

                return new Promise((resolve, reject) => {
                    const clearRequest = store.clear();
                    clearRequest.onsuccess = () => {
                        console.log(`Cleared cache for ${storeName}`);
                        resolve();
                    };
                    clearRequest.onerror = () => {
                        console.log(clearRequest.error, `CacheManager.clearCache for ${storeName}`);
                        reject(clearRequest.error);
                    };
                });
            } else {
                // Clear all stores
                const promises = Object.values(this.STORES).map(storeName =>
                    this.clearCache(storeName)
                );

                return Promise.all(promises);
            }
        } catch (error) {
            console.log(error, 'CacheManager.clearCache (outer)');
            throw error;
        }
    }

    static async updateLaunchCache(email, vNumber, resultData) {
        try {
            // Normalize the cache key
            const normalizedEmail = email.toLowerCase().trim();
            const cacheKey = vNumber ?
                `${String(vNumber).toLowerCase()}_${normalizedEmail}` :
                normalizedEmail;

            // Create the record structure
            const record = {
                cacheKey: cacheKey,
                key: cacheKey,
                data: resultData,
                timestamp: Date.now()
            };

            // Estimate data size for cleanup check
            const dataSize = JSON.stringify(record).length;

            // Perform cleanup if needed
            await this.cleanupIfNeeded(this.STORES.LAUNCH, dataSize);

            // Open DB and create transaction in one atomic operation
            const db = await this.openDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORES.LAUNCH], 'readwrite');
                transaction.oncomplete = () => resolve(true);
                transaction.onerror = (event) => {
                    console.log(event.target.error, `CacheManager.updateLaunchCache transaction error for ${cacheKey}`);
                    reject(event.target.error);
                };
                transaction.onabort = (event) => {
                    console.log(event.target.error, `CacheManager.updateLaunchCache transaction aborted for ${cacheKey}`);
                    reject(new Error('Transaction aborted'));
                };

                // Get store and perform operation
                const store = transaction.objectStore(this.STORES.LAUNCH);
                const request = store.put(record);

                request.onerror = (event) => {
                    console.log(event.target.error, `CacheManager.updateLaunchCache store.put error for ${cacheKey}`);
                    // Don't reject here - let transaction handler do it
                };
            });
        } catch (error) {
            console.log(error, `CacheManager.updateLaunchCache outer for ${email}, ${vNumber}`);
            return false;
        }
    }

    static async storeVerifastResult(cacheKey, resultData) {
        try {
            // Create the record structure
            const record = {
                cacheKey: cacheKey,
                key: cacheKey,
                data: resultData,
                timestamp: Date.now()
            };

            // Estimate data size for cleanup check
            const dataSize = JSON.stringify(record).length;

            // Perform cleanup if needed
            await this.cleanupIfNeeded(this.STORES.VERIFAST, dataSize);

            // Open DB and create transaction in one atomic operation
            const db = await this.openDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORES.VERIFAST], 'readwrite');
                transaction.oncomplete = () => resolve(true);
                transaction.onerror = (event) => {
                    console.log(event.target.error, `CacheManager.storeVerifastResult transaction error for ${cacheKey}`);
                    reject(event.target.error);
                };
                transaction.onabort = (event) => {
                    console.log(event.target.error, `CacheManager.storeVerifastResult transaction aborted for ${cacheKey}`);
                    reject(new Error('Transaction aborted'));
                };

                // Get store and perform operation
                const store = transaction.objectStore(this.STORES.VERIFAST);
                const request = store.put(record);

                request.onerror = (event) => {
                    console.log(event.target.error, `CacheManager.storeVerifastResult store.put error for ${cacheKey}`);
                    // Don't reject here - let transaction handler do it
                };
            });
        } catch (error) {
            console.log(error, `CacheManager.storeVerifastResult outer for ${cacheKey}`);
            return false;
        }
    }

    static async updateVerifastCache(email, vNumber, resultData) {
        try {
            const normalizedEmail = email ? email.toLowerCase().trim() : null;
            const cacheKey = CacheManager.getVerifastCacheKey(normalizedEmail, vNumber); // Use helper

            if (!cacheKey) {
                console.warn("Could not generate a valid cache key for Verifast update.");
                return false;
            }
            return await this.storeVerifastResult(cacheKey, resultData);
        } catch (error) {
            console.log(error, `CacheManager.updateVerifastCache for ${email}, ${vNumber}`);
            return false;
        }
    }

    static async getVerifastResult(cacheKey) {
        if (!cacheKey) return null; // Do not attempt to get with a null key
        try {
            const db = await this.openDB();
            const tx = db.transaction(this.STORES.VERIFAST, 'readonly');
            const store = tx.objectStore(this.STORES.VERIFAST);

            return new Promise((resolve, reject) => {
                const request = store.get(cacheKey);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => {
                    console.log(event.target.error, `CacheManager.getVerifastResult for ${cacheKey}`);
                    reject(event.target.error);
                }
            });
        } catch (error) {
            console.log(error, `CacheManager.getVerifastResult outer for ${cacheKey}`);
            return null;
        }
    }

    static async getAllVerifastResults() {
        try {
            const db = await this.openDB();
            const tx = db.transaction(this.STORES.VERIFAST, 'readonly');
            const store = tx.objectStore(this.STORES.VERIFAST);

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const results = {};
                    request.result.forEach(item => { results[item.cacheKey] = item; });
                    resolve(results);
                };
                request.onerror = (event) => {
                    console.log(event.target.error, 'CacheManager.getAllVerifastResults');
                    reject(event.target.error);
                }
            });
        } catch (error) {
            console.log(error, 'CacheManager.getAllVerifastResults outer');
            return {};
        }
    }

    static getVerifastCacheKey(email, vNumber) {
        const normalizedEmail = email ? email.toLowerCase().trim() : null;
        const normalizedVNumber = vNumber ? String(vNumber).toLowerCase().trim() : null;
        if (normalizedVNumber && normalizedEmail) return `${normalizedVNumber}_${normalizedEmail}`;
        if (normalizedEmail) return normalizedEmail;
        if (normalizedVNumber) return normalizedVNumber; // Fallback if only vNumber provided
        return null; // Not enough info for a reliable key
    }

    static getLaunchCacheKey(email, vNumber) {
        // Launch check seems to primarily rely on email, but vNumber can make it more specific.
        const normalizedEmail = email ? email.toLowerCase().trim() : null;
        const normalizedVNumber = vNumber ? String(vNumber).toLowerCase().trim() : null;

        if (normalizedVNumber && normalizedEmail) return `${normalizedVNumber}_${normalizedEmail}`;
        if (normalizedEmail) return normalizedEmail; // Email is primary for Launch
        // Unlike Verifast, Launch without email is less likely to be useful, but can include vNumber if only that is present.
        if (normalizedVNumber) return normalizedVNumber;
        return null;
    }

    static async getLaunchResult(cacheKey) {
        if (!cacheKey) return null;
        try {
            const db = await this.openDB();
            const tx = db.transaction(this.STORES.LAUNCH, 'readonly');
            const store = tx.objectStore(this.STORES.LAUNCH);

            return new Promise((resolve, reject) => {
                const request = store.get(cacheKey);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => {
                    console.log(event.target.error, `CacheManager.getLaunchResult for ${cacheKey}`);
                    reject(event.target.error);
                }
            });
        } catch (error) {
            console.log(error, `CacheManager.getLaunchResult outer for ${cacheKey}`);
            return null;
        }
    }

    static async getAllLaunchResults() {
        try {
            const db = await this.openDB();
            const tx = db.transaction(this.STORES.LAUNCH, 'readonly');
            const store = tx.objectStore(this.STORES.LAUNCH);

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const results = {};
                    request.result.forEach(item => { results[item.cacheKey] = item; });
                    resolve(results);
                };
                request.onerror = (event) => {
                    console.log(event.target.error, 'CacheManager.getAllLaunchResults');
                    reject(event.target.error);
                }
            });
        } catch (error) {
            console.log(error, 'CacheManager.getAllLaunchResults outer');
            return {};
        }
    }

}

window.DataService = DataService;
window.CacheManager = CacheManager;