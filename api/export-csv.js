const axios = require('axios');

// Azure AD delegated token function for PowerBI API access
async function getAzureADDelegatedToken(authorizationCode) {
  try {
    const params = new URLSearchParams();
    params.append('client_id', process.env.AZURE_CLIENT_ID);
    params.append('code', authorizationCode);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', process.env.AZURE_REDIRECT_URI);
    params.append('scope', 'https://analysis.windows.net/powerbi/api/Report.Read https://analysis.windows.net/powerbi/api/Dataset.Read https://analysis.windows.net/powerbi/api/Workspace.Read');

    const response = await axios.post(
      `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('Azure AD delegated token error:', error.response?.data || error.message);
    throw error;
  }
}

// Azure AD token function for PowerBI API access (fallback)
async function getAzureADToken() {
  try {
    const params = new URLSearchParams();
    params.append('client_id', process.env.AZURE_CLIENT_ID);
    params.append('client_secret', process.env.AZURE_CLIENT_SECRET);
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'https://analysis.windows.net/powerbi/api/.default');

    const response = await axios.post(
      `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('Azure AD token error:', error.response?.data || error.message);
    throw error;
  }
}

function setCors(res, origin) {
  const ALLOWED_ORIGINS = [
    'chrome-extension://cjollmpjlbggmodndfamooliloonmnbh',
    'http://localhost:3000',
  ];
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

module.exports = async (req, res) => {
  console.log('🚀 AXIOS VERSION - Function started - DEPLOYMENT ' + Date.now());
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  
  // Handle authorization code exchange
  if (req.method === 'POST' && req.body?.action === 'exchange_code') {
    try {
      const { code } = req.body;
      const token = await getAzureADDelegatedToken(code);
      return res.status(200).json({ access_token: token });
    } catch (error) {
      console.error('Code exchange error:', error);
      return res.status(500).json({ error: 'Failed to exchange authorization code' });
    }
  }
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const step = { name: 'init' };
  try {
      const { groupId, reportId, params, azureToken } = req.body || {};
      console.log('📊 Vercel: Received export request:', { groupId, reportId, paramsCount: params?.length || 0, hasAzureToken: !!azureToken });
      
      if (!groupId || !reportId) return res.status(400).json({ error: 'Missing groupId/reportId' });

      // Use provided Azure token or fallback to service principal
      let token = azureToken;
      if (!token) {
        console.log('📊 Vercel: No Azure token provided, trying service principal...');
        token = await getAzureADToken();
        if (!token) return res.status(500).json({ error: 'Failed to get Azure AD token' });
      } else {
        console.log('📊 Vercel: Using provided Azure token');
      }

    step.name = 'startExport';
    const start = await axios.post(
      `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/ExportTo`,
      { format: 'CSV', paginatedReportConfiguration: { parameterValues: params || [] } },
      { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    const exportId = start.data.id;

    step.name = 'poll';
    const deadline = Date.now() + 240000;
    for (;;) {
      await new Promise(r => setTimeout(r, 2000));
      const poll = await axios.get(
        `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/exports/${exportId}`,
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        }
      );
      if (poll.data.status === 'Succeeded') break;
      if (poll.data.status === 'Failed') throw new Error(`Export failed: ${JSON.stringify(poll.data)}`);
      if (Date.now() > deadline) throw new Error('Timeout waiting for export');
    }

    step.name = 'download';
    const file = await axios.get(
      `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/exports/${exportId}/file`,
      { 
        headers: { 
          Authorization: `Bearer ${token}` 
        }, 
        responseType: "arraybuffer" 
      }
    );

    const base64 = Buffer.from(file.data).toString("base64");
    return res.status(200).json({ filename: `report_${Date.now()}.csv`, base64 });
  } catch (e) {
    // keep CORS headers on error responses
    setCors(res, req.headers.origin);
    const status = 500;
    console.error('Export error step=', step.name, e);
    return res.status(status).json({ error: 'PBI_EXPORT_FAILED', step: step.name, detail: String(e) });
  }
};
