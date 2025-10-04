┌──────────────────────────────────────────────────────────────────┐
│                    STUDENT PORTAL ECOSYSTEM                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐                                         │
│  │   Student Portal    │                                         │
│  │    (Next.js)        │                                         │
│  │                     │                                         │
│  │ ┌─────────────────┐ │                                         │
│  │ │   Dashboard     │ │                                         │
│  │ │   Messages      │ │                                         │
│  │ │   Attendance    │ │                                         │
│  │ │   Course Mgmt   │ │                                         │
│  │ └─────────────────┘ │                                         │
│  └─────────────────────┘                                         │
│           │                                                      │
│           │ JWT Token Auth                                       │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │              INTERMEDIATE API SERVER                         ││
│  │                                                              ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   ││
│  │  │   Auth      │  │   Course    │  │   Ticket/Message    │   ││
│  │  │  Service    │  │  Service    │  │     Service         │   ││
│  │  │             │  │             │  │                     │   ││
│  │  │ • JWT       │  │ • Sync      │  │ • Ticket Creation   │   ││
│  │  │ • Session   │  │ • Activate  │  │ • Message Thread    │   ││
│  │  │ • Rate      │  │ • Progress  │  │ • File Uploads      │   ││
│  │  │   Limiting  │  │   Tracking  │  │                     │   ││
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   ││
│  └──────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              │ Legacy API Calls                  │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                    LEGACY SYSTEMS                            ││
│  │                                                              ││
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐││
│  │ │ SP Portal   │ │ EP Portal   │ │   Canvas    │ │ Launch    │││
│  │ │             │ │             │ │             │ │           │││
│  │ │ • Student   │ │ • Attendance│ │ • Course    │ │ • Course  │││
│  │ │   Data      │ │   Tracking  │ │   Content   │ │   Mgmt    │││
│  │ │ • Tickets   │ │ • Progress  │ │ • Grades    │ │ • Grades  │││
│  │ │ • Messages  │ │   Reports   │ │ • Quizzes   │ │ • Sync    │││
│  │ │             │ │             │ │             │ │ • Activate│││
│  │ └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘

# Student Portal Modernization - Technical Specification

This document has been prepared based on information obtained from the existing AOL Enhancer extension and the features specified in the technical specification.

## 1. System Architecture Overview

This project creates a comprehensive structure that modernizes the existing student portal by incorporating a new Next.js-based frontend, a secure intermediate API server, and integration with existing systems. This architecture offers significant advantages in terms of performance, scalability, and developer experience.

### System Components:

```
[New Student Portal (Next.js)] 
    ↕ (Secure Token-based API)
[Intermediate API Server] 
    ↕ (Legacy API Calls)
[SP Portal] [EP Portal] [Canvas] [Launch Platform]
```

In this architecture, the new Student Portal manages the user interface and user interactions, while all sensitive business logic and communication with external systems will be carried out through the Intermediate API Server. This separation allows for security, ease of maintenance, and independent development of different systems.

## 2. New Student Portal (Frontend)

### 2.1 Technology Stack

-   **Framework:** Next.js (React-based, with server-side rendering (SSR) and static site generation (SSG) capabilities)
-   **UI Library:** Tailwind CSS + shadcn/ui (for customizable and accessible UI components compatible with Next.js)
-   **State Management:** React Context API or alternatively lightweight libraries like Zustand/Jotai (for global state management, such as theme and language settings)
-   **Icons:** Lucide React (for modern and customizable icons)
-   **Data Fetching:** Next.js's own data fetching mechanisms (getServerSideProps, getStaticProps, along with libraries like SWR or React Query) will be used

### 2.2 Core Features Implementation

#### Dashboard Components

The dashboard is the main page that summarizes students' course progress, weekly attendance, and notifications. Course cards will dynamically offer different actions based on the student's course status:

-   **Canvas checks whether the required prerequisites for a course to be SYNC-able have been completed.** A Sync button will appear for these courses. This button will be used to synchronize the student's course progress with the Launch platform. This process is critical for updating the student's final grade and course status and for creating student progress data.

