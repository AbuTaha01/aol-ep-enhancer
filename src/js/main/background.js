try {
  console.log("🚀 Background script loading...");

  const config = {
  LOGIN_URL: 'https://aoltorontoagents.ca/student_contract/login/',
  STUDENT_LOGIN_URL: 'https://myaolcc.ca/studentportal/login/',
  MINE_LIST_URL: 'https://aoltorontoagents.ca/student_contract/chat/mine_list.php',
  T2202_BASE_URL: 'https://t2202.academyoflearning.net',
  CHECK_TICKET: 'checkTicketsAlarm',
  HEALTH_CHECK: 'healthCheckAlarm',
  DEFAULT_CHECK_INTERVAL: 60,  // in seconds
  DEFAULT_COOLDOWN_PERIOD: 300,  // in seconds
  STORAGE_CLEANUP_ALARM_NAME: 'cleanupStorageAlarm',
  STORAGE_CLEANUP_INTERVAL_MINUTES: 24 * 60, // 1 day
  STORAGE_EXPIRATION_TIME_MS: 7 * 24 * 60 * 60 * 1000,
  UPDATE_CHECK: 'updateCheckAlarm',
  UPDATE_CHECK_INTERVAL: 60 * 60 * 1000, // 1 hour
  UPDATE_URL: "https://momentest.net/update.json", // URL to your update JSON file


  HELPDESK: {
    BASE_URL: 'https://hd.academyoflearning.net/HelpDesk',
    ENDPOINTS: {
      LOGIN: '/Login.aspx',
      HOME: '/Home.aspx',
      REQUEST_LIST: '/RequestList.aspx',
      SEARCH_REQUEST: '/SearchRequest.aspx',
      NEW_REQUEST: '/NewRequest.aspx',
      REQUEST_DETAIL: '/RequestDetail.aspx',
      MODIFY_REQUEST: '/ModifyRequest.aspx',
      MY_OPEN_REQUESTS: 'RequestList.aspx?method=UserOpenRequest'
    },
    FORM_PARAMS: {
      PRIORITY: {
        NORMAL: { id: 1, param: 'method=Priority&PriorityID=1' },
        HIGH: { id: 3, param: 'method=Priority&PriorityID=3' },
        EMERGENCY: { id: 2, param: 'method=Priority&PriorityID=2' }
      },
      STATUS: {
        CLOSED: 'method=CloseStatus'
      }
    }
  },

  LAUNCH: {
    BASE_URL: 'https://launch.academyoflearning.net',
    ENDPOINTS: {
      LOGIN: '/Account/Login',
      STUDENT_LIST_COUNT: '/Student/StudentsListCount',
      STUDENT_LIST: '/Student/StudentsList',
      USER_DETAILS: '/Student/GetUserDetails',
      UPDATE_COURSES: '/Student/UpdateCoursesList',
      UPDATE_CONTRACT: '/Student/UpdateProgramContractDetails',
      CHECK_SESSION_TIMEOUT: '/Student/CheckSessionTimeout',
      STUDENT_MANAGER: '/Student/StudentManager',
      SYNC_MYAOLCC: '/Student/SyncMyAlocc',
      EDIT_CONTRACT: '/Student/EditContract',
      GET_REPORT_URL: '/Reports/GetReportUrl'
    }
  },

  VERIFAST: {
    BASE_URL: 'https://app.verifast.com',
    ENDPOINTS: {
      LOGIN: '/loginv1',
      DASHBOARD: '/dashboard/applicantsv1',
      REST: '/rest/applicantTable/restIndexV1'
    }
  },

  API: {
    BASE_URL: 'https://momentest.net',
    ENDPOINTS: {
      LOGIN: '/api/v1/login.php',
      ALL_STUDENTS: '/api/v1/student/',
      STUDENT_SEARCH_INDEXED: '/api/v1/student/search', // SAMPLE - search?student_number=VB2504259&first_name=Aarti&last_name=Nayyar
      STUDENT_SEARCH_DETAILED: '/api/v1/student/', // SAMPLE - student/VB2504259
      COURSES_ALL: '/api/v1/courses/all.php',
      COURSE_SEARCH: '/api/v1/courses/search.php', // SAMPLE - search.php?course_code=WIN&course_name=WIN
      PROGRAMS_ALL: '/api/v1/programs/all.php',
      PROGRAM_SEARCH: '/api/v1/programs/search', // SAMPLE - search.php?program_name=Business
      PROGRAM_COURSES_ALL: '/api/v1/program-courses/all.php',
      PROGRAM_COURSES_SEARCH: '/api/v1/programs/courses/search', // SAMPLE - search.php?program_name=business+administration
      GET_WEEKLY: '/api/v1/weekly/export',
      GET_PROGRESS: '/api/v1/progress/export',
      GET_SCHEDULE: '/api/v1/schedule/process.php?schedule_key=',
      GET_ILP_STUDENTS: '/api/v1/student/all-active/ilp?limit=0',
    }
  },

  ERRORS: {
    INTERNET_CONNECTION_UNAVAILABLE: 'Internet connection unavailable',

    SESSION_EXPIRED: 'Session expired. Please log in again.',
    CREDENTIALS_NOT_FOUND: 'credentials not found. Please check and update your Launch credentials in extension settings.',
    LOGIN_BLOCKED: 'Login blocked due to previous authentication failure. Please update your credentials in extension settings.',
    AUTHENTICATION_FAILED: 'Launch authentication failed. Please check and update your Launch credentials in extension settings.',


    STUDENT_NOT_FOUND: 'Student could not be found in Launch',
    STUDENT_DETAILS_NOT_FOUND: 'Student contract details could not be retrieved from Launch',
  }
};

const STORAGE_KEYS = {
  ALL_COURSES: 'allCourses',
  ALL_PROGRAMS: 'allPrograms',
  PROGRAM_COURSES: 'allProgramCourses',
  ALL_QUIZ_CODES: 'allQuizCodes'
};

const utils = {
  _lastConnectionCheckTime: 0,
  _lastConnectionResult: null,
  _connectionCacheWindow: 5000, // 5 seconds cache validity
  _pendingConnectionCheck: null, // Track pending connection check Promise
  _lastNotifications: new Map(), // Store last notifications by content hash
  _notificationCooldownTime: 300000, // 5 minutes cooldown for same content (in milliseconds)

  createNotificationHash(title, message) {
    return `${title}|${message}`;
  },

  async checkInternetConnection(options = {}) {
    const {
      retryInterval = 30000, // Default: retry 30
      timeout = 5000,       // Default: 5 second timeout for connectivity check
      maxRetries = 30,    // Default: 30 retries
      showNotifications = true,
      testUrl = 'https://www.google.com',
      forceCheck = false    // Add option to bypass cache
    } = options;

    const now = Date.now();

    // First check if we have a valid cached result
    if (!forceCheck &&
      this._lastConnectionResult !== null &&
      now - this._lastConnectionCheckTime < this._connectionCacheWindow) {
      this.logInfo(`Using cached connection status from ${new Date(this._lastConnectionCheckTime).toLocaleTimeString()}`);
      return this._lastConnectionResult;
    }

    // If there's already a connection check in progress, return that promise instead of starting a new one
    if (this._pendingConnectionCheck !== null) {
      this.logInfo('Connection check already in progress, reusing existing Promise');
      return this._pendingConnectionCheck;
    }

    let retryCount = 0;

    // Create the connection check function
    const checkConnection = async () => {
      try {
        await fetch(testUrl, {
          mode: 'no-cors',
          cache: 'no-store',
          signal: AbortSignal.timeout(timeout)
        });

        // Cache the successful result and timestamp
        this._lastConnectionResult = true;
        this._lastConnectionCheckTime = Date.now();
        this._pendingConnectionCheck = null; // Clear the pending check

        this.logInfo('Internet connection available');
        if (retryCount >= 1) {
          await this.showNotification('Connection Established', 'Internet Connection Restored');
        }
        return true;
      } catch (error) {
        this.logInfo('Internet connection unavailable:', error);

        // Cache the failed result and timestamp
        this._lastConnectionResult = false;
        this._lastConnectionCheckTime = Date.now();
        this._pendingConnectionCheck = null; // Clear the pending check

        if (showNotifications && retryCount === 0) {
          await this.showNotification('Connection Error', 'Internet connection unavailable. Please check your network.');
        }

        if (maxRetries !== null && retryCount >= maxRetries) {
          this.logInfo('Maximum retry attempts reached');
          await this.showNotification('Connection Error', 'Internet connection unavailable. Please check your network.');
          return false;
        }

        retryCount++;
        this.logInfo(`Will retry in ${retryInterval / 1000} seconds (attempt ${retryCount}${maxRetries ? '/' + maxRetries : ''})`);

        // Wait for the retry interval
        return new Promise(resolve => {
          setTimeout(async () => {
            // For retries, we'll create a new pending check
            this._pendingConnectionCheck = null;
            const result = await this.checkInternetConnection(options);
            resolve(result);
          }, retryInterval);
        });
      }
    };

    // Store the connection check promise so concurrent calls can reuse it
    this._pendingConnectionCheck = checkConnection();
    return this._pendingConnectionCheck;
  },

  async lastRequest(requestType, cooldownSeconds) {
    try {
      const now = Date.now();
      const cacheData = await this.getStorageData(['requests']);
      const requests = cacheData.requests || {};

      // Bu request type için son istek zamanını kontrol et
      if (requests[requestType]) {
        const timePassed = now - requests[requestType];
        const cooldownMs = cooldownSeconds * 1000;

        if (timePassed < cooldownMs) {
          // Henüz cooldown süresi geçmemiş
          return false;
        }
      }

      // İstek yapılabilir, timestamp'i kaydet
      requests[requestType] = now;
      await this.setStorageData({ requests });

      return true;
    } catch (error) {
      this.logError('lastRequest error:', error);
      return true; // Hata durumunda güvenli taraf - istege izin ver
    }
  },

  async showUnifiedNotification(title, message, options = {}) {
    const { type = 'default', url = null, requireInteraction = false } = options;

    // Create content hash for this notification
    const contentHash = this.createNotificationHash(title, message);
    const now = Date.now();

    // Check if we've shown this exact notification recently
    if (this._lastNotifications.has(contentHash)) {
      const lastShownTime = this._lastNotifications.get(contentHash);
      const timeSinceLastShown = now - lastShownTime;

      if (timeSinceLastShown < this._notificationCooldownTime) {
        const remainingTime = Math.round((this._notificationCooldownTime - timeSinceLastShown) / 1000);
        this.logInfo(`Notification suppressed due to identical content shown recently. Title: "${title}", Time remaining: ${remainingTime} seconds`);
        return null; // Don't show notification
      }
    }

    // Store this notification's timestamp
    this._lastNotifications.set(contentHash, now);

    // Clean up old entries (older than cooldown period)
    for (const [hash, timestamp] of this._lastNotifications.entries()) {
      if (now - timestamp > this._notificationCooldownTime) {
        this._lastNotifications.delete(hash);
      }
    }

    // Determine icon based on type
    let iconUrl;
    switch (type) {
      case 'hd':
        iconUrl = chrome.runtime.getURL('src/icons/hd.png');
        break;
      case 'update':
        iconUrl = chrome.runtime.getURL('src/icons/icon128.png');
        break;
      default:
        iconUrl = chrome.runtime.getURL('src/icons/icon48.png');
    }

    return new Promise((resolve) => {
      chrome.notifications.create({
        type: 'basic',
        iconUrl,
        title,
        message,
        requireInteraction: requireInteraction || (type === 'update') // Updates always require interaction
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          this.logError('Error showing notification:', chrome.runtime.lastError);
        } else {
          this.logInfo(`${type.toUpperCase()} notification shown successfully, ID:`, notificationId);

          // Add click handler if URL is provided
          if (url) {
            const clickHandler = (clickedId) => {
              if (clickedId === notificationId) {
                chrome.tabs.create({ url });
                chrome.notifications.clear(notificationId);
                chrome.notifications.onClicked.removeListener(clickHandler);
              }
            };

            chrome.notifications.onClicked.addListener(clickHandler);
          }
        }
        resolve(notificationId);
      });
    });
  },

  async showNotification(title, message) {
    return this.showUnifiedNotification(title, message, { type: 'default' });
  },

  async showHDNotification(title, message) {
    return this.showUnifiedNotification(title, message, { type: 'hd' });
  },

  async showUpdateNotification(title, message, url) {
    return this.showUnifiedNotification(title, message, {
      type: 'update',
      url,
      requireInteraction: true
    });
  },

  log(level, ...args) {
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    console[level](`[${timestamp}] [${level.toUpperCase()}]`, ...args);
  },

  logInfo(...args) {
    this.log('info', ...args);
  },

  logWarn(...args) {
    this.log('warn', ...args);
  },

  logError(...args) {
    this.log('error', ...args);
  },

  async manageAlarm(start, intervalInSeconds) {
    if (start) {
      await chrome.alarms.clear(config.CHECK_TICKET);
      chrome.alarms.create(config.CHECK_TICKET, { periodInMinutes: intervalInSeconds / 60 });
      this.logInfo(`Alarm set to: ${intervalInSeconds} seconds`);
    } else {
      await chrome.alarms.clear(config.CHECK_TICKET);
      this.logInfo('Alarm cleared.');
    }
  },

  async executeWithErrorHandling(fn, errorMessage) {
    try {
      return await fn();
    } catch (error) {
      this.logError(errorMessage, error);
      await this.showNotification('Error', errorMessage);
      throw error;
    }
  },

  async getStorageData(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          this.logError('Error getting storage data:', chrome.runtime.lastError);
          resolve({});
        } else {
          resolve(result);
        }
      });
    });
  },

  async setStorageData(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          this.logError('Error setting storage data:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }
};

let isStorageInitialized = false;
let extensionState = { isInitialized: false };
let checkIntervalTime = config.DEFAULT_CHECK_INTERVAL;
let cooldownPeriodTime = config.DEFAULT_COOLDOWN_PERIOD;
let isCoolingDown = false;
let cooldownEndTime = 0;
let eventTarget = null;
let viewState = null;
let viewStateGenerator = null;
let eventValidation = null;
let globalAdminId = null;
let activeProgressOperations = {};
let loginFailureTracker = {
  helpDesk: {
    lastFailedCredentials: null,
    isBlocked: false
  },
  launch: {
    lastFailedCredentials: null,
    isBlocked: false
  },
  ep: {
    lastFailedCredentials: null,
    isBlocked: false
  },
  api: {
    lastFailedCredentials: null,
    isBlocked: false
  },
  verifast: {
    lastFailedCredentials: null,
    isBlocked: false
  },
  canvas: {
    lastFailedCredentials: null,
    isBlocked: false
  }
};

class APIManager {
  static async _getValidToken() {
    let token = await utils.getStorageData(['apiToken']);
    if (!token.apiToken) {
      const loginResult = await this.performLogin();
      if (!loginResult.success) {
        return { success: false, error: loginResult.error };
      }
      token.apiToken = loginResult.token;
    }
    return { success: true, token: token.apiToken };
  }

  static async _handleTokenExpiration(originalRequest, params = null) {
    utils.logInfo('API token expired, attempting fresh login...');
    await utils.setStorageData({ 'apiToken': null });
    const loginResult = await this.performLogin();
    if (loginResult.success) {
      // Retry original request
      return originalRequest(params, loginResult.token);
    } else {
      return { success: false, error: 'Authentication failed' };
    }
  }

  static checkAPIHealth() {
    return new Promise((resolve) => {
      fetch(`${config.API.BASE_URL}/health`)
        .then(response => {
          if (!response.ok) {
            resolve({ success: false, error: `Health check failed: ${response.status}` });
            return;
          }
          return response.json();
        })
        .then(result => {
          if (result) {
            resolve({
              success: true,
              data: result
            });
          }
        })
        .catch(error => {
          utils.logError('API health check error:', error);
          resolve({ success: false, error: error.message });
        });
    });
  }

  static async performLogin() {
    try {
      const isOnline = await utils.checkInternetConnection();

      if (!isOnline) {
        return { success: false, error: config.ERRORS.INTERNET_CONNECTION_UNAVAILABLE };
      }

      const { username, password } = await utils.getStorageData(['username', 'password']);

      if (!username || !password) {
        utils.logWarn('API ' + config.ERRORS.CREDENTIALS_NOT_FOUND);
        return { success: false, error: 'API ' + config.ERRORS.CREDENTIALS_NOT_FOUND };
      }

      const currentCredentials = `${username}:${password}`;
      const lastFailedCredentials = loginFailureTracker.api.lastFailedCredentials;

      if (loginFailureTracker.api.isBlocked && lastFailedCredentials === currentCredentials) {
        utils.logWarn('API ' + config.ERRORS.LOGIN_BLOCKED);
        await utils.showNotification(
          'API Login Blocked',
          'Authentication failed. Please check and update your API credentials in extension settings.'
        );
        return { success: false, error: 'API ' + config.ERRORS.LOGIN_BLOCKED };
      }

      const response = await fetch(`${config.API.BASE_URL}${config.API.ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          password: password
        }),
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        utils.logError(`API login failed with status: ${response.status}`);
        return { success: false, error: `Login failed: ${response.status}` };
      }

      const result = await response.json();

      // Check for credential errors
      if (!result.success && result.error === "Invalid username or password") {
        loginFailureTracker.api.isBlocked = true;
        loginFailureTracker.api.lastFailedCredentials = currentCredentials;

        utils.logError('API ' + config.ERRORS.AUTHENTICATION_FAILED);
        await utils.showNotification(
          'API Login Failed',
          'Invalid username or password. Please check and update your API credentials in extension settings.'
        );
        return { success: false, error: 'API ' + config.ERRORS.AUTHENTICATION_FAILED };
      }

      if (result.success && result.token) {
        await utils.setStorageData({
          'apiToken': result.token,
          'adminId': result.admin_id
        });

        globalAdminId = result.admin_id;

        // Clear any login blocks on success
        loginFailureTracker.api.isBlocked = false;
        loginFailureTracker.api.lastFailedCredentials = null;

        utils.logInfo('API token and admin ID stored successfully');
        utils.logInfo('Admin ID:', result.admin_id);

        return {
          success: true,
          data: result,
          token: result.token,
          adminId: result.admin_id
        };
      } else {
        utils.logError('API login failed - no token received');
        return { success: false, error: 'Login failed - no token received' };
      }

    } catch (error) {
      // Set block for network/technical errors only if credentials exist
      if (!error.message.includes('blocked') && !error.message.includes('not found')) {
        const { username, password } = await utils.getStorageData(['username', 'password']);
        if (username && password) {
          loginFailureTracker.api.isBlocked = true;
          loginFailureTracker.api.lastFailedCredentials = `${username}:${password}`;
        }
      }

      utils.logError('API login error:', error);
      return { success: false, error: error.message };
    }
  }

  static getAllCourses() {
    return new Promise((resolve) => {
      this._getValidToken()
        .then(tokenResult => {
          if (!tokenResult.success) {
            resolve(tokenResult);
            return;
          }

          fetch(`${config.API.BASE_URL}${config.API.ENDPOINTS.COURSES_ALL}`, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'authorization': `Bearer ${tokenResult.token}`
            }
          })
            .then(response => {
              if (response.status === 401) {
                return this._handleTokenExpiration(() => this.getAllCourses());
              }

              if (!response.ok) {
                resolve({ success: false, error: `Courses API failed: ${response.status}` });
                return;
              }

              return response.json();
            })
            .then(result => {
              if (result && result.success && result.data) {
                const transformedData = result.data.map(course => ({
                  // Mevcut alanlar
                  courseCode: course.course_code,
                  courseName: course.course_name,
                  courseDuration: course.course_duration || 0,

                  // API'den gelen diğer tüm alanlar
                  courseId: course.course_id,
                  courseType: course.course_type,
                  courseCategory: course.course_category,
                  canSync: course.can_sync,
                  examCodePermission: course.exam_code_permission,
                  activationPermission: course.activation_permission,
                  bookRequirement: course.book_requirement,
                  status: course.status,
                  createdAt: course.created_at,
                  updatedAt: course.updated_at
                }));

                resolve({
                  success: true,
                  data: transformedData
                });
              } else {
                resolve({ success: false, error: 'No courses data received from API' });
              }
            })
            .catch(error => {
              utils.logError('API courses fetch error:', error);
              resolve({ success: false, error: error.message });
            });
        });
    });
  }

  static getAllPrograms() {
    return new Promise((resolve) => {
      this._getValidToken()
        .then(tokenResult => {
          if (!tokenResult.success) {
            resolve(tokenResult);
            return;
          }

          fetch(`${config.API.BASE_URL}${config.API.ENDPOINTS.PROGRAMS_ALL}`, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'authorization': `Bearer ${tokenResult.token}`
            }
          })
            .then(response => {
              if (response.status === 401) {
                return this._handleTokenExpiration(() => this.getAllPrograms());
              }

              if (!response.ok) {
                resolve({ success: false, error: `Programs API failed: ${response.status}` });
                return;
              }

              return response.json();
            })
            .then(result => {
              if (result && result.success && result.programs) {
                const transformedData = result.programs.map(program => ({
                  programId: program.id,
                  programName: program.program_name,
                  alternativeNames: program.alternative_names || [],
                  keyCourses: program.key_courses || {},
                  programType: program.program_type,
                  activeCampuses: program.active_campuses || [],
                  createdAt: program.created_at,
                  updatedAt: program.updated_at
                }));

                resolve({
                  success: true,
                  data: transformedData
                });
              } else {
                resolve({ success: false, error: 'No programs data received from API' });
              }
            })
            .catch(error => {
              utils.logError('API programs fetch error:', error);
              resolve({ success: false, error: error.message });
            });
        });
    });
  }

  static getAllProgramCourses() {
    return new Promise((resolve) => {
      this._getValidToken()
        .then(tokenResult => {
          if (!tokenResult.success) {
            resolve(tokenResult);
            return;
          }

          fetch(`${config.API.BASE_URL}${config.API.ENDPOINTS.PROGRAM_COURSES_ALL}`, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'authorization': `Bearer ${tokenResult.token}`
            }
          })
            .then(response => {
              if (response.status === 401) {
                return this._handleTokenExpiration(() => this.getAllProgramCourses());
              }

              if (!response.ok) {
                resolve({ success: false, error: `Program courses API failed: ${response.status}` });
                return;
              }

              return response.json();
            })
            .then(result => {
              if (result && result.success && result.program_courses) {
                resolve({
                  success: true,
                  data: result.program_courses
                });
              } else {
                resolve({ success: false, error: 'No program courses data received from API' });
              }
            })
            .catch(error => {
              utils.logError('API program courses fetch error:', error);
              resolve({ success: false, error: error.message });
            });
        });
    });
  }

  static getAllQuizCodes() {
    return new Promise((resolve) => {
      this._getValidToken()
        .then(tokenResult => {
          if (!tokenResult.success) {
            resolve(tokenResult);
            return;
          }

          // ✅ FIXED: Use correct endpoint for quiz codes with template IDs
          fetch(`${config.API.BASE_URL}/api/v1/course_code.php`, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'authorization': `Bearer ${tokenResult.token}`
            }
          })
            .then(response => {
              if (response.status === 401) {
                return this._handleTokenExpiration(() => this.getAllQuizCodes());
              }

              if (!response.ok) {
                resolve({ success: false, error: `Quiz codes API failed: ${response.status}` });
                return;
              }

              return response.json();
            })
            .then(result => {
              if (result && result.success && result.data) {
                // ✅ FIXED: Transform data to include ALL fields from API response
                const transformedData = result.data.map(quizCode => ({
                  id: quizCode.id,
                  course_code: quizCode.course_code,
                  course_name: quizCode.course_name,
                  campus: quizCode.campus,
                  exam_id: quizCode.exam_id,
                  quiz_code: quizCode.quiz_code,
                  exam_code: quizCode.exam_code,
                  exam_name: quizCode.exam_name,
                  template_id: quizCode.template_id || null,
                  attachment_required: quizCode.attachment_required || 0,
                  status: quizCode.status || 'active',
                }));

                resolve({
                  success: true,
                  data: transformedData
                });
              } else {
                resolve({ success: false, error: 'No quiz codes data received from API' });
              }
            })
            .catch(error => {
              utils.logError('API quiz codes fetch error:', error);
              resolve({ success: false, error: error.message });
            });
        });
    });
  }

  static async getAdminId() {
    if (globalAdminId) {
      return globalAdminId;
    }

    const storedData = await utils.getStorageData(['adminId']);
    if (storedData.adminId) {
      globalAdminId = storedData.adminId;
      return globalAdminId;
    }

    const loginResult = await this.performLogin();
    if (loginResult.success && loginResult.adminId) {
      return loginResult.adminId;
    }

    return null;
  }

  static async searchStudent(searchParams) {
    const makeRequest = async (params, token = null) => {
      const tokenResult = token ? { success: true, token } : await this._getValidToken();
      if (!tokenResult.success) {
        return tokenResult;
      }

      const searchUrl = new URL(`${config.API.BASE_URL}${config.API.ENDPOINTS.STUDENT_SEARCH_INDEXED}`);
      if (params.student_number) {
        searchUrl.searchParams.append('student_number', params.student_number);
      }
      if (params.first_name) {
        searchUrl.searchParams.append('first_name', params.first_name);
      }
      if (params.last_name) {
        searchUrl.searchParams.append('last_name', params.last_name);
      }

      const response = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${tokenResult.token}`
        }
      });

      if (response.status === 401) {
        return this._handleTokenExpiration(makeRequest, params);
      }

      if (!response.ok) {
        return { success: false, error: `API request failed: ${response.status}` };
      }

      const result = await response.json();
      utils.logInfo('API student search successful');

      return {
        success: result.success,
        data: result.data,
        total: result.total,
        search_criteria: result.search_criteria
      };
    };

    try {
      return await makeRequest(searchParams);
    } catch (error) {
      utils.logError('API student search error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getWeeklyReports() {
    const makeRequest = async (params, token = null) => {
      const tokenResult = token ? { success: true, token } : await this._getValidToken();
      if (!tokenResult.success) {
        return tokenResult;
      }

      const response = await fetch(`${config.API.BASE_URL}${config.API.ENDPOINTS.GET_WEEKLY}`, {
        method: 'GET',
        headers: {
          'accept': 'text/csv',
          'authorization': `Bearer ${tokenResult.token}`
        }
      });

      if (response.status === 401) {
        return this._handleTokenExpiration(makeRequest, params);
      }

      if (!response.ok) {
        return { success: false, error: `API request failed: ${response.status}` };
      }

      const csvData = await response.text();

      utils.logInfo('Weekly reports data fetched successfully');

      return {
        success: true,
        data: csvData,
        fromCache: false
      };
    };

    try {
      const isOnline = await utils.checkInternetConnection();
      if (!isOnline) {
        return { success: false, error: config.ERRORS.INTERNET_CONNECTION_UNAVAILABLE };
      }

      return await makeRequest();
    } catch (error) {
      utils.logError('API weekly reports fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getILPStudents() {
    const shouldMakeRequest = await utils.lastRequest('Get_ILP_Students', 600);

    if (!shouldMakeRequest) {
      // Cache'den veriyi döndür
      const storedData = await utils.getStorageData(['ilp_students']);
      if (storedData.ilp_students) {
        return {
          success: true,
          data: storedData.ilp_students,
          fromCache: true
        };
      }
    }

    const makeRequest = async (params, token = null) => {
      const tokenResult = token ? { success: true, token } : await this._getValidToken();
      if (!tokenResult.success) {
        return tokenResult;
      }

      const response = await fetch(`${config.API.BASE_URL}${config.API.ENDPOINTS.GET_ILP_STUDENTS}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${tokenResult.token}`
        }
      });

      if (response.status === 401) {
        return this._handleTokenExpiration(makeRequest, params);
      }

      if (!response.ok) {
        return { success: false, error: `API request failed: ${response.status}` };
      }

      const result = await response.json();

      if (result.success && result.data) {
        const transformedData = result.data.map(student => ({
          vnumber: student.vnumber,
          program_name: student.program_name
        }));

        await utils.setStorageData({
          'ilp_students': transformedData
        });

        utils.logInfo(`ILP students data stored successfully: ${transformedData.length} records`);

        return {
          success: true,
          data: transformedData,
          fromCache: false
        };
      } else {
        return { success: false, error: 'No ILP students data received from API' };
      }
    };

    try {
      const isOnline = await utils.checkInternetConnection();
      if (!isOnline) {
        return { success: false, error: config.ERRORS.INTERNET_CONNECTION_UNAVAILABLE };
      }

      return await makeRequest();
    } catch (error) {
      utils.logError('API ILP students fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  static async progressSheetData(operationId = null) {
    const makeRequest = async (params, token = null) => {
      const tokenResult = token ? { success: true, token } : await this._getValidToken();
      if (!tokenResult.success) {
        throw new Error(tokenResult.error);
      }

      const response = await fetch(`${config.API.BASE_URL}${config.API.ENDPOINTS.GET_PROGRESS}`, {
        method: 'GET',
        headers: {
          'accept': 'text/csv',
          'authorization': `Bearer ${tokenResult.token}`
        }
      });

      if (response.status === 401) {
        const retryResult = await this._handleTokenExpiration(makeRequest, params);
        if (!retryResult.success) {
          throw new Error(retryResult.error);
        }
        return retryResult;
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      return await response.text();
    };

    try {
      async function updateProgress(progress, message) {
        if (operationId && activeProgressOperations[operationId] === 'canceled') {
          utils.logWarn(`Operation ${operationId} was cancelled - stopping progress update`);
          return;
        }

        const progressData = {
          progress: Math.min(Math.round(progress), 100),
          message: message,
          timestamp: Date.now()
        };

        await chrome.storage.local.set({ 'progressSheetProgress': progressData });

        try {
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length > 0) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'progressUpdate',
                data: progressData
              }).catch(error => {
                if (!error.message.includes("Receiving end does not exist")) {
                  utils.logWarn("Error sending progress update:", error);
                }
              });
            }
          });
        } catch (e) {
          utils.logWarn("Error sending progress update:", e);
        }
      }

      if (operationId && activeProgressOperations[operationId] === 'canceled') {
        utils.logWarn(`Operation ${operationId} was cancelled - stopping before API request`);
        return [];
      }

      await updateProgress(10, "Connecting to API...");

      const csvText = await makeRequest();

      if (operationId && activeProgressOperations[operationId] === 'canceled') {
        utils.logWarn(`Operation ${operationId} was cancelled - stopping before CSV processing`);
        return [];
      }

      await updateProgress(50, "Processing CSV data...");

      function parseCsv(csvText) {
        if (!csvText || typeof csvText !== 'string') return [];

        const lines = csvText.trim().split(/\r?\n/);
        if (lines.length < 2) return [];

        const headers = lines[0].split(';').map(header => header.trim().replace(/^"(.*)"$/, '$1'));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const values = lines[i].split(';').map(value => value.trim().replace(/^"(.*)"$/, '$1'));

          if (values.length === headers.length) {
            const entry = {};
            for (let j = 0; j < headers.length; j++) {
              if (headers[j]) {
                entry[headers[j]] = values[j];
              }
            }
            if (Object.keys(entry).length > 0) {
              data.push(entry);
            }
          }
        }
        return data;
      }

      const allData = parseCsv(csvText);

      if (operationId && activeProgressOperations[operationId] === 'canceled') {
        utils.logWarn(`Operation ${operationId} was cancelled - stopping before final processing`);
        return [];
      }

      await updateProgress(90, `Processing ${allData.length} records...`);

      const progressSheetData = allData.map(item => ({
        Vnumber: item.Vnumber || item.VNumber || item.vnumber || '',
        Contact: item.Contact || item.contact || '',
        CourseID: item.CourseID || item.courseId || item.course_id || '',
        ContractCourseID: item.ContractCourseID || item.contractCourseId || item.contract_course_id || '',
        Course: item.Course || item.course || '',
        CourseStatus: item.CourseStatus || item.courseStatus || item.course_status || '',
        StartDate: item.StartDate || item.startDate || item.start_date || '',
        EndDate: item.EndDate || item.endDate || item.end_date || '',
        Grade: item.Grade || item.grade || ''
      }));

      await updateProgress(100, `Successfully processed ${progressSheetData.length} records from API. Preparing to get student details...`);
      return progressSheetData;

    } catch (error) {
      utils.logError("Error in API progressSheetData:", error);

      try {
        const progressData = {
          progress: 100,
          message: `Error: ${error.message}`,
          isError: true,
          timestamp: Date.now()
        };

        await chrome.storage.local.set({ 'progressSheetProgress': progressData });

        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            action: 'progressError',
            data: { error: error.message }
          });
        }
      } catch (e) {
        utils.logError("Error sending progress error:", e);
      }
      throw error;
    }
  }
}

