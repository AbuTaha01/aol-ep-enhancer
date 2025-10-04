// Simple, clean background.js with only headless KPI export functionality

// ... existing code until LaunchManager class ...

class LaunchManager {
  // ... existing methods ...

  // KPI Report functionality - Simple headless REST API approach
  static async getKPIReport(data = {}) {
    try {
      console.log("🚀 LaunchManager: Starting headless KPI Report with data:", data);
      
      // First ensure we're logged in
      const loginResult = await this.loginToPortal();
      if (!loginResult.success) {
        await utils.showHDNotification('Launch Login Failed', loginResult.error);
        return { success: false, error: loginResult.error };
      }
      
      // Extract parameters from data
      const { startDate, endDate, schoolName, schoolId } = data;
      
      // Get PowerBI embed info from Launch portal
      const embedParams = new URLSearchParams();
      embedParams.append('powerBIWorkspaceId', 'a7d5e986-4449-42d6-9811-7219561a34f4');
      embedParams.append('powerBIReportId', '066fbbb4-e0ee-440e-9e59-af4186d9d237');
      embedParams.append('userId', '518226');
      embedParams.append('reportParams', `$rp:SchoolID=${schoolId || (schoolName === 'Bay/Queen' ? '5589' : '5703')}$rp:RecursiveSchool=False$rp:ProgramTypeID=-1$rp:StartDate=${startDate}$rp:EndDate=${endDate}$rp:IncludeScheduledGrads=False`);
      
      const embedResponse = await fetch(`${config.LAUNCH.BASE_URL}/embedinfo/getembedinfo?${embedParams.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!embedResponse.ok) {
        throw new Error(`Failed to get embed info: ${embedResponse.status}`);
      }
      
      const reportData = await embedResponse.json();
      
      // Check if we have PowerBI embed data
      if (reportData && reportData.EmbedReport && reportData.EmbedReport.length > 0) {
        const embedReport = reportData.EmbedReport[0];
        const embedToken = reportData.EmbedToken;
        
        // Extract workspace and report IDs from embed URL
        const embedUrl = embedReport.EmbedUrl;
        const workspaceMatch = embedUrl.match(/groups\/([^\/]+)/);
        const reportIdMatch = embedUrl.match(/reports\/([^\/]+)/);
        
        if (!workspaceMatch || !reportIdMatch) {
          throw new Error('Could not extract workspace or report ID from embed URL');
        }
        
        const workspaceId = workspaceMatch[1];
        const reportId = reportIdMatch[1];
        
        // Call the headless export method
        const headlessResult = await this.exportKPIReportHeadless(
          embedToken.Token,
          workspaceId,
          reportId,
          startDate,
          endDate,
          schoolName
        );
        
        if (headlessResult.success) {
          return headlessResult;
        } else {
          throw new Error(headlessResult.error || 'Headless export failed');
        }
      }
      
      throw new Error('No PowerBI embed data available. Please check your Launch portal configuration.');
      
    } catch (error) {
      console.error("📊 LaunchManager: Error fetching KPI report:", error);
      await utils.showHDNotification('KPI Report Error', `Failed to generate KPI report: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Headless CSV export using Export-to-File REST API (no embedding)
  static async exportKPIReportHeadless(embedToken, workspaceId, reportId, startDate, endDate, schoolName) {
    try {
      console.log("📊 LaunchManager: Starting headless CSV export using Export-to-File REST API");
      
      // Call the backend API for headless CSV export
      const backendUrl = 'http://localhost:3001/api/export-csv';
      const exportRequest = {
        embedToken: embedToken,
        workspaceId: workspaceId,
        reportId: reportId,
        startDate: startDate,
        endDate: endDate,
        schoolName: schoolName,
        parameters: [
          { name: 'SchoolID', value: schoolName === 'Bay/Queen' ? '5589' : '5703' },
          { name: 'RecursiveSchool', value: 'False' },
          { name: 'ProgramTypeID', value: '-1' },
          { name: 'StartDate', value: startDate },
          { name: 'EndDate', value: endDate },
          { name: 'IncludeScheduledGrads', value: 'False' },
          { name: 'UserId', value: '518226' }
        ]
      };
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend API failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Convert base64 to blob and download
        const csvData = atob(result.base64);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        // Use Chrome downloads API to download the file
        await chrome.downloads.download({
          url: url,
          filename: result.filename,
          saveAs: false
        });
        
        // Clean up the URL
        URL.revokeObjectURL(url);
        
        await utils.showHDNotification(
          'KPI Report CSV Downloaded',
          `CSV file has been exported using Export-to-File REST API and downloaded to your Downloads folder.`
        );
        
        return { success: true, data: { csvExported: true, filename: result.filename, method: 'HEADLESS_REST_API' } };
      } else {
        throw new Error(result.error || 'Backend API returned error');
      }
      
    } catch (error) {
      console.error("📊 LaunchManager: Headless export error:", error);
      
      await utils.showHDNotification(
        'KPI Report Export Error',
        `Headless CSV export failed: ${error.message}. Please check if the backend server is running.`
      );
      
      return { success: false, error: error.message };
    }
  }
}

// ... rest of existing code ...
