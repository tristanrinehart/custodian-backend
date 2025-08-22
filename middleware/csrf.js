// middleware/csrf.js
const crypto = require('crypto');
const isProd = process.env.NODE_ENV === 'production';
const CSRF_COOKIE_NAME = 'csrf';

function setCsrfCookie(res, value) {
  res.cookie(CSRF_COOKIE_NAME, value, {
    httpOnly: false,
    sameSite: isProd ? 'None' : 'Lax',
    secure: isProd,
    domain: isProd ? '.onrender.com' : undefined, // single canonical scope
    // Temporarily disable Partitioned while we stabilize:
    // ...(isProd ? { partitioned: true } : {}),
    path: '/',
  });
}

function sweepLegacyCookies(req, res) {
  // Clear possible legacy scopes so only one cookie remains
  try {
    // host-only cookie (no domain)
    if (req.cookies?.[CSRF_COOKIE_NAME]) {
      res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
    }
    // host-specific domain cookie
    res.clearCookie(CSRF_COOKIE_NAME, {
      domain: 'custodian-backend.onrender.com',
      path: '/',
    });
    // non-partitioned vs partitioned variants are indistinguishable here, but
    // this clear + canonical set will collapse to one cookie.
  } catch (_) {}
}

function ensureCsrfCookie(req, res, next) {
  // Always produce a single canonical cookie value and return it
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  const token = existing || crypto.randomBytes(24).toString('base64url');

  // Remove legacy-scoped duplicates, then set the canonical cookie
  sweepLegacyCookies(req, res);
  setCsrfCookie(res, token);

  res.locals.csrfToken = token;
  return next();
}

function requireCsrf(req, res, next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();

  const header = req.get('X-CSRF-Token');
  const cookie = req.cookies?.[CSRF_COOKIE_NAME];

  if (!header || !cookie || header !== cookie) {
    // helpful one-line log:
    console.warn('[CSRF FAIL]', {
      method: req.method,
      path: req.originalUrl,
      origin: req.get('origin'),
      header8: header ? header.slice(0,8) : null,
      cookie8: cookie ? cookie.slice(0,8) : null
    });
    return res.status(403).json({ message: 'Forbidden (CSRF). Please try again.' });
  }
  return next();
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
