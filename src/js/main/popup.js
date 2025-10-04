document.addEventListener('DOMContentLoaded', function () {

  const saveOptionsButton = document.getElementById('saveOptions');

  const checkIntervalInput = document.getElementById('checkInterval');

  const cooldownPeriodInput = document.getElementById('cooldownPeriod');

  const activeToggle = document.getElementById('activeToggle');

  const sortOptionsToggle = document.getElementById('sortOptionsToggle');

  const autoLoginToggle = document.getElementById('autoLoginToggle');

  const usernameInput = document.getElementById('username');

  const passwordInput = document.getElementById('password');

  const launchUsernameInput = document.getElementById('launchUsername');

  const launchPasswordInput = document.getElementById('launchPassword');

  const canvasUsernameInput = document.getElementById('canvasUsername');

  const canvasPasswordInput = document.getElementById('canvasPassword');

  const verifastUsernameInput = document.getElementById('verifastUsername');

  const verifastPasswordInput = document.getElementById('verifastPassword');

  const tabs = document.querySelectorAll('.tabset button');

  const tabPanels = document.querySelectorAll('.tab-panel');

  const closeTabAfterSaveToggle = document.getElementById('closeTabAfterSaveToggle');



  const reloadButton = document.querySelector('.tooltip:has(#reloadExtension)');

  if (reloadButton) {

    reloadButton.style.display = 'none';

  }



  // Check if extension is in developer mode

  chrome.management.getSelf(extensionInfo => {

    if (extensionInfo.installType === 'development') {

      // Only show reload button in developer mode

      if (reloadButton) {

        reloadButton.style.display = 'block';

      }

    }

  });

  // Replace the existing update check with this improved version:

  chrome.storage.local.get(['updateAvailable', 'updateInfo'], function (result) {

    if (result.updateAvailable && result.updateInfo) {

      // Double check that the version is actually different from the current version

      const currentVersion = chrome.runtime.getManifest().version;



      if (result.updateInfo.version !== currentVersion) {

        const updateNotification = document.getElementById('update-notification');

        const versionInfo = document.getElementById('version-info');

        const updateButton = document.getElementById('update-button');



        updateNotification.style.display = 'block';

        versionInfo.textContent = `Version: ${result.updateInfo.version}`;



        updateButton.addEventListener('click', function () {

          chrome.tabs.create({ url: result.updateInfo.downloadUrl });

        });

      } else {

        // Versions match - clear the flag

        chrome.storage.local.set({ "updateAvailable": false });

      }

    }

  });



  const manifestData = chrome.runtime.getManifest();

  document.getElementById('current-version').textContent = `Version: ${manifestData.version}`;



  // Tab switching functionality

  tabs.forEach((tab, index) => {

    tab.addEventListener('click', () => {

      tabs.forEach(t => t.classList.remove('active'));

      tabPanels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');

      tabPanels[index].classList.add('active');

    });

  });



  // Eklentiyi Yeniden Yükleme Fonksiyonu

  function reloadExtension() {

    if (chrome.management.getSelf) {

      chrome.management.getSelf(function (extensionInfo) {

        if (extensionInfo.installType === 'development') {

          if (confirm("Are you sure you want to reinstall the plugin?")) {

            chrome.runtime.reload();

          }

        } else {

          alert("This feature is only available in developer mode.");

        }

      });

    } else {

      alert("This feature is only available in developer mode.");

    }

  }



  // Refresh Data Fonksiyonu

  function refreshData() {

    const refreshButton = document.getElementById('refreshData');

    const refreshIcon = refreshButton.querySelector('i');

    
    
    // Add loading state

    refreshButton.classList.add('loading');

    refreshButton.disabled = true;

    
    
    // Send message to background script to refresh data

    chrome.runtime.sendMessage({

      action: 'loadDefaultData'

    }, function(response) {

      // Remove loading state

      refreshButton.classList.remove('loading');

      refreshButton.disabled = false;

      
      
      if (response && response.success) {

        // Show success feedback

        const originalColor = refreshButton.style.backgroundColor;

        refreshButton.style.backgroundColor = '#10b981'; // Green

        refreshButton.style.color = 'white';

        
        
        setTimeout(() => {

          refreshButton.style.backgroundColor = originalColor;

          refreshButton.style.color = '';

        }, 2000);

        
        
        console.log('Data refreshed successfully');

      } else {

        // Show error feedback

        const originalColor = refreshButton.style.backgroundColor;

        refreshButton.style.backgroundColor = '#ef4444'; // Red

        refreshButton.style.color = 'white';

        
        
        setTimeout(() => {

          refreshButton.style.backgroundColor = originalColor;

          refreshButton.style.color = '';

        }, 2000);

        
        
        console.error('Failed to refresh data:', response?.error);

      }

    });

  }



  // Load default values

  chrome.storage.local.get(['checkInterval', 'cooldownPeriod', 'isActive', 'sortOptionsAZ', 'username', 'password', 'launchUsername', 'launchPassword', 'canvasUsername', 'canvasPassword', 'verifastUsername', 'verifastPassword', 'closeTabAfterSave', 'autoLogin'], function (result) {

    if (result.checkInterval) {

      checkIntervalInput.value = result.checkInterval / 60; // Convert seconds to minutes

    } else {

      // Set default value if not set

      chrome.storage.local.set({ checkInterval: 60 });

      checkIntervalInput.value = 1; // 1 minute

    }

    if (result.cooldownPeriod) {

      cooldownPeriodInput.value = result.cooldownPeriod / 60; // Convert seconds to minutes

    } else {

      // Set default value if not set

      chrome.storage.local.set({ cooldownPeriod: 300 });

      cooldownPeriodInput.value = 5; // 5 minutes

    }

    if (result.isActive !== undefined) {

      activeToggle.checked = result.isActive;

    } else {

      // Set default value if not set

      chrome.storage.local.set({ isActive: false });

      activeToggle.checked = false;

    }

    if (result.sortOptionsAZ !== undefined) {

      sortOptionsToggle.checked = result.sortOptionsAZ;

    } else {

      // Set default value if not set

      chrome.storage.local.set({ sortOptionsAZ: false });

      sortOptionsToggle.checked = false;

    }

    if (result.username) {

      usernameInput.value = result.username;

    }

    if (result.password) {

      passwordInput.value = result.password;

    }

    if (result.launchUsername) {

      launchUsernameInput.value = result.launchUsername;

    }

    if (result.launchPassword) {

      launchPasswordInput.value = result.launchPassword;

    }

    if (result.canvasUsername) {

      canvasUsernameInput.value = result.canvasUsername;

    }

    if (result.canvasPassword) {

      canvasPasswordInput.value = result.canvasPassword;

    }

    if (result.verifastUsername) {

      verifastUsernameInput.value = result.verifastUsername;

    }

    if (result.verifastPassword) {

      verifastPasswordInput.value = result.verifastPassword;

    }

    if (result.autoLogin !== undefined) {

      autoLoginToggle.checked = result.autoLogin;

    }

    if (result.closeTabAfterSave !== undefined) {

      closeTabAfterSaveToggle.checked = result.closeTabAfterSave;

    }

    else {

      // Set default value if not set

      chrome.storage.local.set({ autoLogin: false });

      autoLoginToggle.checked = false;

    }

    checkCredentials(); // Kontrol işlemini başlangıçta da yapın

  });



  // Function to temporarily change button text

  function temporarilyChangeButtonText(button, newText, duration = 3000) {

    const originalText = button.textContent;

    button.textContent = newText;

    button.disabled = true; // Disable the button temporarily

    setTimeout(() => {

      button.textContent = originalText;

      button.disabled = false; // Re-enable the button

    }, duration);

  }



  // Save settings

  saveOptionsButton.addEventListener('click', function () {

    const checkInterval = parseFloat(checkIntervalInput.value) * 60; // Convert minutes to seconds

    const cooldownPeriod = parseFloat(cooldownPeriodInput.value) * 60; // Convert minutes to seconds

    const isActive = activeToggle.checked;

    const sortOptionsAZ = sortOptionsToggle.checked;

    const username = usernameInput.value;

    const password = passwordInput.value;

    const launchUsername = launchUsernameInput.value;

    const launchPassword = launchPasswordInput.value;

    const canvasUsername = canvasUsernameInput.value;

    const canvasPassword = canvasPasswordInput.value;

    const verifastUsername = verifastUsernameInput.value;

    const verifastPassword = verifastPasswordInput.value;

    const autoLogin = autoLoginToggle.checked;



    chrome.storage.local.set({

      checkInterval: checkInterval,

      cooldownPeriod: cooldownPeriod,

      isActive: isActive,

      sortOptionsAZ: sortOptionsAZ,

      username: username,

      password: password,

      launchUsername: launchUsername,

      launchPassword: launchPassword,

      canvasUsername: canvasUsername,

      canvasPassword: canvasPassword,

      verifastUsername: verifastUsername,

      verifastPassword: verifastPassword,

      autoLogin: autoLogin

    }, function () {

      console.log(`Settings saved: Check interval ${checkInterval} seconds, Cooldown period ${cooldownPeriod} seconds, active: ${isActive}, sort options A-Z: ${sortOptionsAZ}, username: ${username}, password: ${password}, auto login: ${autoLogin}`);

      // Notify the background script about the changes

      chrome.runtime.sendMessage({

        action: 'settingsUpdated',

        isActive: isActive,

        checkInterval: checkInterval,

        cooldownPeriod: cooldownPeriod,

        sortOptionsAZ: sortOptionsAZ,

        autoLogin: autoLogin

      });



      // Change Save button text temporarily

      temporarilyChangeButtonText(saveOptionsButton, "Settings Saved!");

    });

  });



  // Immediately update when toggle is changed

  activeToggle.addEventListener('change', function () {

    if (checkCredentials()) {

      const isActive = activeToggle.checked;

      chrome.storage.local.set({ isActive: isActive }, function () {

        console.log(`Extension active state changed to: ${isActive}`);

        // Notify the background script about the change

        chrome.runtime.sendMessage({ action: 'settingsUpdated', isActive: isActive });

      });

    } else {

      activeToggle.checked = false;

    }

  });



  // Immediately update when sort options toggle is changed

  sortOptionsToggle.addEventListener('change', function () {

    const sortOptionsAZ = sortOptionsToggle.checked;

    chrome.storage.local.set({ sortOptionsAZ: sortOptionsAZ }, function () {

      console.log(`Sort options A-Z state changed to: ${sortOptionsAZ}`);

      // Notify the content script about the change

      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {

        if (tabs.length > 0) {

          const currentTab = tabs[0];

          // Eğer aktif sekme 'mine_list.php' veya 'studentProfile.php' ise mesaj gönder

          if (currentTab.url === 'https://aoltorontoagents.ca/student_contract/chat/mine_list.php' || currentTab.url === 'https://aoltorontoagents.ca/student_contract/clgStActive/studentProfile.php') {

            chrome.tabs.sendMessage(currentTab.id, { action: 'updateSortOptions', sortOptionsAZ: sortOptionsAZ });

          } else {

            console.log('Aktif sekme, mesajın gönderileceği sayfalardan biri değil.');

          }

        } else {

          console.error('No active tab found.');

        }

      });

    });

  });



  // Immediately update when auto login toggle is changed

  autoLoginToggle.addEventListener('change', function () {

    const autoLogin = autoLoginToggle.checked;

    chrome.storage.local.set({ autoLogin: autoLogin }, function () {

      console.log(`Auto login state changed to: ${autoLogin}`);

      // Notify the background script about the change

      chrome.runtime.sendMessage({ action: 'settingsUpdated', autoLogin: autoLogin });

    });

  });



  // Add event listener for the new toggle

  closeTabAfterSaveToggle.addEventListener('change', function () {

    const closeTabAfterSave = closeTabAfterSaveToggle.checked;

    chrome.storage.local.set({ closeTabAfterSave: closeTabAfterSave }, function () {

      console.log(`Close tab after save state changed to: ${closeTabAfterSave}`);

    });

  });



  // Export settings

  // Export settings

  const exportSettingsButton = document.getElementById('exportSettings');

  exportSettingsButton.addEventListener('click', function () {

    chrome.storage.local.get(null, function (result) {

      // Define the order of the keys

      const orderedKeys = [

        // Authentication related

        "username",

        "password",

        "launchUsername",

        "launchPassword",

        "canvasUsername",

        "canvasPassword",

        "verifastUsername",

        "verifastPassword",



        // Core settings

        "autoLogin",

        "isActive",

        "checkInterval",

        "sortOptionsAZ",

        "closeTabAfterSave",

        "isCoolingDown",

        "cooldownEndTime",

        "cooldownPeriod",

        "updateAvailable",

        "updateInfo"

      ];



      // Create the ordered settings object

      const orderedSettings = {};



      // First add the ordered keys

      orderedKeys.forEach(key => {

        if (result.hasOwnProperty(key)) {

          orderedSettings[key] = result[key];

        }

      });







      // Add extensionState

      if (result.extensionState) {

        orderedSettings.extensionState = result.extensionState;

      }



      const notificationIds = new Set();

      Object.keys(result).forEach(key => {

        if (key.startsWith('notification-')) {

          const parts = key.split('-');

          if (parts.length > 1) {

            notificationIds.add(parts[1]);

          }

        }

      });



      // Then add notifications in a specific order for each ID

      Array.from(notificationIds).sort().forEach(id => {

        // First add the boolean flag

        const flagKey = `notification-${id}`;

        if (result.hasOwnProperty(flagKey)) {

          orderedSettings[flagKey] = result[flagKey];

        }



        // Then add length if it exists

        const lengthKey = `notification-${id}-length`;

        if (result.hasOwnProperty(lengthKey)) {

          orderedSettings[lengthKey] = result[lengthKey];

        }



        // Then add subject if it exists

        const subjectKey = `notification-${id}-subject`;

        if (result.hasOwnProperty(subjectKey)) {

          orderedSettings[subjectKey] = result[subjectKey];

        }



        // Add any other notification properties in alphabetical order

        Object.keys(result)

          .filter(key => key.startsWith(`notification-${id}-`) &&

            key !== lengthKey &&

            key !== subjectKey)

          .sort()

          .forEach(key => {

            orderedSettings[key] = result[key];

          });

      });



      if (result.allCourses) {

        orderedSettings.allCourses = result.allCourses;

      }



      if (result.allPrograms) {

        orderedSettings.allPrograms = result.allPrograms;

      }



      // Add allProgramCourses at the end

      if (result.allProgramCourses) {

        orderedSettings.allProgramCourses = result.allProgramCourses;

      }



      // Add any remaining keys that weren't explicitly ordered

      Object.keys(result).forEach(key => {

        if (!orderedSettings.hasOwnProperty(key) &&

          !key.startsWith('viewState')) {

          orderedSettings[key] = result[key];

        }

      });



      const settingsJson = JSON.stringify(orderedSettings, null, 2);

      const blob = new Blob([settingsJson], { type: 'application/json' });

      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');

      a.href = url;

      a.download = 'aol-ep-enhancer-settings.json';

      a.click();

      URL.revokeObjectURL(url);

    });

  });



  // Import settings

  const importSettingsButton = document.getElementById('importSettings');

  importSettingsButton.addEventListener('click', function () {

    const input = document.createElement('input');

    input.type = 'file';

    input.accept = '.json';

    input.addEventListener('change', function (event) {

      const file = event.target.files[0];

      const reader = new FileReader();

      reader.onload = function (event) {

        try {

          const settings = JSON.parse(event.target.result);



          // Remove cached results to prevent importing old cache data

          delete settings.cachedVerifastResults;

          delete settings.cachedLaunchResults;



          chrome.storage.local.set(settings, function () {

            console.log('Settings imported successfully (excluding cache data).');

            // Change Save button text temporarily

            temporarilyChangeButtonText(saveOptionsButton, "Import Successful, Settings Saved!", 1500);



            // Reload the page after 3 seconds

            setTimeout(() => {

              location.reload();

            }, 1500);

          });

        } catch (error) {

          console.error('Error importing settings:', error);

          alert('Invalid settings file.');

        }

      };

      reader.readAsText(file);

    });

    input.click();

  });



  // Check if username and password are filled

  function checkCredentials() {

    if (usernameInput.value === "" || passwordInput.value === "") {

      autoLoginToggle.checked = false;

      activeToggle.checked = false;

      autoLoginToggle.disabled = true;

      activeToggle.disabled = true;

      return false;

    } else {

      activeToggle.disabled = false;

      autoLoginToggle.disabled = false;

      return true;

    }

  }



  usernameInput.addEventListener('input', checkCredentials);

  passwordInput.addEventListener('input', checkCredentials);

  launchUsernameInput.addEventListener('input', checkCredentials);

  launchPasswordInput.addEventListener('input', checkCredentials);

  canvasUsernameInput.addEventListener('input', checkCredentials);

  canvasPasswordInput.addEventListener('input', checkCredentials);

  verifastUsernameInput.addEventListener('input', checkCredentials);

  verifastPasswordInput.addEventListener('input', checkCredentials);



  // Reload butonuna event listener ekleme

  const reloadExtensionButton = document.getElementById('reloadExtension');

  reloadExtensionButton.addEventListener('click', reloadExtension);



  // Refresh data butonuna event listener ekleme

  const refreshDataButton = document.getElementById('refreshData');

  refreshDataButton.addEventListener('click', refreshData);

});



