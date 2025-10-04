class ErrorHandler {
    static alertQueue = [];
    static alertContainer = null;
    static activeAlerts = new Set();
    static clearAllButton = null;
    static alertMessages = new Map();

    static showAlert(message, type = 'error', duration = 0) {
        // Same message and type check
        const messageKey = `${message}_${type}`;

        if (this.alertMessages.has(messageKey)) {
            // Update current alert
            const existingAlert = this.alertMessages.get(messageKey);
            existingAlert.count++;
            this.updateAlertCount(existingAlert);

            // If duration is present, reset timer
            if (duration > 0) {
                clearTimeout(existingAlert.timeoutId);
                existingAlert.timeoutId = setTimeout(() => this.removeAlert(existingAlert.id), duration);
            }

            return existingAlert;
        } else {
            // Create new alert
            const alertObj = {
                message,
                type,
                duration,
                id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                count: 1,
                timeoutId: null
            };

            this.alertQueue.push(alertObj);
            this.alertMessages.set(messageKey, alertObj);
            this.processNextAlert();
            return alertObj;
        }
    }

    static updateAlertCount(alertObj) {
        const alertDiv = document.getElementById(alertObj.id);
        if (!alertDiv) return;

        let countElement = alertDiv.querySelector('.alert-count');
        const alertContent = alertDiv.querySelector('.alert-content');

        if (alertObj.count > 1) {
            if (!countElement) {
                // Create if there is no Count badge
                countElement = document.createElement('span');
                countElement.className = 'alert-count';
                // Add before the icon
                const icon = alertContent.querySelector('.fas');
                alertContent.insertBefore(countElement, icon);
            }
            countElement.textContent = alertObj.count;
            countElement.style.display = 'inline-flex';
        } else {
            // Hide badge if count is 1
            if (countElement) {
                countElement.style.display = 'none';
            }
        }

        // Animation effect for update
        alertDiv.classList.add('updated');
        setTimeout(() => {
            alertDiv.classList.remove('updated');
        }, 300);
    }

    static processNextAlert() {
        if (this.alertQueue.length === 0) return;

        const alertObj = this.alertQueue.shift();

        if (!this.alertContainer) {
            this.alertContainer = document.createElement('div');
            this.alertContainer.id = 'enhancer-alert-container';
            this.alertContainer.className = 'enhancer-alert-container';
            document.body.appendChild(this.alertContainer);
        }

        const alertDiv = document.createElement('div');
        alertDiv.id = alertObj.id;
        alertDiv.className = `alert-notification ${alertObj.type}-alert`;

        let iconClass = 'fa-info-circle';
        if (alertObj.type === 'error') iconClass = 'fa-exclamation-triangle';
        if (alertObj.type === 'success') iconClass = 'fa-check-circle';

        // Always create the count badge element but initialize it hidden
        const countBadge = `<span class="alert-count" style="display: ${alertObj.count > 1 ? 'inline-flex' : 'none'}">${alertObj.count}</span>`;

        alertDiv.innerHTML = `
        <div class="alert-content">
            ${countBadge}
            <i class="fas ${iconClass}"></i>
            <div class="alert-message">${alertObj.message}</div>
            <i class="fas fa-times alert-close"></i>
        </div>
    `;

        this.activeAlerts.add(alertObj.id);
        this.alertContainer.appendChild(alertDiv);

        // Show or hide Clear All button based on alert count
        this.updateClearAllButton();

        setTimeout(() => {
            alertDiv.classList.add('active');
        }, 10);

        if (alertObj.duration > 0) {
            alertObj.timeoutId = setTimeout(() => this.removeAlert(alertObj.id), alertObj.duration);
        }

        alertDiv.querySelector('.alert-close').addEventListener('click', () => {
            this.removeAlert(alertObj.id);
        });
    }

    static updateClearAllButton() {
        if (this.activeAlerts.size > 3) {
            if (!this.clearAllButton) {
                this.clearAllButton = document.createElement('div');
                this.clearAllButton.className = 'clear-all-button';
                this.clearAllButton.innerHTML = `
                    <button class="alert-notification error-alert active" style="cursor:pointer">
                        <strong>Clear All Notifications</strong>
                    </button>
                `;

                this.clearAllButton.addEventListener('click', () => {
                    this.clearAllButton.innerHTML = `
                        <button class="alert-notification error-alert" style="cursor:pointer">
                            <strong>Clearing Notifications...</strong>
                        </button>
                    `;
                    this.clearAllAlerts();
                });
            }

            if (!this.clearAllButton.parentNode) {
                // Insert at the beginning of the container, before all notifications
                this.alertContainer.insertBefore(this.clearAllButton, this.alertContainer.firstChild);
            }
        } else {
            if (this.clearAllButton && this.clearAllButton.parentNode) {
                this.clearAllButton.remove();
            }
        }
    }

    static clearAllAlerts() {
        // Create a copy of activeAlerts to avoid modification during iteration
        const alertIds = Array.from(this.activeAlerts);

        alertIds.forEach(alertId => {
            this.removeAlert(alertId);
        });
    }

    static removeAlert(alertId) {
        const alertDiv = document.getElementById(alertId);
        if (!alertDiv) return;

        // also remove from alertMessages Map
        const alertObj = Array.from(this.alertMessages.values()).find(alert => alert.id === alertId);
        if (alertObj) {
            const messageKey = `${alertObj.message}_${alertObj.type}`;
            this.alertMessages.delete(messageKey);

            // Clear if there is a timeout
            if (alertObj.timeoutId) {
                clearTimeout(alertObj.timeoutId);
            }
        }

        alertDiv.classList.remove('active');
        this.activeAlerts.delete(alertId);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }

            // Update Clear All button visibility
            this.updateClearAllButton();

            if (this.alertContainer && this.activeAlerts.size === 0) {
                this.alertContainer.remove();
                this.alertContainer = null;
                this.clearAllButton = null;
            }
        }, 300);
    }

    static showCustomModal(message, title = "Information", type = "alert", confirmBtnText = "OK") {
        return new Promise(resolve => {
            const modalId = type === "confirm" ? "customConfirmModal" : "customAlertModal";

            const existingModal = document.getElementById(modalId);
            if (existingModal) {
                existingModal.remove();
            }

            const modalHTML = `
            <div id="${modalId}" class="custom-modal-overlay">
                <div class="custom-modal-content">
                    <div class="custom-modal-header">
                        <h3>${HelperFunctions.sanitizeHtml(title)}</h3>
                    </div>
                    <div class="custom-modal-body">${HelperFunctions.sanitizeHtml(message)}</div>
                    <div class="custom-modal-footer">
                        ${type === "confirm" ?
                        `<button class="btn btn-secondary">Cancel</button>
                            <button class="btn btn-danger">${confirmBtnText}</button>` :
                        `<button class="btn btn-primary">OK</button>`
                    }
                    </div>
                </div>
            </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            const modal = document.getElementById(modalId);
            const buttons = modal.querySelectorAll('.custom-modal-footer button');

            modal.style.display = 'flex';

            if (type === "confirm") {
                const cancelButton = buttons[0];
                const okButton = buttons[1];

                const handleOk = () => {
                    modal.remove();
                    resolve(true);
                };

                const handleCancel = () => {
                    modal.remove();
                    resolve(false);
                };

                okButton.addEventListener('click', handleOk);
                cancelButton.addEventListener('click', handleCancel);


                const handleEscape = (e) => {
                    if (e.key === 'Escape') {
                        modal.remove();
                        document.removeEventListener('keydown', handleEscape);
                        resolve(false);
                    }
                };
                document.addEventListener('keydown', handleEscape);

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.remove();
                        resolve(false);
                    }
                });

                setTimeout(() => cancelButton.focus(), 100);

            } else {
                const okButton = buttons[0];

                const handleOk = () => {
                    modal.remove();
                    resolve(true);
                };

                okButton.addEventListener('click', handleOk);

                const handleEscape = (e) => {
                    if (e.key === 'Escape') {
                        modal.remove();
                        document.removeEventListener('keydown', handleEscape);
                        resolve(true);
                    }
                };
                document.addEventListener('keydown', handleEscape);

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.remove();
                        resolve(true);
                    }
                });

                setTimeout(() => okButton.focus(), 100);
            }
        });
    }

    static showCustomAlert(message, title = "Information") {
        return this.showCustomModal(message, title, "alert");
    }

    static showCustomConfirm(message, title = "Confirm") {
        return this.showCustomModal(message, title, "confirm");
    }
}

window.ErrorHandler = ErrorHandler;