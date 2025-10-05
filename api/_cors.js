const ALLOWED_ORIGINS = [
  // your extension origin(s)
  'chrome-extension://cjollmpjlbggmodndfamooliloonmnbh',
  // local dev (if needed)
  'http://localhost:3000',
];

function setCors(res, origin) {
  // reflect specific origin for cleaner audits (or use "*" if you prefer)
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*'); // ok if you don't send cookies
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

module.exports = { setCors };
