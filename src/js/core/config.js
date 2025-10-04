// Configuration
let programNameMappings = {}

const CONFIG = {
    EMAIL_DOMAIN: '@my-aolcc.com',
    EMAIL_LINK_BASE: 'https://mynew.aolcc.ca/accounts/22/users?search_term=',
    LOGIN_URL: 'https://aoltorontoagents.ca/student_contract/login/',
    STUDENT_PORTAL: 'https://aoltorontoagents.ca/student_contract/',
    STUDENT_PROFILE_URL: 'https://aoltorontoagents.ca/student_contract/clgStActive/studentProfile.php',
    ACTIVE_LISTS_URL: 'https://aoltorontoagents.ca/student_contract/clgStActive/activeLists.php',
    ACCOUNTS_STUDENT_LIST: 'https://aoltorontoagents.ca/student_contract/accounts/',
    DEACTIVE_LISTS_URL: 'https://aoltorontoagents.ca/student_contract/clgStActive/deactiveLists.php',
    TICKETS_ALL_URLS: 'https://aoltorontoagents.ca/student_contract/chat/',
    PENDING_LIST_URL: 'https://aoltorontoagents.ca/student_contract/chat/pending_list.php',
    MINE_LIST_URL: 'https://aoltorontoagents.ca/student_contract/chat/mine_list.php',
    TICKET_DETAILS_URL: 'https://aoltorontoagents.ca/student_contract/chat/view_details.php',
    TICKET_REPORTS_URL: 'https://aoltorontoagents.ca/student_contract/chat/TicketReports.php',
    TICKET_TEMPLATES_URL: 'https://aoltorontoagents.ca/student_contract/chat/emailtempLists.php',    
    ATTENDANCE_URL: 'https://aoltorontoagents.ca/student_contract/clgStActive/loginStudAttend.php',
    PROGRESS_UPLOAD_URL: 'https://aoltorontoagents.ca/student_contract/clgStActive/addMyProgressCsv.php',
    WEEKWISE_REPORTS_URL: 'https://aoltorontoagents.ca/student_contract/clgStActive/weekWiseReport.php',
    SUPERADMIN_URL: 'https://aoltorontoagents.ca/student_contract/superAdmin/',
    MONDAY_START_CLASS_URL: 'https://aoltorontoagents.ca/student_contract/superAdmin/campus_start_class.php',
    UNIQUE_IDENTIFIER_URL: 'https://aoltorontoagents.ca/student_contract/superAdmin/unique_identifier.php',
    ACMELISTS_URL: 'https://aoltorontoagents.ca/student_contract/campusLists/acmeLists.php',
    SCHEDULE_EXAM_LISTS: 'https://aoltorontoagents.ca/student_contract/clgStActive/prgmSchdlLists.php',
    INLINE_ALERT_STYLES: `
        position: absolute;
        background-color: #4CAF50;
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 14px;
        font-weight: 600;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
        z-index: 1000;
        white-space: nowrap;
   `
};

const SELECTORS = {
    VNO: "//div[p/b[contains(text(), 'V.No.')]]/p/br/following-sibling::text()[1]",
    EMAIL_ID: "//div[p/b[contains(text(), 'EmailID')]]/p/br/following-sibling::text()[1]",
    FIRST_NAME: "//div[p/b[contains(text(), 'First Name')]]/p/a",
    LAST_NAME: "//div[p/b[contains(text(), 'Last Name')]]/p/a",
    CONTACT_NUMBER: "//div[p/b[contains(text(), 'Contact Number')]]/p/br/following-sibling::text()[1]",
    PROGRAM_NAME: "//div[p/b[contains(text(), 'Program Name')]]/p/br/following-sibling::text()[1]",
    ACTIVE_MENU_ITEM: "//a[contains(@class, 'active') and @href]",
    VIEW_TICKETS_HEADER: "//h4[contains(text(), 'View Tickets')]",
    STATUS_TEXT: "//p[b[contains(text(), 'Status')]]/text()[normalize-space()]",
    TYPE_TEXT: "//p[b[contains(text(), 'Type')]]/text()[normalize-space()]",
    PROFILE_DETAILS: "//text()[contains(., 'Profile Details:')]",
    NAVBAR: "(//div[contains(@class, 'navbar')]/*)[last()]",
    NOTIFICATION_BELL: "//div[@class='d-flex' and descendant::*[contains(@class, 'notificationsbtn')] and descendant::*[contains(@class, 'nav') and contains(@class, 'navbar-nav') and contains(@class, 'navbar-right')]]",
    EMAIL_HEADER: "//th[text()='Email Id']",
    START_DATE_HEADER: "//th[text()='Start Date']",
    FINISH_DATE_HEADER: "//th[text()='Finish Date']",
    END_DATE_HEADER: "//th[text()='End Date']",
    PROGRAM_HEADER: "//th[text()='Program']",
    CAMPUS_STATUS_HEADER: "//th[text()='Campus Status']",
    AMPM_HEADER: "//th[text()='AM/PM']",
    FORM_STATUS: "//th[text()='Signed Declaration Form Status']",
    DOCS_STATUS: "//th[text()='Docs Status']",
    PASSWORD_HEADER: "//th[text()='Password']",
    ACTION_HEADER: "//th[text()='Action']",
    GRADUATION_HEADER: "//th[text()='Graduations Status']",
    H3_HEADER: "//h3/text()",

    // Dynamic selectors based on header positions
    get EMAIL_CELLS() {
        const emailHeaderIndex = this.getHeaderIndex('Email Id');
        return `//table//td[${emailHeaderIndex}]`;
    },

    get PASSWORD_CELLS() {
        const passwordHeaderIndex = this.getHeaderIndex('Password');
        return `//table//td[${passwordHeaderIndex}]`;
    },

    get TARGET_CELL() {
        const actionHeaderIndex = this.getHeaderIndex('Action');
        return `//table//td[${actionHeaderIndex}]`;
    },

    // Helper method to find header index
    getHeaderIndex(headerText) {
        const headers = document.querySelectorAll('th');
        for (let i = 0; i < headers.length; i++) {
            if (headers[i].textContent.trim() === headerText) {
                return i + 1; // Convert to 1-based index for XPath
            }
        }
        // If header not found, log error and return null
        console.log(`Header "${headerText}" not found in table`);
        return null;
    },

    PROGRAM_FILTER_SELECT: "select[name='crsFltr']:has(option[value=''])"
};

const fundingSourceMap = {
    'OSAP': '16',
    'Second Career': '6',
    'Self-Funded': '10',
    'Out of Province': '37',
    'WSIB': '21',
    'Employer Paid': '7',
    'ODSP': '30',
    'Other': '15'
};

window.CONFIG = CONFIG;
window.SELECTORS = SELECTORS;
window.fundingSourceMap = fundingSourceMap;
window.programNameMappings = programNameMappings;