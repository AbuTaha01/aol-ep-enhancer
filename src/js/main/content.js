// Clear Fields Function //

function clearFormFields() {
  // Text inputs
  document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]').forEach(input => {
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // Date inputs
  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // Select dropdowns
  document.querySelectorAll('select').forEach(select => {
    select.selectedIndex = 0; // reset to first option
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // Textareas
  document.querySelectorAll('textarea').forEach(area => {
    area.value = "";
    area.dispatchEvent(new Event("input", { bubbles: true }));
    area.dispatchEvent(new Event("change", { bubbles: true }));
  });
}



// --- Date Picker Functions --- //
// Parse common strings into a JS Date (UTC to avoid TZ shifts)
function parseDateToJS(d) {
  if (d == null) return null;
  const t = String(d).trim();
  let m, day, mon, yr;

  // DD-MM-YYYY or DD/MM/YYYY
  if ((m = t.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/))) {
    day = +m[1]; mon = +m[2]-1; yr = +m[3];
    return new Date(Date.UTC(yr, mon, day));
  }
  // YYYY-MM-DD
  if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
    yr = +m[1]; mon = +m[2]-1; day = +m[3];
    return new Date(Date.UTC(yr, mon, day));
  }
  // MM/DD/YYYY
  if ((m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) {
    mon = +m[1]-1; day = +m[2]; yr = +m[3];
    return new Date(Date.UTC(yr, mon, day));
  }
  // Excel serial numbers (e.g., 35529)
  if (!isNaN(Number(t)) && t !== '') {
    const serial = Number(t);
    // Excel epoch (1900-based; ignores the 1900 leap-year bug which is fine for modern dates)
    const utcDays = Math.floor(serial - 25569);
    return new Date(utcDays * 86400 * 1000);
  }

  const d2 = new Date(t);
  return isNaN(d2.getTime()) ? null : d2;
}

// Format to tokens using field’s hints if available
function formatDate(dateObj, fmt) {
  const dd = String(dateObj.getUTCDate()).padStart(2,'0');
  const mm = String(dateObj.getUTCMonth()+1).padStart(2,'0');
  const yyyy = dateObj.getUTCFullYear();
  const tokens = (fmt || '').toUpperCase();
  if (tokens.includes('DD') && tokens.includes('MM') && tokens.includes('YYYY')) {
    return tokens.replace('DD', dd).replace('MM', mm).replace('YYYY', yyyy);
  }
  // default for <input type="date"> is YYYY-MM-DD
  return `${yyyy}-${mm}-${dd}`;
}

// Generic setter that works for different pickers and plain inputs
function setDateFor(selector, rawDate, tries = 12, delayMs = 300) {
  const el = document.querySelector(selector);
  if (!el || !rawDate) return;

  const dateObj = parseDateToJS(rawDate);
  if (!dateObj) {
    console.warn(`⚠️ Could not parse date for ${selector}:`, rawDate);
    return;
  }

  // If it's a native date input, set value as YYYY-MM-DD and fire events
  if (el.type === 'date') {
    const yyyy = String(dateObj.getUTCFullYear());
    const mm = String(dateObj.getUTCMonth()+1).padStart(2,'0');
    const dd = String(dateObj.getUTCDate()).padStart(2,'0');
    el.value = `${yyyy}-${mm}-${dd}`;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`📅 Set native date for ${selector}:`, el.value);
    return;
  }

  const isPickerReady = () => {
    if (window.jQuery) {
      const $el = jQuery(el);
      return (
        typeof $el.datepicker === 'function' ||        // jQuery UI / Bootstrap datepicker
        $el.data('DateTimePicker') ||                  // Eonasdan
        el._flatpickr                                   // Flatpickr
      );
    }
    return !!el._flatpickr; // Flatpickr without jQuery
  };

  const doSet = () => {
    // Try to infer desired format
    const hintFmt =
      el.getAttribute('data-date-format') ||
      el.dataset?.dateFormat ||
      el.getAttribute('placeholder') ||
      'YYYY-MM-DD';

    const formatted = formatDate(dateObj, hintFmt);
    el.value = formatted;

    let applied = false;
    if (window.jQuery) {
      const $el = jQuery(el);
      try { $el.datepicker('setDate', new Date(dateObj)); applied = true; } catch(e) {}
      try { $el.datepicker('update', new Date(dateObj)); applied = true; } catch(e) {}
      try { $el.data('DateTimePicker')?.date(new Date(dateObj)); applied = true; } catch(e) {}
      try { if (el._flatpickr) { el._flatpickr.setDate(dateObj, true); applied = true; } } catch(e) {}

      $el.trigger('input').trigger('keyup').trigger('change').trigger('changeDate');
    } else {
      if (el._flatpickr) { try { el._flatpickr.setDate(dateObj, true); applied = true; } catch(e) {} }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Tab' }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (!applied) {
      console.warn(`ℹ️ No known datepicker API matched for ${selector}; set value and fired events only.`);
    } else {
      console.log(`📅 Date set via widget for ${selector}:`, formatted);
    }
  };

  // If the picker initializes later (after program/campus), retry a few times
  if (!isPickerReady() && tries > 0) {
    setTimeout(() => setDateFor(selector, rawDate, tries - 1, delayMs), delayMs);
  } else {
    doSet();
  }
}