// popup.js — signature image stamper with anchor-based placement

// Requires: vendor/pdf-lib.min.js already loaded in popup.html (UMD => window.PDFLib)

// Also requires: vendor/pdfjs/pdf.mjs and vendor/pdfjs/pdf.worker.mjs in your extension



/*(() => {

  const $ = (id) => document.getElementById(id);

  const statusEl = $("sig-status");



  // Where to find the pdf.js worker (we set it once after dynamic import)

  function configurePdfJs(libs) {

    // Point the worker to the file inside the extension

    libs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("libs/pdf.worker.mjs");

  }



  // Read a File/Blob into Uint8Array

  async function readAsUint8(file) {

    const buf = await file.arrayBuffer();

    return new Uint8Array(buf);

  }



  // Use pdf.js to extract lines (approximate) and their positions on the LAST page.

  // Returns: { pageWidth, pageHeight, lines: [{ text, x, y }] }

  async function extractLastPageLinesWithPdfJs(pdfBytes) {

    const libs = await import(chrome.runtime.getURL("libs/pdf.mjs"));

    configurePdfJs(libs);



    const loadingTask = libs.getDocument({ data: pdfBytes });

    const pdf = await loadingTask.promise;



    const pageNum = pdf.numPages; // last page

    const page = await pdf.getPage(pageNum);



    // viewport scale 1: coordinates in PDF points

    const viewport = page.getViewport({ scale: 1.0 });

    const pageWidth = viewport.width;

    const pageHeight = viewport.height;



    const textContent = await page.getTextContent();

    // Group items by their Y (row) using a small tolerance

    const rows = new Map(); // key: roundedY -> array of {str, x, y}

    const yTol = 1.5;



    for (const item of textContent.items) {

      const tx = item.transform; // [a,b,c,d,e,f]; e= x, f= y (top-left-ish in PDF.js coords)

      const x = tx[4];

      const yTop = tx[5]; // y from top

      // pdf-lib uses origin at bottom-left; keep both for now



      // Snap Y to a row bucket

      let bucketKey = null;

      for (const key of rows.keys()) {

        if (Math.abs(key - yTop) <= yTol) { bucketKey = key; break; }

      }

      if (bucketKey === null) bucketKey = yTop;



      const arr = rows.get(bucketKey) || [];

      arr.push({ str: item.str, x, yTop });

      rows.set(bucketKey, arr);

    }



    // Convert rows map to sorted lines (top -> bottom)

    const lines = [];

    const sortedKeys = Array.from(rows.keys()).sort((a, b) => b - a); // higher yTop is nearer the top

    for (const key of sortedKeys) {

      const parts = rows.get(key).sort((a, b) => a.x - b.x);

      const text = parts.map(p => p.str).join(" ").replace(/\s+/g, " ").trim();

      const minX = Math.min(...parts.map(p => p.x));

      const yTop = key;

      // Convert yTop (from top) to pdf-lib y (from bottom)

      const yFromBottom = pageHeight - yTop;

      lines.push({ text, x: minX, y: yFromBottom });

    }



    return { pageWidth, pageHeight, lines, pageNum };

  }



  // Try to find a good anchor line by regex

  function findAnchor(lines, patterns) {

    for (const pat of patterns) {

      const re = new RegExp(pat, "i");

      for (const ln of lines) {

        if (re.test(ln.text)) return { anchor: ln, pattern: pat };

      }

    }

    return null;

  }



  // Compute where to place signature image.

  // Prefers placing BELOW the "certified by" line; else above "Date of Issue".

  function computeSignaturePosition({ pageWidth, pageHeight, lines }, imgDims, opts) {

    const patternsPreferred = [

      // Your transcript template anchor line:

      "This transcript is true and accurate as certified by:",

      // Secondary anchor (often present near the signature)

      "^Date of Issue:"

    ];

    const match = findAnchor(lines, patternsPreferred);



    const sigW = opts.width;

    const sigH = Math.round(sigW * (imgDims.height / imgDims.width));



    if (match) {

      const { anchor, pattern } = match;

      // Default offset: put signature a bit BELOW the anchor line and indented from the left of that line

      const below = /true and accurate/i.test(pattern);

      const x = Math.min(Math.max(anchor.x + 0, 24), pageWidth - sigW - 24);

      const y = Math.min(

        Math.max(anchor.y - (below ? 28 : -28), 24), // if we found the "certified by" line, go ~28pt below it

        pageHeight - sigH - 24

      );

      return { x, y, w: sigW, h: sigH, usedAnchor: pattern };

    }



    // Fallback: bottom-right margin

    return {

      x: pageWidth - sigW - 36,

      y: 36,

      w: sigW,

      h: sigH,

      usedAnchor: null

    };

  }



  // Draw signature image onto a given PDF (bytes) and return new bytes

  async function stampSignatureOnLastPage(pdfBytes, sigBytes, options) {

    const { PDFDocument } = window.PDFLib;

    const pdfDoc = await PDFDocument.load(pdfBytes, { updateMetadata: false });

    const pages = pdfDoc.getPages();

    const lastPage = pages[pages.length - 1];

    const { width: pageWidth, height: pageHeight } = lastPage.getSize();



    // Also analyze text positions with pdf.js for anchors

    const { lines } = await extractLastPageLinesWithPdfJs(pdfBytes);



    // Embed signature image

    const isPng = /png$/i.test(options.sigType) || /\.png$/i.test(options.sigName);

    const img = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes);



    // Decide placement

    const pos = computeSignaturePosition(

      { pageWidth, pageHeight, lines },

      { width: img.width, height: img.height },

      { width: options.width || 180 }

    );



    // Draw

    lastPage.drawImage(img, {

      x: pos.x,

      y: pos.y,

      width: pos.w,

      height: pos.h,

      opacity: 0.98

    });



    // Save

    const out = await pdfDoc.save();

    return { bytes: out, pos };

  }



  // Download helper

async function downloadBytes(bytes, filename) {

  const blob = new Blob([bytes], { type: "application/pdf" });  

  const url = URL.createObjectURL(blob);



  // Prefer Chrome downloads API

  if (chrome?.downloads?.download) {

    try {

      const id = await chrome.downloads.download({

        url,

        filename,

        saveAs: true,               // ← force file picker

        conflictAction: "uniquify"

      });

      // keep the blob alive a bit; some systems need time to start the download

      setTimeout(() => URL.revokeObjectURL(url), 10000);

      return id;

    } catch (e) {

      console.warn("chrome.downloads failed, falling back to <a> click:", e);

    }

  }



  // Fallback: visible link so user can click if the auto-click is blocked

  const a = document.createElement("a");

  a.href = url;

  a.download = filename;

  a.textContent = `Click to save: ${filename}`;

  a.style.display = "inline-block";

  a.style.marginLeft = "8px";

  a.target = "_blank";

  document.getElementById("sig-status")?.appendChild(a);



  // Try programmatic click (some environments block it)

  try { a.click(); } catch (_) {}

  setTimeout(() => URL.revokeObjectURL(url), 10000);

}





  // === Wire up the button ===

  $("sig-go")?.addEventListener("click", async () => {

    try {

      statusEl.textContent = "Working...";

      const pdfFiles = $("sig-pdfFiles").files;

      const sigFile = $("sig-image").files[0];

      if (!pdfFiles?.length || !sigFile) {

        statusEl.textContent = "Select at least one PDF and a signature image.";

        return;

      }



      const x = Number($("sig-x").value || 0);   // kept for future manual mode

      const y = Number($("sig-y").value || 0);   // kept for future manual mode

      const width = Number($("sig-w").value || 180);



      const sigBytes = await readAsUint8(sigFile);



      let done = 0;

      for (const f of pdfFiles) {

        const pdfBytes = await readAsUint8(f);

        const { bytes, pos } = await stampSignatureOnLastPage(pdfBytes, sigBytes, {

          width,

          sigType: sigFile.type,

          sigName: sigFile.name

        });

        const outName = f.name.replace(/\.pdf$/i, "") + "-stamped.pdf";

        await downloadBytes(bytes, outName);

        done++;

      }

      statusEl.textContent = `Done: processed ${done} file(s).`;

    } catch (err) {

      console.error(err);

      statusEl.textContent = "Error: " + (err?.message || String(err));

    }

  });

})();

*/



