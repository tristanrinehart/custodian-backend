// middleware/csrf.js
const crypto = require('crypto');
const isProd = process.env.NODE_ENV === 'production';

// Use a new name to avoid clashes with any legacy cookies still hanging around
const CSRF_COOKIE_NAME = 'custodian_csrf_v2';

function setCsrfCookie(res, value) {
  res.cookie(CSRF_COOKIE_NAME, value, {
    httpOnly: false,           // readable by JS (we're not reading it; JSON is the source of truth)
    secure: isProd,            // required on HTTPS
    sameSite: 'None',          // always send in all contexts (simplest + robust)
    path: '/',                 // send to every path
    // IMPORTANT: host-only cookie (omit "domain") -> ties it to custodian-backend.onrender.com
    // Do NOT set "Partitioned" while debugging; it complicates things
  });
}

// Clear any legacy cookies that might collide (host-only, domain-scoped, old names)
function sweepLegacyCookies(req, res) {
  const names = ['csrf', 'custodian_csrf', 'custodian_csrf_v2'];
  for (const name of names) {
    try { res.clearCookie(name, { path: '/' }); } catch {}
    try { res.clearCookie(name, { domain: '.onrender.com', path: '/' }); } catch {}
    try { res.clearCookie(name, { domain: 'custodian-backend.onrender.com', path: '/' }); } catch {}
  }
}

function ensureCsrfCookie(req, res, next) {
  // either reuse existing or mint a new one
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  const token = existing || crypto.randomBytes(24).toString('base64url');

  // collapse any duplicates, then set one canonical cookie for the backend host
  sweepLegacyCookies(req, res);
  setCsrfCookie(res, token);

  // expose the exact value we just set
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

module.exports = { ensureCsrfCookie, requireCsrf, CSRF_COOKIE_NAME };



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
