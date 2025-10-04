class StudentProfileManager {
    static async enhanceNotesSection() {
        try {
            // Find the v-number using multiple methods
            const vNumber = HelperFunctions.findVNumber();

            if (!vNumber) {
                ErrorHandler.showAlert("Could not find V-Number on the page. Notes cannot be loaded.", "error");
                return;
            }

            // Find the notes container
            const notesContainer = document.getElementById("msgdatat111");
            if (!notesContainer) {
                console.log("Notes container #msgdatat111 not found.", "StudentProfileManager.enhanceNotesSection");
                return;
            }

            // ✅ Extract HTML note data BEFORE showing loading indicator
            const htmlNoteData = StudentProfileManager.extractHtmlNoteData();

            // Show loading indicator using HelperFunctions
            const loadingElement = document.createElement('div');
            loadingElement.className = 'text-center p-4 loading-notes';
            notesContainer.innerHTML = '';
            notesContainer.appendChild(loadingElement);
            HelperFunctions.setButtonLoadingState(loadingElement, true, 'fa-spinner fa-spin', 0, 'Loading notes...');

            // Fetch the notes from API
            const notes = await DataService.getStudentNotes(vNumber);

            // If no notes found, show a message
            if (!notes || notes.length === 0) {
                notesContainer.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle"></i> No notes found for this student.</div>';

                // Continue with form enhancement even if there are no notes
                StudentProfileManager.enhanceNoteSubmissionForm();
                return;
            }

            // ✅ Match API notes with HTML data to get note IDs
            const enhancedNotes = StudentProfileManager.matchNotesWithHtmlData(notes, htmlNoteData);

            // Use UIManager to render notes
            notesContainer.innerHTML = UIManager.renderStudentNotes(enhancedNotes);

            // Add delete event listeners
            StudentProfileManager.initializeNoteDeleteHandlers(notesContainer, vNumber);

            // Enhance the note submission form
            StudentProfileManager.enhanceNoteSubmissionForm();

        } catch (error) {
            console.log(error, "enhanceNotesSection");

            // Show error message
            const notesContainer = document.getElementById("msgdatat111");
            if (notesContainer) {
                notesContainer.innerHTML = `
                <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> 
                Error loading notes: ${error.message}
                </div>
            `;
            }
        }
    }

    static extractHtmlNoteData() {
        const htmlNoteData = [];

        try {
            const noteCards = document.querySelectorAll('.card[id^="nd"]');

            noteCards.forEach(card => {
                try {
                    // ✅ FIX: Keep the full ID including "nd" prefix
                    const noteId = card.id; // Keep as "nd23287" instead of "23287"

                    // Extract date from the bottom section
                    const infoElement = card.querySelector('p.m-0');
                    let createdDate = null;

                    if (infoElement) {
                        const infoText = infoElement.textContent;

                        // Extract date (format: 2025-04-04 05:17:57 pm)
                        const dateMatch = infoText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+[ap]m)/);
                        if (dateMatch) {
                            createdDate = dateMatch[1];
                        }
                    }

                    if (noteId && createdDate) {
                        htmlNoteData.push({
                            id: noteId, // This will now be "nd23287" format
                            date: createdDate
                        });
                    }

                } catch (noteError) {
                    console.log(noteError, `extractHtmlNoteData - processing card ${card.id}`);
                }
            });

        } catch (error) {
            console.log(error, "extractHtmlNoteData");
        }

        return htmlNoteData;
    }

    static matchNotesWithHtmlData(apiNotes, htmlNoteData) {
        const currentUser = DataService.getCurrentUserName();

        return apiNotes.map(note => {
            // Try to find matching HTML note by date
            const matchingHtmlNote = htmlNoteData.find(htmlNote => {
                // Compare dates - API might have different format, so let's be flexible
                const apiDate = note.created_date || note.date_added || '';
                const htmlDate = htmlNote.date;

                // Try exact match first
                if (apiDate === htmlDate) {
                    return true;
                }

                // Try to normalize dates for comparison
                try {
                    // Parse both dates and compare
                    const apiDateObj = new Date(apiDate);
                    const htmlDateObj = new Date(htmlDate);

                    // Compare timestamps (allowing for small differences)
                    const timeDiff = Math.abs(apiDateObj.getTime() - htmlDateObj.getTime());
                    return timeDiff < 60000; // Within 1 minute difference

                } catch (dateError) {
                    console.log(dateError, 'Date comparison error');
                    return false;
                }
            });

            // Add note ID and delete permission to the note
            const enhancedNote = {
                ...note,
                htmlId: matchingHtmlNote ? matchingHtmlNote.id : null, // This will now be "nd23287" format
                canDelete: currentUser && note.created_by === currentUser
            };

            return enhancedNote;
        });
    }

    static initializeNoteDeleteHandlers(notesContainer, vNumber) {
        // Add event delegation for delete buttons
        notesContainer.addEventListener('click', async function (e) {
            if (e.target.closest('.delete-note-btn')) {
                const deleteButton = e.target.closest('.delete-note-btn');
                const noteId = deleteButton.getAttribute('data-note-id');
                const noteTitle = deleteButton.getAttribute('data-note-title') || 'this note';

                if (!noteId || noteId.trim() === '') {
                    ErrorHandler.showAlert('Note ID not found. Cannot delete note.', 'error');
                    return;
                }

                // ✅ FIX: Use ErrorHandler.showCustomConfirm with correct parameter order (message, title)
                const confirmed = await ErrorHandler.showCustomConfirm(
                    `Are you sure you want to delete "${noteTitle}"?`,
                    'Delete Note'
                );

                if (!confirmed) {
                    return;
                }

                // Show loading state using HelperFunctions.setButtonLoadingState
                HelperFunctions.setButtonLoadingState(deleteButton, true, 'fa-spinner fa-spin', 0, '');

                try {
                    // Call delete service
                    const result = await DataService.deleteStudentNote(noteId, vNumber);

                    if (result.success) {
                        // Show success message
                        ErrorHandler.showAlert('Note deleted successfully', 'success', 3000);

                        // Refresh notes display
                        if (result.notes) {
                            notesContainer.innerHTML = UIManager.renderStudentNotes(result.notes);
                            // Re-initialize delete handlers for the new content
                            StudentProfileManager.initializeNoteDeleteHandlers(notesContainer, vNumber);
                        }
                    } else {
                        // Show error message
                        ErrorHandler.showAlert(`Failed to delete note: ${result.error}`, 'error');

                        // Restore button state using HelperFunctions.setButtonLoadingState
                        HelperFunctions.setButtonLoadingState(deleteButton, false, '', 0, '<i class="fas fa-trash"></i>');
                    }
                } catch (error) {
                    ErrorHandler.showAlert('An error occurred while deleting the note.', 'error');

                    // Restore button state using HelperFunctions.setButtonLoadingState
                    HelperFunctions.setButtonLoadingState(deleteButton, false, '', 0, '<i class="fas fa-trash"></i>');
                }
            }
        });
    }

    static enhanceNoteSubmissionForm() {
        // Find the existing form
        const sendForm = document.getElementById("manage-comment");
        if (!sendForm) {
            console.log("Note submission form #manage-comment not found.", "StudentProfileManager.enhanceNoteSubmissionForm");
            return;
        }

        // Find the form container
        const formContainer = document.querySelector("#faq8 .col-12.px-4");
        if (!formContainer) {
            console.log("Form container #faq8 .col-12.px-4 not found.", "StudentProfileManager.enhanceNoteSubmissionForm");
            return;
        }

        try {
            // Extract the hidden input fields from the original form
            const hiddenInputs = sendForm.querySelectorAll('input[type="hidden"]');
            const hiddenFieldsData = {};
            hiddenInputs.forEach(input => {
                hiddenFieldsData[input.name] = input.value;
            });

            // Use UIManager to render the form
            const customFormHTML = UIManager.renderNoteSubmissionForm(hiddenFieldsData);

            // Replace only the old form, not the entire container
            sendForm.style.display = 'none'; // Hide but don't remove the original form

            // Create a wrapper for our new form
            const newFormWrapper = document.createElement('div');
            newFormWrapper.className = 'custom-form-wrapper';
            newFormWrapper.innerHTML = customFormHTML;

            // Add it after the original form
            formContainer.appendChild(newFormWrapper);

            // Initialize the text editor on the note content textarea
            UIManager.initializeTextEditor('#note-content', {
                height: '200px',
                placeholder: 'Enter note details here...'
            });

            // Add event handlers to our custom form
            const enhancedForm = document.getElementById("enhanced-note-form");
            enhancedForm.addEventListener("submit", async function (e) {
                e.preventDefault();

                const submitBtn = document.getElementById("note-submit-btn");
                const titleInput = document.getElementById("note-title");
                const contentInput = document.getElementById("note-content");

                // Manual validation - since we removed the required attribute
                if (!titleInput.value.trim() && !contentInput.value.trim()) {
                    ErrorHandler.showAlert('<b>Error:</b>&nbsp;Please fill in all required fields', 'error', 5000);
                    return;
                } else if (!titleInput.value.trim()) {
                    ErrorHandler.showAlert('<b>Error:</b>&nbsp;Please enter a title', 'error', 5000);
                    return;
                } else if (!contentInput.value.trim()) {
                    ErrorHandler.showAlert('<b>Error:</b>&nbsp;Please enter a description', 'error', 5000);
                    return;
                }

                // The content is already HTML formatted from the editor
                const formattedContent = contentInput.value;

                // Show loading state
                HelperFunctions.setButtonLoadingState(submitBtn, true, '', 0, 'Submitting...');

                // Get the v_number from our preserved hidden field
                const vNumber = document.getElementById("v_number")?.value;
                if (!vNumber) {
                    ErrorHandler.showAlert('<b>Error:</b>&nbsp;Could not find student V-Number', 'error', 5000);
                    HelperFunctions.setButtonLoadingState(submitBtn, false, '', 0, 'Create Note');
                    return;
                }

                // Submit the note
                const result = await DataService.submitStudentNote(
                    titleInput.value,
                    formattedContent,
                    vNumber
                );

                HelperFunctions.setButtonLoadingState(submitBtn, false, '', 0, 'Create Note');

                if (result.success) {
                    // Clear form
                    titleInput.value = '';
                    const editorContent = document.querySelector('.simple-editor-content');
                    if (editorContent) {
                        editorContent.innerHTML = '';
                    }
                    contentInput.value = '';

                    // Show success message
                    ErrorHandler.showAlert('<b>Success:</b>&nbsp;Note created successfully', 'success', 3000);

                    // ✅ Refresh notes by re-running the entire enhancement process
                    setTimeout(async () => {
                        try {
                            await StudentProfileManager.enhanceNotesSection();
                        } catch (refreshError) {
                            console.log(refreshError, 'refresh notes after creation');
                            // If refresh fails, reload the page
                            window.location.reload();
                        }
                    }, 1000);
                } else {
                    // Show error message
                    ErrorHandler.showAlert(`<b>Error:</b>&nbsp;${result.error || "Failed to create note"}`, 'error', 5000);
                }
            });
        } catch (error) {
            console.log(error, "enhanceNoteSubmissionForm");
        }
    }

    static async enhanceMessageSection() {
        try {
            const vNumber = HelperFunctions.findVNumber();

            if (!vNumber) {
                ErrorHandler.showAlert("Could not find V-Number on the page. Messages cannot be loaded.", "error");
                return;
            }
            // Find the messages container
            const messagesContainer = document.getElementById("msgdatat11122");
            if (!messagesContainer) {
                console.log("Messages container #msgdatat11122 not found.", "StudentProfileManager.enhanceMessageSection");
                return;
            }

            // Show loading indicator using HelperFunctions
            messagesContainer.innerHTML = '';
            const loadingElement = document.createElement('div');
            loadingElement.className = 'text-center p-4 loading-messages';
            messagesContainer.appendChild(loadingElement);
            HelperFunctions.setButtonLoadingState(loadingElement, true, 'fa-spinner fa-spin', 0, 'Loading messages...');

            // Fetch the messages
            const messages = await DataService.getStudentMessages(vNumber);

            // If no messages found, show a message
            if (!messages || messages.length === 0) {
                messagesContainer.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle"></i> No messages found for this student.</div>';

                // Continue with form enhancement even if there are no messages
                const originalFormContainer = document.querySelector('#faq9 .row.mt-4');
                if (originalFormContainer) {
                    originalFormContainer.style.display = 'none';
                }

                // Add our custom message form even when no messages exist
                StudentProfileManager.enhanceMessageSubmissionForm();
                return;
            }

            // Use UIManager to render messages
            messagesContainer.innerHTML = UIManager.renderStudentMessages(messages);

            // Hide the original form completely
            const originalFormContainer = document.querySelector('#faq9 .row.mt-4');
            if (originalFormContainer) {
                originalFormContainer.style.display = 'none';
            }

            // Add our custom message form
            StudentProfileManager.enhanceMessageSubmissionForm();

        } catch (error) {
            console.log(error, "enhanceMessageSection");

            // Show error message using ErrorHandler
            const messagesContainer = document.getElementById("msgdatat11122");
            if (messagesContainer) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'alert alert-danger';
                errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> Error loading messages: ${error.message}`;
                messagesContainer.innerHTML = '';
                messagesContainer.appendChild(errorDiv);
            }

            // Still add the form even when there's an error loading messages
            StudentProfileManager.enhanceMessageSubmissionForm();
        }
    }

    static enhanceMessageSubmissionForm() {
        // Find the original form or container first
        const originalFormContainer = document.querySelector('#faq9 .row.mt-4');
        if (originalFormContainer) {
            originalFormContainer.style.display = 'none';
        }

        // Original send form for extracting hidden fields
        const sendForm = document.querySelector("#faq9 form#send-msg");
        if (!sendForm) {
            console.log("Original message form #faq9 form#send-msg not found.", "StudentProfileManager.enhanceMessageSubmissionForm");
            return;
        }

        // Find the form container
        const formContainer = document.getElementById("msgdatat11122").closest('.collapse-card-body');
        if (!formContainer) {
            console.log("Message form container .collapse-card-body not found.", "StudentProfileManager.enhanceMessageSubmissionForm");
            return;
        }

        try {
            // Extract any hidden input fields from the original form
            const hiddenInputs = sendForm.querySelectorAll('input[type="hidden"]');
            const hiddenFieldsData = {};
            hiddenInputs.forEach(input => {
                hiddenFieldsData[input.name] = input.value;
            });

            // Use UIManager to render the form
            const customFormHTML = UIManager.renderMessageSubmissionForm(hiddenFieldsData);

            // Add it to the form container
            formContainer.insertAdjacentHTML('beforeend', customFormHTML);

            // Initialize the text editor on the message content textarea
            UIManager.initializeTextEditor('#message-content', {
                height: '180px',
                placeholder: 'Type your message here...'
            });

            // Handle file input display
            const fileInput = document.getElementById('message-attachment');
            const fileLabel = document.querySelector('.custom-file-label');
            const fileInfo = document.getElementById('file-info');

            if (fileInput && fileLabel) {
                fileInput.addEventListener('change', function () {
                    if (this.files.length > 0) {
                        const fileName = this.files[0].name;
                        fileLabel.textContent = fileName;

                        // Show file size
                        const fileSizeKB = Math.round(this.files[0].size / 1024);
                        fileInfo.textContent = `File size: ${fileSizeKB} KB`;
                    } else {
                        fileLabel.textContent = 'Attach file (optional)';
                        fileInfo.textContent = '';
                    }
                });
            }

            const enhancedForm = document.getElementById("enhanced-message-form");
            enhancedForm.addEventListener("submit", async function (e) {
                e.preventDefault();

                const submitBtn = document.getElementById("message-submit-btn");
                const contentInput = document.getElementById("message-content");
                const fileInput = document.getElementById("message-attachment");
                const fileLabel = document.querySelector('.custom-file-label');
                const fileInfo = document.getElementById('file-info');

                // Manual validation - since we removed the required attribute
                if (!contentInput || !contentInput.value.trim()) {
                    ErrorHandler.showAlert('<b>Error:</b>&nbsp;Please enter a message', 'error', 5000);
                    return;
                }

                // The content is already HTML formatted from the editor
                const formattedContent = contentInput.value;

                // Show loading state
                HelperFunctions.setButtonLoadingState(submitBtn, true, '', 0, 'Sending...');

                // Get the v_number from the hidden fields
                const vNumber = document.getElementById('v_number')?.value;
                if (!vNumber) {
                    ErrorHandler.showAlert('<b>Error:</b>&nbsp;Could not find student V-Number', 'error', 5000);
                    HelperFunctions.setButtonLoadingState(submitBtn, false, '', 0, 'Send Message');
                    return;
                }

                try {
                    // Submit the message
                    const file = fileInput.files.length > 0 ? fileInput.files[0] : null;
                    const response = await DataService.submitStudentMessage(formattedContent, vNumber, file);

                    if (response.success) {
                        try {
                            ErrorHandler.showAlert('Message sent successfully!', 'success', 3000);

                            enhancedForm.reset();

                            // Clear the text editor content properly
                            contentInput.value = '';

                            // Reset the editor content properly
                            const editorContents = document.querySelectorAll('.simple-editor-content');
                            editorContents.forEach(editor => {
                                editor.innerHTML = '';
                                // Make sure placeholder text appears again
                                editor.dispatchEvent(new Event('blur'));
                            });

                            // Reset the file input and associated displays
                            fileInput.value = '';
                            if (fileLabel) fileLabel.textContent = 'Attach file (optional)';
                            if (fileInfo) fileInfo.textContent = '';

                            // Refresh the messages section with the updated messages using UIManager
                            const messagesContainer = document.getElementById("msgdatat11122");
                            if (messagesContainer && response.messages) {
                                messagesContainer.innerHTML = UIManager.renderStudentMessages(response.messages);
                            }
                        } catch (resetError) {
                            console.error("Error resetting form:", resetError);
                        }
                    } else {
                        ErrorHandler.showAlert(`<b>Error:</b>&nbsp;${response.error}`, 'error', 5000);
                    }
                } catch (error) {
                    ErrorHandler.showAlert('<b>Error:</b>&nbsp;An unexpected error occurred while sending the message.', 'error', 5000);
                } finally {
                    HelperFunctions.setButtonLoadingState(submitBtn, false, '', 0, 'Send Message');
                }
            });
        } catch (error) {
            console.log(error, "enhanceMessageSubmissionForm");
        }
    }

    static generateMessageRows(messages) {
        return messages.map(message => {
            // Format the dates for display
            const createdDate = message.date_added || message.created_date || '';
            const readDate = message.read_date && message.read_date !== '1969-12-31 07:00:00 pm' ?
                message.read_date : '';

            // Determine if the message has been read
            const readStatus = message.seen_data === "2" ?
                `<span class="badge badge-success" style="font-size: 11px;" title="Read on: ${readDate}">
                    <i class="fas fa-check-circle"></i> Read
                </span>` :
                '<span class="badge badge-warning" style="font-size: 11px;">' +
                '<i class="fas fa-clock"></i> Not read yet</span>';

            return `
            <div class="notes mb-2">
                <div class="notes-body bg-light p-2">
                    <div class="notes-description">
                        ${message.description || ''}
                    </div>
                    <hr style="margin: 10px 0;">
                    <div class="d-flex justify-content-between align-items-center">
                        <span><b>From:</b> ${message.created_by || 'Staff'}</span>
                        <div>
                            ${message.seen_data ? readStatus : ''}
                            <small class="text-muted ml-2">${createdDate}</small>
                        </div>
                    </div>
                    ${message.file_path || message.file_name ? `
                        <div class="mt-2">
                            <i class="fas fa-paperclip"></i> 
                            <a href="https://aoltorontoagents.ca/student_contract/clgStActive/msg_docs/${message.file_path || message.file_name}" 
                               class="message-attachment" target="_blank">
                               ${message.file_path || message.file_name}
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>`;
            // generateMessageRows is now handled by UIManager.renderStudentMessages
            // static generateMessageRows(messages) { ... } // This method is removed.
        }).join('');
    }

    static async enhanceTicketSection() {
        try {
            // Find the v-number using multiple methods
            const vNumber = HelperFunctions.findVNumber();

            if (!vNumber) {
                ErrorHandler.showAlert("Could not find V-Number on the page. Tickets cannot be loaded.", "error");
                return;
            }

            // Find the tickets container
            const ticketsContainer = document.querySelector("#faq6 .collapse-card-body");
            if (!ticketsContainer) {
                console.log("Tickets container #faq6 .collapse-card-body not found.", "StudentProfileManager.enhanceTicketSection");
                return;
            }

            // Store reference to original table before making any changes
            const originalTable = ticketsContainer.querySelector('table');
            if (!originalTable) {
                // This might not be a critical error if the section is empty, but good to log.
                console.log("No original table found in the tickets container.", "StudentProfileManager.enhanceTicketSection");
            }

            // Extract document links BEFORE hiding the original table
            const documentLinks = StudentProfileManager.extractExistingDocumentLinks();

            // Now we can show loading indicator using HelperFunctions
            const loadingElement = document.createElement('div');
            loadingElement.className = 'text-center p-4 loading-tickets';

            // Hide the original table instead of removing it
            if (originalTable) {
                originalTable.style.display = 'none';
            }

            // Clear the container (except the hidden original table) and add the loading spinner
            ticketsContainer.innerHTML = '';
            ticketsContainer.appendChild(loadingElement);
            HelperFunctions.setButtonLoadingState(loadingElement, true, 'fa-spinner fa-spin', 0, 'Loading tickets...');

            // Fetch the tickets
            const result = await DataService.getStudentTickets(vNumber);

            if (!result.success) {
                ticketsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> 
                    Error loading tickets: ${result.error || "Unknown error"}
                </div>
            `;
                return;
            }

            // Filter tickets for exact vno match only
            const normalizedVNumber = vNumber.toLowerCase();
            const tickets = result.tickets.filter(ticket => {
                // Check if the ticket has a vno field that exactly matches the current vNumber
                return ticket.vno && ticket.vno.toLowerCase() === normalizedVNumber;
            });

            // Renumber the Sr field starting from 1
            tickets.forEach((ticket, index) => {
                ticket.sr = (index + 1).toString(); // Yeni sıra numarasını atama
            });

            // Clear the container completely (including the loading spinner)
            ticketsContainer.innerHTML = '';

            // If no tickets found, show message
            if (!tickets || tickets.length === 0) {
                ticketsContainer.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-info-circle"></i> No tickets found for this student.
                </div>
            `;
                return;
            }

            // Use UIManager to render the tickets table
            const tableHTML = UIManager.renderStudentTicketsTable(tickets, documentLinks);
            ticketsContainer.innerHTML = tableHTML;

            // Ensure modal functionality works with the new elements
            StudentProfileManager.initializeTicketDocumentViewers();

        } catch (error) {
            console.log(error, "enhanceTicketSection");
            const ticketsContainer = document.querySelector("#faq6 .collapse-card-body");
            if (ticketsContainer) {
                ticketsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> 
                    Error loading tickets: ${error.message}
                </div>
            `;
            }
        }
    }

    static extractExistingDocumentLinks() {
        const documentLinks = {};

        try {
            // Find the tickets container first
            const ticketsContainer = document.querySelector("#faq6 .collapse-card-body");
            if (!ticketsContainer) {
                console.log("Tickets container #faq6 .collapse-card-body not found.", "extractExistingDocumentLinks");
                return documentLinks;
            }

            // Get the original table within the container
            const originalTable = ticketsContainer.querySelector('table');
            if (!originalTable) {
                console.log("Original ticket table not found in container for link extraction.", "extractExistingDocumentLinks");
                return documentLinks;
            }

            const rows = originalTable.querySelectorAll('tbody tr');

            // Extract ticket numbers and document links
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 3) { // Make sure row has enough cells
                    const ticketNoCell = cells[1]; // Second column has ticket numbers
                    const documentCell = cells[2]; // Third column has documents

                    if (ticketNoCell && documentCell) {
                        const ticketNo = ticketNoCell.textContent.trim();
                        const docLink = documentCell.querySelector('.ticketdocs');

                        if (docLink) {
                            const dataId = docLink.getAttribute('data-id');
                            if (dataId) {
                                documentLinks[ticketNo] = dataId;
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.log(error, "extractExistingDocumentLinks");
        }

        return documentLinks;
    }

    static initializeTicketDocumentViewers() {
        // Make sure the ticketdocs click event works for our newly created elements
        document.querySelectorAll('.ticketdocs').forEach(link => {
            link.addEventListener('click', function () {
                const ticketId = this.getAttribute('data-id');
                if (ticketId && window.$) {
                    window.$('#getdetailsData').html('');
                    window.$.post("ticketRespnce.php?TktDetails=fetch", { "ticket_id": ticketId }, function (d) {
                        window.$('#getdetailsData').html(d);
                    });
                }
            });
        });
    }

    static async enhanceProgramCoursesTable() {
        try {
            // Find the program name from profile details
            const programCell = document.querySelector('.table-bordered tr td:nth-child(9)');
            if (!programCell) {
                ErrorHandler.showAlert("Could not find program information on the page.", "error");
                return;
            }

            const programName = programCell.textContent.trim();
            if (!programName) {
                ErrorHandler.showAlert("Program name is empty on the page.", "error");
                return;
            }

            // Get vNumber from page
            const vNumber = HelperFunctions.findVNumber();
            if (!vNumber) {
                ErrorHandler.showAlert("Could not find V-Number on the page. Course sequence cannot be enhanced.", "error");
                return;
            }

            // Find the course progress table container
            const courseProgressContainer = document.querySelector("#faq5 .collapse-card-body");
            if (!courseProgressContainer) {
                return;
            }

            // Store reference to original table before making any changes
            const originalTable = courseProgressContainer.querySelector('table');
            if (!originalTable) {
                console.log("Original course table not found in container.", "StudentProfileManager.enhanceProgramCoursesTable");
            }

            // Show loading indicator using HelperFunctions
            const loadingElement = document.createElement('div');
            loadingElement.className = 'text-center p-4 loading-courses';
            courseProgressContainer.appendChild(loadingElement);
            HelperFunctions.setButtonLoadingState(loadingElement, true, 'fa-spinner fa-spin', 0, 'Fetching student data...');

            // Hide the original table temporarily
            if (originalTable) {
                originalTable.style.display = 'none';
            }

            // Extract student course data from the table
            const studentCourses = [];
            const courseRows = originalTable.querySelectorAll('tbody tr');

            courseRows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 11) {
                    studentCourses.push({
                        courseName: cells[6].textContent.trim(),
                        courseCode: cells[5].textContent.trim(),
                        status: cells[7].textContent.trim(),
                        startDate: cells[8].textContent.trim(),
                        endDate: cells[9].textContent.trim(),
                        grade: cells[10].textContent.trim()
                    });
                }
            });

            let dataSource = 'EP'; // Default to EP
            let studentData = null;
            let programCourseSequence = [];
            let hasApiData = false;
            let launchCoursesData = {}; // ✅ Store Launch courses data separately

            // ✅ FIX: FIRST get student data from API before trying Launch
            try {
                HelperFunctions.setButtonLoadingState(loadingElement, true, 'fa-spinner fa-spin', 0, 'Getting student data from API...');

                const apiResponse = await DataService.apiStudentSearch({ student_number: vNumber });

                if (apiResponse && apiResponse.success && apiResponse.data && apiResponse.data.length > 0) {
                    studentData = apiResponse.data[0];

                    // 1. FIRST: Try to get Launch course data (now with studentData available)
                    try {
                        HelperFunctions.setButtonLoadingState(loadingElement, true, 'fa-spinner fa-spin', 0, 'Getting course data from Launch...');

                        const launchResponse = await new Promise((resolve, reject) => {
                            chrome.runtime.sendMessage({
                                action: 'getCourseDetails',
                                data: {
                                    vNumber: vNumber,
                                    student: studentData // ✅ Now studentData is available
                                }
                            }, (response) => {
                                if (chrome.runtime.lastError) {
                                    reject(new Error(chrome.runtime.lastError.message));
                                } else {
                                    resolve(response);
                                }
                            });
                        });

                        if (launchResponse && launchResponse.success && launchResponse.data) {
                            const parseResult = DataService.parseUserDetailsFromHtml(launchResponse.data);

                            if (parseResult && parseResult.success) {
                                const contractCode = vNumber;
                                const coursesResult = DataService.findCoursesFromContract(parseResult.data, contractCode, {
                                    contractStatus: "In Progress",
                                    includeInactive: true,
                                    includeInProgress: true,
                                    includeCompleted: true,
                                    includeFailed: true
                                });

                                if (coursesResult.success && coursesResult.courses.length > 0) {
                                    // ✅ Set data source to Launch since we got Launch data
                                    dataSource = 'Launch';

                                    // ✅ Store Launch courses in a map by multiple possible keys for better matching
                                    coursesResult.courses.forEach(lc => {
                                        const courseCode = lc.courseCode || lc.code;
                                        const courseName = lc.courseName || lc.name;

                                        if (courseCode) {
                                            launchCoursesData[courseCode] = lc;
                                            launchCoursesData[courseCode.toLowerCase()] = lc;
                                        }
                                        if (courseName) {
                                            launchCoursesData[courseName] = lc;
                                            launchCoursesData[courseName.toLowerCase()] = lc;
                                        }
                                    });

                                    if (studentData.exam_schedule?.courses?.courses && studentData.exam_schedule.courses.courses.length > 0) {
                                        // ✅ Use API sequence as the base, enhance with Launch course data
                                        programCourseSequence = studentData.exam_schedule.courses.courses
                                            .sort((a, b) => parseInt(a.courseSequence || 0) - parseInt(b.courseSequence || 0))
                                            .map((apiCourse, index) => ({
                                                code: apiCourse.courseCode,
                                                name: apiCourse.courseName,
                                                sequence: parseInt(apiCourse.courseSequence || 0),
                                                plannedStartDate: apiCourse.startDate || '',
                                                plannedFinishDate: apiCourse.finishDate || ''
                                            }));

                                        hasApiData = true;
                                    } else {
                                        // Use only Launch courses - sort by courseOrder
                                        programCourseSequence = coursesResult.courses
                                            .sort((a, b) => {
                                                const orderA = parseInt(a.courseOrder || 0);
                                                const orderB = parseInt(b.courseOrder || 0);
                                                return orderA - orderB;
                                            })
                                            .map((launchCourse, index) => ({
                                                code: launchCourse.courseCode || launchCourse.code || '',
                                                name: launchCourse.courseName || launchCourse.name || '',
                                                sequence: parseInt(launchCourse.courseOrder || 0) || (index + 1),
                                                plannedStartDate: '',
                                                plannedFinishDate: ''
                                            }));

                                        hasApiData = true;
                                    }
                                }
                            }
                        } else {
                            console.log("🔄 Launch response was not successful. Will fallback to API exam_schedule...");
                        }
                    } catch (launchError) {
                        console.log("🔄 Launch response was not successful. Will fallback to API exam_schedule...");
                    }

                    // 2. FALLBACK: If Launch failed, try API exam_schedule (now with studentData available)
                    if (programCourseSequence.length === 0 && studentData && studentData.exam_schedule?.courses?.courses) {
                        HelperFunctions.setButtonLoadingState(loadingElement, true, 'fa-spinner fa-spin', 0, 'Using API course sequence...');

                        if (Array.isArray(studentData.exam_schedule.courses.courses) &&
                            studentData.exam_schedule.courses.courses.length > 0) {

                            // ✅ FIX: Create basic programCourseSequence from API data first
                            programCourseSequence = studentData.exam_schedule.courses.courses
                                .sort((a, b) => parseInt(a.courseSequence || 0) - parseInt(b.courseSequence || 0))
                                .map(course => ({
                                    code: course.courseCode || '',
                                    name: course.courseName || '',
                                    sequence: parseInt(course.courseSequence || 0),
                                    plannedStartDate: course.startDate || '',
                                    plannedFinishDate: course.finishDate || '',
                                }));
                            hasApiData = true;
                        } else {
                            console.log("❌ API exam_schedule courses array is empty or invalid");
                        }
                    } else {
                    }
                } else {
                    console.log("❌ API student search failed or returned no data");
                }
            } catch (apiError) {
                console.log("❌ API request failed, falling back to local storage:", apiError);
            }

            if (programCourseSequence.length === 0) {
                HelperFunctions.setButtonLoadingState(loadingElement, true, 'fa-spinner fa-spin', 0, 'Loading course data from storage...');

                const { allPrograms, allProgramCourses, allCourses } = await new Promise(resolve => {
                    chrome.storage.local.get(['allPrograms', 'allProgramCourses', 'allCourses'], result => {
                        resolve({
                            allPrograms: result.allPrograms || [],
                            allProgramCourses: result.allProgramCourses || [],
                            allCourses: result.allCourses || []
                        });
                    });
                });

                if (!allPrograms.length || !allProgramCourses.length || !allCourses.length) {
                    ErrorHandler.showAlert("Program course data not available. Please visit the Settings page first to sync data.", "error", 10000);
                    courseProgressContainer.removeChild(loadingElement);
                    const alertElement = document.createElement('div');
                    alertElement.className = 'alert alert-warning';
                    alertElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i> 
                    Program course data not available. Please visit the Settings page first.
                    `;
                    courseProgressContainer.appendChild(alertElement);
                    if (originalTable) originalTable.style.display = '';
                    return;
                }

                // Find matching program in allPrograms
                let matchedProgram = StudentProfileManager.findMatchingProgram(programName, allPrograms);

                if (!matchedProgram) {
                    ErrorHandler.showAlert(`Could not match program "${programName}" with known programs. Course progress enhancement may be incomplete.`, "error", 7000);
                    courseProgressContainer.removeChild(loadingElement);
                    const alertElement = document.createElement('div');
                    alertElement.className = 'alert alert-warning';
                    alertElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i> 
                    Could not match program "${programName}" with known programs.
                     `;
                    courseProgressContainer.appendChild(alertElement);
                    if (originalTable) originalTable.style.display = '';
                    return;
                }

                const programDetail = allProgramCourses.find(p => p.programId === matchedProgram.id);

                if (!programDetail || !programDetail.courses.length) {
                    ErrorHandler.showAlert(`No course sequence information found for "${programName}". Course progress enhancement may be incomplete.`, "error", 7000);
                    courseProgressContainer.removeChild(loadingElement);
                    const alertElement = document.createElement('div');
                    alertElement.className = 'alert alert-warning';
                    alertElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i> 
                    No course sequence information found for "${programName}".
                    `;
                    courseProgressContainer.appendChild(alertElement);
                    if (originalTable) originalTable.style.display = '';
                    return;
                }

                // Convert local storage format to API format
                programCourseSequence = programDetail.courses.map(pc => ({
                    code: pc.code,
                    name: pc.name || '',
                    sequence: pc.sequence
                }));
            }

            // ✅ Pass Launch courses data to matching function
            const { enhancedCourses, unmatchedCourses } = await StudentProfileManager.matchCoursesWithApiSequence(
                programCourseSequence,
                studentCourses,
                dataSource === 'Launch',
                launchCoursesData // ✅ Pass Launch data
            );

            const enhancedFailedCount = enhancedCourses.filter(c =>
                c.status === 'Fail' || c.status === 'Failed'
            ).length;

            const unmatchedFailedCount = unmatchedCourses.filter(c => c.status === 'Fail').length;
            const totalFailedCount = enhancedFailedCount + unmatchedFailedCount;

            const completedCount = enhancedCourses.filter(c => c.status === 'Transferred' || c.status === 'Complete' || c.status === 'Pass' || c.status === 'Honours').length;
            const progressPercentage = Math.round((completedCount / enhancedCourses.length) * 100);
            const currentCoursesInfo = enhancedCourses.filter(c => c.status === 'In Progress');

            if (totalFailedCount > 0) {
                ErrorHandler.showAlert(`This student has <b>&nbsp;${totalFailedCount} failed course${totalFailedCount > 1 ? 's' : ''}.</b>`, 'error');
            }

            const programNameWithSource = `${programName} (From ${dataSource})`;

            const tableHtml = UIManager.renderProgramCoursesTable(
                enhancedCourses,
                unmatchedCourses,
                programNameWithSource,
                progressPercentage,
                completedCount,
                totalFailedCount,
                currentCoursesInfo,
                hasApiData
            );

            courseProgressContainer.removeChild(loadingElement);

            const existingEnhancedTable = courseProgressContainer.querySelector('#enhancedCoursesTable');
            if (existingEnhancedTable) existingEnhancedTable.closest('.mt-3.mb-3').remove();
            const existingResponsiveDiv = courseProgressContainer.querySelector('.table-responsive');
            if (existingResponsiveDiv && existingResponsiveDiv.querySelector('#enhancedCoursesTable')) existingResponsiveDiv.remove();
            const existingToggleBtnDiv = courseProgressContainer.querySelector('.text-right.mt-2');
            if (existingToggleBtnDiv) existingToggleBtnDiv.remove();

            courseProgressContainer.innerHTML += tableHtml;

            const toggleButton = document.getElementById('toggleOriginalCourseTableBtn');
            if (toggleButton) {
                toggleButton.addEventListener('click', function () {
                    const originalTable = courseProgressContainer.querySelector('table[style*="display: none"]');
                    if (!originalTable) {
                        const allTables = courseProgressContainer.querySelectorAll('table');
                        if (allTables.length > 0 && allTables[0].id !== 'enhancedCoursesTable') {
                            console.log("Original course table could not be reliably identified for toggling.", "StudentProfileManager.enhanceProgramCoursesTable - toggle event");
                            return;
                        }
                    }

                    if (originalTable) {
                        const wasHidden = originalTable.style.display === 'none';
                        originalTable.style.display = wasHidden ? '' : 'none';
                        if (wasHidden) {
                            setTimeout(() => {
                                originalTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                        }
                    } else {
                        console.log("Original course table reference not found for toggling.", "StudentProfileManager.enhanceProgramCoursesTable - toggle event");
                    }
                });
            }

        } catch (error) {
            console.log(error, "enhanceProgramCoursesTable");

            const courseProgressContainer = document.querySelector("#faq5 .collapse-card-body");
            if (courseProgressContainer) {
                const loadingElement = courseProgressContainer.querySelector('.loading-courses');
                if (loadingElement) {
                    courseProgressContainer.removeChild(loadingElement);
                }

                const alertElement = document.createElement('div');
                alertElement.className = 'alert alert-danger';
                alertElement.innerHTML = `
                <i class="fas fa-exclamation-circle"></i> 
                Error organizing course data: ${error.message}
            `;
                courseProgressContainer.appendChild(alertElement);

                const originalTable = courseProgressContainer.querySelector('table[style="display: none;"]');
                if (originalTable) {
                    originalTable.style.display = '';
                }
            }
        }
    }

    static async matchCoursesWithApiSequence(programCourseSequence, studentCourses, hasLaunchData = false, launchCoursesData = {}) {
        const fallbackMappings = await HelperFunctions.getFallbackMappings();

        const enhancedCourses = [];
        const matchedStudentCourseNames = new Set();
        const matchedStudentCourses = new Set();

        for (const pc of programCourseSequence) {
            let courseName = pc.name;
            let courseCode = pc.code;
            let originalCourseCode = pc.code; // ✅ Keep original for Launch lookup

            if (fallbackMappings[courseCode]) {
                courseCode = fallbackMappings[courseCode];
            }

            if (fallbackMappings[courseName]) {
                courseName = fallbackMappings[courseName];
            }

            let studentCourse = await StudentProfileManager.findMatchingStudentCourse(
                {
                    courseName: courseName,
                    courseCode: courseCode,
                    sequence: pc.sequence
                },
                studentCourses,
                fallbackMappings,
                matchedStudentCourses
            );

            if (!studentCourse && pc.code !== courseCode) {
                studentCourse = await StudentProfileManager.findMatchingStudentCourse(
                    {
                        courseName: pc.code,
                        courseCode: pc.code,
                        sequence: pc.sequence
                    },
                    studentCourses,
                    fallbackMappings,
                    matchedStudentCourses
                );
            }

            if (!studentCourse) {
                studentCourse = await StudentProfileManager.findMatchingStudentCourse(
                    {
                        courseName: courseCode,
                        courseCode: courseCode,
                        sequence: pc.sequence
                    },
                    studentCourses,
                    fallbackMappings,
                    matchedStudentCourses
                );
            }

            if (studentCourse) {
                matchedStudentCourseNames.add(studentCourse.courseName);
                const uniqueId = `${studentCourse.courseCode}_${studentCourse.courseName}_${studentCourse.startDate}_${studentCourse.endDate}`;
                matchedStudentCourses.add(uniqueId);
            }

            let finalCourseName = courseName;
            if (studentCourse) {
                finalCourseName = studentCourse.courseName;
            }

            // ✅ FIX: Better Launch data lookup with multiple fallback options
            let launchCourse = null;
            if (hasLaunchData && Object.keys(launchCoursesData).length > 0) {
                // Try multiple keys for Launch course lookup
                const possibleKeys = [
                    originalCourseCode,           // Original API course code (e.g., "KBD")
                    courseCode,                   // Mapped course code (e.g., "TYP")
                    courseName,                   // Course name
                    finalCourseName,              // Final course name
                    originalCourseCode?.toLowerCase(),
                    courseCode?.toLowerCase(),
                    courseName?.toLowerCase(),
                    finalCourseName?.toLowerCase()
                ].filter(Boolean);

                for (const key of possibleKeys) {
                    if (launchCoursesData[key]) {
                        launchCourse = launchCoursesData[key];
                        break;
                    }
                }

                if (!launchCourse) {
                }
            }

            const courseData = {
                sequence: pc.sequence,
                courseId: courseCode,
                courseName: finalCourseName,
                courseCode: studentCourse ? (studentCourse.courseCode || courseCode) : courseCode,

                // ✅ FIX: Status - Use Launch data if available, otherwise student course status
                status: hasLaunchData && launchCourse?.status ?
                    launchCourse.status :
                    hasLaunchData && launchCourse?.statusName ?
                        launchCourse.statusName :
                        studentCourse ? studentCourse.status : 'Not Started',

                // ✅ FIX: Start Date - Use Launch actual dates if available
                startDate: hasLaunchData && launchCourse?.datestart ?
                    launchCourse.datestart :
                    '-',

                // ✅ FIX: End Date - Use Launch actual dates if available  
                endDate: hasLaunchData && launchCourse?.datefin ?
                    launchCourse.datefin :
                    '-',

                // ✅ Exam Mark/Grade - Use Launch data if available
                examMark: hasLaunchData && launchCourse?.examMark ?
                    launchCourse.examMark :
                    studentCourse ? studentCourse.grade : '-',

                grade: hasLaunchData && launchCourse?.examMark ?
                    launchCourse.examMark :
                    studentCourse ? studentCourse.grade : '-',

                // ✅ Keep planned dates separate for reference (from API)
                plannedStartDate: pc.plannedStartDate || '-',
                plannedFinishDate: pc.plannedFinishDate || '-',

                // ✅ Launch-specific data (only available when hasLaunchData = true)
                actualCost: hasLaunchData && launchCourse ? (launchCourse.actualCost || launchCourse.cost || '') : '',
                hours: hasLaunchData && launchCourse ? (launchCourse.hours || launchCourse.thours || '') : '',
                credits: hasLaunchData && launchCourse ? (launchCourse.credits || '') : '',

                // ✅ EP data for reference only (never shown as actual Launch data)
                epStatus: studentCourse ? studentCourse.status : '',
                epStartDate: studentCourse ? studentCourse.startDate : '',
                epEndDate: studentCourse ? studentCourse.endDate : '',
                epGrade: studentCourse ? studentCourse.grade : ''
            };

            enhancedCourses.push(courseData);
        }

        const unmatchedCourses = [];

        for (const sc of studentCourses) {
            if (matchedStudentCourseNames.has(sc.courseName)) {
                continue;
            }

            const uniqueId = `${sc.courseCode}_${sc.courseName}_${sc.startDate}_${sc.endDate}`;
            if (matchedStudentCourses.has(uniqueId)) {
                continue;
            }

            let isMatchedViaFuzzyMatch = false;

            const allScheduledCourses = programCourseSequence.map(pc => ({
                courseName: pc.name || pc.code || '',
                courseCode: pc.code || ''
            })).filter(course => course.courseName || course.courseCode);

            if (allScheduledCourses.length > 0) {
                const bestMatch = await HelperFunctions.findBestCourseMatch(
                    { name: sc.courseName },
                    allScheduledCourses,
                    fallbackMappings
                );

                if (bestMatch && bestMatch.courseName) {
                    console.log(`Fuzzy match found for unmatched course: "${sc.courseName}" -> "${bestMatch.courseName}"`);
                    isMatchedViaFuzzyMatch = true;
                }
            }

            if (!isMatchedViaFuzzyMatch) {
                for (const pc of programCourseSequence) {
                    let courseName = pc.name || pc.code || '';
                    let courseCode = pc.code || '';

                    if (fallbackMappings[courseCode]) {
                        courseCode = fallbackMappings[courseCode];
                    }
                    if (fallbackMappings[courseName]) {
                        courseName = fallbackMappings[courseName];
                    }

                    if (courseName && (
                        sc.courseName.toLowerCase() === courseName.toLowerCase() ||
                        sc.courseCode?.toLowerCase() === courseCode.toLowerCase() ||
                        sc.courseName.toLowerCase() === courseCode.toLowerCase() ||
                        sc.courseCode?.toLowerCase() === pc.code?.toLowerCase()
                    )) {
                        console.log(`Manual fallback match found: "${sc.courseName}" -> "${courseName || courseCode}"`);
                        isMatchedViaFuzzyMatch = true;
                        break;
                    }
                }
            }

            if (!isMatchedViaFuzzyMatch) {
                unmatchedCourses.push(sc);
            }
        }

        return { enhancedCourses, unmatchedCourses };
    }

    static async findMatchingStudentCourse(courseInfo, studentCourses, fallbackMappings = null, matchedStudentCourses = new Set()) {
        const courseName = courseInfo.courseName;
        const courseCode = courseInfo.courseCode;

        // ✅ Get fallback mappings if not provided
        if (!fallbackMappings) {
            fallbackMappings = await HelperFunctions.getFallbackMappings();
        }

        // ✅ Filter out already matched courses
        const availableStudentCourses = studentCourses.filter(sc => {
            const uniqueId = `${sc.courseCode}_${sc.courseName}_${sc.startDate}_${sc.endDate}`;
            return !matchedStudentCourses.has(uniqueId);
        });

        let studentCourse = availableStudentCourses.find(sc =>
            sc.courseName.toLowerCase() === courseName.toLowerCase() ||
            sc.courseCode?.toLowerCase() === courseName.toLowerCase() ||
            sc.courseCode?.toLowerCase() === courseCode.toLowerCase()
        );

        if (!studentCourse) {
            const scheduledCourses = availableStudentCourses.map(sc => ({
                courseName: sc.courseName,
                courseCode: sc.courseCode
            }));

            const bestMatch = await HelperFunctions.findBestCourseMatch(
                { name: courseName },
                scheduledCourses,
                fallbackMappings // ✅ Pass centralized fallback mappings
            );

            if (bestMatch) {
                studentCourse = availableStudentCourses.find(sc =>
                    sc.courseName === bestMatch.courseName ||
                    sc.courseCode === bestMatch.courseCode
                );
            }
        }

        if (!studentCourse) {
            const mappedName = fallbackMappings[courseName];
            if (mappedName) {
                studentCourse = availableStudentCourses.find(sc =>
                    sc.courseName.toLowerCase() === mappedName.toLowerCase() ||
                    sc.courseCode?.toLowerCase() === mappedName.toLowerCase()
                );
            }
        }

        return studentCourse;
    }

    static findMatchingProgram(programName, allPrograms) {
        // Declare matchedProgram variable first
        let matchedProgram = null;

        // Try exact match
        matchedProgram = allPrograms.find(p =>
            (p["Program Name"]?.toLowerCase() === programName.toLowerCase()) ||
            (p.programName?.toLowerCase() === programName.toLowerCase())
        );

        // Try alternative names
        if (!matchedProgram) {
            matchedProgram = allPrograms.find(p => {
                // Check both property naming conventions
                const alternativeNames = p["Alternative Names"] || p.alternativeNames;
                return alternativeNames && alternativeNames.some(alt =>
                    alt.toLowerCase() === programName.toLowerCase()
                );
            });
        }

        // Try partial matching
        if (!matchedProgram) {
            matchedProgram = allPrograms.find(p => {
                const pName = p["Program Name"] || p.programName || '';
                return pName.toLowerCase().includes(programName.toLowerCase()) ||
                    programName.toLowerCase().includes(pName.toLowerCase());
            });
        }

        // Convert to the structure expected by the rest of the code
        if (matchedProgram) {
            return {
                id: matchedProgram["ID"] || matchedProgram.programId,
                programName: matchedProgram["Program Name"] || matchedProgram.programName
            };
        }

        return null;
    }
}

window.StudentProfileManager = StudentProfileManager;