// Requires:

//  1) pdf-lib UMD loaded BEFORE this file in popup.html:

//     <script src="vendor/pdf-lib.min.js"></script>

//  2) pdf.js ESM files in your extension at:

//     vendor/pdfjs/pdf.mjs

//     vendor/pdfjs/pdf.worker.mjs

//     and in manifest.json:

//     "web_accessible_resources": [{ "resources": ["vendor/pdfjs/*"], "matches": ["<all_urls>"] }]



(function () {

  const $ = (id) => document.getElementById(id);



  document.addEventListener("DOMContentLoaded", () => {

    const btn = $("sig-go");

    if (!btn) return;



    btn.addEventListener("click", async (e) => {

      e.preventDefault();

      const status = $("sig-status");



      try {

        if (!window.PDFLib?.PDFDocument) {

          throw new Error("pdf-lib not loaded");

        }

        const pdfs = $("sig-pdfFiles")?.files || [];

        if (!pdfs.length) {
          status.textContent = "Select at least one PDF file.";
          return;

        }



        // Load signature image from extension assets
        let sigBytes;
        try {
          const sigResponse = await fetch(chrome.runtime.getURL('src/assets/signature.png'));
          if (!sigResponse.ok) {
            // Try JPG if PNG not found
            const sigResponseJpg = await fetch(chrome.runtime.getURL('src/assets/signature.jpg'));
            if (!sigResponseJpg.ok) {
              throw new Error('Signature image not found. Please add signature.png or signature.jpg to src/assets/ folder.');
            }
            sigBytes = new Uint8Array(await sigResponseJpg.arrayBuffer());
          } else {
            sigBytes = new Uint8Array(await sigResponse.arrayBuffer());
          }
        } catch (error) {
          status.textContent = "Error: " + error.message + " Please check the README in src/assets/ folder.";
          return;
        }

        status.textContent = "Signature loaded successfully. Processing PDFs...";


        let done = 0;

        for (const f of pdfs) {

          const pdfBytes = new Uint8Array(await f.arrayBuffer());
        
        

const stamped = await stampUnderLineSmart(pdfBytes, sigBytes, {
  // you can tweak these if needed, but this should be a solid start
  firstPage: { extraRightPt: 0, extraDownPt: 2 }, // Use anchor X position, push Y 2 points higher
  alignMode: "afterText",
  rightOffsetPt: 0, // No offset from anchor X
  rightMarginPt: 72,
  pageMarginPt: 24,
  sigMinH: 22, sigPrefH: 26, sigMaxH: 40
});





          const outName = f.name.replace(/\.pdf$/i, "") + "-stamped.pdf";

          await downloadBytes(stamped, outName);

          done++;

        }

        status.textContent = `Done ✅ Processed ${done} file(s).`;

      } catch (err) {

        console.error(err);

        $("sig-status").textContent = "Error: " + (err?.message || String(err));

      }

    });

    // Debug Text button
    const debugTextBtn = $("debug-text");
    if (debugTextBtn) {
      debugTextBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        const status = $("sig-status");

        try {
          const pdfs = $("sig-pdfFiles")?.files || [];
          if (!pdfs.length) {
            status.textContent = "Select at least one PDF file.";
            return;
          }

          status.textContent = "Debugging text extraction...";

          for (const f of pdfs) {
            console.log(`\n=== DEBUGGING: ${f.name} ===`);
            const pdfBytes = new Uint8Array(await f.arrayBuffer());
            await debugExtractedText(pdfBytes);
          }
          
          status.textContent = "Debug complete! Check browser console (F12) for extracted text.";
        } catch (err) {
          console.error(err);
          status.textContent = "Error: " + (err?.message || String(err));
        }
      });
    }

    // Debug Placement button
    const debugPlacementBtn = $("debug-placement");
    if (debugPlacementBtn) {
      debugPlacementBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        const status = $("sig-status");

        try {
          const pdfs = $("sig-pdfFiles")?.files || [];
          if (!pdfs.length) {
            status.textContent = "Select at least one PDF file.";
            return;
          }

          status.textContent = "Debugging signature placement...";

          for (const f of pdfs) {
            console.log(`\n=== DEBUGGING PLACEMENT: ${f.name} ===`);
            const pdfBytes = new Uint8Array(await f.arrayBuffer());
            await debugSignaturePlacement(pdfBytes);
          }
          
          status.textContent = "Debug complete! Check browser console (F12) for placement details.";
        } catch (err) {
          console.error(err);
          status.textContent = "Error: " + (err?.message || String(err));
        }
      });
    }

  });

  // Debug function to extract and display text
  async function debugExtractedText(pdfBytes) {
    const pdfjs = window.pdfjsLib || window.libs;
    if (!pdfjs) throw new Error("pdf.js not loaded");
    
    pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("libs/pdf.worker.min.js");
    
    const jsDoc = await pdfjs.getDocument({ data: pdfBytes.slice(0) }).promise;
    
    console.log(`PDF has ${jsDoc.numPages} pages`);
    
    for (let pageNum = 1; pageNum <= jsDoc.numPages; pageNum++) {
      const page = await jsDoc.getPage(pageNum);
      const vp = page.getViewport({ scale: 1 });
      const ph = vp.height;
      
      console.log(`\n--- Page ${pageNum} (height: ${ph}) ---`);
      
      const text = await page.getTextContent();
      
      text.items.forEach((item, index) => {
        if (item.str && item.str.trim()) {
          const visualY = ph - item.transform[5]; // visual Y from top
          console.log(`Item ${index}: "${item.str}" at x=${Math.round(item.transform[4])}, yTop=${Math.round(item.transform[5])}, visualY=${Math.round(visualY)}`);
        }
      });
    }
  }

  // Debug function to show signature placement calculation
  async function debugSignaturePlacement(pdfBytes) {
    const pdfjs = window.pdfjsLib || window.libs;
    if (!pdfjs) throw new Error("pdf.js not loaded");
    
    pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("libs/pdf.worker.min.js");
    
    const jsDoc = await pdfjs.getDocument({ data: pdfBytes.slice(0) }).promise;
    
    // Find anchor
    const anchorRegex = /This transcript is true and accurate as certified by:/i;
    const nameRegex = /(^|\s)Bushra\s+Khalid(\s|$)/i;
    
    let hit = null;
    for (let p = jsDoc.numPages; p >= 1; p--) {
      const page = await jsDoc.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const ph = vp.height;
      const text = await page.getTextContent();
      
      for (const item of text.items) {
        if (item.str && anchorRegex.test(item.str)) {
          hit = { pageIndex: p - 1, ph_js: ph };
          console.log(`Found anchor on page ${p}`);
          break;
        }
      }
      if (hit) break;
    }
    
    if (!hit) {
      console.log("Anchor not found!");
      return;
    }
    
    // Get visual coordinates
    const pageForCoords = await jsDoc.getPage(hit.pageIndex + 1);
    const text = await pageForCoords.getTextContent();
    
    let anchorVisualY, nameVisualY, anchorX = 0;
    
    for (const item of text.items) {
      if (item.str && item.str.includes("This transcript is true and accurate")) {
        anchorVisualY = hit.ph_js - item.transform[5];
        anchorX = item.transform[4];
        console.log(`Anchor: "${item.str}" at visualY=${Math.round(anchorVisualY)}, x=${Math.round(anchorX)}`);
      }
      if (item.str && item.str.includes("Bushra Khalid")) {
        nameVisualY = hit.ph_js - item.transform[5];
        console.log(`Name: "${item.str}" at visualY=${Math.round(nameVisualY)}`);
      }
    }
    
    if (anchorVisualY && nameVisualY) {
      const midY = (anchorVisualY + nameVisualY) / 2;
      const adjustedY = midY + 3; // Push down by 3 points
      console.log(`\nCalculated signature placement:`);
      console.log(`X: ${Math.round(anchorX)} pts (same as anchor)`);
      console.log(`Y: ${Math.round(adjustedY)} pts (midpoint between anchor and name, pushed down 3pts)`);
      console.log(`Visual Y: ${Math.round(adjustedY)} pts (from top of page)`);
    }
  }

    

    
  
  async function downloadBytes(bytes, filename) {

    const blob = new Blob([bytes], { type: "application/pdf" });

    const url = URL.createObjectURL(blob);

    try {

      if (chrome?.downloads?.download) {

        await chrome.downloads.download({ url, filename, saveAs: true, conflictAction: "uniquify" });

      } else {

        const a = document.createElement("a");

        a.href = url; a.download = filename; a.click();

      }

    } finally {

      setTimeout(() => URL.revokeObjectURL(url), 8000);

    }

  }



  // --- Find the anchor line on the LAST page using pdf.js ---

  async function findAnchorOnLastPage(pdfBytes, pageHeight) {

    
    
   //use the global pdf.js

    const libs = window.pdfjsLib;

    libs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("libs/pdf.worker.min.js");





    const loading = libs.getDocument({ data: pdfBytes });

    const doc = await loading.promise;

    const page = await doc.getPage(doc.numPages);

    const textContent = await page.getTextContent();



    // Group items into lines by y (from top); then convert to bottom-origin

    const rows = new Map(); const yTol = 1.5;

    for (const item of textContent.items) {

      const t = item.transform; const x = t[4]; const yTop = t[5];

      let key = null;

      for (const k of rows.keys()) { if (Math.abs(k - yTop) <= yTol) { key = k; break; } }

      if (key === null) key = yTop;

      const arr = rows.get(key) || []; arr.push({ x, yTop, str: item.str }); rows.set(key, arr);

    }



    const keys = Array.from(rows.keys()).sort((a,b)=>b-a);

    const lines = keys.map(k => {

      const parts = rows.get(k).sort((a,b)=>a.x-b.x);

      return {

        text: parts.map(p=>p.str).join(" ").replace(/\s+/g," ").trim(),

        x: Math.min(...parts.map(p=>p.x)),

        y: pageHeight - k // convert from top-origin to bottom-origin

      };

    });



    console.log("[debug] lines on last page:");

    lines.forEach(l => console.log("→", l.text));





    // Phrases commonly present above the signature area in your transcript template

    const patterns = [

      /This transcript is true and accurate as certified by:/i, // primary

      /^Date of Issue:/i                                       // secondary fallback

    ];

    for (const re of patterns) {

      const hit = lines.find(l => re.test(l.text));

      if (hit) return hit; // { text, x, y }

    }

    return null;

  }





})();