-   **Upcoming Courses:** Future courses will be marked as "Upcoming" and will have a passive "Activate" button. This button will become active when the student meets certain conditions (e.g., no active ILS courses, Fail count less than 2). This visually indicates when the student can start the next course.

-   **Scheduled Finish Date:** Each course card will display the course completion date. This information can be obtained through our existing temporary API, helping students plan their time management.

#### Messages Section

The messages section is a central communication point for students to manage their support requests and receive announcements from the college. Form submission will be processed through Legacy API Calls via the Intermediate API Server when certain conditions are met (e.g., students can send tickets weekdays between 10AM - 9 PM). A plan will also be made to track when student tickets receive responses. This section will have the following features to improve user experience:

-   **New Ticket Form:** When creating a new support request, students will be able to select subject, message, and **ticket type** (e.g., Technical Support, Course Support, Billing, etc.). They will also have the ability to **attach files** to their requests.

-   **Chat Bubble Design:** Messages within tickets will be displayed in a modern chat bubble format. This will make communication more natural and understandable.

-   **Active and Passive Ticket Views:**
    -   **Active Tickets:** Tickets that the student is actively working on or waiting for a response will be displayed in detail with the complete message history.
    -   **Passive Tickets:** Completed or closed tickets will be listed with only summary information (date, title, type, ticket number, responding user information, response date) and access to details will be provided through a "View" button. This keeps the interface organized while providing easy access to historical records.

#### General Design Revision

The portal's overall aesthetics will be updated with a green-heavy color palette and modern UI/UX principles. This will include a more elegant appearance with gradient backgrounds, shadow effects, and modern design elements like backdrop blur. Margins and spacing between components will be optimized to provide a more spacious and user-friendly layout.

## 3. Intermediate API Server

The Intermediate API Server will serve as a secure and controlled bridge between the Next.js frontend and existing legacy systems (SP Portal, EP Portal, Canvas, Launch Platform). This layer provides security, performance, and ease of maintenance by preventing the frontend from directly interacting with legacy systems.

### 3.1 Existing Extension Functions - Reference Implementation

Critical functions found in the existing AOL Enhancer extension will be adapted in the new API Server as follows:

#### 3.1.1 Course Synchronization Functions

**Existing Extension References:**
- `TicketDetailManager.syncSelectedCourse()` - Synchronizes selected course
- `LaunchManager.syncMyAolcc()` - MyAOLCC synchronization with Launch platform
- `DataService.courseSyncHandler()` - Manages course synchronization operations

**API Endpoint:** `POST /api/v1/courses/sync`

This endpoint will be used to synchronize courses completed by students in Canvas with the Launch platform. The logic of the `syncMyAolcc` function from the existing extension will be implemented here:

```javascript
// Parameters referenced from existing extension:
{
  courseCode: string,        // Course code to be synchronized
  contractCode: string,      // Student contract code (V-Number)
  userID: number,           // Launch platform user ID
  contractID: number,       // Contract ID
  programID: number,        // Program ID
  uniqueProgramID: string,  // Unique program ID
  uniqueID: string         // Course unique ID
}
```

**Business Logic:** Using the logic from the `extractCourseItemForSync` and `syncMyAolcc` functions in the existing extension, course information will be sent to the Launch platform and synchronized with Canvas grades.

#### 3.1.2 Course Activation Functions

**Existing Extension References:**
- `DataService.courseActivationHandler()` - Main course activation logic
- `LaunchManager.courseActivation()` - Launch platform course activation
- `StudentProfileManager.enhanceProgramCoursesTable()` - Program course table management

**API Endpoint:** `POST /api/v1/courses/activate`

This endpoint will be used to activate students' new courses. Complex activation rules from the existing extension will be implemented here:

**Activation Rules (From Existing Extension):**
- Special logic for CPL students (`isCPL` parameter)
- Sequence control for TYP courses (`canActivateTypCourse`)
- Maximum active course count control (`getMaxAllowedCourses`)
- Special handling for SFS courses
- First/Second course prioritization logic

