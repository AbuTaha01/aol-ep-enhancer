// HelpDesk Configuration
const HELPDESK_CONFIG = {
  URLS: {
    BASE: 'https://hd.academyoflearning.net/HelpDesk',
    REQUEST_LIST: 'https://hd.academyoflearning.net/HelpDesk/RequestList.aspx',
    SEARCH_REQUEST: 'https://hd.academyoflearning.net/HelpDesk/SearchRequest.aspx',
    MY_OPEN_REQUESTS: 'https://hd.academyoflearning.net/HelpDesk/RequestList.aspx?method=UserOpenRequest',
    NEW_REQUEST: 'https://hd.academyoflearning.net/HelpDesk/NewRequest.aspx',
    REQUEST_DETAIL: 'https://hd.academyoflearning.net/HelpDesk/RequestDetail.aspx',
    MODIFY_REQUEST: 'https://hd.academyoflearning.net/HelpDesk/ModifyRequest.aspx'
  },
  PRIORITY_IMAGES: {
    NORMAL: 'normal_english.gif',
    HIGH: 'high_english.gif',
    EMERGENCY: 'emergency_english.gif',
    ON_HOLD: 'onhold_english.gif'
  },
  PRIORITY_ICONS: {
    NORMAL: { icon: 'fa-check', color: 'green', text: 'Normal' },
    HIGH: { icon: 'fa-arrow-up', color: 'orange', text: 'High' },
    EMERGENCY: { icon: 'fa-exclamation-triangle', color: 'red', text: 'Emergency' },
    ON_HOLD: { icon: 'fa-pause', color: 'gray', text: 'On Hold' },
    DEFAULT: { icon: 'fa-question', color: 'black', text: 'Unknown' }
  },
  STATUS_ICONS: {
    OPEN: { icon: 'fa-lock-open', color: 'green' },
    CLOSED: { icon: 'fa-lock', color: 'gray' },
    DEFAULT: { icon: 'fa-certificate', color: 'red' }
  },
  ATTACHMENT_ICONS: {
    '.pdf': 'fa-file-pdf',
    '.doc': 'fa-file-word',
    '.docx': 'fa-file-word',
    '.xls': 'fa-file-excel',
    '.xlsx': 'fa-file-excel',
    '.txt': 'fa-file-lines',
    '.jpg': 'fa-file-image',
    '.jpeg': 'fa-file-image',
    '.png': 'fa-file-image',
    'default': 'fa-file'
  }
};

class HelpDeskManager {
  static dashboardData = {
    priorities: [],
    categories: [],
    searchForm: {
      categories: [],
      actionRequests: []
    }
  };

  static lastPageTitle = '';
  static lastVisitedUrl = null;
  static isNavigatingThroughHistory = false;
  static historyStack = new Map(); // HTML içeriklerini tutacak
  static currentPageState = null;

  static async processRawData(rawData) {
    const API_KEY = 'AIzaSyDmBIqQEKI1yKdDsL5OTnRXHbqyMpjF800';
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    try {
      // Find previous message rows that contain student info, excluding solution messages
      const messageRows = document.querySelectorAll('.message-row:not(.solution-message)');
      let allPreviousMessageData = [];

      // Collect all messages containing email or V-number
      for (const row of messageRows) {
        const text = row.querySelector('.message-text')?.textContent || '';
        if (text.includes('@my-aolcc.com') || text.match(/\b[Vv][A-Za-z]?\d{5,}\b/)) {
          allPreviousMessageData.push(text.trim());
        }
      }

      // Join all collected messages into a single string with separators
      const previousMessageData = allPreviousMessageData.join('\n---\n');

      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Format this data exactly like this example:
                            Example format: Sanjit Singh Padda,VB2412363,SanjitSingh.Padda@my-aolcc.com,y.1702^4^340615aq
                            First part is fullname, second part is V-Number, third part is e-mail address, fourth part is password.
                            
                            You can find the V-number in the previous message data. The V-number starts with V letter, has at least one letter next to it and has number 2 next to it and at least 4 digits next to it, you can write it as V-number. Otherwise write Not Found.
                            You can find the name and surname in the previous message data. Name and surname are separated by a space. Its located before the V-number.
                            If you cannot find the name and surname in the data, you can extract the full name from @my-aolcc.com e-mail address. In the e-mail address, the part before the dot is the First Name and the part after the dot is the Last Name. 
                            You can always see the password in the current data. password is a complex text with at least 10 characters
                            
                            Here's the data to format:
                            Previous messages: ${previousMessageData}
                            Current data: ${rawData}`
            }]
          }]
        })
      });

      const data = await response.json();
      const formattedText = data.candidates[0].content.parts[0].text;

      return formattedText.split('\n')
        .filter(line => line.includes(','))
        .map(line => {
          const [name, vNumber, email, password] = line.split(',');
          return {
            'Full Name': name?.trim(),
            'V-Number': vNumber?.trim(),
            'Email': email?.trim(),
            'Password': password?.trim()
          };
        });
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }

  static downloadExcel(data) {
    if (!data?.length) return;
    let attempts = 0;
    while (typeof XLSX === 'undefined' && attempts < 10) {
      new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (typeof XLSX === 'undefined') {
      console.error('XLSX library not loaded');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Format: o365-credentials-YYYY-MM-DD-HH-mm-ss.xlsx
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')  // Replace colons and periods with hyphens
      .slice(0, 19);  // Get only YYYY-MM-DD-HH-mm-ss part
    a.download = `o365-credentials-${timestamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  static pushState(pageType, params = {}) {
    if (this.isNavigatingThroughHistory) return;

    const url = `https://aoltorontoagents.ca/student_contract/help-desk`;
    let fullUrl = url;

    switch (pageType) {
      case 'dashboard':
        fullUrl += '/dashboard';
        break;
      case 'search':
        fullUrl += '/search';
        if (params.keyword) {
          fullUrl += `?${new URLSearchParams(params).toString()}`;
        }
        break;
      case 'detail':
        fullUrl += `/request/${params.requestId}`;
        break;
      case 'category':
        fullUrl += `/category/${params.categoryId}`;
        const urlParams = new URLSearchParams();
        if (params.name) urlParams.set('name', params.name);
        if (params.page) urlParams.set('page', params.page);
        const queryString = urlParams.toString();
        if (queryString) fullUrl += `?${queryString}`;
        break;
      case 'list':
        fullUrl += '/requests';
        if (params.type) {
          fullUrl += `/${params.type}`;
        }
        if (params.page) {
          fullUrl += `?page=${params.page}`;
        }
        break;
      case 'priority':
        fullUrl += `/priority/${params.type}`;
        if (params.page) {
          fullUrl += `?page=${params.page}`;
        }
        break;
      case 'my-requests':
        fullUrl += '/requests/my';
        if (params.page) {
          fullUrl += `?page=${params.page}`;
        }
        break;
      case 'new-request':
        fullUrl += '/new-request';
        break;
      default:
        fullUrl += '/dashboard';
    }

    const state = {
      page: `help-desk-${pageType}`,
      params: {
        ...params,
        url: params.url || this.lastVisitedUrl,
        title: params.title || this.lastPageTitle,
        previousState: this.currentState
      },
      timestamp: Date.now()
    };

    try {
      // Cache the current HTML content with a unique key
      const cacheKey = state.page + JSON.stringify(state.params);
      const currentHtml = document.querySelector('.signin-page')?.innerHTML;
      if (currentHtml) {
        this.historyStack.set(cacheKey, currentHtml);
        console.log('Cached content for:', cacheKey);
      }

      window.history.pushState(state, '', fullUrl);
      this.currentState = state;
      console.log('History state pushed:', { pageType, params, url: fullUrl });
    } catch (error) {
      console.error('Error pushing state:', error);
    }
  }

  static async handlePopState(event) {
    this.isNavigatingThroughHistory = true;
    try {
      const state = event.state;

      if (!state) {
        await this.loadHelpDeskPage();
        return;
      }

      // Liste ve pagination state kontrolü
      if (state.page === 'help-desk-list') {
        const listType = state.params?.type || 'default';
        const pageNumber = state.params?.pageNumber || '1';
        const cacheKey = `${state.page}-${listType}-page-${pageNumber}`;
        const cachedHtml = this.historyStack.get(cacheKey);

        if (cachedHtml) {
          console.log('Restoring list page from cache');
          await this.displayHelpDeskContent(cachedHtml);
          this.lastVisitedUrl = state.params.url;
          this.lastPageTitle = state.params.title;
          this.currentState = state;
          this.addEventListeners();
          return;
        } else if (state.params.url) {
          // Cache'de yoksa ve URL varsa sayfayı yeniden yükle
          console.log('Reloading list page');
          await this.loadHelpDeskList(state.params.url, null, state.params.title);
          return;
        }
      }

      // Normal cache kontrolü
      const cacheKey = state.page + JSON.stringify(state.params);
      const cachedHtml = this.historyStack.get(cacheKey);

      if (cachedHtml) {
        console.log('Restoring page from cache');
        await this.displayHelpDeskContent(cachedHtml);
        this.lastVisitedUrl = state.params?.url;
        this.lastPageTitle = state.params?.title;
        this.currentState = state;
        this.addEventListeners();
        return;
      }

      // Cache'de yoksa normal sayfa yükleme işlemleri
      console.log('No cached content found, loading page:', state.page);
      switch (state.page) {
        case 'help-desk-dashboard':
          await this.loadHelpDeskPage();
          break;

        case 'help-desk-search':
          if (state.params?.searchData) {
            await this.loadSearchPage();
            const searchForm = document.getElementById('searchForm');
            if (searchForm) {
              Object.entries(state.params.searchData).forEach(([key, value]) => {
                const input = searchForm.querySelector(`[name="${key}"]`);
                if (input) input.value = value;
              });
              await this.handleSearchFormSubmit({
                preventDefault: () => { },
                target: searchForm
              });
            }
          } else {
            await this.loadSearchPage();
          }
          break;

        case 'help-desk-detail':
          if (state.params?.requestId) {
            await this.handleDetailLink(state.params.requestId);
          }
          break;

        case 'help-desk-category':
          if (state.params?.url) {
            await this.loadHelpDeskList(state.params.url, null, state.params.title);
          }
          break;

        case 'help-desk-list':
        case 'help-desk-priority':
          if (state.params?.url) {
            await this.loadHelpDeskList(state.params.url, null, state.params.title);
          }
          break;

        case 'help-desk-my-requests':
          await this.handleButtonClick('myRequests');
          break;

        case 'help-desk-new-request':
          await this.loadNewRequestForm();
          break;

        default:
          if (state.params?.returnTo) {
            await this.handlePopState({ state: state.params.returnTo });
          } else {
            await this.loadHelpDeskPage();
          }
          break;
      }
    } finally {
      this.isNavigatingThroughHistory = false;
    }
  }

  static showLoading() {
    const loadingSpinner = document.getElementById('loading-spinner');
    if (!loadingSpinner) {
      const spinner = document.createElement('div');
      spinner.id = 'loading-spinner';
      spinner.className = 'loading-spinner';
      document.body.appendChild(spinner);
    }
    document.getElementById('loading-spinner').style.display = 'block';
  }

  static hideLoading() {
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) {
      loadingSpinner.style.display = 'none';
    }
  }

  static parseHelpDeskContent(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    return doc;
  }

  static extractHelpDeskData(parsedContent, pageType = 'dashboard') {
    if (pageType === 'dashboard') {
      const data = {
        priorities: [],
        categories: []
      };

      // Priority configuration extraction
      const priorityConfig = {
        'normal_english.gif': {
          type: 'normal',
          label: 'Normal',
          icon: 'fa-check',
          color: 'green',
          url: 'https://hd.academyoflearning.net/HelpDesk/RequestList.aspx?method=Priority&PriorityID=1'
        },
        'high_english.gif': {
          type: 'high',
          label: 'High',
          icon: 'fa-arrow-up',
          color: 'orange',
          url: 'https://hd.academyoflearning.net/HelpDesk/RequestList.aspx?method=Priority&PriorityID=3'
        },
        'emergency_english.gif': {
          type: 'emergency',
          label: 'Emergency',
          icon: 'fa-exclamation-triangle',
          color: 'red',
          url: 'https://hd.academyoflearning.net/HelpDesk/RequestList.aspx?method=Priority&PriorityID=2'
        }
      };

      // Extract priority information
      const priorityImages = parsedContent.querySelectorAll('input[type="image"][src*="_english.gif"]');

      priorityImages.forEach(image => {
        const imgSrc = image.getAttribute('src');
        const gifName = imgSrc.split('/').pop();

        const config = priorityConfig[gifName];
        if (config) {
          const tdElement = image.closest('td');
          if (tdElement) {
            const nextTd = tdElement.nextElementSibling;
            if (nextTd) {
              const countLink = nextTd.querySelector('a');
              if (countLink) {
                const count = parseInt(countLink.textContent.trim()) || 0;
                if (count > 0) {
                  data.priorities.push({
                    type: config.type,
                    label: config.label,
                    count: count,
                    icon: config.icon,
                    color: config.color,
                    url: config.url
                  });
                }
              }
            }
          }
        }
      });

      // Extract category information
      const categoryLinks = parsedContent.querySelectorAll('a[id^="rpCategorySummary_"][id$="Linkbutton4"]');
      const categoryCountLinks = parsedContent.querySelectorAll('a[id^="rpCategorySummary_"][id$="Linkbutton6"]');
      for (let i = 0; i < categoryLinks.length; i++) {
        const categoryName = categoryLinks[i].textContent.trim();
        const categoryCount = parseInt(categoryCountLinks[i].textContent.trim()) || 0;

        if (categoryCount > 0) {
          const categoryInfo = this.dashboardData.searchForm.categories.find(cat =>
            cat.text.toLowerCase() === categoryName.toLowerCase()
          );

          data.categories.push({
            name: categoryName,
            count: categoryCount,
            categoryId: categoryInfo ? categoryInfo.value : null
          });
        }
      }

      // Update dashboardData
      this.dashboardData.priorities = data.priorities;
      this.dashboardData.categories = data.categories;

      return data;
    }
    else if (pageType === 'search') {
      // Extract search form data
      const categorySelect = parsedContent.querySelector('#ddlCategory');
      if (categorySelect) {
        this.dashboardData.searchForm.categories = Array.from(categorySelect.options).map(opt => ({
          value: opt.value,
          text: opt.textContent.trim()
        }));
      }

      const actionRequestSelect = parsedContent.querySelector('#ddlServicedBy');
      if (actionRequestSelect) {
        this.dashboardData.searchForm.actionRequests = Array.from(actionRequestSelect.options).map(opt => ({
          value: opt.value,
          text: opt.textContent.trim()
        }));
      }

      return {
        categories: this.dashboardData.searchForm.categories,
        actionRequests: this.dashboardData.searchForm.actionRequests
      };
    }
  }

  static currentRequestStatus = '';
  static currentRequestSubject = '';

  static parseRequestDetail(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    this.currentRequestStatus = doc.getElementById('lbStatus')?.textContent.trim() || '';
    this.currentRequestSubject = doc.getElementById('lbSubject')?.textContent.trim() || '';

    const data = {
      referenceNumber: doc.getElementById('lbRefNumber')?.textContent.trim() || '',
      priority: doc.getElementById('imgPriority')?.getAttribute('src') || '',
      requestStatus: this.currentRequestStatus,
      statusImage: doc.getElementById('imgStatus')?.getAttribute('src') || '',
      date: doc.getElementById('lbDate')?.textContent.trim() || '',
      time: doc.getElementById('lbTime')?.textContent.trim() || '',
      actionRequestTo: doc.getElementById('lbServicedBy')?.textContent.trim() || '',
      name: doc.getElementById('lbName')?.textContent.trim() || '',
      email: doc.getElementById('lbEmail')?.textContent.trim() || '',
      location: doc.getElementById('lbLocation')?.textContent.trim() || '',
      category: doc.getElementById('lbCategory')?.textContent.trim() || '',
      subject: this.currentRequestSubject,
      closedDate: doc.getElementById('lbClosedDate')?.textContent.trim() || '',
      closedTime: doc.getElementById('lbClosedTime')?.textContent.trim() || '',
      closedBy: doc.getElementById('lbClosedBy')?.textContent.trim() || '',
      attachments: Array.from(doc.querySelectorAll('[id*="dlFileName_"][id$="_hlFileName"]')).map(link => ({
        name: link.textContent.trim(),
        href: link.getAttribute('href') || ''
      })),
      conversation: []
    };

    // Description ve Solution alanlarını tek bir diziye birleştir
    const descriptionRows = Array.from(doc.querySelectorAll('#dlDescription > tbody > tr > td > pre'));
    const solutionRows = Array.from(doc.querySelectorAll('#dlSolution > tbody > tr > td > pre'));
    const allRows = [...descriptionRows, ...solutionRows];

    // Her bir satırı işle ve conversation dizisine ekle
    allRows.forEach(pre => {
      let text = pre.textContent.trim();

      // Tarih ve saat bilgisini çıkar
      const timestampMatch = text.match(/([0-9]+-[A-Za-z]+-[0-9]+ [0-9]+:[0-9]+:[0-9]+)/);
      const timestamp = timestampMatch ? timestampMatch[0] : '';
      let author = '';

      // Eğer tarih varsa, yazarı bul ve metinden çıkar
      if (timestamp) {
        const authorIndex = text.lastIndexOf(timestamp);
        text = text.substring(0, authorIndex).trim(); // Timestamp'i metinden kaldır
        author = text.substring(authorIndex + timestamp.length).trimStart();
      }

      data.conversation.push({
        text: text,
        timestamp: timestamp,
        author: author,
        isSolution: pre.closest('#dlSolution') !== null
      });
    });

    // İlk mesaj (timestamp'i olmayan) en başa al
    const firstMessage = data.conversation.find(msg => msg.timestamp === '');
    if (firstMessage) {
      data.conversation = [
        firstMessage,
        ...data.conversation.filter(msg => msg.timestamp !== '')
      ];
    }

    // Kalan mesajları timestamp'e göre sırala
    data.conversation = data.conversation.sort((a, b) => {
      if (!a.timestamp) return -1;
      if (!b.timestamp) return 1;
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    return data;
  }

  static async loadNewRequestForm() {
    try {
      this.showLoading();
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'helpDeskNewRequest' }, resolve);
      });

      if (result.success) {
        const parsedContent = this.parseHelpDeskContent(result.formContent);
        const formHTML = this.generateNewRequestFormHTML(parsedContent);
        this.displayHelpDeskContent(formHTML);
        console.log('Form yüklendi, event listener\'ları ekleniyor...');

        // Form event listener'larını ekle
        await this.addFormEventListeners();

        // VNumber search listener'ını ekle  
        console.log('VNumber search listener ekleniyor...');
        this.addVNumberSearchListener();

        if (!this.isNavigatingThroughHistory) {
          const state = {
            page: 'help-desk-new-request',
            timestamp: Date.now()
          };
          this.historyStack.set(state.page, formHTML);
          window.history.pushState(state, '', '/student_contract/helpdesk/new-request');
          this.currentState = state;
        }
      } else {
        ErrorHandler.showAlert("Failed to load new request form.");
      }
    } catch (error) {
      ErrorHandler.showAlert("There was an error loading the new request form.");
    } finally {
      this.hideLoading();
    }
  }

