// Health check endpoint for the Vercel serverless function

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