```javascript
// Activation parameters:
{
  courseCodes: string[],     // Course codes to be activated
  contractCode: string,      // V-Number
  isCPL: boolean,           // CPL student check
  programData: object,      // Program information
  additionalCourseCode: string // Additional course code
}
```

#### 3.1.3 Exam Code and Progress Tracking

**Existing Extension References:**
- `DataService.analyzeStudentCourses()` - Student course analysis
- `StudentProfileManager.matchCoursesWithApiSequence()` - API course sequence matching
- Exam schedule integration through temporary API

**API Endpoints:**
- `GET /api/v1/courses/schedule` - Retrieves course schedule
- `POST /api/v1/courses/progress` - Updates course progress
- `GET /api/v1/exams/codes` - Retrieves exam codes

**Exam Code Business Logic:** Using the exam schedule integration from the existing extension, it will be determined which courses' exam codes the student can obtain and Canvas completion control will be performed.

### 3.2 Architecture

The Intermediate API Server will be designed according to the following basic principles:

-   **Token Validation:** Every request from the frontend will be validated with a student-specific, unique, and secure token. These tokens can be in JWT (JSON Web Token) format and will expire after a certain period.
-   **Business Logic:** Complex business logic specific to legacy systems (e.g., course activation rules, attendance validation) will be executed at this layer. This ensures that the frontend remains only as a presentation layer.
-   **Legacy System Integration:** The Intermediate API Server will communicate with each legacy system (SP, EP, Canvas, Launch) through their own APIs or web interfaces. This communication will be carried out in accordance with the methods specified in the existing documentation.

### 3.3 Core API Endpoints

The Intermediate API Server will provide various endpoints to meet all the functions needed by the student portal. These endpoints will cover areas such as authentication, course management, attendance recording, and ticket operations.

#### 3.3.1 Authentication and Token Management

