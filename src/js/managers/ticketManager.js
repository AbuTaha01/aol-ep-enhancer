class TicketManager {

    static disableAutocomplete() {
        return HelperFunctions.urlCheck([CONFIG.TICKETS_ALL_URLS], () => {
            try {
                const inputSelectors = [
                    'input[id="date"].hasDatepicker',
                    'input[id="ticket"][placeholder="Ticket"].form-control',
                    'input[id="fname"][placeholder="First Name"].form-control',
                    'input[id="lname"][placeholder="Last Name"].form-control'
                ];
                inputSelectors.forEach(selector => {
                    const inputElement = document.querySelector(selector);
                    if (inputElement) inputElement.setAttribute('autocomplete', 'off');
                });
            } catch (error) { console.error('Error disabling autocomplete:', error); }
        })();
    }

    static removeTargetBlank() {
        return HelperFunctions.urlCheck([CONFIG.TICKETS_ALL_URLS], function () {
            // Store observer in a global reference for cleanup
            if (window._targetBlankObserver) {
                window._targetBlankObserver.disconnect();
            }

            const observer = new MutationObserver(() => {
                const links = document.querySelectorAll('#tablePagination a[target="_blank"]');

                links.forEach(link => {
                    link.removeAttribute('target');
                });
            });

            const dataTable = document.getElementById('tablePagination');
            if (dataTable) {
                observer.observe(dataTable, {
                    childList: true,
                    subtree: true
                });

                // Store reference for later cleanup
                window._targetBlankObserver = observer;

                // Add cleanup when page changes
                window.addEventListener('beforeunload', () => {
                    if (window._targetBlankObserver) {
                        window._targetBlankObserver.disconnect();
                        window._targetBlankObserver = null;
                    }
                });
            }
        })();
    }

    static addDuplicateTicketsButton() {
        return HelperFunctions.urlCheck([CONFIG.PENDING_LIST_URL], function () {
            try {
                const openTicketsListHeader = HelperFunctions.evaluateXPath("//h3[contains(text(), 'Open Tickets List')]").singleNodeValue;
                if (!openTicketsListHeader) return;
                const parentDiv = openTicketsListHeader.parentNode;
                if (!parentDiv) return;

                const duplicateTicketsButton = UIManager.createButton('Find Duplicates', TicketManager.listDuplicateTickets);
                duplicateTicketsButton.id = 'FindDuplicatesBtn';

                const showAllListButton = UIManager.createButton('Show All List', () => {
                    showAllListButton.disabled = true;
                    showAllListButton.textContent = 'Loading All Tickets...';

                    window.location.href = CONFIG.PENDING_LIST_URL;
                });
                showAllListButton.id = 'ShowAllListBtn';
                showAllListButton.style.display = 'none';

                UIManager.addElementToDOM(duplicateTicketsButton, parentDiv);
                UIManager.addElementToDOM(showAllListButton, parentDiv);
            } catch (error) {
                console.error('Error adding Duplicate Tickets button:', error);
            }
        })();
    }

    static addILPTicketsButton() {
        return HelperFunctions.urlCheck([CONFIG.PENDING_LIST_URL], function () {
            try {

                const targetDiv = document.querySelector('div.bg-white.border.border-0');

                if (targetDiv) {
                    // Grid stilini ekle
                    targetDiv.style.display = 'grid';
                    targetDiv.style.gridTemplateColumns = '9fr 2fr 2fr';

                } else {
                    console.warn('Target div with classes bg-white border border-0 not found');
                }

                const openTicketsListHeader = HelperFunctions.evaluateXPath("//h3[contains(text(), 'Open Tickets List')]").singleNodeValue;
                if (!openTicketsListHeader) return;
                const parentDiv = openTicketsListHeader.parentNode;
                if (!parentDiv) return;

                const ilpTicketsButton = UIManager.createButton('Show ILP Tickets', TicketManager.listILPTickets);
                ilpTicketsButton.id = 'ShowILPTicketsBtn';
                ilpTicketsButton.style.marginRight = '10px';

                const refreshButton = UIManager.createButton('Refresh List', TicketManager.refreshILPTickets);
                refreshButton.id = 'RefreshILPTicketsBtn';
                refreshButton.style.marginRight = '10px';
                refreshButton.style.display = 'none';

                const duplicateTicketsButton = document.getElementById('FindDuplicatesBtn');
                if (duplicateTicketsButton) {
                    parentDiv.insertBefore(ilpTicketsButton, duplicateTicketsButton);
                    parentDiv.insertBefore(refreshButton, duplicateTicketsButton);
                } else {
                    UIManager.addElementToDOM(ilpTicketsButton, parentDiv);
                    UIManager.addElementToDOM(refreshButton, parentDiv);
                }

            } catch (error) {
                console.error('Error adding ILP Tickets button:', error);
            }
        })();
    }

    static addCampusFiltersButtons() {
        try {
            if (document.readyState === 'complete') {
                const filterElement = document.getElementById('tablePagination_filter');
                if (!filterElement) return;

                // Önceki butonları temizle
                const existingContainer = filterElement.parentNode.querySelector('div[style*="display: flex"]');
                if (existingContainer) existingContainer.remove();

                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = 'display: flex; justify-content: end; gap: 5px; margin-bottom: 17px;';

                const buttons = [
                    { id: 'All', class: 'btn-success', text: 'All' },
                    { id: 'VT', class: 'btn-primary', text: 'TO' },
                    { id: 'VB', class: 'btn-warning', text: 'BR' },
                    { id: 'VN', class: 'btn-danger', text: 'NY' }
                ];

                buttons.forEach(btnInfo => {
                    const button = document.createElement('button');
                    button.id = btnInfo.id;
                    button.className = `btn ${btnInfo.class}`;
                    button.textContent = btnInfo.text;
                    button.style.minWidth = '60px';

                    if (localStorage.getItem(`${btnInfo.id}_active`) === 'true' && btnInfo.id !== 'All') {
                        button.classList.add('active');
                        button.style.border = '2px solid black';

                        // DataTable var mı kontrol et
                        if (StateManager.getDataTable()) {
                            StateManager.getDataTable().column(2).search(btnInfo.id.toLowerCase()).draw();
                        } else if (window.jQuery && window.jQuery('#vno').length) {
                            window.jQuery('#vno').val(btnInfo.id.toLowerCase()).get(0).dispatchEvent(new Event('keyup', { bubbles: true }));
                        }
                    }

                    button.addEventListener('click', () => {
                        const wasActive = button.classList.contains('active');

                        buttons.forEach(b => {
                            const el = document.getElementById(b.id);
                            if (el) {
                                el.classList.remove('active');
                                el.style.border = '2px solid #0000';
                                localStorage.setItem(`${b.id}_active`, 'false');
                            }
                        });

                        if (!wasActive) {
                            button.classList.add('active');
                            button.style.border = '2px solid black';
                            localStorage.setItem(`${btnInfo.id}_active`, 'true');

                            // DataTable var mı kontrol et
                            if (StateManager.getDataTable()) {
                                if (btnInfo.id === 'All') {
                                    StateManager.getDataTable().column(2).search('').draw();
                                } else {
                                    StateManager.getDataTable().column(2).search(btnInfo.id.toLowerCase()).draw();
                                }
                            } else if (window.jQuery && window.jQuery('#vno').length) {
                                const vnoEl = window.jQuery('#vno');
                                vnoEl.val(btnInfo.id === 'All' ? '' : btnInfo.id.toLowerCase()).get(0).dispatchEvent(new Event('keyup', { bubbles: true }));
                            }
                        } else {
                            // DataTable var mı kontrol et
                            if (StateManager.getDataTable()) {
                                StateManager.getDataTable().column(2).search('').draw();
                            } else if (window.jQuery && window.jQuery('#vno').length) {
                                window.jQuery('#vno').val('').get(0).dispatchEvent(new Event('keyup', { bubbles: true }));
                            }
                        }
                    });

                    buttonContainer.appendChild(button);
                });

                filterElement.parentNode.insertBefore(buttonContainer, filterElement);

                const lengthLabel = document.querySelector('#tablePagination_length label');
                if (lengthLabel) {
                    const sel = lengthLabel.querySelector('select');
                    if (sel) {
                        lengthLabel.textContent = 'Show ';
                        lengthLabel.appendChild(sel);
                    }
                }
            } else {
                window.addEventListener('load', () => this.addCampusFiltersButtons());
            }
        } catch (error) {
            console.error('Error in addCampusFiltersButtons:', error);
        }
    }

    static addButtons() {
        return HelperFunctions.urlCheck([CONFIG.PENDING_LIST_URL], function () {
            function addButtonsToRows() {
                for (let i = 1; i <= 1000; i++) {
                    const xpath = `//*[@id="tablePagination"]/tbody/tr[${i}]/td[text()='Pending Request' or text()='Processing']`;
                    const el = HelperFunctions.evaluateXPath(xpath).singleNodeValue;
                    if (el) {
                        el.textContent = '';
                        const button = UIManager.createButton('Assign to Me', async function () {
                            this.disabled = true;
                            this.classList.add('processing');
                            this.textContent = 'Assigning...';

                            const headers = document.querySelectorAll('#tablePagination thead th');
                            const index = Array.from(headers).findIndex(th => th.textContent.trim() === 'Assign');
                            const colIdx = index + 1;
                            const selEl = HelperFunctions.evaluateXPath(`//*[@id="tablePagination"]/tbody/tr[${i}]/td[${colIdx}]/select`).singleNodeValue;
                            const ticketId = selEl.getAttribute('ticket-id');
                            const formData = new FormData();
                            formData.append('ticket', ticketId);
                            formData.append('file_name_page', 'assign_list');

                            try {
                                const data = await HelperFunctions.fetchData('https://aoltorontoagents.ca/student_contract/chat/ticket_list_responce.php', {
                                    method: 'POST', body: formData, credentials: 'include'
                                });
                                if (data.iTotalDisplayRecords === '0') {
                                    if (selEl) DataService.assignTicket(selEl, this);
                                    else this.textContent = 'Error!';
                                } else {
                                    this.textContent = 'Already Gone';
                                    this.classList.add('already-gone');
                                }
                            } catch (error) {
                                this.textContent = 'Error!';
                                this.classList.add('error');
                            }
                        });

                        button.className = 'assign-to-me-btn-row';
                        el.appendChild(button);
                    }
                }
            }
            addButtonsToRows();
            const tableBody = document.querySelector('#tablePagination tbody');
            if (tableBody) new MutationObserver(addButtonsToRows).observe(tableBody, { childList: true, subtree: true });
        })();
    }

    static highlightILPStudents() {
        return HelperFunctions.urlCheck([CONFIG.PENDING_LIST_URL], async function () {
            try {
                const ilpResponse = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        action: 'getILPStudents',
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    });
                });

                if (!ilpResponse.success) {
                    console.warn('Failed to get ILP students list:', ilpResponse.error);
                    return;
                }

                const ilpStudents = ilpResponse.data;
                const ilpVNumbers = new Set(ilpStudents.map(student => student.vnumber));

                function highlightILPRows() {
                    const tbody = document.querySelector('#tablePagination tbody');
                    if (!tbody) return;

                    const rows = tbody.querySelectorAll('tr');
                    rows.forEach(row => {
                        const vnoCell = row.querySelector('td:nth-child(3)');
                        if (!vnoCell) return;

                        const vno = vnoCell.textContent.trim();
                        if (ilpVNumbers.has(vno)) {
                            if (!row.hasAttribute('title')) {
                                row.setAttribute('title', 'ILP Student - This student is enrolled in the ILP program');
                            }

                            const actionCell = row.querySelector('td:last-child');
                            if (actionCell && !actionCell.querySelector('.ilp-info')) {
                                const viewLink = actionCell.querySelector('a[href*="view_details.php"]');
                                if (viewLink) {
                                    const ilpInfo = document.createElement('div');
                                    ilpInfo.className = 'ilp-info';
                                    ilpInfo.textContent = 'ILP';
                                    actionCell.appendChild(ilpInfo);
                                }
                            }

                            const assignButton = row.querySelector('button');
                            if (assignButton && assignButton.textContent.includes('Assign to Me')) {
                                assignButton.classList.add('ilp-student');
                            }
                        }
                    });
                }

                // Initial highlight
                highlightILPRows();

                // Simple observer for ILP highlighting
                const tableBody = document.querySelector('#tablePagination tbody');
                if (tableBody) {
                    new MutationObserver(() => {
                        setTimeout(highlightILPRows, 100);
                    }).observe(tableBody, { childList: true, subtree: true });
                }

                // Handle DataTable events
                if (window.jQuery && window.jQuery.fn.DataTable) {
                    const $table = window.jQuery('#tablePagination');
                    if ($table.length && $table.hasClass('dataTable')) {
                        $table.on('draw.dt', function () {
                            setTimeout(highlightILPRows, 50);
                        });
                    }
                }

            } catch (error) {
                console.error('Error in highlightILPStudents:', error);
            }
        })();
    }

    static async listDuplicateTickets() {
        const jq = jQuery.noConflict();
        const duplicateTicketsButton = document.getElementById('FindDuplicatesBtn');
        const showAllListButton = document.getElementById('ShowAllListBtn');
        try {
            if (StateManager.getDataTable()) {
                StateManager.getDataTable().destroy();
                jq('#tablePagination tbody').empty();
                StateManager.setDataTable(null);
            }
            if (duplicateTicketsButton) {
                duplicateTicketsButton.textContent = 'Loading Tickets...';
                duplicateTicketsButton.disabled = true;
            }
            const response = await fetch('https://aoltorontoagents.ca/student_contract/chat/ticket_list_responce.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'draw=1&start=0&length=1000&file_name_page=pending_list'
            });
            const data = await response.json();
            const duplicateGroups = new Map();
            for (const row of data.aaData) {
                if (row.status === 'Pending Request' || row.status === 'Processing') {
                    const key = `${row.date} -${row.vno} -${row.subject} -${row.description} `;
                    if (!duplicateGroups.has(key)) duplicateGroups.set(key, []);
                    duplicateGroups.get(key).push(row);
                }
            }
            const duplicatesOnly = Array.from(duplicateGroups.entries())
                .filter(([_, group]) => group.length > 1)
                .flatMap(([_, group]) => group.map((ticket, index) => ({ ...ticket, isDuplicate: index !== 0 })))
                .sort((a, b) => new Date(a.date.replace(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) (am|pm)/i, '$1 $2 $3')) - new Date(b.date.replace(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) (am|pm)/i, '$1 $2 $3')));

            StateManager.setDataTable(jq('#tablePagination').DataTable({
                data: duplicatesOnly,
                columns: [
                    { data: "sr", title: "Sr" }, { data: "date", title: "Date" }, { data: "vno", title: "V.No" },
                    { data: "fname", title: "First Name" }, { data: "lname", title: "Last Name" },
                    {
                        data: "ticket", title: "Ticket", render: function (data, type, row) {
                            if (type === 'display' && row.isDuplicate) return `<button class="send-auto-message" data-ticket="${data}" data-vno="${row.vno}" style="background-color: green;border-radius: 0%;padding: 1px;font-size: 15px;font-weight: 600;color: white;cursor: pointer;line-height: normal;min-width: 125px;min-height: 45px;">Send Auto Message</button>`;
                            return data;
                        }
                    },
                    { data: "subject", title: "Subject" }, { data: "type", title: "Type" }, { data: "status", title: "Status" },
                    { data: "asssign_by", title: "Assign By" }, { data: "asssign", title: "Assign" },
                    { data: "description", title: "Description" }, { data: "action", title: "Action" }
                ],
                order: [], pageLength: 50, searching: true, ordering: false,
                rowCallback: function (row, data) { if (data.isDuplicate) jq(row).css('background-color', '#ffcccc'); },
                initComplete: function () {
                    ['.dataTables_length', '.dataTables_info', '.dataTables_paginate.paging_simple_numbers'].forEach(s => { const e = jq(s); if (e.length > 1) e.slice(1).hide(); });
                    if (duplicateTicketsButton && showAllListButton) { duplicateTicketsButton.style.display = 'none'; showAllListButton.style.display = 'inline-block'; }
                    jq('#tablePagination').on('click', '.send-auto-message', async function (e) {
                        e.preventDefault();
                        const btn = jq(this); const ticketId = btn.data('ticket'); const vNo = btn.data('vno'); const row = btn.closest('tr');
                        const originalTicket = row.prevAll('tr:not([style*="background-color: rgb(255, 204, 204)"]):first').find('td:eq(5)').text();
                        btn.prop('disabled', true).text('Processing...');
                        const assignBtn = row.find('button:contains("Assign to Me")');
                        if (assignBtn.length > 0) {
                            assignBtn.click();
                            const interval = setInterval(async () => {
                                if (assignBtn.text() === "Assigned") { clearInterval(interval); await DataService.sendAutoDuplicateMessage(ticketId, vNo, originalTicket, row, btn); }
                            }, 500);
                        } else { btn.prop('disabled', false).text('Send Auto Message'); }
                    });
                }
            }));
        } catch (error) {
            console.error('Error listing duplicates:', error);
            if (duplicateTicketsButton) { duplicateTicketsButton.textContent = 'Find Duplicates'; duplicateTicketsButton.disabled = false; }
            if (showAllListButton) showAllListButton.style.display = 'none';
        }
    }

    static async listILPTickets() {
        const jq = jQuery.noConflict();
        const ilpTicketsButton = document.getElementById('ShowILPTicketsBtn');
        const showAllListButton = document.getElementById('ShowAllListBtn');
        const refreshButton = document.getElementById('RefreshILPTicketsBtn');

        try {
            if (StateManager.getDataTable()) {
                StateManager.getDataTable().destroy();
                jq('#tablePagination tbody').empty();
                StateManager.setDataTable(null);
            }

            if (ilpTicketsButton) {
                ilpTicketsButton.textContent = 'Loading ILP Tickets...';
                ilpTicketsButton.disabled = true;
            }

            const ilpResponse = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'getILPStudents',
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            if (!ilpResponse.success) {
                throw new Error('Failed to get ILP students list: ' + ilpResponse.error);
            }

            const response = await fetch('https://aoltorontoagents.ca/student_contract/chat/ticket_list_responce.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'draw=1&start=0&length=1000&file_name_page=pending_list'
            });

            const data = await response.json();
            const ilpStudents = ilpResponse.data;

            const ilpVNumbers = new Set(ilpStudents.map(student => student.vnumber));

            const ilpTickets = data.aaData.filter(row => {
                return (row.status === 'Pending Request' || row.status === 'Processing') &&
                    ilpVNumbers.has(row.vno);
            }).sort((a, b) => new Date(a.date.replace(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) (am|pm)/i, '$1 $2 $3')) -
                new Date(b.date.replace(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) (am|pm)/i, '$1 $2 $3')));

            StateManager.setDataTable(jq('#tablePagination').DataTable({
                data: ilpTickets,
                columns: [
                    { data: "sr", title: "Sr" },
                    { data: "date", title: "Date" },
                    { data: "vno", title: "V.No" },
                    { data: "fname", title: "First Name" },
                    { data: "lname", title: "Last Name" },
                    { data: "ticket", title: "Ticket" },
                    { data: "subject", title: "Subject" },
                    { data: "type", title: "Type" },
                    { data: "status", title: "Status" },
                    { data: "asssign_by", title: "Assign By" },
                    { data: "asssign", title: "Assign" },
                    { data: "description", title: "Description" },
                    { data: "action", title: "Action" }
                ],
                order: [],
                pageLength: 50,
                searching: true,
                ordering: false,
                rowCallback: function (row, data) {
                    jq(row).css('background-color', '#e8f5e8');
                    jq(row).attr('title', 'ILP Student Ticket');
                },
                initComplete: function () {
                    ['.dataTables_length', '.dataTables_info', '.dataTables_paginate.paging_simple_numbers'].forEach(s => {
                        const e = jq(s);
                        if (e.length > 1) e.slice(1).hide();
                    });

                    if (ilpTicketsButton && showAllListButton) {
                        ilpTicketsButton.style.display = 'none';
                        showAllListButton.style.display = 'inline-block';
                    }

                    const duplicateButton = document.getElementById('FindDuplicatesBtn');
                    if (duplicateButton) {
                        duplicateButton.style.display = 'none';
                    }

                    if (refreshButton) {
                        refreshButton.style.display = 'inline-block';
                        refreshButton.textContent = 'Refresh List';
                        refreshButton.disabled = false;
                    }

                    TicketManager.addCampusFiltersButtons();
                }
            }));

        } catch (error) {
            console.error('Error listing ILP tickets:', error);
            if (ilpTicketsButton) {
                ilpTicketsButton.textContent = 'Show ILP Tickets';
                ilpTicketsButton.disabled = false;
            }
            if (showAllListButton) showAllListButton.style.display = 'none';
            if (refreshButton) {
                refreshButton.textContent = 'Refresh List';
                refreshButton.disabled = false;
            }
        }
    }

    static async refreshILPTickets() {
        const refreshButton = document.getElementById('RefreshILPTicketsBtn');

        try {
            if (refreshButton) {
                refreshButton.textContent = 'Refreshing...';
                refreshButton.disabled = true;
            }

            const jq = jQuery.noConflict();
            if (StateManager.getDataTable()) {
                StateManager.getDataTable().destroy();
                jq('#tablePagination tbody').empty();
                StateManager.setDataTable(null);
            }

            await TicketManager.listILPTickets();

        } catch (error) {
            console.error('Error refreshing ILP tickets:', error);
            if (refreshButton) {
                refreshButton.textContent = 'Refresh List';
                refreshButton.disabled = false;
            }
        }
    }

    static myTicketsDataTableUpdate() {
        try {
            if (document.readyState === 'complete') {
                const statusElement = document.getElementById('status112');
                if (statusElement) {
                    statusElement.value = '1'; statusElement.dispatchEvent(new Event('change', { bubbles: true }));
                    const myTicketsList = HelperFunctions.evaluateXPath("//h3[contains(text(), 'My Tickets List')]").singleNodeValue;
                    const parentDiv = myTicketsList.parentNode;
                    const showAll = UIManager.createButton('Show All'); showAll.id = 'ShowAll';
                    showAll.addEventListener('click', () => {
                        if (statusElement.value) { statusElement.value = ''; statusElement.dispatchEvent(new Event('change', { bubbles: true })); showAll.textContent = 'Show Processing'; }
                        else { TicketManager.myTicketsDataTableUpdate(); showAll.textContent = 'Show All'; }
                    });
                    if (!HelperFunctions.evaluateXPath("//*[@id='ShowAll']").singleNodeValue) UIManager.addElementToDOM(showAll, parentDiv);
                }
            } else window.addEventListener('load', () => this.myTicketsDataTableUpdate());
        } catch (error) { console.error('Error in myTicketsDataTableUpdate:', error); }
    }
}

window.TicketManager = TicketManager;