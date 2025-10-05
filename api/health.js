// Health check endpoint for the Vercel serverless function

const { setCors } = require('./_cors');

module.exports = (req, res) => {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    res.status(200).json({ 
      status: "ok", 
      message: "AOL-EP-Enhancer PowerBI Export API is running",
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