**Endpoints:**
- `POST /api/v1/auth/login` - Student login
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/logout` - Secure logout

When student login is successful, a student-specific, short-lived, and secure JWT token will be created by the Intermediate API Server. This token will be used for authentication in all subsequent API requests. The token will contain the student's identity and permissions, so it can be verified that each request comes from an authorized user.

#### 3.3.2 Course Management (Launch Platform Integration)

**Endpoints:**
- `GET /api/v1/courses` - Lists student courses
- `POST /api/v1/courses/sync` - **syncMyAolcc function implementation**
- `POST /api/v1/courses/activate` - **courseActivationHandler function implementation**
- `GET /api/v1/courses/{courseId}/details` - Retrieves course details
- `GET /api/v1/courses/schedule` - **exam schedule with analyzeStudentCourses function**

**Launch Platform Integration:** All functions of the `LaunchManager` class in the existing extension (verifyContract, getUserDetails, updateLaunchData) will be implemented at this layer.

#### 3.3.3 Attendance Recording (EP Portal Integration)

**Endpoints:**
- `POST /api/v1/attendance/start` - Starts attendance session
- `POST /api/v1/attendance/update` - Updates attendance (with WebSocket)
- `POST /api/v1/attendance/end` - Ends attendance session
- `GET /api/v1/attendance/summary` - Weekly attendance summary

Students' study hours will be sent to the Intermediate API Server and processed here. This includes steps such as validating attendance rules and permanently storing data. This data will then be sent to EP Portal through Legacy API Calls.

**Attendance Rules:**
1.  **Weekly Minimum Hours:** 20 hours
2.  **Maximum Hours Per Study Session:** 4 hours
3.  **Maximum Hours Recordable Per Day:** 8 hours
4.  **Weekly Maximum Total Hours:** 40 hours

#### 3.3.4 Ticket/Message System (SP Portal Integration)

**Endpoints:**
- `GET /api/v1/tickets` - Lists student tickets
- `POST /api/v1/tickets` - Creates new ticket
- `GET /api/v1/tickets/{ticketId}` - Retrieves ticket details
- `POST /api/v1/tickets/{ticketId}/messages` - Adds message to ticket
- `POST /api/v1/tickets/{ticketId}/files` - Uploads file

**Existing Extension Reference:** The template system and ticket handling logic in the `TicketDetailManager` class will be used.

#### 3.3.5 Canvas Integration

**Endpoints:**
- `GET /api/v1/canvas/courses/{courseId}/completion` - Course completion status
- `GET /api/v1/canvas/grades` - Canvas grades
- `POST /api/v1/canvas/sync` - Canvas synchronization

**Grade Validation:** The "Grade item is missing" control and template 116 loading logic from the existing extension will be implemented.

### 3.4 WebSocket Integration

**WebSocket** technology can be considered for scenarios requiring real-time and continuous connection. WebSocket provides low-latency, bidirectional communication by establishing a persistent connection between the client (browser) and server. This is ideal especially for monitoring student activity in real-time and providing continuous information flow to the server.

**WebSocket Endpoints:**
- `/ws/attendance` - Attendance tracking
- `/ws/notifications` - Real-time notifications
- `/ws/course-updates` - Course status updates

## 4. Security Implementation

Security is one of the most critical components of this project. Comprehensive security measures will be taken at both frontend and backend layers.

### 4.1 Token-Based Authentication

JWT (JSON Web Token) based authentication will be used in the student portal. When a student successfully logs in, a signed JWT token will be created by the Intermediate API Server and transmitted to the frontend. This token will be sent in all subsequent API requests under the `Authorization` header. On the server side, this token will be validated at the beginning of each request and the token's validity, duration, and contained permissions will be checked.

**Alternative Authentication Methods:**

-   **OAuth 2.0 / OpenID Connect:** For larger and more complex systems, especially when multiple applications or services need authentication, standards like OAuth 2.0 and OpenID Connect may be more appropriate. This includes concepts of Authorization Server and Resource Server and provides a more flexible authorization flow.
-   **Session-based Authentication:** Session-based authentication used in traditional web applications (storing session information on the server side) is also an option, but this can pose challenges in terms of scalability and state management, especially in distributed systems or mobile applications.

### 4.2 Authorization

In addition to authentication, authorization mechanisms will be implemented to ensure that each user can only access resources they are authorized for. This can be achieved through role-based access control (RBAC) or attribute-based access control (ABAC). JWT tokens can contain user roles or permissions and access decisions can be made based on this information at API endpoints.

### 4.3 Rate Limiting and Attack Prevention

Comprehensive rate limiting will be implemented to prevent malicious attacks (e.g., Brute Force, DoS) on API endpoints. This includes limiting the number of requests from an IP address or user within a specific time period. Stricter limitations will be applied especially for endpoints that may send frequent requests like attendance recording.

**Alternative Attack Prevention Methods:**

-   **Web Application Firewall (WAF):** A WAF can be used to provide protection against application layer attacks (SQL Injection, XSS, etc.). This analyzes incoming traffic and blocks known attack patterns.
-   **CAPTCHA/reCAPTCHA:** CAPTCHA or reCAPTCHA verification can be added during login or sensitive operations to prevent automated bot attacks.
-   **Input Validation & Sanitization:** All user inputs must be carefully validated and sanitized on the server side. This is a fundamental step to prevent injection attacks (SQL Injection, XSS).
-   **Secure HTTP Headers:** Secure HTTP headers like X-Content-Type-Options, X-Frame-Options, Content-Security-Policy (CSP) can be used to prevent various browser-based attacks (Clickjacking, XSS).

### 4.4 Data Encryption and Privacy

Sensitive data (e.g., passwords, personal information) will be hashed using strong encryption algorithms (e.g., bcrypt) before being stored in the database. All communication between client and server will be encrypted over HTTPS. Compliance with relevant regulations like GDPR, KVKK will be ensured to maintain data privacy.

## 5. Legacy System Integration Details

### 5.1 Launch Platform Integration

**Existing Extension Reference Functions:**
```javascript
// Launch Platform Base URL and Endpoints
CONFIG.LAUNCH.BASE_URL: 'https://launch.academyoflearning.net'
CONFIG.LAUNCH.ENDPOINTS: {
  LOGIN: '/Account/Login',
  STUDENT_LIST: '/Student/StudentsList', 
  USER_DETAILS: '/Student/GetUserDetails',
  UPDATE_COURSES: '/Student/UpdateCoursesList',
  SYNC_MYAOLCC: '/Student/SyncMyAlocc',
  EDIT_CONTRACT: '/Student/EditContract'
}

