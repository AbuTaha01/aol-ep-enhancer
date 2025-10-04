class MainFunctionality {
    static updateExternalLibraries() {
        try {
            
            const existingAlmuniLink = document.querySelector('link[href*="almuni.css"], link[href*="alumni.css"]');
            if (existingAlmuniLink) {
                existingAlmuniLink.parentNode.removeChild(existingAlmuniLink);
            }
            // Update Font Awesome CSS
            const existingFontAwesomeLink = document.querySelector('link[href*="fontawesome"]');

            if (existingFontAwesomeLink) {
                existingFontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css';
            }

            // Update Font Awesome references in stylesheets
            const styleElements = document.querySelectorAll('style');
            styleElements.forEach(styleElement => {
                if (styleElement.textContent.includes('Font Awesome 5')) {
                    styleElement.textContent = styleElement.textContent.replace(
                        'Font Awesome 5 Free',
                        'Font Awesome 6 Free'
                    );
                }
            });

            // Update jQuery
            const existingJQuery = document.querySelector('script[src*="jquery.min.js"]');
            if (existingJQuery) {
                existingJQuery.src = 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js';
            }

            // Update Popper.js
            const existingPopper = document.querySelector('script[src*="popper.min.js"]');
            if (existingPopper) {
                existingPopper.src = 'https://cdnjs.cloudflare.com/ajax/libs/popper.js/2.11.8/umd/popper.min.js';
            }

            // Update Bootstrap JS script
            const existingBootstrapScript = document.querySelector('script[src*="bootstrap.min.js"]');

            if (existingBootstrapScript) {
                existingBootstrapScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/js/bootstrap.min.js';
            }

            const existingMetisMenuJS = document.querySelector('script[src*="metisMenu.min.js"]');
            if (existingMetisMenuJS) {
                existingMetisMenuJS.src = 'https://cdnjs.cloudflare.com/ajax/libs/metisMenu/3.0.7/metisMenu.min.js';
            }

        } catch (error) {
            console.error('Error updating external libraries:', error);
        }
    }

    static enableRightClick() {
        return HelperFunctions.urlCheck([CONFIG.STUDENT_PORTAL], function () {
            try {
                document.addEventListener('contextmenu', function (e) {
                    e.stopPropagation();
                    return true;
                }, true);

                const elementsWithContextMenu = document.querySelectorAll('[oncontextmenu]');
                elementsWithContextMenu.forEach(el => {
                    el.removeAttribute('oncontextmenu');
                });

                window.addEventListener('load', function () {
                    document.oncontextmenu = null;

                    const scripts = document.querySelectorAll('script');
                    scripts.forEach(script => {
                        if (script.textContent && script.textContent.includes('contextmenu')) {
                            console.log('Found script with contextmenu prevention, attempting to disable');
                        }
                    });
                });

                const style = document.createElement('style');
                style.textContent = `
                    * { 
                        -webkit-user-select: auto !important;
                        user-select: auto !important;
                    }
                    
                    *[oncontextmenu] {
                        oncontextmenu: null !important;
                    }
                `;
                document.head.appendChild(style);
            } catch (error) {
                console.error('Error enabling right click:', error);
            }
        })();
    }

    static setDefaultFont() {
        try {
            const style = document.createElement('style');
            style.textContent = `
                    * {
                        font-family: 'Inter', 'Font Awesome 5 Free', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                        Roboto, 'Helvetica Neue', Arial, sans-serif !important;
                        line-height: 17px;
                        }
                `;

            const fontLink = document.createElement('link');
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap';

            document.head.appendChild(fontLink);
            document.head.appendChild(style);

        } catch (error) {
            console.error('Error applying Poppins font:', error);
        }
    }

    static checkAndAutoLogin() {
        return HelperFunctions.urlCheck([CONFIG.LOGIN_URL], function () {
            chrome.storage.local.get(['autoLogin'], function (result) {
                if (result.autoLogin && window.location.href.startsWith(CONFIG.LOGIN_URL)) {
                    console.log('Login page detected and auto login is enabled. Attempting auto-login...');
                    chrome.runtime.sendMessage({ action: 'login' }, (response) => {
                        if (response && response.loginSuccessful) {
                            console.log('Auto-login successful. Redirecting...');
                            window.location.href = CONFIG.PENDING_LIST_URL;
                        } else {
                            console.log('Auto-login failed.');
                        }
                    });
                }
            });
        })();
    }

    static linkEmails() {
        try {
            const emailElements = document.querySelectorAll('table td')

            emailElements.forEach(element => {
                if (element.childNodes.length > 0 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
                    const emailText = element.childNodes[0].textContent.trim();

                    if (emailText.includes('@') && emailText.indexOf('@') < emailText.lastIndexOf('.') && !emailText.endsWith(CONFIG.EMAIL_DOMAIN)) {
                        HelperFunctions.addCopyIconToElement(element, emailText, {
                            position: 'prepend',
                            style: { marginRight: '5px' }
                        });
                    }

                    if (emailText.endsWith(CONFIG.EMAIL_DOMAIN)) {
                        const link = `${CONFIG.EMAIL_LINK_BASE}${encodeURIComponent(emailText)}`;

                        const locationCheckLink = element.querySelector('a[href*="checkStLocations.php"]');

                        const linkElement = document.createElement('a');
                        linkElement.href = link;
                        linkElement.textContent = emailText;

                        const strongElement = document.createElement('strong');
                        strongElement.appendChild(linkElement);

                        element.innerHTML = '';
                        element.appendChild(strongElement);

                        HelperFunctions.addCopyIconToElement(element, emailText, {
                            position: 'prepend',
                            style: { marginRight: '5px' }
                        });

                        if (locationCheckLink) {
                            const paragraph = document.createElement('p');
                            paragraph.style.margin = '5px 0';
                            const strongLocationLink = document.createElement('strong');
                            strongLocationLink.appendChild(locationCheckLink);
                            paragraph.appendChild(strongLocationLink);
                            element.appendChild(paragraph);
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error linking emails:', error);
        }
    }

    static handlePDFLinks() {
        return HelperFunctions.urlCheck([`!${CONFIG.TICKETS_ALL_URLS}`], function () {
            try {
                const links = document.querySelectorAll('a[href$=".pdf"]');

                links.forEach(link => {
                    if (!link.hasAttribute('data-pdf-handled')) {
                        link.addEventListener('click', function (e) {
                            e.preventDefault();
                            const pdfUrl = this.href;

                            fetch(pdfUrl)
                                .then(response => response.blob())
                                .then(blob => {
                                    const blobUrl = URL.createObjectURL(blob);
                                    window.open(blobUrl, '_blank');
                                })
                                .catch(error => {
                                    console.error('Error loading PDF:', error);
                                    window.open(pdfUrl, '_blank');
                                });
                        });

                        link.setAttribute('data-pdf-handled', 'true');
                        link.style.cursor = 'pointer';
                        link.title = 'Open PDF in a new tab';
                    }
                });
            } catch (error) {
                console.error('Error handling PDF links:', error);
            }
        })();
    }
}

window.MainFunctionality = MainFunctionality;