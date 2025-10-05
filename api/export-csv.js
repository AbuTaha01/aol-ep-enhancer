// Vercel serverless function for PowerBI Export-to-File REST API
// This handles the PowerBI CSV export requests from the Chrome extension

const axios = require('axios');

export default async function handler(req, res) {
  // Set CORS headers for Chrome extension
  const origin = req.headers.origin;
  if (origin && origin.startsWith('chrome-extension://')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { workspaceId, reportId, parameters, embedToken, startDate, endDate } = req.body;
    
    console.log('📊 Vercel: Received export request:', { workspaceId, reportId, startDate, endDate });

    if (!workspaceId || !reportId || !parameters) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: workspaceId, reportId, parameters' 
      });
    }

    // Use the embed token for PowerBI API calls
    const token = embedToken;
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'No embed token provided' 
      });
    }

    // 1) Start export job (CSV for RDL)
    console.log(`📊 Vercel: Starting export job for report ${reportId} in group ${workspaceId}...`);
    const start = await axios.post(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/ExportTo`,
      {
        format: "CSV",
        paginatedReportConfiguration: { parameterValues: parameters }
      },
      { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    const exportId = start.data.id;
    console.log(`📊 Vercel: Export job started, ID: ${exportId}`);

    // 2) Poll until Succeeded
    console.log(`📊 Vercel: Polling status for export job ${exportId}...`);
    for (let i = 0; i < 30; i++) { // Max 30 attempts (60 seconds)
      await new Promise(r => setTimeout(r, 2000)); // Poll every 2 seconds
      
      const poll = await axios.get(
        `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/exports/${exportId}`,
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        }
      );
      
      console.log(`📊 Vercel: Export status for ${exportId}: ${poll.data.status}`);
      
      if (poll.data.status === "Succeeded") break;
      if (poll.data.status === "Failed") {
        console.error("📊 Vercel: Export failed:", poll.data.error);
        throw new Error(`Export failed: ${poll.data.error?.message || 'Unknown error'}`);
      }
      if (i === 29) { // Last attempt
        throw new Error("Export polling timed out.");
      }
    }

    // 3) Download the file bytes
    console.log(`📊 Vercel: Export succeeded, downloading file for job ${exportId}...`);
    const file = await axios.get(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/exports/${exportId}/file`,
      { 
        headers: { 
          Authorization: `Bearer ${token}` 
        }, 
        responseType: "arraybuffer" 
      }
    );
    
    console.log(`📊 Vercel: File downloaded, size: ${file.data.length} bytes`);

    // Convert to base64 and return
    const base64 = Buffer.from(file.data).toString("base64");
    const filename = `KPI_Report_CSV_${startDate.replace(/\s+/g, '_')}_to_${endDate.replace(/\s+/g, '_')}.csv`;
    
    console.log(`📊 Vercel: Export completed successfully, filename: ${filename}`);
    
    res.status(200).json({ 
      success: true, 
      filename, 
      base64 
    });

  } catch (error) {
    console.error("📊 Vercel: Error in export-csv:", error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
