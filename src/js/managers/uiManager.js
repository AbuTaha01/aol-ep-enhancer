class UIManager {
    static createLoadingElement() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadingEffect';
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        return loadingDiv;
    }

    static createButton(text, clickHandler, styles = {}) {
        const button = document.createElement('button');
        button.textContent = text;
        button.addEventListener('click', clickHandler);
        Object.assign(button.style, styles);
        return button;
    }

    static createIconButton(icon, tooltip, className, styles = {}) {
        const button = document.createElement('button');
        button.className = `btn btn-sm ${className}`;
        button.innerHTML = `<i class="fas ${icon}"></i>`;

        if (tooltip) {
            const tooltipSpan = this.createTooltip(tooltip);
            button.appendChild(tooltipSpan);
        }

        Object.assign(button.style, styles);
        return button;
    }

    static createTooltip(text, styles = {}) {
        const tooltipSpan = document.createElement('span');
        tooltipSpan.className = 'tooltiptext';
        tooltipSpan.textContent = text;
        Object.assign(tooltipSpan.style, styles);
        return tooltipSpan;
    }

    static addElementToDOM(element, parent) {
        if (parent) {
            parent.appendChild(element);
        } else {
            document.body.appendChild(element);
        }
    }

    static replaceLogo() {
        try {
            const logoImage = document.querySelector('img[src*="academy_of_learning_logo"]');
            if (logoImage) {
                logoImage.src = chrome.runtime.getURL('src/icons/AOL_Logo.png');
                logoImage.removeAttribute('width');
            }
            const smallLogo = document.querySelector('img[src*="top-logo.jpg"]');
            if (smallLogo) {
                smallLogo.src = chrome.runtime.getURL('src/icons/icon.png');
                smallLogo.removeAttribute('width');
            }
        } catch (error) {
            console.error('Error replacing logo:', error);
        }
    }

    static hideNotificationBell() {
        try {
            const notificationBellElement = HelperFunctions.getElementByXPath('NOTIFICATION_BELL');
            if (notificationBellElement) {
                notificationBellElement.style.cssText = 'display: none !important';
            }
        } catch (error) {
            console.error('Error hiding notification bell:', error);
        }
    }

    static addAllCopyIcons() {
        // View Details Page Copy Icons
        HelperFunctions.urlCheck([CONFIG.TICKET_DETAILS_URL], () => {
            try {
                // Add Copy Icon for combined information
                const viewTicketsHeader = HelperFunctions.getElementByXPath('VIEW_TICKETS_HEADER');
                if (viewTicketsHeader) {
                    const copyIcon = HelperFunctions.addCopyIconToElement(viewTicketsHeader, '', {
                        position: 'append',
                        style: { marginLeft: '10px' },
                        title: 'Copy Combined Text'
                    });

                    copyIcon.addEventListener('click', () => {
                        const firstNameText = HelperFunctions.getElementByXPath('FIRST_NAME')?.textContent.trim() || '';
                        const lastNameText = HelperFunctions.getElementByXPath('LAST_NAME')?.textContent.trim() || '';
                        const vNoText = HelperFunctions.findVNumber() || '';
                        const programNameText = HelperFunctions.getElementByXPath('PROGRAM_NAME')?.textContent.trim() || '';
                        const combinedText = `${firstNameText} ${lastNameText} - ${vNoText} - ${programNameText}`;

                        navigator.clipboard.writeText(combinedText)
                            .then(() => HelperFunctions.showInlineCopyAlert(copyIcon))
                            .catch(err => console.error('Copy error: ', err));
                    });
                }

                // Add Copy Icon for contact number
                const contactNumberElement = HelperFunctions.getElementByXPath('CONTACT_NUMBER');
                if (contactNumberElement) {
                    const text = contactNumberElement.textContent.trim();
                    HelperFunctions.addCopyIconToElement(contactNumberElement, text, { position: 'before' });
                }

                // Add Copy Icon for email
                const emailIdElement = HelperFunctions.getElementByXPath('EMAIL_ID');
                if (emailIdElement) {
                    const text = emailIdElement.textContent.trim();
                    HelperFunctions.addCopyIconToElement(emailIdElement, text, { position: 'before' });
                }

                // Add Copy Icon for V-Code
                const vCodeText = HelperFunctions.findVNumber();
                if (vCodeText) {
                    const vCodeElement = HelperFunctions.getElementByXPath('VNO');
                    if (vCodeElement) {
                        HelperFunctions.addCopyIconToElement(vCodeElement, vCodeText, { position: 'before' });
                        StateManager.setVCodeText(vCodeText);
                    }
                }

                // Add Copy Icon for full name
                const firstNameElement = HelperFunctions.getElementByXPath('FIRST_NAME');
                const lastNameElement = HelperFunctions.getElementByXPath('LAST_NAME');
                if (firstNameElement && lastNameElement) {
                    const firstNameText = firstNameElement.textContent.trim();
                    const lastNameText = lastNameElement.textContent.trim();
                    const fullNameText = `${firstNameText} ${lastNameText}`;
                    HelperFunctions.addCopyIconToElement(firstNameElement, fullNameText, { position: 'before' });
                }
            } catch (error) {
                console.error('Error adding copy icons to View Details:', error);
            }
        })();

        HelperFunctions.urlCheck([CONFIG.STUDENT_PROFILE_URL], () => {
            try {
                // Add Copy Icon for profile details - use parent element instead of text node
                const profileDetailsTextNode = HelperFunctions.evaluateXPath("//text()[contains(., 'Profile Details:')]").singleNodeValue;
                const profileDetailsElement = profileDetailsTextNode?.parentNode;

                if (profileDetailsElement) {
                    const copyIcon = HelperFunctions.addCopyIconToElement(profileDetailsElement, '', {
                        position: 'append',
                        style: { marginLeft: '10px' },
                        title: 'Copy Combined Text'
                    });

                    copyIcon.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const td1Text = HelperFunctions.evaluateXPath("//*[@id='faq1']//td[1]").singleNodeValue.textContent.trim();
                        const td2Text = HelperFunctions.evaluateXPath("//*[@id='faq1']//td[2]").singleNodeValue.textContent.trim();
                        const td3Text = HelperFunctions.evaluateXPath("//*[@id='faq1']//td[9]").singleNodeValue.textContent.trim();

                        const combinedText = `${td1Text} - ${td2Text} - ${td3Text}`;
                        navigator.clipboard.writeText(combinedText)
                            .then(() => HelperFunctions.showInlineCopyAlert(copyIcon))
                            .catch(err => console.error('Copy error: ', err));
                    });
                }

                // Add Copy Icon for phone number (no changes needed here)
                const phoneElement = HelperFunctions.evaluateXPath("//*[@id='faq1']//td[6]").singleNodeValue;
                if (phoneElement) {
                    const phoneNumber = phoneElement.textContent.trim();
                    HelperFunctions.addCopyIconToElement(phoneElement, phoneNumber, { position: 'prepend' });
                }
            } catch (error) {
                console.error('Error adding copy icons to Student Profile:', error);
            }
        })();

        this.addVNumberCopyIcons();
    }

    static addVNumberCopyIcons() {
        HelperFunctions.urlCheck([`!${CONFIG.SUPERADMIN_URL}`, `!${CONFIG.SCHEDULE_EXAM_LISTS}`], () => {
            try {
                // First get any V-number that might already be found and stored
                const vCodeText = HelperFunctions.findVNumber();

                // Find all elements with text matching V-number pattern
                const validTags = ['span', 'div', 'td', 'p'];
                validTags.forEach(tag => {
                    const elements = document.getElementsByTagName(tag);
                    Array.from(elements).forEach(element => {
                        if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
                            const text = element.textContent.trim();
                            if (/^V[TBN]\d+$/.test(text)) {
                                // Skip if already has copy icon
                                if (element.querySelector('.fa-copy')) return;

                                HelperFunctions.addCopyIconToElement(element, text, { position: 'prepend' });

                                if (element.tagName.toLowerCase() === 'td') {
                                    element.classList.add('text-nowrap');
                                }
                            }
                        }
                    });
                });

                // If we found a V-number, find any other instances of it on the page
                if (vCodeText) {
                    const vCodeElements = HelperFunctions.evaluateXPath(
                        `//*[contains(text(), '${vCodeText}')]`,
                        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE
                    );

                    for (let i = 0; i < vCodeElements.snapshotLength; i++) {
                        const element = vCodeElements.snapshotItem(i);
                        if (!element.querySelector('.fa-copy')) {
                            HelperFunctions.addCopyIconToElement(element, vCodeText, { position: 'prepend' });

                            if (element.tagName.toLowerCase() === 'td') {
                                element.classList.add('text-nowrap');
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error adding copy icons to V-Numbers:', error);
            }
        })();
    }

    static styleColumns() {
        return HelperFunctions.urlCheck([CONFIG.TICKET_TEMPLATES_URL], function () {
            try {
                const style = document.createElement('style');
                style.textContent = `
                td:nth-child(4), th:nth-child(4), 
                td:nth-child(5), th:nth-child(5), 
                td:nth-child(6), th:nth-child(6), 
                td:nth-child(7), th:nth-child(7) {
                    display: none;
                }
            `;
                document.head.appendChild(style);

                const templateNameElements = HelperFunctions.evaluateXPath(
                    "//table/tbody//td[2]",
                    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE
                );

                if (templateNameElements) {
                    for (let i = 0; i < templateNameElements.snapshotLength; i++) {
                        const td = templateNameElements.snapshotItem(i);
                        td.style.maxWidth = '100px';
                    }
                }

                const templateElements = HelperFunctions.evaluateXPath(
                    "//table/tbody//td[3]",
                    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE
                );

                if (templateElements) {
                    for (let i = 0; i < templateElements.snapshotLength; i++) {
                        const td = templateElements.snapshotItem(i);
                        td.style.maxWidth = '1000px';
                    }
                }
            } catch (error) {
                console.error('Error hiding empty columns:', error);
            }
        })();
    }

    static newActionButtons() {
        return HelperFunctions.urlCheck([CONFIG.ACTIVE_LISTS_URL, CONFIG.DEACTIVE_LISTS_URL], function () {
            try {
                const headers = document.querySelectorAll('th');
                headers.forEach(header => {
                    if (header.textContent.trim() === 'Uploaded By Datetime') {
                        header.textContent = 'Upload Time';
                    } else if (header.textContent.trim() === 'Uploaded By Name') {
                        header.textContent = 'Uploaded By';
                    }
                });

                const resetButtons = document.querySelectorAll('span.btn.btn-sm.btn-danger.mb-1.resetPassDiv');

                resetButtons.forEach(button => {
                    if (button.dataset.styled) return;

                    button.innerHTML = '';

                    const iconSpan = document.createElement('span');
                    iconSpan.innerHTML = '<i class="fas fa-redo-alt"></i>';
                    button.appendChild(iconSpan);

                    button.appendChild(UIManager.createTooltip('Reset Password'));

                    const row = button.closest('tr');
                    const vNoText = row?.querySelector('td:nth-child(2)')?.textContent.trim();

                    const emailCell = row?.querySelector('td:nth-child(3)');
                    let studentMail = null;

                    if (emailCell) {
                        const cfEmailElement = emailCell.querySelector('[data-cfemail]');
                        if (cfEmailElement && cfEmailElement.dataset.cfemail) {
                            studentMail = HelperFunctions.decodeCfEmail(cfEmailElement.dataset.cfemail);
                        } else {
                            studentMail = emailCell.childNodes[1]?.textContent.trim();
                        }
                    }

                    const thPassElements = HelperFunctions.evaluateXPath(
                        `//th[contains(text(), 'Password')]`,
                        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE
                    );

                    let studentPassColumnIndex = 11; // Default to 11th column
                    if (thPassElements.snapshotLength > 0) {
                        const thPassElement = thPassElements.snapshotItem(0);
                        thPassElement.style.display = 'none'; // Hide the header
                        const thPassIndex = Array.from(thPassElement.parentNode.children).indexOf(thPassElement);
                        studentPassColumnIndex = thPassIndex + 1; // Adjust for 1-based index
                    }

                    const studentPass = row?.querySelector(`td:nth-child(${studentPassColumnIndex})`)?.textContent.trim();

                    if (vNoText || studentMail) {
                        const launchButton = UIManager.createIconButton('fa-paper-plane', 'Launch Portal', 'btn-launch');

                        if (!vNoText || !studentMail) {
                            launchButton.disabled = true;
                            launchButton.classList.add('disabled');
                        }

                        launchButton.addEventListener('click', async function () {
                            HelperFunctions.setButtonLoadingState(this, true, 'fa-paper-plane', 0);

                            const response = await HelperFunctions.sendMessage('launchStudentManager', {
                                vNumber: vNoText,
                                email: studentMail,
                                status: 'all'
                            });

                            if (!response.success) {
                                if (typeof ErrorHandler !== 'undefined' && ErrorHandler.showAlert) {
                                    ErrorHandler.showAlert(response.error, 'error');
                                }

                                this.disabled = true;
                                this.classList.remove('disabled');
                                const tooltip = UIManager.createTooltip('Student Not Found on Launch');
                                this.innerHTML = '<i class="fas fa-exclamation" style="color:red"></i>';
                                this.appendChild(tooltip);
                            } else {
                                HelperFunctions.setButtonLoadingState(this, false, 'fa-paper-plane');
                            }
                        });

                        button.parentNode.insertBefore(launchButton, button.nextSibling);
                    }

                    if (studentMail || studentPass) {
                        const studentPortalButton = UIManager.createIconButton('fa-leaf', 'Student Portal', 'btn-student-portal mb-1');

                        if (!studentMail || !studentPass || studentPass.includes('Not Updated Password')) {
                            studentPortalButton.disabled = true;
                            studentPortalButton.classList.add('disabled');
                        }

                        studentPortalButton.addEventListener('click', async function () {
                            HelperFunctions.setButtonLoadingState(this, true, 'fa-leaf', 0);

                            await HelperFunctions.sendMessage('studentPortalLogin', {
                                email: studentMail,
                                password: studentPass
                            });

                            HelperFunctions.setButtonLoadingState(this, false, 'fa-leaf');
                        });

                        button.parentNode.insertBefore(studentPortalButton, button.nextSibling);
                    }

                    button.dataset.styled = true;
                });

                const emailTdElements = HelperFunctions.evaluateXPath(
                    SELECTORS.EMAIL_CELLS,
                    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE
                );

                if (emailTdElements) {
                    for (let i = 0; i < emailTdElements.snapshotLength; i++) {
                        const td = emailTdElements.snapshotItem(i);
                        td.style.wordBreak = 'break-all';
                    }
                }

                const emailHeader = HelperFunctions.evaluateXPath(SELECTORS.EMAIL_HEADER).singleNodeValue;

                if (emailHeader) {
                    emailHeader.style.minWidth = '275px';
                }

                const headerConfigs = [
                    { selector: SELECTORS.START_DATE_HEADER, styles: { minWidth: '95px' } },
                    { selector: SELECTORS.PROGRAM_HEADER, styles: { minWidth: '165px' } },
                    { selector: SELECTORS.CAMPUS_STATUS_HEADER, styles: { minWidth: '70px', textWrap: 'auto' } },
                    { selector: SELECTORS.AMPM_HEADER, styles: { minWidth: '125px' } },
                    { selector: SELECTORS.GRADUATION_HEADER, styles: { minWidth: '95px', textWrap: 'auto' } }
                ];

                headerConfigs.forEach(config => {
                    const element = HelperFunctions.evaluateXPath(config.selector).singleNodeValue;
                    if (element) {
                        Object.assign(element.style, config.styles);
                    }
                });

                const passwordElements = HelperFunctions.evaluateXPath(
                    SELECTORS.PASSWORD_CELLS,
                    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE
                );

                if (passwordElements) {
                    for (let i = 0; i < passwordElements.snapshotLength; i++) {
                        const td = passwordElements.snapshotItem(i);
                        td.classList.remove('text-nowrap');
                        td.style.display = 'none';
                    }
                }


                const targetTH = HelperFunctions.evaluateXPath(SELECTORS.ACTION_CELL).singleNodeValue;
                if (targetTH) {
                    targetTH.style.textWrap = 'balance';
                }

            } catch (error) {
                console.log(error, 'styleResetButtons');
            }
        })();
    }

    static mergedColumns() {
        return HelperFunctions.urlCheck([CONFIG.ACTIVE_LISTS_URL, CONFIG.DEACTIVE_LISTS_URL, CONFIG.ACMELISTS_URL], function () {
            try {
                // Find the Start Date header
                const startDateHeader = HelperFunctions.evaluateXPath(SELECTORS.START_DATE_HEADER).singleNodeValue;

                // Try to find Finish Date first, if not found try End Date
                let finishDateHeader = HelperFunctions.evaluateXPath(SELECTORS.FINISH_DATE_HEADER).singleNodeValue;
                if (!finishDateHeader) {
                    finishDateHeader = HelperFunctions.evaluateXPath(SELECTORS.END_DATE_HEADER).singleNodeValue;
                }

                if (startDateHeader && finishDateHeader) {
                    // Get column indices (1-based)
                    const startDateIndex = Array.from(startDateHeader.parentNode.children).indexOf(startDateHeader) + 1;
                    const finishDateIndex = Array.from(finishDateHeader.parentNode.children).indexOf(finishDateHeader) + 1;

                    // Change the Start Date header text to "Start/Finish"
                    startDateHeader.textContent = 'Start/Finish';

                    // Hide Finish Date header
                    finishDateHeader.style.display = 'none';

                    // Find all table rows
                    const tableRows = document.querySelectorAll('table tbody tr');
                    tableRows.forEach(row => {
                        const startDateCell = row.querySelector(`td:nth-child(${startDateIndex})`);
                        const finishDateCell = row.querySelector(`td:nth-child(${finishDateIndex})`);

                        if (startDateCell && finishDateCell) {
                            // Get date values
                            const startDate = startDateCell.textContent.trim();
                            const finishDate = finishDateCell.textContent.trim();

                            // Create new content with dates stacked vertically
                            startDateCell.innerHTML = `
                                <div style="margin-bottom: 3px;font-weight:bold;color:#28a745">${startDate || 'N/A'}</div>
                                <div style="font-weight:bold;color:#e02f22">${finishDate || 'N/A'}</div>
                            `;

                            // Hide the original Finish Date cell
                            finishDateCell.style.display = 'none';
                        }
                    });

                    // Also adjust any DataTable settings if they exist
                    if (window.jQuery && $.fn.DataTable) {
                        // Check if DataTable is already initialized
                        if ($.fn.DataTable.isDataTable('table')) {
                            const table = $('table').DataTable();
                            if (table) {
                                table.columns(finishDateIndex - 1).visible(false);
                            }
                        } else {
                            // Prevent automatic DataTable initialization
                            const tableElement = document.querySelector('table');
                            if (tableElement) {
                                tableElement.setAttribute('data-no-datatable', 'true');
                            }
                        }
                    }
                } else {
                    console.log('Start Date or End/Finish Date headers not found');
                }

                // Try to find Form Status header first, if not found try Docs Status
                let formStatusHeader = HelperFunctions.evaluateXPath(SELECTORS.FORM_STATUS).singleNodeValue;
                let isDocsStatusHeader = false;

                if (!formStatusHeader) {
                    formStatusHeader = HelperFunctions.evaluateXPath(SELECTORS.DOCS_STATUS).singleNodeValue;
                    if (formStatusHeader) {
                        isDocsStatusHeader = true;
                    }
                }

                if (formStatusHeader) {
                    // Change the header text
                    formStatusHeader.textContent = 'Docs Status';

                    // Find all cells in this column
                    const formStatusIndex = Array.from(formStatusHeader.parentNode.children).indexOf(formStatusHeader) + 1;
                    const formStatusCells = document.querySelectorAll(`table tbody tr td:nth-child(${formStatusIndex})`);

                    formStatusCells.forEach(cell => {
                        // Only process text-nowrap cells
                        if (cell.classList.contains('text-nowrap')) {
                            let cellContent = cell.innerHTML;

                            // Apply different text changes based on which header we found
                            if (isDocsStatusHeader) {
                                // ACME List specific replacements
                                cellContent = cellContent.replace('1) Send Email to Student-', 'Send to Student:');
                                cellContent = cellContent.replace('1) Sent Email to Student-', 'Sent to Student:');
                                cellContent = cellContent.replace('2) Signed By Student-', 'Signed By Student:');
                                cellContent = cellContent.replace('3) Signed By Contract Manager-', 'Signed By Manager:');
                            } else {
                                // Active/Deactive Lists replacements
                                cellContent = cellContent.replace('1) Send Email to Student-', 'Sent:');
                                cellContent = cellContent.replace('2) Signed By Student-', 'Signed:');
                            }

                            // Replace Done text with just an icon (no text)
                            cellContent = cellContent.replace(
                                /<span class="text-success"><b>Done<\/b><\/span>/g,
                                '<span class="text-success" style="display:inline-flex;align-items:center;">' +
                                '<i class="fas fa-check" style="background-color:#28a745;border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:white;font-size:10px;margin:3px;"></i>' +
                                '</span>'
                            );

                            // Replace Pending text with just an icon (no text)
                            cellContent = cellContent.replace(
                                /<span class="text-danger">Pending<\/span>/g,
                                '<span class="text-danger" style="display:inline-flex;align-items:center;">' +
                                '<i class="fas fa-clock" style="margin: 3px; font-size:large;"></i>' +
                                '</span>'
                            );

                            // Apply the updated HTML to the cell
                            cell.innerHTML = cellContent;

                            // Check if the cell has Declaration button
                            const declButton = cell.querySelector('.sendEmailDivNewDclrtn');
                            if (declButton) {
                                const dataId = declButton.getAttribute('data-id');
                                // Replace the button with simplified version
                                declButton.textContent = 'Resend';
                                declButton.className = 'btn btn-sm btn-success float-sm-left sendEmailDivNewDclrtn';
                                declButton.setAttribute('data-id', dataId);
                            }
                        }
                    });
                } else {
                    console.log('Form/Docs Status header not found');
                }

                // Find the Password header and simplify "Resend - Welcome Email" buttons
                const passwordHeader = HelperFunctions.evaluateXPath(SELECTORS.PASSWORD_HEADER).singleNodeValue;
                if (passwordHeader) {
                    // Find all cells in the password column
                    const passwordIndex = Array.from(passwordHeader.parentNode.children).indexOf(passwordHeader) + 1;
                    const passwordCells = document.querySelectorAll(`table tbody tr td:nth-child(${passwordIndex})`);

                    passwordCells.forEach(cell => {
                        const welcomeEmailButton = cell.querySelector('span.btn.btn-sm.btn-success.float-sm-left.sendEmailDivNew');
                        if (welcomeEmailButton) {
                            const dataId = welcomeEmailButton.getAttribute('data-id');
                            welcomeEmailButton.textContent = 'Resend';
                            welcomeEmailButton.setAttribute('data-id', dataId);
                        }
                    });
                }

            } catch (error) {
                console.error('Error combining date columns:', error);
            }
        })();
    }

    static modifyMenu() {
        return HelperFunctions.urlCheck([`!${CONFIG.ACMELISTS_URL}`], function () {
            const ticketIcons = document.querySelectorAll('.fas.fa-ticket-alt');
            ticketIcons.forEach(icon => {
                icon.classList.remove('fas', 'fa-ticket-alt');
                icon.classList.add('fa-solid', 'fa-ticket');
            });

            const activeListsItem = document.querySelector('li > a[href*="../clgStActive/activeLists.php"]');
            const deactiveListsItem = document.querySelector('li > a[href*="../clgStActive/deactiveLists.php"]');

            if (activeListsItem && deactiveListsItem) {
                const searchBox = document.createElement("div");
                searchBox.className = "search-box";
                searchBox.innerHTML = `
                <input type="text" id="activeListSearch" placeholder="Search lists..." autocomplete="off">
                <div class="radio-group">
                    <label for="activeRadio">
                        <input type="radio" id="activeRadio" name="listType" value="activeLists" checked>
                        Active
                    </label>
                    <label for="deactiveRadio">
                        <input type="radio" id="deactiveRadio" name="listType" value="deactiveLists">
                        DeActive
                    </label>
                </div>
                <button id="activeListSearchBtn"><i class="fas fa-search"></i></button> 
            `;

                const targetElement = HelperFunctions.evaluateXPath('//*[@id="side-menu"]/li[1]').singleNodeValue;

                if (targetElement) {
                    targetElement.parentNode.insertBefore(searchBox, targetElement.nextSibling);
                } else {
                    console.error("XPath ile hedef öğe bulunamadı! Arama kutusu activeListsItem'dan önce ekleniyor.");
                    activeListsItem.parentNode.insertBefore(searchBox, activeListsItem);
                }

                const searchInput = document.getElementById("activeListSearch");
                const searchButton = document.getElementById("activeListSearchBtn");
                const activeRadio = document.getElementById("activeRadio");

                searchButton.addEventListener("click", () => {
                    const keyword = searchInput.value;
                    let listType = activeRadio.checked ? "activeLists" : "deactiveLists";
                    let targetURL = listType === "activeLists" ? activeListsItem.href : deactiveListsItem.href;
                    const newURL = targetURL.includes("?")
                        ? `${targetURL}&keywordLists=${encodeURIComponent(keyword)}`
                        : `${targetURL}?keywordLists=${encodeURIComponent(keyword)}`;
                    window.location.href = newURL;
                });

                searchInput.addEventListener("keyup", (event) => {
                    if (event.key === "Enter") {
                        searchButton.click();
                    }
                });

                const menuLink = document.querySelector('a[href*="pending_list.php"]');
                if (!menuLink) return;
            }

            const helpDeskRequestsItem = document.createElement('li');
            helpDeskRequestsItem.innerHTML = `
                <a href="#" id="helpDeskRequestsLink" aria-label="EP Help Desk" aria-expanded="false" style="font-weight: 600;" oncontextmenu="return false;">
                    <i class="fas fa-paper-plane" style="color: #5dc8da;"></i><span style="color: orange;">EP Help Desk</span>
                </a>
                `;

            const lastLiElement = document.querySelector('#side-menu > li:last-child');

            if (lastLiElement) {
                lastLiElement.parentNode.insertBefore(helpDeskRequestsItem, lastLiElement);
                lastLiElement.parentNode.insertBefore(helpDeskRequestsItem, lastLiElement);
            } else {
                const sideMenu = document.getElementById('side-menu');
                if (sideMenu) {
                    sideMenu.appendChild(helpDeskRequestsItem);
                } else {
                    console.log('side-menu element not found');
                }
            }

            const helpDeskRequestsLink = document.getElementById('helpDeskRequestsLink');
            if (helpDeskRequestsLink) {
                helpDeskRequestsLink.addEventListener('click', (e) => {
                    e.preventDefault();

                    const url = 'https://aoltorontoagents.ca/student_contract/helpdesk/dashboard';
                    window.history.pushState({
                        page: 'help-desk-dashboard',
                        timestamp: Date.now()
                    }, '', url);

                    HelpDeskManager.loadHelpDeskPage();
                });

                HelpDeskManager.initializeHistoryManagement();
            } else {
                console.log('Help Desk Requests link not found');
            }


            const body = document.body;
            const simplebarTrack = document.querySelector('.simplebar-track.simplebar-vertical');
            const simplebarScrollbar = simplebarTrack ? simplebarTrack.querySelector('.simplebar-scrollbar') : null;

            // ✅ Search box visibility toggle function
            function toggleSearchBox() {
                const searchBox = document.querySelector('.search-box');
                const isCollapsed = body.classList.contains('vertical-collpsed');

                if (searchBox) {
                    searchBox.style.display = isCollapsed ? 'none' : 'block';
                }
            }

            function applyMenuState() {
                const isCollapsed = localStorage.getItem('menuCollapsed') === 'true';
                if (isCollapsed) {
                    body.classList.add('sidebar-enable', 'vertical-collpsed');
                    if (simplebarTrack) simplebarTrack.style.visibility = 'hidden';
                    if (simplebarScrollbar) simplebarScrollbar.style.display = 'none';
                } else {
                    body.classList.remove('sidebar-enable', 'vertical-collpsed');
                    if (simplebarTrack) simplebarTrack.style.visibility = 'visible';
                    if (simplebarScrollbar) simplebarScrollbar.style.display = 'block';
                }

                // ✅ Apply search box visibility after menu state changes
                toggleSearchBox();
            }

            function saveMenuState() {
                const isCollapsed = body.classList.contains('vertical-collpsed');
                localStorage.setItem('menuCollapsed', isCollapsed);
            }

            applyMenuState();

            if (window._menuObserver) {
                window._menuObserver.disconnect();
                window._menuObserver = null;
            }

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        saveMenuState();
                        // ✅ Update search box visibility when menu state changes
                        toggleSearchBox();
                    }
                });
            });

            observer.observe(body, { attributes: true });
            // Store the observer reference for cleanup
            window._menuObserver = observer;

            // Add cleanup when page changes
            window.addEventListener('beforeunload', () => {
                if (window._menuObserver) {
                    window._menuObserver.disconnect();
                    window._menuObserver = null;
                }
            });

            observer.observe(body, { attributes: true });

            const activeMenuItem = HelperFunctions.getElementByXPath("ACTIVE_MENU_ITEM");

            if (activeMenuItem) {
                const ticketsListLi = HelperFunctions.evaluateXPath("//a[contains(@class, 'active') and @href]/parent::li/parent::ul/parent::li").singleNodeValue;
                const ticketsListUl = HelperFunctions.evaluateXPath("//a[contains(@class, 'active') and @href]/parent::li/parent::ul/parent::li/ul").singleNodeValue;

                if (ticketsListLi) {
                    ticketsListLi.classList.add("mm-show");
                    ticketsListLi.classList.add("mm-active");
                }

                if (ticketsListUl) {
                    ticketsListUl.classList.add("mm-show");
                } else {
                    console.log("No ul item for Tickets menu found!");
                }
            }
        })();
    }

    static addLaunchButtons() {
        return HelperFunctions.urlCheck([CONFIG.TICKET_DETAILS_URL, CONFIG.STUDENT_PROFILE_URL], function () {
            // Different approach based on URL
            if (window.location.href.includes(CONFIG.TICKET_DETAILS_URL)) {
                // For TICKET_DETAILS_URL, first try with first name and last name
                try {
                    const vNoText = HelperFunctions.findVNumber() || '';
                    const firstNameElement = HelperFunctions.getElementByXPath('FIRST_NAME');
                    const lastNameElement = HelperFunctions.getElementByXPath('LAST_NAME');

                    if (firstNameElement && lastNameElement && vNoText) {
                        const firstName = firstNameElement.textContent.trim();
                        const lastName = lastNameElement.textContent.trim();

                        // Create and add the button using name and VNumber
                        const createLaunchButton = () => {
                            const button = document.createElement('button');
                            button.className = 'launch-button';

                            const icon = document.createElement('i');
                            icon.className = 'fas fa-paper-plane';
                            button.appendChild(icon);

                            const text = document.createElement('span');
                            text.textContent = 'Open Launch Portal';
                            text.className = 'launch-button-text';
                            button.appendChild(text);

                            button.addEventListener('click', () => {
                                chrome.runtime.sendMessage({
                                    action: 'launchStudentManager',
                                    data: {
                                        vNumber: vNoText,
                                        firstName: firstName,
                                        lastName: lastName
                                    }
                                });

                                // Processing sınıfını ekle
                                button.classList.add('processing');

                                // Store original HTML content
                                const originalContent = button.innerHTML;
                                HelperFunctions.setButtonLoadingState(button, true, '', 3000, 'Processing...');

                                setTimeout(() => {
                                    button.disabled = false;
                                    button.classList.remove('disabled', 'processing');
                                    button.innerHTML = originalContent;
                                }, 3000);
                            });

                            return button;
                        };

                        const body = document.querySelector('body');
                        if (body) {
                            const launchButton = createLaunchButton();
                            body.appendChild(launchButton);
                        }
                        return;
                    } else {
                        console.log("Could not find name or V-number, falling back to AolccLink method");
                        // Fall back to waiting for AolccLink
                        waitForAolccLink();
                    }
                } catch (error) {
                    console.error('Error finding student details for Launch button:', error);
                    // Fall back to waiting for AolccLink
                    waitForAolccLink();
                }
            } else {
                // For STUDENT_PROFILE_URL, use the original approach
                waitForAolccLink();
            }

            // Function to wait for AolccLink and create button using the email
            function waitForAolccLink() {
                const waitForLink = new Promise((resolve) => {
                    const checkForLink = () => {
                        const aolccLink = HelperFunctions.evaluateXPath("//a[contains(@href, 'my-aolcc.com')]");
                        if (aolccLink.singleNodeValue) {
                            resolve(aolccLink.singleNodeValue);
                        } else {
                            setTimeout(checkForLink, 100);
                        }
                    };
                    checkForLink();
                });

                waitForLink.then((aolccLinkElement) => {
                    try {
                        const vNoText = HelperFunctions.findVNumber() || '';
                        const studentMail = aolccLinkElement.textContent.trim();

                        const createLaunchButton = () => {
                            const button = document.createElement('button');
                            button.className = 'launch-button';

                            const icon = document.createElement('i');
                            icon.className = 'fas fa-paper-plane';
                            button.appendChild(icon);

                            const text = document.createElement('span');
                            text.textContent = 'Open Launch Portal';
                            text.className = 'launch-button-text';
                            button.appendChild(text);

                            button.addEventListener('click', () => {
                                chrome.runtime.sendMessage({
                                    action: 'launchStudentManager',
                                    data: {
                                        vNumber: vNoText,
                                        email: studentMail
                                    }
                                });

                                const originalContent = button.innerHTML;
                                HelperFunctions.setButtonLoadingState(button, true, '', 3000, 'Processing...');

                                setTimeout(() => {
                                    button.disabled = false;
                                    button.classList.remove('disabled');
                                    button.innerHTML = originalContent;
                                }, 3000);
                            });

                            return button;
                        };

                        const body = document.querySelector('body');
                        if (body) {
                            const launchButton = createLaunchButton();
                            body.appendChild(launchButton);
                        }
                    } catch (error) {
                        console.error('Error adding launch button with AolccLink:', error);
                    }
                });
            }
        })();
    }

    static initializeModal() {
        if (document.getElementById('viewModal')) return;

        const modalHTML = `
            <div id="viewModal" class="modal-overlay active" style="display:none">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"></h5>
                        <div class="modal-actions">
                            <a href="#" class="download-link">
                                <i class="fas fa-download"></i> Download
                            </a>
                            <button class="modal-close">&times;</button>
                        </div>
                    </div>
                    <div class="modal-body"></div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById('viewModal');
        const closeBtn = modal.querySelector('.modal-close');
        const downloadLink = modal.querySelector('.download-link');

        closeBtn.addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                this.closeModal();
            }
        });

        return { modal, downloadLink };
    }

    static showModal(title, content, studentName, vNumber) {
        this.initializeModal();
        const modal = document.getElementById('viewModal');
        const downloadLink = modal.querySelector('.download-link');

        modal.querySelector('.modal-title').textContent = studentName && vNumber ?
            `${studentName} - ${vNumber}` : title;

        modal.querySelector('.modal-body').innerHTML = content;

        const handleEscClose = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        };
        document.addEventListener('keydown', handleEscClose);

        modal.addEventListener('hidden', () => {
            document.removeEventListener('keydown', handleEscClose);
        }, { once: true });

        modal.style.display = 'flex';

        if (content.includes('iframe') && studentName && vNumber) {
            const iframe = modal.querySelector('iframe');
            if (iframe && iframe.src) {
                chrome.runtime.sendMessage({
                    action: "checkPDF",
                    pdfUrl: String(iframe.src)
                }).then(async response => {
                    const modalTitle = modal.querySelector('.modal-title');
                    const badge = document.createElement('span');
                    badge.className = 'typing-badge';
                    badge.classList.add(response?.isTypingTrainer ? 'success' : 'error');
                    badge.innerHTML = `<i class="fas ${response?.isTypingTrainer ? 'fa-check' : 'fa-exclamation'}"></i>`;
                    badge.setAttribute('data-tooltip',
                        response?.isTypingTrainer ?
                            'This is a valid Typing Trainer result' :
                            'This may not be a Typing Trainer result. Please check carefully.'
                    );
                    modalTitle.appendChild(badge);
                }).catch(error => {
                    console.error("Error:", error);
                });
            }
        }

        if (!studentName || !vNumber) {
            downloadLink.style.display = 'none';
        } else {
            downloadLink.style.display = 'inline-block';
            const fileExtension = title.split('.').pop().toLowerCase();
            const fileName = `${studentName} - ${vNumber}.${fileExtension}`;
            const modalBody = modal.querySelector('.modal-body');
            const sourceElement = fileExtension === 'pdf' ?
                modalBody.querySelector('iframe') :
                modalBody.querySelector('img');

            if (sourceElement) {
                console.log('Setting up download link:', fileExtension, fileName, sourceElement.src);
                this.setupDownloadLink(fileExtension, downloadLink, fileName, sourceElement.src);
            }
            else {
                console.error('Source element not found for download link setup.');
            }
        }
    }

    static closeModal() {
        const modal = document.getElementById('viewModal');
        if (!modal) return;

        const downloadLink = modal.querySelector('.download-link');
        if (downloadLink && downloadLink.href.startsWith('blob:')) {
            URL.revokeObjectURL(downloadLink.href);
        }

        modal.style.display = 'none';
        modal.querySelector('.modal-body').innerHTML = '';
        modal.querySelector('.modal-title').textContent = '';
        downloadLink.href = '#';
        downloadLink.removeAttribute('download');
    }

    static setupDownloadLink(fileExtension, downloadLink, fileName, sourceUrl) {
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension.toLowerCase())) {
            downloadLink.onclick = async (e) => {
                e.preventDefault();
                await HelperFunctions.downloadFile(sourceUrl, fileName);
            };
        } else {
            downloadLink.onclick = async (e) => {
                e.preventDefault();
                chrome.runtime.sendMessage({
                    action: "downloadFile",
                    fileUrl: sourceUrl,
                    fileName: fileName
                }, (response) => {
                    if (response.success) {
                        const byteCharacters = atob(response.base64data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: response.fileType });
                        const blobUrl = window.URL.createObjectURL(blob);
                        const tempLink = document.createElement('a');
                        tempLink.href = blobUrl;
                        tempLink.setAttribute('download', response.fileName);
                        document.body.appendChild(tempLink);
                        tempLink.click();
                        document.body.removeChild(tempLink);
                        window.URL.revokeObjectURL(blobUrl);
                    } else {
                        console.error('File download error:', response.error);
                    }
                });
            };
        }
    }

    static enhanceProgramFilter() {
        try {
            const selectElement = document.querySelector(SELECTORS.PROGRAM_FILTER_SELECT);

            if (!selectElement) {
                return;
            }

            // Already enhanced
            if (selectElement.parentNode.classList.contains('program-filter-searchable')) {
                return;
            }

            // Sort options alphabetically (skip the first 'Filter by Program' option)
            const firstOption = selectElement.options[0];
            const optionsArray = Array.from(selectElement.options).slice(1);
            optionsArray.sort((a, b) => a.textContent.trim().localeCompare(b.textContent.trim()));

            // Clear and recreate options
            selectElement.innerHTML = '';
            selectElement.appendChild(firstOption);
            optionsArray.forEach(option => selectElement.appendChild(option));

            // Create wrapper for the searchable dropdown
            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'program-filter-searchable';
            wrapperDiv.style.position = 'relative';
            selectElement.parentNode.insertBefore(wrapperDiv, selectElement);
            wrapperDiv.appendChild(selectElement);

            // Create search input container for positioning the clear button
            const searchInputContainer = document.createElement('div');
            searchInputContainer.className = 'search-input-container';
            searchInputContainer.style.position = 'relative';
            wrapperDiv.insertBefore(searchInputContainer, selectElement);

            // Create search input
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'form-control form-control-sm';
            searchInput.placeholder = 'Search program...';
            searchInputContainer.appendChild(searchInput);

            // Create clear button (X)
            const clearButton = document.createElement('span');
            clearButton.innerHTML = '&times;';
            clearButton.className = 'search-clear-button';
            searchInputContainer.appendChild(clearButton);

            // Create dropdown list container
            const dropdownList = document.createElement('ul');
            dropdownList.className = 'program-filter-options';
            wrapperDiv.appendChild(dropdownList);

            // Function to reset selection
            const resetSelection = () => {
                searchInput.value = '';
                selectElement.value = '';
                clearButton.style.display = 'none';
                dropdownList.style.display = 'block';

                // Show all options
                Array.from(dropdownList.querySelectorAll('li')).forEach(item => {
                    item.style.display = '';
                });

                // Trigger change event on the select
                const event = new Event('change', { bubbles: true });
                selectElement.dispatchEvent(event);
            };

            // Add clear button functionality
            clearButton.addEventListener('click', (event) => {
                event.stopPropagation();
                resetSelection();
            });

            // Populate dropdown list with options
            optionsArray.forEach(option => {
                const listItem = document.createElement('li');
                listItem.textContent = option.textContent;
                listItem.dataset.value = option.value;

                listItem.addEventListener('mouseenter', () => {
                    listItem.style.backgroundColor = '#f8f9fa';
                });

                listItem.addEventListener('mouseleave', () => {
                    listItem.style.backgroundColor = '';
                });

                listItem.addEventListener('click', () => {
                    selectElement.value = listItem.dataset.value;
                    searchInput.value = listItem.textContent;
                    dropdownList.style.display = 'none';
                    clearButton.style.display = 'block'; // Show clear button when option selected

                    // Trigger change event
                    const event = new Event('change', { bubbles: true });
                    selectElement.dispatchEvent(event);
                });

                dropdownList.appendChild(listItem);
            });

            // Add search functionality
            searchInput.addEventListener('focus', () => {
                dropdownList.style.display = 'block';
            });

            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();

                // Show/hide clear button based on input
                if (searchTerm) {
                    clearButton.style.display = 'block';
                } else {
                    clearButton.style.display = 'none';
                }

                const items = dropdownList.querySelectorAll('li');

                items.forEach(item => {
                    if (item.textContent.toLowerCase().includes(searchTerm)) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });

            // Hide dropdown when clicking outside
            document.addEventListener('click', event => {
                if (!wrapperDiv.contains(event.target)) {
                    dropdownList.style.display = 'none';
                }
            });

            // Hide the original select element completely
            selectElement.style.display = 'none';

            // Check URL parameters for pre-selected value
            const urlParams = new URLSearchParams(window.location.search);
            const selectedProgram = urlParams.get('crsFltr');

            if (selectedProgram) {
                // Find the matching option
                const decodedProgram = decodeURIComponent(selectedProgram);
                const matchingOption = Array.from(selectElement.options).find(option =>
                    option.value === decodedProgram
                );

                if (matchingOption) {
                    // Set the select element value
                    selectElement.value = matchingOption.value;

                    // Update the search input
                    searchInput.value = matchingOption.textContent;

                    // Show the clear button
                    clearButton.style.display = 'block';

                    console.log(`Applied filter from URL: ${matchingOption.textContent}`);
                }
            }

        } catch (error) {
            console.error('Error enhancing program filter:', error);
        }
    }

    static checkDataFirstLoading() {
        return HelperFunctions.urlCheck([CONFIG.ACMELISTS_URL], async function () {
            // Get URL parameters with their current values
            const urlParams = HelperFunctions.getCurrentUrlParams();
            const keywordLists = urlParams.keywordLists;
            const pageNo = urlParams.page_no;

            // Skip if there are keywords specified or if we're on any page other than the first page
            if ((keywordLists && keywordLists.trim() !== '') || (pageNo && parseInt(pageNo) > 1)) {
                console.log('Skipping data processing on paginated view or search results.');
                return;
            }

            try {
                // Find the target container for proper positioning
                const tableResponsive = document.querySelector('.table-responsive.secondaryContainer');
                if (!tableResponsive) {
                    console.log('Table container not found');
                    return;
                }

                // Get the parent element where we'll insert all notifications and progress bars
                const tableParent = tableResponsive.parentNode;

                // Create a container for all alerts and progress indicators that should appear above the table
                let alertContainer = document.getElementById('enhancer-alert-container');
                if (!alertContainer) {
                    alertContainer = document.createElement('div');
                    alertContainer.id = 'enhancer-alert-container';
                    tableParent.insertBefore(alertContainer, tableResponsive);
                }

                // Show loading indicator - INSERT INTO THE ALERT CONTAINER
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'alert alert-info';
                loadingDiv.textContent = 'Downloading and processing student data...';
                alertContainer.appendChild(loadingDiv);

                // Ensure the spinner style exists in the document
                if (!document.getElementById('enhancer-spinner-style')) {
                    HelperFunctions.setButtonLoadingState(document.createElement('button'), true);
                }

                // Download Excel data once for both operations
                const blob = await DataService.getStudentListExcel({
                    ...HelperFunctions.getUrlParamsWithDefaults({
                        keywordLists: '',
                        startFilter: '',
                        statusFilter: ''
                    })
                });

                try {
                    // Update loading message
                    HelperFunctions.setButtonLoadingState(loadingDiv, true, 'fa-spinner', 0, 'Processing student data...');

                    // Process Excel data
                    const jsonData = await HelperFunctions.processExcelBlob(blob, ['Start Date', 'Signature Date']);

                    // STEP 1: Check for duplicate emails - EXACTLY LIKE THE ORIGINAL
                    HelperFunctions.setButtonLoadingState(loadingDiv, true, 'fa-spinner', 0, 'Checking for duplicate emails...');

                    // Check for duplicate emails - using the original logic
                    const emailMap = new Map();
                    const duplicates = [];

                    jsonData.forEach(row => {
                        const email = row['Email Id'] || row['Email Address'];
                        if (!email) return;

                        if (emailMap.has(email)) {
                            // If this is the first duplicate, add the original entry too
                            if (!duplicates.some(d => d['Email Id'] === email || d['Email Address'] === email)) {
                                duplicates.push(emailMap.get(email));
                            }
                            duplicates.push(row);
                        } else {
                            emailMap.set(email, row);
                        }
                    });

                    HelperFunctions.setButtonLoadingState(loadingDiv, true, 'fa-spinner', 0, 'Checking for invalid program and campus combinations...');

                    // Get allPrograms data from localStorage
                    let allProgramsData = [];
                    try {
                        const result = await new Promise((resolve) => {
                            chrome.storage.local.get(['allPrograms'], resolve);
                        });
                        allProgramsData = result.allPrograms || [];
                    } catch (error) {
                        console.error('Error loading allPrograms from chrome storage:', error);
                    }

                    const invalidProgramRecords = [];
                    jsonData.forEach(row => {
                        const program = (row['Program Name'] || row['Program'] || '').trim();
                        const campus = (row['Campus'] || '').trim();
                        const vNumber = row['V-number'] || row['VNo.'] || row['Vnumber'] || '';

                        const addInvalid = (reason) => invalidProgramRecords.push({
                            ...row,
                            vNumber: vNumber || 'Unknown V-Number',
                            program: program,
                            campus: campus,
                            reason: reason
                        });

                        if (!program || !campus) {
                            return; // Skip if program or campus is empty
                        }

                        // Find matching program in allPrograms data
                        let matchedProgram = null;

                        // First, try exact match in programName
                        matchedProgram = allProgramsData.find(p =>
                            p.programName && p.programName.toLowerCase() === program.toLowerCase()
                        );

                        // If not found, try exact match in alternativeNames
                        if (!matchedProgram) {
                            matchedProgram = allProgramsData.find(p =>
                                p.alternativeNames && p.alternativeNames.some(altName =>
                                    altName.toLowerCase() === program.toLowerCase()
                                )
                            );
                        }

                        if (matchedProgram) {
                            // Check if campus is in activeCampuses
                            const isActiveCampus = matchedProgram.activeCampuses &&
                                matchedProgram.activeCampuses.some(activeCampus =>
                                    activeCampus.toLowerCase() === campus.toLowerCase()
                                );

                            if (!isActiveCampus) {
                                addInvalid(`Program "${program}" is not available at "${campus}" campus`);
                            }
                        }
                    });

                    // Show ErrorHandler alerts for Business Administration + Toronto records
                    if (invalidProgramRecords.length > 0) {
                        invalidProgramRecords.forEach(record => {
                            ErrorHandler.showAlert(`${record.program} program found in ${record.campus} campus for ${record.vNumber}. <a href="https://aoltorontoagents.ca/student_contract/campusLists/acmeLists.php?keywordLists=${record.vNumber}" target="_blank" style="color: white; font-weight: bolder; margin-left:10px;">View Student <i class="fas fa-external-link"></i></a>`);
                        });
                    }

                    // Remove loading indicator
                    loadingDiv.remove();

                    // Create new loading div for the Launch checks - INSERT INTO THE ALERT CONTAINER
                    const launchLoadingDiv = document.createElement('div');
                    launchLoadingDiv.className = 'alert alert-info';
                    launchLoadingDiv.style.opacity = '0.7';
                    HelperFunctions.setButtonLoadingState(launchLoadingDiv, true, 'fa-spinner', 0, 'Performing background Launch check...');
                    alertContainer.appendChild(launchLoadingDiv);

                    // If duplicates are found, show warning - EXACTLY AS IN THE ORIGINAL
                    // But insert into the main parent AFTER the alert container to maintain order
                    if (duplicates.length > 0) {
                        const tableContainer = document.createElement('div');
                        tableContainer.className = 'alert alert-danger';

                        // Create warning message
                        const warningText = document.createElement('p');
                        warningText.innerHTML = '<strong>Warning:</strong> Duplicate email addresses were found in the records. Please review the following entries:';

                        // Add copy table icon after the warning text
                        const copyTableIcon = HelperFunctions.addCopyIconToElement(warningText, '', {
                            position: 'append',
                            style: { marginLeft: '5px' },
                            title: 'Copy Table Data'
                        });

                        // Define the specific headers we want to show - from original
                        const desiredHeaders = [
                            'Program',
                            'Campus',
                            'St.Name',
                            'VNo.',
                            'Email Id',
                            'Start Date',
                            'CPL',
                            'Signature Date',
                            'Campus Status',
                            'Rep Name',
                            'Acme Status'
                        ];

                        // Map the headers in the data to our desired headers - from original
                        const headerMappings = {
                            'Program Name': 'Program',
                            'Fullname': 'St.Name',
                            'V-number': 'VNo.',
                            'Email Address': 'Email Id',
                            'Case Worker Name': 'Rep Name'
                        };

                        copyTableIcon.addEventListener('click', () => {
                            // Create a formatted HTML version of the table for copying
                            const tableHTML = `
                            <table style="border-collapse: collapse; width: 100%;">
                                <thead>
                                <tr>
                                    ${desiredHeaders.map(header =>
                                `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${header}</th>`
                            ).join('')}
                                </tr>
                                </thead>
                                <tbody>
                                ${duplicates.map(row => `
                                    <tr>
                                    ${desiredHeaders.map(header => {
                                // Check if we need to map the header name
                                let dataHeader = header;
                                for (const [key, value] of Object.entries(headerMappings)) {
                                    if (value === header && row[key] !== undefined) {
                                        dataHeader = key;
                                        break;
                                    }
                                }
                                // Handle empty Campus Status
                                if (header === 'Campus Status' && (!row[dataHeader] || row[dataHeader] === '')) {
                                    return `<td style="border: 1px solid #ddd; padding: 8px;">Not-Start</td>`;
                                }
                                return `<td style="border: 1px solid #ddd; padding: 8px;">${row[dataHeader] || ''}</td>`;
                            }).join('')}
                                    </tr>
                                `).join('')}
                                </tbody>
                            </table>`;

                            // Also create a tab-separated format for Excel (as a fallback)
                            const formattedTable = [];
                            formattedTable.push(desiredHeaders.join('\t'));

                            duplicates.forEach(row => {
                                const rowData = [];
                                desiredHeaders.forEach(header => {
                                    // Check if we need to map the header name
                                    let dataHeader = header;
                                    for (const [key, value] of Object.entries(headerMappings)) {
                                        if (value === header && row[key] !== undefined) {
                                            dataHeader = key;
                                            break;
                                        }
                                    }
                                    rowData.push(row[dataHeader] || '');
                                });
                                formattedTable.push(rowData.join('\t'));
                            });

                            const tableText = formattedTable.join('\n');

                            // Copy both HTML and plain text formats to clipboard
                            navigator.clipboard.write([
                                new ClipboardItem({
                                    'text/html': new Blob([tableHTML], { type: 'text/html' }),
                                    'text/plain': new Blob([tableText], { type: 'text/plain' })
                                })
                            ])
                                .then(() => {
                                    HelperFunctions.showInlineCopyAlert(copyTableIcon);
                                })
                                .catch(() => {
                                    // Fallback to plain text if HTML copying fails
                                    navigator.clipboard.writeText(tableText)
                                        .then(() => {
                                            HelperFunctions.showInlineCopyAlert(copyTableIcon);
                                        })
                                        .catch(err => {
                                            console.error('Failed to copy table: ', err);
                                        });
                                });
                        });

                        warningText.appendChild(copyTableIcon);
                        tableContainer.appendChild(warningText);

                        // Create a container with horizontal scroll for the table
                        const tableScrollContainer = document.createElement('div');
                        tableScrollContainer.style.overflowX = 'auto';
                        tableScrollContainer.style.maxWidth = '100%';
                        tableScrollContainer.style.maxHeight = '500px'; // Add vertical scroll if too tall
                        tableScrollContainer.style.overflowY = 'auto';

                        // Create table for duplicates
                        const table = document.createElement('table');
                        table.className = 'table table-bordered table-striped';

                        const thead = document.createElement('thead');
                        const headerRow = document.createElement('tr');

                        // Create header cells
                        desiredHeaders.forEach(header => {
                            const th = document.createElement('th');
                            th.textContent = header;
                            th.style.whiteSpace = 'nowrap'; // Prevent header text wrapping
                            headerRow.appendChild(th);
                        });

                        thead.appendChild(headerRow);
                        table.appendChild(thead);

                        // Add table body with data
                        const tbody = document.createElement('tbody');
                        duplicates.forEach(row => {
                            const tr = document.createElement('tr');

                            desiredHeaders.forEach(header => {
                                const td = document.createElement('td');

                                // Make V-Number and Email cells nowrap
                                if (header === 'VNo.' || header === 'Email Id') {
                                    td.style.whiteSpace = 'nowrap';
                                }

                                // Check if we need to map the header name
                                let dataHeader = header;
                                for (const [key, value] of Object.entries(headerMappings)) {
                                    if (value === header && row[key] !== undefined) {
                                        dataHeader = key;
                                        break;
                                    }
                                }

                                // Special handling for VNo field
                                if (header === 'VNo.' || header === 'V-number') {
                                    const vNum = row[dataHeader] || row['VNo.'] || row['V-number'] || '';
                                    if (vNum) {
                                        // Add copy icon for V-Number
                                        HelperFunctions.addCopyIconToElement(td, vNum, {
                                            position: 'append',
                                            style: { marginRight: '5px' }
                                        });

                                        const a = document.createElement('a');
                                        // Remove quotes from the search parameter
                                        a.href = `${window.location.pathname}?keywordLists=${vNum}`;
                                        a.textContent = vNum;
                                        td.appendChild(a);
                                    }
                                }
                                // Special handling for Email field
                                else if (header === 'Email Id') {
                                    const email = row[dataHeader] || '';
                                    if (email) {
                                        // Add copy icon for Email
                                        HelperFunctions.addCopyIconToElement(td, email, {
                                            position: 'append',
                                            style: { marginRight: '5px' }
                                        });
                                        td.appendChild(document.createTextNode(email));
                                    } else {
                                        td.textContent = '';
                                    }
                                }
                                // Special handling for Campus Status field
                                else if (header === 'Campus Status') {
                                    td.textContent = row[dataHeader] || 'Not-Start';
                                }
                                else {
                                    td.textContent = row[dataHeader] || '';
                                }

                                tr.appendChild(td);
                            });

                            tbody.appendChild(tr);
                        });

                        table.appendChild(tbody);
                        tableScrollContainer.appendChild(table);
                        tableContainer.appendChild(tableScrollContainer);

                        // Insert warning table after the alert container but before the main table
                        tableParent.insertBefore(tableContainer, tableResponsive);
                    }

                    // STEP 2: Perform Launch checks
                    // Process in batches to avoid overwhelming the browser
                    const newCachedResults = {};

                    // First, identify records that need processing (not in cache)
                    const recordsToProcess = [];
                    let cachedRecordCount = 0;

                    for (let i = 0; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        const vNumber = row['V-number'] || '';
                        const email = HelperFunctions.extractEmailFromRow(row);

                        if (!email) {
                            ErrorHandler.showAlert(`Email address not found for ${vNumber || 'Unknown V-Number'}`);
                            continue;
                        }

                        // Validate V-number format before processing
                        if (vNumber) {
                            // Convert to string and check if it's a valid V-number format
                            const vNumberStr = String(vNumber).trim();
                            if (vNumberStr && vNumberStr.length >= 2 && /^V[TBN]/i.test(vNumberStr)) {
                                // Extract prefix (T, B, or N) - safe substring operation
                                const prefix = vNumberStr.charAt(1);

                                // Skip if not a valid V number format
                                if (!['T', 'B', 'N', 't', 'b', 'n'].includes(prefix)) {
                                    console.log(`Skipping invalid V-number format: ${vNumberStr}`);
                                    continue;
                                }
                            } else {
                                console.log(`Skipping invalid V-number: ${vNumber}`);
                                continue;
                            }
                        }

                        // Normalize email before using as cache key
                        const normalizedEmail = email.toLowerCase().trim();
                        const cacheKey = vNumber ?
                            `${String(vNumber).toLowerCase()}_${normalizedEmail}` :
                            normalizedEmail;

                        // Check if this is in cache
                        const cachedResult = await CacheManager.getLaunchResult(cacheKey) ||
                            (!vNumber && await CacheManager.getLaunchResult(normalizedEmail));

                        if (cachedResult) {
                            cachedRecordCount++;
                        } else {
                            recordsToProcess.push(row);
                        }
                    }

                    // Update loading message to show progress
                    HelperFunctions.setButtonLoadingState(launchLoadingDiv, true, 'fa-spinner', 0, 'Processing Launch checks: 0/' +
                        recordsToProcess.length + ' (' + cachedRecordCount + ' from cache)');

                    // Process in batches to avoid overwhelming the browser - only for non-cached records
                    let processedCount = 0;
                    const batchSize = 50;

                    for (let i = 0; i < recordsToProcess.length; i += batchSize) {
                        const batch = recordsToProcess.slice(i, i + batchSize);

                        await Promise.all(batch.map(async (row) => {
                            const vNumber = row['V-number'] || '';
                            const email = HelperFunctions.extractEmailFromRow(row);

                            try {
                                const response = await DataService.launchCheck(email, vNumber);

                                // Check for login error in rawResponse
                                if (response.rawResponse && response.rawResponse.loginError) {
                                    // ErrorHandler ile alert göster
                                    if (typeof ErrorHandler !== 'undefined' && ErrorHandler.showAlert) {
                                        ErrorHandler.showAlert('Launch login failed. Please check and update your Launch credentials in extension settings.', 'error');
                                    }
                                } else if (!response.rawResponse) {
                                    // ErrorHandler ile alert göster
                                    if (typeof ErrorHandler !== 'undefined' && ErrorHandler.showAlert) {
                                        ErrorHandler.showAlert(response?.error || 'Please check and update your Launch credentials in extension settings.', 'error');
                                    }
                                }

                                // Store in cache
                                if (response && response.success !== false) {
                                    response.checkDate = new Date().toLocaleString();
                                    await CacheManager.updateLaunchCache(email, vNumber, response);
                                }

                                processedCount++;

                                // Update progress every 5 records
                                if (processedCount % 5 === 0) {
                                    HelperFunctions.setButtonLoadingState(launchLoadingDiv, true, 'fa-spinner', 0,
                                        `Processing Launch checks: ${processedCount}/${recordsToProcess.length} (${cachedRecordCount} from cache)`);
                                }
                            } catch (error) {
                                if (typeof ErrorHandler !== 'undefined' && ErrorHandler.showAlert) {
                                    ErrorHandler.showAlert(response?.error || 'Please check and update your Launch credentials in extension settings.', 'error');
                                }
                            }
                        }));
                    }

                    // Update UI after processing
                    if (Object.keys(newCachedResults).length > 0) {
                        UIManager.updateAcmeListButtons();
                    }

                    // Show completion message
                    launchLoadingDiv.className = 'alert alert-success';
                    if (processedCount > 0) {
                        launchLoadingDiv.innerHTML = `<i class="fas fa-check-circle"></i> Launch check complete. Processed ${processedCount} new records (${cachedRecordCount} were already cached).`;
                    } else {
                        launchLoadingDiv.innerHTML = `<i class="fas fa-info-circle"></i> Launch check complete. All records already cached.`;
                    }

                    // Remove the message after 7 seconds
                    setTimeout(() => {
                        if (launchLoadingDiv.parentNode) {
                            launchLoadingDiv.parentNode.removeChild(launchLoadingDiv);
                        }
                    }, 7000);

                } catch (error) {
                    console.error('Error processing Excel data:', error);
                    loadingDiv.className = 'alert alert-danger';
                    loadingDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error during data processing: ' + error.message;
                }
            } catch (error) {
                console.error('Error performing data processing:', error);

                // Show error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'alert alert-danger';
                errorDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error downloading data: ' + error.message;

                const tableResponsive = document.querySelector('.table-responsive.secondaryContainer');
                if (tableResponsive) {
                    // Always insert error message above the table
                    tableResponsive.parentNode.insertBefore(errorDiv, tableResponsive);
                }
            }
        })();
    }

    static addButtonsToAcmeList() {
        return HelperFunctions.urlCheck([CONFIG.ACMELISTS_URL], async function () {
            const hasSuperAdminAccess = !!document.querySelector('a[href*="/profile/alluList.php"]') || !!document.querySelector('a[href*="getPage=Pending_Sign"]');
            const thElements = HelperFunctions.evaluateXPath(
                "//table/thead/tr/th",
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
            );

            let emailColumnIndex = 5;
            for (let i = 0; i < thElements.snapshotLength; i++) {
                const th = thElements.snapshotItem(i);
                if (th && th.textContent && th.textContent.toLowerCase().includes('email')) {
                    emailColumnIndex = i + 1;
                    break;
                }
            }

            // Get cached results at the beginning for efficiency
            const cachedVerifastResults = await CacheManager.getAllVerifastResults();
            const cachedLaunchResults = await CacheManager.getAllLaunchResults();

            const emailTdElements = HelperFunctions.evaluateXPath(
                `//table/tbody/tr/td[${emailColumnIndex}]`,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE
            );

            if (emailTdElements) {
                for (let i = 0; i < emailTdElements.snapshotLength; i++) {
                    const td = emailTdElements.snapshotItem(i);
                    let emailText;

                    const cfEmailElement = td.querySelector('[data-cfemail]');
                    if (cfEmailElement && cfEmailElement.dataset.cfemail) {
                        emailText = HelperFunctions.decodeCfEmail(cfEmailElement.dataset.cfemail);
                        // Clear encrypted content - optional, you can remove the comment line as needed
                        // td.innerHTML = '';
                    } else {
                        emailText = td.textContent.trim();
                    }
                    if (emailText.includes('@') &&
                        emailText.indexOf('@') < emailText.lastIndexOf('.') &&
                        !emailText.endsWith(CONFIG.EMAIL_DOMAIN)) {

                        try {
                            // Create the Verifast button
                            const verifastButton = UIManager.createIconButton(
                                'fa-id-card',
                                'Check Verifast',
                                'btn-verifast mb-1'
                            );

                            // Create the Launch check button
                            const launchCheckButton = UIManager.createIconButton(
                                'fa-paper-plane',
                                'Check Launch',
                                'btn-launch',
                                {
                                    width: '30px',
                                    height: '30px',
                                    marginBottom: 'var(--space-xs)',
                                }
                            );

                            // Get vNumber from the table row
                            const row = td.closest('tr');
                            const vNumber = row?.querySelector(`td:nth-child(${emailColumnIndex - 1})`)?.childNodes[1]?.textContent?.trim() || '';
                            const emailTrimmed = emailText.toLowerCase().trim();
                            const cacheKeyVerifast = vNumber ? `${vNumber.toLowerCase()}_${emailTrimmed}` : emailTrimmed;
                            const cacheKeyLaunch = vNumber ? `${vNumber.toLowerCase()}_${emailTrimmed}` : emailTrimmed;

                            // Check for cached Verifast results and update button if found
                            // Check for cached Verifast results and update button if found
                            if (cachedVerifastResults[cacheKeyVerifast] ||
                                (!vNumber && cachedVerifastResults[emailTrimmed] &&
                                    cachedVerifastResults[emailTrimmed].data &&
                                    cachedVerifastResults[emailTrimmed].data.verifastStatus === 'ID Verified')) {
                                const cachedData = cachedVerifastResults[cacheKeyVerifast] || cachedVerifastResults[emailTrimmed];
                                // Access the checkDate from the nested data property
                                const verifiedDate = (cachedData && cachedData.data && cachedData.data.checkDate)
                                    ? cachedData.data.checkDate
                                    : 'Unknown date';

                                const tooltip = UIManager.createTooltip(`ID Verified (cached: ${verifiedDate})`, {
                                    top: '0'
                                });
                                verifastButton.innerHTML = '<i class="fas fa-check" style="color:green"></i>';
                                verifastButton.appendChild(tooltip);
                            }

                            // Check for cached Launch results and update button if found
                            if (cachedLaunchResults[cacheKeyLaunch] ||
                                (!vNumber && cachedLaunchResults[emailTrimmed])) {
                                const cachedResult = cachedLaunchResults[cacheKeyLaunch] || cachedLaunchResults[emailTrimmed];
                                // Access the checkDate from the nested data property
                                const checkDate = (cachedResult && cachedResult.data && cachedResult.data.checkDate)
                                    ? cachedResult.data.checkDate
                                    : 'Unknown date';

                                const tooltip = UIManager.createTooltip(`Launch Records Verified (cached: ${checkDate})`, {
                                    top: '0'
                                });
                                launchCheckButton.innerHTML = '<i class="fas fa-check" style="color:green"></i>';
                                launchCheckButton.appendChild(tooltip);
                            }

                            // Add Verifast click event
                            verifastButton.addEventListener('click', async function () {
                                const row = this.closest('tr');
                                if (row) {
                                    const vNumber = row.querySelector(`td:nth-child(${emailColumnIndex - 1})`)
                                        .childNodes[1]
                                        .textContent
                                        .trim();

                                    const studentMail = row.querySelector(`td:nth-child(${emailColumnIndex})`)
                                        .childNodes[2]
                                        .textContent
                                        .trim();

                                    HelperFunctions.setButtonLoadingState(this, true, 'fa-id-card', 0);

                                    // Use centralized verifastCheck function
                                    const response = await DataService.verifastCheck(studentMail, vNumber);

                                    if (response && response.success) {
                                        // Status check and button update - NEW LOGIC
                                        switch (response.verifastStatus) {
                                            case 'ID Verified':
                                                this.innerHTML = '<i class="fas fa-check" style="color:green"></i>';
                                                const tooltip1 = UIManager.createTooltip(`ID Verified (${response.verifiedDate})`, { top: '0' });
                                                this.appendChild(tooltip1);
                                                break;

                                            case 'ID Not Verified':
                                                this.innerHTML = '<i class="fas fa-times" style="color:red"></i>';
                                                const tooltip2 = UIManager.createTooltip(`ID Not Verified (${response.verifiedDate})`, { top: '0' });
                                                this.appendChild(tooltip2);
                                                break;

                                            case 'Rejected (ID Connected)':
                                                this.innerHTML = '<i class="fas fa-ban" style="color:red"></i>';
                                                const tooltip3 = UIManager.createTooltip(`Rejected (ID Connected) (${response.verifiedDate})`, { top: '0' });
                                                this.appendChild(tooltip3);
                                                break;

                                            case 'Requires Review (ID Connected)':
                                                this.innerHTML = '<i class="fas fa-clock" style="color:ornage"></i>';
                                                const tooltip4 = UIManager.createTooltip(`Requires Review (ID Connected) (${response.verifiedDate})`, { top: '0' });
                                                this.appendChild(tooltip4);
                                                break;

                                            case 'Student Not Found':
                                                this.innerHTML = '<i class="fas fa-question" style="color:gray"></i>';
                                                const tooltip5 = UIManager.createTooltip('Student Not Found', { top: '0' });
                                                this.appendChild(tooltip5);
                                                break;

                                            default:
                                                this.innerHTML = '<i class="fas fa-times" style="color:red"></i>';
                                                const tooltip6 = UIManager.createTooltip('ID Not Verified', { top: '0' });
                                                this.appendChild(tooltip6);
                                        }
                                    } else if (response && !response.success && response.error) {
                                        // API error
                                        this.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:red"></i>';
                                        const tooltip7 = UIManager.createTooltip(`Error: ${response.error}`, { top: '0' });
                                        this.appendChild(tooltip7);
                                    } else {
                                        // Unknown status
                                        this.innerHTML = '<i class="fas fa-times" style="color:red"></i>';
                                        const tooltip8 = UIManager.createTooltip('ID Not Verified', { top: '0' });
                                        this.appendChild(tooltip8);
                                    }

                                    this.disabled = false;
                                    this.classList.remove('disabled');
                                }
                            });

                            // Add Launch check click event
                            launchCheckButton.addEventListener('click', async function () {
                                const row = this.closest('tr');
                                if (row) {
                                    const existingResultDiv = this.parentNode.querySelector('div[style*="margin-top: -25px"]');
                                    if (existingResultDiv) {
                                        existingResultDiv.remove();
                                    }
                                    const studentMail = row.querySelector(`td:nth-child(${emailColumnIndex})`)
                                        .childNodes[2]
                                        .textContent
                                        .trim();

                                    const vNumber = row.querySelector(`td:nth-child(${emailColumnIndex - 1})`)
                                        .childNodes[1]
                                        .textContent
                                        .trim();

                                    HelperFunctions.setButtonLoadingState(this, true, 'fa-paper-plane', 0);

                                    // Use centralized launchCheck function
                                    const response = await DataService.launchCheck(studentMail);
                                    const studentList = response.students;

                                    if (!response || !response.success && studentList.length > 0) {
                                        if (typeof ErrorHandler !== 'undefined' && ErrorHandler.showAlert) {
                                            ErrorHandler.showAlert(response?.error || 'Launch check failed. Please check and update your Launch credentials in extension settings.', 'error');
                                        }
                                    }


                                    const tooltipText = studentList && studentList.length > 0
                                        ? `${studentList.length} Record${studentList.length > 1 ? 's' : ''} Found`
                                        : 'Student Not Found';

                                    const existingTooltip = this.querySelector('.tooltiptext');
                                    if (existingTooltip) {
                                        existingTooltip.remove();
                                    }

                                    const tooltip = UIManager.createTooltip(tooltipText, {
                                        top: '0'
                                    });

                                    this.innerHTML = studentList && studentList.length > 0
                                        ? '<i class="fas fa-check" style="color:green"></i>'
                                        : '<i class="fas fa-exclamation" style="color:red"></i>';

                                    this.appendChild(tooltip);

                                    if (studentList && studentList.length > 0) {
                                        const resultDiv = document.createElement('div');
                                        resultDiv.style.marginTop = '-25px';
                                        resultDiv.style.marginLeft = '35px';

                                        studentList.forEach(student => {
                                            const studentDiv = document.createElement('div');
                                            studentDiv.style.display = 'flex';
                                            studentDiv.style.alignItems = 'center';
                                            studentDiv.style.justifyContent = 'flex-start';

                                            const launchBtn = UIManager.createIconButton(
                                                'fa-paper-plane',
                                                'Open Launch Portal',
                                                'btn-launch mb-1',
                                                {
                                                    width: '23px',
                                                    height: '23px'
                                                }
                                            );

                                            launchBtn.addEventListener('click', async function () {
                                                HelperFunctions.setButtonLoadingState(this, true);

                                                await HelperFunctions.sendMessage('launchUserDetails', {
                                                    student: student,
                                                    vNumber: student.code
                                                });

                                                HelperFunctions.setButtonLoadingState(this, false, 'fa-paper-plane');
                                            });

                                            const dateSpan = document.createElement('span');
                                            dateSpan.style.margin = '0 5px';
                                            const registryDate = new Date(student.registryDate);
                                            const oneYearAgo = new Date();
                                            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                                            dateSpan.className = registryDate < oneYearAgo ? 'text-danger' : 'text-success';
                                            dateSpan.innerHTML = `<b>${student.registryDate}</b>`;

                                            const campusSpan = document.createElement('span');
                                            campusSpan.style.margin = '0';
                                            let isValid = false;
                                            if (vNumber) {
                                                const prefix = vNumber.substring(1, 2);
                                                const campus = student.school || '';

                                                if (prefix === 'T' && campus.includes('Bay/Queen')) {
                                                    isValid = true;
                                                } else if (prefix === 'B' && campus.includes('Brampton East')) {
                                                    isValid = true;
                                                } else if (prefix === 'N' && campus.includes('North York - Yonge')) {
                                                    isValid = true;
                                                }
                                            }

                                            campusSpan.className = isValid ? 'text-success' : 'text-danger';
                                            campusSpan.innerHTML = `<b>${student.school || 'Unknown'}</b>`;

                                            const studentSpan = document.createElement('span');
                                            studentSpan.style.margin = '0 5px';

                                            const containsVNumber = student.username && student.username.includes(vNumber);
                                            studentSpan.className = containsVNumber ? 'text-success' : 'text-danger';
                                            studentSpan.innerHTML = `<b>${student.username || 'Unknown'}</b>`;

                                            studentDiv.appendChild(launchBtn);
                                            studentDiv.appendChild(dateSpan);
                                            studentDiv.appendChild(studentSpan);
                                            studentDiv.appendChild(campusSpan);
                                            resultDiv.appendChild(studentDiv);
                                        });

                                        this.parentNode.insertBefore(resultDiv, this.nextSibling);
                                    }
                                    this.disabled = false;
                                    this.classList.remove('disabled');
                                }
                            });

                            const verifyContractButton = UIManager.createIconButton(
                                'fa-list-check',
                                'Verify Contract Data',
                                'btn-contract',
                                {
                                    width: '30px',
                                    height: '30px',
                                }
                            );

                            verifyContractButton.addEventListener('click', async function () {
                                const row = this.closest('tr');
                                if (row) {
                                    const data_id = row.querySelector(`td:nth-child(${HelperFunctions.getColumnIndex(thElements, 'Action')}) > span`).getAttribute('data-id');
                                    const studentMail = row.querySelector(`td:nth-child(${emailColumnIndex})`)
                                        .childNodes[2]
                                        .textContent
                                        .trim();

                                    const contractStatus = row.querySelector(`td:nth-child(${HelperFunctions.getColumnIndex(thElements, 'Campus Status')})`).textContent.trim();
                                    if (contractStatus === 'Void') {
                                        ErrorHandler.showAlert('Contract is pending. Please wait for it to be verified.');
                                        return;
                                    }

                                    HelperFunctions.setButtonLoadingState(this, true, 'fa-check', 0);

                                    const epData = {
                                        programName: row.querySelector(`td:nth-child(${HelperFunctions.getColumnIndex(thElements, 'Program')})`).textContent.trim(),
                                        campus: row.querySelector(`td:nth-child(${HelperFunctions.getColumnIndex(thElements, 'Campus')})`).textContent.trim(),
                                        studentName: row.querySelector(`td:nth-child(${HelperFunctions.getColumnIndex(thElements, 'Name')})`).textContent.trim(),
                                        vNumber: row.querySelector(`td:nth-child(${HelperFunctions.getColumnIndex(thElements, 'VNo')})`).textContent.trim(),
                                        mobileNumber: row.querySelector(`td:nth-child(${HelperFunctions.getColumnIndex(thElements, 'Mobile No')})`).textContent.trim(),
                                        startDate: row.querySelector(`td:nth-child(${HelperFunctions.getColumnIndex(thElements, 'Start/Finish')}) > div`).textContent.trim(),
                                        endDate: row.querySelector(`td:nth-child(${HelperFunctions.getColumnIndex(thElements, 'Start/Finish')}) > div:nth-of-type(2)`).textContent.trim(),
                                        has_CPL: row.querySelector(`td:nth-child(${HelperFunctions.getColumnIndex(thElements, 'CPL')})`).textContent.trim() == "Yes",
                                        fundingSource: row.querySelector(`td:nth-child(${HelperFunctions.getColumnIndex(thElements, 'Funding Source')})`).textContent.trim(),
                                    };
                                    console.log('EP Data:', epData);

                                    chrome.runtime.sendMessage({
                                        action: 'verifyContract',
                                        data: { email: studentMail, campus: epData.campus, vNumber: epData.vNumber }
                                    }, async (response) => {
                                        console.log('Contract verification response:', response);

                                        let isValid = false, errorMessages = [];
                                        if (response.success) {
                                            const data = {
                                                launchData: response,
                                                epData
                                            }

                                            const launchCheck = ValidationHelper.verifyContractData(data);
                                            console.log('LaunchCheck', launchCheck);

                                            if (launchCheck.success) {
                                                isValid = true;

                                                const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };

                                                const startDate = (new Date(epData.startDate + 'T00:00:00')).toLocaleDateString('en-US', dateOptions);
                                                const endDate = (new Date(epData.endDate + 'T00:00:00')).toLocaleDateString('en-US', dateOptions);
                                                const fundingSourceId = fundingSourceMap[epData.fundingSource === 'Third Party Funded' ? epData.fundingOther : epData.fundingSource];

                                                console.log(startDate, endDate);

                                                const newData = {
                                                    vNumber: epData.vNumber,
                                                    startDate,
                                                    endDate,
                                                    fundingSourceId
                                                }

                                                const updateResponse = await chrome.runtime.sendMessage({
                                                    action: 'updateLaunchData',
                                                    data: { launchData: response.data, newData }
                                                });

                                                console.log('Update Response', updateResponse);
                                                let tooltipText = 'Data Match';
                                                if (updateResponse.success) {
                                                    tooltipText += '; Updated Launch Data!';
                                                    await DataService.addContractRemarks(data_id, 'Yes', ' ');
                                                    this.innerHTML = '<i class="fas fa-check-circle" style="color:green"></i>';
                                                } else {
                                                    tooltipText += '; Failed to update!';
                                                    isValid = false;
                                                    errorMessages.push(updateResponse.error);
                                                }

                                                const tooltip = UIManager.createTooltip(tooltipText, {
                                                    top: '0'
                                                });

                                                this.appendChild(tooltip);
                                            } else {
                                                isValid = false;
                                                errorMessages.push(launchCheck.error);
                                            }
                                        } else {
                                            isValid = false;
                                            errorMessages.push(response.error);
                                        }
                                        if (!response.success || !isValid) {
                                            this.innerHTML = '<i class="fas fa-exclamation" style="color:red"></i>';

                                            const tooltipText = errorMessages.join('\n');
                                            const tooltip = UIManager.createTooltip(tooltipText, {
                                                top: '0'
                                            });

                                            this.appendChild(tooltip);
                                            if (!errorMessages.includes('Student not found')) DataService.addContractRemarks(data_id, 'No', tooltipText);
                                        }
                                    })

                                    this.disabled = false;
                                    this.classList.remove('disabled');
                                }
                            });

                            td.textContent = '';
                            td.appendChild(verifastButton);
                            HelperFunctions.addCopyIconToElement(td, emailText, {
                                position: 'append',
                                style: { marginRight: '5px', marginTop: '4px' }
                            });
                            td.appendChild(document.createTextNode(emailText));
                            td.appendChild(launchCheckButton);
                            if (hasSuperAdminAccess) td.appendChild(verifyContractButton);
                        } catch (error) {
                            console.error('Error: ', error);
                        }
                    }

                    td.style.wordBreak = 'break-all';
                    td.classList.add('text-nowrap');
                }
            }

            const phoneElements = HelperFunctions.evaluateXPath(
                `//table/tbody/tr/td[${emailColumnIndex + 1}]`,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE
            );

            if (phoneElements) {
                for (let i = 0; i < phoneElements.snapshotLength; i++) {
                    const element = phoneElements.snapshotItem(i);
                    element.classList.add('text-nowrap');

                    let phoneText = element.textContent.trim();
                    phoneText = phoneText.replace(/\D/g, '');
                    phoneText = phoneText.slice(-10);

                    if (phoneText.length === 10) {
                        const formattedPhone = `(${phoneText.slice(0, 3)}) ${phoneText.slice(3, 6)}-${phoneText.slice(6)}`;
                        element.textContent = formattedPhone;
                        HelperFunctions.addCopyIconToElement(element, formattedPhone, {
                            position: 'prepend',
                            style: { marginRight: '5px' }
                        });
                    }
                }
            }
        })();
    }

    static addAccountsStudentListButtons() {
        return HelperFunctions.urlCheck([CONFIG.ACCOUNTS_STUDENT_LIST], function () {
            const downloadButton = document.querySelector('button[name="studentlist"]');
            if (!downloadButton || downloadButton.dataset.bulkVerifastAdded) return;

            downloadButton.style.marginTop = 0;

            const sendPaymentEmailsButton = document.createElement('button');
            sendPaymentEmailsButton.type = 'button';
            sendPaymentEmailsButton.className = 'btn btn-sm btn-primary float-sm-right';
            sendPaymentEmailsButton.innerHTML = '<i class="fa fa-envelope"></i> Send Payment Emails';

            downloadButton.parentNode.parentNode.appendChild(sendPaymentEmailsButton);

            sendPaymentEmailsButton.addEventListener('click', UIManager.showFileUploadModal);

        })();
    }

    static async addBulkCheckButtons() {
        return HelperFunctions.urlCheck([CONFIG.ACMELISTS_URL], function () {
            const downloadButton = document.querySelector('button[name="studentlist"]');
            if (!downloadButton || downloadButton.dataset.bulkVerifastAdded) return;

            downloadButton.style.marginTop = 0;

            const bulkVerifastButton = document.createElement('button');
            bulkVerifastButton.type = 'button';
            bulkVerifastButton.className = 'btn btn-sm btn-primary float-sm-right mr-2 verifastCheckButton';
            bulkVerifastButton.innerHTML = '<i class="fa fa-id-card"></i> Check Verifast';

            const hasSuperAdminAccess = !!document.querySelector('a[href*="/profile/alluList.php"]') || !!document.querySelector('a[href*="getPage=Pending_Sign"]');

            const bulkVerifyContractButton = document.createElement('button');
            bulkVerifyContractButton.type = 'button';
            bulkVerifyContractButton.className = 'btn btn-sm btn-primary float-sm-right verifyContractButton';
            bulkVerifyContractButton.innerHTML = '<i class="fa-solid fa-list-check"></i> Verify Contracts';

            const bulkClearCacheButton = document.createElement('button');
            bulkClearCacheButton.type = 'button';
            bulkClearCacheButton.className = 'btn btn-sm btn-warning float-sm-right mr-2';
            bulkClearCacheButton.style.marginLeft = '10px';
            bulkClearCacheButton.innerHTML = '<i class="fas fa-trash-alt"></i> Clear Cache';

            bulkClearCacheButton.addEventListener('click', async function () {
                if (confirm('Are you sure you want to clear the Verifast and Launch caches?')) {
                    try {
                        HelperFunctions.setButtonLoadingState(this, true, 'fa-trash-alt', 0, 'Clearing...');

                        // Clear both caches
                        await CacheManager.clearCache(CacheManager.STORES.VERIFAST);
                        await CacheManager.clearCache(CacheManager.STORES.LAUNCH);

                        HelperFunctions.setButtonLoadingState(this, false, 'fa-check', 2000, 'Cleared');
                        setTimeout(() => {
                            HelperFunctions.setButtonLoadingState(this, false, 'fa-trash-alt', 0, 'Clear Cache');
                        }, 2000);
                    } catch (error) {
                        console.error('Error clearing caches:', error);
                        HelperFunctions.setButtonLoadingState(this, false, 'fa-exclamation-triangle', 2000, 'Error');
                        setTimeout(() => {
                            HelperFunctions.setButtonLoadingState(this, false, 'fa-trash-alt', 0, 'Clear Cache');
                        }, 2000);
                    }
                }
            });

            downloadButton.parentNode.appendChild(bulkClearCacheButton, downloadButton);
            if (hasSuperAdminAccess) downloadButton.parentNode.appendChild(bulkVerifyContractButton, downloadButton);
            downloadButton.parentNode.appendChild(bulkVerifastButton, downloadButton);

            let isProcessing = false;
            let shouldStop = false;
            let pendingRequestCount = 0;
            let processingPromise = null;

            const beforeUnloadHandler = (e) => {
                if (isProcessing) {
                    e.preventDefault();
                    e.returnValue = 'Verifast check is in progress. Are you sure you want to leave this page?';
                    return e.returnValue;
                }
            };

            [bulkVerifastButton, bulkVerifyContractButton].forEach(button => {
                button.addEventListener('click', async function () {
                    if (isProcessing) {
                        shouldStop = true;
                        this.disabled = true;
                        this.innerHTML = '<i class="fas fa-spinner enhancer-spinner"></i> Stopping... ' +
                            `<span style="margin-left:5px;">Waiting for ${pendingRequestCount} pending requests</span>`;

                        chrome.runtime.sendMessage({ action: 'stopVerifastChecks' });

                        if (processingPromise) {
                            await processingPromise;
                        }

                        return;
                    }

                    shouldStop = false;
                    isProcessing = true;
                    pendingRequestCount = 0;
                    window.addEventListener('beforeunload', beforeUnloadHandler);
                    const verifyContractButtonClicked = this.className.includes('verifyContractButton');
                    const linkElements = document.querySelectorAll("body > div.s01.mb-5 > div > div > div > div > div > div > div.row > div.col-md-4.mt-2 > nav > ul > li")
                    const numOfPages = linkElements.length - 1;
                    const studentDataIds = {};

                    this.disabled = false;
                    const originalContent = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-spinner enhancer-spinner"></i> Getting student list...';

                    const urlParams = HelperFunctions.getUrlParamsWithDefaults({
                        keywordLists: '',
                        startFilter: '',
                        statusFilter: '',
                        ilpIlsFilter: ''
                    });

                    processingPromise = (async () => {
                        try {
                            const blob = await DataService.getStudentListExcel(urlParams);

                            try {
                                if (shouldStop) {
                                    return;
                                }

                                // Use the new helper function
                                const jsonData = await HelperFunctions.processExcelBlob(blob, ['Start Date', 'Finish date', 'Signature Date']);

                                const resultsMap = new Map();

                                const cachedVerifastResults = await CacheManager.getAllVerifastResults();
                                const cachedLaunchResults = await CacheManager.getAllLaunchResults();

                                const emails = [];
                                for (let i = 0; i < jsonData.length; i++) {
                                    if (shouldStop) break;

                                    const row = jsonData[i];

                                    if (row['Campus Status'] === 'Void') {
                                        ErrorHandler.showAlert(`Bulk check skipped for ${row['V-number'] || 'Unknown V-Number'}: Contract is void`);
                                        continue;
                                    }

                                    const vNumber = String(row['V-number'] || ''); // Define vNumber first
                                    let email = HelperFunctions.extractEmailFromRow(row);

                                    if (!email) {
                                        ErrorHandler.showAlert(`Bulk check skipped for ${vNumber || 'Unknown V-Number'}: Email address not found`);
                                        continue; // Skip this record and continue with the next one
                                    }

                                    if (email !== undefined && email !== null) {
                                        email = String(email).trim();
                                        if (email.includes('@') && !email.endsWith('@aolcc.ca')) {
                                            let formattedStartDate = row['Start Date'], formattedEndDate = row['Finish date'];
                                            if (typeof formattedStartDate === 'number') {
                                                const date = HelperFunctions.convertExcelDate(formattedStartDate);
                                                formattedStartDate = date.toISOString().split('T')[0];
                                            }
                                            if (typeof formattedEndDate === 'number') {
                                                const date = HelperFunctions.convertExcelDate(formattedEndDate);
                                                formattedEndDate = date.toISOString().split('T')[0];
                                            }
                                            const vNumber = String(jsonData[i]['V-number'] || '');

                                            // Normalize email and create cache key
                                            const normalizedEmail = email.toLowerCase().trim();
                                            const cacheKey = vNumber ?
                                                `${String(vNumber).toLowerCase()}_${normalizedEmail}` :
                                                normalizedEmail;

                                            // Check both potential cache key formats for backward compatibility
                                            const hasCache = cachedVerifastResults[cacheKey] ||
                                                (!vNumber && cachedVerifastResults[normalizedEmail]);

                                            const cachedData = cachedVerifastResults[cacheKey] ||
                                                (!vNumber && cachedVerifastResults[normalizedEmail]);

                                            // Get the correct data structure from the cache result
                                            const cachedDataObject = cachedData && cachedData.data ? cachedData.data : cachedData;

                                            emails.push({
                                                email: email,
                                                firstName: jsonData[i]['First Name'] || '',
                                                lastName: jsonData[i]['Last Name'] || '',
                                                vNumber: vNumber,
                                                cacheKey: cacheKey,
                                                program: jsonData[i]['Program Name'],
                                                CPL: jsonData[i]['CPL'],
                                                startDate: formattedStartDate,
                                                endDate: formattedEndDate,
                                                fundingSource: jsonData[i]['Funding Source'],
                                                fundingOther: jsonData[i]['Funding Other'],
                                                sentEmailtoStudent: jsonData[i]['Sent Email to Student'],
                                                signedByStudent: jsonData[i]['Signed By Student'],
                                                signedByContractManager: jsonData[i]['Signed By Contract Manager'],
                                                signatureDate: jsonData[i]['Signature Date'],
                                                campus: jsonData[i]['Campus'],
                                                caseWorker: jsonData[i]['Case Worker Name'],
                                                useCache: hasCache,
                                                cachedData: cachedDataObject // Store the correct nested data
                                            });
                                        }
                                    }
                                }

                                if (shouldStop) {
                                    return;
                                }

                                const emailsToProcess = emails.filter(student => !student.useCache);
                                const cachedEmails = emails.filter(student => student.useCache);

                                if (!verifyContractButtonClicked) {
                                    cachedEmails.forEach(student => {
                                        const normalizedEmail = student.email.toLowerCase().trim();
                                        const cacheKey = student.vNumber ?
                                            `${String(student.vNumber).toLowerCase()}_${normalizedEmail}` :
                                            normalizedEmail;

                                        // Check if there's a matching entry in cachedLaunchResults
                                        const hasLaunchEntry = cachedLaunchResults[cacheKey] ||
                                            (!student.vNumber && cachedLaunchResults[normalizedEmail]);

                                        // FIX: Properly access the nested data structure
                                        const cachedDataObject = student.cachedData && student.cachedData.data ? student.cachedData.data : student.cachedData;

                                        resultsMap.set(student.email, {
                                            'Program Name': student.program,
                                            'First Name': student.firstName,
                                            'Last Name': student.lastName,
                                            'V-Number': student.vNumber,
                                            'Email Address': student.email,
                                            'Campus': student.campus,
                                            'Start Date': student.startDate,
                                            'CPL': student.CPL,
                                            'Funding Source': student.fundingSource,
                                            'Funding Other': student.fundingOther,
                                            'Verifast Status': cachedDataObject ? cachedDataObject.verifastStatus : 'Unknown',
                                            'Verified Date': cachedDataObject ? cachedDataObject.verifiedDate : '',
                                            'Launch Status': hasLaunchEntry ? 'Yes' : 'No', // Add Launch Status column
                                            'Sent Email to Student': student.sentEmailtoStudent,
                                            'Signed By Student': student.signedByStudent,
                                            'Signed By Contract Manager': student.signedByContractManager,
                                            'Signature Date': student.signatureDate,
                                            'Case Worker Name': student.caseWorker,
                                            'Check Date': cachedDataObject ? cachedDataObject.checkDate : '',
                                            'Verifast Source': 'Cached'
                                        });
                                    });
                                } else {

                                    const baseUrl = 'https://aoltorontoagents.ca/student_contract/campusLists/acmeLists.php';

                                    for (let i = 1; i <= numOfPages; i++) {
                                        const pageParams = {
                                            ...urlParams,
                                            page_no: i.toString(),
                                            role: 'StudentActive'
                                        };

                                        const url = HelperFunctions.createUrlWithParams(baseUrl, pageParams, { isAcmeList: true });

                                        const response = await fetch(url, {
                                            method: 'GET',
                                            credentials: 'include'
                                        });

                                        const rawHTML = await response.text();

                                        const parser = new DOMParser();
                                        const doc = parser.parseFromString(rawHTML, "text/html");
                                        const tr_elements = doc.querySelectorAll("body > div.s01.mb-5 > div > div > div > div > div > div > div.table-responsive.secondaryContainer > table > tbody > tr");
                                        const th_elements = doc.querySelectorAll("body > div.s01.mb-5 > div > div > div > div > div > div > div.table-responsive.secondaryContainer > table > thead > tr > th");
                                        const dataIdColumnIndex = Array.from(th_elements).findIndex(th => th.textContent.trim() === 'Action') + 1;
                                        const emailColumnIndex = Array.from(th_elements).findIndex(th => th.textContent.includes('Email')) + 1;

                                        // TODO: Improve with emailColumnIndex
                                        for (const row of tr_elements) {
                                            const email = row.querySelector(`td:nth-child(${emailColumnIndex})`).textContent;
                                            const data_id = row.querySelector(`td:nth-child(${dataIdColumnIndex}) > span`).getAttribute('data-id');
                                            studentDataIds[email.toLowerCase()] = data_id;
                                        }
                                    }
                                }

                                const cacheStatus = cachedEmails.length > 0 ?
                                    ` (${cachedEmails.length} from cache)` : '';

                                this.innerHTML = '<i class="fas fa-spinner enhancer-spinner"></i> Processing 0/' + emails.length + cacheStatus +
                                    ' <span style="margin-left:5px;border-left:1px solid white;padding-left:5px;font-weight:bold;">STOP</span>';
                                this.style.backgroundColor = '#dc3545';

                                let processedCount = verifyContractButtonClicked ? 0 : cachedEmails.length;

                                const batchSize = 60;
                                const remainingEmails = verifyContractButtonClicked ? [...emails] : [...emailsToProcess];
                                const newVerifiedResults = {};

                                while (remainingEmails.length > 0 && !shouldStop) {
                                    const currentBatch = remainingEmails.splice(0, Math.min(batchSize, remainingEmails.length));
                                    pendingRequestCount += currentBatch.length;

                                    const batchPromises = currentBatch.map(student => {
                                        return new Promise(async resolve => {
                                            // Use centralized verifastCheck function
                                            const response = await DataService.verifastCheck(student.email, student.vNumber);

                                            if (verifyContractButtonClicked) {
                                                const contractData = await chrome.runtime.sendMessage({
                                                    action: 'verifyContract',
                                                    data: { email: student.email, vNumber: student.vNumber, campus: student.campus }
                                                });

                                                if (!contractData.success) {
                                                    // ErrorHandler ile alert göster
                                                    if (typeof ErrorHandler !== 'undefined' && ErrorHandler.showAlert) {
                                                        ErrorHandler.showAlert(contractData.error || 'Please check and update your Launch credentials in extension settings.', 'error');
                                                    }
                                                }

                                                response.contractData = contractData;
                                            }

                                            processedCount++;
                                            pendingRequestCount--;

                                            if (!shouldStop) {
                                                const buttonContent =
                                                    `<i class="fas fa-spinner enhancer-spinner"></i> Processing ${processedCount}/${emails.length}${cacheStatus} ` +
                                                    `<span style="margin-left:5px;border-left:1px solid white;padding-left:5px;font-weight:bold;">STOP</span>`;
                                                this.innerHTML = buttonContent;
                                            } else {
                                                this.innerHTML = '<i class="fas fa-spinner enhancer-spinner"></i> Stopping... ' +
                                                    `<span style="margin-left:5px;">Waiting for ${pendingRequestCount} pending requests</span>`;
                                            }

                                            let verifastStatus;
                                            let launchStatus;

                                            if (!response || !response.success) {
                                                verifastStatus = response?.verifastStatus || 'Student Not Found';
                                                launchStatus = 'Skipped';
                                            } else {
                                                verifastStatus = response.verifastStatus || 'Unknown';
                                            }

                                            if (verifyContractButtonClicked && verifastStatus !== "Student Not Found") {
                                                console.log('Verifying contract data...');

                                                const contractStatus = ValidationHelper.verifyContractData({
                                                    launchData: response.contractData,
                                                    epData: {
                                                        programName: student.program,
                                                        studentName: student.fullName,
                                                        vNumber: student.vNumber,
                                                        campus: student.campus,
                                                        startDate: student.startDate,
                                                        has_CPL: student.CPL == "Yes"
                                                    }
                                                });

                                                console.log('ContractStatus', student.email, contractStatus);

                                                if (contractStatus.success) {
                                                    launchStatus = 'Match';

                                                    const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
                                                    const startDate = (new Date(student.startDate + 'T00:00:00')).toLocaleDateString('en-US', dateOptions);
                                                    const endDate = (new Date(student.endDate + 'T00:00:00')).toLocaleDateString('en-US', dateOptions);
                                                    const fundingSourceId = fundingSourceMap[student.fundingSource === 'Third Party Funded' ? student.fundingOther : student.fundingSource];

                                                    const newData = {
                                                        vNumber: student.vNumber,
                                                        startDate,
                                                        endDate,
                                                        fundingSourceId
                                                    }

                                                    console.log(response.contractData.data, newData);

                                                    const updateResponse = await chrome.runtime.sendMessage({
                                                        action: 'updateLaunchData',
                                                        data: { launchData: response.contractData.data, newData }
                                                    });

                                                    if (updateResponse.success) {
                                                        launchStatus += '; Updated';
                                                        await DataService.addContractRemarks(studentDataIds[student.email.toLowerCase()], 'Yes', ' ');
                                                    }

                                                } else {
                                                    launchStatus = contractStatus.error.join('\n');
                                                    await DataService.addContractRemarks(studentDataIds[student.email.toLowerCase()], 'No', launchStatus);
                                                }
                                                console.log(student.email, contractStatus, launchStatus);
                                            }

                                            const verifiedDate = response.verifiedDate || '';
                                            console.log(student.email, verifiedDate);

                                            const normalizedEmail = student.email.toLowerCase().trim();
                                            const cacheKey = student.vNumber ?
                                                `${String(student.vNumber).toLowerCase()}_${normalizedEmail}` :
                                                normalizedEmail;

                                            const hasLaunchEntry = cachedLaunchResults[cacheKey] ||
                                                (!student.vNumber && cachedLaunchResults[normalizedEmail]);

                                            const studentResult = {
                                                'Program Name': student.program,
                                                'First Name': student.firstName,
                                                'Last Name': student.lastName,
                                                'V-Number': student.vNumber,
                                                'Email Address': student.email,
                                                'Campus': student.campus,
                                                'Start Date': student.startDate,
                                                'CPL': student.CPL,
                                                'Funding Source': student.fundingSource,
                                                'Funding Other': student.fundingOther,
                                                'Verifast Status': verifastStatus, // YENİ DURUM
                                                'Verified Date': verifiedDate, // YENİ TARİH
                                                'Launch Status': hasLaunchEntry ? 'Yes' : 'No',
                                                'Sent Email to Student': student.sentEmailtoStudent,
                                                'Signed By Student': student.signedByStudent,
                                                'Signed By Contract Manager': student.signedByContractManager,
                                                'Signature Date': student.signatureDate,
                                                'Case Worker Name': student.caseWorker,
                                                'Check Date': response.fromCache ? response.checkDate : new Date().toLocaleString(),
                                                'Verifast Source': response.fromCache ? 'Cached' : 'API'
                                            };
                                            if (verifyContractButtonClicked) studentResult['Launch Status'] = launchStatus;

                                            resultsMap.set(student.email, studentResult);

                                            if (verifastStatus === 'ID Verified') {
                                                // Create a proper cache entry with the correct key
                                                newVerifiedResults[student.cacheKey] = {
                                                    verifastStatus: 'ID Verified',
                                                    verifiedDate: verifiedDate,
                                                    checkDate: new Date().toLocaleString()
                                                };
                                            }

                                            resolve();
                                        });
                                    });

                                    await Promise.all(batchPromises);

                                    if (shouldStop) break;
                                }

                                if (Object.keys(newVerifiedResults).length > 0) {
                                    try {
                                        // Replace Chrome local storage with IndexedDB storage
                                        console.log(`Storing ${Object.keys(newVerifiedResults).length} Verifast results in database...`);

                                        // Process each result and store it in IndexedDB
                                        const storePromises = Object.entries(newVerifiedResults).map(async ([cacheKey, resultData]) => {
                                            await CacheManager.storeVerifastResult(cacheKey, resultData);
                                        });

                                        // Wait for all storage operations to complete
                                        await Promise.all(storePromises);

                                        console.log(`Successfully stored ${Object.keys(newVerifiedResults).length} Verifast records in database`);

                                        // Update UI after database update
                                        UIManager.updateAcmeListButtons();
                                    } catch (error) {
                                        console.error('Error storing Verifast results in database:', error);
                                    }
                                }

                                const results = [];
                                emails.forEach(student => {
                                    const result = resultsMap.get(student.email);
                                    if (result) results.push(result);
                                });

                                if (results.length > 0) {
                                    const ws = XLSX.utils.json_to_sheet(results);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, ws, `${verifyContractButtonClicked ? "Contract Results" : "Verifast Results"}`);

                                    const range = XLSX.utils.decode_range(ws['!ref']);
                                    for (let r = 1; r <= range.e.r; r++) {
                                        for (let c = range.s.c; c <= range.e.c; c++) {
                                            const cell = XLSX.utils.encode_cell({ r, c });
                                            const headerCell = XLSX.utils.encode_cell({ r: 0, c });

                                            if (ws[headerCell] && ws[headerCell].v === 'Signature Date' &&
                                                ws[cell] && typeof ws[cell].v === 'number') {
                                                const date = HelperFunctions.convertExcelDate(ws[cell].v);
                                                ws[cell].v = date.toISOString().split('T')[0];
                                                ws[cell].t = 's';
                                            }
                                        }
                                    }

                                    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                                    const resultBlob = new Blob([excelBuffer], {
                                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                                    });
                                    const downloadUrl = URL.createObjectURL(resultBlob);

                                    const downloadLink = document.createElement('a');
                                    downloadLink.href = downloadUrl;
                                    downloadLink.download = `${verifyContractButtonClicked ? "Contract_Results" : "Verifast_Results"}_${new Date().toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                    }).replace(/[/:]/g, '-').replace(',', '')}.xlsx`;
                                    document.body.appendChild(downloadLink);
                                    downloadLink.click();
                                    document.body.removeChild(downloadLink);
                                    URL.revokeObjectURL(downloadUrl);
                                }

                                const statusMessage = shouldStop ?
                                    `Process stopped. Downloaded ${resultsMap.size}/${emails.length} results (${cachedEmails.length} from cache).` :
                                    `Process complete. All ${resultsMap.size} records processed (${cachedEmails.length} from cache).`;
                                console.log(statusMessage);

                            } catch (error) {
                                console.error('Error processing Excel:', error);
                            }

                        } catch (error) {
                            console.error('Error fetching Excel:', error);
                        }
                    })();

                    await processingPromise;

                    this.innerHTML = originalContent;
                    this.disabled = false;
                    this.style.backgroundColor = '';

                    isProcessing = false;
                    shouldStop = false;
                    window.removeEventListener('beforeunload', beforeUnloadHandler);
                });

                downloadButton.dataset.bulkVerifastAdded = 'true';
            });
        })();
    }

    static enhanceExcelDownloadButton() {
        return HelperFunctions.urlCheck([`!${CONFIG.STUDENT_PROFILE_URL}`, `!${CONFIG.ATTENDANCE_URL}`, `!${CONFIG.TICKET_REPORTS_URL}`, , `!${CONFIG.WEEKWISE_REPORTS_URL}`, `!${CONFIG.MONDAY_START_CLASS_URL}`], function () {
            const downloadButton = document.querySelector('button[name="studentlist"]');
            if (!downloadButton || downloadButton.dataset.enhancedDownload) return;

            // Check if we're on a SuperAdmin page
            const isSuperAdminPage = window.location.href.includes('/superAdmin/');
            const urlParams = new URLSearchParams(window.location.search);

            // List of all filter parameters that indicate meaningful filtering
            const filterParams = [
                'crsFltr', 'nameFltr', 'dateFrom', 'dateTo', 'keywordLists',
                'statusFilter', 'startFilterForm', 'startFilterTo', 'campusFilter',
                'trackFilter', 'woToFilter', 'woFromFilter'
            ];

            // Check if any filter parameter has a non-empty value
            const hasActiveFilters = filterParams.some(param => {
                const value = urlParams.get(param);
                return value && value.trim() !== '';
            });

            // On SuperAdmin pages, only enhance if there are active filters
            if (isSuperAdminPage && !hasActiveFilters) {
                console.log("Skipping Excel download enhancement on SuperAdmin page - no active filters");
                return;
            }

            // Mark the button as enhanced to prevent duplicate event listeners
            downloadButton.dataset.enhancedDownload = 'true';

            // Clone the original button for its styling and attributes, but replace its click behavior
            const enhancedButton = downloadButton.cloneNode(true);
            enhancedButton.innerHTML = '<i class="fas fa-file-excel"></i> Download XLSX';

            // Replace the original button with our enhanced version
            downloadButton.parentNode.replaceChild(enhancedButton, downloadButton);

            // Add click event to intercept the default download
            enhancedButton.addEventListener('click', async function (e) {
                e.preventDefault();

                try {
                    // Show loading state
                    HelperFunctions.setButtonLoadingState(this, true, 'fa-file-excel', 0, 'Downloading...');

                    // Find the form and get its action URL
                    const downloadForm = this.closest('form');
                    if (!downloadForm) {
                        throw new Error('Could not find the form for the Excel download');
                    }

                    const actionUrl = downloadForm.getAttribute('action');

                    // Get blob using the centralized getStudentListExcel function with the form's action URL
                    console.log('Downloading Excel from:', actionUrl);
                    const blob = await DataService.getStudentListExcel({}, actionUrl);
                    console.log('Excel blob downloaded successfully, size:', blob.size);

                    // Process the Excel blob with a lower cell character limit for SuperAdmin
                    const isSuper = window.location.href.includes('/superAdmin/');
                    const options = {
                        includeWorkbook: false, // Don't include workbook - we'll create a new one
                        maxCellLength: isSuper ? 32000 : null,
                        processNames: true,
                        processAllDates: true
                    };

                    console.log('Processing Excel file with options:', options);

                    // Process the Excel blob with our centralized function
                    const result = await HelperFunctions.processExcelBlob(
                        blob,
                        [], // Empty array - we'll rely on processAllDates:true to auto-detect date columns
                        options
                    );

                    // Get only the processed data (no workbook)
                    const processedData = result.data || result;

                    if (!processedData || !processedData.length) {
                        throw new Error('Failed to process Excel data');
                    }

                    console.log(`Excel processing complete. Processed ${processedData.length} rows`);

                    // Create a completely new, clean workbook
                    const newWorkbook = XLSX.utils.book_new();

                    // Create worksheet from clean data
                    const worksheet = XLSX.utils.json_to_sheet(processedData, {
                        // Optimize worksheet creation
                        cellDates: false, // Don't create date objects
                        skipHidden: true,
                        rawNumbers: false // Convert numbers to strings to reduce metadata
                    });

                    // Clean up the worksheet - remove all formatting and keep only values
                    if (worksheet['!ref']) {
                        const range = XLSX.utils.decode_range(worksheet['!ref']);

                        for (let R = range.s.r; R <= range.e.r; ++R) {
                            for (let C = range.s.c; C <= range.e.c; ++C) {
                                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                                const cell = worksheet[cellAddress];

                                if (cell && cell.v !== undefined) {
                                    // Keep only the value, remove all other properties
                                    const value = cell.v;
                                    worksheet[cellAddress] = {
                                        v: value,
                                        t: typeof value === 'number' ? 'n' : 's' // Simple type detection
                                    };
                                }
                            }
                        }
                    }

                    // Remove unnecessary worksheet properties
                    delete worksheet['!margins'];
                    delete worksheet['!cols'];
                    delete worksheet['!rows'];
                    delete worksheet['!merges'];
                    delete worksheet['!protect'];
                    delete worksheet['!autofilter'];

                    // Add worksheet to workbook
                    XLSX.utils.book_append_sheet(newWorkbook, worksheet, 'Sheet1');

                    // Remove unnecessary workbook properties
                    newWorkbook.Props = {
                        Title: "Student Data",
                        CreatedDate: new Date()
                    };

                    // Get filename from nearest heading element or form
                    let filenamePrefix = 'Student_List';

                    // Try to find a suitable heading near the form
                    const heading = HelperFunctions.getElementByXPath('H3_HEADER');
                    if (heading.textContent &&
                        (heading.contains(downloadForm) ||
                            downloadForm.contains(heading) ||
                            heading.parentElement.contains(downloadForm) ||
                            heading.parentElement.parentElement.contains(downloadForm))) {

                        filenamePrefix = heading.textContent.trim()
                            .replace(/[^\w\s\-]/g, '')
                            .replace(/\s+/g, '_')
                            .replace(/_+/g, '_')
                            .replace(/^_|_$/g, '');
                    }

                    // If still no heading found, use URL-based naming
                    if (filenamePrefix === 'Student_List') {
                        if (window.location.href.includes('/acmeLists.php')) {
                            filenamePrefix = 'Student_Acme_Lists';
                        } else if (window.location.href.includes('/activeLists.php')) {
                            filenamePrefix = 'Total_Active_Student_Lists';
                        } else if (window.location.href.includes('/superAdmin/')) {
                            filenamePrefix = 'SuperAdmin_Student_Lists';
                        }
                    }

                    // Create safe date time string
                    const now = new Date();
                    const hours = now.getHours().toString().padStart(2, '0');
                    const minutes = now.getMinutes().toString().padStart(2, '0');
                    const timeStr = `${hours}-${minutes}`;

                    // Get date from form data for the filename
                    const formInputs = downloadForm.querySelectorAll('input[type="hidden"]');
                    const startFilter = Array.from(formInputs).find(input => input.name === 'startFilter')?.value || '';
                    const dateMonday = Array.from(formInputs).find(input => input.name === 'date_monday')?.value || '';

                    let fileDate = '';
                    if (dateMonday) {
                        fileDate = dateMonday;
                    } else if (startFilter) {
                        fileDate = startFilter;
                    } else {
                        fileDate = HelperFunctions.getNextMonday();
                    }

                    // Create final filename
                    const fileName = `${filenamePrefix}_${fileDate}_${timeStr}.xlsx`;
                    console.log('Generated filename:', fileName);

                    // Generate file with maximum compression and minimal options
                    const wbout = XLSX.write(newWorkbook, {
                        bookType: 'xlsx',
                        type: 'array',
                        compression: true,
                        bookSST: false, // Don't use shared string table
                        cellStyles: false, // No cell styles
                        cellFormats: false, // No cell formats
                        cellDates: false, // No date formatting
                        Props: false // Don't include extended properties
                    });

                    console.log('Original blob size:', blob.size, 'bytes');
                    console.log('Processed file size:', wbout.length, 'bytes');

                    const enhancedBlob = new Blob([wbout], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });

                    const downloadLink = document.createElement('a');
                    downloadLink.href = URL.createObjectURL(enhancedBlob);
                    downloadLink.download = fileName;
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                    URL.revokeObjectURL(downloadLink.href);

                    // Restore button state with success indication
                    HelperFunctions.setButtonLoadingState(this, false, 'fa-check', 2000, 'Downloaded!');
                    setTimeout(() => {
                        HelperFunctions.setButtonLoadingState(this, false, 'fa-file-excel', 0, 'Download XLSX');
                    }, 2000);

                } catch (error) {
                    HelperFunctions.setButtonLoadingState(this, false, 'fa-exclamation-triangle', 2000, 'Error!');
                    setTimeout(() => {
                        HelperFunctions.setButtonLoadingState(this, false, 'fa-file-excel', 0, 'Download XLSX');
                    }, 2000);

                    ErrorHandler.showAlert(`<b>Error:</b>&nbsp;Failed to download Excel: ${error.message}`, 'error', 5000);
                }
            });
        })();
    }

    static addNavbarLaunchButton() {
        return HelperFunctions.urlCheck([CONFIG.STUDENT_PORTAL], function () {
            try {
                console.log("🔍 Looking for navbar element...");
                const navbarElement = HelperFunctions.getElementByXPath('NAVBAR');
                if (!navbarElement) {
                    console.log("❌ Navbar element not found");
                    return;
                }
                console.log("✅ Navbar element found:", navbarElement);

                // Create a container div for both buttons
                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'navbar-buttons-container';
                buttonsContainer.style.display = 'flex';
                buttonsContainer.style.gap = '10px';
                buttonsContainer.style.marginRight = '3px';

                // Create Launch button
                const launchButton = document.createElement('button');
                launchButton.id = 'navbarLaunchButton';
                launchButton.className = 'btn btn-light btn-sm btn-launch';
                launchButton.innerHTML = '<i class="fas fa-paper-plane"></i>';

                const tooltip = UIManager.createTooltip('Quick Launch Search', {
                    top: '40px',
                    right: '0',
                    padding: '10px'
                });
                launchButton.appendChild(tooltip);

                launchButton.addEventListener('click', () => {
                    UIManager.showLaunchModal();
                });

                const hasSuperAdminAccess = !!document.querySelector('a[href*="/profile/alluList.php"]') ||
                    !!document.querySelector('a[href*="getPage=Pending_Sign"]');

                const hasComplianceAccess = !!document.querySelector('a[href*="../compliance/"]');

                // ✅ FIXED: Always add Launch button first
                buttonsContainer.appendChild(launchButton);

                // Create KPI Report button - visible to all users
                console.log("🔧 Creating KPI Report button...");
                const kpiReportButton = document.createElement('button');
                kpiReportButton.id = 'navbarKPIReportButton';
                kpiReportButton.className = 'btn btn-light btn-sm btn-kpi';
                kpiReportButton.innerHTML = '<i class="fas fa-chart-line"></i>';
                kpiReportButton.style.border = '2px solid #28a745'; // Green border to make it visible
                kpiReportButton.style.backgroundColor = '#d4edda'; // Light green background

                const kpiTooltip = UIManager.createTooltip('KPI Report', {
                    top: '40px',
                    right: '0',
                    padding: '10px'
                });
                kpiReportButton.appendChild(kpiTooltip);

                kpiReportButton.addEventListener('click', () => {
                    console.log("🖱️ KPI Report button clicked!");
                    UIManager.showKPIModal();
                });

                buttonsContainer.appendChild(kpiReportButton);
                console.log("✅ KPI Report button added to container");

                // ✅ UPDATED: Compliance veya SuperAdmin erişimi varsa bu bloka gir
                if (hasSuperAdminAccess || hasComplianceAccess) {

                    // ✅ UPDATED: Advanced Tools sadece SuperAdmin erişimi olanlara
                    if (hasSuperAdminAccess) {
                        // Create Advanced Tools button
                        const advancedToolsButton = document.createElement('button');
                        advancedToolsButton.id = 'navbarAdvancedToolsButton';
                        advancedToolsButton.className = 'btn btn-light btn-sm btn-tools';
                        advancedToolsButton.innerHTML = '<i class="fas fa-list"></i>';

                        const advancedTooltip = UIManager.createTooltip('Course Activator', {
                            top: '40px',
                            right: '0',
                            padding: '10px'
                        });
                        advancedToolsButton.appendChild(advancedTooltip);

                        advancedToolsButton.addEventListener('click', () => {
                            const listViewerUrl = chrome.runtime.getURL('src/list-viewer.html');
                            window.open(listViewerUrl, '_blank');
                        });

                        buttonsContainer.appendChild(advancedToolsButton);
                    }

                    // ✅ UPDATED: Weekly Reports butonu hem SuperAdmin hem Compliance erişimi olanlara
                    const weeklyReportsButton = document.createElement('button');
                    weeklyReportsButton.id = 'navbarWeeklyReportsButton';
                    weeklyReportsButton.className = 'btn btn-light btn-sm btn-reports';
                    weeklyReportsButton.innerHTML = '<i class="fas fa-chart-pie"></i>';

                    const weeklyTooltip = UIManager.createTooltip('Weekly Reports', {
                        top: '40px',
                        right: '0',
                        padding: '10px'
                    });
                    weeklyReportsButton.appendChild(weeklyTooltip);

                    weeklyReportsButton.addEventListener('click', () => {
                        const weeklyReportsUrl = chrome.runtime.getURL('src/weekly-reports.html');
                        window.open(weeklyReportsUrl, '_blank');
                    });

                    buttonsContainer.appendChild(weeklyReportsButton);

                    // ✅ UPDATED: Upload butonu sadece SuperAdmin erişimi olanlara
                    if (hasSuperAdminAccess) {
                        // Create Upload button
                        const uploadButton = document.createElement('button');
                        uploadButton.id = 'navbarUploadButton';
                        uploadButton.className = 'btn btn-light btn-sm btn-upload';
                        uploadButton.innerHTML = '<i class="fas fa-cloud-upload-alt"></i>';

                        const uploadTooltip = UIManager.createTooltip('Upload', {
                            top: '40px',
                            right: '0',
                            padding: '10px'
                        });
                        uploadButton.appendChild(uploadTooltip);

                        uploadButton.addEventListener('click', () => {
                            UIManager.showFileUploadModal();
                        });

                        buttonsContainer.appendChild(uploadButton);
                    }
                }

                // Add the container to the navbar
                navbarElement.parentNode.insertBefore(buttonsContainer, navbarElement);
                console.log("✅ Navbar buttons container added to navbar");
                console.log("📍 Button container location:", buttonsContainer);
                console.log("🔍 KPI Button element:", document.getElementById('navbarKPIReportButton'));

            } catch (error) {
                console.error('Error adding navbar buttons:', error);
            }
        })();
    }

    static showFileUploadModal() {
        const modalHTML = `
            <div id="fileUploadModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header" style="display: flex; justify-content: center; align-items: center; width: 100%;">
                        <h4 class="modal-title" style="display: flex; font-size: 1.2rem; text-align: center; width: 100%; margin: 0; justify-content: center;">
                            Send Payment Emails
                        </h4>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="upload-container">
                            <form id="multiFileUploadForm">
                                <div class="d-flex flex-row justify-content-between" style="gap: 16px; padding-top: 16px;">
                                    <div class="file-upload-group flex-fill" style="min-width: 0;">
                                        <label for="fileInput1" style="display:block;text-align:center;"><b>Agent Commission Report</b></label>
                                        <div class="upload-area" id="uploadArea1">
                                            <div class="upload-content" id="uploadContent1">
                                                <div class="upload-icon">
                                                    <i class="fas fa-cloud-upload-alt"></i>
                                                </div>
                                                <h3>Drag & Drop your file here</h3>
                                                <p>or</p>
                                                <button type="button" class="btn btn-primary" id="selectFileBtn1">
                                                    <i class="fas fa-folder-open"></i> Browse Files
                                                </button>
                                                <input type="file" id="fileInput1" style="display: none;" accept="*/*" tabindex="-1" aria-hidden="true" inert>
                                                <div class="upload-info">
                                                    <small>Supports .xlsx</small>
                                                </div>
                                            </div>
                                            <div class="file-info-container" id="fileInfoContainer1" style="display: none; position: relative;">
                                                <div class="alert alert-info d-flex justify-content-between align-items-center" style="position: relative;">
                                                    <div style="min-width:0;overflow:hidden;text-overflow:ellipsis;">
                                                        <i class="fas fa-file"></i>
                                                        <span id="fileName1"></span>
                                                        <small class="text-muted">(<span id="fileSize1"></span>)</small>
                                                    </div>
                                                    <button type="button" class="btn btn-sm btn-danger" id="fileRemoveBtn1" style="position: absolute; top: 8px; right: 8px; z-index: 2;">
                                                        <i class="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="file-upload-group flex-fill" style="min-width: 0;">
                                        <label for="fileInput2" style="display:block;text-align:center;"><b>Payments Report</b></label>
                                        <div class="upload-area" id="uploadArea2">
                                            <div class="upload-content" id="uploadContent2">
                                                <div class="upload-icon">
                                                    <i class="fas fa-cloud-upload-alt"></i>
                                                </div>
                                                <h3>Drag & Drop your file here</h3>
                                                <p>or</p>
                                                <button type="button" class="btn btn-primary" id="selectFileBtn2">
                                                    <i class="fas fa-folder-open"></i> Browse Files
                                                </button>
                                                <input type="file" id="fileInput2" style="display: none;" accept="*/*" tabindex="-1" aria-hidden="true" inert>
                                                <div class="upload-info">
                                                    <small>Supports .xlsx</small>
                                                </div>
                                            </div>
                                            <div class="file-info-container" id="fileInfoContainer2" style="display: none; position: relative;">
                                                <div class="alert alert-info d-flex justify-content-between align-items-center" style="position: relative;">
                                                    <div style="min-width:0;overflow:hidden;text-overflow:ellipsis;">
                                                        <i class="fas fa-file"></i>
                                                        <span id="fileName2"></span>
                                                        <small class="text-muted">(<span id="fileSize2"></span>)</small>
                                                    </div>
                                                    <button type="button" class="btn btn-sm btn-danger" id="fileRemoveBtn2" style="position: absolute; top: 8px; right: 8px; z-index: 2;">
                                                        <i class="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="file-upload-group flex-fill" style="min-width: 0;">
                                        <label for="fileInput3" style="display:block;text-align:center;"><b>Agent Information</b></label>
                                        <div class="upload-area" id="uploadArea3">
                                            <div class="upload-content" id="uploadContent3">
                                                <div class="upload-icon">
                                                    <i class="fas fa-cloud-upload-alt"></i>
                                                </div>
                                                <h3>Drag & Drop your file here</h3>
                                                <p>or</p>
                                                <button type="button" class="btn btn-primary" id="selectFileBtn3">
                                                    <i class="fas fa-folder-open"></i> Browse Files
                                                </button>
                                                <input type="file" id="fileInput3" style="display: none;" accept="*/*" tabindex="-1" aria-hidden="true" inert>
                                                <div class="upload-info">
                                                    <small>Supports .xlsx</small>
                                                </div>
                                            </div>
                                            <div class="file-info-container" id="fileInfoContainer3" style="display: none; position: relative;">
                                                <div class="alert alert-info d-flex justify-content-between align-items-center" style="position: relative;">
                                                    <div style="min-width:0;overflow:hidden;text-overflow:ellipsis;">
                                                        <i class="fas fa-file"></i>
                                                        <span id="fileName3"></span>
                                                        <small class="text-muted">(<span id="fileSize3"></span>)</small>
                                                    </div>
                                                    <button type="button" class="btn btn-sm btn-danger" id="fileRemoveBtn3" style="position: absolute; top: 8px; right: 8px; z-index: 2;">
                                                        <i class="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="upload-progress-container mt-4" id="uploadProgressContainer" style="display: none;">
                                    <div class="progress">
                                        <div class="progress-bar" id="uploadProgressBar" style="width: 0%"></div>
                                    </div>
                                    <div class="upload-status" id="uploadStatus">Uploading...</div>
                                </div>
                                <button type="button" class="btn btn-success btn-block mt-4" id="submitBtn" disabled>
                                    <i class="fas fa-envelope"></i> Send
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (!document.getElementById('fileUploadModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
        function cleanEmail(email) {
            if (!email) return '';
            // Remove non-ascii characters like Â and trim spaces
            return email.replace(/[^\x00-\x7F]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        const modal = document.getElementById('fileUploadModal');
        const closeBtn = modal.querySelector('.modal-close');
        const submitBtn = document.getElementById('submitBtn');
        const uploadProgressContainer = document.getElementById('uploadProgressContainer');
        const uploadProgressBar = document.getElementById('uploadProgressBar');
        const uploadStatus = document.getElementById('uploadStatus');

        // File input/area/content/info for each file
        const fileInputs = [
            document.getElementById('fileInput1'),
            document.getElementById('fileInput2'),
            document.getElementById('fileInput3')
        ];
        const selectFileBtns = [
            document.getElementById('selectFileBtn1'),
            document.getElementById('selectFileBtn2'),
            document.getElementById('selectFileBtn3')
        ];
        const uploadAreas = [
            document.getElementById('uploadArea1'),
            document.getElementById('uploadArea2'),
            document.getElementById('uploadArea3')
        ];
        const uploadContents = [
            document.getElementById('uploadContent1'),
            document.getElementById('uploadContent2'),
            document.getElementById('uploadContent3')
        ];
        const fileInfoContainers = [
            document.getElementById('fileInfoContainer1'),
            document.getElementById('fileInfoContainer2'),
            document.getElementById('fileInfoContainer3')
        ];
        const fileNames = [
            document.getElementById('fileName1'),
            document.getElementById('fileName2'),
            document.getElementById('fileName3')
        ];
        const fileSizes = [
            document.getElementById('fileSize1'),
            document.getElementById('fileSize2'),
            document.getElementById('fileSize3')
        ];
        const fileRemoveBtns = [
            document.getElementById('fileRemoveBtn1'),
            document.getElementById('fileRemoveBtn2'),
            document.getElementById('fileRemoveBtn3')
        ];

        let selectedFiles = [null, null, null];

        modal.style.display = 'flex';

        // Close modal functionality
        const closeModal = () => {
            modal.style.display = 'none';
            resetUploadAreas();
        };

        const resetUploadAreas = () => {
            selectedFiles = [null, null, null];
            for (let i = 0; i < 3; i++) {
                fileInfoContainers[i].style.display = 'none';
                uploadContents[i].style.display = 'block';
                uploadAreas[i].classList.remove('drag-over', 'file-selected');
                fileInputs[i].value = '';
            }
            uploadProgressContainer.style.display = 'none';
            uploadProgressBar.style.width = '0%';
            uploadStatus.textContent = 'Uploading...';
            submitBtn.disabled = true;
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // File selection and drag-drop for each file input
        for (let i = 0; i < 3; i++) {
            selectFileBtns[i].addEventListener('click', () => {
                fileInputs[i].click();
            });

            fileInputs[i].addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    handleFileSelection(i, e.target.files[0]);
                }
            });

            fileRemoveBtns[i].addEventListener('click', () => {
                resetFileArea(i);
            });

            uploadAreas[i].addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadAreas[i].classList.add('drag-over');
            });

            uploadAreas[i].addEventListener('dragleave', (e) => {
                e.preventDefault();
                if (!uploadAreas[i].contains(e.relatedTarget)) {
                    uploadAreas[i].classList.remove('drag-over');
                }
            });

            uploadAreas[i].addEventListener('drop', (e) => {
                e.preventDefault();
                uploadAreas[i].classList.remove('drag-over');
                if (e.dataTransfer.files.length > 0) {
                    handleFileSelection(i, e.dataTransfer.files[0]);
                }
            });
        }

        // Handle file selection for index i
        const handleFileSelection = (idx, file) => {
            selectedFiles[idx] = file;
            fileNames[idx].textContent = file.name;
            fileSizes[idx].textContent = formatFileSize(file.size);

            uploadContents[idx].style.display = 'none';
            fileInfoContainers[idx].style.display = 'block';
            uploadAreas[idx].classList.add('file-selected');

            checkAllFilesSelected();
        };

        // Reset a single file area
        const resetFileArea = (idx) => {
            selectedFiles[idx] = null;
            fileInfoContainers[idx].style.display = 'none';
            uploadContents[idx].style.display = 'block';
            uploadAreas[idx].classList.remove('file-selected');
            fileInputs[idx].value = '';
            checkAllFilesSelected();
        };

        // Enable upload button only if all files are selected
        const checkAllFilesSelected = () => {
            // submitBtn.disabled = !(selectedFiles[0] && selectedFiles[1] && selectedFiles[2]);
            submitBtn.disabled = false;
        };

        const paymentNameMapping = {
            'GPS Education Solutions Inc': {
                agentCommName: 'GPS Education Solution',
                emailName: 'GPS Education Solutions'
            },
            'DH CORPORATION': {
                ignoreEmail: true,
            },
            'Academy of Learning Inc.': {
                ignoreEmail: true,
            },
            '24TH AVENUECONSULTINGLTD.': {
                agentCommName: '24th Avenue Consulting Ltd',
                emailName: '24th Avenue Consulting Ltd'
            },
            'ONE 96 OPPORTUNITIES INC': {
                agentCommName: 'One 96 Opportunities',
                emailName: 'One 96 Opportunities'
            },
            'Dhana Laxmi Uplopwar': {
                agentCommName: 'DLAXMI INC.',
                emailName: 'DLAXMI INC.'
            }


        }


        // Upload functionality
        submitBtn.addEventListener('click', async () => {
            // if (!selectedFiles[0] || !selectedFiles[1] || !selectedFiles[2]) return;

            try {
                for (let i = 0; i < 3; i++) {
                    fileInfoContainers[i].style.display = 'none';
                }
                uploadProgressContainer.style.display = 'block';

                const agentCommFile = selectedFiles[0];
                const agentInfoFile = selectedFiles[2];

                let agentCommData = null;
                let agentInfoData = null;

                if (agentCommFile) agentCommData = await HelperFunctions.processExcelBlob(agentCommFile, [], { sheetname: 'JAN' });
                if (agentInfoFile) agentInfoData = await HelperFunctions.processExcelBlob(agentInfoFile);

                const payments = {};
                const reader = new FileReader();
                reader.onload = function (e) {
                    try {
                        function sanitizeString(str) {
                            if (!str) return null;
                            return str.toString().toLowerCase().replace(/\s+/g, ' ').trim();
                        }

                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });

                        // Iterate through all sheets and add their JSON to payments object
                        workbook.SheetNames.forEach(sheetName => {
                            const worksheet = workbook.Sheets[sheetName];
                            const sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                            payments[sheetName] = sheetData;
                        });

                        let totalPaymentAmount = 0;

                        const results = [];
                        for (const campus in payments) {
                            // for (const payment of payments[campus].slice(1, 5)) {
                            for (const payment of payments[campus]) {
                                try {

                                    const paymentStatus = payment['Payment Status'];
                                    if (!(paymentStatus == 'Accepted' || paymentStatus == 'Sent')) continue;

                                    let isAgent = false;
                                    if (payment['Vendor Number'].toString().toLowerCase().includes('agent')) {
                                        console.log('Agent tag found');
                                        isAgent = true;
                                    } else {
                                        console.log('No Agent tag found');
                                    }

                                    console.log(payment['Recipient'], payment['Payment Amount']);
                                    const paymentRecipient = sanitizeString(payment['Recipient']);
                                    const paymentVendorName = sanitizeString(payment['Vendor Number'])?.replace(/agent\s+-?\s+/g, '');
                                    const paymentDate = new Date(payment['Due/Value Date']);
                                    const { agentCommName, emailName, ignoreEmail } = paymentNameMapping[payment['Recipient'].trim()] || {};

                                    const totalAmtPaid = Number(payment['Payment Amount']) || 0;
                                    let commissionAmt = 0, commissionBreakdown = [];


                                    if (ignoreEmail) {
                                        console.log('Ignoring email... ', paymentRecipient);

                                        results.push({
                                            'Fullname': paymentRecipient,
                                            'Payment Amount': totalAmtPaid,
                                            'Email Id': '',
                                            'Email Sent': 'NO - Ignored',
                                        });
                                        continue;
                                    };

                                    let commissions = agentCommData.filter(agent => {
                                        const agentCampus = agent.Campus.trim() || '';

                                        const companyName = sanitizeString(agent['Agent']);
                                        const agentName = sanitizeString(agent['Agent Name']);
                                        const commissionPaymentDate = HelperFunctions.convertExcelDate(agent['Date']);

                                        // TODO: Compare length and check
                                        return (agentCampus === campus &&
                                            paymentDate && commissionPaymentDate && paymentDate.getDate() === commissionPaymentDate.getDate() &&
                                            (companyName?.includes(sanitizeString(agentCommName))
                                                || companyName?.includes(paymentRecipient)
                                                || paymentRecipient?.includes(companyName)
                                                || paymentRecipient?.includes(agentName)
                                                || companyName?.includes(paymentVendorName)
                                                || agentName?.includes(paymentVendorName))
                                        );
                                    });

                                    totalPaymentAmount += totalAmtPaid;
                                    console.log(commissions);


                                    for (const commission of commissions) {
                                        const totalCommission = Number(commission['Total Commission']) || 0;
                                        const firstCommission = Number(commission['1st Commission']) || 0;
                                        const secondCommission = Number(commission['2nd Commission']) || 0;

                                        commissionBreakdown.push([commission['Fullname'], commission['V-number'], firstCommission, secondCommission, totalCommission]);
                                        commissionAmt += totalCommission;

                                        if (totalCommission < 0) {
                                            commissionBreakdown.push([commission['Fullname'], commission['V-number'], (firstCommission < 0 ? firstCommission : secondCommission), null, totalCommission]);
                                            continue;
                                        }

                                        if (firstCommission + secondCommission !== totalCommission) {
                                            console.log('Total Commission mismatch for', commission['Fullname'], commission['V-number'], firstCommission, secondCommission, totalCommission);
                                        }
                                    }

                                    if (commissionAmt === 0) {
                                        console.log('No commission found for', paymentRecipient, paymentVendorName);
                                        results.push({
                                            'Fullname': paymentRecipient,
                                            'Payment Amount': totalAmtPaid,
                                            'Email Id': '',
                                            'Email Sent': 'NO - No agent commission found',
                                        });
                                        continue;
                                    }

                                    // console.log(commissionAmt, totalAmtPaid, isPartialAmount, commissionBreakdown); 
                                    if (Math.round(commissionAmt) !== Math.round(totalAmtPaid)) {
                                        console.log('Commission amount mismatch', paymentRecipient, paymentVendorName, commissionAmt, totalAmtPaid);
                                        results.push({
                                            'Fullname': paymentRecipient,
                                            'Payment Amount': totalAmtPaid,
                                            'Email Id': '',
                                            'Email Sent': 'NO - Commission amount mismatch',
                                        });
                                        uploadStatus.textContent = 'Upload failed: Commission amount mismatch';
                                        uploadProgressBar.classList.add('bg-danger');
                                    }

                                    // Finding Recipient Email
                                    let agentInfo = agentInfoData.filter(agent => sanitizeString(agent['Company Name'])?.includes(sanitizeString(emailName)) || sanitizeString(agent['Company Name'])?.includes(paymentRecipient) || sanitizeString(agent['Contact Name'])?.includes(paymentRecipient)), agentEmail = '';
                                    if (agentInfo.length === 0) {
                                        agentInfo = agentInfoData.filter(agent => sanitizeString(agent['Company Name'])?.includes(paymentVendorName) || sanitizeString(agent['Contact Name'])?.includes(paymentVendorName));
                                        if (agentInfo.length === 0) {
                                            results.push({
                                                'Fullname': paymentRecipient,
                                                'Payment Amount': totalAmtPaid,
                                                'Email Id': '',
                                                'Email Sent': 'NO - Agent Info not found',
                                            });

                                            if (isAgent) {
                                                console.log('----------------- AGENT BUT NO INFO FOUND FOR ', paymentRecipient, paymentVendorName, '-----------------');

                                            }
                                            console.log(' ----------------- No Agent Found for ', paymentRecipient, paymentVendorName, '-----------------');
                                            uploadStatus.textContent = 'Upload failed: No agent found for payment recipient';
                                            uploadProgressBar.classList.add('bg-danger');
                                            continue;
                                        }
                                    }

                                    agentEmail = agentInfo[0]['Email Id'];
                                    // console.log('Agent found', agentInfo[0]['Company Name'], agentInfo[0]['Email Id']);

                                    // const body = HelperFunctions.createPaymentEmail({ name: agentInfo[0]['Contact Name'], breakdown: commissionBreakdown, totalAmtPaid, campus });
                                    // DataService.sendMail({ email: 'pratik.gupta@aoltoronto.com', title: 'Commission Initiated', body: body});
                                    // DataService.sendMail({ email: 'pratik.gupta@aoltoronto.com', title: 'Commission Initiated', body: body, cc: 'Mithun.O@aoltoronto.com', bcc: 'Rajeev.Acharya@aoltoronto.com'});

                                    // Prepare Email
                                    // TODO: Implement email preparation logic here, ensure agentInfo has expected fields before using
                                    results.push({
                                        'Fullname': agentInfo[0]['Contact Name'],
                                        'Payment Amount': totalAmtPaid,
                                        'Email Id': agentEmail,
                                        'Email Sent': 'YES',
                                    });
                                } catch (error) {
                                    console.log(error, payment);
                                }

                                // Generate XLSX and trigger download

                            }
                        }

                        results.push({
                            'Fullname': 'Total',
                            'Payment Amount': totalPaymentAmount,
                            'Email Id': '',
                            'Email Sent': '',
                        });
                        console.log(results);

                        if (results.length > 0) {
                            const ws = XLSX.utils.json_to_sheet(results);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "Payment Results");
                            const filename = `Payment_Results_${new Date().toISOString().slice(0, 10)}.xlsx`;
                            // Generate the file and trigger download
                            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                            const resultBlob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                            const downloadLink = document.createElement('a');
                            downloadLink.href = URL.createObjectURL(resultBlob);
                            downloadLink.download = filename;
                            document.body.appendChild(downloadLink);
                            downloadLink.click();
                            document.body.removeChild(downloadLink);
                            URL.revokeObjectURL(downloadLink.href);
                            uploadStatus.textContent = 'Upload complete: Results downloaded.';
                            uploadProgressBar.classList.add('bg-success');
                        } else {
                            uploadStatus.textContent = 'No payment results to export.';
                            uploadProgressBar.classList.add('bg-warning');
                        }
                    } catch (error) {
                        uploadStatus.textContent = 'Upload failed: ' + error.message;
                        uploadProgressBar.classList.add('bg-danger');
                        return;
                    }
                };

                reader.readAsArrayBuffer(selectedFiles[1]);




            } catch (error) {
                uploadStatus.textContent = 'Upload failed: ' + error.message;
                uploadProgressBar.classList.add('bg-danger');
            }
        });

        // Format file size helper
        const formatFileSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        // ESC key to close
        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        document.addEventListener('keydown', handleEscKey);

        modal.addEventListener('hidden', () => {
            document.removeEventListener('keydown', handleEscKey);
        }, { once: true });
    }

    static showLaunchModal() {
        const modalHTML = `
            <div id="launchSearchModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 60%;">
                    <div class="modal-header">
                        <h4 class="modal-title">Student Launch Search</h4>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body launch-search">
                        <div class="search-form" style="display: flex; gap: 10px; margin-bottom: 15px;">
                            <div style="flex: 1;">
                                <h6 class="launchInput" for="launchVNumber">V-Number</h6>
                                <input class="launchInput" type="text" id="launchVNumber" class="form-control" placeholder="e.g. VT12345">
                            </div>
                            <div style="flex: 1;">
                                <h6 class="launchInput" for="launchEmail">Email</h6>
                                <input class="launchInput" type="text" id="launchEmail" class="form-control" placeholder="student@example.com">
                            </div>
                            <div style="flex: 1;">
                                <h6 class="launchInput" for="launchfirstName">First Name</h6>
                                <input class="launchInput" type="text" id="launchfirstName" class="form-control" placeholder="Student Name">
                            </div>
                            <div style="flex: 1;">
                                <h6 class="launchInput" for="launchLastName">Last Name</h6>
                                <input class="launchInput" type="text" id="launchLastName" class="form-control" placeholder="Student Last Name">
                            </div>
                            <div style="display: flex; align-items: flex-end;">
                                <button id="launchSearchButton" class="btn btn-success">
                                    <i class="fas fa-search"></i> Search
                                </button>
                            </div>
                        </div>
                        <div id="launchSearchResults" style="max-height: 300px;">
                            <div class="text-center text-muted">
                                <i>Enter student information above to search</i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (!document.getElementById('launchSearchModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        const modal = document.getElementById('launchSearchModal');
        const closeBtn = modal.querySelector('.modal-close');
        const searchBtn = document.getElementById('launchSearchButton');
        const vNumberInput = document.getElementById('launchVNumber');
        const emailInput = document.getElementById('launchEmail');
        const firstNameInput = document.getElementById('launchfirstName');
        const lastNameInput = document.getElementById('launchLastName');
        const resultsDiv = document.getElementById('launchSearchResults');

        modal.style.display = 'flex';

        setTimeout(() => vNumberInput.focus(), 100);

        const clearSearch = () => {
            vNumberInput.value = '';
            emailInput.value = '';
            firstNameInput.value = '';
            lastNameInput.value = '';
            resultsDiv.innerHTML = `
                <div class="text-center text-muted">
                    <i>Enter student information above to search</i>
                </div>
            `;
        };

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            clearSearch();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                clearSearch();
            }
        });

        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
                clearSearch();
            }
        };
        document.addEventListener('keydown', handleEscKey);

        const onModalHide = () => {
            if (modal.style.display === 'none') {
                document.removeEventListener('keydown', handleEscKey);
                modal.removeEventListener('transitionend', onModalHide);
            }
        };
        modal.addEventListener('transitionend', onModalHide);


        const performSearch = async () => {
            const vNumber = vNumberInput.value.trim();
            const email = emailInput.value.trim();
            const firstName = firstNameInput.value.trim();
            const lastName = lastNameInput.value.trim();
            const status = 'all'; // Default status for search

            if (!vNumber && !email && !firstName && !lastName) {
                resultsDiv.innerHTML = `<div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i> Please enter at least one search criteria
            </div>`;
                return;
            }

            resultsDiv.innerHTML = '<div class="text-center p-3" id="searchLoadingDiv"></div>';
            const searchLoadingDiv = document.getElementById('searchLoadingDiv');
            HelperFunctions.setButtonLoadingState(searchLoadingDiv, true, 'fa-search', 0, 'Searching...');

            try {
                // Use centralized launchCheck function
                const response = await DataService.launchCheck(email, vNumber, firstName, lastName, status);

                if (!response || !response.success) {
                    resultsDiv.innerHTML = `
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-circle"></i> 
                            Search failed. Please check and update your Launch credentials in extension settings.
                        </div>
                    `;
                    return;
                }

                const studentList = response.students;
                if (typeof response === 'string') {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = response;

                    const studentListInput = tempDiv.querySelector('#studentSchoolList');
                    if (studentListInput && studentListInput.value) {
                        try {
                            studentList = JSON.parse(studentListInput.value);
                        } catch (e) {
                            console.error('Failed to parse student list JSON:', e);
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
                                    const student = {
                                        userID: cells[0].textContent.trim(),
                                        firstName: cells[1] ? cells[1].textContent.trim() : '',
                                        lastName: cells[2] ? cells[2].textContent.trim() : '',
                                        registryDate: cells[3] ? cells[3].textContent.trim() : '',
                                        school: cells[4] ? cells[4].textContent.trim() : '',
                                        code: vNumberMatch ? vNumberMatch[1] : ''
                                    };
                                    studentList.push(student);
                                }
                            });
                        }
                    }
                }

                if (studentList.length > 0) {
                    resultsDiv.innerHTML = `
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>V-Number</th>
                                    <th>First Name</th>
                                    <th>Last Name</th>
                                    <th>Campus</th>
                                    <th>Registry Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="launchResultsBody">
                            </tbody>
                        </table>
                    `;

                    const tbody = document.getElementById('launchResultsBody');

                    studentList.forEach(student => {
                        const studentObj = {
                            code: student.code,
                            userID: student.userID,
                            firstName: student.firstName,
                            lastName: student.lastName,
                            username: `${student.firstName} ${student.lastName}`,
                            registryDate: student.registryDate,
                            campus: student.school
                        };

                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td style="vertical-align: middle;">${student.code || 'N/A'}</td>
                            <td style="vertical-align: middle;">${student.firstName}</td>
                            <td style="vertical-align: middle;">${student.lastName}</td>
                            <td style="vertical-align: middle;">${student.school || 'N/A'}</td>
                            <td style="vertical-align: middle;">${student.registryDate || 'N/A'}</td>
                            <td style="vertical-align: middle;">
                                <button class="btn btn-sm btn-launch">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </td>
                        `;

                        const launchBtn = tr.querySelector('.btn-launch');
                        launchBtn.addEventListener('click', async () => {
                            HelperFunctions.setButtonLoadingState(launchBtn, true, 'fa-paper-plane', 0);

                            await HelperFunctions.sendMessage('launchUserDetails', {
                                student: studentObj,
                                vNumber: student.code
                            });

                            HelperFunctions.setButtonLoadingState(launchBtn, false, 'fa-paper-plane');
                        });

                        tbody.appendChild(tr);
                    });
                } else {
                    resultsDiv.innerHTML = `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i> 
                            No students found matching your search criteria
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Search error:', error);
                resultsDiv.innerHTML = `<div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> An error occurred during search. Please try again.
            </div>`;
            }
        }

        searchBtn.addEventListener('click', performSearch);

        const handleEnterKey = (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        };
        vNumberInput.addEventListener('keydown', handleEnterKey);
        emailInput.addEventListener('keydown', handleEnterKey);
    }

    static showKPIModal() {
        console.log("🔧 Creating KPI Report modal...");
        const modalHTML = `
            <div id="kpiReportModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h4 class="modal-title">KPI Report Generator</h4>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            <strong>KPI Graduates Report</strong><br>
                            This will generate a PowerBI report for graduates from January 1, 2025 to April 30, 2025.
                        </div>
                        <div class="form-group">
                            <label for="startDate">Start Date:</label>
                            <input type="date" id="kpiStartDate" class="form-control" value="2025-01-01">
                        </div>
                        <div class="form-group">
                            <label for="endDate">End Date:</label>
                            <input type="date" id="kpiEndDate" class="form-control" value="2025-04-30">
                        </div>
                        <div class="form-group">
                            <label for="schoolSelect">School:</label>
                            <select id="kpiSchoolSelect" class="form-control">
                                <option value="5589">Bay/Queen</option>
                            </select>
                        </div>
                            <div class="text-center">
                                <button id="testBackground" class="btn btn-info btn-sm" style="margin-right: 10px;">
                                    <i class="fas fa-vial"></i> Test Background
                                </button>
                                <button id="generateKPIReport" class="btn btn-success btn-lg">
                                    <i class="fas fa-chart-line"></i> Generate KPI Report
                                </button>
                            </div>
                        <div id="kpiReportStatus" class="mt-3" style="display: none;">
                            <div class="alert alert-info">
                                <i class="fas fa-spinner fa-spin"></i> Generating report...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (!document.getElementById('kpiReportModal')) {
            console.log("📝 Adding modal HTML to DOM...");
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            console.log("✅ Modal HTML added to DOM");
        } else {
            console.log("ℹ️ Modal already exists in DOM");
        }

            const modal = document.getElementById('kpiReportModal');
            console.log("🔍 Modal element found:", modal);
            const closeBtn = modal.querySelector('.modal-close');
            const generateBtn = document.getElementById('generateKPIReport');
            const testBtn = document.getElementById('testBackground');
            const statusDiv = document.getElementById('kpiReportStatus');
            
            console.log("🔍 Buttons found:", {
                closeBtn: !!closeBtn,
                generateBtn: !!generateBtn,
                testBtn: !!testBtn,
                statusDiv: !!statusDiv
            });

        modal.classList.add('active');
        console.log("👁️ Modal should now be visible");

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            statusDiv.style.display = 'none';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                statusDiv.style.display = 'none';
            }
            });

            testBtn.addEventListener('click', () => {
                console.log("🧪 Testing background script communication...");
                console.log("🔍 Chrome runtime available:", !!chrome.runtime);
                console.log("🔍 SendMessage available:", !!chrome.runtime.sendMessage);
                
                if (chrome.runtime.lastError) {
                    console.log("❌ Chrome runtime error:", chrome.runtime.lastError);
                }
                
                chrome.runtime.sendMessage({ action: 'test' }, (response) => {
                    console.log("🧪 Test response:", response);
                    console.log("🔍 Chrome runtime lastError:", chrome.runtime.lastError);
                    
                    if (response && response.success) {
                        statusDiv.innerHTML = `
                            <div class="alert alert-success">
                                <i class="fas fa-check-circle"></i> Background script is working! ${response.message}
                            </div>
                        `;
                        statusDiv.style.display = 'block';
                    } else {
                        const errorMsg = chrome.runtime.lastError?.message || 'No response';
                        console.log("❌ Error details:", errorMsg);
                        statusDiv.innerHTML = `
                            <div class="alert alert-danger">
                                <i class="fas fa-exclamation-circle"></i> Background script test failed: ${errorMsg}
                            </div>
                        `;
                        statusDiv.style.display = 'block';
                    }
                });
            });

            // Remove existing event listener to prevent duplicates
            generateBtn.removeEventListener('click', generateBtn.kpiReportHandler);
            
            // Create the handler function
            generateBtn.kpiReportHandler = async () => {
                try {
                    console.log("🚀 Starting KPI report generation...");
                    generateBtn.disabled = true;
                    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
                    statusDiv.style.display = 'block';

                    // Get form values
                    const startDate = document.getElementById('kpiStartDate').value;
                    const endDate = document.getElementById('kpiEndDate').value;
                    const schoolId = document.getElementById('kpiSchoolSelect').value;

                    console.log("📅 Form values:", { startDate, endDate, schoolId });

                    // Format dates for the API
                    const formatDateForAPI = (dateStr) => {
                        const date = new Date(dateStr);
                        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                                      'July', 'August', 'September', 'October', 'November', 'December'];
                        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
                    };

                    const formattedStartDate = formatDateForAPI(startDate);
                    const formattedEndDate = formatDateForAPI(endDate);

                    console.log("📅 Formatted dates:", { formattedStartDate, formattedEndDate });

                    const requestData = {
                        startDate: formattedStartDate,
                        endDate: formattedEndDate,
                        schoolId: schoolId
                    };

                    console.log("📤 Sending message to background script:", {
                        action: 'getKPIReport',
                        data: requestData
                    });

                    // Send message to background script to generate report
                    const messageTimeout = setTimeout(() => {
                        console.log("⏰ Request timeout - no response from background script");
                        statusDiv.innerHTML = `
                            <div class="alert alert-warning">
                                <i class="fas fa-exclamation-triangle"></i> Request timeout. Please try again.
                            </div>
                        `;
                        generateBtn.disabled = false;
                        generateBtn.innerHTML = '<i class="fas fa-chart-line"></i> Generate KPI Report';
                    }, 30000); // 30 second timeout

                    chrome.runtime.sendMessage({
                        action: 'getKPIReport',
                        data: requestData
                    }, (response) => {
                        clearTimeout(messageTimeout);
                        console.log("📥 Response from background script:", response);
                    if (response && response.success) {
                        statusDiv.innerHTML = `
                            <div class="alert alert-success">
                                <i class="fas fa-check-circle"></i> Report generated successfully! Check the new tab.
                            </div>
                        `;
                             setTimeout(() => {
                                 modal.classList.remove('active');
                                 statusDiv.style.display = 'none';
                             }, 2000);
                    } else {
                        statusDiv.innerHTML = `
                            <div class="alert alert-danger">
                                <i class="fas fa-exclamation-circle"></i> Error: ${response?.error || 'Failed to generate report'}
                            </div>
                        `;
                    }
                    
                        generateBtn.disabled = false;
                        generateBtn.innerHTML = '<i class="fas fa-chart-line"></i> Generate KPI Report';
                    });

                    // Handle case where no response is received
                    if (chrome.runtime.lastError) {
                        clearTimeout(messageTimeout);
                        console.log("❌ Chrome runtime error:", chrome.runtime.lastError);
                        statusDiv.innerHTML = `
                            <div class="alert alert-danger">
                                <i class="fas fa-exclamation-circle"></i> Error: ${chrome.runtime.lastError.message}
                            </div>
                        `;
                        generateBtn.disabled = false;
                        generateBtn.innerHTML = '<i class="fas fa-chart-line"></i> Generate KPI Report';
                    }

                } catch (error) {
                console.error('Error generating KPI report:', error);
                statusDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle"></i> Error: ${error.message}
                    </div>
                `;
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-chart-line"></i> Generate KPI Report';
            }
            };
            
            // Add the event listener
            generateBtn.addEventListener('click', generateBtn.kpiReportHandler);
    }

    static enhanceAttendanceList() {
        return HelperFunctions.urlCheck([CONFIG.ATTENDANCE_URL], async function () {
            try {
                // Check URL parameters for date range
                const urlParams = new URLSearchParams(window.location.search);
                const type = urlParams.get('type');
                const fromDate = urlParams.get('from_date');
                const toDate = urlParams.get('to_date');

                // Check if date range exceeds 30 days
                if (type === 'Date_wise' && fromDate && toDate) {
                    const from = new Date(fromDate);
                    const to = new Date(toDate);

                    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
                        const diffTime = Math.abs(to - from);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays > 30) {
                            // Show warning and exit early
                            const tableContainer = document.querySelector('.table-responsive');
                            if (tableContainer) {
                                const warningDiv = document.createElement('div');
                                warningDiv.className = 'alert alert-warning';
                                warningDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Date range exceeds 30 days. Please select a shorter date range for enhanced view.';
                                tableContainer.parentNode.insertBefore(warningDiv, tableContainer);
                            }
                            return; // Exit early without enhancing
                        }
                    }
                }

                // Find the table container
                const tableContainer = document.querySelector('.table-responsive');
                if (!tableContainer) {
                    console.error("Table container not found!");
                    return;
                }

                // Hide the original pagination row
                const possiblePaginationRows = tableContainer.closest('.col-12').querySelectorAll('.row');
                possiblePaginationRows.forEach(row => {
                    if (row.querySelector('.pagination')) {
                        row.style.display = 'none';
                    }
                });

                // Show loading indicator
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'alert alert-info';
                HelperFunctions.setButtonLoadingState(loadingDiv, true, 'fa-spinner', 0, 'Initializing attendance data processor...');
                tableContainer.parentNode.insertBefore(loadingDiv, tableContainer);
                tableContainer.style.opacity = '0.5';

                // Create container for overage tables
                let overageContainer = document.getElementById('attendance-overages');
                if (!overageContainer) {
                    overageContainer = document.createElement('div');
                    overageContainer.id = 'attendance-overages';
                    overageContainer.className = 'attendance-overages';
                    overageContainer.style.display = 'none';
                    tableContainer.parentNode.insertBefore(overageContainer, tableContainer);
                }

                // Get form parameters
                const formElements = {
                    'type': document.querySelector('select[name="type"]')?.value || 'Today',
                    'monthName': document.querySelector('select[name="monthName"]')?.value || '',
                    'yearName': document.querySelector('select[name="yearName"]')?.value || '',
                    'from_date': document.querySelector('input[name="from_date"]')?.value || '',
                    'to_date': document.querySelector('input[name="to_date"]')?.value || '',
                    'start_date_form': document.querySelector('input[name="start_date_form"]')?.value || '',
                    'start_from_date': document.querySelector('input[name="start_from_date"]')?.value || '',
                    'start_to_date': document.querySelector('input[name="start_to_date"]')?.value || '',
                };

                // Setup attendance control buttons
                UIManager.initializeAttendanceButtons(tableContainer, formElements);

                // Update loading message
                HelperFunctions.setButtonLoadingState(loadingDiv, true, 'fa-spinner', 0, 'Requesting attendance data from server...');

                // Convert form elements to URLSearchParams instead of FormData
                const params = new URLSearchParams();
                Object.entries(formElements).forEach(([key, value]) => {
                    params.append(key, value);
                });
                params.append('campus', '');
                params.append('studentlist', '');

                // Create the correct request with proper headers and URLSearchParams body
                const response = await fetch('attendExcel.php', {
                    method: 'POST',
                    headers: {
                        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'content-type': 'application/x-www-form-urlencoded',
                        'cache-control': 'no-cache',
                        'pragma': 'no-cache',
                        'upgrade-insecure-requests': '1'
                    },
                    body: params.toString(),
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch Excel data: ${response.status} ${response.statusText}`);
                }

                // Get blob from response
                const blob = await response.blob();

                // Process Excel directly (no caching)
                DataTableManager.processExcelFile(blob, tableContainer, loadingDiv);

            } catch (error) {
                console.error('Error enhancing attendance list:', error);

                // Handle error display
                const loadingDiv = document.querySelector('.alert-info');
                if (loadingDiv) {
                    loadingDiv.className = 'alert alert-danger';
                    loadingDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error: ' + error.message;
                }

                const tableContainer = document.querySelector('.table-responsive');
                if (tableContainer) {
                    tableContainer.style.opacity = '1';
                }
            }
        })();
    }

    static initializeAttendanceButtons(tableContainer, formElements) {
        // Get the Download Excel button and its form
        const downloadExcelButton = document.querySelector('button[name="studentlist"]');
        const downloadForm = downloadExcelButton ? downloadExcelButton.closest('form') : null;

        if (downloadForm && !document.getElementById('attendance-controls-wrapper')) {
            // Create wrapper for form and buttons
            const controlsWrapper = document.createElement('div');
            controlsWrapper.id = 'attendance-controls-wrapper';
            controlsWrapper.style.display = 'flex';
            controlsWrapper.style.alignItems = 'flex-end';
            controlsWrapper.style.justifyContent = 'flex-end';
            controlsWrapper.style.gap = '10px';

            // Move the form into wrapper
            const formParent = downloadForm.parentNode;
            formParent.insertBefore(controlsWrapper, downloadForm);

            // Create the Check Attendance button
            const checkAttendanceBtn = document.createElement('button');
            checkAttendanceBtn.id = 'checkAttendanceBtn';
            checkAttendanceBtn.className = 'btn btn-info btn-sm';
            checkAttendanceBtn.disabled = true;
            checkAttendanceBtn.innerHTML = '<i class="fas fa-clock"></i> Check Attendance';

            // Add button to wrapper FIRST (before the download form)
            controlsWrapper.appendChild(checkAttendanceBtn);

            // Add the download form AFTER the button
            controlsWrapper.appendChild(downloadForm);

            const headerElement = document.querySelector('h3.bg-white.p-2');
            if (headerElement) {
                headerElement.style.display = 'flex';
                headerElement.style.justifyContent = 'space-between';
                headerElement.style.alignItems = 'center';
                headerElement.style.width = '100%';
            }
        }
    }

    static enhanceProgressUpload() {
        return HelperFunctions.urlCheck([CONFIG.PROGRESS_UPLOAD_URL], async function () {
            function cleanupProgressData() {
                chrome.runtime.sendMessage({
                    action: 'cleanProgressSheetData'
                }, function (response) {
                    console.log('Progress data cleanup completed:', response.success);
                });
            }

            try {
                // Find the submit button's container
                const submitButton = document.querySelector('input[type="submit"][name="submit"]');
                if (!submitButton) {
                    console.error("Submit button not found");
                    return;
                }

                const buttonContainer = submitButton.parentElement;

                // Add progress bar to the button container
                const progressBarHTML = `
                    <div class="progress mb-3" style="height: 40px; font-size: inherit; font-weight: 600; display: none; position: relative;">
                        <div id="fetchProgress" class="progress-bar progress-bar-striped progress-bar-animated" 
                            role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                        <button id="stopProgressBtn" class="btn btn-sm btn-danger" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); display: none;" type="button">
                            <i class="fas fa-stop"></i> Stop
                        </button>
                    </div>
                    `;
                buttonContainer.insertAdjacentHTML('afterbegin', progressBarHTML);

                // Create the "Generate and Submit" button
                const generateSubmitButton = document.createElement('button');
                generateSubmitButton.type = 'button';
                generateSubmitButton.className = 'btn btn-success btn-sm';
                generateSubmitButton.innerHTML = '<i class="fas fa-upload"></i> Generate and Submit';
                generateSubmitButton.style.marginRight = '10px';

                // Insert the buttons
                buttonContainer.insertBefore(generateSubmitButton, submitButton);

                // Create container for the results
                const resultContainer = document.createElement('div');
                resultContainer.className = 'row mt-3';
                resultContainer.innerHTML = `
                    <div class="col-md-12">
                        <!-- New container for missing In Progress students -->
                        <div id="missingInProgressContainer" style="display: none; margin-bottom: 20px;">
                            <div class="card">
                                <div class="card-header text-black bg-warning">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h5 class="mb-0"><i class="fas fa-exclamation-triangle"></i> Students without In Progress status</h5>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="table-responsive">
                                        <table id="missingInProgressTable" class="table table-sm table-striped table-bordered" style="width: 100%!important;">
                                            <thead>
                                                <tr>
                                                    <th>Program Name</th>
                                                    <th>Student Name</th>
                                                    <th>V-Number</th>
                                                    <th>Personal Email</th>
                                                    <th>Campus Email</th>
                                                    <th>Phone Number</th>
                                                    <th>CPL</th>
                                                    <th>Last Course</th>
                                                </tr>
                                            </thead>
                                            <tbody></tbody>
                                        </table>
                                    </div>
                                    <p class="text-muted mt-2">
                                        <small><strong>Note:</strong> These students do not have any courses with "In Progress" status but have courses with "Not Started" status.</small>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <!-- Original CSV preview container -->
                        <div id="csvResultContainer" style="display: none;">
                            <div class="card">
                                <div class="card-header text-black">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h5 class="mb-0">Generated CSV Data</h5>
                                        <button id="downloadMergedCSV" class="btn btn-sm btn-success" type="button">
                                            <i class="fas fa-download"></i> Download CSV
                                        </button>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="table-responsive">
                                        <table id="csvPreviewTable" class="table table-sm table-striped table-bordered">
                                            <thead>
                                                <tr>
                                                    <th>Vnumber</th>
                                                    <th>Contact</th>
                                                    <th>CourseID</th>
                                                    <th>ContractCourseID</th>
                                                    <th>Course</th>
                                                    <th>CourseStatus</th>
                                                    <th>StartDate</th>
                                                    <th>EndDate</th>
                                                    <th>Grade</th>
                                                </tr>
                                            </thead>
                                            <tbody></tbody>
                                        </table>
                                    </div>
                                    <p class="text-muted mt-2">
                                        <small><strong>Note:</strong> Special characters have been replaced as required.</small>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // Find the form's inner-form container
                const innerForm = document.querySelector('.inner-form');
                if (!innerForm) {
                    console.error("Form container not found");
                    return;
                }

                // Append the result container after the form's inner div
                innerForm.parentElement.insertBefore(resultContainer, innerForm.nextSibling);

                // Set up variables for storing the data
                let csvData = []; // Declare outside the click handler scope
                let isProcessing = false; // Track if processing is active
                let abortController = null; // Controller to abort fetch requests

                // Get reference to the stop button
                const stopProgressBtn = document.getElementById('stopProgressBtn');

                // Add event listener to stop button only if it exists
                if (stopProgressBtn) {
                    stopProgressBtn.addEventListener('click', function () {
                        if (isProcessing && abortController) {
                            // Store a reference to the abort controller before nullifying it
                            const controller = abortController;

                            // Update UI to show cancellation
                            const progressBar = document.getElementById('fetchProgress');
                            progressBar.className = 'progress-bar bg-danger';
                            progressBar.textContent = 'Operation cancelled by user';
                            progressBar.style.width = '100%'; // Set to 100% to show completion

                            // Hide the stop button
                            this.style.display = 'none';

                            // Re-enable other buttons and restore their original state
                            HelperFunctions.setButtonLoadingState(generatePreviewButton, false, 'fa-sync-alt', 0, 'Generate and Preview CSV');
                            HelperFunctions.setButtonLoadingState(generateSubmitButton, false, 'fa-upload', 0, 'Generate and Submit');

                            // Reset processing flag immediately
                            isProcessing = false;

                            // Send cancellation message to background script
                            chrome.runtime.sendMessage({ action: 'stopProgressSheetData' });

                            // Abort after setting flags
                            controller.abort();

                            // Clean up any listeners that might be active
                            if (typeof cleanupListeners === 'function') {
                                cleanupListeners();
                                cleanupProgressData();
                            }

                            // Add a flag to ignore further updates
                            progressBar.dataset.cancelled = 'true';

                            // Set to null AFTER aborting
                            abortController = null;
                        }
                    });
                }

                // Add event listener for the download button IMMEDIATELY after inserting it into the DOM
                const downloadButton = document.getElementById('downloadMergedCSV');
                if (downloadButton) {
                    downloadButton.addEventListener('click', function () {
                        if (!csvData || csvData.length === 0) {
                            ErrorHandler.showAlert('<b>Error:</b>&nbsp;No data available to download', 'error', 5000);
                            return;
                        }

                        try {
                            console.log(`Preparing to download CSV with ${csvData.length} records`);

                            // Convert data to CSV format
                            const headers = ['Vnumber', 'Contact', 'CourseID', 'ContractCourseID', 'Course', 'CourseStatus', 'StartDate', 'EndDate', 'Grade'];
                            const csvRows = [headers.join(',')];

                            csvData.forEach(row => {
                                const values = headers.map(header => {
                                    const value = row[header] || '';
                                    // Escape commas and quotes, wrap in quotes
                                    return `"${value.toString().replace(/"/g, '""')}"`;
                                });
                                csvRows.push(values.join(','));
                            });

                            const csvContent = csvRows.join('\n');

                            // Create and download the file
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.setAttribute('href', url);
                            link.setAttribute('download', 'ProgressSheet.csv');
                            link.style.display = 'none';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);

                            const progressBar = document.getElementById('fetchProgress');
                            if (progressBar) {
                                progressBar.style.width = '100%';
                                progressBar.className = 'progress-bar bg-success';
                                progressBar.textContent = `CSV file downloaded successfully with ${csvData.length} records.`;
                            }
                            cleanupProgressData();
                        } catch (error) {
                            ErrorHandler.showAlert('<b>Error:</b>&nbsp;Error downloading CSV: ${error.message}', 'error', 3000);
                        }
                    });
                } else {
                    console.warn("Download button not found in the DOM after insertion");
                }

                // Function to find missing In Progress students
                const findMissingInProgressStudents = async (csvData, activeStudentsData) => {
                    const progressBar = document.getElementById('fetchProgress');
                    if (!progressBar) return [];

                    progressBar.textContent = 'Identifying students without In Progress status with Not Started courses...';

                    // Get unique V-numbers from CSV data
                    const uniqueVnumbers = [...new Set(csvData.map(row => row.Vnumber))];

                    // Create a map to track if any student has In Progress courses and Not Started courses
                    const studentStatusMap = {};
                    uniqueVnumbers.forEach(vno => {
                        studentStatusMap[vno.toLowerCase()] = {
                            hasInProgress: false,
                            hasNotStarted: false,
                            lastCourseEndDate: null,
                            lastCourseName: '',
                            notStartedCourses: [],
                            studentInfo: null
                        };
                    });

                    // Check each student's courses for In Progress status and Not Started status
                    csvData.forEach(row => {
                        const vno = row.Vnumber.toLowerCase();

                        if (row.CourseStatus === 'In Progress') {
                            studentStatusMap[vno].hasInProgress = true;
                        }

                        if (row.CourseStatus === 'Not Started') {
                            studentStatusMap[vno].hasNotStarted = true;
                            studentStatusMap[vno].notStartedCourses.push(row.Course);
                        }

                        // Track the latest end date course for each student
                        if (row.EndDate) {
                            const endDate = new Date(row.EndDate);
                            if (!studentStatusMap[vno].lastCourseEndDate ||
                                endDate > studentStatusMap[vno].lastCourseEndDate) {
                                studentStatusMap[vno].lastCourseEndDate = endDate;
                                studentStatusMap[vno].lastCourseName = row.Course;
                            }
                        }
                    });

                    // Find students who don't have any In Progress courses BUT have Not Started courses
                    const missingInProgress = [];

                    // Get student information from active students data
                    activeStudentsData.forEach(student => {
                        // Check if this student is in our CSV data (normalize the V-number comparison)
                        const vNumber = student['VNumber'] || student['Vnumber'] || student['V Number'];
                        if (!vNumber) return;

                        const vnoLower = vNumber.toLowerCase();

                        if (studentStatusMap[vnoLower]) {
                            // This is a student without In Progress courses but with Not Started courses
                            if (!studentStatusMap[vnoLower].hasInProgress && studentStatusMap[vnoLower].hasNotStarted) {
                                const studentInfo = {
                                    programName: student['Program'] || 'N/A',
                                    studentName: student['Student Name'] || `${student['First Name'] || ''} ${student['Last Name'] || ''}`.trim() || 'N/A',
                                    vNumber: vNumber,
                                    personalEmail: student['EP(Email Id)'] || student['Email'] || 'N/A',
                                    campusEmail: student['Username(Email Id)'] || 'N/A',
                                    phoneNumber: student['Contact No.'] || 'N/A',
                                    cpl: student['CPL'] || 'No',
                                    lastCourse: studentStatusMap[vnoLower].lastCourseName || 'N/A'
                                };

                                missingInProgress.push(studentInfo);
                            }
                        }
                    });

                    return missingInProgress;
                };

                // Function to display missing In Progress students
                const displayMissingInProgressStudents = (students) => {
                    const missingInProgressContainer = document.getElementById('missingInProgressContainer');

                    if (!missingInProgressContainer) {
                        console.error("Missing In Progress container not found");
                        return;
                    }

                    if (students.length === 0) {
                        missingInProgressContainer.style.display = 'none';
                        return;
                    }

                    try {
                        // Initialize or destroy existing DataTable
                        if ($.fn.DataTableManager.isDataTable('#missingInProgressTable')) {
                            $('#missingInProgressTable').DataTable().destroy();
                        }

                        // Clear previous content
                        $('#missingInProgressTable tbody').empty();

                        // Format phone numbers for all students
                        students.forEach(student => {
                            // Format phone number if it's a valid number
                            if (student.phoneNumber && student.phoneNumber !== 'N/A') {
                                // Convert to string first to ensure .replace is available
                                let phoneText = String(student.phoneNumber).replace(/\D/g, '');
                                phoneText = phoneText.slice(-10); // Get last 10 digits if longer

                                if (phoneText.length === 10) {
                                    student.formattedPhoneNumber = `(${phoneText.slice(0, 3)}) ${phoneText.slice(3, 6)}-${phoneText.slice(6)}`;
                                } else {
                                    student.formattedPhoneNumber = String(student.phoneNumber);
                                }
                            } else {
                                student.formattedPhoneNumber = student.phoneNumber || 'N/A';
                            }
                        });

                        // Initialize DataTable with fixed layout settings for proper alignment

                        // Add event listener for copy icons
                        $('#missingInProgressTable').on('click', '.copy-icon', function () {
                            const textToCopy = $(this).data('copy');
                            if (textToCopy && navigator.clipboard) {
                                navigator.clipboard.writeText(textToCopy)
                                    .then(() => {
                                        HelperFunctions.showInlineCopyAlert(this);
                                    })
                                    .catch(err => {
                                        console.error('Failed to copy text: ', err);
                                    });
                            }
                        });

                        // Add Download Results button to the card header
                        const cardHeader = missingInProgressContainer.querySelector('.card-header .d-flex');
                        if (cardHeader) {
                            // Create Download button
                            const downloadButton = document.createElement('button');
                            downloadButton.id = 'downloadMissingInProgressData';
                            downloadButton.className = 'btn btn-sm btn-success';
                            downloadButton.type = 'button';
                            downloadButton.innerHTML = '<i class="fas fa-download"></i> Download Results';

                            // Add button to header
                            cardHeader.appendChild(downloadButton);

                            // Add click event to download button
                            if (downloadButton) {
                                downloadButton.addEventListener('click', () => {
                                    try {
                                        // Create workbook
                                        const wb = XLSX.utils.book_new();

                                        // Convert table data to worksheet
                                        const table = $('#missingInProgressTable').DataTable();
                                        const data = table.data().toArray();

                                        // Create headers array
                                        const headers = [
                                            'Program Name', 'Student Name', 'V-Number', 'Personal Email',
                                            'Campus Email', 'Phone Number', 'CPL', 'Last Course'
                                        ];

                                        // Prepare data with headers
                                        const wsData = [headers];
                                        data.forEach(row => {
                                            wsData.push([
                                                row.programName,
                                                row.studentName,
                                                row.vNumber,
                                                row.personalEmail,
                                                row.campusEmail,
                                                row.formattedPhoneNumber || row.phoneNumber,
                                                row.cpl,
                                                row.lastCourse
                                            ]);
                                        });

                                        // Create worksheet and add to workbook
                                        const ws = XLSX.utils.aoa_to_sheet(wsData);
                                        XLSX.utils.book_append_sheet(wb, ws, "Missing In Progress");

                                        // Generate file name with current date/time
                                        const date = new Date();
                                        const dateStr = date.toISOString().split('T')[0];
                                        const fileName = `Missing_In_Progress_Students_${dateStr}.xlsx`;

                                        // Generate Excel file and trigger download
                                        XLSX.writeFile(wb, fileName);

                                    } catch (error) {
                                        ErrorHandler.showAlert('<b>Error:</b>&nbsp;Error generating Excel file. Please try again.', 'error', 5000);
                                    }
                                });
                            }
                        }

                        // Show the container
                        missingInProgressContainer.style.display = 'block';
                    } catch (error) {
                        console.error('Error displaying missing In Progress students:', error);
                    }
                };

                // Function to fetch active students data
                const getActiveStudentsData = async () => {
                    const progressBar = document.getElementById('fetchProgress');
                    if (!progressBar) return [];

                    progressBar.textContent = 'Fetching active students data...';

                    try {
                        // Download the active student Excel file
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

                        if (!activeStudentsResponse.ok) {
                            throw new Error(`Failed to download active students list: ${activeStudentsResponse.status}`);
                        }

                        progressBar.textContent = 'Processing active students data...';
                        const activeStudentsBlob = await activeStudentsResponse.blob();
                        const activeStudentsBuffer = await activeStudentsBlob.arrayBuffer();

                        // Parse the Excel file
                        const workbook = XLSX.read(new Uint8Array(activeStudentsBuffer), { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);

                        return jsonData;
                    } catch (error) {
                        console.error('Error fetching active students data:', error);
                        return [];
                    }
                };

                // Function to process CSV data
                const processCsvData = async (showPreview = true) => {
                    // Define these variables at the top of the function so they're accessible in the finally block
                    let progressListener = null;
                    let storageListener = null;
                    const progressBar = document.getElementById('fetchProgress');
                    if (!progressBar) {
                        console.error("Progress bar element not found");
                        return;
                    }
                    const progressBarContainer = progressBar.parentElement;

                    // Reset abort controller for new operation
                    abortController = new AbortController();
                    isProcessing = true;

                    // Reset progress bar to default state when starting operation
                    progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated';
                    progressBar.style.width = '0%';
                    progressBar.textContent = '0%';
                    progressBar.dataset.cancelled = 'false'; // Reset state

                    progressBarContainer.style.display = 'block';

                    // Show stop button only if it exists
                    if (stopProgressBtn) {
                        stopProgressBtn.style.display = 'block'; // Show stop button when processing starts
                    }

                    // Define the cleanupListeners function early so it's accessible everywhere in this scope
                    const cleanupListeners = () => {
                        if (progressListener) {
                            chrome.runtime.onMessage.removeListener(progressListener);
                            progressListener = null;
                        }
                        if (storageListener) {
                            chrome.storage.onChanged.removeListener(storageListener);
                            storageListener = null;
                        }
                        console.log("Listeners cleaned up successfully");
                    };

                    try {
                        await chrome.storage.local.remove('progressSheetProgress');

                        // Disable the buttons during operation
                        HelperFunctions.setButtonLoadingState(generatePreviewButton, true, 'fa-sync-alt', 0, 'Processing...');

                        if (!showPreview) {
                            HelperFunctions.setButtonLoadingState(generateSubmitButton, true, 'fa-upload', 0, 'Processing...');
                        }

                        // Setup progress listener
                        progressListener = (message) => {
                            if (message.action === 'progressUpdate') {
                                if (progressBar.dataset.cancelled !== 'true') {
                                    progressBar.style.width = message.data.progress + '%';
                                    progressBar.textContent = message.data.message;
                                }
                            } else if (message.action === 'progressError') {
                                progressBar.className = 'progress-bar bg-danger';
                                progressBar.style.width = '100%';
                                progressBar.textContent = `Error: ${message.data.error}`;
                                if (stopProgressBtn) {
                                    stopProgressBtn.style.display = 'none';
                                }
                            }
                        };

                        // Add message listener for progress updates
                        chrome.runtime.onMessage.addListener(progressListener);

                        // Add storage change listener to monitor progress updates
                        storageListener = (changes, namespace) => {
                            if (changes.progressSheetProgress && namespace === 'local') {
                                const newValue = changes.progressSheetProgress.newValue;
                                if (newValue && progressBar.dataset.cancelled !== 'true') {
                                    progressBar.style.width = newValue.progress + '%';
                                    progressBar.textContent = newValue.message;

                                    if (newValue.isError) {
                                        progressBar.className = 'progress-bar bg-danger';
                                        if (stopProgressBtn) {
                                            stopProgressBtn.style.display = 'none';
                                        }
                                    }
                                }
                            }
                        };

                        // Add the storage listener
                        chrome.storage.onChanged.addListener(storageListener);

                        // Request data from background script
                        const response = await new Promise(resolve => {
                            let retries = 0;
                            const maxRetries = 3;

                            const sendMessage = () => {
                                chrome.runtime.sendMessage({ action: 'progressSheetData' }, (result) => {
                                    if (chrome.runtime.lastError) {
                                        console.error('Error sending message:', chrome.runtime.lastError);
                                        if (retries < maxRetries) {
                                            retries++;
                                            setTimeout(sendMessage, 1000); // retry after 1 second
                                        } else {
                                            resolve({ success: false, error: 'Failed to communicate with background script after multiple attempts' });
                                        }
                                    } else {
                                        resolve(result);
                                    }
                                });
                            };

                            sendMessage();
                        });

                        if (abortController && abortController.signal && abortController.signal.aborted) {
                            cleanupProgressData();
                            console.log("Operation cancelled by user");
                        }

                        if (!response || !response.success) {
                            cleanupProgressData();
                            throw new Error(response?.error || 'Failed to fetch data from T2202 portal');
                        }

                        // Get data from storage using the key provided in the response
                        csvData = await new Promise(resolve => {
                            chrome.storage.local.get(response.dataKey, result => {
                                resolve(result[response.dataKey] || []);
                            });
                        });

                        if (abortController.signal.aborted) {
                            cleanupProgressData();
                            console.log("Operation cancelled by user");
                        }

                        // Get active students data
                        const activeStudentsData = await getActiveStudentsData();

                        // Find missing In Progress students
                        const missingInProgressStudents = await findMissingInProgressStudents(csvData, activeStudentsData);

                        // Display missing In Progress students
                        displayMissingInProgressStudents(missingInProgressStudents);

                        // If we're submitting directly, do that now
                        if (!showPreview) {
                            await submitCSVData(csvData);
                            return;
                        }

                        // Display preview (first 20 rows)
                        const previewData = csvData.slice(0, 20);
                        const tableBody = document.querySelector('#csvPreviewTable tbody');
                        if (tableBody) {
                            tableBody.innerHTML = '';

                            previewData.forEach(row => {
                                const tr = document.createElement('tr');
                                tr.innerHTML = `
                                    <td>${row.Vnumber || ''}</td>
                                    <td>${row.Contact || ''}</td>
                                    <td>${row.CourseID || ''}</td>
                                    <td>${row.ContractCourseID || ''}</td>
                                    <td>${row.Course || ''}</td>
                                    <td>${row.CourseStatus || ''}</td>
                                    <td>${row.StartDate || ''}</td>
                                    <td>${row.EndDate || ''}</td>
                                    <td>${row.Grade || ''}</td>
                                `;
                                tableBody.appendChild(tr);
                            });
                        }

                        // Show the result container
                        const csvResultContainer = document.getElementById('csvResultContainer');
                        if (csvResultContainer) {
                            csvResultContainer.style.display = 'block';
                        }

                        progressBar.style.width = '100%';
                        progressBar.className = 'progress-bar bg-success';
                        progressBar.textContent = `Successfully processed ${csvData.length} records. Found ${missingInProgressStudents.length} students without "In Progress" courses but with "Not Started" courses.`;

                    } catch (error) {
                        console.log('Error generating CSV:', error);

                        if (error.message === "Operation cancelled by user") {
                            cleanupProgressData();
                            progressBar.className = 'progress-bar bg-danger';
                            progressBar.style.width = '100%';
                            progressBar.textContent = 'Operation cancelled by user';
                        } else {
                            cleanupProgressData();
                            progressBar.className = 'progress-bar bg-danger';
                            progressBar.style.width = '100%';
                            progressBar.textContent = `Error: ${error.message}`;
                        }

                    } finally {
                        cleanupListeners();
                        cleanupProgressData();

                        isProcessing = false;

                        if (stopProgressBtn) {
                            stopProgressBtn.style.display = 'none';
                        }

                        // Re-enable the buttons
                        HelperFunctions.setButtonLoadingState(generateSubmitButton, false, 'fa-upload', 0, 'Generate and Submit');
                    }
                };

                // Function to submit CSV data
                const submitCSVData = async (data) => {
                    const progressBar = document.getElementById('fetchProgress');
                    if (!progressBar) {
                        console.error("Progress bar element not found");
                        return;
                    }

                    const fileInput = document.querySelector('input[name="progress_sheet"]');
                    const addedByInput = document.querySelector('input[name="added_by"]');

                    if (!fileInput || !addedByInput) {
                        console.error("Required form inputs not found");
                        return;
                    }

                    // Create form data for submission
                    const formData = new FormData();

                    // Convert CSV data to file
                    const csvRows = [
                        'Vnumber,Contact,CourseID,ContractCourseID,Course,CourseStatus,StartDate,EndDate,Grade'
                    ];

                    data.forEach(row => {
                        const values = [
                            row.Vnumber || '',
                            row.Contact || '',
                            row.CourseID || '',
                            row.ContractCourseID || '',
                            row.Course || '',
                            row.CourseStatus || '',
                            row.StartDate || '',
                            row.EndDate || '',
                            row.Grade || ''
                        ].map(val => `"${val.toString().replace(/"/g, '""')}"`);

                        csvRows.push(values.join(','));
                    });

                    const csvContent = csvRows.join('\n');
                    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
                    const csvFile = new File([csvBlob], 'ProgressSheet.csv', { type: 'text/csv' });

                    formData.append('progress_sheet', csvFile);
                    formData.append('added_by', addedByInput.value);
                    formData.append('submit', 'Submit');

                    try {
                        progressBar.textContent = 'Submitting to server...';

                        // Submit the form data
                        const response = await fetch('https://aoltorontoagents.ca/student_contract/clgStActive/prgCsvFile.php', {
                            method: 'POST',
                            body: formData,
                            credentials: 'include'
                        });

                        if (response.status === 504) {
                            progressBar.className = 'progress-bar bg-success';
                            progressBar.textContent = 'CSV data submitted successfully!';

                            // Create success notification
                            const notification = document.createElement('div');
                            notification.className = 'alert alert-success mt-3';
                            notification.innerHTML = '<strong>Success!</strong> Your progress data has been uploaded.';
                            progressBar.parentElement.parentElement.appendChild(notification);
                        } else if (!response.ok) {
                            cleanupProgressData();
                            throw new Error(`Server returned status ${response.status}`);
                        } else {
                            cleanupProgressData();
                            progressBar.className = 'progress-bar bg-success';
                            progressBar.textContent = 'CSV data submitted successfully!';

                            // Create success notification
                            const notification = document.createElement('div');
                            notification.className = 'alert alert-success mt-3';
                            notification.innerHTML = '<strong>Success!</strong> Your progress data has been uploaded.';
                            progressBar.parentElement.parentElement.appendChild(notification);
                        }
                    } catch (error) {
                        cleanupProgressData();
                        console.log('Error submitting CSV:', error);
                        progressBar.className = 'progress-bar bg-danger';
                        progressBar.textContent = `Error: ${error.message}`;
                    }
                };

                // Add event listener for the generate and submit button
                if (generateSubmitButton) {
                    generateSubmitButton.addEventListener('click', () => processCsvData(false));
                }

            } catch (error) {
                cleanupProgressData();
                console.error('Error in enhanceProgressUpload:', error);
            }
        })();
    }

    static updateAcmeListButtons() {
        return HelperFunctions.urlCheck([CONFIG.ACMELISTS_URL], async function () {
            try {
                // Get cached results for efficiency - use CacheManager instead of direct storage access
                const cachedVerifastResults = await CacheManager.getAllVerifastResults();
                const cachedLaunchResults = await CacheManager.getAllLaunchResults();

                // Find the email column index
                const thElements = HelperFunctions.evaluateXPath(
                    "//table/thead/tr/th",
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
                );

                let emailColumnIndex = 5;
                for (let i = 0; i < thElements.snapshotLength; i++) {
                    const th = thElements.snapshotItem(i);
                    if (th && th.textContent && th.textContent.toLowerCase().includes('email')) {
                        emailColumnIndex = i + 1;
                        break;
                    }
                }

                // Find all Verifast buttons on the page
                const verifastButtons = document.querySelectorAll('.btn-verifast');

                // Update each Verifast button
                verifastButtons.forEach(button => {
                    const row = button.closest('tr');
                    if (!row) return;

                    const vNumberCell = row.querySelector(`td:nth-child(${emailColumnIndex - 1})`);
                    const vNumber = vNumberCell?.childNodes[1]?.textContent?.trim() || '';

                    const emailCell = row.querySelector(`td:nth-child(${emailColumnIndex})`);
                    if (!emailCell) return;

                    // Handle CloudFlare email protection
                    let emailText = '';
                    const cfEmailElement = emailCell.querySelector('[data-cfemail]');

                    if (cfEmailElement && cfEmailElement.dataset.cfemail) {
                        // Found CloudFlare protected email - decode it
                        emailText = HelperFunctions.decodeCfEmail(cfEmailElement.dataset.cfemail);
                        console.log('CloudFlare protected email found and decoded:', emailText);
                    } else {
                        // Regular email handling
                        emailText = emailCell?.childNodes[2]?.textContent?.trim() || '';
                    }

                    if (!emailText) return;

                    const emailTrimmed = emailText.toLowerCase().trim();
                    console.log('Email:', emailTrimmed);

                    const cacheKey = vNumber ? `${vNumber.toLowerCase()}_${emailTrimmed}` : emailTrimmed;

                    // Check for cached Verifast results and update button if found
                    if (cachedVerifastResults[cacheKey] ||
                        (!vNumber && cachedVerifastResults[emailTrimmed] &&
                            cachedVerifastResults[emailTrimmed].data &&
                            cachedVerifastResults[emailTrimmed].data.verifastStatus === 'ID Verified')) {

                        const cachedData = cachedVerifastResults[cacheKey] || cachedVerifastResults[emailTrimmed];
                        const tooltip = button.querySelector('.tooltiptext');

                        button.innerHTML = '<i class="fas fa-check" style="color:green"></i>';
                        if (tooltip) {
                            tooltip.textContent = `ID Verified (${cachedData.data.verifiedDate})`;
                        }
                    }
                });

                // Find and update Launch buttons
                const launchButtons = document.querySelectorAll('.btn-launch');

                // Update each Launch button
                launchButtons.forEach(button => {
                    // Skip buttons that are children of the result div (already created result buttons)
                    if (button.closest('div[style*="margin-top: -25px"]')) return;

                    const row = button.closest('tr');
                    if (!row) return;

                    const vNumberCell = row.querySelector(`td:nth-child(${emailColumnIndex - 1})`);
                    const vNumber = vNumberCell?.childNodes[1]?.textContent?.trim() || '';

                    const emailCell = row.querySelector(`td:nth-child(${emailColumnIndex})`);
                    if (!emailCell) return;

                    // Handle CloudFlare email protection
                    let emailText = '';
                    const cfEmailElement = emailCell.querySelector('[data-cfemail]');

                    if (cfEmailElement && cfEmailElement.dataset.cfemail) {
                        // Found CloudFlare protected email - decode it
                        emailText = HelperFunctions.decodeCfEmail(cfEmailElement.dataset.cfemail);
                    } else {
                        // Regular email handling
                        emailText = emailCell?.childNodes[2]?.textContent?.trim() || '';
                    }

                    if (!emailText) return;

                    const emailTrimmed = emailText.toLowerCase().trim();
                    const cacheKey = vNumber ? `${vNumber.toLowerCase()}_${emailTrimmed}` : emailTrimmed;

                    // Check for cached Launch results and update button if found
                    if (cachedLaunchResults[cacheKey] ||
                        (!vNumber && cachedLaunchResults[emailTrimmed])) {
                        const cachedResult = cachedLaunchResults[cacheKey] || cachedLaunchResults[emailTrimmed];
                        // FIX: Get checkDate from the nested data object
                        const checkDate = (cachedResult && cachedResult.data && cachedResult.data.checkDate)
                            ? cachedResult.data.checkDate
                            : 'Unknown date';

                        // Remove existing tooltip if any
                        const existingTooltip = button.querySelector('.tooltiptext');
                        if (existingTooltip) {
                            existingTooltip.remove();
                        }

                        const tooltip = UIManager.createTooltip(`Launch Records Verified (cached: ${checkDate})`, {
                            top: '0'
                        });
                        button.innerHTML = '<i class="fas fa-check" style="color:green"></i>';
                        button.appendChild(tooltip);
                    }
                });

                console.log('Dynamically updated Verifast and Launch buttons');

            } catch (error) {
                console.error('Error updating ACME list buttons:', error);
            }
        })();
    }

    static addAnalyseCoursesButton() {
        return HelperFunctions.urlCheck([CONFIG.ACTIVE_LISTS_URL], function () {
            try {
                // Find the Download Excel button container
                const downloadExcelButton = document.querySelector('button[name="studentlist"]');
                const accessUrls = ['purchase_list.php', 'warningLists.php', 'addMyProgressCsv.php'];
                const hasAccess = accessUrls.some(url => document.querySelector(`a[href*="${url}"]`));
                if (!downloadExcelButton || !hasAccess || !downloadExcelButton.parentElement) {
                    return;
                }

                // Check if button already exists
                if (document.getElementById('analyseCoursesButton')) {
                    return;
                }

                const urlParams = new URLSearchParams(window.location.search);

                // List of all filter parameters that indicate meaningful filtering
                const filterParams = [
                    'crsFltr', 'keywordLists', 'statusFilter', 'csFltr'
                ];

                // Check if any filter parameter has a non-empty value
                const hasActiveFilters = filterParams.some(param => {
                    const value = urlParams.get(param);
                    return value && value.trim() !== '';
                });

                if (hasActiveFilters) {
                    console.log("Skipping Analyse Courses button - no active filters");
                    return;
                }

                // Create Analyse Courses button
                const analyseCoursesButton = document.createElement('button');
                analyseCoursesButton.id = 'analyseCoursesButton';
                analyseCoursesButton.type = 'button';
                analyseCoursesButton.className = 'btn btn-warning btn-sm';
                analyseCoursesButton.innerHTML = '<i class="fas fa-chart-line"></i> Analyse Courses';
                analyseCoursesButton.style.marginRight = '10px';

                // Add button to DOM
                downloadExcelButton.parentElement.insertBefore(analyseCoursesButton, downloadExcelButton);

                // Add click event listener
                analyseCoursesButton.addEventListener('click', DataService.handleCoursesAnalysis);

            } catch (error) {
                console.error('Error adding Analyse Courses button:', error);
            }
        })();
    }

    static checkUniqueIdentifierDuplicates() {
        return HelperFunctions.urlCheck([CONFIG.UNIQUE_IDENTIFIER_URL], async function () {
            try {
                const studentPerPageSpan = document.querySelector('span.download-btn.float-md-right.pt-2.mr-2');
                if (studentPerPageSpan) {
                    studentPerPageSpan.remove();
                }
                const downloadButton = document.querySelector('button[name="studentlist"]');
                if (downloadButton) {
                    downloadButton.className = 'btn btn-sm btn-success download-btn float-right';
                }
                const headerElement = document.querySelector('h3.my-0.py-0');
                if (headerElement) {
                    headerElement.style.display = 'flex';
                    headerElement.style.justifyContent = 'space-between';
                    headerElement.style.alignItems = 'center';
                }

                if (!downloadButton || downloadButton.dataset.duplicateCheckerAdded) return;
                downloadButton.dataset.duplicateCheckerAdded = 'true';

                // Create single "Check Duplicates" button
                const checkDuplicatesButton = document.createElement('button');
                checkDuplicatesButton.type = 'button';
                checkDuplicatesButton.className = 'btn btn-warning btn-sm';
                checkDuplicatesButton.style.marginRight = '10px';
                checkDuplicatesButton.innerHTML = '<i class="fas fa-search"></i> Check Duplicates';

                downloadButton.parentNode.insertBefore(checkDuplicatesButton, downloadButton);

                const setupDownloadButton = (btnId, duplicatesData) => {
                    const downloadBtn = document.getElementById(btnId);
                    if (!downloadBtn) {
                        console.warn(`Download button with ID '${btnId}' not found.`);
                        return;
                    }

                    downloadBtn.addEventListener('click', function () {
                        try {
                            if (!duplicatesData || duplicatesData.length === 0) {
                                ErrorHandler.showAlert('<b>Info:</b>&nbsp;No data to download.', 'info', 3000);
                                return;
                            }

                            // Create workbook and worksheet
                            const ws = XLSX.utils.json_to_sheet(duplicatesData);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "Duplicate Students");

                            // Generate filename with current date
                            const date = new Date().toISOString().split('T')[0];
                            const filename = `Duplicate_Students_${date}.xlsx`;

                            // Download the file
                            XLSX.writeFile(wb, filename);

                        } catch (err) {
                            ErrorHandler.showAlert(`<b>Error:</b>&nbsp;Failed to download results: ${err.message}`, 'error', 5000);
                        }
                    });
                };

                // Function to clean student names
                const cleanStudentName = (name) => {
                    if (!name) return '';

                    // Convert to string and trim
                    let cleanedName = String(name).trim();

                    // Remove prefixes (case insensitive)
                    const prefixes = ['mr', 'mrs', 'ms', 'miss', 'dr', 'mr.', 'mrs.', 'ms.', 'miss.', 'dr.'];
                    prefixes.forEach(prefix => {
                        const regex = new RegExp(`\\b${prefix}\\b`, 'gi');
                        cleanedName = cleanedName.replace(regex, '');
                    });

                    // Remove all non-letter and non-space characters
                    cleanedName = cleanedName.replace(/[^a-zA-Z\s]/g, '');

                    // Replace multiple spaces with single space and trim
                    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();

                    return cleanedName;
                };

                // Function to parse date to YYYY-MM-DD format
                const parseToDateFormat = (dateValue) => {
                    if (!dateValue) return '';

                    let parsedDate;

                    // Handle Excel serial number
                    if (typeof dateValue === 'number') {
                        try {
                            parsedDate = HelperFunctions.convertExcelDate(dateValue);
                        } catch (error) {
                            console.warn('Error converting Excel date:', dateValue);
                            return '';
                        }
                    } else {
                        // Handle string dates
                        const dateString = String(dateValue).trim();
                        if (!dateString) return '';

                        // Try to parse various date formats
                        parsedDate = new Date(dateString);

                        // If parsing failed, try other formats
                        if (isNaN(parsedDate.getTime())) {
                            // Try MM/DD/YYYY format
                            const mmddyyyy = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                            if (mmddyyyy) {
                                parsedDate = new Date(mmddyyyy[3], mmddyyyy[1] - 1, mmddyyyy[2]);
                            }
                        }
                    }

                    // Return YYYY-MM-DD format or empty string if invalid
                    if (parsedDate && !isNaN(parsedDate.getTime())) {
                        return parsedDate.toISOString().split('T')[0];
                    }

                    return '';
                };

                // Main duplicate check handler
                const handleDuplicateCheck = async (clickedButton) => {
                    try {
                        HelperFunctions.setButtonLoadingState(clickedButton, true, 'fa-search', 0, 'Downloading...');

                        // Get Excel data
                        const downloadForm = clickedButton.closest('form');
                        if (!downloadForm) throw new Error('Could not find the form for the Excel download');

                        const actionUrl = downloadForm.getAttribute('action');
                        const blob = await DataService.getStudentListExcel({}, actionUrl);

                        HelperFunctions.setButtonLoadingState(clickedButton, true, 'fa-search', 0, 'Processing...');

                        const { data: excelData } = await HelperFunctions.processExcelBlob(blob, [], {
                            includeWorkbook: true,
                            processAllDates: true
                        });

                        if (!excelData || excelData.length === 0) {
                            throw new Error('No data found in Excel file');
                        }

                        // Find required columns
                        const headers = Object.keys(excelData[0]);
                        const nameColumn = headers.find(h => h.includes('St.Name') || h.includes('Student Name') || h.includes('Name'));
                        const emailColumn = headers.find(h => h.includes('Email'));
                        const phoneColumn = headers.find(h => h.includes('Phone') || h.includes('Contact'));
                        const dobColumn = headers.find(h => h.includes('DOB') || h.includes('Birth'));
                        const uidColumn = headers.find(h => h === 'UID');
                        const programColumn = headers.find(h => h.includes('Program'));
                        const campusColumn = headers.find(h => h.includes('Campus'));
                        const startDateColumn = headers.find(h => h.includes('Start Date'));
                        const endDateColumn = headers.find(h => h.includes('End Date'));

                        if (!nameColumn || !emailColumn || !phoneColumn || !uidColumn) {
                            throw new Error('Required columns not found in the data');
                        }

                        HelperFunctions.setButtonLoadingState(clickedButton, true, 'fa-search', 0, 'Cleaning data...');

                        // Process and clean data
                        const processedData = excelData
                            .filter(row => {
                                // Filter out rows containing "test" in student name
                                const name = String(row[nameColumn] || '').toLowerCase();
                                return !name.includes('test');
                            })
                            .map(row => ({
                                uid: row[uidColumn] || '',
                                studentName: cleanStudentName(row[nameColumn]),
                                program: row[programColumn] || '',
                                campus: row[campusColumn] || '',
                                email: String(row[emailColumn] || '').toLowerCase().trim(),
                                phone: String(row[phoneColumn] || '').replace(/\D/g, ''),
                                dob: parseToDateFormat(row[dobColumn]),
                                startDate: parseToDateFormat(row[startDateColumn]),
                                endDate: parseToDateFormat(row[endDateColumn])
                            }))
                            .filter(row => row.studentName && row.uid); // Only keep rows with valid student name and UID

                        HelperFunctions.setButtonLoadingState(clickedButton, true, 'fa-search', 0, 'Finding duplicates...');

                        // Group by student name
                        const nameGroups = {};
                        processedData.forEach(row => {
                            if (!nameGroups[row.studentName]) {
                                nameGroups[row.studentName] = [];
                            }
                            nameGroups[row.studentName].push(row);
                        });

                        // Find duplicates within each group
                        const duplicates = [];

                        Object.entries(nameGroups).forEach(([studentName, records]) => {
                            // Get unique UIDs in this group
                            const uniqueUIDs = [...new Set(records.map(r => r.uid))];

                            // Only process groups with multiple different UIDs
                            if (uniqueUIDs.length <= 1) return;

                            // Check for email duplicates
                            const emailCounts = {};
                            records.forEach(r => {
                                if (r.email) {
                                    emailCounts[r.email] = (emailCounts[r.email] || 0) + 1;
                                }
                            });
                            const emailDup = Object.values(emailCounts).some(count => count > 1);

                            // Check for phone duplicates
                            const phoneCounts = {};
                            records.forEach(r => {
                                if (r.phone) {
                                    phoneCounts[r.phone] = (phoneCounts[r.phone] || 0) + 1;
                                }
                            });
                            const phoneDup = Object.values(phoneCounts).some(count => count > 1);

                            // Check for DOB duplicates (only if no email or phone matches)
                            let dobDup = false;
                            if (!emailDup && !phoneDup) {
                                const dobCounts = {};
                                records.forEach(r => {
                                    if (r.dob) {
                                        dobCounts[r.dob] = (dobCounts[r.dob] || 0) + 1;
                                    }
                                });
                                dobDup = Object.values(dobCounts).some(count => count > 1);
                            }

                            // Determine match type
                            let matchType = '';
                            if (emailDup && phoneDup) {
                                matchType = 'Email & Phone';
                            } else if (emailDup) {
                                matchType = 'Email';
                            } else if (phoneDup) {
                                matchType = 'Phone';
                            } else if (dobDup) {
                                matchType = 'DOB';
                            }

                            // Add records with match type to duplicates
                            if (matchType) {
                                // Remove duplicates by UID (keep only first occurrence of each UID)
                                const seenUIDs = new Set();
                                records.forEach(record => {
                                    if (!seenUIDs.has(record.uid)) {
                                        seenUIDs.add(record.uid);
                                        duplicates.push({
                                            UID: record.uid,
                                            'Student Name': record.studentName,
                                            Program: record.program,
                                            Campus: record.campus,
                                            'Start Date': record.startDate,
                                            'End Date': record.endDate,
                                            Email: record.email,
                                            Phone: record.phone,
                                            DOB: record.dob,
                                            'Match Type': matchType
                                        });
                                    }
                                });
                            }
                        });

                        // Sort by Student Name, then by UID
                        duplicates.sort((a, b) => {
                            if (a['Student Name'] !== b['Student Name']) {
                                return a['Student Name'].localeCompare(b['Student Name']);
                            }
                            // Convert UIDs to strings before comparing
                            const uidA = String(a.UID || '');
                            const uidB = String(b.UID || '');
                            return uidA.localeCompare(uidB);
                        });

                        HelperFunctions.setButtonLoadingState(clickedButton, true, 'fa-search', 0, 'Displaying results...');

                        // Display results
                        let duplicateResultsContainer = document.getElementById('duplicate-results-container');
                        if (!duplicateResultsContainer) {
                            duplicateResultsContainer = document.createElement('div');
                            duplicateResultsContainer.id = 'duplicate-results-container';
                            duplicateResultsContainer.className = 'mt-4';
                            const targetContainer = document.querySelector('.container-fluid') || downloadForm.parentElement.parentNode;
                            targetContainer.appendChild(duplicateResultsContainer);
                        }

                        if (duplicates.length === 0) {
                            duplicateResultsContainer.innerHTML = `
                            <div class="alert alert-success">
                                <h4><i class="fas fa-check"></i> No Duplicates Found</h4>
                                <p>No duplicate students with matching criteria found in the data.</p>
                            </div>
                        `;
                        } else {
                            // Group duplicates by match type for color coding
                            const matchTypeColors = {
                                'Email & Phone': 'hsl(0, 70%, 90%)',    // Red
                                'Email': 'hsl(210, 70%, 90%)',         // Blue
                                'Phone': 'hsl(120, 70%, 90%)',         // Green
                                'DOB': 'hsl(45, 70%, 90%)'             // Yellow
                            };

                            const columns = ['UID', 'Student Name', 'Program', 'Campus', 'Start Date', 'End Date', 'Email', 'Phone', 'DOB', 'Match Type'];

                            let resultsHTML = `
                            <div class="card">
                                <div class="card-header bg-warning">
                                    <h5 class="mb-0 d-flex justify-content-between align-items-center">
                                        <span><i class="fas fa-exclamation-triangle"></i> Duplicate Students Found (${duplicates.length} records)</span>
                                        <button id="downloadDuplicatesTop" class="btn btn-sm btn-success">
                                            <i class="fas fa-download"></i> Download Results
                                        </button>
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="alert alert-info">
                                        <div class="d-flex justify-content-between align-items-center flex-wrap">
                                            <div>
                                                <strong>Filter by Match Type:</strong>
                                                <span class="ml-3 filter-legend" data-match-types="Email & Phone" style="background-color: ${matchTypeColors['Email & Phone']}; padding: 4px 8px; border-radius: 4px; cursor: pointer; border: 2px solid transparent; user-select: none;">
                                                    Email & Phone Match
                                                </span>
                                                <span class="ml-2 filter-legend" data-match-types="Email,Email & Phone" style="background-color: ${matchTypeColors['Email']}; padding: 4px 8px; border-radius: 4px; cursor: pointer; border: 2px solid transparent; user-select: none;">
                                                    Email Match
                                                </span>
                                                <span class="ml-2 filter-legend" data-match-types="Phone,Email & Phone" style="background-color: ${matchTypeColors['Phone']}; padding: 4px 8px; border-radius: 4px; cursor: pointer; border: 2px solid transparent; user-select: none;">
                                                    Phone Match
                                                </span>
                                                <span class="ml-2 filter-legend" data-match-types="DOB" style="background-color: ${matchTypeColors['DOB']}; padding: 4px 8px; border-radius: 4px; cursor: pointer; border: 2px solid transparent; user-select: none;">
                                                    DOB Match
                                                </span>
                                                <span class="ml-2 filter-legend" data-match-types="all" style="background-color: #f8f9fa; padding: 4px 8px; border-radius: 4px; cursor: pointer; border: 2px solid transparent; user-select: none;">
                                                    Show All
                                                </span>
                                            </div>
                                            <div class="mt-2 mt-md-0">
                                                <div class="input-group input-group-sm" style="width: 250px;">
                                                    <div class="input-group-prepend">
                                                        <span class="input-group-text"><i class="fas fa-search"></i></span>
                                                    </div>
                                                    <input type="text" class="form-control" id="duplicateSearchInput" placeholder="Search in table...">
                                                    <div class="input-group-append">
                                                        <button class="btn btn-outline-secondary" type="button" id="clearSearch">
                                                            <i class="fas fa-times"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Pagination Controls Top -->
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <div class="d-flex align-items-center">
                                            <label for="itemsPerPage" class="mr-2 mb-0">Items per page:</label>
                                            <select id="itemsPerPage" class="form-control form-control-sm" style="width: auto;">
                                                <option value="25">25</option>
                                                <option value="50" selected>50</option>
                                                <option value="100">100</option>
                                                <option value="200">200</option>
                                                <option value="all">All</option>
                                            </select>
                                        </div>
                                        <div id="paginationTop" class="pagination-container"></div>
                                    </div>

                                    <div class="table-responsive" style="max-height: 600px; overflow-y: auto;">
                                        <table class="table table-bordered table-striped" id="duplicatesTable">
                                            <thead class="thead-light sticky-top">
                                                <tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>
                                            </thead>
                                            <tbody id="duplicatesTableBody">
                                                <!-- Content will be populated by pagination -->
                                            </tbody>
                                        </table>
                                    </div>

                                    <!-- Pagination Controls Bottom -->
                                    <div class="d-flex justify-content-between align-items-center mt-3">
                                        <span id="filteredCount" class="text-muted">
                                            <small>Showing 0 of ${duplicates.length} records</small>
                                        </span>
                                        <div id="paginationBottom" class="pagination-container"></div>
                                    </div>

                                    <div class="card-footer d-flex justify-content-between">
                                        <span class="text-muted">
                                            <small>Students with same names but different UIDs and matching email, phone, or DOB</small>
                                        </span>
                                        <button id="downloadDuplicatesBottom" class="btn btn-sm btn-success">
                                            <i class="fas fa-download"></i> Download Results
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;

                            duplicateResultsContainer.innerHTML = resultsHTML;

                            // Pagination and filtering system
                            class DuplicateTableManager {
                                constructor(data, columns, matchTypeColors) {
                                    this.allData = data;
                                    this.filteredData = [...data];
                                    this.columns = columns;
                                    this.matchTypeColors = matchTypeColors;
                                    this.currentPage = 1;
                                    this.itemsPerPage = 50;
                                    this.currentFilter = 'all';
                                    this.currentSearchTerm = '';

                                    this.init();
                                }

                                init() {
                                    // Get DOM elements
                                    this.tableBody = document.getElementById('duplicatesTableBody');
                                    this.searchInput = document.getElementById('duplicateSearchInput');
                                    this.clearSearchBtn = document.getElementById('clearSearch');
                                    this.itemsPerPageSelect = document.getElementById('itemsPerPage');
                                    this.filteredCountSpan = document.getElementById('filteredCount');
                                    this.paginationTop = document.getElementById('paginationTop');
                                    this.paginationBottom = document.getElementById('paginationBottom');
                                    this.filterLegendItems = document.querySelectorAll('.filter-legend');

                                    // Set up event listeners
                                    this.setupEventListeners();

                                    // Initial render
                                    this.updateDisplay();

                                    // Set default active filter
                                    const showAllFilter = document.querySelector('[data-match-types="all"]');
                                    if (showAllFilter) {
                                        showAllFilter.style.border = '2px solid #007bff';
                                        showAllFilter.style.fontWeight = 'bold';
                                    }
                                }

                                setupEventListeners() {
                                    // Search functionality
                                    this.searchInput.addEventListener('input', () => {
                                        this.currentSearchTerm = this.searchInput.value.trim();
                                        this.currentPage = 1;
                                        this.applyFilters();
                                    });

                                    this.clearSearchBtn.addEventListener('click', () => {
                                        this.searchInput.value = '';
                                        this.currentSearchTerm = '';
                                        this.currentPage = 1;
                                        this.applyFilters();
                                        this.searchInput.focus();
                                    });

                                    // Items per page
                                    this.itemsPerPageSelect.addEventListener('change', () => {
                                        this.itemsPerPage = this.itemsPerPageSelect.value === 'all' ?
                                            this.filteredData.length : parseInt(this.itemsPerPageSelect.value);
                                        this.currentPage = 1;
                                        this.updateDisplay();
                                    });

                                    // Filter legend items
                                    this.filterLegendItems.forEach(item => {
                                        item.addEventListener('click', () => {
                                            // Update active state
                                            this.filterLegendItems.forEach(i => {
                                                i.style.border = '2px solid transparent';
                                                i.style.fontWeight = 'normal';
                                            });
                                            item.style.border = '2px solid #007bff';
                                            item.style.fontWeight = 'bold';

                                            // Apply filter
                                            this.currentFilter = item.dataset.matchTypes;
                                            this.currentPage = 1;
                                            this.applyFilters();
                                        });

                                        // Hover effects
                                        item.addEventListener('mouseenter', () => {
                                            if (item.style.border !== '2px solid #007bff') {
                                                item.style.border = '2px solid #ccc';
                                            }
                                        });

                                        item.addEventListener('mouseleave', () => {
                                            if (item.style.border !== '2px solid #007bff') {
                                                item.style.border = '2px solid transparent';
                                            }
                                        });
                                    });
                                }

                                applyFilters() {
                                    this.filteredData = this.allData.filter(item => {
                                        // Check filter match
                                        let matchesFilter = false;
                                        if (this.currentFilter === 'all') {
                                            matchesFilter = true;
                                        } else {
                                            const allowedTypes = this.currentFilter.split(',');
                                            matchesFilter = allowedTypes.includes(item['Match Type']);
                                        }

                                        // Check search match
                                        const matchesSearch = this.currentSearchTerm === '' ||
                                            Object.values(item).some(value =>
                                                String(value).toLowerCase().includes(this.currentSearchTerm.toLowerCase())
                                            );

                                        return matchesFilter && matchesSearch;
                                    });

                                    this.updateDisplay();
                                }

                                updateDisplay() {
                                    this.renderTable();
                                    this.renderPagination();
                                    this.updateCountDisplay();
                                }

                                renderTable() {
                                    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
                                    const endIndex = this.itemsPerPage === this.filteredData.length ?
                                        this.filteredData.length : startIndex + this.itemsPerPage;
                                    const pageData = this.filteredData.slice(startIndex, endIndex);

                                    let tableHTML = '';
                                    let currentStudentName = '';

                                    pageData.forEach((item, index) => {
                                        // Add separator between different student names
                                        if (item['Student Name'] !== currentStudentName) {
                                            if (currentStudentName !== '' && index > 0) {
                                                tableHTML += `<tr class="table-secondary"><td colspan="${this.columns.length}" style="height: 1px; padding: 0;"></td></tr>`;
                                            }
                                            currentStudentName = item['Student Name'];
                                        }

                                        const backgroundColor = this.matchTypeColors[item['Match Type']] || '';
                                        tableHTML += `<tr data-match-type="${item['Match Type']}" style="background-color: ${backgroundColor}">`;

                                        this.columns.forEach(col => {
                                            let value = item[col] || '';
                                            if (col === 'Phone' && value) {
                                                // Format phone number for display
                                                value = value.length === 10 ?
                                                    `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}` :
                                                    value;
                                            }
                                            tableHTML += `<td>${HelperFunctions.sanitizeHtml(String(value))}</td>`;
                                        });
                                        tableHTML += `</tr>`;
                                    });

                                    this.tableBody.innerHTML = tableHTML;
                                }

                                renderPagination() {
                                    const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);

                                    if (totalPages <= 1) {
                                        this.paginationTop.innerHTML = '';
                                        this.paginationBottom.innerHTML = '';
                                        return;
                                    }

                                    const paginationHTML = this.generatePaginationHTML(totalPages);
                                    this.paginationTop.innerHTML = paginationHTML;
                                    this.paginationBottom.innerHTML = paginationHTML;

                                    // Add event listeners to pagination buttons
                                    [this.paginationTop, this.paginationBottom].forEach(container => {
                                        container.querySelectorAll('.page-link').forEach(link => {
                                            link.addEventListener('click', (e) => {
                                                e.preventDefault();
                                                const page = parseInt(link.dataset.page);
                                                if (page && page !== this.currentPage) {
                                                    this.currentPage = page;
                                                    this.updateDisplay();
                                                }
                                            });
                                        });
                                    });
                                }

                                generatePaginationHTML(totalPages) {
                                    let paginationHTML = '<nav><ul class="pagination pagination-sm mb-0">';

                                    // Previous button
                                    paginationHTML += `
                                    <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                                        <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                                            <i class="fas fa-chevron-left"></i>
                                        </a>
                                    </li>
                                `;

                                    // Page numbers
                                    const maxVisiblePages = 5;
                                    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
                                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                                    if (endPage - startPage + 1 < maxVisiblePages) {
                                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                    }

                                    if (startPage > 1) {
                                        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
                                        if (startPage > 2) {
                                            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                                        }
                                    }

                                    for (let i = startPage; i <= endPage; i++) {
                                        paginationHTML += `
                                        <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                                        </li>
                                    `;
                                    }

                                    if (endPage < totalPages) {
                                        if (endPage < totalPages - 1) {
                                            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                                        }
                                        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
                                    }

                                    // Next button
                                    paginationHTML += `
                                    <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                                        <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                                            <i class="fas fa-chevron-right"></i>
                                        </a>
                                    </li>
                                `;

                                    paginationHTML += '</ul></nav>';
                                    return paginationHTML;
                                }

                                updateCountDisplay() {
                                    const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
                                    const endIndex = Math.min(this.currentPage * this.itemsPerPage, this.filteredData.length);

                                    this.filteredCountSpan.innerHTML = `
                                    <small>
                                        Showing ${this.filteredData.length === 0 ? 0 : startIndex}-${endIndex} 
                                        of ${this.filteredData.length} filtered records 
                                        (${this.allData.length} total)
                                    </small>
                                `;
                                }
                            }

                            // Initialize the table manager
                            const tableManager = new DuplicateTableManager(duplicates, columns, matchTypeColors);

                            // Setup download buttons
                            setupDownloadButton('downloadDuplicatesTop', duplicates);
                            setupDownloadButton('downloadDuplicatesBottom', duplicates);
                        }

                        HelperFunctions.setButtonLoadingState(clickedButton, false, 'fa-search', 0, 'Check Duplicates');
                        duplicateResultsContainer.scrollIntoView({ behavior: 'smooth' });

                    } catch (error) {
                        HelperFunctions.setButtonLoadingState(clickedButton, false, 'fa-exclamation-triangle', 3000, 'Error!');
                        setTimeout(() => {
                            clickedButton.innerHTML = '<i class="fas fa-search"></i> Check Duplicates';
                        }, 3000);
                        ErrorHandler.showAlert(`<b>Error:</b>&nbsp;${error.message}`, 'error', 5000);
                    }
                };

                // Add event listener to the single check duplicates button
                checkDuplicatesButton.addEventListener('click', async function () {
                    await handleDuplicateCheck(this);
                });

                console.log('Duplicate check button added successfully');

            } catch (error) {
                ErrorHandler.showAlert(`<b>Error:</b>&nbsp;Failed to initialize duplicate checker: ${error.message}`, 'error', 5000);
            }
        })();
    }

    static addFollowUpsButton() {
        return HelperFunctions.urlCheck([CONFIG.ACTIVE_LISTS_URL], function () {
            const hasAccess = !!document.querySelector('a[href*="purchase_list.php"]');

            if (!hasAccess) {
                return;
            }

            const urlParams = new URLSearchParams(window.location.search);

            // List of all filter parameters that indicate meaningful filtering
            const filterParams = [
                'crsFltr', 'keywordLists', 'statusFilter', 'csFltr'
            ];

            // Check if any filter parameter has a non-empty value
            const hasActiveFilters = filterParams.some(param => {
                const value = urlParams.get(param);
                return value && value.trim() !== '';
            });

            if (hasActiveFilters) {
                console.log("Skipping Follow-ups button - no active filters");
                return;
            }

            const followUpsButton = document.createElement('button');
            followUpsButton.id = 'followUpsButton';
            followUpsButton.type = 'button';
            followUpsButton.className = 'btn btn-sm btn-success float-sm-left mr-2';
            followUpsButton.innerHTML = '<i class="fas fa-user-clock"></i> Check Follow-ups';

            const analyseCoursesButton = document.getElementById('analyseCoursesButton');
            if (!analyseCoursesButton || analyseCoursesButton.dataset.followUpsAdded) {
                return;
            }

            followUpsButton.addEventListener('click', async function () {
                await DataService.handleFollowUpsCheck();
            });

            analyseCoursesButton.parentNode.insertBefore(followUpsButton, analyseCoursesButton);
            analyseCoursesButton.dataset.followUpsAdded = true;
        })();
    }

    static addGraduationTracker() {
        return HelperFunctions.urlCheck([CONFIG.SUPERADMIN_URL], function () {
            try {
                const downloadButton = document.querySelector('button[name="studentlist"]');
                if (!downloadButton || downloadButton.dataset.graduationTrackerAdded) {
                    return;
                }

                // Check if campusFilter parameter exists and has a value
                const urlParams = new URLSearchParams(window.location.search);
                const campusFilter = urlParams.get('campusFilter');

                if (!campusFilter || campusFilter.trim() === '') {
                    console.log("No campus filter detected, skipping graduation tracker");
                    return;
                }

                // Create graduation tracker container
                const graduationContainer = document.createElement('div');
                graduationContainer.className = 'graduation-tracker-container';
                graduationContainer.style.display = 'flex';
                graduationContainer.style.alignItems = 'center';
                graduationContainer.style.gap = '10px';
                graduationContainer.style.marginRight = '10px';

                // Create month selector
                const monthSelect = document.createElement('select');
                monthSelect.id = 'graduationMonth';
                monthSelect.className = 'form-control form-control-sm';
                monthSelect.style.width = '120px';

                const monthPlaceholder = document.createElement('option');
                monthPlaceholder.value = '';
                monthPlaceholder.textContent = 'Select Month';
                monthPlaceholder.disabled = true;
                monthPlaceholder.selected = true;
                monthSelect.appendChild(monthPlaceholder);

                const months = [
                    { value: '01', name: 'January' },
                    { value: '02', name: 'February' },
                    { value: '03', name: 'March' },
                    { value: '04', name: 'April' },
                    { value: '05', name: 'May' },
                    { value: '06', name: 'June' },
                    { value: '07', name: 'July' },
                    { value: '08', name: 'August' },
                    { value: '09', name: 'September' },
                    { value: '10', name: 'October' },
                    { value: '11', name: 'November' },
                    { value: '12', name: 'December' }
                ];

                months.forEach(month => {
                    const option = document.createElement('option');
                    option.value = month.value;
                    option.textContent = month.name;
                    monthSelect.appendChild(option);
                });

                // Create year selector
                const yearSelect = document.createElement('select');
                yearSelect.id = 'graduationYear';
                yearSelect.className = 'form-control form-control-sm';
                yearSelect.style.width = '100px';

                const currentYear = new Date().getFullYear();
                for (let year = currentYear - 1; year <= currentYear + 2; year++) {
                    const option = document.createElement('option');
                    option.value = year.toString();
                    option.textContent = year.toString();
                    if (year === currentYear) {
                        option.selected = true;
                    }
                    yearSelect.appendChild(option);
                }

                // Create graduation tracker button
                const graduationButton = document.createElement('button');
                graduationButton.id = 'graduationTrackerButton';
                graduationButton.type = 'button';
                graduationButton.className = 'btn btn-info btn-sm';
                graduationButton.innerHTML = '<i class="fas fa-graduation-cap"></i> Create Graduates Report';
                graduationButton.disabled = true; // Disabled by default until month is selected

                // Enable/disable button based on month selection
                monthSelect.addEventListener('change', function () {
                    graduationButton.disabled = !this.value;
                });

                // Add elements to container
                graduationContainer.appendChild(monthSelect);
                graduationContainer.appendChild(yearSelect);
                graduationContainer.appendChild(graduationButton);

                // Insert the container before the download button
                downloadButton.parentNode.insertBefore(graduationContainer, downloadButton);

                // Add click event listener for graduation tracker
                graduationButton.addEventListener('click', async function () {
                    const selectedMonth = monthSelect.value;
                    const selectedYear = yearSelect.value;

                    if (!selectedMonth) {
                        ErrorHandler.showAlert('<b>Error:</b>&nbsp;Please select a month', 'error', 3000);
                        return;
                    }

                    try {
                        // Set loading state
                        HelperFunctions.setButtonLoadingState(this, true, 'fa-graduation-cap', 0, 'Downloading...');

                        // Find the form and get Excel data
                        const downloadForm = graduationButton.closest('form');
                        if (!downloadForm) {
                            throw new Error('Could not find the form for the Excel download');
                        }

                        const actionUrl = downloadForm.getAttribute('action');
                        const blob = await DataService.getStudentListExcel({}, actionUrl);

                        // Update loading state
                        HelperFunctions.setButtonLoadingState(this, true, 'fa-graduation-cap', 0, 'Processing...');

                        // Process Excel data
                        const { data: excelData } = await HelperFunctions.processExcelBlob(blob, ['Finish Date'], {
                            includeWorkbook: true,
                            processAllDates: true
                        });

                        if (!excelData || excelData.length === 0) {
                            throw new Error('No data found in Excel file');
                        }

                        // Define valid graduation statuses
                        const validGraduationStatuses = [
                            'Funds Released',
                            'Funds Released 2nd',
                            'OSAP Applied',
                            'OSAP Cancelled',
                            'Start'
                        ];

                        const graduatingStudents = excelData.filter(student => {
                            const lastStatus = student['Last Status'] || student['Status'] || '';
                            const hasValidStatus = validGraduationStatuses.includes(lastStatus);

                            if (!hasValidStatus) return false;

                            const finishDate = student['Finish date'] || student['End Date'] || '';
                            if (!finishDate) return false;

                            let parsedDate;

                            try {
                                if (typeof finishDate === 'number') {
                                    const selectedYearNum = parseInt(selectedYear);
                                    const selectedMonthNum = parseInt(selectedMonth);

                                    const monthStartDate = new Date(selectedYearNum, selectedMonthNum - 1, 1);
                                    const monthEndDate = new Date(selectedYearNum, selectedMonthNum, 0); // Son gün

                                    const excelEpoch = new Date(1899, 11, 30);
                                    const minExcelDate = Math.floor((monthStartDate - excelEpoch) / (24 * 60 * 60 * 1000));
                                    const maxExcelDate = Math.floor((monthEndDate - excelEpoch) / (24 * 60 * 60 * 1000));

                                    if (finishDate < minExcelDate || finishDate > maxExcelDate) {
                                        return false; // Aralık dışında, convertExcelDate çağırma
                                    }

                                    try {
                                        parsedDate = HelperFunctions.convertExcelDate(finishDate);

                                        if (!parsedDate || isNaN(parsedDate.getTime())) {
                                            console.warn('convertExcelDate returned invalid date for:', finishDate);
                                            return false;
                                        }
                                    } catch (convertError) {
                                        console.warn('Error in convertExcelDate for:', finishDate, convertError);
                                        return false;
                                    }
                                } else if (typeof finishDate === 'string') {
                                    const dateString = finishDate.trim();
                                    if (!dateString) return false;

                                    const formattedDateString = HelperFunctions.formatDateString(dateString);
                                    if (formattedDateString && formattedDateString !== dateString) {
                                        parsedDate = new Date(formattedDateString);
                                    }

                                    if (!parsedDate || isNaN(parsedDate.getTime())) {
                                        parsedDate = new Date(dateString);
                                    }

                                    if (isNaN(parsedDate.getTime())) {
                                        const mmddyyyy = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                                        if (mmddyyyy) {
                                            parsedDate = new Date(mmddyyyy[3], mmddyyyy[1] - 1, mmddyyyy[2]);
                                        }

                                        if (isNaN(parsedDate.getTime())) {
                                            const ddmmyyyy = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                                            if (ddmmyyyy) {
                                                parsedDate = new Date(ddmmyyyy[3], ddmmyyyy[2] - 1, ddmmyyyy[1]);
                                            }
                                        }

                                        if (isNaN(parsedDate.getTime())) {
                                            const yyyymmdd = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                                            if (yyyymmdd) {
                                                parsedDate = new Date(yyyymmdd[1], yyyymmdd[2] - 1, yyyymmdd[3]);
                                            }
                                        }
                                    }
                                } else {
                                    console.warn('Unknown date format:', finishDate, typeof finishDate);
                                    return false;
                                }

                                if (!parsedDate || isNaN(parsedDate.getTime())) {
                                    console.warn('Could not parse finish date:', finishDate);
                                    return false;
                                }

                                const year = parsedDate.getFullYear();
                                if (year < 2000 || year > 2050) {
                                    ErrorHandler.showAlert('Date out of reasonable range: ' + finishDate + ' (V-Number: ' + (student['V-number'] || student['VNo.'] || student['V Number'] || 'N/A') + ')', 'error');
                                }

                                const finishMonth = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
                                const finishYear = parsedDate.getFullYear().toString();

                                return finishMonth === selectedMonth && finishYear === selectedYear;

                            } catch (error) {
                                console.log('Error processing finish date:', finishDate, error);
                                return false;
                            }
                        });

                        // Update loading state
                        HelperFunctions.setButtonLoadingState(this, true, 'fa-graduation-cap', 0, 'Generating Excel...');

                        if (graduatingStudents.length === 0) {
                            HelperFunctions.setButtonLoadingState(this, false, 'fa-graduation-cap', 0, 'Create Graduates Report');
                            ErrorHandler.showAlert(`<b>Info:</b>&nbsp;No graduating students found for ${months.find(m => m.value === selectedMonth).name} ${selectedYear}`, 'success', 5000);
                            return;
                        }

                        // Create Excel file
                        const ws = XLSX.utils.json_to_sheet(graduatingStudents);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Graduating Students');

                        // Generate filename
                        const monthName = months.find(m => m.value === selectedMonth).name;
                        const campusName = campusFilter.replace(/[^a-zA-Z0-9]/g, '_');
                        const fileName = `Graduating_Students_${monthName}_${selectedYear}_${campusName}.xlsx`;

                        // Download the file
                        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                        const resultBlob = new Blob([wbout], {
                            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        });

                        const downloadLink = document.createElement('a');
                        downloadLink.href = URL.createObjectURL(resultBlob);
                        downloadLink.download = fileName;
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                        URL.revokeObjectURL(downloadLink.href);

                        // Show success message
                        HelperFunctions.setButtonLoadingState(this, false, 'fa-check', 2000, 'Downloaded!');
                        setTimeout(() => {
                            HelperFunctions.setButtonLoadingState(this, false, 'fa-graduation-cap', 0, 'Create Graduates Report');
                        }, 2000);

                    } catch (error) {
                        HelperFunctions.setButtonLoadingState(this, false, 'fa-exclamation-triangle', 2000, 'Error!');
                        setTimeout(() => {
                            HelperFunctions.setButtonLoadingState(this, false, 'fa-graduation-cap', 0, 'Create Graduates Report');
                        }, 2000);
                        ErrorHandler.showAlert(`<b>Error:</b>&nbsp;Failed to track graduates: ${error.message}`, 'error', 5000);
                    }
                });

                downloadButton.dataset.graduationTrackerAdded = 'true';
                console.log('Graduation tracker added successfully');

            } catch (error) {
                console.error('Error adding graduation tracker:', error);
            }
        })();
    }

    static initializeTextEditor(targetSelector, options = {}) {
        const textarea = document.querySelector(targetSelector);
        if (!textarea) return null;

        // Default options
        const settings = {
            height: options.height || '250px',
            placeholder: options.placeholder || 'Enter your text here...',
            toolbarItems: options.toolbarItems || [
                'bold', 'italic', 'underline', 'strikethrough',
                'separator', 'ul', 'ol',
                'separator', 'link', 'clear'
            ]
        };

        // Create the editor container
        const editorContainer = document.createElement('div');
        editorContainer.className = 'simple-editor-container';

        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'simple-editor-toolbar';

        // Add toolbar buttons
        const createToolbarItems = () => {
            const buttons = {
                bold: { icon: 'fa-bold', title: 'Bold', command: 'bold' },
                italic: { icon: 'fa-italic', title: 'Italic', command: 'italic' },
                underline: { icon: 'fa-underline', title: 'Underline', command: 'underline' },
                strikethrough: { icon: 'fa-strikethrough', title: 'Strikethrough', command: 'strikeThrough' },
                ul: { icon: 'fa-list-ul', title: 'Bullet List', command: 'insertUnorderedList' },
                ol: { icon: 'fa-list-ol', title: 'Numbered List', command: 'insertOrderedList' },
                link: { icon: 'fa-link', title: 'Insert Link', command: 'createLink' },
                clear: { icon: 'fa-eraser', title: 'Clear Formatting', command: 'removeFormat' },
                separator: { isSeparator: true }
            };

            settings.toolbarItems.forEach(item => {
                if (item === 'separator') {
                    const separator = document.createElement('div');
                    separator.className = 'toolbar-separator';
                    toolbar.appendChild(separator);
                    return;
                }

                const button = buttons[item];
                if (!button) return;

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'editor-btn';
                btn.title = button.title;
                btn.innerHTML = `<i class="fas ${button.icon}"></i>`;

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (button.command === 'createLink') {
                        const url = prompt('Enter URL:', 'https://');
                        if (url) {
                            document.execCommand(button.command, false, url);
                        }
                    } else {
                        document.execCommand(button.command, false, null);
                    }
                    editorContent.focus();
                });

                toolbar.appendChild(btn);
            });
        };

        createToolbarItems();
        editorContainer.appendChild(toolbar);

        // Create editable content area
        const editorContent = document.createElement('div');
        editorContent.className = 'simple-editor-content';
        editorContent.contentEditable = true;
        editorContent.style.minHeight = settings.height; // We keep this one inline as it's dynamic
        editorContent.dataset.placeholder = settings.placeholder;

        // Add placeholder functionality
        editorContent.addEventListener('focus', () => {
            if (editorContent.textContent.trim() === '') {
                editorContent.innerHTML = '<p><br></p>';
            }
        });

        editorContent.addEventListener('blur', () => {
            if (editorContent.innerHTML === '<p><br></p>' || editorContent.textContent.trim() === '') {
                editorContent.innerHTML = '';
            }
        });

        // Sync editable div with hidden textarea
        const syncContent = () => {
            textarea.value = editorContent.innerHTML;
            // Trigger change event on the textarea so any event listeners can react
            const event = new Event('change', { bubbles: true });
            textarea.dispatchEvent(event);
        };

        editorContent.addEventListener('input', syncContent);
        editorContent.addEventListener('blur', syncContent);

        // Set initial content if textarea has value
        if (textarea.value) {
            editorContent.innerHTML = textarea.value;
        }

        // Add the editor content area to the container
        editorContainer.appendChild(editorContent);

        // Hide the original textarea and insert the editor
        textarea.style.display = 'none';
        textarea.parentNode.insertBefore(editorContainer, textarea);

        // Return the editor components for further customization if needed
        return {
            container: editorContainer,
            toolbar: toolbar,
            content: editorContent,
            syncContent: syncContent
        };
    }

    static renderStudentNotes(notesArray) {
        if (!notesArray || notesArray.length === 0) {
            return '<div class="text-center p-4"><i class="fas fa-info-circle"></i> No notes found for this student.</div>';
        }

        // Get current user name from sidebar
        const currentUser = DataService.getCurrentUserName();

        let notesHtml = '';
        notesArray.forEach(note => {
            // Basic sanitization for content injected into HTML
            const title = note.title ? HelperFunctions.sanitizeHtml(note.title) : 'No Title';
            const notesContent = note.notes || 'No Content'; // Don't sanitize as it may contain formatted HTML
            const createdBy = note.created_by ? HelperFunctions.sanitizeHtml(note.created_by) : 'Unknown';
            const createdDate = note.created_date ? HelperFunctions.sanitizeHtml(note.created_date) : 'Unknown Date';

            // Use the htmlId we extracted from HTML matching
            const noteId = note.htmlId || '';

            // Check if current user can delete this note
            const canDelete = note.canDelete || false;
            const deleteButton = canDelete ? `
            <button type="button" class="btn btn-sm btn-outline-danger delete-note-btn" 
                    data-note-id="${noteId}" 
                    data-note-title="${HelperFunctions.sanitizeHtml(title)}"
                    style="margin-left: 10px;" 
                    title="Delete this note">
                <i class="fas fa-trash-alt"></i>
            </button>
            ` : '';

            notesHtml += `
            <div class="notes mb-2" data-note-id="${noteId}">
                <div class="notes-body bg-light p-2">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="mb-0">${title}</h5>
                        ${deleteButton}
                    </div>
                    <div class="notes-description">
                        ${notesContent}
                    </div>
                    <p class="m-0">
                        <i><b>Sent By:</b> ${createdBy}
                        <span style="float:right; font-size: 12px;">
                            ${createdDate}
                        </span>
                        </i>
                    </p>
                </div>
            </div>
        `;
        });
        return notesHtml;
    }

    static renderNoteSubmissionForm(hiddenFieldsData) {
        const safeHiddenFields = {};
        if (hiddenFieldsData) {
            for (const key in hiddenFieldsData) {
                if (Object.hasOwnProperty.call(hiddenFieldsData, key)) {
                    safeHiddenFields[key] = hiddenFieldsData[key] ? HelperFunctions.sanitizeHtml(String(hiddenFieldsData[key])) : '';
                }
            }
        }

        return `
            <form id="enhanced-note-form">
                <input type="hidden" name="login_id" id="login_id" value="${safeHiddenFields.login_id || ''}">
                <input type="hidden" name="login_name" id="login_name" value="${safeHiddenFields.login_name || ''}">
                <input type="hidden" name="student_id" id="student_id" value="${safeHiddenFields.student_id || ''}">
                <input type="hidden" name="v_number" id="v_number" value="${safeHiddenFields.v_number || ''}">
                
                <div class="form-group">
                    <label for="note-title">Title</label>
                    <input type="text" id="note-title" class="form-control" autocomplete="off">
                </div>
                <div class="form-group">
                    <label for="note-content">Description</label>
                    <textarea id="note-content" class="form-control" rows="5"></textarea>
                    <small class="form-text text-muted">
                        <i class="fas fa-info-circle"></i> 
                        Basic formatting (bold, italic, lists) is allowed. Images and advanced formatting will be removed.
                    </small>
                </div>
                <div class="form-group">
                    <button type="submit" id="note-submit-btn" class="action-btn">
                         Create Note
                    </button>
                </div>
            </form>
        `;
    }

    static renderStudentMessages(messagesArray) {
        if (!messagesArray || messagesArray.length === 0) {
            return '<div class="text-center p-4"><i class="fas fa-info-circle"></i> No messages found for this student.</div>';
        }
        // This logic is adapted from StudentProfileManager.generateMessageRows
        return messagesArray.map(message => {
            const createdDate = message.date_added || message.created_date || '';
            const readDate = message.read_date && message.read_date !== '1969-12-31 07:00:00 pm' ?
                HelperFunctions.sanitizeHtml(message.read_date) : '';
            const seenData = message.seen_data ? HelperFunctions.sanitizeHtml(message.seen_data) : '';
            const description = message.description ? HelperFunctions.sanitizeHtml(message.description) : 'No Content';
            const createdBy = message.created_by ? HelperFunctions.sanitizeHtml(message.created_by) : 'Staff';
            const filePath = message.file_path || message.file_name;
            const sanitizedFilePath = filePath ? HelperFunctions.sanitizeHtml(filePath) : '';

            const readStatus = seenData === "2" ?
                `<span class="badge badge-success" style="font-size: 11px;" title="Read on: ${readDate}">
                    <i class="fas fa-check-circle"></i> Read
                </span>` :
                '<span class="badge badge-warning" style="font-size: 11px;">' +
                '<i class="fas fa-clock"></i> Not read yet</span>';

            return `
            <div class="notes mb-2">
                <div class="notes-body bg-light p-2">
                    <div class="notes-description">
                        ${description}
                    </div>
                    <hr style="margin: 10px 0;">
                    <div class="d-flex justify-content-between align-items-center">
                        <span><b>From:</b> ${createdBy}</span>
                        <div>
                            ${seenData ? readStatus : ''}
                            <small class="text-muted ml-2">${HelperFunctions.sanitizeHtml(createdDate)}</small>
                        </div>
                    </div>
                    ${sanitizedFilePath ? `
                        <div class="mt-2">
                            <i class="fas fa-paperclip"></i> 
                            <a href="https://aoltorontoagents.ca/student_contract/clgStActive/msg_docs/${sanitizedFilePath}" 
                               class="message-attachment" target="_blank">
                               ${sanitizedFilePath}
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>`;
        }).join('');
    }

    static renderMessageSubmissionForm(hiddenFieldsData) {
        const safeHiddenFields = {};
        if (hiddenFieldsData) {
            for (const key in hiddenFieldsData) {
                if (Object.hasOwnProperty.call(hiddenFieldsData, key)) {
                    safeHiddenFields[key] = hiddenFieldsData[key] ? HelperFunctions.sanitizeHtml(String(hiddenFieldsData[key])) : '';
                }
            }
        }

        return `
            <div class="custom-form-wrapper border-top pt-3 mt-4">
                <form id="enhanced-message-form">
                    ${Object.entries(safeHiddenFields).map(([name, value]) =>
            `<input type="hidden" name="${name}" id="${name}" value="${value || ''}">`
        ).join('')}
                    
                    <div class="form-group">
                        <label for="message-content">Message</label>
                        <textarea id="message-content" class="form-control" rows="4"></textarea>
                        <small class="form-text text-muted">
                            <i class="fas fa-info-circle"></i> 
                            Basic formatting is allowed. Images and complex formatting may be removed.
                        </small>
                    </div>
                    
                    <div class="form-group">
                        <div class="custom-file mb-3">
                            <input type="file" class="custom-file-input" id="message-attachment">
                            <label class="custom-file-label" for="message-attachment">Attach file (optional)</label>
                        </div>
                        <small class="form-text text-muted" id="file-info"></small>
                    </div>
                    
                    <div class="form-group text-right">
                        <button type="submit" id="message-submit-btn" class="action-btn">
                            Send Message
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    static renderStudentTicketsTable(ticketsArray, documentLinksMap) {
        if (!ticketsArray || ticketsArray.length === 0) {
            return `
                <div class="text-center p-4">
                    <i class="fas fa-info-circle"></i> No tickets found for this student.
                </div>`;
        }

        const styleSheets = Array.from(document.styleSheets);
        styleSheets.forEach(sheet => {
            try {
                const rules = sheet.cssRules || sheet.rules;
                if (!rules) return;
                for (let i = 0; i < rules.length; i++) {
                    const rule = rules[i];
                    if (rule.selectorText && rule.selectorText.trim() === 'a:hover') {
                        // Remove color property
                        rule.style.removeProperty('color');
                        // Set text-decoration with !important
                        rule.style.setProperty('text-decoration', 'none', 'important');
                    }
                }
            } catch (e) {
                // Ignore CORS-restricted stylesheets
            }
        });

        const rowsHtml = ticketsArray.map(ticket => {
            const ticketNo = ticket.ticket || '';
            let assignedTo = '';
            const assignSelectHtml = ticket.asssign || '';
            const selectedOptionMatch = assignSelectHtml.match(/selected='selected'[^>]*>(.*?)<\/option>/i);
            if (selectedOptionMatch && selectedOptionMatch[1]) {
                assignedTo = HelperFunctions.sanitizeHtml(selectedOptionMatch[1].trim());
            }

            let ticketId = '';
            if (ticket.action) {
                const ticketIdMatch = ticket.action.match(/\?id=(\d+)/i);
                if (ticketIdMatch && ticketIdMatch[1]) {
                    ticketId = HelperFunctions.sanitizeHtml(ticketIdMatch[1]);
                }
            }

            let docColumn = 'N/A';
            if (documentLinksMap && documentLinksMap[ticketNo]) {
                const docId = HelperFunctions.sanitizeHtml(documentLinksMap[ticketNo]);
                docColumn = `<a class="ticketdocs" href="javascript:void()" data-toggle="modal" data-target="#myModal" data-id="${docId}"><strong>View</strong></a>`;
            }

            const status = ticket.status ? HelperFunctions.sanitizeHtml(ticket.status) : '';
            const statusHtml = status === 'Processing' ? `<span style="font-weight: bold; color: green;">${status}</span>` : status;

            return `
                <tr>
                    <td>${HelperFunctions.sanitizeHtml(ticket.sr || '')}</td>
                    <td>${HelperFunctions.sanitizeHtml(ticket.date || '')}</td>
                    <td>${HelperFunctions.sanitizeHtml(ticketNo)}</td>
                    <td>${HelperFunctions.sanitizeHtml(ticket.subject || '')}</td>
                    <td>${HelperFunctions.sanitizeHtml(ticket.description || '')}</td>
                    <td>${docColumn}</td>
                    <td>${assignedTo}</td>
                    <td>${statusHtml}</td>
                    <td>
                        <a target="_blank" href="https://aoltorontoagents.ca/student_contract/chat/view_details.php?id=${ticketId}" class="action-btn" style="display:flex;justify-content: space-evenly;margin: 0 0 1px 0;">
                            <i class="fas fa-eye"></i> <strong>View</strong>
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="table-responsive">
                <table class="table table-bordered table-hover table-sm">
                    <thead class="border-top border-bottom" bgcolor="#eee">
                        <tr>
                            <th>Sr</th>
                            <th>Date</th>
                            <th>Ticket No</th>
                            <th>Subject</th>
                            <th>Description</th>
                            <th>Document</th>
                            <th>Assigned</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }

    static renderProgramCoursesTable(enhancedCourses, unmatchedCourses, programName, progressPercentage, completedCount, totalFailedCount, currentCoursesInfo, hasApiData = false) {
        const programNameSanitized = programName ? HelperFunctions.sanitizeHtml(programName) : 'N/A';
        const progressPercentageSanitized = Number.isFinite(progressPercentage) ? progressPercentage : 0;
        const completedCountSanitized = Number.isFinite(completedCount) ? completedCount : 0;
        const totalFailedCountSanitized = Number.isFinite(totalFailedCount) ? totalFailedCount : 0;

        let timelineStatus = null;
        if (hasApiData) {
            timelineStatus = this.analyzeTimelineStatus(enhancedCourses);
        }

        let currentCoursesHtml = '';
        if (currentCoursesInfo && currentCoursesInfo.length > 0) {
            currentCoursesHtml = currentCoursesInfo.map(course => `
            <div class="current-course-item">
                <medium>${course.courseName ? HelperFunctions.sanitizeHtml(course.courseName) : ''}</medium> 
                <strong>(${course.courseCode ? HelperFunctions.sanitizeHtml(course.courseCode) : ''})</strong>
            </div>
        `).join('');
        }

        // Enhanced courses HTML with conditional planned date columns
        const enhancedCoursesHtml = enhancedCourses.map((course) => {
            const statusClass = course.status === 'In Progress' ? 'table-warning' :
                course.status === 'Transferred' || course.status === 'Complete' || course.status === 'Pass' || course.status === 'Honours' ? 'table-success' :
                    course.status === 'Fail' ? 'table-danger' : '';

            const baseColumns = `
            <td>${HelperFunctions.sanitizeHtml(String(course.sequence))}</td>
            <td>${HelperFunctions.sanitizeHtml(course.courseCode)}</td>
            <td>${HelperFunctions.sanitizeHtml(course.courseName)}</td>
            <td>${HelperFunctions.sanitizeHtml(course.status)}</td>
            <td>${HelperFunctions.sanitizeHtml(course.startDate)}</td>
            <td>${HelperFunctions.sanitizeHtml(course.endDate)}</td>
        `;

            const plannedColumns = hasApiData ? `
            <td>${HelperFunctions.sanitizeHtml(HelperFunctions.formatExamDate(course.plannedStartDate))}</td>
            <td>${HelperFunctions.sanitizeHtml(HelperFunctions.formatExamDate(course.plannedFinishDate))}</td>
        ` : '';

            return `
            <tr class="${statusClass}">
                ${baseColumns}
                ${plannedColumns}
                <td>${HelperFunctions.sanitizeHtml(course.grade)}</td>
            </tr>
        `;
        }).join('');

        // Unmatched courses HTML with conditional planned date columns
        let unmatchedCoursesHtml = '';
        if (unmatchedCourses && unmatchedCourses.length > 0) {
            const totalColumns = hasApiData ? 9 : 7;
            unmatchedCoursesHtml = `
            <tr class="table-secondary">
                <td colspan="${totalColumns}" class="font-weight-bold">Unmatched Courses (from student record but not in program sequence)</td>
            </tr>
            ${unmatchedCourses.map((course) => {
                const statusClass = course.status === 'In Progress' ? 'table-warning' :
                    course.status === 'Transferred' || course.status === 'Complete' || course.status === 'Pass' || course.status === 'Honours' ? 'table-success' :
                        course.status === 'Fail' ? 'table-danger' : '';

                const baseColumns = `
                    <td>-</td>
                    <td>${HelperFunctions.sanitizeHtml(course.courseCode)}</td>
                    <td>${HelperFunctions.sanitizeHtml(course.courseName)}</td>
                    <td>${HelperFunctions.sanitizeHtml(course.status)}</td>
                    <td>${HelperFunctions.sanitizeHtml(course.startDate)}</td>
                    <td>${HelperFunctions.sanitizeHtml(course.endDate)}</td>
                `;

                const plannedColumns = hasApiData ? `
                    <td>-</td>
                    <td>-</td>
                ` : '';

                return `
                    <tr class="${statusClass}">
                        ${baseColumns}
                        ${plannedColumns}
                        <td>${HelperFunctions.sanitizeHtml(course.grade)}</td>
                    </tr>
                `;
            }).join('')}
        `;
        }

        // Table headers with conditional planned date columns
        const tableHeaders = `
        <tr>
            <th style="width: 5%">Seq</th>
            <th style="width: 10%">Course Code</th>
            <th style="width: ${hasApiData ? '35%' : '45%'}">Course Name</th>
            <th style="width: 10%">Status</th>
            <th style="width: ${hasApiData ? '12%' : '15%'}">Start Date</th>
            <th style="width: ${hasApiData ? '12%' : '15%'}">End Date</th>
            ${hasApiData ? `
                <th style="width: 12%">Planned Start</th>
                <th style="width: 12%">Planned End</th>
            ` : ''}
            <th style="width: 5%">Grade</th>
        </tr>
    `;

        // Timeline status badge (only if API data available)
        const timelineStatusBadge = timelineStatus ? `
        <span class="badge badge-${timelineStatus.colorClass} mr-2" title="${timelineStatus.description}">
            <i class="fas fa-clock"></i> ${timelineStatus.status}
        </span>
    ` : '';

        return `
        <div class="mt-3 mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h5><i class="fas fa-graduation-cap"></i> ${programNameSanitized}</h5>
                <div class="text-right" style="font-size: larger;">
                    ${timelineStatusBadge}
                    <span class="badge badge-${progressPercentageSanitized >= 75 ? 'success' : 'warning'}">${progressPercentageSanitized}% Complete</span>
                    <span class="badge badge-info">${completedCountSanitized}/${enhancedCourses.length} Courses</span>
                    ${totalFailedCountSanitized > 0 ? `<span class="badge badge-danger">${totalFailedCountSanitized} Failed</span>` : ''}
                </div>
            </div>
            <div class="progress mb-3" style="height: 10px;">
                <div class="progress-bar" role="progressbar" style="width: ${progressPercentageSanitized}%" 
                    aria-valuenow="${progressPercentageSanitized}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            ${currentCoursesHtml ? `
            <div class="alert alert-info" style="display: flex;">
                <i class="fas fa-book-reader" style="margin-right:5px"></i> Currently studying: 
                <div class="current-courses-list">
                    ${currentCoursesHtml}
                </div>
            </div>` : ''}
        </div>
        <div class="table-responsive">
            <table class="table table-bordered table-hover table-sm" id="enhancedCoursesTable">
                <thead class="border-top border-bottom" bgcolor="#eee">
                    ${tableHeaders}
                </thead>
                <tbody>
                    ${enhancedCoursesHtml}
                    ${unmatchedCoursesHtml}
                </tbody>
            </table>
        </div>
        <div class="text-right mt-2">
            <button class="btn btn-sm btn-secondary" id="toggleOriginalCourseTableBtn">
                <i class="fas fa-table"></i> Toggle Original Table
            </button>
        </div>
    `;
    }

    static analyzeTimelineStatus(enhancedCourses) {
        const inProgressCourses = enhancedCourses.filter(course => course.status === 'In Progress');
        let latestInProgressCourse = null;

        if (inProgressCourses.length > 0) {
            // Sort by sequence and get the one with highest sequence number
            latestInProgressCourse = inProgressCourses.sort((a, b) => b.sequence - a.sequence)[0];
        }

        if (!latestInProgressCourse) {
            return {
                status: 'No Data',
                colorClass: 'secondary',
                description: 'No In Progress courses found for timeline analysis'
            };
        }

        // Only analyze the latest In Progress course
        const course = latestInProgressCourse;

        // For the latest In Progress course, compare PLANNED START DATE with ACTUAL START DATE
        if (!course.plannedStartDate || course.plannedStartDate === '-') {
            return {
                status: 'No Data',
                colorClass: 'secondary',
                description: 'No planned start date available for timeline analysis'
            };
        }

        const plannedDate = new Date(course.plannedStartDate);
        if (isNaN(plannedDate.getTime())) {
            return {
                status: 'No Data',
                colorClass: 'secondary',
                description: 'Invalid planned start date for timeline analysis'
            };
        }

        if (!course.startDate || course.startDate === '-') {
            return {
                status: 'No Data',
                colorClass: 'secondary',
                description: 'No actual start date available for timeline analysis'
            };
        }

        let actualDate = new Date(course.startDate);

        // If the first parsing failed, try other common formats
        if (isNaN(actualDate.getTime())) {
            // Try parsing MM/DD/YYYY format
            const dateParts = course.startDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (dateParts) {
                actualDate = new Date(dateParts[3], dateParts[1] - 1, dateParts[2]);
            }
        }

        if (isNaN(actualDate.getTime())) {
            return {
                status: 'No Data',
                colorClass: 'secondary',
                description: 'Invalid actual start date for timeline analysis'
            };
        }


        const delayDays = Math.floor((actualDate - plannedDate) / (1000 * 60 * 60 * 24));

        // Determine status based on delay for the single In Progress course
        if (delayDays <= -7) {
            return {
                status: 'Ahead',
                colorClass: 'primary',
                description: 'Student started ahead of planned schedule'
            };
        } else if (delayDays <= 7) {
            return {
                status: 'On Track',
                colorClass: 'success',
                description: 'Student is on track with planned schedule'
            };
        } else if (delayDays <= 21) {
            return {
                status: 'Behind',
                colorClass: 'warning',
                description: 'Student started behind planned schedule'
            };
        } else {
            return {
                status: 'Far Behind',
                colorClass: 'danger',
                description: 'Student started significantly behind planned schedule'
            };
        }
    }
}

window.UIManager = UIManager;