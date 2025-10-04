// Health check endpoint for the Vercel serverless function

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
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