class EPManager {
  static async performLogin() {
    utils.logInfo("Starting login process...");

    // First check internet connection 
    const isOnline = await utils.checkInternetConnection();

    if (!isOnline) {
      return { success: false, error: config.ERRORS.INTERNET_CONNECTION_UNAVAILABLE };
    }

    const { username, password } = await utils.getStorageData(['username', 'password']);

    if (!username || !password) {
      utils.logInfo('Username or password not set. Cannot perform login.');
      return { success: false, error: 'EP ' + config.ERRORS.CREDENTIALS_NOT_FOUND };
    }

    const currentCredentials = `${username}:${password}`;
    const lastFailedCredentials = loginFailureTracker.ep.lastFailedCredentials;

    if (loginFailureTracker.ep.isBlocked && lastFailedCredentials === currentCredentials) {
      utils.logWarn('EP ' + config.ERRORS.LOGIN_BLOCKED);
      await utils.showNotification(
        'EP Login Blocked',
        'Authentication failed. Please check and update your EP credentials in extension settings.'
      );
      return { success: false, error: 'EP ' + config.ERRORS.LOGIN_BLOCKED };
    }

    try {
      const loginResponse = await fetch(config.LOGIN_URL + 'loginquery.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `emailForm=${encodeURIComponent(username)}&pwdform=${encodeURIComponent(password)}`
      });

      utils.logInfo('Login response received:', loginResponse.status);

      if (!loginResponse.ok) {
        utils.logInfo('EP login failed.');
        return { success: false, error: 'EP login failed' };
      }

      const responseText = await loginResponse.text();

      // Check for credential errors (EP returns 403 for invalid credentials)
      if (responseText.trim() === '403') {
        loginFailureTracker.ep.isBlocked = true;
        loginFailureTracker.ep.lastFailedCredentials = currentCredentials;

        utils.logError('EP ' + config.ERRORS.AUTHENTICATION_FAILED);
        await utils.showNotification(
          'EP Login Failed',
          'Invalid username or password. Please check and update your EP credentials in extension settings.'
        );
        return { success: false, error: 'EP ' + config.ERRORS.AUTHENTICATION_FAILED };
      }

      // Clear any login blocks on success
      loginFailureTracker.ep.isBlocked = false;
      loginFailureTracker.ep.lastFailedCredentials = null;

      utils.logInfo('EP login successful.');
      return { success: true };

    } catch (error) {
      // Set block for network/technical errors only if credentials exist
      if (!error.message.includes('blocked') && !error.message.includes('not found')) {
        loginFailureTracker.ep.isBlocked = true;
        loginFailureTracker.ep.lastFailedCredentials = currentCredentials;
      }

      utils.logError('Error during login:', error);
      return { success: false, error: error.message };
    }
  }

  static async checkTickets() {
    await utils.executeWithErrorHandling(async () => {
      utils.logInfo('Checking for tickets...');
      utils.logInfo('Current cooldown status:', isCoolingDown);
      utils.logInfo('Current time:', new Date(Date.now()).toLocaleString());
      utils.logInfo('Cooldown end time:', new Date(cooldownEndTime).toLocaleString());

      if (Date.now() < cooldownEndTime) {
        utils.logInfo('System is in cooldown. Skipping check.');
        return;
      }

      const { isActive } = await utils.getStorageData(['isActive']);
      if (!isActive) {
        utils.logInfo('Extension is not active. Skipping check.');
        return;
      }

      const loginSuccessful = await EPManager.performLogin();
      if (!loginSuccessful) {
        utils.logInfo('Login failed. Showing notification.');
        await utils.showNotification('Login Failed', 'Please check your username and password.');
        return;
      }

      const hdLoginResult = await HelpDeskManager.helpDeskLogin();
      if (hdLoginResult.success) {
        const storage = await chrome.storage.local.get(null);

        for (const [key, value] of Object.entries(storage)) {
          if (key.startsWith('notification-') && !key.endsWith('-subject') && !key.endsWith('-length') && value === true) {
            const requestId = key.replace('notification-', '');
            const subject = storage[`notification-${requestId}-subject`] || '';
            const oldLength = storage[`notification-${requestId}-length`] || 0;

            const response = await HelpDeskManager.helpDeskPageContent(
              this.getUrl(config.HELPDESK.ENDPOINTS.REQUEST_DETAIL + `?RefNumber=${requestId}`)
            );

            if (response.success) {
              const newLength = response.content.length;

              if (newLength > oldLength) {
                await chrome.storage.local.remove([
                  `notification-${requestId}`,
                  `notification-${requestId}-subject`,
                  `notification-${requestId}-length`
                ]);

                await utils.showHDNotification(
                  'Request Updated',
                  `Request #${requestId} "${subject}" has been updated.`
                );
              }
            }
          }
        }
      }

      const formData = new FormData();
      formData.append('draw', '12');
      formData.append('columns[0][data]', 'sr');
      formData.append('columns[0][name]', '');
      formData.append('status', '1');
      formData.append('file_name_page', 'mine_list');

      utils.logInfo('Sending request to ticket_list_responce.php...');
      const response = await fetch('https://aoltorontoagents.ca/student_contract/chat/ticket_list_responce.php', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      utils.logInfo('Response received from ticket_list_responce.php:', response.status);
      const data = await response.json();
      const ticketCount = parseInt(data.iTotalDisplayRecords, 10);
      utils.logInfo('Ticket count:', ticketCount);

      if (ticketCount > 0) {
        await utils.showNotification('New Ticket!', `You have ${ticketCount} tickets!\nPlease click here to view your tickets!`);
        await startCooldown();
      } else {
        await utils.manageAlarm(true, checkIntervalTime);
      }
    }, 'Error in checkTickets');
  }
}

class HelpDeskManager {
  // Session data için static property
  static sessionData = {
    viewState: null,
    viewStateGenerator: null,
    eventValidation: null,
    lastUpdated: null
  };

