// middleware/csrf.js
const crypto = require('crypto');
const isProd = process.env.NODE_ENV === 'production';
const CSRF_COOKIE_NAME = 'csrf';

function setCsrfCookie(res, value) {
  res.cookie(CSRF_COOKIE_NAME, value, {
    httpOnly: false,        // readable by frontend JS (for debug if needed)
    secure: isProd,         // required in prod
    sameSite: 'Lax',        // same-site subdomains -> cookie will be sent on XHR
    path: '/',              // root
    // IMPORTANT: no "domain" attribute -> host-only cookie for the backend host
    // DO NOT set "Partitioned" here while we stabilize
  });
}

// Optional: clear any legacy variants so only one cookie remains
function sweepLegacyCookies(req, res) {
  try {
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' }); // host-only legacy
    res.clearCookie(CSRF_COOKIE_NAME, { domain: '.onrender.com', path: '/' });
    res.clearCookie(CSRF_COOKIE_NAME, { domain: 'custodian-backend.onrender.com', path: '/' });
  } catch {}
}

function ensureCsrfCookie(req, res, next) {
  const token = req.cookies?.[CSRF_COOKIE_NAME] || crypto.randomBytes(24).toString('base64url');

  // Collapse any duplicates from earlier experiments, then set one canonical cookie
  sweepLegacyCookies(req, res);
  setCsrfCookie(res, token);

  res.locals.csrfToken = token;
  next();
}

function requireCsrf(req, res, next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();

  const header = req.get('X-CSRF-Token');
  const cookie = req.cookies?.[CSRF_COOKIE_NAME];

  if (!header || !cookie || header !== cookie) {
    console.warn('[CSRF FAIL]', {
      method: req.method,
      path: req.originalUrl,
      origin: req.get('origin'),
      header8: header ? header.slice(0,8) : null,
      cookie8: cookie ? cookie.slice(0,8) : null,
    });
    return res.status(403).json({ message: 'Forbidden (CSRF). Please try again.' });
  }
  next();
}

module.exports = { ensureCsrfCookie, requireCsrf };


/*
// middleware/csrf.js
const crypto = require('crypto');
const isProd = process.env.NODE_ENV === 'production';
const CSRF_COOKIE_NAME = 'csrf';

function ensureCsrfCookie(req, res, next) {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  if (existing) {
    res.locals.csrfToken = existing;
    return next();
  }
  const token = crypto.randomBytes(24).toString('base64url');
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,                   // readable by frontend JS
    sameSite: isProd ? 'None' : 'Lax', // cross-site in prod
    secure: isProd,
    domain:  isProd ? '.onrender.com' : null,                  
    ...(isProd ? { partitioned: true } : {}), // CHIPS for 3P contexts
    path: '/',
  });
  res.locals.csrfToken = token;
  return next();
}

function requireCsrf(req, res, next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const header = req.get('X-CSRF-Token'); // browser may send lowercase; Node normalizes
  const cookie = req.cookies?.[CSRF_COOKIE_NAME];
  if (!header || !cookie || header !== cookie) {
    if (process.env.LOG_CSRF === 'true') {
      console.warn(`[CSRF] fail method=${req.method} header(${!!header}) cookie(${!!cookie})`);
    }
    return res.status(403).json({ message: 'Forbidden (CSRF). Please try again.' });
  }
  return next();
}

module.exports = { ensureCsrfCookie, requireCsrf };
*/
