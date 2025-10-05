const axios = require('axios');
const { setCors } = require('./_cors');

module.exports = async (req, res) => {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const step = { name: 'init' };
  try {
    const { groupId, reportId, params } = req.body || {};
    console.log('📊 Vercel: Received export request:', { groupId, reportId, paramsCount: params?.length || 0 });
    
    if (!groupId || !reportId) return res.status(400).json({ error: 'Missing groupId/reportId' });

    step.name = 'startExport';
    const start = await axios.post(
      `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/ExportTo`,
      { format: 'CSV', paginatedReportConfiguration: { parameterValues: params || [] } },
      { 
        headers: { 
          Authorization: `Bearer ${process.env.POWERBI_EMBED_TOKEN}`,
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
            Authorization: `Bearer ${process.env.POWERBI_EMBED_TOKEN}` 
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
          Authorization: `Bearer ${process.env.POWERBI_EMBED_TOKEN}` 
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