// --- 1) Extract lines with pdf.js (bottom-left origin like pdf-lib) ---

async function extractLinesWithPdfJs(pdfBytes, ph) {

  const pdfjs = window.pdfjsLib || window.libs;

  if (!pdfjs) throw new Error("pdf.js not loaded (include libs/pdf.min.js and libs/pdf.worker.min.js)");

  pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("libs/pdf.worker.min.js");



  const loading = pdfjs.getDocument({ data: pdfBytes });

  const doc = await loading.promise;

  const page = await doc.getPage(doc.numPages);

  const text = await page.getTextContent();



  const rows = new Map();

  const yTol = 1.8;

  for (const item of text.items) {

    const t = item.transform;

    const x = t[4], yTop = t[5];

    let key = null;

    for (const k of rows.keys()) { if (Math.abs(k - yTop) <= yTol) { key = k; break; } }

    if (key === null) key = yTop;

    let arr = rows.get(key);

    if (!arr) { arr = []; rows.set(key, arr); }

    arr.push({ x, yTop, str: (item.str || "").replace(/\u00A0/g, " ") });

  }

  const keys = Array.from(rows.keys()).sort((a,b)=>b-a);

  const lines = keys.map(k => {

    const parts = rows.get(k).sort((a,b)=>a.x-b.x);

    return {

      text: parts.map(p=>p.str).join(" ").replace(/\s+/g," ").trim(),

      x: Math.min(...parts.map(p=>p.x)),

      y: ph - k

    };

  });

  return lines;

}