document.addEventListener('DOMContentLoaded', function () {
    console.log('AOL Enhancer: DOM Content Loaded');
    initialize();
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateSortOptions') {
        if (message.sortOptionsAZ !== undefined) {
            try {
                if (message.sortOptionsAZ) {
                    const selectElement = document.getElementById('gettemplates');
                    if (selectElement) {
                        const options = Array.from(selectElement.querySelectorAll('option'));
                        options.sort((a, b) => a.textContent.trim().localeCompare(b.textContent.trim()));
                        selectElement.innerHTML = '';
                        options.forEach(option => selectElement.appendChild(option));
                    }
                } else {
                    console.log('sortOptionsAZ is false, not doing anything else.');
                }
            } catch (error) {
                console.log(error, 'updateSortOptions message listener');
            }
        }
        sendResponse({ received: true });
    }
    return true;
});

function initialize() {
    console.log('Initializing content script');
    CacheManager.init();
    EventManager.init();
    ObserverManager.init();
    HelperFunctions.fetchProgramMappings();
    MainFunctionality.updateExternalLibraries();
    MainFunctionality.enableRightClick();
    MainFunctionality.setDefaultFont();
    MainFunctionality.checkAndAutoLogin();
    MainFunctionality.linkEmails();
    MainFunctionality.handlePDFLinks();
    UIManager.replaceLogo();
    UIManager.modifyMenu();
    UIManager.hideNotificationBell();
    UIManager.addAllCopyIcons();
    UIManager.newActionButtons();
    UIManager.mergedColumns();
    UIManager.addNavbarLaunchButton();
    UIManager.addAccountsStudentListButtons();
    UIManager.enhanceProgressUpload();
    UIManager.enhanceProgramFilter();
    UIManager.addAnalyseCoursesButton();
    UIManager.enhanceExcelDownloadButton();
    UIManager.checkUniqueIdentifierDuplicates();
    UIManager.addFollowUpsButton();
    UIManager.addGraduationTracker();
    UIManager.styleColumns();


    if (window.location.href.includes(CONFIG.TICKET_DETAILS_URL)) {
        UIManager.initializeModal();
        UIManager.addLaunchButtons();
        TicketDetailManager.initializeStudentDetails();
        TicketDetailManager.hideOptionsByCampus();
        TicketDetailManager.makeSelectSearchable();
        TicketDetailManager.addTemplateButtons();
        TicketDetailManager.initializeFilePreview();
        TicketDetailManager.addTicketManagementButtons();
        TicketDetailManager.modifySendReplyButton();
    }

    if (window.location.href.includes(CONFIG.TICKETS_ALL_URLS)) {
        TicketManager.disableAutocomplete();
        TicketManager.removeTargetBlank();
        TicketManager.addCampusFiltersButtons();
    }

    if (window.location.href.includes(CONFIG.MINE_LIST_URL)) {
        TicketManager.myTicketsDataTableUpdate();
    }

    if (window.location.href.includes(CONFIG.PENDING_LIST_URL)) {
        TicketManager.addILPTicketsButton();
        TicketManager.addDuplicateTicketsButton();
        TicketManager.addButtons();
        TicketManager.highlightILPStudents();
    }

    if (window.location.href.includes(CONFIG.STUDENT_PROFILE_URL)) {
        UIManager.addLaunchButtons();
        StudentProfileManager.enhanceNotesSection();
        StudentProfileManager.enhanceMessageSection();
        StudentProfileManager.enhanceTicketSection();
        StudentProfileManager.enhanceProgramCoursesTable();
    }

    if (window.location.href.includes(CONFIG.ACMELISTS_URL)) {
        UIManager.addBulkCheckButtons();
        UIManager.addButtonsToAcmeList();
        UIManager.checkDataFirstLoading();
    }

    if (window.location.href.includes(CONFIG.ATTENDANCE_URL)) {
        UIManager.enhanceAttendanceList();
    }
}