  // URL helper method
  static getUrl(endpoint, params = '') {
    const url = `${config.HELPDESK.BASE_URL}${endpoint}`;
    return params ? `${url}?${params}` : url;
  }

  // Form data extraction
  static extractFormData(html) {
    const formData = {
      viewState: html.match(/id="__VIEWSTATE" value="(.*?)"/)?.[1],
      viewStateGenerator: html.match(/id="__VIEWSTATEGENERATOR" value="(.*?)"/)?.[1],
      eventValidation: html.match(/id="__EVENTVALIDATION" value="(.*?)"/)?.[1]
    };

    if (!formData.viewState || !formData.viewStateGenerator || !formData.eventValidation) {
      utils.logWarn('Required form values could not be extracted.');
      return false;
    }

    return formData;
  }

  // Update form data
  static async updateFormData(html) {
    try {
      const formData = this.extractFormData(html);
      Object.assign(this.sessionData, formData, { lastUpdated: Date.now() });
      return true;
    } catch (error) {
      utils.logError('Error updating form data:', error);
      return false;
    }
  }

  // Get form data
  static getFormData() {
    return {
      "__VIEWSTATE": this.sessionData.viewState || '',
      "__VIEWSTATEGENERATOR": this.sessionData.viewStateGenerator || '',
      "__EVENTVALIDATION": this.sessionData.eventValidation || ''
    };
  }