// --- 2) Make a "text map" debug PDF you can download ---

async function makeDebugPdf(pdfBytes) {

  const { PDFDocument, StandardFonts, rgb, degrees } = window.PDFLib;

  const pdfDoc = await PDFDocument.load(pdfBytes, { updateMetadata: false });

  const pages = pdfDoc.getPages();

  const page = pages[pages.length - 1];

  const { width: pw, height: ph } = page.getSize();



  // Get lines from pdf.js

  const lines = await extractLinesWithPdfJs(pdfBytes, ph);



  // Draw a coordinate grid (every 20pt; bold each 72pt)

  for (let y=0; y<=ph; y+=20) {

    page.drawLine({

      start: { x: 0, y }, end: { x: pw, y },

      color: (y % 72 === 0) ? rgb(0.65,0.65,0.65) : rgb(0.85,0.85,0.85),

      opacity: (y % 72 === 0) ? 0.6 : 0.35, thickness: (y % 72 === 0) ? 0.8 : 0.4

    });

    if (y % 72 === 0) {

      page.drawText(`${y} pt`, { x: 4, y: y+2, size: 8, color: rgb(0.3,0.3,0.3) });

    }

  }

  for (let x=0; x<=pw; x+=72) {

    page.drawLine({

      start: { x, y: 0 }, end: { x, y: ph },

      color: rgb(0.80,0.80,0.95), opacity: 0.25, thickness: 0.5

    });

    page.drawText(`${x} pt`, { x: x+2, y: 4, size: 8, color: rgb(0.3,0.3,0.5) });

  }



  // Label each extracted line with a dot + index + text

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  lines.forEach((l, i) => {

    // dot

    page.drawCircle({ x: l.x, y: l.y, size: 2.2, color: rgb(0.1,0.5,0.9), opacity: 0.9 });

    // index and coords

    page.drawText(`#${i} (${Math.round(l.x)}, ${Math.round(l.y)})`, {

      x: l.x + 6, y: l.y + 2, size: 8, font, color: rgb(0.1,0.3,0.6)

    });

    // the text itself (faint)

    page.drawText(l.text, {

      x: l.x + 6, y: l.y - 8, size: 8, font, color: rgb(0.25,0.25,0.25), opacity: 0.6

    });

  });



  // Try to highlight anchors

  const upper = lines.find(l => /certified\s*by/i.test(l.text));

  const bushra = lines.find(l => /(^|\s)Bushra\s+Khalid(\s|$)/i.test(l.text));



  if (upper) {

    page.drawRectangle({

      x: 0, y: upper.y - 2, width: pw, height: 12,

      color: rgb(0.95, 0.85, 0.2), opacity: 0.3

    });

    page.drawText('UPPER: "certified by"', { x: pw - 160, y: upper.y + 2, size: 9, font, color: rgb(0.6,0.45,0) });

  }

  if (bushra) {

    page.drawRectangle({

      x: 0, y: bushra.y - 2, width: pw, height: 12,

      color: rgb(0.2, 0.9, 0.5), opacity: 0.3

    });

    page.drawText('LOWER: "Bushra Khalid"', { x: pw - 160, y: bushra.y + 2, size: 9, font, color: rgb(0.0,0.5,0.25) });

  }



  return await pdfDoc.save();

}



