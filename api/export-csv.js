const { setCors } = require('./_cors');

// Helper functions using built-in fetch
async function pbiPost(url, body, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'authorization': `Bearer ${token}`, 
      'content-type': 'application/json' 
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`PBI POST ${response.status}: ${await response.text()}`);
  return response.json();
}

async function pbiGet(url, token, as = 'json') {
  const response = await fetch(url, { 
    headers: { 'authorization': `Bearer ${token}` } 
  });
  if (!response.ok) throw new Error(`PBI GET ${response.status}: ${await response.text()}`);
  if (as === 'buffer') {
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  return response.json();
}

module.exports = async (req, res) => {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const step = { name: 'init' };
  try {
    const { groupId, reportId, params } = req.body || {};
    console.log('📊 Vercel: Received export request:', { groupId, reportId, paramsCount: params?.length || 0 });
    
    if (!groupId || !reportId) return res.status(400).json({ error: 'Missing groupId/reportId' });

    const token = process.env.POWERBI_EMBED_TOKEN;
    if (!token) return res.status(500).json({ error: 'No PowerBI embed token configured' });

    step.name = 'startExport';
    const start = await pbiPost(
      `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/ExportTo`,
      { format: 'CSV', paginatedReportConfiguration: { parameterValues: params || [] } },
      token
    );
    const exportId = start.id;

    step.name = 'poll';
    const deadline = Date.now() + 240000;
    for (;;) {
      await new Promise(r => setTimeout(r, 2000));
      const poll = await pbiGet(
        `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/exports/${exportId}`,
        token
      );
      if (poll.status === 'Succeeded') break;
      if (poll.status === 'Failed') throw new Error(`Export failed: ${JSON.stringify(poll)}`);
      if (Date.now() > deadline) throw new Error('Timeout waiting for export');
    }

    step.name = 'download';
    const buffer = await pbiGet(
      `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/exports/${exportId}/file`,
      token,
      'buffer'
    );

    const base64 = buffer.toString('base64');
    return res.status(200).json({ filename: `report_${Date.now()}.csv`, base64 });
  } catch (e) {
    // keep CORS headers on error responses
    setCors(res, req.headers.origin);
    const status = 500;
    console.error('Export error step=', step.name, e);
    return res.status(status).json({ error: 'PBI_EXPORT_FAILED', step: step.name, detail: String(e) });
  }
};
