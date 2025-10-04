# CHANGELOG.md

All major changes to this project will be documented in this file.

## [5.1.2] - 2025-07-23
#### Added
- Enhanced course sync functionality with automatic grade detection and display
- Auto-loading of Template 116 (Denied - Missing Exams) when "Grade item is missing" is detected during sync
- Course grade display in sync success messages with pass/fail status (Pass, Honours, Complete, Fail)
- Improved course name handling in activation templates by using clean data from button attributes
- English localization for unmatched course error messages in exam schedule analysis

#### Enhanced
- Course sync now displays student grades with percentage and status after synchronization
- Simplified course name extraction logic to avoid HTML elements and tooltip text contamination
- Optimized template loading workflow for course activation scenarios
- Improved sync response analysis to extract exam marks from JSON data more accurately

#### Fixed
- Course activation templates now display clean course names without HTML tags, tooltips, or badges
- Sync grade detection now properly extracts exam marks from sync response data
- Status code mapping corrected: Status 2 = Pass, Status 3 = Honours, Status 10 = Complete, Status 5 = Fail
- Removed unnecessary course name cleaning functions in favor of cleaner data source approach

## [5.1.1] - 2025-07-21
#### Added
- Enhanced showCustomModal to accept custom confirm button text
#### Fixed
- Updated ticket activation logic to correctly handle early start dates
- Corrected the API endpoint for quiz codes and ensured all fields are included in the response transformation
- Updated CSS to include note-editable span for consistent display and removed unnecessary whitespace

## [5.1.0] - 2025-07-18
#### Added
- Enhanced course analysis with asynchronous processing and fallback mappings
- Added handling for attachment requirements in ticket details
- Introduced filters for "pending hours" and enhanced weekly reports with new data processing
- Enhanced course display with a book icon, category label, and a tooltip for book requirements
- Implemented a "refresh data" function with a loading state in the popup
#### Changed
- Simplified loading state management for note deletion and course data fetching

## [5.0.0] - 2025-07-17

### What's New in Version 5.0
Version 5.0 is a landmark release, fundamentally transforming the application's performance, reliability, and feature set. We have moved from local data storage to a powerful new backend API, enabling unprecedented speed, data accuracy, and a suite of robust new tools designed to streamline your workflow.

#### New Features
**Core Infrastructure & Data Management**
- **Backend API Integration**: This is the core of Version 5.0. We have completed a full migration from local storage to a robust backend API. This change significantly enhances data consistency, reliability, and scalability across the entire application.
- **Live Data Synchronization**: All data, including student courses and program details, is now fetched in real-time from the API. This eliminates manual data management and ensures you are always working with the most up-to-date information.
- **API Health Check**: An automated, behind-the-scenes system now monitors the API's status, proactively ensuring system stability and uptime.
- **Manual Data Refresh**: A new "Refresh Data" button in the popup allows you to instantly sync with the latest data from the API, ensuring you have the absolute latest information without waiting for an automatic refresh.

**Ticket & Course Management**
- **Dynamic Course Actions**: View a student's active and future courses directly within the ticket view. Perform course Synchronization, Activation, and send Exam Codes instantly without any page reloads, dramatically speeding up ticket resolution.
- **Enhanced ILP Student Identification**:
  - Students in ILP (Individualized Learning Plan) programs are now automatically highlighted in the ticket list for immediate recognition.
  - A new filter has been added to the ticket list to display only ILP-related tickets, helping you focus on these priority cases.
- **Advanced Course Display & Workflow Intelligence**:
  - **Attachment Reminder Icon**: A new attachment icon acts as a crucial visual reminder for courses requiring a file to be attached when sending exam codes, preventing errors and ensuring compliance.
  - **Textbook Requirement Icon**: A book icon now clearly indicates which courses require a physical or digital textbook.
  - **Course Category Labels**: Courses are now tagged with essential category labels (e.g., Core, Education Department). This provides immediate context about a course's role in the student's academic program at a glance.

**Reporting & Analytics**
- **Unified & Powerful Weekly Report**: We've consolidated the "At-Risk Report" and "Biweekly Report" into a single, comprehensive "Weekly Report". This simplifies compliance monitoring and provides a more holistic view of student progress.
- **Advanced Reporting Capabilities**:
  - **Advanced Filtering**: Filter reports by multiple criteria, including Program, Status, Campus, CPL, Average Marks, and completion metrics.
  - **Pagination**: Easily navigate through large report datasets with intuitive pagination controls.
  - **Excel Export**: Download both filtered results and the complete report in Excel format for offline analysis, sharing, and archiving.

---