// --- 3) Quick helper to debug the first selected PDF in popup ---

async function debugSelectedPdf() {

  const input = document.getElementById("sig-pdfFiles");

  if (!input?.files?.length) {

    alert("Select one PDF first."); return;

  }

  const f = input.files[0];

  const pdfBytes = new Uint8Array(await f.arrayBuffer());

  const dbg = await makeDebugPdf(pdfBytes);

  const outName = f.name.replace(/\.pdf$/i, "") + "-textmap.pdf";

  const blob = new Blob([dbg], { type: "application/pdf" });

  const url = URL.createObjectURL(blob);

  if (chrome?.downloads?.download) {

    await chrome.downloads.download({ url, filename: outName, saveAs: true, conflictAction: "uniquify" });

  } else {

    const a = document.createElement("a"); a.href = url; a.download = outName; a.click();

  }

  setTimeout(()=>URL.revokeObjectURL(url), 8000);

}



// -------- Config you can tweak --------

const SIG_PREF_HEIGHT_PT = 20;   // preferred signature height (~0.55")

const SIG_MIN_HEIGHT_PT  = 28;   // smallest we'll allow if space is tight

const SIG_MAX_HEIGHT_PT  = 72;   // absolute max (~1")

const RIGHT_MARGIN_PT    = 72;   // ~1" from right edge

