# 🚀 Headless PowerBI CSV Export Setup

## ✅ **What's Been Implemented**

I've created a complete headless solution that eliminates the need for PowerBI embedding and new tabs. Here's what's been set up:

### 1. **Backend Server** (`src/backend/`)
- **Express.js server** that handles PowerBI Export-to-File REST API calls
- **Automatic CSV export** using the official PowerBI REST API
- **Comprehensive logging** for debugging
- **Base64 file return** for Chrome extension integration

### 2. **Chrome Extension Updates** (`src/js/main/background.js`)
- **New method**: `LaunchManager.exportKPIReportHeadless()`
- **Message handler**: `exportKPIReportHeadless` action
- **Automatic download** using Chrome downloads API
- **No more embedding** or new tabs

### 3. **Report Configuration**
- **Workspace ID**: `a7d5e986-4449-42d6-9811-7219561a34f4`
- **Report ID**: `066fbbb4-e0ee-440e-9e59-af4186d9d237`
- **Report Type**: RDL (Paginated Report) ✅
- **Parameters**: All configured based on your Launch portal data

## 🚀 **How to Use**

### Step 1: Start the Backend Server
```bash
cd src/backend
npm install
npm start
```

The server will run on `http://localhost:3001`

### Step 2: Test the Setup
```bash
# Test if server is running
curl http://localhost:3001/api/health

# Test the export (replace with real embed token)
node test-export.js
```

### Step 3: Use in Extension
The extension will now automatically:
1. Get embed token from Launch portal
2. Extract workspace and report IDs
3. Call the backend API
4. Download CSV file directly to Downloads folder
5. Show success notification

## 📊 **How It Works**

### **Old Flow (with embedding):**
```
Extension → Launch Portal → PowerBI Embed → New Tab → CSV Export
```

### **New Flow (headless):**
```
Extension → Backend API → PowerBI REST API → CSV Download
```

## 🔧 **Technical Details**

### **PowerBI Export-to-File REST API Flow:**
1. **POST** to `https://api.powerbi.com/v1.0/myorg/groups/{groupId}/reports/{reportId}/ExportTo`
2. **Poll status** until `Succeeded`
3. **Download file** from the export URL
4. **Return base64** to extension

### **Parameters Used:**
- `SchoolID`: 5589 (Bay/Queen) or 5703 (Bhatti Group)
- `RecursiveSchool`: False
- `ProgramTypeID`: -1
- `StartDate`: Your date range
- `EndDate`: Your date range
- `IncludeScheduledGrads`: False
- `UserId`: 518226

## 🎯 **Benefits**

✅ **No more embedding** - Direct API calls only  
✅ **No new tabs** - Everything happens in background  
✅ **Faster processing** - No UI rendering overhead  
✅ **Better reliability** - Official PowerBI REST API  
✅ **Comprehensive logging** - Full debugging visibility  
✅ **Automatic download** - CSV goes directly to Downloads folder  

## 🔍 **Logging**

The system provides extensive logging:
- Backend server logs all API calls
- Extension logs all steps
- PowerBI API responses logged
- Error handling with detailed messages

## 🚨 **Important Notes**

1. **Backend must be running** - The extension calls `http://localhost:3001/api/export-csv`
2. **Embed tokens** - Uses existing tokens from Launch portal
3. **Paginated reports only** - CSV export works for RDL reports (which yours is)
4. **No authentication setup** - Uses existing Launch portal authentication

## 🧪 **Testing**

Use the test script to verify everything works:
```bash
cd src/backend
node test-export.js
```

Make sure to replace `YOUR_EMBED_TOKEN_HERE` with a real token from your Launch portal.

## 📁 **Files Created/Modified**

### **New Files:**
- `src/backend/export-csv-server.js` - Main backend server
- `src/backend/package.json` - Dependencies
- `src/backend/README.md` - Backend documentation
- `src/backend/test-export.js` - Test script
- `src/backend/start-server.bat` - Windows startup script

### **Modified Files:**
- `src/js/main/background.js` - Added headless export method and message handler

The solution is now ready to use! Just start the backend server and the extension will automatically use the headless approach for CSV exports.