  // Handle re-login
  static async handleReLogin() {
    try {
      const { launchUsername, launchPassword } = await utils.getStorageData(['launchUsername', 'launchPassword']);

      if (!launchUsername || !launchPassword) {
        utils.logWarn('Launch ' + config.ERRORS.CREDENTIALS_NOT_FOUND);
        return { success: false, error: 'Launch ' + config.ERRORS.CREDENTIALS_NOT_FOUND };
      }

      const currentCredentials = `${launchUsername}:${launchPassword}`;
      const lastFailedCredentials = loginFailureTracker.helpDesk.lastFailedCredentials;

      if (loginFailureTracker.helpDesk.isBlocked && lastFailedCredentials === currentCredentials) {
        utils.logWarn(config.ERRORS.LOGIN_BLOCKED);
        await utils.showHDNotification(
          'Login Blocked',
          'Authentication failed. Please check and update your Launch credentials in extension settings.'
        );
        return { success: false, error: config.ERRORS.LOGIN_BLOCKED };
      }

      const isOnline = await utils.checkInternetConnection();

      if (!isOnline) {
        return { success: false, error: config.ERRORS.INTERNET_CONNECTION_UNAVAILABLE };
      }

      const loginUrl = this.getUrl(config.HELPDESK.ENDPOINTS.LOGIN);
      const loginPageResponse = await fetch(loginUrl, {
        credentials: 'include'
      });

      const loginPageHtml = await loginPageResponse.text();
      const formData = this.extractFormData(loginPageHtml);

      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          "__VIEWSTATE": formData.viewState,
          "__VIEWSTATEGENERATOR": formData.viewStateGenerator,
          "__EVENTVALIDATION": formData.eventValidation,
          "txtUsername": launchUsername,
          "txtPassword": launchPassword,
          "btnLogon": "Log On"
        }),
        credentials: 'include',
        redirect: 'follow'
      });

      const isLoginSuccessful = loginResponse.url.includes(config.HELPDESK.ENDPOINTS.HOME);

      if (isLoginSuccessful) {
        const responseText = await loginResponse.text();
        await this.updateFormData(responseText);

        loginFailureTracker.helpDesk.isBlocked = false;
        loginFailureTracker.helpDesk.lastFailedCredentials = null;

        return true;
      } else {
        loginFailureTracker.helpDesk.isBlocked = true;
        loginFailureTracker.helpDesk.lastFailedCredentials = currentCredentials;

        utils.logWarn(config.ERRORS.AUTHENTICATION_FAILED);
        await utils.showHDNotification(
          'HelpDesk Login Failed',
          config.ERRORS.AUTHENTICATION_FAILED
        );
        return { success: false, error: config.ERRORS.AUTHENTICATION_FAILED };
      }
    } catch (error) {
      utils.logError('Re-login error:', error);

      if (!error.message.includes('blocked') && !error.message.includes('credentials not found')) {
        const { launchUsername, launchPassword } = await utils.getStorageData(['launchUsername', 'launchPassword']);
        if (launchUsername && launchPassword) {
          loginFailureTracker.helpDesk.isBlocked = true;
          loginFailureTracker.helpDesk.lastFailedCredentials = `${launchUsername}:${launchPassword}`;
        }
      }

      return false;
    }
  }

  // Handle requests
  static async handleRequest(url, options = {}) {
    try {
      const isOnline = await utils.checkInternetConnection({ maxRetries: 3 });

      if (!isOnline) {
        return { success: false, error: config.ERRORS.INTERNET_CONNECTION_UNAVAILABLE };
      }

      const defaultHeaders = {
        'content-type': 'application/x-www-form-urlencoded',
      };

      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers
        },
        credentials: 'include'
      });

      if (response.url.includes(config.HELPDESK.ENDPOINTS.LOGIN)) {
        const loginSuccess = await this.handleReLogin();
        if (!loginSuccess) {
          utils.logWarn(config.ERRORS.SESSION_EXPIRED);
          return { success: false, error: config.ERRORS.SESSION_EXPIRED };
        }
        return this.handleRequest(url, options);
      }

      const responseText = await response.text();

      if (responseText.includes('__VIEWSTATE')) {
        await this.updateFormData(responseText);
      }

      return {
        success: true,
        content: responseText,
        url: response.url,
        isDetailPage: responseText.includes('Help Desk - Request Detail')
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async helpDeskLogin() {
    try {
      const isOnline = await utils.checkInternetConnection();

      if (!isOnline) {
        return { success: false, error: config.ERRORS.INTERNET_CONNECTION_UNAVAILABLE };
      }

      const loginSuccess = await this.handleReLogin();
      return {
        success: loginSuccess,
        message: loginSuccess ? "Login successful" : config.ERRORS.AUTHENTICATION_FAILED,
        homePageUrl: loginSuccess ? this.getUrl(config.HELPDESK.ENDPOINTS.HOME) : null
      };
    } catch (error) {
      utils.logError('Help Desk login error:', error);
      return { success: false, error: error.message };
    }
  }

  static async helpDeskDashboard() {
    try {
      const dashboardResponse = await this.handleRequest(
        this.getUrl(config.HELPDESK.ENDPOINTS.HOME)
      );

      const searchResponse = await this.handleRequest(
        this.getUrl(config.HELPDESK.ENDPOINTS.SEARCH_REQUEST)
      );

      if (!dashboardResponse.success || !searchResponse.success) {
        utils.logError(`Error: ${dashboardResponse.error || searchResponse.error}`);
      }

      return {
        success: true,
        dashboardContent: dashboardResponse.content,
        searchContent: searchResponse.content
      };
    } catch (error) {
      utils.logError('Error fetching Help Desk content:', error);
      return { success: false, error: error.message };
    }
  }

  static async helpDeskPageContent(url, method = 'GET', data = null, headers = null) {
    try {
      let fetchOptions = {
        method: method,
        credentials: 'include',
        redirect: 'follow'
      };

      if (url.includes(config.HELPDESK.ENDPOINTS.SEARCH_REQUEST) && method === 'POST') {
        // Mevcut search request mantığını koru
        const searchPageResponse = await this.handleRequest(url, { method: 'GET' });
        if (searchPageResponse.success) {
          await this.updateFormData(searchPageResponse.content);
        }

        const stateData = this.getFormData();
        let formData = {};

        if (data?.type === 'myRequests') {
          const { launchUsername } = await utils.getStorageData(['launchUsername']);

          if (data.showOnlyOpen) {
            // Make a GET request to MY_OPEN_REQUESTS endpoint
            const response = await this.handleRequest(
              this.getUrl(config.HELPDESK.ENDPOINTS.MY_OPEN_REQUESTS),
              { method: 'GET' }
            );
            return response;
          }

          // Original logic for all tickets
          formData = {
            ...stateData,
            cbMatchAny: 'on',
            txtKeyword: launchUsername || '',
            ddlRequestStatus: '0',
            btnSearch: 'Search'
          };
        } else if (data?.type === 'search') {
          formData = {
            ...stateData,
            cbMatchAny: data.matchAny ? 'on' : '',
            txtKeyword: data.keyword || '',
            txtDate: data.date || '',
            ddlRequestStatus: data.requestStatus || '0',
            ddlPriority: data.priority || '0',
            ddlCategory: data.category || '0',
            ddlServicedBy: data.actionRequestTo || '0',
            txtRefNumber: data.referenceNumber || '',
            btnSearch: 'Search'
          };
        }

        if (data.__EVENTTARGET) {
          formData.__EVENTTARGET = data.__EVENTTARGET;
          formData.__EVENTARGUMENT = '';
        }

        fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        fetchOptions.body = new URLSearchParams(formData);
      }
      else if (url.includes(config.HELPDESK.ENDPOINTS.NEW_REQUEST) && method === 'POST') {
        // Form state verilerini al  
        const stateData = this.getFormData();

        const formData = new FormData();
        formData.append('__EVENTTARGET', '');
        formData.append('__EVENTARGUMENT', '');
        formData.append('__VIEWSTATE', stateData.__VIEWSTATE);
        formData.append('__VIEWSTATEGENERATOR', stateData.__VIEWSTATEGENERATOR);
        formData.append('__EVENTVALIDATION', stateData.__EVENTVALIDATION);
        formData.append('ddlPriority', data.ddlPriority || '1');
        formData.append('txtName', data.txtName);
        formData.append('txtEmailAddress', data.txtEmailAddress);
        formData.append('ddlCategory', data.ddlCategory);
        formData.append('txtSubject', data.txtSubject);
        formData.append('txtDescription', data.txtDescription);

        let response = null;

        if (data.file) {
          var bytes = Uint8Array.from(atob(data.file.base64), (c) => c.charCodeAt(0));
          var blob = new Blob([bytes], { type: data.file.type });

          formData.append('File1', blob, data.file.name);
          formData.append('btnSubmit', 'Submit');

          response = await fetch(url, {
            method: "POST",
            body: formData,
            credentials: "include"
          });

        } else {
          formData.append('btnSubmit', 'Submit');
          // Normal form gönderimi
          response = await fetch(url, {
            method: "POST",
            body: formData,
            credentials: "include"
          });
        }

        const responseText = await response.text();
        const requestIdMatch = responseText.match(/RefNumber=(\d+)/);

        return {
          success: true,
          content: responseText,
          url: requestIdMatch ? `RequestDetail.aspx?RefNumber=${requestIdMatch[1]}` : null
        };

      }

      else if ((url.includes(config.HELPDESK.ENDPOINTS.REQUEST_DETAIL) || url.includes(config.HELPDESK.ENDPOINTS.MODIFY_REQUEST)) && method === 'POST') {
        let response = null;
        if (data?.modify === true) {
          try {
            const currentState = this.getFormData();

            response = await fetch(url, {
              method: "POST",
              headers: {
                "content-type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                ...currentState,
                btnModify: "Modify Request"
              }),
              credentials: "include"
            });

            const responseText = await response.text();

            // ViewState değerlerini otomatik güncelle
            if (responseText.includes('__VIEWSTATE')) {
              await this.updateFormData(responseText);
            }

            return {
              success: true,
              content: responseText
            };
          } catch (error) {
            utils.logError('Fetch error:', error);
            throw error;
          }
        }

        if (data?.close === true) {
          try {
            const currentState = this.getFormData();

            response = await fetch(url, {
              method: "POST",
              headers: {
                "content-type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                ...currentState,
                btnClose: "Close Request"
              }),
              credentials: "include"
            });

            const responseText = await response.text();

            // ViewState değerlerini otomatik güncelle
            if (responseText.includes('__VIEWSTATE')) {
              await this.updateFormData(responseText);
            }

            return {
              success: true,
              content: responseText
            };
          } catch (error) {
            utils.logError('Fetch error:', error);
            throw error;
          }
        }

        const stateData = this.getFormData();
        const formData = new FormData();
        formData.append('__EVENTTARGET', '');
        formData.append('__EVENTARGUMENT', '');
        formData.append('__VIEWSTATE', stateData.__VIEWSTATE);
        formData.append('__VIEWSTATEGENERATOR', stateData.__VIEWSTATEGENERATOR);
        formData.append('__EVENTVALIDATION', stateData.__EVENTVALIDATION);
        formData.append('ddlPriority', data.ddlPriority || '1');
        formData.append('txtName', data.txtName);
        formData.append('txtEmailAddress', data.txtEmailAddress);
        formData.append('ddlCategory', data.ddlCategory);
        formData.append('txtSubject', data.txtSubject);
        formData.append('txtDescription', data.txtDescription);
        // Buffer'dan File objesi oluştur

        if (data.file) {
          var bytes = Uint8Array.from(atob(data.file.base64), (c) => c.charCodeAt(0));
          var blob = new Blob([bytes], { type: data.file.type });

          formData.append('File1', blob, data.file.name);
          formData.append('btnSubmit', 'Submit');

          response = await fetch(url, {
            method: "POST",
            body: formData,
            credentials: "include"
          });

        } else {
          formData.append('btnSubmit', 'Submit');
          // Normal form gönderimi
          response = await fetch(url, {
            method: "POST",
            body: formData,
            credentials: "include"
          });
        }

        const responseText = await response.text();
        const requestIdMatch = responseText.match(/RefNumber=(\d+)/);

        return {
          success: true,
          content: responseText,
          url: requestIdMatch ? `RequestDetail.aspx?RefNumber=${requestIdMatch[1]}` : null
        };
      }

      else if (method === 'POST') {
        // Diğer POST istekleri için mevcut mantığı koru
        if (data instanceof URLSearchParams) {
          fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
          fetchOptions.body = data;
        } else {
          const formData = {
            ...this.getFormData(),
            ...(typeof data === 'object' ? data : {})
          };

          fetchOptions = {
            ...fetchOptions,
            mode: "cors",
            headers: {
              "content-type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(formData)
          };
        }
      }

      const response = await fetch(url, fetchOptions);
      const responseText = await response.text();

      const addedMatch = responseText.match(/alert\('The request has been added\.'\);/);
      const refNumberMatch = responseText.match(/window\.location\.href='RequestDetail\.aspx\?RefNumber=(\d+)'/);

      if (addedMatch && refNumberMatch) {
        return {
          success: true,
          content: responseText,
          url: `${url.split('/').slice(0, -1).join('/')}/RequestDetail.aspx?RefNumber=${refNumberMatch[1]}`,
          isDetailPage: true,
          requestId: refNumberMatch[1]
        };
      }

      if (responseText.includes('__VIEWSTATE')) {
        await this.updateFormData(responseText);
      }

      return {
        success: true,
        content: responseText,
        url: response.url,
        isDetailPage: responseText.includes('Help Desk - Request Detail')
      };

    } catch (error) {
      utils.logError('helpDeskContent error:', error);
      return {
        success: false,
        error: error.message,
        url: url
      };
    }
  }

  static async helpDeskNewRequest(sendResponse) {
    try {
      const response = await this.handleRequest(
        this.getUrl(config.HELPDESK.ENDPOINTS.NEW_REQUEST)
      );

      // Check if redirected to login page (302 status)
      if (response.url?.includes(config.HELPDESK.ENDPOINTS.LOGIN)) {
        // Attempt to login
        const loginResult = await HelpDeskManager.helpDeskLogin();
        if (loginResult.success) {
          // If login successful, try fetching the form again
          const newResponse = await this.handleRequest(
            this.getUrl(config.HELPDESK.ENDPOINTS.NEW_REQUEST)
          );

          if (!newResponse.success) {
            utils.logError(`Error fetching New Request form after login: ${newResponse.error}`);
          }

          sendResponse({
            success: true,
            formContent: newResponse.content
          });
          return;
        } else {
          utils.logError('Login failed while fetching New Request form');
        }
      }

      if (!response.success) {
        utils.logError(`Error fetching New Request form: ${response.error}`);
      }

      sendResponse({
        success: true,
        formContent: response.content
      });
      return;
    } catch (error) {
      utils.logError('Error fetching New Request form:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

class LaunchManager {
  static async loginToPortal() {
    try {
      const launchUsername = await chrome.storage.local.get('launchUsername');
      const launchPassword = await chrome.storage.local.get('launchPassword');

      if (!launchUsername.launchUsername || !launchPassword.launchPassword) {
        utils.logWarn('Launch ' + config.ERRORS.CREDENTIALS_NOT_FOUND);
        return { success: false, error: 'Launch ' + config.ERRORS.CREDENTIALS_NOT_FOUND };
      }

      const currentCredentials = `${launchUsername.launchUsername}:${launchPassword.launchPassword}`;
      const lastFailedCredentials = loginFailureTracker.launch.lastFailedCredentials;

      if (loginFailureTracker.launch.isBlocked && lastFailedCredentials === currentCredentials) {
        await utils.showHDNotification(
          'Launch Login Blocked',
          'Authentication failed. Please check and update your Launch credentials in extension settings.'
        );

        return { success: false, error: config.ERRORS.LOGIN_BLOCKED };
      }

      const sessionCheck = await fetch(`${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.CHECK_SESSION_TIMEOUT}`, {
        method: 'GET',
        credentials: 'include'
      });

      const isSessionValid = await sessionCheck.json();

      if (isSessionValid === true) {
        loginFailureTracker.launch.isBlocked = false;
        loginFailureTracker.launch.lastFailedCredentials = null;
        return { success: true };
      }

      const loginResponse = await fetch(`${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `username=${encodeURIComponent(launchUsername.launchUsername)}&password=${encodeURIComponent(launchPassword.launchPassword)}`,
        credentials: 'include'
      });

      const responseText = await loginResponse.text();

      // ✅ FIX: Check for specific error messages
      if (responseText.includes('alert alert-danger')) {
        const errorMatch = responseText.match(/<div class="alert alert-danger">(.*?)<\/div>/);
        const errorMessage = errorMatch ? errorMatch[1].trim() : 'Login failed';

        // ✅ Check for specific credential error
        if (errorMessage.includes('Supplied SessionID, Username or Password are invalid!')) {
          loginFailureTracker.launch.isBlocked = true;
          loginFailureTracker.launch.lastFailedCredentials = currentCredentials;

          utils.logError(`Launch login failed: Invalid credentials - ${errorMessage}`);
          await utils.showHDNotification(
            'Launch Login Failed',
            'Invalid username or password. Please check and update your Launch credentials in extension settings.'
          );
          return {
            success: false,
            error: 'Invalid Launch credentials. Please check and update your Launch credentials in extension settings.'
          };
        }

        // ✅ Handle other specific error types
        if (errorMessage.includes('account is locked') || errorMessage.includes('Account locked')) {
          utils.logError(`Launch login failed: Account locked - ${errorMessage}`);
          await utils.showHDNotification(
            'Launch Account Locked',
            'Your Launch account is locked. Please contact support.'
          );
          return {
            success: false,
            error: 'Launch account is locked. Please contact support.'
          };
        }

        if (errorMessage.includes('session expired') || errorMessage.includes('Session expired')) {
          utils.logError(`Launch login failed: Session expired - ${errorMessage}`);
          return {
            success: false,
            error: 'Launch session expired. Please try again.'
          };
        }

        if (errorMessage.includes('maintenance') || errorMessage.includes('Maintenance')) {
          utils.logError(`Launch login failed: System maintenance - ${errorMessage}`);
          await utils.showHDNotification(
            'Launch System Maintenance',
            'Launch system is under maintenance. Please try again later.'
          );
          return {
            success: false,
            error: 'Launch system is under maintenance. Please try again later.'
          };
        }

        // ✅ Generic error for unknown cases
        loginFailureTracker.launch.isBlocked = true;
        loginFailureTracker.launch.lastFailedCredentials = currentCredentials;

        utils.logError(`Launch login failed: ${errorMessage}`);
        await utils.showHDNotification(
          'Launch Login Error',
          `Login failed: ${errorMessage}`
        );
        return {
          success: false,
          error: `Launch login failed: ${errorMessage}`
        };
      }

      // ✅ Success case
      loginFailureTracker.launch.isBlocked = false;
      loginFailureTracker.launch.lastFailedCredentials = null;

      return { success: true };

    } catch (error) {
      // ✅ Network or other technical errors
      if (!error.message.includes('blocked') && !error.message.includes('not found')) {
        const launchUsername = await chrome.storage.local.get('launchUsername');
        const launchPassword = await chrome.storage.local.get('launchPassword');
        if (launchUsername.launchUsername && launchPassword.launchPassword) {
          loginFailureTracker.launch.isBlocked = true;
          loginFailureTracker.launch.lastFailedCredentials = `${launchUsername.launchUsername}:${launchPassword.launchPassword}`;
        }
      }

      // ✅ Don't show notification for blocked errors (already shown above)
      if (!error.message.includes('blocked')) {
        await utils.showHDNotification('Launch Connection Error', 'Unable to connect to Launch. Please check your internet connection.');
      }

      utils.logError('Launch login error:', error);
      return { success: false, error: error.message };
    }
  }

  static async findStudentFetch(credentials) {
    try {
      const loginResult = await this.loginToPortal();
      if (!loginResult.success) {
        return {
          success: false,
          loginError: true,
          message: loginResult.message || 'Login failed'
        };
      }
      const body = new URLSearchParams({
        'searchfilter[schoolID]': '5703',
        'searchfilter[schoolName]': 'Bhatti Group',
        'searchfilter[isSubSchool]': 'true',
        'searchfilter[status]': credentials.status || 'active'
      });

      if (credentials.vNumber) {
        body.append('searchfilter[contract]', credentials.vNumber);
      }

      if (credentials.firstName) {
        body.append('searchfilter[firstName]', credentials.firstName);
      }

      if (credentials.lastName) {
        body.append('searchfilter[lastName]', credentials.lastName);
      }

      if (credentials.email) {
        body.append('searchfilter[email]', credentials.email);
      }

      const response = await fetch(`${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.STUDENT_LIST}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
      return response.text();
    } catch (error) {
      utils.logError(error, 'LaunchManager.findStudentFetch');
      return { success: false, error: error.message };
    }
  }

  static async updateLaunchData(data) {
    try {
      const { launchData, newData } = data;
      utils.logInfo(data);

      if (!newData.fundingSourceId) return { success: false, error: 'Funding source is required' };

      const loginResult = await this.loginToPortal();

      if (!loginResult.success) {
        await utils.showHDNotification('Login Error', loginResult.error);
        return loginResult; // { success: false, error: errorMessage }
      }
      utils.logInfo('Login successful, proceeding with data update...');
      utils.logInfo(launchData, newData);

      const userDetailsHtml = await this.getUserDetails(launchData, launchData.vNumber);
      const studentDetailsMatch = userDetailsHtml.match(/<input type="hidden" name="hidProgramContractModel" id="hidProgramContractModel" value='(.+?)' \/>/);

      utils.logInfo(userDetailsHtml);

      if (!studentDetailsMatch) {
        return { success: false, error: config.ERRORS.STUDENT_DETAILS_NOT_FOUND };
      }

      const studentData = JSON.parse(studentDetailsMatch[1]);
      const programIndex = studentData.studentProgram.findIndex(program => program.programName === launchData.programName);

      if (programIndex === -1) {
        return { success: false, error: 'No valid programs found' }
      }

      const contractIndex = studentData.studentProgram[programIndex].studentContracts.findIndex(contract => contract.status === "In Progress");

      if (contractIndex === -1) {
        return { success: false, error: 'No valid contract found' }
      }

      const { userID } = studentData;
      const { contractID, programtypeid, programID } = studentData.studentProgram[programIndex];
      const { uniqueID, userProgramID, uniqueProgramId } = studentData.studentProgram[programIndex].studentContracts[contractIndex];

      utils.logInfo(userID, contractID, programtypeid, programID, uniqueID, userProgramID, uniqueProgramId);

      const feesDataHtml = await fetch(`${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.EDIT_CONTRACT}`, {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        body: `contractID=${contractID}&uniqueID=${uniqueID}&userProgramID=${userProgramID}&programUniqueID=${uniqueProgramId}&userid=${userID}&programTypeID=${programtypeid}&programid=${programID}&studentViewModelSerialized=${encodeURIComponent(JSON.stringify(studentData))}`,
        method: "POST",
      }).then(response => response.text());

      const feesData = feesDataHtml.matchAll(/<input class="textboxwidth1 fees".*id="(.*?)" name="(.*?)" type="text" value="(.*?)" \/>/g);
      const hours = feesDataHtml.match(/<input class="textboxwidth".*name="Hours" type="text" value="(.*?)" \/>/)[1];
      utils.logInfo('Hours: ', hours);

      const cplDiscountHtml = feesDataHtml.match(/<input class="textboxwidth1 discountfees".*id="cplDiscount" name="ContractFees.CPLDiscount" type="text" value="(.*?)" \/>/);
      const cplDiscount = Number(cplDiscountHtml[1]);

      const otherDiscountHtml = feesDataHtml.match(/<input class="textboxwidth1 discountfees".*id="ContractFees_OtherDiscounts" name="ContractFees.OtherDiscounts" type="text" value="(.*?)" \/>/);
      const otherDiscount = Number(otherDiscountHtml[1]);

      utils.logInfo('Discounts: ', cplDiscount, otherDiscount);

      if (cplDiscount || otherDiscount) {
        return { success: false, error: "Discount case..." }
      }

      const contractFees = {
        "cost": 0,
        "registrationFee": -1,
        "booksFee": -1,
        "suppliesFee": -1,
        "labFee": -1,
        "uniformsFee": -1,
        "otherFees": -1,
        "protectionFee": -1,
        "assessmentFee": -1,
        "studentArchiveFee": -1,
        "fieldTripsFee": -1,
        "majorEquipmentFee": -1,
        "professionalExamFee": -1,
        "contractExtensionFee": -1,
        "internationalStudentFee": -1,
        "internationalStudentRegFee": -1,
        "otherDiscounts": 0,
        "challengeExamFee": -1,
        "cplDiscount": 0,
        "registeredTuition": -1,
        "studentTuition": -1
      };

      Array.from(feesData).map(fee => {
        let label = fee[2].split('.'), value = Number(fee[3]);

        if (label.length > 1) {
          label = label.slice(1);
        }
        label = label[0][0].toLowerCase() + label[0].slice(1);

        if (!Object.keys(contractFees).includes(label)) {
          utils.logError(`Unknown fee label: ${label}`);
        }
        contractFees[label] = value;
      });

      utils.logInfo('ContractFees:', contractFees);

      studentData.studentProgram[programIndex].studentContracts[contractIndex].cost = contractFees['cost'];
      contractFees['cost'] = 0;

      studentData.studentProgram[programIndex].studentContracts[contractIndex].hours = Number(hours);
      studentData.studentProgram[programIndex].studentContracts[contractIndex].notes = studentData.studentProgram[programIndex].ctnotes;
      studentData.studentProgram[programIndex].studentContracts[contractIndex].userID = studentData.userID;
      studentData.studentProgram[programIndex].studentContracts[contractIndex].roleId = studentData.loginUserRole;
      studentData.studentProgram[programIndex].studentContracts[contractIndex].contractFees = contractFees;
      studentData.studentProgram[programIndex].studentContracts[contractIndex].referralTypeID = studentData.referralTypeID;
      studentData.studentProgram[programIndex].studentContracts[contractIndex].fundingsourceid = newData.fundingSourceId;

      let amount = 0;
      for (const course of studentData.studentProgram[programIndex].studentContracts[contractIndex].courses) {
        amount += Number(Number(course.cost).toFixed(2));
        amount = Number(amount.toFixed(2));
        course['subtotal'] = amount;
      }
      utils.logInfo(amount);

      if (studentData.studentProgram[programIndex].studentContracts[contractIndex].courseSum !== amount) {
        utils.logError(`Subtotal mismatch: ${studentData.studentProgram[programIndex].studentContracts[contractIndex].courseSum} !== ${amount}`);
      }

      studentData.studentProgram[programIndex].studentContracts[contractIndex].total = studentData.studentProgram[programIndex].studentContracts[contractIndex].actualCost;

      studentData.studentProgram[programIndex].isDirty = true;

      if (!launchData.code) {
        studentData.studentProgram[programIndex].studentContracts[contractIndex].contractCode = newData.vNumber;
        utils.logInfo('Contract Code added...');
      }

      studentData.studentProgram[programIndex].studentContracts[contractIndex].contractStartDate = newData.startDate;
      studentData.studentProgram[programIndex].studentContracts[contractIndex].scheduledEndDate = newData.endDate;
      studentData.studentProgram[programIndex].studentContracts[contractIndex].isDirty = true;
      studentData.studentProgram[programIndex].studentContracts[contractIndex].isEdit = true;
      utils.logInfo('Start and end date fixed...');

      const isFullTimeHtml = feesDataHtml.matchAll(/<input.*id="IsFullTime" name="IsFullTime" type="radio" value="(.*?)" \/>/g);
      studentData.studentProgram[programIndex].studentContracts[contractIndex].isFullTime = Boolean(isFullTimeHtml.next().value[1].toLowerCase());;

      utils.logInfo(studentData);

      const response = await fetch(`${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.UPDATE_CONTRACT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `studentViewModelSerialized=${encodeURIComponent(JSON.stringify(studentData))}`
      }).then(response => response.json());

      return { success: true, data: response }

    } catch (error) {
      utils.logError(error, 'LaunchManager.updateLaunchData');
      return { success: false, error: error.message };
    }

  }

  static async verifyContract(credentials) {
    try {
      utils.logInfo('Verifying contract...');

      const result = await this.findStudentFetch({ email: credentials.email });

      if (typeof result !== 'string') {
        if (result.success === false) {
          return { success: false, error: result.error || 'Login failed' };
        }
        utils.logError('findStudentFetch returned unexpected type:', typeof result);
        return { success: false, error: 'Invalid response from student search' };
      }

      const html = result;

      const studentListMatch = html.match(/<input type="hidden" name="studentList" id="studentSchoolList" value=['|"](.*)['|"]\s*\/>/);

      if (!studentListMatch) utils.logError("studentSchoolList element not found");

      const studentList = JSON.parse(studentListMatch[1]);
      utils.logInfo(studentList);
      if (studentList.length === 0) {
        return { success: false, error: config.ERRORS.STUDENT_NOT_FOUND };
      }

      let student = studentList[0];

      if (studentList.length > 1) {
        for (let i = 0; i < studentList.length; i++) {
          if (studentList[i].code?.startsWith('CPL')) continue;

          if (studentList[i].code === credentials?.vNumber) {
            student = studentList[i];
            break;
          }

          if ((studentList[i].school === "Bay/Queen" && credentials.campus === "Toronto")
            || (studentList[i].school === "Brampton East" && credentials.campus === "Brampton")
            || (studentList[i].school === "North York - Yonge" && credentials.campus === "North York")) {
            student = studentList[i];
          }
        }
      }

      const userDetailsHtml = await this.getUserDetails(student, student.code, false, false);
      const studentDetailsMatch = userDetailsHtml.match(/<input type="hidden" name="hidProgramContractModel" id="hidProgramContractModel" value='(.+?)' \/>/);

      if (!studentDetailsMatch) {
        return { success: false, error: config.ERRORS.STUDENT_DETAILS_NOT_FOUND };
      }

      const studentData = JSON.parse(studentDetailsMatch[1]);
      const has_CPL = studentData.studentCourses.courseList.some(contract => contract.programName === "CPL Program");

      const program = studentData.studentProgram.filter(program => program.programName != "CPL Program" && program.studentContracts.some(contract => contract.status === 'In Progress'));
      const sameVnumProgram = studentData.studentProgram.filter(program => program.studentContracts.some(contract => contract.contractCode === credentials.vNumber && contract.status !== 'In Progress'));

      if (sameVnumProgram.length) {
        return { success: false, error: "EP vNumber not in progress" };
      }

      if (!program.length) {
        return { success: false, error: "No 'In Progress' programs | Possible Program Mismatch" };
      }

      if (program.length > 1) {
        return { success: false, error: "Multiple 'In Progress' programs found" }
      }

      const contract = program[0].studentContracts.filter(contract => contract.status === 'In Progress')[0];

      return {
        success: true,
        data: {
          userID: studentData.userID,
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          vNumber: contract.contractCode,
          email: studentData.email,
          name: studentData.printName,
          programName: program[0].programName,
          status: "In Progress",
          school: studentData.schoolName,
          createdDate: studentData.createdDate.toString().split(' ')[0],
          startDate: contract.contractStartDate,
          has_CPL
        }
      }

    } catch (error) {
      utils.logError(error, 'LaunchManager.verifyContract');
      return { success: false, error: error.message };
    }
  }

  static async findStudent(credentials) {
    try {
      const html = await this.findStudentFetch(credentials);
      const studentListMatch = html.match(/<input type="hidden" name="studentList" id="studentSchoolList" value='(.+?)' \/>/);

      if (!studentListMatch) {
        utils.logWarn("studentSchoolList element not found");
        return null;
      }

      const studentList = JSON.parse(studentListMatch[1]);
      const student = studentList.find(s => s.code === credentials.vNumber);

      if (!student) {
        utils.logWarn(`Student not found with vNumber: ${credentials.vNumber}`);
        return null;
      }

      return student;
    } catch (error) {
      utils.logWarn(`Error finding student: ${error.message}`);
      return null;
    }
  }

  static async getUserDetails(student, vNumber, isApplyChanges = false, bTriggeredSignalRMessage = false) {
    const response = await fetch(`${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.USER_DETAILS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `selecteduserfirstname=${student.firstName}&selecteduserlastname=${student.lastName}&selecteduserid=${student.userID}&selectedusername=${student.firstName}.${student.lastName}+(${vNumber})&isApplyChanges=${isApplyChanges}&isRefreshButtonClick=false&rowselectedProgramID=0&selectedContractcode=0&bFromPaymentDue=false&bFromFromFollowUpAction=false${bTriggeredSignalRMessage ? '&bTriggeredSignalRMessage=true' : ''}`
    });
    isApplyChanges = false;
    return response.text();
  }

  static async setupTab(student, userDetailsHtml) {
    const existingTab = await this.findExistingTab();

    if (existingTab) {
      return this.updateTab(existingTab.id, student, userDetailsHtml);
    }

    return this.createAndSetupTab(student, userDetailsHtml);
  }

  static findExistingTab() {
    return new Promise(resolve => {
      chrome.tabs.query({
        url: `${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.STUDENT_MANAGER}*`
      }, tabs => resolve(tabs[0]));
    });
  }

  static async updateTab(tabId, student, userDetailsHtml) {
    await chrome.tabs.update(tabId, { active: true });
    await this.setupTabStorage(tabId, student, userDetailsHtml);
    await chrome.tabs.reload(tabId);
    return tabId;
  }

  static createAndSetupTab(student, userDetailsHtml) {
    return new Promise((resolve) => {
      chrome.tabs.create({
        url: `${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.STUDENT_MANAGER}`
      }, async (tab) => {
        await this.waitForTabLoad(tab.id);
        await this.setupTabStorage(tab.id, student, userDetailsHtml);
        await chrome.tabs.reload(tab.id);
        resolve(tab.id);
      });
    });
  }

  static waitForTabLoad(tabId) {
    return new Promise(resolve => {
      chrome.tabs.onUpdated.addListener(function listener(id, info) {
        if (id === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });
  }

  static async setupTabStorage(tabId, student, userDetailsHtml) {
    const rawCode = (student.vNumber || student.code || '').trim();
    let contractId = null;

    const inline = userDetailsHtml.match(
      /selectedcontractId\s*=\s*['"]?(\d+)['"]?/i
    );
    if (inline) {
      contractId = inline[1];
      utils.logInfo('▶ inline selectedcontractId:', contractId);
    }

    if (!contractId && rawCode) {
      const re = new RegExp(
        `"selectedContractID"\\s*:\\s*(\\d+)[\\s\\S]*?"selectedContractCode"\\s*:\\s*"${rawCode}"`,
        'i'
      );
      const m = userDetailsHtml.match(re);
      if (m) {
        contractId = m[1];
      } else {
        console.warn(
          'Regex failed to match selectedContractID near selectedContractCode'
        );
      }
    }

    if (!contractId) {
      const selOpt = userDetailsHtml.match(
        /<select[^>]+id=['"]SelectedContractID['"][^>]*>([\s\S]*?)<\/select>/i
      )?.[1];
      if (selOpt) {
        const codeOpt = selOpt.match(
          new RegExp(`<option[^>]*value=['"](\\d+)['"][^>]*>\\s*${rawCode}\\b`, 'i')
        );
        if (codeOpt) {
          contractId = codeOpt[1];
          utils.logInfo('🔍 dropdown matched by inner text →', contractId);
        }
        if (!contractId) {
          const sel = selOpt.match(/<option[^>]*value=['"](\d+)['"][^>]*selected/i);
          if (sel) {
            contractId = sel[1];
            utils.logInfo('⚙️ dropdown selected-option →', contractId);
          }
        }
        if (!contractId) {
          const first = selOpt.match(/<option[^>]*value=['"](\d+)['"]/i);
          if (first) {
            contractId = first[1];
            utils.logInfo('⚙️ dropdown first-option →', contractId);
          }
        }
      }
    }

    if (!contractId) {
      utils.logError('❗ setupTabStorage: contractId is not found.');
    }

    const selectedUser = {
      userid: student.userID,
      username: `${student.firstName}.${student.lastName} (${student.code})`,
      firstname: student.firstName,
      lastname: student.lastName,
      registrydate: student.registryDate || null,
      school: student.schoolName || null
    };

    return chrome.scripting.executeScript({
      target: { tabId },
      func: (selUser, html, cid) => {
        [
          'SchoolID', 'ProgramID', 'IsApplychanges', 'selectprogram',
          'selectedContractcode', 'selectedcontractId', 'IsRefreshButtonClick',
          'bFromPaymentDue', 'bFromFromFollowUpAction', 'showAlert', 'alertMessage'
        ].forEach(k => localStorage.removeItem(k));

        localStorage.setItem('SelectedUser', JSON.stringify(selUser));
        localStorage.setItem('activeTab', 'Course');

        if (cid) {
          window.selectedcontractId = cid;
          localStorage.setItem('selectedcontractId', cid);
          utils.logInfo('Injected selectedcontractId:', cid);
        }

        const codeMatch = html.match(
          /name=['"]selectedcontractcode['"][^>]*value=['"]([^'"]+)['"]/i
        );
        if (codeMatch) {
          localStorage.setItem('selectedContractcode', codeMatch[1]);
        }
      },
      args: [selectedUser, userDetailsHtml, contractId]
    });
  }

  static async openLaunchTab(credentials) {
    try {
      const loginResult = await this.loginToPortal();

      if (!loginResult.success) {
        await utils.showHDNotification('Login Error', loginResult.error);
        return loginResult;
      }
      const student = await this.findStudent(credentials);
      const userDetailsHtml = await this.getUserDetails(student, credentials.vNumber, false, false);
      await this.setupTab(student, userDetailsHtml);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }


  static async courseActivation(data) {
    try {
      const loginResult = await this.loginToPortal();

      if (!loginResult.success) {
        await utils.showHDNotification('Login Error', loginResult.error);
        return loginResult; // { success: false, error: errorMessage }
      }

      const parsedData = data.data;

      const results = [];

      if (parsedData?.encodedData) {
        if (parsedData.updateCount > 0) {
          try {
            const response = await fetch(`${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.UPDATE_COURSES}`, {
              method: 'POST',
              headers: {
                'accept': 'application/json, text/javascript, */*; q=0.01',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'x-requested-with': 'XMLHttpRequest',
              },
              body: `CoursesList=${parsedData.encodedData}`,
              credentials: 'include',
              referrer: `${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.STUDENT_MANAGER}`,
              referrerPolicy: 'strict-origin-when-cross-origin'
            });

            if (response.ok) {
              const responseData = await response.json();
              if (responseData.status) {
                if (data.isCPL) {
                  // Add CPL-specific message
                  const activatedCoursesList = parsedData.activatedCourses ? parsedData.activatedCourses.join(', ') : '';
                  results.push(`CPL Activation: ${responseData.message} - Courses: ${activatedCoursesList}`);
                } else {
                  results.push(`${responseData.message}`);
                }
              } else {
                results.push(`${responseData.message}`);
              }
            } else {
              results.push(`Failed to activate - server error`);
            }
          } catch (error) {
            results.push(`${error.message}`);
          }
        } else {
          if (data.isCPL) {
            results.push(`No inactive courses found for CPL student`);
          } else {
            results.push(`Course not found or already activated`);
          }
        }
      } else {
        results.push(`Failed to parse course data`);
      }

      return { success: true, messages: results };
    } catch (error) {
      utils.logError(error, 'LaunchManager.courseActivation');
      return { success: false, message: `Activation failed: ${error.message}` };
    }
  }

  static async syncMyAolcc(params) {
    console.log('syncMyAolcc called with params:', params);

    try {
      const { data, courseCode, vNumber, userID, contractID, programID, uniqueProgramID, uniqueID } = params;

      console.log('Attempting login...');
      const loginResult = await this.loginToPortal();

      if (!loginResult.success) {
        console.log('Login failed:', loginResult.error);
        return loginResult;
      }

      console.log('Login successful, extracting course item...');

      const courseItem = this.extractCourseItemForSync(data, contractID, programID, uniqueID);

      if (!courseItem) {
        return { success: false, message: 'Course item not found for sync' };
      }

      console.log('Course item extracted:', courseItem);

      const coursesListJsonString = JSON.stringify(data.studentProgram);

      const requestBody = new URLSearchParams({
        coursesItem: JSON.stringify(courseItem),
        userID: parseInt(userID),
        code: vNumber,
        contractID: parseInt(contractID),
        programID: parseInt(programID),
        UniqueProgramID: uniqueProgramID,
        coursesList: coursesListJsonString
      });

      console.log('Sending sync request to:', `${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.SYNC_MYAOLCC}`);
      console.log('Request body keys:', Array.from(requestBody.keys()));

      const response = await fetch(`${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.SYNC_MYAOLCC}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: requestBody,
        credentials: 'include',
        referrer: `${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.STUDENT_MANAGER}`,
        referrerPolicy: 'strict-origin-when-cross-origin'
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        return { success: false, message: `Sync failed with status: ${response.status}` };
      }

      const responseData = await response.json();
      console.log('API response data:', responseData);

      if (responseData.isSessionExpired) {
        return { success: false, message: 'Session expired. Please login again.' };
      }

      if (responseData.status === false) {
        return {
          success: false,
          message: responseData.message || 'Sync failed'
        };
      }

      if (responseData.status === true) {
        let message = 'Course synced successfully';

        if (responseData.isOldCourseUpdate) {
          message = `Course "${responseData.courseCode}" under contract "${responseData.contractCode}" has been updated and synced.`;
        }

        return {
          success: true,
          message: message,
          html: responseData.html,
          isOldCourseUpdate: responseData.isOldCourseUpdate || false
        };
      }

      if (responseData.html) {
        return {
          success: true,
          message: 'Course synced successfully',
          html: responseData.html
        };
      }

      return {
        success: false,
        message: 'Unexpected response from server',
        data: responseData
      };

    } catch (error) {
      console.error('syncMyAolcc error:', error);
      return { success: false, message: `Sync failed: ${error.message}` };
    }
  }

  static extractCourseItemForSync(studentData, contractID, programID, uniqueID) {
    try {
      console.log('Extracting course item for sync:', { contractID, programID, uniqueID });

      // Find the program
      const program = studentData.studentProgram.find(p => p.userProgramID == programID);
      if (!program) {
        console.error('Program not found for sync:', programID);
        return null;
      }

      // Find the contract
      const contract = program.studentContracts.find(c => c.contractID == contractID);
      if (!contract) {
        console.error('Contract not found for sync:', contractID);
        return null;
      }

      // Find the course item
      const courseItem = contract.courses.find(c => c.uniqueID === uniqueID);
      if (!courseItem) {
        console.error('Course item not found for sync:', uniqueID);
        return null;
      }

      console.log('Course item found for sync:', courseItem);
      return courseItem;
    } catch (error) {
      console.error('Error extracting course item for sync:', error);
      return null;
    }
  }

        // KPI Report functionality
        static async getKPIReport(data = {}) {
            try {
                console.log("🚀 LaunchManager: Starting getKPIReport with data:", data);
                utils.logInfo('Fetching KPI Report...', data);
      
                // First ensure we're logged in
                console.log("🔐 LaunchManager: Checking login status...");
                const loginResult = await this.loginToPortal();
                console.log("🔐 LaunchManager: Login result:", loginResult);
                if (!loginResult.success) {
                    console.log("❌ LaunchManager: Login failed");
                    return { success: false, error: 'Failed to login to Launch portal' };
                }
                console.log("✅ LaunchManager: Login successful");

      // Use provided data or defaults
      const startDate = data.startDate || '01 January 2025';
      const endDate = data.endDate || '30 April 2025';
      const schoolId = data.schoolId || '5589';
      const schoolName = schoolId === '5589' ? 'Bay/Queen' : 'Unknown';

      // Create the form data payload
      const formData = new URLSearchParams();
      formData.append('rptfilter[reportType]', 'POWERBI');
      formData.append('rptfilter[pbirsReportName]', 'KPIReportGraduates');
      formData.append('rptfilter[pbirsBaseUrl]', '');
      formData.append('rptfilter[reportDisplayName]', 'KPI – Graduates');
      formData.append('rptfilter[reportName]', 'KPIReportGraduates');
      formData.append('rptfilter[reportID]', '244');
      formData.append('rptfilter[schoolID]', schoolId);
      formData.append('rptfilter[schoolName]', schoolName);
      formData.append('rptfilter[isSubSchool][]', 'false');
      formData.append('rptfilter[subSchool][]', 'Include Sub-School');
      formData.append('rptfilter[format]', 'Format');
      formData.append('rptfilter[dateName][]', 'Start Date');
      formData.append('rptfilter[dateName][]', 'End Date');
      formData.append('rptfilter[dateTextbox][]', startDate);
      formData.append('rptfilter[dateTextbox][]', endDate);
      formData.append('rptfilter[bShowFinancialReportsTabMenu]', 'false');
      formData.append('rptfilter[bShowOfficeFinancialsTabMenu]', 'false');
      formData.append('rptfilter[bShowStudentReportTabMenu]', 'false');
      formData.append('rptfilter[bShowCourseAndProgramReportTabMenu]', 'false');
      formData.append('rptfilter[bShowStandardReportsTabMenu]', 'false');
      formData.append('rptfilter[bShowRevenueTrackingReportTabMenu]', 'false');
      formData.append('rptfilter[bShowCorporateReportTabMenu]', 'false');
      formData.append('rptfilter[bShowFileFormat]', 'false');
      formData.append('rptfilter[saViewModel]', '');
      formData.append('rptfilter[schoolList]', '');
      formData.append('rptfilter[bShowStudentAttendanceActivityDetailsReportTabMenu]', 'false');
      formData.append('rptfilter[bShowReportsForParticularLLIStaffs]', 'false');
      formData.append('rptfilter[bShowReportsForLLIStaffs]', 'false');
      formData.append('rptfilter[description]', 'Choose a date range. This report will pull all eligible graduation records with a Start Date within the range.');
      formData.append('rptfilter[schoolid]', schoolId);
      formData.append('rptfilter[schoolname]', schoolName);

                // Make the request to get the report URL
                const requestUrl = `${config.LAUNCH.BASE_URL}${config.LAUNCH.ENDPOINTS.GET_REPORT_URL}`;
                console.log("🌐 LaunchManager: Making request to:", requestUrl);
                console.log("📤 LaunchManager: Request body:", formData.toString());
                
                const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://launch.academyoflearning.net',
          'Referer': 'https://launch.academyoflearning.net/Reports',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: formData.toString(),
        credentials: 'include'
      });

                console.log("📥 LaunchManager: Response status:", response.status, response.statusText);
                if (!response.ok) {
                    console.log("❌ LaunchManager: Response not OK");
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                console.log("📥 LaunchManager: Parsing response JSON...");
                const responseText = await response.text();
                console.log("📥 LaunchManager: Raw response text:", responseText);
                
                let reportData;
                try {
                    reportData = JSON.parse(responseText);
                    console.log("📥 LaunchManager: Parsed JSON data:", reportData);
                } catch (parseError) {
                    console.log("❌ LaunchManager: JSON parse error:", parseError);
                    console.log("❌ LaunchManager: Raw response that failed to parse:", responseText);
                    throw new Error(`Failed to parse JSON response: ${parseError.message}`);
                }
                
                console.log("📥 LaunchManager: Response keys:", Object.keys(reportData || {}));
                console.log("📥 LaunchManager: Has reportUrl?", !!reportData?.reportUrl);
                console.log("📥 LaunchManager: reportUrl value:", reportData?.reportUrl);
      
      if (reportData && reportData.reportUrl) {
        // Open the report URL in a new tab
        chrome.tabs.create({ url: reportData.reportUrl });
        
        await utils.showHDNotification(
          'KPI Report Generated',
          'The KPI Graduates report has been opened in a new tab.'
        );
        
        return { success: true, data: reportData };
      } else {
        console.log("❌ LaunchManager: Invalid response format - missing reportUrl");
        console.log("❌ LaunchManager: Full response object:", reportData);
        throw new Error('Invalid response format from report endpoint');
      }

    } catch (error) {
      utils.logError('Error fetching KPI report:', error);
      await utils.showHDNotification(
        'KPI Report Error',
        `Failed to generate KPI report: ${error.message}`
      );
      return { success: false, error: error.message };
    }
  }

  // KPI Report functionality - Simple headless REST API approach
  static async getKPIReport(data = {}) {
    try {
      console.log("🚀 LaunchManager: Starting headless KPI Report with data:", data);
      
      // First ensure we're logged in
      const loginResult = await this.loginToPortal();
      if (!loginResult.success) {
        await utils.showHDNotification('Launch Login Failed', loginResult.error);
        return { success: false, error: loginResult.error };
      }
      
      // Extract parameters from data
      const { startDate, endDate, schoolName, schoolId } = data;
      
      // Get PowerBI embed info from Launch portal
      const embedParams = new URLSearchParams();
      embedParams.append('powerBIWorkspaceId', 'a7d5e986-4449-42d6-9811-7219561a34f4');
      embedParams.append('powerBIReportId', '066fbbb4-e0ee-440e-9e59-af4186d9d237');
      embedParams.append('userId', '518226');
      embedParams.append('reportParams', `$rp:SchoolID=${schoolId || (schoolName === 'Bay/Queen' ? '5589' : '5703')}$rp:RecursiveSchool=False$rp:ProgramTypeID=-1$rp:StartDate=${startDate}$rp:EndDate=${endDate}$rp:IncludeScheduledGrads=False`);
      
      const embedResponse = await fetch(`${config.LAUNCH.BASE_URL}/embedinfo/getembedinfo?${embedParams.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!embedResponse.ok) {
        throw new Error(`Failed to get embed info: ${embedResponse.status}`);
      }
      
      const reportData = await embedResponse.json();
      
      // Check if we have PowerBI embed data
      if (reportData && reportData.EmbedReport && reportData.EmbedReport.length > 0) {
        const embedReport = reportData.EmbedReport[0];
        const embedToken = reportData.EmbedToken;
        
        // Log the embed URL to debug
        console.log("📊 LaunchManager: Embed URL:", embedReport.EmbedUrl);
        console.log("📊 LaunchManager: Full embed data:", embedReport);
        
        // Extract workspace and report IDs from embed URL
        const embedUrl = embedReport.EmbedUrl;
        const workspaceMatch = embedUrl.match(/groups\/([^\/]+)/);
        const reportIdMatch = embedUrl.match(/reports\/([^\/]+)/);
        
        console.log("📊 LaunchManager: Workspace match:", workspaceMatch);
        console.log("📊 LaunchManager: Report ID match:", reportIdMatch);
        
        // Use hardcoded IDs if extraction fails (since we know them from the request)
        const workspaceId = workspaceMatch ? workspaceMatch[1] : 'a7d5e986-4449-42d6-9811-7219561a34f4';
        const reportId = reportIdMatch ? reportIdMatch[1] : '066fbbb4-e0ee-440e-9e59-af4186d9d237';
        
        console.log("📊 LaunchManager: Using workspace ID:", workspaceId);
        console.log("📊 LaunchManager: Using report ID:", reportId);
        
        // Call the headless export method
        const headlessResult = await this.exportKPIReportHeadless(
          embedToken.Token,
          workspaceId,
          reportId,
          startDate,
          endDate,
          schoolName
        );
        
        if (headlessResult.success) {
          return headlessResult;
        } else {
          throw new Error(headlessResult.error || 'Headless export failed');
        }
      }
      
      throw new Error('No PowerBI embed data available. Please check your Launch portal configuration.');
      
    } catch (error) {
      console.error("📊 LaunchManager: Error fetching KPI report:", error);
      await utils.showHDNotification('KPI Report Error', `Failed to generate KPI report: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Headless CSV export using Export-to-File REST API (no embedding)
  static async exportKPIReportHeadless(embedToken, workspaceId, reportId, startDate, endDate, schoolName) {
    try {
      console.log("📊 LaunchManager: Starting headless CSV export using Export-to-File REST API");
      
      // Call the cloud API for headless CSV export
      const backendUrl = 'https://aol-ep-enhancer-dkv34jxn6-mohammeds-projects-3be32dc8.vercel.app/api/export-csv';
      const exportRequest = {
        embedToken: embedToken,
        workspaceId: workspaceId,
        reportId: reportId,
        startDate: startDate,
        endDate: endDate,
        schoolName: schoolName,
        parameters: [
          { name: 'SchoolID', value: schoolName === 'Bay/Queen' ? '5589' : '5703' },
          { name: 'RecursiveSchool', value: 'False' },
          { name: 'ProgramTypeID', value: '-1' },
          { name: 'StartDate', value: startDate },
          { name: 'EndDate', value: endDate },
          { name: 'IncludeScheduledGrads', value: 'False' },
          { name: 'UserId', value: '518226' }
        ]
      };
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend API failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Convert base64 to blob and download
        const csvData = atob(result.base64);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        // Use Chrome downloads API to download the file
        await chrome.downloads.download({
          url: url,
          filename: result.filename,
          saveAs: false
        });
        
        // Clean up the URL
        URL.revokeObjectURL(url);
        
        await utils.showHDNotification(
          'KPI Report CSV Downloaded',
          `CSV file has been exported using Export-to-File REST API and downloaded to your Downloads folder.`
        );
        
        return { success: true, data: { csvExported: true, filename: result.filename, method: 'HEADLESS_REST_API' } };
      } else {
        throw new Error(result.error || 'Backend API returned error');
      }
      
    } catch (error) {
      console.error("📊 LaunchManager: Headless export error:", error);
      
      await utils.showHDNotification(
        'KPI Report Export Error',
        `Headless CSV export failed: ${error.message}. Please check if the backend server is running.`
      );
      
      return { success: false, error: error.message };
    }
  }
}

class VerifastManager {

  static apiToken = null;
  static isLoggingIn = false;
  static loginPromise = null;

  static async loginToVerifast(credentials) {
    // Don't login again if already logging in
    if (this.isLoggingIn || !credentials || !credentials.email || !credentials.password) {
      return this.loginPromise;
    }

    const currentCredentials = `${credentials.email}:${credentials.password}`;
    const lastFailedCredentials = loginFailureTracker.verifast.lastFailedCredentials;

    if (loginFailureTracker.verifast.isBlocked && lastFailedCredentials === currentCredentials) {
      utils.logWarn('Verifast ' + config.ERRORS.LOGIN_BLOCKED);
      await utils.showNotification(
        'Verifast Login Blocked',
        'Authentication failed. Please check and update your Verifast credentials in extension settings.'
      );
      return { success: false, error: 'Verifast ' + config.ERRORS.LOGIN_BLOCKED };
    }

    // First check if we have a token in storage
    try {
      const storedToken = await utils.getStorageData(['verifastApiToken']);
      if (storedToken.verifastApiToken) {
        utils.logInfo('Using stored Verifast API token');
        this.apiToken = storedToken.verifastApiToken;
        return { success: true, apiToken: this.apiToken };
      }
    } catch (error) {
      utils.logError('Error checking stored Verifast token:', error);
    }

    // Set logging in state and create a promise for other requests to wait on
    this.isLoggingIn = true;
    this.loginPromise = (async () => {
      try {
        const isOnline = await utils.checkInternetConnection();

        if (!isOnline) {
          return { success: false, error: config.ERRORS.INTERNET_CONNECTION_UNAVAILABLE };
        }

        let csrfToken = null;
        let apiToken = null;

        const dashboardResponse = await fetch(`${config.VERIFAST.BASE_URL}${config.VERIFAST.ENDPOINTS.DASHBOARD}`, {
          credentials: 'include'
        });

        if (dashboardResponse.redirected) {
          const html = await dashboardResponse.text();
          csrfToken = html.match(/name="csrf-token" content="([^"]+)"/)?.[1];

          if (!csrfToken) {
            utils.logError("CSRF token not found");
          }
          const response = await fetch(`${config.VERIFAST.BASE_URL}${config.VERIFAST.ENDPOINTS.LOGIN}`, {
            method: "POST",
            mode: "cors",
            credentials: "include",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `_token=${csrfToken}&email=${credentials.email}&password=${credentials.password}`,
            redirect: 'follow'
          });

          // Check if login failed (redirected back to login page)
          if (response.redirected && response.url.includes('/loginv1')) {
            loginFailureTracker.verifast.isBlocked = true;
            loginFailureTracker.verifast.lastFailedCredentials = currentCredentials;

            utils.logError('Verifast ' + config.ERRORS.AUTHENTICATION_FAILED);
            await utils.showNotification(
              'Verifast Login Failed',
              'Invalid username or password. Please check and update your Verifast credentials in extension settings.'
            );
            return { success: false, error: 'Verifast ' + config.ERRORS.AUTHENTICATION_FAILED };
          }

          if (response.redirected) {
            const loggedInResponse = await fetch(response.url, {
              credentials: 'include'
            });
            const loggedInHtml = await loggedInResponse.text();

            const headerMatch = loggedInHtml.match(/<header-v3\s+:user='([^']+)'/);
            if (headerMatch) {
              try {
                const userData = JSON.parse(headerMatch[1]);

                if (userData.email !== credentials.email) {
                  utils.logError(`Login email mismatch. Expected: ${credentials.email}, Got: ${userData.email}`);
                }

                if (userData.organizations && userData.organizations.length > 0) {
                  apiToken = userData.organizations[0].api_token;
                } else {
                  apiToken = userData.api_token;
                }
              } catch (parseError) {
                utils.logError('Error parsing user data from login response:', parseError);
              }
            }

            if (!apiToken) {
              utils.logError("API token not found after login");
            }
          }
        }
        else {
          const loggedInHtml = await dashboardResponse.text();
          const headerMatch = loggedInHtml.match(/<header-v3\s+:user='([^']+)'/);
          if (headerMatch) {
            try {
              const userData = JSON.parse(headerMatch[1]);

              if (userData.email !== credentials.email) {
                utils.logError(`Session email mismatch. Expected: ${credentials.email}, Got: ${userData.email}`);
              }

              if (userData.organizations && userData.organizations.length > 0) {
                apiToken = userData.organizations[0].api_token;
                utils.logInfo('Organization API token extracted from existing session:', apiToken);
              } else {
                apiToken = userData.api_token;
                utils.logInfo('User API token extracted from existing session (fallback):', apiToken);
              }
            } catch (parseError) {
              utils.logError('Error parsing user data from existing session:', parseError);
            }
          }

          if (!apiToken) {
            utils.logError("API token not found in existing session");
          }
        }

        // Store the token in the class
        this.apiToken = apiToken;

        // Store the token in chrome.storage.local for persistence
        await utils.setStorageData({ 'verifastApiToken': apiToken });
        utils.logInfo('Verifast API token stored in localStorage');

        // Clear any login blocks on success
        loginFailureTracker.verifast.isBlocked = false;
        loginFailureTracker.verifast.lastFailedCredentials = null;

        return { success: true, apiToken };
      } catch (error) {
        // Set block for network/technical errors only if credentials exist
        if (!error.message.includes('blocked') && !error.message.includes('not found')) {
          loginFailureTracker.verifast.isBlocked = true;
          loginFailureTracker.verifast.lastFailedCredentials = currentCredentials;
        }

        utils.logError(error, 'VerifastManager.loginToVerifast');
        this.apiToken = null;
        utils.logError(`Verifast login error: ${error.message}`);
        return { success: false, error: error.message };
      } finally {
        this.isLoggingIn = false;
      }
    })();

    return this.loginPromise;
  }

  static async getRestData(credentials) {
    try {
      if (!this.apiToken) {
        const loginResult = await this.loginToVerifast(credentials);
        if (!loginResult.success) {
          utils.logError(loginResult.error);
        }

        this.apiToken = loginResult.apiToken;
      }

      const makeApiRequest = async (retryCount = 0) => {
        const response = await fetch(`${config.VERIFAST.BASE_URL}/api/v1/applicant/search-by-email/${credentials.studentMail}`, {
          method: 'POST',
          headers: {
            "accept": "application/json",
            "authorization": `Bearer ${this.apiToken}`,
            "content-type": "application/json"
          },
          credentials: "include",
          redirect: 'manual'
        });

        if (response.status === 429) {
          if (retryCount < 31) {
            if (retryCount === 0) {
              utils.logWarn('Rate limit hit, retrying...');
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
            return makeApiRequest(retryCount + 1);
          } else {
            utils.logError("Rate limit exceeded after 31 retries");
          }
        }

        if (response.status === 404) {
          return {
            success: false,
            data: [],
            rawStatus: 'not_found'
          };
        }

        if (!response.ok) {
          const errorText = await response.text();
          utils.logError(`Verifast API Error ${response.status}`, 'VerifastManager.getRestData makeApiRequest');

          if (errorText.includes('"Invalid API token"')) {
            utils.logInfo('Invalid API token, attempting fresh login...');
            this.apiToken = null;
            await utils.setStorageData({ 'verifastApiToken': null });
            utils.logInfo('Cleared invalid Verifast API token from localStorage');
          } else {
            utils.logError(`API Error ${response.status}: ${errorText}`);
          }
        }

        return await response.json();
      };

      const data = await makeApiRequest();

      if (data.success === false && data.message === "No applicants found for the given email") {
        return {
          success: false,
          data: [],
          rawStatus: 'not_found'
        };
      }

      // Return raw data without processing - let ValidationHelper handle it
      return {
        success: data.success && data.data && data.data.length > 0,
        data: data.data || [],
        rawStatus: 'success'
      };

    } catch (error) {
      utils.logError(`Verifast data fetch error: ${error.message}`);
    }
  }
}

class CanvasManager {
  // Track authentication state and pending requests
  static isLoggedIn = false;
  static isLoggingIn = false;
  static loginPromise = null;
  static pendingRequests = [];
  static shouldStop = false;

  static async performCanvasLogin() {
    // Don't login again if already logging in
    if (this.isLoggingIn) {
      return this.loginPromise;
    }

    // Set logging in state and create a promise for other requests to wait on
    this.isLoggingIn = true;
    this.loginPromise = (async () => {
      try {
        const credentials = await new Promise(resolve => {
          chrome.storage.local.get(['canvasUsername', 'canvasPassword'], result => {
            resolve({
              username: result.canvasUsername || '',
              password: result.canvasPassword || ''
            });
          });
        });

        if (!credentials.username || !credentials.password) {
          utils.logWarn('Canvas ' + config.ERRORS.CREDENTIALS_NOT_FOUND);
          return { success: false, error: 'Canvas ' + config.ERRORS.CREDENTIALS_NOT_FOUND };
        }

        const currentCredentials = `${credentials.username}:${credentials.password}`;
        const lastFailedCredentials = loginFailureTracker.canvas.lastFailedCredentials;

        if (loginFailureTracker.canvas.isBlocked && lastFailedCredentials === currentCredentials) {
          utils.logWarn('Canvas ' + config.ERRORS.LOGIN_BLOCKED);
          await utils.showNotification(
            'Canvas Login Blocked',
            'Authentication failed. Please check and update your Canvas credentials in extension settings.'
          );
          return { success: false, error: 'Canvas ' + config.ERRORS.LOGIN_BLOCKED };
        }

        // Grab the login token
        const loginPageResponse = await fetch('https://mynew.aolcc.ca/login/canvas', {
          credentials: 'include'
        });

        const html = await loginPageResponse.text();
        const tokenMatch = html.match(/name="authenticity_token" value="([^"]+)"/);

        if (!tokenMatch) utils.logError('authenticity_token not found');
        const token = tokenMatch[1];

        // Perform login
        const loginResponse = await fetch('https://mynew.aolcc.ca/login/canvas', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            utf8: '✓',
            authenticity_token: token,
            redirect_to_ssl: '1',
            'pseudonym_session[unique_id]': credentials.username,
            'pseudonym_session[password]': credentials.password,
            'pseudonym_session[remember_me]': '1'
          }).toString(),
          mode: 'cors'
        });

        // Check for 400 Bad Request status (Canvas returns this for invalid credentials)
        if (loginResponse.status === 400) {
          loginFailureTracker.canvas.isBlocked = true;
          loginFailureTracker.canvas.lastFailedCredentials = currentCredentials;

          utils.logError('Canvas ' + config.ERRORS.AUTHENTICATION_FAILED);
          await utils.showNotification(
            'Canvas Login Failed',
            'Invalid username or password. Please check and update your Canvas credentials in extension settings.'
          );
          return { success: false, error: 'Canvas ' + config.ERRORS.AUTHENTICATION_FAILED };
        }

        // Check if login failed (usually results in redirect back to login page)
        if (loginResponse.redirected && loginResponse.url.includes('/login')) {
          loginFailureTracker.canvas.isBlocked = true;
          loginFailureTracker.canvas.lastFailedCredentials = currentCredentials;

          utils.logError('Canvas ' + config.ERRORS.AUTHENTICATION_FAILED);
          await utils.showNotification(
            'Canvas Login Failed',
            'Invalid username or password. Please check and update your Canvas credentials in extension settings.'
          );
          return { success: false, error: 'Canvas ' + config.ERRORS.AUTHENTICATION_FAILED };
        }

        // Give the cookie a moment to settle
        await new Promise(r => setTimeout(r, 1000));

        // Clear any login blocks on success
        loginFailureTracker.canvas.isBlocked = false;
        loginFailureTracker.canvas.lastFailedCredentials = null;

        // Set logged in state
        this.isLoggedIn = true;
        return { success: true };
      } catch (error) {
        // Set block for network/technical errors only if credentials exist
        if (!error.message.includes('blocked') && !error.message.includes('not found')) {
          const credentials = await new Promise(resolve => {
            chrome.storage.local.get(['canvasUsername', 'canvasPassword'], result => {
              resolve({
                username: result.canvasUsername || '',
                password: result.canvasPassword || ''
              });
            });
          });

          if (credentials.username && credentials.password) {
            loginFailureTracker.canvas.isBlocked = true;
            loginFailureTracker.canvas.lastFailedCredentials = `${credentials.username}:${credentials.password}`;
          }
        }

        utils.logWarn('Canvas login error:', error);
        this.isLoggedIn = false;
        return { success: false, error: error.message };
      } finally {
        this.isLoggingIn = false;
      }
    })();

    return this.loginPromise;
  }

  static async checkCanvasLogin(email) {
    try {
      if (this.shouldStop) {
        utils.logWarn('Operation cancelled by user');
      }

      // First try fetching without logging in again
      try {
        // Attempt to fetch the user record directly
        const response = await fetch(
          `https://mynew.aolcc.ca/api/v1/accounts/22/users?include[]=last_login&search_term=${encodeURIComponent(email)}`,
          { credentials: 'include' }
        );

        // If we get a successful response, process it
        if (response.ok) {
          const userData = await response.json();
          if (!userData || userData.length === 0) {
            return { found: false, lastLogin: null };
          }

          const user = userData[0];
          return {
            found: true,
            lastLogin: user.last_login,
            hasLoggedIn: user.last_login !== null
          };
        }

        // Check if we need to authenticate
        const responseText = await response.text();
        let needsAuthentication = false;

        try {
          // Try to parse as JSON to check for authentication error
          const responseJson = JSON.parse(responseText);
          needsAuthentication = response.status === 401 ||
            (responseJson.status === "unauthenticated" &&
              responseJson.errors &&
              responseJson.errors.some(e => e.message === "user authorization required"));
        } catch (e) {
          // If we can't parse as JSON, check status code
          needsAuthentication = response.status === 401;
        }

        // If authentication is needed, login and retry
        if (needsAuthentication) {
          await this.performCanvasLogin();

          // Check if operation was cancelled during login
          if (this.shouldStop) {
            utils.logWarn('Operation cancelled by user');
          }

          // Retry the request after successful login
          const retryResponse = await fetch(
            `https://mynew.aolcc.ca/api/v1/accounts/22/users?include[]=last_login&search_term=${encodeURIComponent(email)}`,
            { credentials: 'include' }
          );

          if (!retryResponse.ok) {
            utils.logError(`API request failed after login (${retryResponse.status})`);
          }

          const userData = await retryResponse.json();
          if (!userData || userData.length === 0) {
            return { found: false, lastLogin: null };
          }

          const user = userData[0];
          return {
            found: true,
            lastLogin: user.last_login,
            hasLoggedIn: user.last_login !== null
          };
        } else {
          // Some other error occurred
          utils.logError(`API request failed (${response.status})`);
        }
      } catch (error) {
        // If the first attempt failed with a network error, try logging in and retrying
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          await this.performCanvasLogin();

          // Check if operation was cancelled during login
          if (this.shouldStop) {
            utils.logWarn('Operation cancelled by user');
          }

          const retryResponse = await fetch(
            `https://mynew.aolcc.ca/api/v1/accounts/22/users?include[]=last_login&search_term=${encodeURIComponent(email)}`,
            { credentials: 'include' }
          );

          if (!retryResponse.ok) {
            utils.logError(`API request failed after login (${retryResponse.status})`);
          }

          const userData = await retryResponse.json();
          if (!userData || userData.length === 0) {
            return { found: false, lastLogin: null };
          }

          const user = userData[0];
          return {
            found: true,
            lastLogin: user.last_login,
            hasLoggedIn: user.last_login !== null
          };
        }

        // Other errors just propagate
        throw error;
      }
    } catch (error) {
      utils.logError('Canvas login check error:', error);
      return {
        found: false,
        lastLogin: null,
        error: error.message
      };
    }
  }

  static async batchCheckCanvasLogins(emails, progressCallback) {
    // Reset state when starting a new batch check
    this.shouldStop = false;
    this.pendingRequests = [];
    const results = {};
    let processed = 0;
    const total = emails.length;

    // Process in batches of 20
    const batchSize = 20;

    try {
      for (let i = 0; i < emails.length; i += batchSize) {
        // Check if operation should stop
        if (this.shouldStop) {
          utils.logWarn('Operation cancelled by user');
        }

        // Get the current batch of emails
        const batch = emails.slice(i, i + batchSize);

        // Process each email in the batch with proper progress reporting
        const batchPromises = batch.map(async (email) => {
          try {
            // Check if operation should stop
            if (this.shouldStop) {
              return;
            }

            const result = await this.checkCanvasLogin(email);

            // Update progress if callback provided
            if (typeof progressCallback === 'function') {
              processed++;
              progressCallback(processed, total, email);
            }

            // Store result
            results[email] = result;
          } catch (error) {
            utils.logError(`Error checking Canvas login for ${email}:`, error);
            processed++;
            if (typeof progressCallback === 'function') {
              progressCallback(processed, total, email);
            }
            results[email] = {
              found: false,
              lastLogin: null,
              error: error.message
            };
          }
        });

        // Wait for all emails in this batch to complete
        await Promise.all(batchPromises);
      }

      return results;
    } catch (error) {
      utils.logError('Error during batch Canvas check:', error);
      throw error;
    }
  }

  static stopAllChecks() {
    this.shouldStop = true;
    this.pendingRequests = [];
  }
}

async function init() {
  utils.logInfo('Extension starting up.');
  initStorage();
  await utils.executeWithErrorHandling(initializeExtension, 'Error initializing extension');
}

async function initStorage() {
  if (isStorageInitialized) {
    utils.logInfo('Storage already initialized. Skipping...');
    return;
  }

  try {
    const needsDefaults = await checkIfNeedsDefaults();
    if (needsDefaults) {
      await loadDefaultData();
    }
    utils.logInfo('Extension storage initialized successfully');
  } catch (error) {
    utils.logError('Error initializing extension storage:', error);
  }
}

async function initializeExtension() {
  if (extensionState.isInitialized) {
    utils.logInfo('Extension already initialized. Skipping initialization.');
    return;
  }

  utils.logInfo('Initializing extension.');
  const { isActive, checkInterval, cooldownPeriod, isCoolingDown: storedIsCoolingDown, cooldownEndTime: storedCooldownEndTime } =
    await utils.getStorageData(['isActive', 'checkInterval', 'cooldownPeriod', 'isCoolingDown', 'cooldownEndTime']);

  checkIntervalTime = checkInterval || config.DEFAULT_CHECK_INTERVAL;
  cooldownPeriodTime = cooldownPeriod || config.DEFAULT_COOLDOWN_PERIOD;
  isCoolingDown = storedIsCoolingDown || false;
  cooldownEndTime = storedCooldownEndTime || 0;

  utils.logInfo(`Check interval set to: ${checkIntervalTime} seconds`);
  utils.logInfo(`Cooldown period set to: ${cooldownPeriodTime} seconds`);
  utils.logInfo(`Is cooling down: ${isCoolingDown}`);
  utils.logInfo(`Cooldown end time: ${new Date(cooldownEndTime).toLocaleString()}`);

  if (isActive) {
    utils.logInfo('Extension is active. Starting monitoring.');
    await startMonitoring();
  } else {
    utils.logInfo('Extension is not active.');
  }

  extensionState.isInitialized = true;
  await utils.setStorageData({ extensionState });

  chrome.alarms.create(config.STORAGE_CLEANUP_ALARM_NAME, {
    periodInMinutes: config.STORAGE_CLEANUP_INTERVAL_MINUTES
  });
}

async function startMonitoring() {
  utils.logInfo('Monitoring started.');
  await utils.manageAlarm(true, checkIntervalTime);
}

async function stopMonitoring() {
  utils.logInfo('Stopping monitoring.');
  await utils.manageAlarm(false);
}

async function startCooldown() {
  utils.logInfo(`Starting cooldown for ${cooldownPeriodTime} seconds`);

  isCoolingDown = true;
  cooldownEndTime = Date.now() + cooldownPeriodTime * 1000;

  await utils.setStorageData({ isCoolingDown, cooldownEndTime });
}

async function handleSettingsUpdate(request) {
  if (request.isActive !== undefined) {
    request.isActive ? await startMonitoring() : await stopMonitoring();
  }
  if (request.checkInterval !== undefined) {
    checkIntervalTime = request.checkInterval;
    await utils.setStorageData({ checkInterval: checkIntervalTime });
    if (await chrome.alarms.get(config.CHECK_TICKET)) {
      await utils.manageAlarm(true, checkIntervalTime);
    }
  }
  if (request.cooldownPeriod !== undefined) {
    cooldownPeriodTime = request.cooldownPeriod;
    await utils.setStorageData({ cooldownPeriod: cooldownPeriodTime });
    if (isCoolingDown) {
      cooldownEndTime = Date.now() + cooldownPeriodTime * 1000;
      await utils.setStorageData({ cooldownEndTime });
    }
  }
}

async function cleanupStorage() {
  const expirationTime = Date.now() - config.STORAGE_EXPIRATION_TIME_MS;
  const storage = await utils.getStorageData(null);

  for (const [key, value] of Object.entries(storage)) {
    if (value.timestamp && value.timestamp < expirationTime) {
      await chrome.storage.local.remove(key);
    }
  }
}

async function cleanupProgressSheetData() {
  chrome.storage.local.get(null, (items) => {
    const keysToRemove = Object.keys(items).filter(key => key.startsWith('progressSheetData'));
    if (keysToRemove.length > 0) {
      chrome.storage.local.remove(keysToRemove);
    }
  });
}

function checkIfNeedsDefaults() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      STORAGE_KEYS.ALL_COURSES,
      STORAGE_KEYS.ALL_PROGRAMS,
      STORAGE_KEYS.PROGRAM_COURSES,
      STORAGE_KEYS.ALL_QUIZ_CODES,
      'lastUpdatedCourse',
      'lastUpdatedPograms',
      'lastUpdatedPogramsCourses',
      'lastQuizCodes',
      'lastHealthUpdate'
    ], (result) => {
      // Check if data exists
      const hasData = result[STORAGE_KEYS.ALL_COURSES] &&
        result[STORAGE_KEYS.ALL_PROGRAMS] &&
        result[STORAGE_KEYS.PROGRAM_COURSES] &&
        result[STORAGE_KEYS.ALL_QUIZ_CODES];

      if (!hasData) {
        utils.logInfo('No data found in storage - loading data');
        resolve(true);
        return;
      }

      // Check internet connection for API health check
      utils.checkInternetConnection()
        .then(isOnline => {
          if (!isOnline) {
            utils.logInfo('No internet connection - keeping existing data');
            resolve(false);
            return;
          }

          // Check API health and compare timestamps
          APIManager.checkAPIHealth()
            .then(healthCheck => {
              if (!healthCheck.success) {
                utils.logInfo('API health check failed - keeping existing data');
                resolve(false);
                return;
              }

              const { database } = healthCheck.data;

              // Convert API timestamps to comparable format
              const apiCoursesUpdated = new Date(database.courses_last_updated).getTime();
              const apiProgramsUpdated = new Date(database.programs_last_updated).getTime();
              const apiProgramCoursesUpdated = new Date(database.program_courses_last_updated).getTime();
              const apiQuizCodesUpdated = new Date(database.quiz_codes_last_updated).getTime();
              const apiHealthUpdated = new Date(healthCheck.data.last_updated).getTime();

              const localCoursesUpdated = result.lastUpdatedCourse || 0;
              const localProgramsUpdated = result.lastUpdatedPograms || 0;
              const localProgramCoursesUpdated = result.lastUpdatedPogramsCourses || 0;
              const localQuizCodesUpdated = result.lastQuizCodes || 0;
              const localHealthUpdated = result.lastHealthUpdate || 0;

              // Check if any data needs update
              const needsCoursesUpdate = apiCoursesUpdated > localCoursesUpdated;
              const needsProgramsUpdate = apiProgramsUpdated > localProgramsUpdated;
              const needsProgramCoursesUpdate = apiProgramCoursesUpdated > localProgramCoursesUpdated;
              const needsQuizCodesUpdate = apiQuizCodesUpdated > localQuizCodesUpdated;
              const needsHealthUpdate = apiHealthUpdated > localHealthUpdated;

              if (needsCoursesUpdate || needsProgramsUpdate || needsProgramCoursesUpdate || needsQuizCodesUpdate || needsHealthUpdate) {
                utils.logInfo('API data is newer - updating data');
                utils.logInfo(`Courses: ${needsCoursesUpdate}, Programs: ${needsProgramsUpdate}, Program Courses: ${needsProgramCoursesUpdate}, Quiz Codes: ${needsQuizCodesUpdate}, Health: ${needsHealthUpdate}`);
                resolve(true);
              } else {
                utils.logInfo('Local data is up to date');
                resolve(false);
              }
            })
            .catch(error => {
              utils.logError('Error checking API health:', error);
              resolve(false);
            });
        })
        .catch(error => {
          utils.logError('Error checking internet connection:', error);
          resolve(false);
        });
    });
  });
}

function loadDefaultData() {
  return new Promise((resolve, reject) => {
    utils.checkInternetConnection()
      .then(isOnline => {
        if (!isOnline) {
          utils.logWarn('No internet connection - cannot load data from API');
          resolve(false);
          return;
        }

        utils.logInfo('Internet available - loading from API');

        Promise.all([
          APIManager.getAllCourses(),
          APIManager.getAllPrograms(),
          APIManager.getAllProgramCourses(),
          APIManager.getAllQuizCodes(),
          APIManager.checkAPIHealth()
        ])
          .then(([coursesResult, programsResult, programCoursesResult, quizCodesResult, healthResult]) => {
            utils.logInfo('API results:', {
              courses: coursesResult.success,
              programs: programsResult.success,
              programCourses: programCoursesResult.success,
              quizCodes: quizCodesResult.success,
              health: healthResult.success
            });

            const failedRequests = [];
            if (!coursesResult.success) {
              utils.logWarn(`Failed to fetch courses: ${coursesResult.error}`);
              failedRequests.push('Courses');
            }
            if (!programsResult.success) {
              utils.logWarn(`Failed to fetch programs: ${programsResult.error}`);
              failedRequests.push('Programs');
            }
            if (!programCoursesResult.success) {
              utils.logWarn(`Failed to fetch program courses: ${programCoursesResult.error}`);
              failedRequests.push('Program Courses');
            }
            if (!quizCodesResult.success) {
              utils.logWarn(`Failed to fetch quiz codes: ${quizCodesResult.error}`);
              failedRequests.push('Quiz Codes');
            }

            if (failedRequests.length === 4) {
              utils.logWarn('All API calls failed - extension will continue without fresh data');
              resolve(false); // Continue without loading new data
              return;
            }

            if (failedRequests.length > 0) {
              utils.logWarn(`Some API calls failed: ${failedRequests.join(', ')} - continuing with available data`);
            }

            const currentTime = new Date().toISOString();

            chrome.storage.local.get([
              STORAGE_KEYS.ALL_COURSES,
              STORAGE_KEYS.ALL_PROGRAMS,
              STORAGE_KEYS.PROGRAM_COURSES,
              STORAGE_KEYS.ALL_QUIZ_CODES
            ], (existingData) => {
              const transformedCourses = coursesResult.success ?
                coursesResult.data.map(course => ({
                  courseCode: course.courseCode,
                  courseName: course.courseName,
                  courseDuration: course.courseDuration || 0,
                  updated_at: currentTime,
                  courseId: course.courseId,
                  courseType: course.courseType,
                  courseCategory: course.courseCategory,
                  canSync: course.canSync,
                  examCodePermission: course.examCodePermission,
                  activationPermission: course.activationPermission,
                  bookRequirement: course.bookRequirement,
                  status: course.status,
                  createdAt: course.createdAt,
                  updatedAt: course.updatedAt
                })) : (existingData[STORAGE_KEYS.ALL_COURSES] || []);

              const transformedPrograms = programsResult.success ?
                programsResult.data.map(program => ({
                  programId: program.programId,
                  programName: program.programName,
                  alternativeNames: program.alternativeNames || [],
                  updated_at: currentTime,
                  programType: program.programType,
                  keyCourses: program.keyCourses || {},
                  activeCampuses: program.activeCampuses || [],
                  createdAt: program.createdAt,
                  updatedAt: program.updatedAt
                })) : (existingData[STORAGE_KEYS.ALL_PROGRAMS] || []);

              let transformedProgramCourses = existingData[STORAGE_KEYS.PROGRAM_COURSES] || [];

              if (programCoursesResult.success && programsResult.success) {
                const programCoursesMap = new Map();

                programCoursesResult.data.forEach(item => {
                  if (!programCoursesMap.has(item.program_id)) {
                    const programInfo = programsResult.data.find(p => p.programId === item.program_id);
                    const keyCourses = programInfo ? programInfo.keyCourses : {};

                    programCoursesMap.set(item.program_id, {
                      programId: item.program_id,
                      programName: item.program_name,
                      firstCourseCode: keyCourses['1st_course'] || '',
                      secondCourseCode: keyCourses['2nd_course'] || '',
                      additionalCourseCode: keyCourses['additional_course'] || '',
                      firstCourse: '',
                      secondCourse: '',
                      additionalCourse: '',
                      courses: [],
                      updated_at: currentTime,
                      alternativeNames: item.alternative_names || [],
                      createdAt: item.created_at,
                      updatedAt: item.updated_at
                    });
                  }

                  const programCourse = programCoursesMap.get(item.program_id);
                  programCourse.courses.push({
                    code: item.course_code,
                    name: item.course_name,
                    sequence: item.sequence || 0,
                    duration: item.course_duration || 0,
                    updated_at: currentTime,
                    courseId: item.course_id,
                    courseType: item.course_type,
                    courseCategory: item.course_category,
                    canSync: item.can_sync,
                    examCodePermission: item.exam_code_permission,
                    activationPermission: item.activation_permission,
                    bookRequirement: item.book_requirement,
                    status: item.status
                  });
                });

                programCoursesMap.forEach(programCourse => {
                  if (programCourse.firstCourseCode) {
                    const course = transformedCourses.find(c => c.courseCode === programCourse.firstCourseCode);
                    if (course) programCourse.firstCourse = course.courseName;
                  }
                  if (programCourse.secondCourseCode) {
                    const course = transformedCourses.find(c => c.courseCode === programCourse.secondCourseCode);
                    if (course) programCourse.secondCourse = course.courseName;
                  }
                  if (programCourse.additionalCourseCode) {
                    const course = transformedCourses.find(c => c.courseCode === programCourse.additionalCourseCode);
                    if (course) programCourse.additionalCourse = course.courseName;
                  }
                  programCourse.courses.sort((a, b) => a.sequence - b.sequence);
                });

                transformedProgramCourses = Array.from(programCoursesMap.values());
              }

              const transformedQuizCodes = quizCodesResult.success ?
                quizCodesResult.data.map(quizCode => ({
                  id: quizCode.id,
                  course_code: quizCode.course_code,
                  course_name: quizCode.course_name,
                  campus: quizCode.campus,
                  exam_id: quizCode.exam_id,
                  quiz_code: quizCode.quiz_code,
                  exam_code: quizCode.exam_code,
                  exam_name: quizCode.exam_name,
                  template_id: quizCode.template_id || null,
                  attachment_required: quizCode.attachment_required || 0,
                  status: quizCode.status || 'active',
                })) : (existingData[STORAGE_KEYS.ALL_QUIZ_CODES] || []);

              let rulesData = {};
              if (healthResult.success && healthResult.data) {
                rulesData = {
                  'rulesData': healthResult.data,
                  'lastHealthUpdate': new Date(healthResult.data.last_updated).getTime()
                };
              }

              APIManager.checkAPIHealth()
                .then(healthCheck => {
                  let apiTimestamps = {};

                  if (healthCheck.success) {
                    const { database } = healthCheck.data;
                    apiTimestamps = {
                      'lastUpdatedCourse': coursesResult.success ? new Date(database.courses_last_updated).getTime() : undefined,
                      'lastUpdatedPograms': programsResult.success ? new Date(database.programs_last_updated).getTime() : undefined,
                      'lastUpdatedPogramsCourses': programCoursesResult.success ? new Date(database.program_courses_last_updated).getTime() : undefined,
                      'lastQuizCodes': quizCodesResult.success ? new Date(database.quiz_codes_last_updated).getTime() : undefined
                    };
                    Object.keys(apiTimestamps).forEach(key => apiTimestamps[key] === undefined && delete apiTimestamps[key]);
                  } else {
                    const now = Date.now();
                    if (coursesResult.success) apiTimestamps.lastUpdatedCourse = now;
                    if (programsResult.success) apiTimestamps.lastUpdatedPograms = now;
                    if (programCoursesResult.success) apiTimestamps.lastUpdatedPogramsCourses = now;
                    if (quizCodesResult.success) apiTimestamps.lastQuizCodes = now;
                  }

                  const data = {
                    [STORAGE_KEYS.ALL_COURSES]: transformedCourses,
                    [STORAGE_KEYS.ALL_PROGRAMS]: transformedPrograms,
                    [STORAGE_KEYS.PROGRAM_COURSES]: transformedProgramCourses,
                    [STORAGE_KEYS.ALL_QUIZ_CODES]: transformedQuizCodes,
                    ...apiTimestamps,
                    ...rulesData
                  };

                  chrome.storage.local.set(data, () => {
                    if (chrome.runtime.lastError) {
                      utils.logError('Error saving API data to storage:', chrome.runtime.lastError);
                      resolve(false);
                      return;
                    }

                    const successCount = [coursesResult.success, programsResult.success, programCoursesResult.success, quizCodesResult.success].filter(Boolean).length;
                    utils.logInfo(`API data loaded successfully (${successCount}/4 successful)`);
                    utils.logInfo(`Courses: ${transformedCourses.length}, Programs: ${transformedPrograms.length}, Program Courses: ${transformedProgramCourses.length}, Quiz Codes: ${transformedQuizCodes.length}`);

                    const quizCodesWithAttachments = transformedQuizCodes.filter(qc => qc.attachment_required === 1);
                    utils.logInfo(`Quiz codes with attachment requirements: ${quizCodesWithAttachments.length}`);
                    if (quizCodesWithAttachments.length > 0) {
                      utils.logInfo('Courses requiring attachments:', quizCodesWithAttachments.map(qc => `${qc.course_code} (${qc.campus})`));
                    }

                    resolve(true);
                  });
                })
                .catch(timestampError => {
                  utils.logWarn('Error getting API timestamps:', timestampError);
                  const data = {
                    [STORAGE_KEYS.ALL_COURSES]: transformedCourses,
                    [STORAGE_KEYS.ALL_PROGRAMS]: transformedPrograms,
                    [STORAGE_KEYS.PROGRAM_COURSES]: transformedProgramCourses,
                    [STORAGE_KEYS.ALL_QUIZ_CODES]: transformedQuizCodes,
                    ...rulesData
                  };

                  chrome.storage.local.set(data, () => {
                    if (chrome.runtime.lastError) {
                      utils.logError('Error saving API data to storage:', chrome.runtime.lastError);
                      resolve(false);
                      return;
                    }
                    utils.logInfo('API data loaded successfully (without timestamps)');
                    utils.logInfo(`Courses: ${transformedCourses.length}, Programs: ${transformedPrograms.length}, Program Courses: ${transformedProgramCourses.length}, Quiz Codes: ${transformedQuizCodes.length}`);
                    resolve(true);
                  });
                });
            });
          })
          .catch(error => {
            utils.logWarn('Error loading data from API:', error);
            resolve(false);
          });
      })
      .catch(error => {
        utils.logWarn('Error checking internet connection:', error);
        resolve(false);
      });
  });
}

function compareVersions(v1, v2) {
  utils.logInfo(`Comparing versions: ${v1} vs ${v2}`);

  if (v1 === v2) {
    utils.logInfo("Versions are identical strings - no update needed");
    return 0; // Exact match, no update needed
  }

  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);

  utils.logInfo("Parsed version parts:", v1Parts, v2Parts);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) {
      utils.logInfo(`Remote version is newer at position ${i}: ${v1Part} > ${v2Part}`);
      return 1;
    }
    if (v1Part < v2Part) {
      utils.logInfo(`Local version is newer at position ${i}: ${v1Part} < ${v2Part}`);
      return -1;
    }
  }

  utils.logInfo("Versions are equivalent after component comparison");
  return 0;
}

function checkForUpdates() {
  try {
    const isOnline = utils.checkInternetConnection({
      timeout: 3000,
      maxRetries: 1,
      showNotifications: false
    });

    if (!isOnline) {
      utils.logInfo('No internet connection, skipping update check');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

    const response = fetch(config.UPDATE_URL, {
      signal: controller.signal,
      method: 'GET',
      cache: 'no-cache'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      utils.logWarn(`Update check failed with status: ${response.status}`);
      return;
    }

    const updateInfo = response.json();
    const currentVersion = chrome.runtime.getManifest().version;
    const comparison = compareVersions(updateInfo.version, currentVersion);

    if (comparison <= 0) {
      clearUpdateFlags();
      return;
    }

    if (comparison > 0) {
      utils.showUpdateNotification(
        "Update Available",
        `New version (${updateInfo.version}) is available.\nPlease click to download.`,
        updateInfo.downloadUrl
      );

      chrome.storage.local.set({ "updateAvailable": true, "updateInfo": updateInfo });
    } else {
      clearUpdateFlags();
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      utils.logWarn('Update check timed out');
    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      utils.logWarn('Update check failed: Network error or server unreachable');
    } else {
      utils.logError("Error during update check:", error);
    }
  }
}

function clearUpdateFlags() {
  chrome.storage.local.set({
    "updateAvailable": false,
    "updateInfo": null
  }, () => {
  });
}

function resetLoginBlocks() {
  loginFailureTracker.helpDesk.isBlocked = false;
  loginFailureTracker.helpDesk.lastFailedCredentials = null;
  loginFailureTracker.launch.isBlocked = false;
  loginFailureTracker.launch.lastFailedCredentials = null;
  loginFailureTracker.ep.isBlocked = false;
  loginFailureTracker.ep.lastFailedCredentials = null;
  loginFailureTracker.api.isBlocked = false;
  loginFailureTracker.api.lastFailedCredentials = null;
  loginFailureTracker.verifast.isBlocked = false;
  loginFailureTracker.verifast.lastFailedCredentials = null;
  loginFailureTracker.canvas.isBlocked = false;
  loginFailureTracker.canvas.lastFailedCredentials = null;
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === config.ALARM_NAME) {
    await EPManager.checkTickets();
  }
  else if (alarm.name === config.STORAGE_CLEANUP_ALARM_NAME) {
    await cleanupStorage();
  }
  else if (alarm.name === config.UPDATE_CHECK) {
    utils.logInfo('Update check alarm triggered');
    try {
      const updateAvailable = await checkForUpdates();
      if (updateAvailable) {
        utils.logInfo('Update available - reloading extension');
        chrome.runtime.reload();
      } else {
        utils.logInfo('No updates available');
      }
    } catch (error) {
      utils.logError('Error checking for updates:', error);
    }
  }
  else if (alarm.name === config.HEALTH_CHECK) {
    // ✅ Periyodik health check
    const needsUpdate = await checkIfNeedsDefaults();
    if (needsUpdate) {
      await loadDefaultData();
    }
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  utils.logInfo('Extension', details.reason);

  // Check notification permission
  const permissionLevel = await chrome.notifications.getPermissionLevel();
  if (permissionLevel !== 'granted') {
    await chrome.notifications.requestPermission();
  }

  // Only refresh tabs when extension is reloaded during development
  if (details.reason === 'update' || details.reason === 'chrome_update') {
    utils.logInfo('Reloading any open EP tabs...');
    // Find and refresh any open EP tabs
    chrome.tabs.query({ url: "https://aoltorontoagents.ca/student_contract/*" }, (tabs) => {
      if (tabs && tabs.length > 0) {
        tabs.forEach(tab => {
          chrome.tabs.reload(tab.id);
        });
        utils.logInfo(`Reloaded ${tabs.length} EP tabs`);
      } else {
        utils.logInfo('No EP tabs found to reload');
      }
    });
  }
  chrome.alarms.create(config.UPDATE_CHECK, { periodInMinutes: config.UPDATE_CHECK_INTERVAL / (60 * 1000) });
  chrome.alarms.create(config.HEALTH_CHECK, { periodInMinutes: config.UPDATE_CHECK_INTERVAL / (60 * 1000) });
  chrome.storage.local.get(['verifastUsername', 'verifastPassword'], (result) => {
    if (!result.verifastUsername || !result.verifastPassword) {
      utils.logInfo('Verifast ' + config.ERRORS.CREDENTIALS_NOT_FOUND);
      return;
    }

    // Automatically login to Verifast if credentials are available
    const credentials = {
      email: result.verifastUsername,
      password: result.verifastPassword
    };
    VerifastManager.loginToVerifast(credentials);
  });
  chrome.storage.local.get(['username', 'password'], (result) => {
    if (!result.username || !result.password) {
      utils.logInfo('API ' + config.ERRORS.CREDENTIALS_NOT_FOUND);
      return;
    }
    APIManager.performLogin();
  });
});

console.log("🔧 Setting up message listener...");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("🔍 Background: Message received:", request.action);
  utils.logInfo('Message received:', request.action);

  if (request.action === 'test') {
    console.log("✅ Background: Test message received!");
    sendResponse({ success: true, message: "Background script is working!" });
    return true;
  }
  if (request.action === 'settingsUpdated') {
    handleSettingsUpdate(request);
    sendResponse({ received: true });
  }
  else if (request.action === 'login') {
    utils.logInfo('Login request received from content script');
    EPManager.performLogin().then(loginSuccessful => {
      if (loginSuccessful) {
        EPManager.checkTickets();
      }
      sendResponse({ loginSuccessful });
    });
    return true;
  }
  else if (request.action === 'checkTickets') {
    utils.logInfo('Manual ticket check requested');
    EPManager.checkTickets()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        utils.logError('Ticket check error:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true;
  }
  else if (request.action === 'getStorageData') {
    utils.logInfo('Storage data requested:', request.keys);
    utils.getStorageData(request.keys)
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        utils.logError('Storage data fetch error:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true;
  }
  else if (request.action === 'setStorageData') {
    utils.logInfo('Storage data update requested');
    utils.setStorageData(request.data)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        utils.logError('Storage data update error:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true;
  }
  else if (request.action === 'loadDefaultData') {
    loadDefaultData()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        utils.logError('Error loading default data:', error);
        sendResponse({ success: false, error: error.message });
      });

    // Return true to indicate async response
    return true;
  }
  else if (request.action === 'apiStudentSearch') {
    utils.logInfo('API student search request received:', request.data);
    APIManager.searchStudent(request.data)
      .then(result => {
        utils.logInfo('API student search result:', result.success);
        sendResponse(result);
      })
      .catch(error => {
        utils.logError('API student search error:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true;
  }
  else if (request.action === 'getWeeklyReports') {
    utils.logInfo('Weekly reports data request received');
    APIManager.getWeeklyReports()
      .then(result => {
        utils.logInfo('Weekly reports data result:', result.success);
        sendResponse(result);
      })
      .catch(error => {
        utils.logError('Weekly reports data error:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true;
  }
  else if (request.action === 'getAdminId') {
    (async () => {
      try {
        const adminId = await APIManager.getAdminId();
        sendResponse({ success: true, adminId: adminId });
      } catch (error) {
        utils.logError('Get admin ID error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  else if (request.action === 'getILPStudents') {
    utils.logInfo('ILP students data request received');
    APIManager.getILPStudents()
      .then(result => {
        utils.logInfo('ILP students data result:', result.success);
        sendResponse(result);
      })
      .catch(error => {
        utils.logError('ILP students data error:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true;
  }
  else if (request.action === "checkPDF") {
    fetch(request.pdfUrl, {
      method: 'GET',
      credentials: 'include'
    })
      .then(async response => {
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const lastBytes = bytes.slice(-4096);
        const lastPortion = new TextDecoder().decode(lastBytes);

        const pdfData = lastPortion;

        const isTypingTrainer = pdfData.includes('/Title (file:///C:/ProgramData/TypingTrainer/type_results.html)');
        const producer = pdfData.includes('/Producer (Microsoft: Print To PDF)');

        const creationMatch = pdfData.match(/\/CreationDate \((D:[^)]+)\)/);
        const modMatch = pdfData.match(/\/ModDate \((D:[^)]+)\)/);

        const datesExist = creationMatch && modMatch;
        const datesMatch = datesExist && (creationMatch[1] === modMatch[1]);

        const isValidTypingTrainer = isTypingTrainer && producer && datesMatch;

        sendResponse({
          success: true,
          isTypingTrainer: isValidTypingTrainer,
          details: {
            titleMatch: isTypingTrainer,
            producerMatch: producer,
            datesMatch: datesMatch
          }
        });
      })

    return true; // Async response için
  }
  else if (request.action === 'downloadFile') {
    fetch(request.fileUrl, {
      credentials: 'include'
    })
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          sendResponse({ success: true, base64data: base64data, fileName: request.fileName, fileType: blob.type });
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        utils.logError('Download error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  else if (request.action === 'helpDeskLogin') {
    utils.logInfo('Help Desk login request received');
    HelpDeskManager.helpDeskLogin()
      .then(result => {
        utils.logInfo('Help Desk login result:', result);
        sendResponse(result);
      })
      .catch(error => {
        utils.logError('Help Desk login error:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true;
  }
  else if (request.action === 'helpDeskDashboard') {
    HelpDeskManager.helpDeskDashboard()
      .then(result => {
        utils.logInfo('Help Desk content fetch result:', result.success);
        sendResponse(result);
      })
      .catch(error => {
        utils.logError('Help Desk content fetch error:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true;
  }
  else if (request.action === 'helpDeskContent') {
    HelpDeskManager.helpDeskPageContent(request.url, request.method, request.data)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        utils.logError('Help Desk page fetch error:', error);
        sendResponse({
          success: false,
          error: error.message,
          url: request.url
        });
      });
    return true;
  }
  else if (request.action === 'helpDeskNewRequest') {
    utils.logInfo('Fetching New Request form');
    HelpDeskManager.helpDeskNewRequest(sendResponse);
    return true;
  }
  else if (request.action === 'viewAttachment') {
    utils.logInfo('Viewing attachment:', request.attachmentId);
    const attachmentUrl = `https://hd.academyoflearning.net/HelpDesk/AttachmentViewer.aspx?AttachmentID=${request.attachmentId}`;

    fetch(attachmentUrl, {
      credentials: "include"
    })
      .then(response => response.blob())
      .then(async blob => {
        const arrayBuffer = await blob.arrayBuffer();
        sendResponse({
          success: true,
          data: Array.from(new Uint8Array(arrayBuffer)),
          type: request.type
        });
      })
      .catch(error => {
        utils.logError('View attachment error:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      });

    return true;
  }
  else if (request.action === 'closeCurrentTab') {
    // Find and close tab by URL
    if (request.targetUrl) {
      chrome.tabs.query({ url: request.targetUrl }, function (tabs) {
        if (tabs && tabs.length > 0) {
          chrome.tabs.remove(tabs[0].id);
        }
      });
    }
  }
  else if (request.action === 'studentPortalLogin') {
    fetch(config.STUDENT_LOGIN_URL + 'loginQuery.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `emailForm=${encodeURIComponent(request.data.email)}&pwdform=${encodeURIComponent(request.data.password)}`
    })
      .then(async response => {
        const text = await response.text();
        if (text !== '403') {
          // Login successful, now check for existing tabs
          chrome.tabs.query({ url: 'https://myaolcc.ca/studentportal/*' }, function (tabs) {
            if (tabs.length > 0) {
              const tab = tabs[0];
              if (tab.url !== 'https://myaolcc.ca/studentportal/s/') {
                chrome.tabs.update(tab.id, {
                  url: 'https://myaolcc.ca/studentportal/s/',
                  active: true
                });
              } else {
                chrome.tabs.reload(tab.id);
                chrome.tabs.update(tab.id, { active: true });
              }
            } else {
              // If no tab exists, create new one
              chrome.tabs.create({
                url: 'https://myaolcc.ca/studentportal/s',
                active: true
              });
            }
          });
        }
        sendResponse({ success: true });
      })
      .catch(error => {
        utils.logError('Student portal login error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // for async response
  }
  else if (request.action === 'launchStudentManager') {
    chrome.storage.local.get(['launchUsername', 'launchPassword'], async function (result) {
      const credentials = {
        userName: result.launchUsername,
        password: result.launchPassword,
        vNumber: request.data.vNumber,
        email: request.data.email,
        status: request.data.status || 'active',
      };

      LaunchManager.openLaunchTab(credentials)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
    });
    return true;
  }
  else if (request.action === 'launchCheck') {
    chrome.storage.local.get(['launchUsername', 'launchPassword'], async function (result) {
      const credentials = {
        userName: result.launchUsername,
        password: result.launchPassword,
        email: request.data.email,
        vNumber: request.data.vNumber,
        firstName: request.data.firstName,
        lastName: request.data.lastName,
        status: request.data.status
      };

      LaunchManager.findStudentFetch(credentials)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
    });
    return true;
  }
  else if (request.action === 'launchUserDetails') {
    const student = request.data.student;
    const vNumber = request.data.vNumber;

    // Call getUserDetails function with student and vNumber
    LaunchManager.getUserDetails(student, vNumber)
      .then(userDetailsHtml => {
        sendResponse({ success: true, userDetailsHtml }); // Send as a property
        return userDetailsHtml;
      })
      .then(userDetailsHtml => LaunchManager.setupTab(student, userDetailsHtml))
      .catch(error => utils.logError(error, 'launchUserDetails post-processing'));
    return true;
  }
  else if (request.action === 'getCourseDetails') {
    (async () => {
      try {
        const { vNumber, student } = request.data;

        if (!vNumber) {
          sendResponse({ success: false, error: 'Missing required vNumber parameter' });
          return;
        }

        // Ensure we're logged in
        const loginResult = await LaunchManager.loginToPortal();
        if (!loginResult.success) {
          utils.logError('Login failed:', loginResult.error);
          sendResponse(loginResult);
          return;
        }

        // Find student in Launch - we need to provide more search criteria
        let studentData = null;

        // If we have student data from API, use it to find the student
        if (student) {
          // Use the student data to search Launch
          const findStudentResult = await LaunchManager.findStudent({
            vNumber: vNumber,
            firstName: student.aolcc_first_name || student.first_name,
            lastName: student.aolcc_last_name || student.last_name,
            email: student.aolcc_email || student.email
          });

          if (findStudentResult) {
            studentData = findStudentResult;
          } else {
            sendResponse({ success: false, error: 'Student not found in Launch' });
            return;
          }
        } else {
          // Fallback: try to find by vNumber only
          const findStudentResult = await LaunchManager.findStudent({ vNumber });
          if (findStudentResult) {
            studentData = findStudentResult;
          } else {
            sendResponse({ success: false, error: 'Student not found in Launch' });
            return;
          }
        }

        if (!studentData) {
          utils.logWarn(`Student not found with vNumber: ${vNumber}`);
          sendResponse({
            success: false,
            message: config.ERRORS.STUDENT_NOT_FOUND
          });
          return;
        }

        // Get user details HTML
        const userDetailsHtml = await LaunchManager.getUserDetails(studentData, vNumber);

        if (!userDetailsHtml) {
          utils.logError('Empty response from getUserDetails');
          sendResponse({ success: false, error: 'Empty response from getUserDetails' });
          return;
        }


        sendResponse({
          success: true,
          data: userDetailsHtml
        });
      } catch (error) {
        utils.logError('Error in getCourseDetails:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
  else if (request.action === 'courseSync') {
    console.log('courseSync called with data:', request);

    (async () => {
      try {
        const syncResult = await LaunchManager.syncMyAolcc({
          data: request.data,
          courseCode: request.courseCode,
          vNumber: request.contractCode,
          userID: request.userID,
          contractID: request.contractID,
          programID: request.programID,
          uniqueProgramID: request.uniqueProgramID,
          uniqueID: request.uniqueID
        });

        console.log('courseSync result:', syncResult);
        sendResponse(syncResult);
      } catch (error) {
        console.error('courseSync error:', error);
        sendResponse({
          success: false,
          message: `Sync failed: ${error.message}`
        });
      }
    })();

    return true; // Keep message channel open for async response
  }
  else if (request.action === 'courseActivation') {
    (async () => {
      const activationResult = await LaunchManager.courseActivation({
        data: request.data, // Bu artık parsed JSON data
        courseCodes: request.courseCodes,
        vNumber: request.contractCode,
        isCPL: request.isCPL,
        programData: request.programData
      });

      sendResponse(activationResult);
      return true; // Keep message channel open for async response
    })();
    return true; // Keep message channel open for async response
  }
  else if (request.action === 'updateLaunchData') {
    LaunchManager.updateLaunchData(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  else if (request.action === 'verifyContract') {
    chrome.storage.local.get(['launchUsername', 'launchPassword'], async function (result) {
      const credentials = {
        userName: result.launchUsername,
        password: result.launchPassword,
        email: request.data.email,
        campus: request.data.campus,
        vNumber: request.data.vNumber
      };
      LaunchManager.verifyContract(credentials)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
    });
    return true;
  }
  else if (request.action === 'getKPIReport') {
    console.log("🎯 Background: KPI Report request received", request.data);
    utils.logInfo('KPI Report request received', request.data);
    
    LaunchManager.getKPIReport(request.data)
      .then(result => {
        console.log("✅ Background: KPI Report result:", result);
        utils.logInfo('KPI Report result:', result.success);
        sendResponse(result);
      })
      .catch(error => {
        console.log("❌ Background: KPI Report error:", error);
        utils.logError('KPI Report error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  else if (request.action === 'verifastCheck') {
    // Create a request ID
    const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 5);

    // Initialize if not exists
    if (!globalThis.verifastActiveRequests) {
      globalThis.verifastActiveRequests = {};
    }

    // Track this request
    globalThis.verifastActiveRequests[requestId] = 'active';

    chrome.storage.local.get(['verifastUsername', 'verifastPassword'], async function (result) {
      try {
        // Check if this request was canceled
        if (globalThis.verifastActiveRequests[requestId] === 'canceled') {
          sendResponse({ success: false, canceled: true });
          delete globalThis.verifastActiveRequests[requestId];
          return;
        }

        const credentials = {
          email: result.verifastUsername,
          password: result.verifastPassword,
          studentMail: request.data.email
        };

        const data = await VerifastManager.getRestData(credentials);

        // Check again if canceled during async operation
        if (globalThis.verifastActiveRequests[requestId] === 'canceled') {
          sendResponse({ success: false, canceled: true });
        } else {
          if (request.data.verifyContract) {
            const contractData = await LaunchManager.verifyContract({ email: credentials.studentMail, vNumber: credentials.vNumber });

            data.contractData = contractData;
          }
          sendResponse(data);
        }

        // Clean up
        delete globalThis.verifastActiveRequests[requestId];
      } catch (error) {
        utils.logError('VerifastCheck error:', error);
        sendResponse({ success: false, error: error.message });
        delete globalThis.verifastActiveRequests[requestId];
      }
    });
    return true;
  }
  else if (request.action === 'stopVerifastChecks') {
    // Cancel any pending Verifast checks
    utils.logInfo('Stopping all pending Verifast checks');

    // Create a global variable to track active Verifast requests if it doesn't exist
    if (!globalThis.verifastActiveRequests) {
      globalThis.verifastActiveRequests = {};
    }

    // Mark all active requests as canceled
    for (const requestId in globalThis.verifastActiveRequests) {
      globalThis.verifastActiveRequests[requestId] = 'canceled';
    }

    // Reset the tracking object
    globalThis.verifastActiveRequests = {};

    sendResponse({ success: true });
    return true;
  }
  else if (request.action === 'progressSheetData') {
    (async () => {
      // Create unique operation ID
      const operationId = 'progress_' + Date.now();
      activeProgressOperations[operationId] = 'active';

      // Use a constant key instead of generating a new one each time
      const FIXED_DATA_KEY = 'progressSheetData';

      try {
        // Pass the operation ID to progressSheetData
        const progressData = await APIManager.progressSheetData(operationId);

        // Check if operation was cancelled
        if (activeProgressOperations[operationId] === 'canceled') {
          sendResponse({
            success: false,
            cancelled: true,
            error: "Operation cancelled by user"
          });
        } else {
          // First, clear any existing data with the fixed key
          await chrome.storage.local.remove(FIXED_DATA_KEY);

          // Then store the new data with the fixed key
          await chrome.storage.local.set({
            [FIXED_DATA_KEY]: progressData,
            progressSheetDataKey: FIXED_DATA_KEY // Store the current key for easy retrieval
          });

          // Send back metadata and the storage key
          sendResponse({
            success: true,
            dataKey: FIXED_DATA_KEY,
            recordCount: progressData.length,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        utils.logError('Error fetching T2202 progress data:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      } finally {
        // Clean up
        delete activeProgressOperations[operationId];
      }
    })();
    return true; // Keep message channel open for async response
  }
  else if (request.action === 'stopProgressSheetData') {
    utils.logInfo('Stopping progress sheet data operation');
    // Mark all active operations as cancelled
    Object.keys(activeProgressOperations).forEach(id => {
      activeProgressOperations[id] = 'canceled';
    });

    // Update progress indicator to show cancellation
    chrome.storage.local.get('progressSheetProgress', result => {
      if (result.progressSheetProgress) {
        const cancelledProgress = {
          ...result.progressSheetProgress,
          message: 'Operation cancelled by user',
          progress: 100,
          isCancelled: true
        };
        chrome.storage.local.set({ 'progressSheetProgress': cancelledProgress });
      }
    });

    sendResponse({ success: true });
    return true;
  }
  else if (request.action === 'cleanProgressSheetData') {
    const FIXED_DATA_KEY = 'progressSheetData';
    chrome.storage.local.remove([FIXED_DATA_KEY, 'progressSheetDataKey'], () => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }
  else if (request.action === 'canvasLoginBatchCheck') {
    (async () => {
      try {
        const emails = request.emails || [];
        const results = await CanvasManager.batchCheckCanvasLogins(emails, (processed, total, currentEmail) => {
          // Send progress updates back to content script
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'canvasCheckProgress',
            processed,
            total,
            currentEmail
          }).catch(() => { }); // Ignore errors if tab closed
        });

        sendResponse({ success: true, results });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // For async response
  }
  else if (request.action === 'stopCanvasChecks') {
    CanvasManager.stopAllChecks();
    sendResponse({ success: true });
    return false;
  }
  if (request.action === 'showNotification') {
    utils.showHDNotification(request.title, request.message)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // async response için
  }
});

chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'local') {
    // Clear blocks when any credentials change
    if (changes.launchUsername || changes.launchPassword) {
      loginFailureTracker.launch.isBlocked = false;
      loginFailureTracker.launch.lastFailedCredentials = null;
      loginFailureTracker.helpDesk.isBlocked = false;
      loginFailureTracker.helpDesk.lastFailedCredentials = null;
    }

    if (changes.username || changes.password) {
      loginFailureTracker.ep.isBlocked = false;
      loginFailureTracker.ep.lastFailedCredentials = null;
      loginFailureTracker.api.isBlocked = false;
      loginFailureTracker.api.lastFailedCredentials = null;
    }

    if (changes.verifastUsername || changes.verifastPassword) {
      loginFailureTracker.verifast.isBlocked = false;
      loginFailureTracker.verifast.lastFailedCredentials = null;
    }

    if (changes.canvasUsername || changes.canvasPassword) {
      loginFailureTracker.canvas.isBlocked = false;
      loginFailureTracker.canvas.lastFailedCredentials = null;
    }

    utils.logInfo('Login blocks cleared due to credential changes');
  }

  // Existing settings update code
  const updatedSettings = Object.entries(changes).reduce((acc, [key, { newValue }]) => {
    acc[key] = newValue;
    return acc;
  }, {});
  await handleSettingsUpdate(updatedSettings);
});

chrome.notifications.onClicked.addListener((notificationId) => {
  utils.logInfo('Notification clicked:', notificationId);
  chrome.notifications.clear(notificationId);
  chrome.tabs.create({ url: config.MINE_LIST_URL });
});

checkForUpdates();
cleanupProgressSheetData();
init();

// ========== INJECTION LOGIC ========== //
// Note: This section was moved to content scripts as it requires DOM access

} catch (error) {
  console.error("❌ Critical error in background script:", error);
  console.error("❌ Error stack:", error.stack);
}