const PAGE_MARGIN_PT     = 24;   // keep away from page edges



// Text you want to anchor between (case-insensitive exact phrases)

const UPPER_TEXT_RE = /This transcript is true and accurate as certified by:/i;

const LOWER_TEXT_RE = /Bushra Khalid/i;



// -------- pdf.js helpers (reader) --------

async function getPdfJs() {

  const pdfjs = window.pdfjsLib || window.libs;

  if (!pdfjs) throw new Error("pdf.js not loaded (include libs/pdf.min.js and libs/pdf.worker.min.js)");

  pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("libs/pdf.worker.min.js");

  return pdfjs;

}



async function extractLinesForPage(pdfjs, pdf, pageNum, pageHeight) {

  const page = await pdf.getPage(pageNum);

  const text = await page.getTextContent();



  // Group items by yTop with small tolerance, then convert to bottom-origin

  const rows = new Map();

  const yTol = 1.6;

  for (const item of text.items) {

    const t = item.transform;

    const x = t[4];

    const yTop = t[5];

    const str = (item.str || "").replace(/\u00A0/g, " ");

    let key = null;

    for (const k of rows.keys()) { if (Math.abs(k - yTop) <= yTol) { key = k; break; } }

    if (key === null) key = yTop;

    let arr = rows.get(key);

    if (!arr) { arr = []; rows.set(key, arr); }

    arr.push({ x, yTop, str });

  }

  const keys = Array.from(rows.keys()).sort((a,b)=>b-a); // top→bottom

  const lines = keys.map(k => {

    const parts = rows.get(k).sort((a,b)=>a.x-b.x);

    const textLine = parts.map(p=>p.str).join(" ").replace(/\s+/g," ").trim();

    return {

      text: textLine,

      x: Math.min(...parts.map(p=>p.x)),

      y: pageHeight - k   // bottom-origin like pdf-lib

    };

  });

  return lines;

}



async function findPageAndBand(pdfBytes) {

  const pdfjs = await getPdfJs();

   const pdfBytesForPdfJs = pdfBytes.slice(0);

  const loading = pdfjs.getDocument({ data: pdfBytesForPdfJs });

  const pdf = await loading.promise;



  // Search from last page to first (common case for certificates)

  for (let p = pdf.numPages; p >= 1; p--) {

    const page = await pdf.getPage(p);

    const viewport = page.getViewport({ scale: 1.0 });

    const ph = viewport.height;



    const lines = await extractLinesForPage(pdfjs, pdf, p, ph);

    const upper = lines.find(l => UPPER_TEXT_RE.test(l.text));

    const lower = lines.find(l => LOWER_TEXT_RE.test(l.text));

    if (upper && lower) {

      // Build an order-agnostic band between the two Y values

      const padTop = 6, padBottom = 6;

      const yLow  = Math.min(upper.y, lower.y);

      const yHigh = Math.max(upper.y, lower.y);

      const bottom = yLow + padBottom;

      const top    = yHigh - padTop;

      const height = Math.max(0, top - bottom);

      return { pageIndex: p - 1, pageHeight: ph, band: { bottom, top, height }, lines, upper, lower };

    }

  }

  return null; // not found anywhere

}