  static generateNewRequestFormHTML(parsedContent) {
    const requestStatus = parsedContent.getElementById('lbRequestStatus')?.textContent.trim() || '';
    const statusImage = parsedContent.getElementById('imgStatus')?.getAttribute('src') || '';
    const location = parsedContent.getElementById('lbLocation')?.textContent.trim() || '';
    const date = parsedContent.getElementById('lbDate')?.textContent.trim() || '';
    const time = parsedContent.getElementById('lbTime')?.textContent.trim() || '';
    const name = parsedContent.getElementById('txtName')?.value.trim() || '';
    const email = parsedContent.getElementById('txtEmailAddress')?.value.trim() || '';

    // Status Icon dönüşümü
    let statusIcon = HELPDESK_CONFIG.STATUS_ICONS.DEFAULT;
    if (statusImage.includes('openstatus.gif')) {
      statusIcon = HELPDESK_CONFIG.STATUS_ICONS.OPEN;
    } else if (statusImage.includes('closedstatus.gif')) {
      statusIcon = HELPDESK_CONFIG.STATUS_ICONS.CLOSED;
    }

    return `
      <div class="helpdesk-container">
        ${this.generateButtonRow()}
        <form method="post" enctype="multipart/form-data" class="request-detail" data-name="${name}" data-email="${email}">
          <div class="row">
            <div class="col-md-6">
              <div class="card p-3">
                <div>
                  <div style="display: flex; flex-wrap: nowrap; justify-content: space-between;">
                    <p><b>Request Status:</b> ${requestStatus}</p>
                    <p><i class="fas ${statusIcon.icon}" style="color: ${statusIcon.color};"></i></p>
                  </div>
                  <div style="display: flex;flex-wrap: nowrap;align-items: center; margin-bottom: 1.1rem; justify-content: space-between;">
                    <div style="display: flex;flex-wrap: nowrap;align-items: center;">
                      <p style="margin-bottom: 0;"><b>Priority:</b></p>
                      <select id="ddlPriority" name="ddlPriority" style="width: fit-content;margin-left: 10px;">
                        <option value="0">---</option>
                        <option value="4">Low</option>
                        <option value="5">On Hold</option>
                        <option value="1" selected>Normal</option>
                        <option value="3">High</option>
                        <option value="2">Emergency</option>
                      </select>
                    </div>
                    <div style="display: flex;flex-wrap: nowrap;align-items: center;">
                      <p style="margin-bottom: 0;"><b>Category:</b></p> 
                      <select id="ddlCategory" name="ddlCategory" style="width: fit-content;margin-left: 10px;" required>
                        ${this.dashboardData.searchForm.categories.map(category =>
      `<option value="${category.value}">${category.text}</option>`
    ).join('')}
                      </select>
                    </div>
                  </div>
                  <div style="display: flex;flex-wrap: nowrap;align-items: center; margin-bottom: 1.1rem;">
                    <p style="margin-bottom: 0;"><b>Subject:</b></p> 
                    <input type="text" id="txtSubject" name="txtSubject" style="width:100%; margin-left: 8px;" autocomplete="off" required>
                  </div>
                </div>
              </div>
            </div>
			<div class="col-md-3">
              <div class="card p-3" style="border: 3px dashed #d1d5db;padding: 12px!important;">
                <p style="text-align: center;"><b>Attachment:</b> </p>
                <p style="margin-bottom: 0;text-align: center;">Drag and Drop</p>
                <p style="margin-bottom: 1rem;text-align: center;">or</p>
                <input type="file" id="File1" name="File1" style="WIDTH: 100%">
              </div>
            </div>
            <div class="col-md-3">
              <div class="card p-3">
                <p><b>Name:</b> ${name}</p>
                <p><b>Email:</b> ${email}</p>
                <p><b>Date:</b> ${date} - ${time}</p>
                <p style="margin-bottom: 0;"><b>Location:</b> ${location}</p>
              </div>
            </div>
          </div>
          <div class="row mt-3">
            <div class="col-md-12">
              <div class="card p-3">
                <p><b>Description:</b> <textarea id="txtDescription" name="txtDescription" rows="2" cols="20" style="height:160px;width:100%;" required></textarea></p>
              </div>
            </div>
          </div>
          <div style="text-align: center;">
            <button type="submit" name="btnSubmit" value="Submit" class="btn btn-success btn-custom" style="width: auto;">Submit</button>
          </div>
        </form>
      </div>
    `;
  }