#### Added
- **API Integration for Course Management (Major Feature)**: Implemented API-driven course activation and exam code retrieval.
- **Campus Retrieval & API Health Check**: Added functionality to determine a student's campus from their vNumber and implemented an API health check on startup.
- **ILP Student Highlighting**: Implemented highlighting for ILP students in the pending list and added API student search functionality.
- **Weekly Reports Module**: Added a comprehensive "Weekly Reports" feature with advanced filtering, pagination, and Excel download capabilities.

#### Changed
- Refactored exam code retrieval to use local storage for improved performance and data handling.
- Enhanced launch button styles to include a disabled state and improved hover effects.
- Simplified activation template handling by removing redundant functions and improving processing logic.
- Enhanced course table population logic and added sync permission checks in ticketDetailManager.
- Refactored and cleaned up numerous console.log statements across multiple modules to improve code clarity.

## [4.1] - 2025-06-18
#### Added
- Metadata fetching for default files with updated_at timestamps in background processing
- Token storage and retrieval for Verifast API authentication
- Login failure tracking and credential validation for HelpDesk and Launch
- Enhanced course activation logic with SFS course skipping for CPL students
#### Fixed
- 2nd Course Codes and enhanced All Courses list for improved accuracy
- Fullname retrieval logic in Acme Student List and Course Activator for better accuracy
- Error handling in findStudent method with enhanced logging for debugging
- URL checks in enhanceExcelDownloadButton to include student profile URL
- Ticket loading logic with exact vno filtering and improved error handling
#### Changed
- Enhanced verifastCheck logic for improved status handling and caching
- Removed redundant cache retrieval logic in launchCheck method
- Consolidated duplicate check buttons into single button for Unique Identifier Student Lists with enhanced error handling
- Updated course completion status criteria and added new course codes to JSON
- Updated course durations and corrected course codes in JSON files
- Improved launch check error handling to account for non-empty student list

## [4.0] - 2025-06-09
#### Added
- Added early login check and improve error handling in student processing
- Advanced Tools button with super admin access control
- Clear All button functionality in ErrorHandler
- Enhanced ticket management functionality
- Content and popup scripts for AOL Enhancer extension
#### Fixed
- Super admin access check logic
- Streamlined rendering for duplicate tickets table
- Status handling in LaunchManager and UIManager
- Missing newlines at the end of JavaScript files
#### Changed
- Refactored content.js into multiple modules
- Improved DataTable usage with DataTableManager
- Enhanced button loading state management

## [3.9.5] - 2025-05-12
#### Added
- Graduation tracker with month/year selection
- Business Administration + Toronto record checks
- MutationObserver management to CacheManager
- Funding Source and Program mapping features
#### Fixed
- Contract ID extraction and matching logic
- Verifast login process and response handling
- Setup tab storage and error handling
#### Changed
- Enhanced validation logic for campus and program checks
- Improved console logging and error feedback
- Streamlined CPL activation logic

## [3.9.3] - 2025-04-14
#### Added
- Canvas account check function
- 'Check Duplicates' button in list-viewer
- SFS check button with campus filtering
- Enhanced alert system with queue management
#### Fixed
- Email column shifting logic
- HD button error handling
- Bulk functions query issues
- Table row styling and layout consistency
#### Changed
- Updated CSS for improved cursor styles
- Enhanced Excel processing with additional options
- Improved filename generation with fallback logic

## [3.9.1] - 2025-03-17
#### Added
- Email decoding for Cloudflare encrypted emails
- Enhanced course activation logic for TYP courses
- CPL activation handling with improved management
- First name and last name fields for launch button
#### Fixed
- Course name formatting for improved readability
- Launch button success/error state indicators
- Student data handling and localStorage management
#### Changed
- Updated course mapping for consistency
- Refactored settings page with enhanced styling
- Adjusted alert positioning for better visibility

## [3.8.0] - 2025-02-13
#### Added
- Course Progress table on Student Profile page
- Student notes and messages with simple text editor
- Student ticket retrieval and display features
- Import/Export functionality for settings
#### Fixed
- Failed course alert handling and messaging
- Bulk verify index error
- Cache problems and merged columns function
- Loading animations on helpdesk
#### Changed
- Enhanced progress data handling with cleanup functions
- Improved course and program data organization
- Refactored copy icon functionality and V-number retrieval