// Finds the anchor on any page, then places the signature:
// - ideally in the band between the anchor and "Bushra Khalid"
// - else under the anchor, while avoiding "Date of Issue:" if present
async function stampUnderLineSmart(pdfBytes, sigBytes, options = {}) {
  const {

    anchorRegex    = /This transcript is true and accurate as certified by:/i,
    nameRegex      = /(^|\s)Bushra\s+Khalid(\s|$)/i,
    dateRegex      = /^Date of Issue:/i,

    // signature look
    sigMinH        = 22,     // pt
    sigPrefH       = 26,     // pt
    sigMaxH        = 40,     // pt

    // page margins & alignment
    pageMarginPt   = 24,     // keep away from edges
    rightOffsetPt  = 10,     // gap after anchor text when align "afterText"
    alignMode      = "afterText", // "afterText" | "rightMargin"
    rightMarginPt  = 72,     // used if alignMode="rightMargin"

    // vertical spacing rules
    gapBelowAnchor = 6,      // breathing room under anchor baseline
    keepAwayFromDate = 6,    // min space above "Date of Issue:" line
    bandPadTop     = 6,      // shrink band a touch from top
    bandPadBottom  = 6,      // ...and bottom

    // page-1 nudges (varies most)
    firstPage = {

      extraRightPt: 120,     // push right on p1
      extraDownPt:  0        // push down if still a bit high
    }
  } = options;



  // ---- Libraries ----
  const { PDFDocument } = window.PDFLib || {};
  if (!PDFDocument) throw new Error("pdf-lib not loaded");

  const pdfjs = window.pdfjsLib || window.libs;

  if (!pdfjs) throw new Error("pdf.js not loaded"); 

  pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("libs/pdf.worker.min.js");



  // ---- Read text with pdf.js (clone bytes for worker) ----
  const jsDoc = await pdfjs.getDocument({ data: pdfBytes.slice(0) }).promise;



  async function readLines(pageNum) {
    const page = await jsDoc.getPage(pageNum);

    const vp   = page.getViewport({ scale: 1 });
    const ph   = vp.height;


    const text = await page.getTextContent();

    const rows = new Map();

    const yTol = 1.6;



    for (const it of text.items) {

      const t = it.transform;               // [a,b,c,d,e,f]
      const x = t[4], yTop = t[5];

      const s = (it.str || "").replace(/\u00A0/g, " ");

      const fontH = Math.hypot(t[1], t[3]);
      // merge by approximate yTop
      let key = null;

      for (const k of rows.keys()) { if (Math.abs(k - yTop) <= yTol) { key = k; break; } }

      if (key === null) key = yTop;

      let arr = rows.get(key);

      if (!arr) { arr = []; rows.set(key, arr); }

      arr.push({ x, yTop, s, fontH });

    }



    const keys  = Array.from(rows.keys()).sort((A,B)=>B-A); // top→bottom
    const lines = keys.map(k => {

      const arr = rows.get(k).sort((p,q)=>p.x - q.x);

      const textLine = arr.map(p=>p.s).join(" ").replace(/\s+/g, " ").trim();
      const yTopAvg  = arr.reduce((t,p)=>t+p.yTop,0)/arr.length;

      const fontHMax = arr.reduce((m,p)=>Math.max(m,p.fontH||0),0);

      const minX = arr[0].x, maxX = arr[arr.length-1].x;



      // convert to bottom origin to match pdf-lib
      const yBottom = ph - yTopAvg;
      // heuristic baseline: a chunk below the top box
      const baseline = yBottom - fontHMax * 0.80;

      return { text: textLine, baseline_js: baseline, minX_js: minX, maxX_js: maxX, fontH_js: fontHMax, ph_js: ph };
    });

    return { ph_js: ph, lines };
  }

  // ---- Find anchor scanning LAST→FIRST (so page 2 preferred when present) ----
  let hit = null;

  for (let p = jsDoc.numPages; p >= 1; p--) {

    const r = await readLines(p);
    const ai = r.lines.findIndex(l => anchorRegex.test(l.text));
    if (ai !== -1) {
      const anchor = r.lines[ai];
      // prefer the specific signer line; fallback to date line if needed
      const nameLine = r.lines.find(l => l.baseline_js < anchor.baseline_js && nameRegex.test(l.text));
      const dateLine = r.lines.find(l => l.baseline_js < anchor.baseline_js && dateRegex.test(l.text));
      hit = { pageIndex: p - 1, anchor, nameLine, dateLine, ph_js: r.ph_js, lines: r.lines };
      break;

    }

  }

  if (!hit) throw new Error("Anchor line not found in the PDF");



  // ---- Draw with pdf-lib ----
  const pdfDoc = await PDFDocument.load(pdfBytes, { updateMetadata: false });

  const page   = pdfDoc.getPage(hit.pageIndex);

  const { width: pw, height: ph } = page.getSize();


  // map pdf.js units → pdf-lib units
  const scale = ph / hit.ph_js;

  // Get visual coordinates directly from the text items
  let anchorVisualY, nameVisualY, anchorX = 0;
  
  // Find the actual visual Y coordinates from the text items
  const pageForCoords = await jsDoc.getPage(hit.pageIndex + 1);
  const text = await pageForCoords.getTextContent();
  
  for (const item of text.items) {
    if (item.str && item.str.includes("This transcript is true and accurate")) {
      anchorVisualY = hit.ph_js - item.transform[5]; // visual Y from top
      anchorX = item.transform[4]; // use the anchor's X position
    }
    if (item.str && item.str.includes("Bushra Khalid")) {
      nameVisualY = hit.ph_js - item.transform[5]; // visual Y from top
    }
  }
  
  // Use the anchor's X position
  const lineRightX = anchorX * scale;


  // Convert visual coordinates to PDF-lib coordinates (bottom-origin)
  const anchorLibY = ph - (anchorVisualY * scale); // convert to bottom-origin
  const nameLibY = ph - (nameVisualY * scale);     // convert to bottom-origin
  
  // Decide target band (vertically) using visual coordinates
  let bandBottom, bandTop;
  if (nameVisualY && anchorVisualY) {
    // ideal: between anchor and "Bushra Khalid"
    bandBottom = Math.min(anchorLibY, nameLibY) + bandPadBottom; // lower y (closer to bottom)
    bandTop = Math.max(anchorLibY, nameLibY) - bandPadTop;       // higher y (further from bottom)
  } else {
    // fallback: just below anchor
    bandBottom = anchorLibY + 2;
    bandTop = anchorLibY + 2 + (sigMaxH + 6);
  }

  // clamp band inside page margins
  bandBottom = Math.max(pageMarginPt, bandBottom);
  bandTop    = Math.min(ph - pageMarginPt, bandTop);
  const bandH = Math.max(0, bandTop - bandBottom);

  // signature size: try to fit band (but respect min/max)
  let sigH = Math.min(sigMaxH, Math.max(sigMinH, Math.min(sigPrefH, bandH || sigPrefH)));
  const isPng = sigBytes[0] === 0x89 && sigBytes[1] === 0x50;

  const img   = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes);

  const ratio = img.height / img.width;

  let sigW    = Math.round(sigH / ratio);


  // X position

  let x;

  if (alignMode === "rightMargin") {

    x = pw - rightMarginPt - sigW;
  } else {

    x = Math.min(pw - pageMarginPt - sigW, Math.max(pageMarginPt, lineRightX + rightOffsetPt));
  }

  // Y position: center inside band; if band is tiny, pin just above bandBottom
  // Push Y down by 3 points using visual coordinates
  let y = (bandH >= sigH + 2)
    ? bandBottom + (bandH - sigH) / 2 + 3  // Push down by 3 points (add in PDF coordinates)
    : Math.max(pageMarginPt, Math.min(bandBottom, ph - sigH - pageMarginPt)) + 3;

  // page-1 nudges
  if (hit.pageIndex === 0) {
    if (firstPage.extraRightPt) x += firstPage.extraRightPt;
    if (firstPage.extraDownPt)  y -= firstPage.extraDownPt;
  }

  // final clamps
  x = Math.max(pageMarginPt, Math.min(x, pw - sigW - pageMarginPt));

  y = Math.max(pageMarginPt, Math.min(y, ph - sigH - pageMarginPt));

  // draw & return
  page.drawImage(img, { x, y, width: sigW, height: sigH, opacity: 0.98 });

  return await pdfDoc.save();

}











