// middleware/csrf.js
const crypto = require('crypto');
const isProd = process.env.NODE_ENV === 'production';
const CSRF_COOKIE_NAME = 'csrf';

function setCanonicalCsrfCookie(res, value) {
  // Host-only cookie (no "domain"), so the browser will send it on XHR to the backend host.
  res.cookie(CSRF_COOKIE_NAME, value, {
    httpOnly: false,                     // frontend reads token from JSON; this stays false for debug parity
    secure: isProd,                      // required on https in prod
    sameSite: isProd ? 'None' : 'Lax',                   // robust across subdomains; both are https
    path: '/',
    ...(isProd ? { partitioned: true } : {})
    // IMPORTANT: no "domain", no "partitioned"
  });
}

function clearLegacyVariants(res) {
  // Clear any wide-scope cookie that may still be hanging around
  try { res.clearCookie(CSRF_COOKIE_NAME, { domain: '.onrender.com', path: '/' }); } catch {}
}

function ensureCsrfCookie(req, res, next) {
  const existing = req.cookies?.csrf;
  if (existing) {
    res.locals.csrfToken = existing;
    return next();
  }
  // Otherwise mint + set once
  const token = crypto.randomBytes(24).toString('base64url');
  setCanonicalCsrfCookie(res, token);
  res.locals.csrfToken = token;
  return next();
}

function requireCsrf(req, res, next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const header = req.get('X-CSRF-Token');
  const cookie = req.cookies?.[CSRF_COOKIE_NAME];

  if (!header || !cookie || header !== cookie) {
    if (process.env.LOG_CSRF === 'true') {
      console.warn('[CSRF FAIL]', {
        method: req.method,
        path: req.originalUrl,
        origin: req.get('origin'),
        header8: header ? header.slice(0, 8) : null,
        cookie8: cookie ? cookie.slice(0, 8) : null,
      });
    }
    return res.status(403).json({ message: 'Forbidden (CSRF). Please try again.' });
  }
  return next();
}

module.exports = { ensureCsrfCookie, requireCsrf };