  static addVNumberSearchListener() {
    const subjectInput = document.getElementById('txtSubject');
    const rowMt3 = document.querySelector('.row.mt-3');
    let warningDiv = null;
    if (!subjectInput || !rowMt3) return;

    const vNumberPattern = /\b[Vv][A-Za-z]?\d+\b/;

    // Warning div'ini oluşturan helper fonksiyon
    const createWarningDiv = () => {
      warningDiv = document.createElement('div');
      warningDiv.className = 'warning-message';
      warningDiv.style.display = 'none';

      // Akordiyon başlık
      const header = document.createElement('div');
      header.className = 'vnumber-accordion-header';

      // İçerik alanı
      const content = document.createElement('div');
      content.className = 'vnumber-accordion-content';

      warningDiv.appendChild(header);
      warningDiv.appendChild(content);
      rowMt3.parentNode.insertBefore(warningDiv, rowMt3);

      // Akordiyon tıklama olayı
      header.addEventListener('click', () => {
        header.classList.toggle('active');
        content.classList.toggle('active');
      });

      return warningDiv;
    };

    // Debounce fonksiyonu
    const debounce = (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    };

    // Search işlemini gerçekleştiren fonksiyon
    const performVNumberSearch = async (vNumber) => {
      try {
        if (!warningDiv) {
          warningDiv = createWarningDiv();
        }

        const result = await this.handleSearchFormSubmit({
          preventDefault: () => { },
          vNumberSearch: true,
          vNumberData: {
            keyword: vNumber,
            matchAny: true
          }
        });

        if (result?.success) {
          const parsedResults = this.parseHelpDeskList(result.content);
          const count = parsedResults.rows.length;

          if (count > 0) {
            const lastRequestDate = parsedResults.rows[0].date;

            // Akordiyon başlığını güncelle
            const header = warningDiv.querySelector('.vnumber-accordion-header');
            header.innerHTML = `
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                          <div>
                              <i class="fas fa-exclamation-triangle"></i>
                              ${count} previous request${count > 1 ? 's have' : ' has'} been found.
                              <strong>Last Request Date: ${lastRequestDate}</strong>
                          </div>
                          <i class="fas fa-chevron-down toggle-icon"></i>
                      </div>
                  `;

            // Sadece tablo kısmını al
            const fullHtml = this.generateTableHtml(parsedResults, 'Previous Requests');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = fullHtml;
            const tableHtml = tempDiv.querySelector('.table.table-striped')?.outerHTML || '';

            // Tablo HTML'ini içeriğe ekle
            // ... performVNumberSearch fonksiyonu içinde
            const content = warningDiv.querySelector('.vnumber-accordion-content');
            content.innerHTML = tableHtml;
            warningDiv.style.display = 'block';

            // Tooltip listener'larını ekle
            const tooltipElements = content.querySelectorAll('[data-tooltip]');
            tooltipElements.forEach(element => {
              element.addEventListener('mouseenter', this.showTooltip);
              element.addEventListener('mouseleave', this.hideTooltip);
              element.addEventListener('mousemove', (event) => {
                const tooltipElement = document.querySelector('.custom-tooltip');
                if (tooltipElement) {
                  const x = event.clientX + 15;
                  const y = event.clientY + 5;

                  const viewportWidth = window.innerWidth;
                  const viewportHeight = window.innerHeight;
                  const tooltipWidth = 200;
                  const tooltipRect = tooltipElement.getBoundingClientRect();
                  const tooltipHeight = tooltipRect.height;

                  let finalX = x;
                  if (x + tooltipWidth > viewportWidth) {
                    finalX = x - tooltipWidth - 30;
                  }

                  let finalY = y;
                  if (y + tooltipHeight > viewportHeight) {
                    finalY = viewportHeight - tooltipHeight - 10;
                  }

                  tooltipElement.style.left = finalX + 'px';
                  tooltipElement.style.top = finalY + 'px';
                }
              });
            });

          } else {
            warningDiv.style.display = 'none';
          }
        }
      } catch (error) {
        console.error('VNumber search error:', error);
        warningDiv.style.display = 'none';
      }
    };

    // Debounced search fonksiyonu
    const debouncedSearch = debounce((value) => {
      const match = value.match(vNumberPattern);
      if (match) {
        const vNumber = match[0];
        console.log('Found V-Number:', vNumber);
        performVNumberSearch(vNumber);
      } else if (warningDiv) {
        warningDiv.style.display = 'none';
      }
    }, 500);

    // Input event listener
    subjectInput.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      debouncedSearch(value);
    });

    // Paste event için extra listener
    subjectInput.addEventListener('paste', (e) => {
      setTimeout(() => {
        const value = e.target.value.trim();
        debouncedSearch(value);
      }, 0);
    });
  }

  static getBase64FromFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    });
  }

  static async addFormEventListeners() {
    console.log('Adding form event listeners');
    const container = document.querySelector('.helpdesk-container');
    if (!container) {
      console.log('Container not found');
      return;
    }

    // Add submit event listener to form if it exists
    const form = container.querySelector('form.request-detail');
    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log('Form submit event triggered');

        try {
          // Önce NEW_REQUEST sayfasına GET isteği at
          const newRequestResponse = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: "helpDeskContent",
              url: HELPDESK_CONFIG.URLS.NEW_REQUEST,
              method: "GET"
            }, resolve);
          });

          if (newRequestResponse.success) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(newRequestResponse.content, 'text/html');

            // Yeni form state değerlerini al
            const viewState = doc.querySelector('#__VIEWSTATE')?.value;
            const viewStateGenerator = doc.querySelector('#__VIEWSTATEGENERATOR')?.value;
            const eventValidation = doc.querySelector('#__EVENTVALIDATION')?.value;

            if (viewState && viewStateGenerator && eventValidation) {
              // Hidden input'ları güncelle - null check ekle
              const viewStateInput = form.querySelector('[name="__VIEWSTATE"]');
              const viewStateGenInput = form.querySelector('[name="__VIEWSTATEGENERATOR"]');
              const eventValidationInput = form.querySelector('[name="__EVENTVALIDATION"]');

              if (!viewStateInput || !viewStateGenInput || !eventValidationInput) {
                console.log('Required hidden form fields are missing');
                // Gerekirse input'ları oluştur
                if (!viewStateInput) {
                  const input = document.createElement('input');
                  input.type = 'hidden';
                  input.name = '__VIEWSTATE';
                  form.appendChild(input);
                }
                if (!viewStateGenInput) {
                  const input = document.createElement('input');
                  input.type = 'hidden';
                  input.name = '__VIEWSTATEGENERATOR';
                  form.appendChild(input);
                }
                if (!eventValidationInput) {
                  const input = document.createElement('input');
                  input.type = 'hidden';
                  input.name = '__EVENTVALIDATION';
                  form.appendChild(input);
                }
              }

              // Değerleri güvenli şekilde set et
              form.querySelector('[name="__VIEWSTATE"]').value = viewState;
              form.querySelector('[name="__VIEWSTATEGENERATOR"]').value = viewStateGenerator;
              form.querySelector('[name="__EVENTVALIDATION"]').value = eventValidation;
            }
          }

          // Mevcut form validation ve submit işlemlerine devam et
          const category = document.getElementById('ddlCategory').value;
          const subject = document.getElementById('txtSubject').value;
          const description = document.getElementById('txtDescription').value;
          const priority = document.getElementById('ddlPriority').value;
          const name = form.dataset.name;
          const email = form.dataset.email;
          const fileInput = document.getElementById('File1');

          // Kategori kontrolü
          if (!category || category === '0') {
            ErrorHandler.showAlert("Please select a category");
            return;
          }

          // Diğer required field kontrolleri
          if (!subject || !description) {
            ErrorHandler.showAlert("Please fill in the mandatory fields (Subject and Description).");
            return;
          }

          // Dosya kontrolü
          var fileData;
          if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            fileData = {
              name: file.name,
              type: file.type,
              base64: await HelpDeskManager.getBase64FromFile(file)
            };
            console.log('File data prepared');
          }

          this.showLoading();

          // Form verilerini hazırla
          const formData = {
            ddlPriority: priority,
            txtName: name,
            txtEmailAddress: email,
            ddlCategory: category,
            txtSubject: subject,
            txtDescription: description,
            file: fileData
          };

          console.log('Sending form data to background script');
          const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: "helpDeskContent",
              url: HELPDESK_CONFIG.URLS.NEW_REQUEST,
              method: "POST",
              data: formData
            }, resolve);
          });

          console.log('Form submission result:', result);

          if (result.success) {
            // Response URL'den request number'ı al
            const requestIdMatch = result.url.match(/RefNumber=(\d+)/);
            if (requestIdMatch && requestIdMatch[1]) {
              const requestId = requestIdMatch[1];
              console.log('Request created successfully, ID:', requestId);

              // Detay sayfasına yönlendir
              await this.handleDetailLink(requestId);
            } else {
              ErrorHandler.showAlert("Request created but could not open detail page. Please check My Requests.");
            }
          } else {
            ErrorHandler.showAlert("Form submission failed. Please try again.");
          }

        } catch (error) {
          ErrorHandler.showAlert("An error occurred during form submission.");
        } finally {
          this.hideLoading();
        }
      });

      // Event listener for category change to remove error if any
      const categorySelect = document.getElementById('ddlCategory');
      if (categorySelect) {
        categorySelect.addEventListener('change', () => {
          if (categorySelect.value !== '0') {
            ErrorHandler.clearError?.();
          }
        });
      }
    }

    // Drag and drop handlers
    const dropZone = document.querySelector('.card[style*="dashed"]');
    if (dropZone) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
      });

      function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
      }

      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
          dropZone.style.backgroundColor = '#f0f0f0';
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
          dropZone.style.backgroundColor = '';
        });
      });

      dropZone.addEventListener('drop', (e) => {
        const fileInput = document.getElementById('File1');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          fileInput.files = e.dataTransfer.files;
          console.log('File dropped:', e.dataTransfer.files[0]);
        }
      });
    }
  }

  static parseHelpDeskList(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const table = doc.querySelector('#Table2 > tbody > tr:nth-child(1) > td > table > tbody');
    if (!table) {
      return { rows: [], pagination: null };
    }

    const rows = Array.from(table.querySelectorAll('tr'));
    const parsedRows = rows.slice(0).map((row, index) => {
      const cells = Array.from(row.querySelectorAll('td'));

      const requestIdCell = cells[1];
      const requestIdLink = requestIdCell?.querySelector('a');
      const requestIdEventTarget = requestIdLink?.href.match(/javascript:__doPostBack\('([^']+)'/)?.[1] || '';
      const subjectLink = cells[8]?.querySelector('a');
      const subjectEventTarget = subjectLink?.href.match(/javascript:__doPostBack\('([^']+)'/)?.[1] || '';

      return {
        priority: cells[0]?.querySelector('input[type="image"]')?.getAttribute('src') || '',
        priorityTooltip: cells[0]?.querySelector('input[type="image"]')?.getAttribute('alt') || '',
        requestId: cells[1]?.innerHTML || '',
        requestIdText: requestIdLink?.textContent.trim() || '',
        requestIdEventTarget: requestIdEventTarget,
        email: cells[2]?.querySelector('a')?.getAttribute('href')?.replace('mailto:', '') || '',
        date: cells[3]?.textContent.trim() || '',
        time: cells[4]?.textContent.trim() || '',
        name: cells[5]?.textContent.trim() || '',
        category: cells[6]?.textContent.trim() || '',
        assignedTo: cells[7]?.textContent.trim() || '',
        subject: cells[8]?.querySelector('a')?.textContent.trim() || '',
        subjectEventTarget: subjectEventTarget
      };
    });

    const dlPages = doc.querySelector('#dlPages');
    let pagination = null;
    if (dlPages) {
      const paginationLinks = Array.from(dlPages.querySelectorAll('a')).map(a => ({
        text: a.textContent,
        eventTarget: a.href.match(/'([^']+)'/)[1]
      }));
      const currentPage = doc.querySelector('#lbPages')?.textContent.trim() || '';
      const totalPages = currentPage.split(' of ')[1] || '';
      pagination = { links: paginationLinks, currentPage, totalPages };
    }

    return { rows: parsedRows, pagination };
  }

  static generateNewHelpDeskHTML(extractedData) {
    let html = `
      <div class="helpdesk-container">
        ${this.generateButtonRow()}
        <div class="queue-status">
          <div class="status-header">
            <h3>Requests by Priority</h3>
            <h3>Requests by Categories</h3>
          </div>
          <div class="status-content">
            <div class="status-column">
              ${extractedData.priorities.map(priority => `
                <div class="status-row">
                  <span class="status ${priority.type}">
                    <i class="fas ${priority.icon}" style="color: ${priority.color};"></i>
                    <a href="#" class="status-link" data-action="${priority.type}">${priority.label}</a>
                  </span>
                  <a href="#" class="count-link" data-action="${priority.type}">
                    <span class="count">${priority.count}</span>
                  </a>
                </div>
              `).join('')}
            </div>
            <div class="status-column">
              ${extractedData.categories.map(category => `
                <div class="category-row">
                  <a href="#" class="status-link" data-action="category" data-category-id="${category.categoryId}">
                    <span class="category-name">${category.name}</span>
                  </a>
                  <a href="#" class="count-link" data-action="category" data-category-id="${category.categoryId}">
                    <span class="count">${category.count}</span>
                  </a>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    return html;
  }

  static generateRequestDetailHTML(extractedData) {
    // Priority Icon dönüşümü
    let priorityIcon;
    if (extractedData.priority.includes(HELPDESK_CONFIG.PRIORITY_IMAGES.NORMAL)) {
      priorityIcon = HELPDESK_CONFIG.PRIORITY_ICONS.NORMAL;
    } else if (extractedData.priority.includes(HELPDESK_CONFIG.PRIORITY_IMAGES.HIGH)) {
      priorityIcon = HELPDESK_CONFIG.PRIORITY_ICONS.HIGH;
    } else if (extractedData.priority.includes(HELPDESK_CONFIG.PRIORITY_IMAGES.EMERGENCY)) {
      priorityIcon = HELPDESK_CONFIG.PRIORITY_ICONS.EMERGENCY;
    } else if (extractedData.priority.includes(HELPDESK_CONFIG.PRIORITY_IMAGES.ON_HOLD)) {
      priorityIcon = HELPDESK_CONFIG.PRIORITY_ICONS.ON_HOLD;
    } else {
      priorityIcon = HELPDESK_CONFIG.PRIORITY_ICONS.DEFAULT;
    }

    // Status Icon dönüşümü
    let statusIcon;
    if (extractedData.statusImage.includes('openstatus.gif')) {
      statusIcon = HELPDESK_CONFIG.STATUS_ICONS.OPEN;
    } else if (extractedData.statusImage.includes('closedstatus.gif')) {
      statusIcon = HELPDESK_CONFIG.STATUS_ICONS.CLOSED;
    } else {
      statusIcon = HELPDESK_CONFIG.STATUS_ICONS.DEFAULT;
    }

    const subjectLength = extractedData.subject.length;
    const truncatedSubject = subjectLength > 80 ?
      extractedData.subject.substring(0, 80) + '...' :
      extractedData.subject;

    // Tooltip attribute'unu sadece metin 80 karakterden uzunsa ekle
    const subjectSpan = subjectLength > 80 ?
      `<span class="tooltipped-text" data-tooltip="${extractedData.subject}">${truncatedSubject}</span>` :
      `<span>${truncatedSubject}</span>`;

    // Inside the conversation-container div template string
    const conversationHtml = extractedData.conversation.map(message => {
      const hasStudentEmail = message.text.match(/.*@my-aolcc\.com.*/m);
      //const hasVNumber = message.text.match(/\b[Vv][TBN]\d{5,}\b/);
      const showExcelBtn = hasStudentEmail;

      const cleanText = message.text
        .split('\n')
        .filter(line => !line.match(/^\s*[A-Za-z\s]+\s*$/))
        .join('\n');

      return `
        <div class="message-row ${message.isSolution ? 'solution-message' : ''}">
          <pre class="message-text">
            ${message.text}
            ${showExcelBtn ? `
              <button class="excel-download-btn" data-message="${encodeURIComponent(cleanText)}" title="Export to Excel">
                <i class="fas fa-file-excel"></i>
                <span class="btn-text">Export as Excel</span>
                <div class="loading-spinner"></div>
              </button>
            ` : ''}
          </pre>
          <pre class="message-timestamp">${message.timestamp} ${message.author ? '- ' + message.author : ''}</pre>
        </div>
      `;
    }).join('');

    let html = `
      <div class="helpdesk-container" data-request-status="${extractedData.requestStatus}">
        ${this.generateButtonRow()}
        <div class="request-detail">
          <div class="row">
            <div class="col-md-6">
              <div class="card p-3">
                <div>
                  <div style="display: flex; flex-wrap: nowrap; justify-content: space-between;">
                    <p><b>Reference Number:</b> ${extractedData.referenceNumber}</p>
                    <p><i class="fas ${statusIcon.icon}" style="color: ${statusIcon.color};"></i> ${extractedData.requestStatus}</p>
                  </div>
                  <p><b>Priority:</b> <i class="fas ${priorityIcon.icon}" style="color: ${priorityIcon.color};"></i> ${priorityIcon.text}</p>
                  <p><b>Category:</b> ${extractedData.category}</p>
				  <p><b>Subject:</b> ${subjectSpan}</p>
                </div>
              </div>
            </div>
			  <div class="col-md-3">
              <div class="card p-3">
                <p><b>Name:</b> ${extractedData.name}</p>
                <p><b>Email:</b> ${extractedData.email}</p>
				<p style="display: flex; flex-wrap: nowrap; align-items: center"><b>Attachment:</b>
				  ${extractedData.attachments.length > 0 ? `
					${extractedData.attachments.map(attachment => {
      const extensionMatch = attachment.name.toLowerCase().match(/\.[^ ]+/);
      const extension = extensionMatch ? extensionMatch[0] : "";
      const icon = HELPDESK_CONFIG.ATTACHMENT_ICONS[extension] || HELPDESK_CONFIG.ATTACHMENT_ICONS.default;
      const truncatedName = attachment.name.length > 25 ? attachment.name.substring(0, 22) + '...' : attachment.name;
      const attachmentId = attachment.href.match(/AttachmentID=(\d+)/)?.[1];
      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(extension);
      return `<a href="javascript:void(0)" 
						  class="attachment-link tooltipped-text" 
						  data-tooltip="${attachment.name}"
						  data-attachment-id="${attachment.href.match(/AttachmentID=(\d+)/)?.[1]}"
						  data-type="${icon === 'fa-file-pdf' ? 'pdf' : (icon === 'fa-file-image' ? 'image' : 'other')}"
						  >
						<i class="fas ${icon}" style="margin-right: 4px;"></i>
						<span>${truncatedName}</span>
					  </a>`;
    }).join(' ')}
				  ` : ''}</p>
                <p><b>Act. Request To:</b> ${extractedData.actionRequestTo}</p>
              </div>
            </div>
			  <div class="col-md-3">
			  <div class="card p-3">
                <p><b>Location:</b> ${extractedData.location}</p>
                <p><b>Opened Date :</b> ${extractedData.date} - ${extractedData.time}</p>
                <p><b>Closed Date :</b> ${extractedData.closedDate} - ${extractedData.closedTime}</p>
                <p><b>Closed By:</b> ${extractedData.closedBy}</p>
              </div>
            </div>
          </div>
          <div class="row mt-3">
            <div class="col-md-12">
              <div class="card p-3">
              <div class="conversation-header">
                <h4>Conversation</h4>
                <i class="fas fa-bell notification-icon" id="notification-${extractedData.referenceNumber}"></i>
              </div>
                <div class="conversation-container">
                  ${conversationHtml}
                </div>
                <!-- Message Area Container -->
                <div class="message-input-container">
                  <div class="message-input-wrapper">
                    <textarea 
                      id="newMessageArea" 
                      class="message-input" 
                      placeholder="Type your message here..."
                    ></textarea>
                    <div class="message-actions">
                      <label for="fileInput" class="attachment-icon">
                        <i class="fas fa-paperclip"></i>
                        <input type="file" id="fileInput" style="display: none" multiple>
                      </label>
                      <button class="send-button">
                        <i class="fas fa-paper-plane"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Close Request Button -->
                <div class="close-request-container">
                  <button id="closeRequestBtn" class="close-request-button">
                    Close Request
                  </button>
                </div>
                
              </div>
            </div>
          </div>
		  <div class="modal-overlay">
          <div class="modal-content">
            <button class="modal-close">&times;</button>
          </div>
        </div>
        </div>
        </div>
      </div>
    `;

    if (!document.querySelector('#excel-btn-styles')) {
      const styles = document.createElement('style');
      styles.id = 'excel-btn-styles';
      styles.textContent = `
        .excel-download-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          margin-left: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: #fff;
          cursor: pointer;
          transition: all 0.3s;
        }
        .excel-download-btn:hover {
          background: #f0f0f0;
        }
        .excel-download-btn.loading {
          background: #e0e0e0;
          cursor: not-allowed;
        }
        .excel-download-btn.loading .loading-spinner {
          display: inline-block;
        }
        .excel-download-btn.loading .btn-text {
          color: #666;
        }
      `;
      document.head.appendChild(styles);
    }

    setTimeout(() => {
      this.initializeMessageArea();
      this.addNotificationIconToConversation();
    }, 0);
    return html;
  }

  static generateTableHtml(data, title, errorMessage = null) {
    const showOnlyOpen = localStorage.getItem('showOnlyOpenTickets') === 'true';
    let html = `
      <div class="helpdesk-container">
        ${this.generateButtonRow()}
        <div class="table-header">
        <h3>${title}</h3>
        ${title === 'My Requests' ? `
          <div class="show-open-switch">
            <label class="switch">
              <input type="checkbox" id="showOnlyOpenTickets" ${showOnlyOpen ? 'checked' : ''}>
              <span class="slider round"></span>
            </label>
            <span class="switch-label">Show Only Open Requests</span>
          </div>
        ` : ''}
      </div>
        <table class="table table-striped">
          <thead>
            <tr>
              <th>Priority</th>
              <th>Request ID</th>
              <th>Email</th>
              <th>Date</th>
              <th>Time</th>
              <th>Name</th>
              <th>Category</th>
              <th>Assigned To</th>
              <th>Subject</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (errorMessage) {
      html += `
        <tr>
          <td colspan="9" style="text-align: center;">${errorMessage}</td>
        </tr>
      `;
    } else if (data.rows.length === 0) {
      html += `
        <tr>
          <td colspan="9" style="text-align: center;">The Help Desk list is currently empty. Please check back later.</td>
        </tr>
      `;
    } else {
      data.rows.forEach((row, index) => {
        const bgColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';

        // Priority icon ve text için kontroller
        let priorityIcon;
        if (row.priority.includes(HELPDESK_CONFIG.PRIORITY_IMAGES.NORMAL)) {
          priorityIcon = HELPDESK_CONFIG.PRIORITY_ICONS.NORMAL;
        } else if (row.priority.includes(HELPDESK_CONFIG.PRIORITY_IMAGES.HIGH)) {
          priorityIcon = HELPDESK_CONFIG.PRIORITY_ICONS.HIGH;
        } else if (row.priority.includes(HELPDESK_CONFIG.PRIORITY_IMAGES.EMERGENCY)) {
          priorityIcon = HELPDESK_CONFIG.PRIORITY_ICONS.EMERGENCY;
        } else if (row.priority.includes(HELPDESK_CONFIG.PRIORITY_IMAGES.ON_HOLD)) {
          priorityIcon = HELPDESK_CONFIG.PRIORITY_ICONS.ON_HOLD;
        } else {
          priorityIcon = HELPDESK_CONFIG.PRIORITY_ICONS.DEFAULT;
        }

        // Request ID için status icon
        let statusIcon;
        if (row.requestId.includes('openstatus.gif')) {
          statusIcon = HELPDESK_CONFIG.STATUS_ICONS.OPEN;
        } else if (row.requestId.includes('closedstatus.gif')) {
          statusIcon = HELPDESK_CONFIG.STATUS_ICONS.CLOSED;
        } else {
          statusIcon = HELPDESK_CONFIG.STATUS_ICONS.DEFAULT;
        }

        const truncatedSubject = row.subject.length > 60 ? row.subject.substring(0, 57) + "..." : row.subject;

        html += `
          <tr style="background-color: ${bgColor};">
            <td style="text-wrap: nowrap; font-size:15px;">
              <span class="priority-icon" data-tooltip="${row.priorityTooltip}">
                <i class="fas ${priorityIcon.icon}" style="color: ${priorityIcon.color};"></i>
                <span style="color: ${priorityIcon.color}; margin-left: 5px;">${priorityIcon.text}</span>
              </span>
            </td>
			<td style="text-wrap: nowrap; font-size:15px;">
              <i class="fas ${statusIcon.icon}" style="color: ${statusIcon.color};"></i>
              <a href="#" class="request-link" data-request-id="${row.requestIdText}">${row.requestIdText}</a>
            </td>
            <td style="text-wrap: nowrap; font-size:15px;">
              <a href="mailto:${row.email}" title="${row.email}">
                <i class="fas fa-envelope"></i>
              </a>
            </td>
            <td style="text-wrap: nowrap; font-size:15px;">${row.date}</td>
            <td style="text-wrap: nowrap; font-size:15px;">${row.time}</td>
            <td style="text-wrap: nowrap; font-size:15px;">${row.name}</td>
            <td style="text-wrap: nowrap; font-size:15px;">${row.category}</td>
            <td style="text-wrap: nowrap; font-size:15px;">${row.assignedTo}</td>
            <td style="text-wrap: nowrap; font-size:15px;">
              <a href="#" class="subject-link" data-request-id="${row.requestIdText}" data-tooltip="${row.priorityTooltip}">${truncatedSubject}</a>
            </td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>
    `;

    // HelpDeskManager sınıfı içinde generateTableHtml metodunda:
    if (title === 'My Requests') {
      setTimeout(() => {
        const checkbox = document.getElementById('showOnlyOpenTickets');
        if (checkbox) {
          checkbox.addEventListener('change', async (e) => {
            try {
              localStorage.setItem('showOnlyOpenTickets', e.target.checked);

              this.showLoading();
              const result = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                  action: "helpDeskContent",
                  url: e.target.checked ?
                    HELPDESK_CONFIG.URLS.MY_OPEN_REQUESTS :
                    HELPDESK_CONFIG.URLS.SEARCH_REQUEST,
                  method: e.target.checked ? "GET" : "POST",
                  data: {
                    type: 'myRequests',
                    showOpenOnly: e.target.checked
                  }
                }, resolve);
              });

              if (result.success) {
                const parsedContent = this.parseHelpDeskList(result.content);
                const tableHtml = this.generateTableHtml(parsedContent, 'My Requests');
                await this.displayHelpDeskContent(tableHtml);
                this.addEventListeners();
              }
            } catch (error) {
              ErrorHandler.showAlert("Failed to update filter");
            } finally {
              this.hideLoading();
            }
          });
        }
      }, 0);
    }

    if (data.pagination) {
      html += `
        <div class="pagination">
          ${this.generatePaginationHtml(data.pagination)}
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  static generateSearchPageHTML() {
    let html = `
      <div class="helpdesk-container">
        ${this.generateButtonRow()}
        <div class="search-form-hd">
          <h2>Search Request</h2>
          <form id="searchForm">
            <div class="form-group-hd">
              <div class="form-hd">
                <label for="referenceNumber">Reference Number:</label>
                <input type="number" id="referenceNumber" name="referenceNumber" min="1" max="999999">
              </div>
              <div class="form-hd">
                <label for="priority">Priority:</label>
                <select id="priority" name="priority">
                  <option value="0">---</option>
                  <option value="4">Low</option>
                  <option value="5">On Hold</option>
                  <option value="1">Normal</option>
                  <option value="3">High</option>
                  <option value="2">Emergency</option>
                </select>
              </div>
              <div class="form-hd">
                <label for="requestStatus">Request Status:</label>
                <select id="requestStatus" name="requestStatus">
                  <option value="0">---</option>
                  <option value="1">New</option>
                  <option value="2">Open</option>
                  <option value="3">Closed</option>
                </select>
              </div>
              <div class="form-hd">
                <label for="requestStatus">Date:</label>
                <input name="txtDate" type="date" id="txtDate" class="">
              </div>
              <div class="form-hd">
                <label for="actionRequestTo">Action Request To:</label>
                <select id="actionRequestTo" name="actionRequestTo">
                  ${this.dashboardData.searchForm.actionRequests.map(opt =>
      `<option value="${opt.value}">${opt.text}</option>`
    ).join('')}
                </select>
              </div>
              <div class="form-hd">
                <label for="category">Category:</label>
                <select id="category" name="category">
                  ${this.dashboardData.searchForm.categories.map(opt =>
      `<option value="${opt.value}">${opt.text}</option>`
    ).join('')}
                </select>
              </div>
            </div>
              
            <div class="form-hd">
              <label for="keyword">Keyword:</label>
              <input type="text" id="keyword" name="keyword" placeholder="You can search by any keyword such as V Number, Student Name, Your Name, Your Email, Subject or Description." autocomplete="off">
            </div>
            <button type="submit" class="submit-btn">Search</button>
          </form>
        </div>
      </div>
    `;
    return html;
  }

  static generateButtonRow() {
    return `
      <div class="button-row">
        <button class="btn btn-success btn-custom" data-action="dashboard"><i class="fas fa-dashboard"></i> DASHBOARD</button>
        <button class="btn btn-success btn-custom" data-action="newRequest"><i class="fas fa-plus"></i> NEW REQUEST</button>
        <button class="btn btn-success btn-custom" data-action="search"><i class="fas fa-search"></i> SEARCH</button>
        <button class="btn btn-success btn-custom" data-action="myRequests"><i class="fas fa-list"></i> MY REQUESTS</button>
        <button class="btn btn-success btn-custom" data-action="listOpen"><i class="fas fa-folder-open"></i> LIST OPEN</button>
        <button class="btn btn-success btn-custom" data-action="emergency"><i class="fas fa-exclamation-triangle"></i> EMERGENCY</button>
        <button class="btn btn-success btn-custom" data-action="high"><i class="fas fa-arrow-up"></i> HIGH</button>
        <button class="btn btn-success btn-custom" data-action="normal"><i class="fas fa-check"></i> NORMAL</button>
        <button class="btn btn-success btn-custom" data-action="listClosed"><i class="fas fa-folder"></i> LIST CLOSED</button>
      </div>
    `;
  }

  static generatePaginationHtml(pagination) {
    const { links, currentPage, totalPages } = pagination;
    let html = '<div class="pagination-container">';
    html += '<div class="pagination-links">';
    links.forEach(link => {
      const isActive = link.text === currentPage.split(' of ')[0];
      html += `
        <a href="#" class="pagination-link ${isActive ? 'active' : ''}" 
           data-event-target="${link.eventTarget}">
          ${link.text}
        </a>
      `;
    });
    html += '</div>';

    html += `<div class="pagination-total">Page ${currentPage} of ${totalPages}</div>`;
    html += '</div>';
    return html;
  }

  // Yeni fonksiyonları buraya ekleyin
  static adjustTextareaHeight(status) {
    const textarea = document.getElementById('newMessageArea');
    textarea.style.height = status.toLowerCase() === 'closed' ? '60px' : '160px';
  }

  static handleFiles(files) {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      // Create a new FileList object
      const dataTransfer = new DataTransfer();
      Array.from(files).forEach(file => dataTransfer.items.add(file));
      fileInput.files = dataTransfer.files;

      // Trigger change event
      const event = new Event('change');
      fileInput.dispatchEvent(event);
    }
  }

  // Bu fonksiyonu sayfayı yüklerken çağırın
  static initializeMessageArea() {
    const statusElement = document.querySelector('[data-request-status]');
    const requestStatus = statusElement ? statusElement.getAttribute('data-request-status').toLowerCase() : 'open';
    const textarea = document.getElementById('newMessageArea');
    const wrapper = document.querySelector('.message-input-wrapper');
    const fileInput = document.getElementById('fileInput');
    const closeButton = document.getElementById('closeRequestBtn');

    if (textarea && wrapper) {
      function showFileInfo(file) {
        const fileInfo = document.createElement('div');
        fileInfo.className = 'attached-file-info';
        fileInfo.innerHTML = `
                <i class="fas fa-paperclip"></i>
                <span>${file.name}</span>
                <i class="fas fa-times remove-file"></i>
            `;

        const existingFileInfo = wrapper.querySelector('.attached-file-info');
        if (existingFileInfo) {
          existingFileInfo.remove();
        }

        wrapper.appendChild(fileInfo);

        const removeButton = fileInfo.querySelector('.remove-file');
        removeButton.addEventListener('click', () => {
          fileInput.value = '';
          fileInfo.remove();
          updateSendButtonState();
        });
        updateSendButtonState();
      }

      function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
      }

      function handleDragEnter() {
        wrapper.classList.add('dragover');
      }

      function handleDragLeave() {
        wrapper.classList.remove('dragover');
      }

      function handleDrop(e) {
        wrapper.classList.remove('dragover');
        const dt = e.dataTransfer;
        const file = dt.files[0];

        if (file) {
          fileInput.files = dt.files;
          showFileInfo(file);
        }
      }

      [textarea, wrapper].forEach(element => {
        element.addEventListener('dragenter', preventDefaults);
        element.addEventListener('dragover', preventDefaults);
        element.addEventListener('dragleave', preventDefaults);
        element.addEventListener('drop', preventDefaults);

        element.addEventListener('dragenter', handleDragEnter);
        element.addEventListener('dragover', handleDragEnter);
        element.addEventListener('dragleave', handleDragLeave);
        element.addEventListener('drop', handleDrop);
      });

      const sendButton = wrapper.querySelector('.send-button');
      if (sendButton) {
        sendButton.disabled = true;
        sendButton.style.opacity = '0.5';
        sendButton.style.cursor = 'not-allowed';
        sendButton.addEventListener('click', async () => {
          const requestId = this.currentState?.params?.requestId;
          if (!requestId) {
            console.error('Request ID not found in current state');
            return;
          }

          const messageText = textarea.value.trim();

          if (!messageText && (!fileInput || !fileInput.files[0])) {
            return; // Don't send if no message and no file
          }

          // Prepare file data if exists
          let fileData;
          if (fileInput && fileInput.files[0]) {
            const file = fileInput.files[0];
            fileData = {
              name: file.name,
              type: file.type,
              base64: await HelpDeskManager.getBase64FromFile(file)
            };
          }

          this.showLoading();

          if (!requestId) {
            // URL'den requestId'yi almayı dene
            const pathname = window.location.pathname;
            const matches = pathname.match(/\/student_contract\/request\/(\d+)/);

            if (matches && matches[1]) {
              requestId = matches[1];
            } else {
              ErrorHandler.showAlert("Invalid request ID");
              return;
            }
          }

          // İlk isteği yap ve form verilerini güncelle
          const initialResponse = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: "helpDeskContent",
              url: `${HELPDESK_CONFIG.URLS.REQUEST_DETAIL}?RefNumber=${requestId}`,
              method: "POST",
              data: {
                modify: true
              }
            }, resolve);
          });

          if (!initialResponse.success) {
            throw new Error("Failed to get initial form data");
          }

          // HTML'den form verilerini parse et
          const parser = new DOMParser();
          const doc = parser.parseFromString(initialResponse.content, 'text/html');

          // Form verilerini hazırla
          const formData = {
            ddlPriority: doc.querySelector('#ddlPriority')?.value || '1',
            txtName: doc.querySelector('#txtName')?.value || '',
            txtEmailAddress: doc.querySelector('#txtEmailAddress')?.value || '',
            ddlCategory: doc.querySelector('#ddlCategory')?.value || '',
            txtSubject: doc.querySelector('#txtSubject')?.value || '',
            txtDescription: messageText,
            file: fileData
          };

          console.log('Sending form data to background script');
          const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: "helpDeskContent",
              url: `${HELPDESK_CONFIG.URLS.MODIFY_REQUEST}?RefNumber=${requestId}`,
              method: "POST",
              data: formData
            }, resolve);
          });

          console.log('Form submission result:', result);

          // Update the try-catch block in helpDeskManager.js
          try {
            if (result?.success) {
              // Check if URL exists before matching
              if (!result.url) {
                ErrorHandler.showAlert("Request created but URL is missing. Please check My Requests.");
                return;
              }

              // Response URL'den request number'ı al
              const requestIdMatch = result.url.match(/RefNumber=(\d+)/);
              if (requestIdMatch?.[1]) {
                const requestId = requestIdMatch[1];
                console.log('Request created successfully, ID:', requestId);

                // Detay sayfasına yönlendir
                await this.handleDetailLink(requestId);
              } else {
                ErrorHandler.showAlert("Request created but could not open detail page. Please check My Requests.");
              }
            } else {
              const errorMessage = result?.error || 'Unknown error';
              ErrorHandler.showAlert(`Form submission failed: ${errorMessage}`);
            }
          } catch (error) {
            const errorDetail = error?.message || 'Unknown error occurred';
            ErrorHandler.showAlert(`Failed to send message: ${errorDetail}`);
          }
        });
      }

      function updateSendButtonState() {
        if (sendButton) {
          const hasText = textarea && textarea.value.trim().length > 0;
          const hasFile = wrapper.querySelector('.attached-file-info') !== null;

          if (hasText || hasFile) {
            sendButton.disabled = false;
            sendButton.style.opacity = '1';
            sendButton.style.cursor = 'pointer';
          } else {
            sendButton.disabled = true;
            sendButton.style.opacity = '0.5';
            sendButton.style.cursor = 'not-allowed';
          }
        }
      }
      // Event listeners
      if (textarea) {
        textarea.addEventListener('input', updateSendButtonState);
      }

      // Remove file listener'ı wrapper'da kalmalı çünkü dosya kaldırma işlemi sonrası buton state'ini güncellememiz gerekiyor
      wrapper.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-file')) {
          setTimeout(updateSendButtonState, 0);
        }
      });

      if (closeButton) {
        if (requestStatus === 'closed') {
          closeButton.style.display = 'none';
        } else {
          closeButton.style.display = 'inline-block'; // veya 'block'

          closeButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to close this request?')) {
              try {
                const requestId = this.currentState?.params?.requestId;
                if (!requestId) return;

                this.showLoading();
                const result = await new Promise((resolve) => {
                  chrome.runtime.sendMessage({
                    action: "helpDeskContent",
                    url: `${HELPDESK_CONFIG.URLS.REQUEST_DETAIL}?RefNumber=${requestId}`,
                    method: "POST",
                    data: { close: true }
                  }, resolve);
                });

                if (result.success) {
                  await this.handleButtonClick('myRequests');
                }
              } catch (error) {
                console.error('Close request error:', error);
              } finally {
                this.hideLoading();
              }
            }
          });
        }
      }

      // File input change handler
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            showFileInfo(file);
          }
        });
      }
    }
  }

  static async addNotificationIconToConversation() {
    const requestId = this.currentState?.params?.requestId;
    if (!requestId) return;

    const notificationIcon = document.querySelector(`.notification-icon[id="notification-${requestId}"]`);
    if (!notificationIcon) return;

    // Storage'dan mevcut durumu kontrol et
    const storageData = await chrome.storage.local.get(`notification-${requestId}`);
    if (storageData[`notification-${requestId}`] === true) {
      notificationIcon.classList.add('active');
    }

    notificationIcon.addEventListener('click', async () => {
      const isActive = notificationIcon.classList.toggle('active');

      if (isActive) {
        // İlk content length'i al ve kaydet
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: "helpDeskContent",
            url: HELPDESK_CONFIG.URLS.REQUEST_DETAIL + `?RefNumber=${requestId}`,
          }, resolve);
        });

        if (response.success) {
          await chrome.storage.local.set({
            [`notification-${requestId}`]: isActive,
            [`notification-${requestId}-subject`]: this.currentRequestSubject,
            [`notification-${requestId}-length`]: response.content.length
          });
        }
      } else {
        // Notification kapatıldığında storage'dan sil
        await chrome.storage.local.remove([
          `notification-${requestId}`,
          `notification-${requestId}-subject`,
          `notification-${requestId}-length`
        ]);
      }
    });
  }

  static async loadHelpDeskPage() {
    try {
      this.showLoading();

      const favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.href = chrome.runtime.getURL('src/icons/hd.png');

      const existingFavicons = document.querySelectorAll("link[rel='icon']");
      existingFavicons.forEach(icon => icon.remove());

      document.head.appendChild(favicon);

      document.title = 'EP Help Desk';
      // Refresh handler'ı ekle
      this.initializeRefreshHandler();

      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "helpDeskDashboard" }, resolve);
      });

      if (result.success) {
        const parsedDashboardContent = this.parseHelpDeskContent(result.dashboardContent);
        const parsedSearchContent = this.parseHelpDeskContent(result.searchContent);

        if (this.dashboardData.categories === null || this.dashboardData.categories.length === 0) {
          this.extractHelpDeskData(parsedSearchContent, 'search');
        }

        const dashboardData = this.extractHelpDeskData(parsedDashboardContent, 'dashboard');
        const combinedData = {
          priorities: dashboardData.priorities,
          categories: this.dashboardData.categories
        };

        const newHTML = this.generateNewHelpDeskHTML(combinedData);
        this.displayHelpDeskContent(newHTML);
        this.addEventListeners();
      } else {
        ErrorHandler.showAlert("There was an error loading Help Desk. Please check your username and password.");
      }
    } catch (error) {
      ErrorHandler.showAlert("There was an error loading the Help Desk page. Please try again later.");
    } finally {
      this.hideLoading();
    }
  }

  static initializeRefreshHandler() {
    // F5 ve Ctrl+R için handler
    window.removeEventListener('keydown', this.handleRefreshKey);

    this.handleRefreshKey = (e) => {
      // Sadece F5 veya Ctrl+R kombinasyonlarını yakala
      const isRefreshKey = e.key === 'F5' || (e.ctrlKey && e.key === 'r');
      // Normal input olaylarını engelle
      const isInputActive = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

      if (!isInputActive && isRefreshKey && this.isHelpDeskPage()) {
        e.preventDefault();
        window.location.replace('https://aoltorontoagents.ca/student_contract/chat/mine_list.php');
      }
    };

    window.addEventListener('keydown', this.handleRefreshKey);

    // Browser'ın refresh butonu için handler
    window.addEventListener('beforeunload', (e) => {
      // Gerçek browser refresh'i mi kontrol et
      if (this.isHelpDeskPage() && performance.navigation.type === 1) {
        // URL'de ? işareti varsa yönlendirme yapma
        if (!window.location.href.includes('?')) {
          window.location.replace('https://aoltorontoagents.ca/student_contract/chat/mine_list.php');
        }
      }
    });
  }

  // HelpDesk sayfasında olup olmadığımızı kontrol eden yardımcı metod
  static isHelpDeskPage() {
    const path = window.location.pathname;
    return (
      path.includes('/student_contract/helpdesk/new-request') ||
      path.includes('/student_contract/helpdesk/search') ||
      path.includes('/student_contract/request') ||
      path.includes('/student_contract/helpdesk/dashboard') ||
      path.includes('/student_contract/category')
    );
  }

  static async loadSearchPage() {
    try {
      this.showLoading();

      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "helpDeskContent",
          url: HELPDESK_CONFIG.URLS.SEARCH_REQUEST,
          method: "GET"
        }, resolve);
      });

      if (result.success) {
        const parsedContent = this.parseHelpDeskContent(result.content);
        this.extractHelpDeskData(parsedContent, 'search');
        const searchHTML = this.generateSearchPageHTML();
        await this.displayHelpDeskContent(searchHTML);
        this.addEventListeners();
        this.addVNumberSearchListener();

        if (!this.isNavigatingThroughHistory) {
          const state = {
            page: 'help-desk-search',
            timestamp: Date.now()
          };
          this.historyStack.set(state.page, searchHTML);
          window.history.pushState(state, '', '/student_contract/helpdesk/search');
          this.currentState = state;
        }
      } else {
        ErrorHandler.showAlert("Failed to load search page options.");
      }
    } catch (error) {
      ErrorHandler.showAlert("There was an error loading the search page.");
    } finally {
      this.hideLoading();
    }
  }

  static async _performHelpDeskSearch(searchParams) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: "helpDeskContent",
        url: HELPDESK_CONFIG.URLS.SEARCH_REQUEST,
        method: "POST",
        data: searchParams
      }, resolve);
    });
  }

  static async handleSearchFormSubmit(e) {
    e.preventDefault();

    try {
      this.showLoading();

      let searchParams;
      if (e.vNumberSearch) {
        searchParams = {
          type: 'search', // Ensure type is included for consistency if backend expects it
          referenceNumber: '',
          priority: '0',
          requestStatus: '0',
          date: '',
          time: '',
          actionRequestTo: '0',
          category: '0',
          keyword: e.vNumberData.keyword,
          matchAny: e.vNumberData.matchAny
        };
      } else {
        searchParams = {
          type: 'search',
          referenceNumber: document.getElementById('referenceNumber')?.value || '',
          priority: document.getElementById('priority')?.value || '0',
          requestStatus: document.getElementById('requestStatus')?.value || '0',
          date: document.getElementById('txtDate')?.value || '',
          time: document.getElementById('appt')?.value || '', // Assuming 'appt' is the correct ID for time input
          actionRequestTo: document.getElementById('actionRequestTo')?.value || '0',
          category: document.getElementById('category')?.value || '0',
          keyword: document.getElementById('keyword')?.value || '',
          matchAny: true // Default for main search, or make it configurable
        };
      }

      const result = await this._performHelpDeskSearch(searchParams);

      if (result.success) {
        this.lastSearchResponse = result.content; // Store raw content

        if (e.vNumberSearch) {
          return result; // Return raw result for addVNumberSearchListener to process
        } else {
          // Process and display for main search page
          const parsedContent = this.parseHelpDeskList(result.content);
          const tableHtml = this.generateTableHtml(parsedContent, 'Search Results');
          await this.displayHelpDeskContent(tableHtml);
          this.addEventListeners();

          if (!this.isNavigatingThroughHistory) {
            const queryString = new URLSearchParams(searchParams).toString();
            const state = {
              page: 'help-desk-search-results',
              params: { searchData: searchParams, query: queryString },
              timestamp: Date.now()
            };
            this.historyStack.set(state.page + JSON.stringify(state.params), tableHtml);
            window.history.pushState(state, '', `/student_contract/helpdesk/search?${queryString}`);
            this.currentState = state;
          }
        }
      } else {
        ErrorHandler.showAlert("Search request failed. Please try again.");
      }
    } catch (error) {
      ErrorHandler.showAlert("An unexpected error occurred during search.");
    } finally {
      this.hideLoading();
    }
  }

  static async handleButtonClick(action, event) {
    let url;
    let title;
    let listType;

    switch (action) {
      case 'dashboard':
        if (!this.isNavigatingThroughHistory) {
          const dashboardState = {
            page: 'help-desk-dashboard',
            params: {
              timestamp: Date.now()
            }
          };

          await this.loadHelpDeskPage();

          // Dashboard HTML'ini cache'e kaydet
          const currentHtml = document.querySelector('.signin-page')?.innerHTML;
          if (currentHtml) {
            this.historyStack.set(dashboardState.page + JSON.stringify(dashboardState.params), currentHtml);
          }

          // URL'i güncelle
          window.history.pushState(dashboardState, '', '/student_contract/dashboard');
          this.currentState = dashboardState;
        } else {
          await this.loadHelpDeskPage();
        }
        return;
      case 'search':
        await this.loadSearchPage();
        return;
      case 'newRequest':
        await this.loadNewRequestForm();
        return;
      case 'listOpen':
        url = HELPDESK_CONFIG.URLS.REQUEST_LIST;
        title = 'List Open';
        listType = 'open';
        break;
      case 'emergency':
        url = `${HELPDESK_CONFIG.URLS.REQUEST_LIST}?method=Priority&PriorityID=2`;
        title = 'Emergency';
        listType = 'emergency';
        break;

      case 'high':
        url = `${HELPDESK_CONFIG.URLS.REQUEST_LIST}?method=Priority&PriorityID=3`;
        title = 'High';
        listType = 'high';
        break;

      case 'normal':
        url = `${HELPDESK_CONFIG.URLS.REQUEST_LIST}?method=Priority&PriorityID=1`;
        title = 'Normal';
        listType = 'normal';
        break;

      case 'listClosed':
        url = `${HELPDESK_CONFIG.URLS.REQUEST_LIST}?method=CloseStatus`;
        title = 'List Closed';
        listType = 'closed';
        break;
      case 'category':
        if (event && event.target) {
          const targetElement = event.target.closest('[data-category-id]');
          if (targetElement) {
            const categoryId = targetElement.getAttribute('data-category-id');
            title = targetElement.closest('.category-row').querySelector('.category-name').textContent;
            url = `${HELPDESK_CONFIG.URLS.REQUEST_LIST}?method=Category&CategoryID=${categoryId}`;

            if (this.lastVisitedUrl === url) {
              return;
            }

            this.lastVisitedUrl = url;
            await this.loadHelpDeskList(url, null, title);

            // Add state for category navigation
            if (!this.isNavigatingThroughHistory) {
              const state = {
                page: 'help-desk-category',
                params: {
                  categoryId,
                  title,
                  url
                },
                timestamp: Date.now()
              };

              const currentHtml = document.querySelector('.signin-page').innerHTML;
              this.historyStack.set(state.page + JSON.stringify(state.params), currentHtml);

              window.history.pushState(state, '', `/student_contract/category/${categoryId}`);
              this.currentState = state;
            }
            return;
          }
        }
        return;
      case 'myRequests':
        try {
          this.showLoading();
          // Get showOnlyOpen preference from localStorage 
          const showOnlyOpen = localStorage.getItem('showOnlyOpenTickets') === 'true';
          const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: "helpDeskContent",
              // Use different URL based on showOnlyOpen
              url: showOnlyOpen ?
                HELPDESK_CONFIG.URLS.MY_OPEN_REQUESTS :
                HELPDESK_CONFIG.URLS.SEARCH_REQUEST,
              method: "POST",
              data: {
                type: 'myRequests',
                showOpenOnly: showOnlyOpen
              }
            }, resolve);
          });

          if (result.success) {
            const parsedContent = this.parseHelpDeskList(result.content);
            const tableHtml = this.generateTableHtml(parsedContent, 'My Requests');
            await this.displayHelpDeskContent(tableHtml);
            this.addEventListeners();

            if (!this.isNavigatingThroughHistory) {
              const state = {
                page: 'help-desk-my-requests',
                params: {
                  type: 'myRequests',
                  title: 'My Requests',
                  showOpenOnly: showOnlyOpen,
                  url: showOnlyOpen ?
                    HELPDESK_CONFIG.URLS.MY_OPEN_REQUESTS :
                    HELPDESK_CONFIG.URLS.SEARCH_REQUEST
                },
                timestamp: Date.now()
              };
              this.historyStack.set(state.page + JSON.stringify(state.params), tableHtml);
              window.history.pushState(state, '', '/student_contract/requests/my');
              this.currentState = state;
            }
          }
        } catch (error) {
          console.error('myRequests error:', error);
          const errorHtml = this.generateTableHtml(
            { rows: [], pagination: null },
            'My Requests',
            'An unexpected error occurred.'
          );
          await this.displayHelpDeskContent(errorHtml);
        } finally {
          this.hideLoading();
        }
        return;
      default:
        console.error('Invalid action');
        return;
    }

    if (url) {
      this.lastPageTitle = title;
      this.lastVisitedUrl = url;
      await this.loadHelpDeskList(url, null, title);

      // State'i güncelle ve HTML'i kaydet
      if (!this.isNavigatingThroughHistory) {
        const state = {
          page: `help-desk-list`,
          params: {
            type: listType,
            title: title,
            url: url,
            listAction: action // Liste türünü belirlemek için action'ı saklayalım
          },
          timestamp: Date.now()
        };

        const currentHtml = document.querySelector('.signin-page').innerHTML;
        const cacheKey = `${state.page}-${listType}-page-1`; // İlk sayfa için cache key
        this.historyStack.set(cacheKey, currentHtml);

        window.history.pushState(state, '', `/student_contract/requests/${listType}`);
        this.currentState = state;
      }
    }
  }

  static async loadHelpDeskList(url, eventTarget = null, title) {
    try {
      this.showLoading();
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "helpDeskContent",
          url: url,
          method: url.includes('SearchRequest.aspx') ? "POST" : (eventTarget ? "POST" : "GET"),
          data: {
            __EVENTTARGET: eventTarget || '',
            __EVENTARGUMENT: ''
          }
        }, resolve);
      });

      if (result.success) {
        const parsedContent = this.parseHelpDeskList(result.content);
        const tableHtml = this.generateTableHtml(parsedContent, title);
        await this.displayHelpDeskContent(tableHtml);
      } else {
        const errorHtml = this.generateTableHtml(
          { rows: [], pagination: null },
          title,
          'Failed to load list.'
        );
        await this.displayHelpDeskContent(errorHtml);
      }
    } catch (error) {
      console.error('loadHelpDeskList error:', error);
      const errorHtml = this.generateTableHtml(
        { rows: [], pagination: null },
        title,
        'An unexpected error occurred.'
      );
      await this.displayHelpDeskContent(errorHtml);
    } finally {
      this.hideLoading();
    }
  }

  static async handleDetailLink(requestId) {
    try {
      this.showLoading();
      const detailUrl = `${HELPDESK_CONFIG.URLS.REQUEST_DETAIL}?RefNumber=${requestId}`;

      // Mevcut sayfanın HTML'ini ve state'ini sakla
      const previousHtml = document.querySelector('.signin-page')?.innerHTML;
      const previousUrl = window.location.pathname + window.location.search;
      const previousState = this.currentState;

      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "helpDeskContent",
          url: detailUrl,
          method: "GET"
        }, resolve);
      });

      if (result.success) {
        const parsedData = this.parseRequestDetail(result.content);
        const detailHtml = this.generateRequestDetailHTML(parsedData);
        await this.displayHelpDeskContent(detailHtml);

        if (!this.isNavigatingThroughHistory) {
          // Önceki sayfayı cache'e kaydet
          if (previousHtml && previousState) {
            const previousCacheKey = previousState.page + JSON.stringify(previousState.params);
            this.historyStack.set(previousCacheKey, previousHtml);
          }

          const state = {
            page: 'help-desk-detail',
            params: {
              requestId,
              previousState: previousState, // Önceki state'i sakla
              previousUrl: previousUrl,     // Önceki URL'i sakla
              url: detailUrl,
              title: `Request Detail #${requestId}`
            },
            timestamp: Date.now()
          };

          // Detay sayfasını cache'e kaydet
          const cacheKey = state.page + JSON.stringify(state.params);
          this.historyStack.set(cacheKey, detailHtml);

          window.history.pushState(state, '', `/student_contract/request/${requestId}`);
          this.currentState = state;
        }
      } else {
        ErrorHandler.showAlert("Failed to load request details.");
      }
    } catch (error) {
      ErrorHandler.showAlert("An error occurred while loading request details.");
    } finally {
      this.hideLoading();
    }
  }

  static async handlePaginationClick(eventTarget) {
    try {
      this.showLoading();
      const url = this.lastVisitedUrl || HELPDESK_CONFIG.URLS.REQUEST_LIST;

      const pageNumber = document.querySelector(`[data-event-target="${eventTarget}"]`)
        ?.textContent.trim();

      const currentState = this.currentState;
      const listType = currentState?.params?.type || 'default';

      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "helpDeskContent",
          url: url,
          method: "POST",
          data: {
            __EVENTTARGET: eventTarget,
            __EVENTARGUMENT: ''
          }
        }, resolve);
      });

      if (result.success) {
        const parsedContent = this.parseHelpDeskList(result.content);
        const tableHtml = this.generateTableHtml(parsedContent, this.lastPageTitle);
        await this.displayHelpDeskContent(tableHtml);

        if (!this.isNavigatingThroughHistory) {
          const newState = {
            page: 'help-desk-list',
            params: {
              type: listType,
              pageNumber,
              url: url,
              title: this.lastPageTitle,
              listAction: currentState?.params?.listAction,
              baseState: currentState
            },
            timestamp: Date.now()
          };

          // Cache'e unique key ile kaydet
          const cacheKey = `${newState.page}-${listType}-page-${pageNumber}`;
          this.historyStack.set(cacheKey, tableHtml);

          // URL'i güncelle
          const basePath = `/student_contract/requests/${listType}`;
          const newUrl = `${basePath}?page=${pageNumber}`;
          window.history.pushState(newState, '', newUrl);
          this.currentState = newState;

          console.log('List pagination state saved:', {
            cacheKey,
            state: newState,
            url: newUrl
          });
        }
      } else {
        ErrorHandler.showAlert("Failed to load the page.");
      }
    } catch (error) {
      ErrorHandler.showAlert("An error occurred while loading the page.");
    } finally {
      this.hideLoading();
    }
  }

  static displayHelpDeskContent(newHTML) {
    const container = document.querySelector('.signin-page');
    if (container) {
      container.innerHTML = newHTML;
      this.addEventListeners();
    } else {
      console.error('signin-page class not found');
    }
  }

  static showTooltip(event) {
    const tooltip = event.target.getAttribute('data-tooltip');
    if (tooltip) {
      // Varolan tooltip'i temizle
      HelpDeskManager.hideTooltip();

      // Yeni tooltip oluştur
      const tooltipElement = document.createElement('div');
      tooltipElement.className = 'custom-tooltip';
      tooltipElement.textContent = tooltip;
      document.body.appendChild(tooltipElement);
    }
  }

  static hideTooltip() {
    const tooltips = document.querySelectorAll('.custom-tooltip');
    tooltips.forEach(tooltip => tooltip.remove());
  }

  static addEventListeners() {
    const container = document.querySelector('.helpdesk-container');
    if (!container) return;

    // Mevcut event listener'lar
    container.removeEventListener('click', this.handleContainerClick);
    this.handleContainerClick = this.handleContainerClick.bind(this);
    container.addEventListener('click', this.handleContainerClick);

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.helpdesk-container')) {
        this.hideTooltip();
      }
    });

    // Sadece tooltipped-text class'ına sahip elementler için tooltip event listener'larını ekle
    const tooltippedElements = container.querySelectorAll('.tooltipped-text, [data-tooltip]');
    tooltippedElements.forEach(element => {
      element.addEventListener('mouseenter', this.showTooltip);
      element.addEventListener('mouseleave', this.hideTooltip);
      element.addEventListener('mousemove', (event) => {
        const tooltipElement = document.querySelector('.custom-tooltip');
        if (tooltipElement) {
          const x = event.clientX + 15;
          const y = event.clientY + 5;

          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const tooltipWidth = 200;
          const tooltipRect = tooltipElement.getBoundingClientRect();
          const tooltipHeight = tooltipRect.height;

          let finalX = x;
          if (x + tooltipWidth > viewportWidth) {
            finalX = x - tooltipWidth - 30;
          }

          let finalY = y;
          if (y + tooltipHeight > viewportHeight) {
            finalY = viewportHeight - tooltipHeight - 10;
          }

          tooltipElement.style.left = finalX + 'px';
          tooltipElement.style.top = finalY + 'px';
        }
      });
    });

    // Search form event listener'ı
    const searchForm = container.querySelector('#searchForm');
    if (searchForm) {
      searchForm.removeEventListener('submit', this.handleSearchFormSubmit);
      this.handleSearchFormSubmit = this.handleSearchFormSubmit.bind(this);
      searchForm.addEventListener('submit', this.handleSearchFormSubmit);
    }

    // addEventListeners içinde
    document.querySelectorAll('.attachment-link').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();

        const attachmentId = e.currentTarget.getAttribute('data-attachment-id');
        const type = e.currentTarget.getAttribute('data-type');
        const fullFileName = e.currentTarget.getAttribute('data-tooltip');
        const lastParenIndex = fullFileName.lastIndexOf('(');
        const fileName = lastParenIndex === -1 ? fullFileName : fullFileName.substring(0, lastParenIndex).trim();

        if (type === 'other') {
          window.open(`${HELPDESK_CONFIG.URLS.BASE}/AttachmentViewer.aspx?AttachmentId=${attachmentId}`, '_blank');
          return;
        }

        try {
          const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: "viewAttachment",
              attachmentId: attachmentId,
              type: type
            }, resolve);
          });

          if (result.success) {
            const uint8Array = new Uint8Array(result.data);
            const modalOverlay = document.querySelector('.modal-overlay');
            const modalContent = modalOverlay.querySelector('.modal-content');

            // Önceki içeriği temizle
            const oldContent = modalContent.querySelector('img, iframe');
            if (oldContent) oldContent.remove();

            if (type === 'pdf') {
              const blob = new Blob([uint8Array], { type: 'application/pdf' });
              const blobUrl = URL.createObjectURL(blob);

              // PDF için iframe ekle
              const iframe = document.createElement('iframe');
              iframe.style.width = '100%';
              iframe.style.height = '80vh';
              iframe.style.border = 'none';
              iframe.src = blobUrl;

              // İndirme linki ekle
              const downloadLink = document.createElement('a');
              downloadLink.href = blobUrl;
              downloadLink.download = fileName;
              downloadLink.className = 'download-link';
              downloadLink.innerHTML = `<i class="fas fa-download"></i> Download ${fileName}`;

              const closeButton = document.querySelector('.modal-close');

              if (closeButton && !modalContent.dataset.downloadLinkCreated) {
                closeButton.parentNode.insertBefore(downloadLink, closeButton);
                closeButton.parentNode.insertBefore(iframe, closeButton);
              } else {
                console.error(".modal-close sınıfına sahip bir öğe bulunamadı!");
              }
            } else {
              const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
              const blobUrl = URL.createObjectURL(blob);

              // Resim için img ekle
              const img = document.createElement('img');
              img.src = blobUrl;
              img.alt = fileName;

              // İndirme linki ekle
              const downloadLink = document.createElement('a');
              downloadLink.href = blobUrl;
              downloadLink.download = fileName;
              downloadLink.className = 'download-link';
              downloadLink.innerHTML = `<i class="fas fa-download"></i> Download ${fileName}`;

              const closeButton = document.querySelector('.modal-close');

              if (closeButton && !modalContent.dataset.downloadLinkCreated) {
                closeButton.parentNode.insertBefore(downloadLink, closeButton);
                closeButton.parentNode.insertBefore(img, closeButton);
              } else {
                console.error("No element with class .modal-close found!");
              }
            }

            // Modal'ı göster
            modalOverlay.classList.add('active');

            // Modal'ı kapatma event listener'ları...
            const closeModal = () => {
              modalOverlay.classList.remove('active');
              const content = modalContent.querySelector('img, iframe');
              const link = modalContent.querySelector('.download-link');
              if (content) {
                URL.revokeObjectURL(content.src);
                content.remove();
              }
              if (link) link.remove();
            };

            modalOverlay.querySelector('.modal-close').onclick = closeModal;
            modalOverlay.onclick = (e) => {
              if (e.target === modalOverlay) closeModal();
            };

            // ESC tuşu ile kapatma
            document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') closeModal();
            }, { once: true });
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          console.error('Error viewing attachment:', error);
          window.open(`${HELPDESK_CONFIG.URLS.BASE}/AttachmentViewer.aspx?AttachmentId=${attachmentId}`, '_blank');
        }
      });
    });

    document.querySelectorAll('.excel-download-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        if (this.classList.contains('loading')) return;

        const btnText = this.querySelector('.btn-text');
        const originalText = btnText.textContent;

        this.classList.add('loading');
        btnText.textContent = 'Downloading...';

        try {
          const messageText = decodeURIComponent(this.dataset.message);
          const data = await HelpDeskManager.processRawData(messageText);
          HelpDeskManager.downloadExcel(data);
        } finally {
          this.classList.remove('loading');
          btnText.textContent = originalText;
        }
      });
    });
  }

  static async handleContainerClick(e) {
    if (e.handled) return;
    e.handled = true;

    const categoryLink = e.target.closest('[data-category-id]');
    if (categoryLink) {
      e.preventDefault();
      e.stopPropagation();
      const categoryId = categoryLink.getAttribute('data-category-id');
      if (categoryId) {
        const action = categoryLink.getAttribute('data-action') || 'category';
        await this.handleButtonClick(action, e);
      }
      return;
    }

    const actionElement = e.target.closest('[data-action]');
    if (actionElement) {
      e.preventDefault();
      e.stopPropagation();
      const action = actionElement.getAttribute('data-action');
      await this.handleButtonClick(action, e);
      return;
    }

    const detailLink = e.target.closest('.request-link, .subject-link');
    if (detailLink) {
      e.preventDefault();
      e.stopPropagation();
      const requestId = detailLink.getAttribute('data-request-id');
      if (requestId) {
        await this.handleDetailLink(requestId);
      }
      this.hideTooltip();
      return;
    }

    const paginationLink = e.target.closest('.pagination-link');
    if (paginationLink) {
      e.preventDefault();
      e.stopPropagation();
      const eventTarget = paginationLink.getAttribute('data-event-target');
      if (eventTarget) {
        await this.handlePaginationClick(eventTarget);
      }
    }
  }

  static initializeHistoryManagement() {
    // PopState listener'ı ekle
    window.removeEventListener('popstate', this.handlePopState);
    window.addEventListener('popstate', (event) => {
      this.handlePopState(event);
    });
  }
}

window.HelpDeskManager = HelpDeskManager;