## [3.7.0] - 2025-01-15
#### Added
- Settings page for Courses, Programs and ProgramCourses
- IndexedDB cache system for large data storage
- CSV uploader and processor with UI enhancements
- Course Progress CSV generator
- Searchable Program Filter List
#### Fixed
- Cache and date handling issues
- Excel fetch and result processing
- Launch button functionality in list-viewer
- Email extraction from rows
#### Changed
- Updated Bootstrap, Popper and jQuery dependencies
- Changed FontAwesome version
- Enhanced program and course management features
- Improved styles with global line-height

## [3.6.3] - 2024-12-12
#### Added 
- Added KBD Denied templates on Quick Buttons
- Improved Visualization
#### Fixed
- Recent bug fixes

## [3.6.2] - 2024-12-04
#### Added
- Added Student Portal icon on Active Student List
- Added Filters on Student List
- Added TO, BR, NY filters on Ticket List page
- Show status only Processing as a default on My Ticket 
- Improved Visualization
#### Fixed
- Recent bug fixes

## [3.6.1] - 2024-11-27
#### Added
- Added Send & Close button
- Added Control for Empty Message
- Added Session Control for Launch fetchs
- Added Launch Portal button on Student List page
- Removed all target _blank attributes
- Added Processing animation for clicked Launch Open Portal buttons
- Disabled autocomplete on various inputs
- Improved Visualization
#### Fixed
- Search Result list tooltip on New Request page
- Fixed counter on Open menu

## [3.6] - 2024-11-25
#### Added
- Added "Open Launch Portal" button on Ticket and Student Profile Page
- Added Assing To Me button on Ticket Detail page for non-Assigned tickets
#### Fixed
- Assign to me
- Find Duplicate Ticket

## [3.5.1] - 2024-11-21
#### Added
- Added notification function for the HD Requests
- Added Show Only Open Requests filter on My Requests page
#### Fixed
- Recent bug fixes

## [3.5] - 2024-11-12
#### Added
- HD Integration Completed.
- Added modal feature for attached files and Scheduling Exam Documents file
- Added "Return It" button to return the ticket to the Open Tickets list
- Added "Reactivate It" button to activate closed tickets.
- Added Typing Trainer result files check function.   
#### Fixed
- Recent bug fixes

## [3.4.4] - 2024-10-17
#### Added
- Find Duplicate Tickets for same date, vnumber, subject, description.
- Disabled collapse for all of active menus
- Made minor visual changes
#### Fixed
- Recent bug fixes

## [3.4.3] - 2024-10-08
#### Added
- Disabled collapse for Tickets menu
- Added remember last hamburger menu state
- Made minor visual changes
#### Fixed
- Recent bug fixes

## [3.4.2] - 2024-10-07
#### Added
- Added searchbox on the Menu
#### Fixed
- Recent bug fixes

## [3.4.1] - 2024-10-03
#### Added
- Quick Buttons all of types
- Added color on Quick Buttons
- Change style of View Ticket page
#### Developed
- Performance improvements

## [3.4.0] - 2024-10-03
#### Added
- Copy icon on personal mails
- Quick Buttons on View Ticket page
- Searchable Templates List on View Ticket page
- Export, Import settings on Extension options.
#### Fixed
- Recent bug fixes
#### Developed
- Performance improvements
- Improved time function


## [3.3.0] - 2024-09-25
#### Added
- Latest stable version
#### Fixed
- Recent bug fixes
#### Developed
- Performance improvements
- Improved dwell time function

## [3.0.0] - 2024-09-23
#### Added
- Function to check if users login and auto login before performing the "Assign to Me" action
- Function to check if a ticket is already assigned before performing the "Assign to Me" action
- Loading animation for new elements on the view ticket page
#### Changed
- Switched to service for ticket control

## [2.3.0] - 2024-09-20
#### Added
- Service-based login
- Feature to save EP username and password in plugin settings
- "Assign to me" button
- Ability to merge name items on the View Ticket page
- Student mails and exam schedule viewing on the View Ticket page
- Inline alert for copy operations

## [2.1.0] - 2024-09-17
#### Added
- Copy feature for student profile details on both Student Profile and View Ticket pages
- Hide BR and TO templates based on V number
- Changed style of password reset buttons
- Ability to sort templates alphabetically

## [2.0.0] - 2024-09-15
#### Added
- Failed course warning in student profile based on Course Progress Details data
- Copy function for V number
- Feature to set additional waiting time after ticket found (Cooldown)
- Feature to convert @my-aolcc.com email addresses into Canvas portal links
- Feature to open PDF links in new tabs without right-clicking

## [1.0.0] - 2024-09-13
#### Added
- First release
- Basic ticket notification feature
- Ticket counting using site visit with selectors
- Session control and warning

## [0.1.0] - 2024-09-04
#### Added
- Project initiated
- Development started