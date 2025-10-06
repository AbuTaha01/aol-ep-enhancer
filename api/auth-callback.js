// Azure AD OAuth callback endpoint for Chrome extension
const axios = require('axios');

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
  setCors(res, req.headers.origin);
  
  if (req.method === 'OPTIONS') return res.status(204).end();
  
  if (req.method === 'GET') {
    try {
      const { code, error, state } = req.query;
      
      if (error) {
        console.error('OAuth error:', error);
        return res.status(400).send(`
          <html>
            <body>
              <h2>Authentication Error</h2>
              <p>Error: ${error}</p>
              <p>Please try again.</p>
              <script>
                // Close the popup window
                window.close();
              </script>
            </body>
          </html>
        `);
      }
      
      if (code) {
        console.log('📊 Auth callback: Received authorization code');
        
        // Exchange code for token
        const tokenResponse = await axios.post(
          'https://aol-ep-enhancer.vercel.app/api/export-csv',
          {
            action: 'exchange_code',
            code: code
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        const accessToken = tokenResponse.data.access_token;
        
        // Send token back to extension via postMessage
        return res.status(200).send(`
          <html>
            <body>
              <h2>Authentication Successful!</h2>
              <p>You can close this window now.</p>
              <script>
                // Send token to parent window (Chrome extension)
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'AZURE_AD_TOKEN',
                    token: '${accessToken}'
                  }, '*');
                }
                // Close the popup window
                setTimeout(() => window.close(), 2000);
              </script>
            </body>
          </html>
        `);
      }
      
      return res.status(400).send(`
        <html>
          <body>
            <h2>Invalid Request</h2>
            <p>No authorization code received.</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
      
    } catch (error) {
      console.error('Auth callback error:', error);
      return res.status(500).send(`
        <html>
          <body>
            <h2>Server Error</h2>
            <p>Failed to process authentication.</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};
