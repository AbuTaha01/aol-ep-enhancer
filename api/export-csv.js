const { setCors } = require('./_cors');

// --- Helpers (no axios) ---
async function aadToken() {
  const params = new URLSearchParams();
  params.append('client_id', process.env.AZURE_CLIENT_ID);
  params.append('client_secret', process.env.AZURE_CLIENT_SECRET);
  params.append('grant_type', 'client_credentials');
  params.append('scope', 'https://analysis.windows.net/powerbi/api/.default');

  const r = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: params }
  );
  if (!r.ok) throw new Error(`AAD token failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.access_token;
}

async function pbiPost(url, body, token) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`PBI POST ${r.status}: ${await r.text()}`);
  return r.json();
}

async function pbiGet(url, token, as = 'json') {
  const r = await fetch(url, { headers: { 'authorization': `Bearer ${token}` } });
  if (!r.ok) throw new Error(`PBI GET ${r.status}: ${await r.text()}`);
  if (as === 'buffer') {
    const ab = await r.arrayBuffer();
    return Buffer.from(ab);
  }
  return r.json();
}

module.exports = async (req, res) => {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const step = { name: 'init' };
  try {
    const { groupId, reportId, params } = req.body || {};
    if (!groupId || !reportId) return res.status(400).json({ error: 'Missing groupId/reportId' });

    step.name = 'auth';
    const token = await aadToken();

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
    const buf = await pbiGet(
      `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/exports/${exportId}/file`,
      token,
      'buffer'
    );

    const base64 = buf.toString('base64');
    return res.status(200).json({ filename: `report_${Date.now()}.csv`, base64 });
  } catch (e) {
    // keep CORS headers on error responses
    setCors(res, req.headers.origin);
    const status = 500;
    console.error('Export error step=', step.name, e);
    return res.status(status).json({ error: 'PBI_EXPORT_FAILED', step: step.name, detail: String(e) });
  }
};