// Main functions:
LaunchManager.loginToPortal()         // Launch login
LaunchManager.findStudent()           // Student search
LaunchManager.verifyContract()        // Contract verification
LaunchManager.getUserDetails()        // User details
LaunchManager.updateLaunchData()      // Launch data update
```

### 5.2 Course Activation Business Logic

**Critical Rules from Existing Extension:**
```javascript
// CPL Student Activation Rules
if (request.isCPL === true) {
  // Special logic for CPL students
  // DataService.attemptedCplActivations buffer control
  // Maximum 3 active course rule
}

// TYP Course Sequence Control
function canActivateTypCourse(courseCode, contracts) {
  // TYP-A1, TYP-A2, TYP-A3 sequence control
  // Previous TYP courses must be completed
}

// Maximum Active Course Calculation
function getMaxAllowedCourses(activeTYPCourseExists) {
  return activeTYPCourseExists ? 3 : 2;
}

// SFS Course Special Handling
if (courseCode.startsWith('SFS')) {
  // Special processing for SFS courses
  // SFS skip logic for CPL students
}
```

### 5.3 Data Synchronization Flow

**Existing Extension Data Flow:**
1. **Course Data Extraction:** `DataService.parseUserDetailsFromHtml()`
2. **Contract Verification:** `DataService.findCoursesFromContract()` 
3. **API Sequence Matching:** `StudentProfileManager.matchCoursesWithApiSequence()`
4. **Canvas Grade Validation:** Template 116 loading for missing grades
5. **Launch Sync:** `LaunchManager.syncMyAolcc()` with proper course item extraction

## 6. API Documentation

Comprehensive API documentation (e.g., using OpenAPI/Swagger) will be created for the Intermediate API Server. This documentation will detail all endpoints, request/response formats, authentication requirements, and error codes. This will provide a clear reference point for frontend and other integrations.

### 6.1 Sample API Specification

```yaml
openapi: 3.0.0
info:
  title: Student Portal API
  version: 1.0.0
  description: AOL Student Portal Intermediate API Server

paths:
  /api/v1/courses/sync:
    post:
      summary: Course Synchronization (syncMyAolcc implementation)
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                courseCode:
                  type: string
                  example: "BUS101"
                contractCode:
                  type: string  
                  example: "V123456"
                userID:
                  type: integer
                  example: 12345
              required:
                - courseCode
                - contractCode
                - userID
      responses:
        200:
          description: Sync successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string
                  html:
                    type: string
                    
  /api/v1/courses/activate:
    post:
      summary: Course Activation (courseActivationHandler implementation)
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                courseCodes:
                  type: array
                  items:
                    type: string
                  example: ["BUS101", "BUS102"]
                contractCode:
                  type: string
                  example: "V123456"
                isCPL:
                  type: boolean
                  example: false
                programData:
                  type: object
              required:
                - courseCodes
                - contractCode
      responses:
        200:
          description: Activation successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string
                  data:
                    type: object

  /api/v1/exams/codes:
    get:
      summary: Exam Code Retrieval (analyzeStudentCourses implementation)
      security:
        - BearerAuth: []
      parameters:
        - name: contractCode
          in: query
          required: true
          schema:
            type: string
          example: "V123456"
        - name: courseCode
          in: query
          required: false
          schema:
            type: string
          example: "BUS101"
      responses:
        200:
          description: Exam codes retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  examCodes:
                    type: array
                    items:
                      type: object
                      properties:
                        courseCode:
                          type: string
                        examCode:
                          type: string
                        canvasCompletion:
                          type: boolean
                        eligibleForExam:
                          type: boolean

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```