window.addEventListener('beforeunload', () => {
    ObserverManager.disconnectAll();
});

console.log('Content script fully loaded and initialized');



// ========== EP New Contracts Autofill ========== //

let autofillRunning = false;


/*if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("src/libs/pdf.worker.min.js");
} else {
  console.error("❌ pdfjsLib is not defined. PDF.js may not be loaded correctly.");
}

*/
const tryInject = () => {
  if (window.location.href.includes("addEdit.php")) {
    console.log("✅ Matched form page, injecting control panel...");
    injectControlPanel();
    return true;
  }
  return false;
};

if (!tryInject()) {
  let attempts = 0;
  const interval = setInterval(() => {
    if (tryInject() || ++attempts > 10) {
      clearInterval(interval);
    }
  }, 300);
}

function generateStudentId(s) {
  return `${s.first_name}_${s.last_name}_${s.dob}_${s.email}`.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function injectControlPanel() {
  console.log("⚙️ injectControlPanel() executed");
  const container = document.querySelector('div.col-12 h3.bg-white.p-2');
  const panel = document.createElement("div");
  panel.innerHTML = `
    <div id="excelPanel" style="border: 3px solid red; padding: 1em; margin-top: 1em; background: #f9f9f9">
      <input type="file" id="excelUpload" />
      <button id="prevStudent" style="padding: 8px 16px; margin-right: 10px; border: 1px solid #333; border-radius: 6px; background-color: #f8f8f8; cursor: pointer;">
      Previous Student
      </button>
      <button id="nextStudent" style="padding: 8px 16px; border: 1px solid #333; border-radius: 6px; background-color: #f8f8f8; cursor: pointer;">
      Next Student
      </button>
      <button id="resetAutofilled">Reset Tracker</button>
      <div id="studentPreview" style="margin-top: 10px;"></div>
    </div>
  `;
  // reset button
  //<button id="resetAutofilled">Reset Tracker</button>
  container.parentElement.insertBefore(panel, container.nextSibling);

  const excelInput = panel.querySelector("#excelUpload");
  const preview = panel.querySelector("#studentPreview");
  const nextBtn = panel.querySelector("#nextStudent");
  const prevBtn = panel.querySelector("#prevStudent");
  const resetBtn = panel.querySelector("#resetAutofilled");

  let students = [];
  let currentIndex = 0;

  resetBtn?.addEventListener("click", () => {
    localStorage.removeItem("autofilled_students");
    alert("✅ Autofill tracker cleared.");
  });

  const getAutofilledTracker = () => {
    return JSON.parse(localStorage.getItem("autofilled_students") || "[]");
  };

  const markAsAutofilled = (studentId) => {
    const current = getAutofilledTracker();
    if (!current.includes(studentId)) {
      current.push(studentId);
      localStorage.setItem("autofilled_students", JSON.stringify(current));
    }
  };

  const clean = (val) => (val || "").toString().replace(/\u00A0/g, "").trim();

  const normalizeFields = (s) => {
    s.gender = s["Gender"] || s["gender"] || s.gender || "";
    s.first_name = s["First name"] || s["First Name"] || s.first_name || "";
    s.last_name = s["Last name"] || s["Last Name"] || s.last_name || "";
    s.dob = s["Date of birth"] || s.dob || s["Date of Birth"] ||"";
    s.email = s["Email Address"] || s.email || "";
    s.canadian_status = s["Canadian Status"] || s.canadian_status || "";
    s.phone = s["Phone"] || s.phone || "";
    s.address = s["Street Address"] || s.address || "";
    s.city = s["City"] || s.city || "";
    s.province = s["Province"] || s.province || "";
    s.postal_code = s["Postal Code"] || s.postal_code || "";
    s.program = s["Program"] || s.program || "";
    s.start_date = s["Start Date"] || s.start_date || "";
    s.emergency_contact = s["Emergency Number"] || s.emergency_contact || "";
    s.campus = s["Campus"] || s["College"] || s.campus || "";
    return s;
  };

  const renderStudent = (index) => {
    if (!students.length || index < 0 || index >= students.length) return;
    const s = normalizeFields(students[index]);
    const studentId = generateStudentId(s);
    const skipped = getAutofilledTracker().includes(studentId);

    preview.innerHTML = `
      <strong>Student Preview:</strong><br>
      Name: ${s.first_name} ${s.last_name}<br>
      DOB: ${s.dob} | Gender: ${s.gender}<br>
      Email: ${s.email}<br>
      Status: ${s.canadian_status}<br>
      Phone: ${s.phone}<br>
      Address: ${s.address}, ${s.city}, ${s.province}, ${s.postal_code}<br>
      Program: ${s.program} | Start Date: ${s.start_date}<br>
      Campus:</strong> ${s.campus}<br>
      Emergency Contact: Name: ${s.emergency_contact_name} - Relation: ${s.emergency_contact_relationship} - ${s.emergency_contact_number}<br>
      <span style="color:${skipped ? 'red' : 'green'};">${skipped ? "⛔ Already autofilled, skipping." : "✅ Ready to fill."}</span>
    `;

    prevStudent.disabled = index === 0;
    nextStudent.disabled = index === students.length - 1;

    if (!skipped) {
      triggerAutofill(s);
      markAsAutofilled(studentId);
    } else {
      console.warn("⛔ Skipping already filled student", studentId);
    }
  };




excelInput?.addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();

  const renderPDFPreview = (student) => {
    preview.innerHTML = `
      <strong>PDF Student Preview:</strong><br>
      Name: ${student.first_name} ${student.last_name}<br>
      DOB: ${student.dob} | Gender: ${student.gender}<br>
      Email: ${student.email}<br>
      Status: ${student.canadian_status}<br>
      Phone: ${student.phone}<br>
      Address: ${student.address}, ${student.city}, ${student.province}, ${student.postal_code}<br>
      Program: ${student.program} | Start Date: ${student.start_date}<br>
      Campus: ${student.campus}<br>
      Emergency #: ${student.emergency_contact}<br>
      ✅ Ready to fill (PDF)
    `;
  };

  const parsePDFStudentFields = async (pdfBuffer) => {
    const pdfjsLib = window['pdfjsLib'];
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();
    const text = content.items.map(i => i.str).join(" ");
    console.log("📄 Extracted PDF text:\n", text);

    // Extract structured fields with regex
    const program = text.match(/Program\s*:\s*(.*?)\s+Program Start Date/i)?.[1] ?? "";
    const start_date = text.match(/Program Start Date\s*:\s*(.*?)\s+First Name/i)?.[1] ?? "";
    const osap_number = text.match(/Student OSAP Number\s*:\s*(\d+)/i)?.[1] ?? "";
    const full_name_confirmed = text.match(/I,\s+(.*?)\s*,\s*confirm/i)?.[1] ?? "";

    const valuesStart = text.indexOf("Relationship to Student:");
    const valuesText = text.slice(valuesStart + "Relationship to Student:".length).trim();

    const nameMatch = valuesText.match(/^([\w'-]+)\s+([\w'-]+)/);
    const dobMatch = valuesText.match(/(\w{3,9} \d{1,2}, \d{4})/);
    const emailMatch = valuesText.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/);
    const campus = text.match(/College Name\s*:\s*(.*?)(?=\s+Student OSAP Number|Interviewed by)/i)?.[1]?.trim();
    const phoneNumbers = valuesText.match(/\b\d{10,11}\b/g);
    const postalCode = valuesText.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/);
    const provinceMatch = valuesText.match(/\b(ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU)\b/);
    const genderMatch = valuesText.match(/\b(Male|Female|Other)\b/i);
    const statusMatch = valuesText.match(/\b(Permanent Resident|Citizen|Work Permit|Refugee)\b/i);
    const apartmentMatch = valuesText.match(/\b\d{1,5}\b(?=\s+ON)/);
    const emergencyContactMatch = valuesText.match(/([A-Z][a-z]+)(?=\s+Friend|Parent|Sibling|Guardian)/);
    const relationshipMatch = valuesText.match(/\b(Friend|Parent|Sibling|Guardian)\b/);
    const cityMatch = valuesText.match(/\bNorth York|Toronto|Mississauga|Ottawa|Scarborough|Brampton\b/);
    const addressMatch = valuesText.match(/\d+\s+[A-Za-z]+\s+[A-Za-z]+(?:\s+[A-Za-z]+)?/);

    const student = {
      first_name: nameMatch?.[0]?.split(" ")[0] ?? "",
      last_name: nameMatch?.[0]?.split(" ")[1] ?? "",
      dob: dobMatch?.[0] ?? "",
      address: addressMatch?.[0] ?? "",
      city: cityMatch?.[0] ?? "",
      postal_code: postalCode?.[0] ?? "",
      emergency_number: phoneNumbers?.[0] ?? "",
      phone: phoneNumbers?.[1] ?? "",
      email: emailMatch?.[0] ?? "",
      apartment: apartmentMatch?.[0] ?? "",
      province: provinceMatch?.[0] ?? "",
      gender: genderMatch?.[0] ?? "",
      canadian_status: statusMatch?.[0] ?? "",
      emergency_contact: emergencyContactMatch?.[0] ?? "",
      relationship: relationshipMatch?.[0] ?? "",
      program,
      start_date,
      osap_number,
      full_name_confirmed,
      campus,
    };

    console.log("✅ Final parsed student object:", student);
    renderPDFPreview(student);
    triggerAutofill(student);
  };

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);

    if (fileName.endsWith(".pdf")) {
      parsePDFStudentFields(data);
    } else {
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      students = [];
      currentIndex = 0;

      // OPTION 1: HORIZONTAL FORMAT 
      /*
      const columns = [2, 5, 8, 11];
      const studentsPerGroup = 4;
      const rowsPerGroup = 20;

      for (let group = 0; group < Math.floor(raw.length / rowsPerGroup); group++) {
        const rowOffset = group * rowsPerGroup;
        for (let i = 0; i < studentsPerGroup; i++) {
          const col = columns[i];
          if (col === undefined) continue;

          const student = {
            first_name: clean(raw[rowOffset + 2]?.[col]),
            last_name: clean(raw[rowOffset + 3]?.[col]),
            dob: clean(raw[rowOffset + 4]?.[col]),
            gender: clean(raw[rowOffset + 5]?.[col]),
            email: clean(raw[rowOffset + 6]?.[col]),
            canadian_status: clean(raw[rowOffset + 7]?.[col]),
            phone: clean(raw[rowOffset + 8]?.[col]),
            address: clean(raw[rowOffset + 9]?.[col]),
            city: clean(raw[rowOffset + 11]?.[col]),
            province: clean(raw[rowOffset + 12]?.[col]),
            postal_code: clean(raw[rowOffset + 13]?.[col]),
            program: clean(raw[rowOffset + 17]?.[col]),
            start_date: clean(raw[rowOffset + 18]?.[col]),
            emergency_contact: clean(raw[rowOffset + 19]?.[col]),
            campus: clean(raw[rowOffset + 16]?.[col]),
          };

          if (student.first_name && student.last_name) {
            students.push(student);
          }
        }
      }
      */

      // OPTION 2: VERTICAL HEADER-BASED FORMAT (ACTIVE)
     
      function excelDateToJSDate(serial) {
      const utc_days = Math.floor(serial - 25569); // days since Jan 1 1970
      const utc_value = utc_days * 86400; // seconds
      const date = new Date(utc_value * 1000); // JS uses ms
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-based
      const year = date.getUTCFullYear();

      return `${day}-${month}-${year}`; // → DD
      }

      
      const header = raw[0];
      const dataRows = raw.slice(1);

      const clean = (val) => (val || "").toString().replace(/\u00A0/g, "").trim();

      const findColIndex = (label) =>
        header.findIndex((h) =>
          (h || "").toString().toLowerCase().includes(label.toLowerCase())
        );

      const colMap = {
        first_name: findColIndex("First Name"),
        last_name: findColIndex("Last Name"),
        dob: findColIndex("Date of Birth"),
        gender: findColIndex("Gender"),
        email: findColIndex("Email Address"),
        canadian_status: findColIndex("Canadian Status"),
        phone: findColIndex("Telephone"),
        address: findColIndex("Street"),
        city: findColIndex("City"),
        province: findColIndex("Province"),
        postal_code: findColIndex("Postal Code"),
        program: findColIndex("Program"),
        start_date: findColIndex("Start Date"),
        emergency_contact_name: findColIndex("Emergency  Contact Name"),
        emergency_contact_number: findColIndex("Emergency Contact number"),
        relationship: findColIndex("Relationship to Student"),
        emergency_contact_relationship: findColIndex("Emergency Contact Relationship"),
        agent_email: findColIndex("Agent Name or Referrer Name"),
        campus: findColIndex("Campus"),
      };

      students = dataRows.map((row) => ({
        first_name: clean(row[colMap.first_name]),
        last_name: clean(row[colMap.last_name]),
        dob: typeof row[colMap.dob] === "number"
           ? excelDateToJSDate(row[colMap.dob])
           : clean(row[colMap.dob]),
        gender: clean(row[colMap.gender]),
        email: clean(row[colMap.email]),
        canadian_status: clean(row[colMap.canadian_status]),
        phone: clean(row[colMap.phone]),
        address: clean(row[colMap.address]),
        city: clean(row[colMap.city]),
        province: clean(row[colMap.province]),
        postal_code: clean(row[colMap.postal_code]),
        program: clean(row[colMap.program]),
        start_date: typeof row[colMap.start_date] === "number"
           ? excelDateToJSDate(row[colMap.start_date])
           : clean(row[colMap.start_date]),
           emergency_contact_name: clean(row[colMap.emergency_contact_name]),
        emergency_contact_number: clean(row[colMap.emergency_contact_number]),
        emergency_contact_name: clean(row[colMap.emergency_contact_name]),
        emergency_contact_relationship: clean(row[colMap.emergency_contact_relationship]),
        campus: clean(row[colMap.campus]),
        agent_email: clean(row[colMap.agent_email]),
      })).filter(s => s.first_name && s.last_name);
      
      console.log("🧾 Parsed students:", students);
      currentIndex = 0;
      renderStudent(currentIndex);
    }
  };

  reader.readAsArrayBuffer(file);
});



  nextStudent?.addEventListener("click", () => {
    if (currentIndex < students.length - 1) {
      currentIndex++;
      clearFormFields();
      renderStudent(currentIndex);
    }
  });

  prevStudent?.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      clearFormFields();
      renderStudent(currentIndex);
    }
  });
}



function triggerAutofill(studentData) {
  console.log("🚀 Autofill triggered for", studentData);

// Clear program-related and dependent fields
const resetProgramFields = () => {
  const program = document.querySelector('select[name="program"]');
  const campus = document.querySelector('select[name="campus"]');
  const startDate = document.querySelector('#start_date');
  const proofResidency = document.querySelector('select[name="proof_residency"]');

  if (program) program.selectedIndex = 0;
  if (campus) campus.selectedIndex = 0;
  if (startDate) {
    startDate.value = "";
    if (window.jQuery && jQuery('#start_date').datepicker) {
      jQuery('#start_date').datepicker('setDate', null);
    }
  }
  if (proofResidency) proofResidency.selectedIndex = 0;

  console.log("🔄 Reset program-related fields for new student.");
};

resetProgramFields();


//const programSelect = document.querySelector('select[name="program"]');
//if (programSelect) {
  //programSelect.selectedIndex = 0;  // ✅ Reset to first/default option
  //programSelect.dispatchEvent(new Event("change", { bubbles: true }));
//}



  if (autofillRunning) {
    console.warn("⚠️ Autofill already running, skipping duplicate execution.");
    return;
  }

  autofillRunning = true;

  function forceSelectByText(selector, targetText, label, fallbackText = null) {
    const el = document.querySelector(selector);
    if (!el) return;

    const interval = setInterval(() => {
      const options = [...el.options];
      const match = options.find(opt => opt.textContent.trim().toLowerCase() === targetText.toLowerCase());

      if (match) {
        el.value = match.value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        console.log(`✅ ${label} set to ${targetText}`);
        clearInterval(interval);
      } else if (fallbackText) {
        const fallback = options.find(opt => opt.textContent.trim().toLowerCase() === fallbackText.toLowerCase());
        if (fallback) {
          el.value = fallback.value;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          console.warn(`⚠️ ${label}: "${targetText}" not found, fallback to "${fallbackText}"`);
          clearInterval(interval);
        }
      }
    }, 300);
  }

  function waitForDropdownsReady(callback) {
    setTimeout(callback, 100);
  }

  setTimeout(() => {
    waitForDropdownsReady(() => {
      try {
        const s = studentData;
        const setVal = (selector, value) => {
          const el = document.querySelector(selector);
          if (el) el.value = value;
        };

        setVal('input[name="fname"]', s.first_name);
        setVal('input[name="lname"]', s.last_name);
        setVal('input[name="email_address"]', s.email);
        setVal('input[name="mobile_no"]', s.phone);
        //setVal('input[name="dob"]', s.dob.replace(/\//g, "-"));
        setDateFor('input[name="dob"]', s.dob);
        setVal('input[name="mailing_address"]', s.address);
        setVal('input[name="city"]', s.city);
        setVal('input[name="postal_code"]', s.postal_code);

        const formatPhone = (val) => {
          const digits = val.replace(/\D/g, "").slice(0, 10);
          const suffix = val.replace(/[0-9()\-\s]/g, "").trim();
          if (digits.length === 10) {
            const formatted = `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
            return suffix ? `${formatted} ${suffix}` : formatted;
          }
          return val;
        };
        setVal('input[name="emg_name"]', s.emergency_contact_name);
        setVal('input[name="emg_phone"]', formatPhone(s.emergency_contact_number));
        setVal('input[name="emg_relation"]', s.emergency_contact_relationship);


        const programSelect = document.querySelector('select[name="program"]');
        const campusSelect = document.querySelector('select[name="campus"]');

        if (programSelect && campusSelect && s.campus) {
          programSelect.addEventListener("change", () => {
            let attempts = 0;
            const targetCampus = (s.campus || "").toLowerCase().match(/bay|academy of learning.*toronto/)
              ? "toronto"
              : (s.campus || "").toLowerCase();

            const intervalId = setInterval(() => {
              const options = Array.from(campusSelect?.options || []);
              const matched = options.find(opt => opt.textContent.trim().toLowerCase() === targetCampus);

              if (matched) {
                campusSelect.value = matched.value;
                campusSelect.dispatchEvent(new Event("change", { bubbles: true }));
                console.log("✅ Campus matched and selected:", matched.textContent);
                clearInterval(intervalId);
              } else if (++attempts >= 10) {
                console.error("❌ Campus options not found for:", targetCampus);
                clearInterval(intervalId);
              }
            }, 300);
           /* setTimeout(() => {
             const startDateInput = document.querySelector('#start_date');
            if (startDateInput && s.start_date) {
              startDateInput.value = s.start_date.replace(/\//g, "-");
              startDateInput.dispatchEvent(new Event("input", { bubbles: true }));
              startDateInput.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "1" }));
              startDateInput.dispatchEvent(new Event("change", { bubbles: true }));
              if (window.jQuery && jQuery('#start_date').datepicker) {
                jQuery('#start_date').datepicker('setDate', s.start_date);
              }
              console.log("📅 Start date auto-filled:", s.start_date);
            }
           

           }, 1200);
          */
          setDateFor('#start_date', s.start_date);

      
        setTimeout(() => {
            forceSelectByText('select[name="bursary_award"]', 'No bursary', 'Bursary award');
            forceSelectByText('select[name="location_Practicum"]', 'GTA', 'Practicum location', 'N/A');
            forceSelectByText('select[name="comp_program"]', 'Diploma', 'Comp Program');
            forceSelectByText('select[name="method_of_delivery"]', 'Online', 'Method of delivery');
            forceSelectByText('select[name="study_times"]', 'ILS (8:00am-10:00pm Mon-Fri | 9:30am-5:30pm Sat-Sun)', 'Study Times');
            forceSelectByText('select[name="agent_email"]', s.agent_email || "", "Agent Email");
            forceSelectByText('select[name="study_days"]', 'Mon to Fri', 'Study Days');

        }, 1200);
            const residencyMap = {
              "permanent resident": "Permanent Resident Card",
              "pr": "Permanent Resident Card",
              "protected person": "Notice of Decision",
              "canadian citizen": "Canadian Citizen Certificate",
              "student visa": "Student Visa",
              "work permit": "Work Permit",
              "canadian passport": "Canadian Passport",
              "citizenship card": "Citizenship Card",
              "birth certificate": "Canadian Birth Certificate /Record of Birth"
            };

            if (s.canadian_status) {
              const statusKey = s.canadian_status.trim().toLowerCase();
              for (let key in residencyMap) {
                if (statusKey.includes(key)) {
                  const dropdownValue = residencyMap[key];
                  console.log(`🔎 Setting proof of residency to: "${dropdownValue}"`);
                  forceSelectByText('select[name="proof_residency"]', dropdownValue, "Proof of Residency");
                  break;
                }
              }
            }
          });
        }

        const provinceCodeMap = {
          ON: "Ontario", QC: "Quebec", BC: "British Columbia", AB: "Alberta", MB: "Manitoba",
          SK: "Saskatchewan", NS: "Nova Scotia", NB: "New Brunswick", NL: "Newfoundland and Labrador",
          PE: "Prince Edward Island", YT: "Yukon", NT: "Northwest Territories", NU: "Nunavut"
        };

        const provinceSelect = document.querySelector('select[name="province"]');
        if (provinceSelect && s.province) {
          const fullProvinceName = provinceCodeMap[s.province.toUpperCase()] ?? s.province;
          for (let option of provinceSelect.options) {
            if (option.text.toLowerCase().includes(fullProvinceName.toLowerCase())) {
              provinceSelect.value = option.value;
              provinceSelect.dispatchEvent(new Event('change'));
              break;
            }
          }
        }

        const genderSelect = document.querySelector('select[name="gender"]');
        if (genderSelect) {
          const g = (s.gender || "").trim().toLowerCase();
          let val = "Other";
          if (g === "male") val = "M";
          else if (g === "female") val = "F";
          genderSelect.value = val;
        }

        const studentTypeSelect = document.querySelector('select[name="student_type"]');
        if (studentTypeSelect) {
          studentTypeSelect.value = "Domestic";
          studentTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }

        const fundInfoSelect = document.querySelector('select[name="fund_info"]');
        if (fundInfoSelect) {
          fundInfoSelect.value = "OSAP";
          fundInfoSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }

        const ossdSelect = document.querySelector('select[name="ossd"]');
        if (ossdSelect) {
          ossdSelect.value = "No";
          ossdSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }

        const docTypeSelect = document.querySelector('select[name="identi_doc_type"]');
        if (docTypeSelect && s.gender) {
          const gender = s.gender.trim().toLowerCase();
          docTypeSelect.value = gender === "female" ? "Ontario Photo Card" : "Driver`s License";
          docTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }

        const idVerificationCheckbox = document.querySelector('input[type="checkbox"][value="Identification verification performed remotely via Video Referencing Tools"]');
        if (idVerificationCheckbox) {
          idVerificationCheckbox.checked = true;
          idVerificationCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
          idVerificationCheckbox.dispatchEvent(new Event("click", { bubbles: true }));
        }

        const sameAddressCheckbox = document.querySelector('input[name="more_address"].PerAddS2u');
        if (sameAddressCheckbox) {
          sameAddressCheckbox.checked = true;
          sameAddressCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
          sameAddressCheckbox.dispatchEvent(new Event("click", { bubbles: true }));
        }

        const sourceSelect = document.querySelector('select[name="bay_street"]');
        if (sourceSelect) {
          sourceSelect.value = "Agent";
          sourceSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }

        const deliveryMethodSelect = document.querySelector('select[name="method_list"]');
        if (deliveryMethodSelect) {
          deliveryMethodSelect.value = "Video Referencing Tools";
          deliveryMethodSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }

        const programTypeSelect = document.querySelector('select[name="prg_type"]');
        if (programTypeSelect) {
          programTypeSelect.value = "Full-Time";
          programTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }

        const titleSelect = document.querySelector('select[name="title"]');
        if (titleSelect && s.gender) {
          const gender = s.gender.trim().toLowerCase();
          const title = gender === "male" ? "Mr" : "Ms";
          for (let option of titleSelect.options) {
            if (option.value === title) {
              titleSelect.value = option.value;
              break;
            }
          }
        }

        console.log("✅ Form filled completely.");
      } catch (err) {
        console.error("❌ Error autofilling form:", err);
      }

      autofillRunning = false;
    });
  }, 20, 300);
}
