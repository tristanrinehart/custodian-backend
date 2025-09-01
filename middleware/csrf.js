// middleware/csrf.js
const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'csrf';
const isProd = process.env.NODE_ENV === 'production';

/**
 * Detect if the request is effectively HTTPS (useful when behind a proxy/CDN).
 */
function isRequestSecure(req) {
  // req.secure is set by Express when trust proxy is configured (app.set('trust proxy', ...))
  // x-forwarded-proto is a common header added by proxies (e.g., Render/Heroku/Nginx)
  return Boolean(req?.secure) || req?.headers?.['x-forwarded-proto'] === 'https';
}

/**
 * Clear any legacy variants that might have been set with a wide domain.
 * Safe to call even if they don't exist.
 */
function clearLegacyVariants(res) {
  try {
    res.clearCookie(CSRF_COOKIE_NAME, { domain: '.onrender.com', path: '/' });
  } catch {}
}

/**
 * Set the canonical CSRF cookie as a host-only cookie (no `domain`).
 * - httpOnly: false (so the client can read and echo it in a header)
 * - sameSite: 'Lax' (works well for same-site XHR while mitigating CSRF)
 * - secure: required on HTTPS in prod; also enabled if request is HTTPS behind a proxy
 * - maxAge: optional convenience so the token survives dev reloads (12h)
 */
function setCanonicalCsrfCookie(req, res, value) {
  res.cookie(CSRF_COOKIE_NAME, value, {
    httpOnly: false,                      // client needs to echo this in a header
    secure: isProd || isRequestSecure(req),
    sameSite: 'Lax',
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,          // 12 hours
    // IMPORTANT: do NOT set `domain`
    // ...(isProd ? { partitioned: true } : {}) // keep commented if you rely on dev proxying
  });
}

/**
 * Ensure a CSRF cookie exists and expose it on res.locals.csrfToken for routes
 * (e.g., /api/users/csrf-token) to return to the client.
 */
function ensureCsrfCookie(req, res, next) {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  if (existing) {
    res.locals.csrfToken = existing;
    return next();
  }

  // Mint a new token and set the canonical cookie
  const token = crypto.randomBytes(24).toString('base64url');
  clearLegacyVariants(res);
  setCanonicalCsrfCookie(req, res, token);
  res.locals.csrfToken = token;
  return next();
}

/**
 * Require a valid CSRF token for state-changing requests.
 * Accepts either "X-CSRF-Token" or "X-XSRF-Token".
 */
function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const header =
    req.get('X-CSRF-Token') ||
    req.get('X-XSRF-Token'); // some axios setups use this name

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

/*
// middleware/csrf.js
const crypto = require('crypto');
const isProd = process.env.NODE_ENV === 'production';
const CSRF_COOKIE_NAME = 'csrf';

function setCanonicalCsrfCookie(res, value) {
  // Host-only cookie (no "domain"), so the browser will send it on XHR to the backend host.
  res.cookie(CSRF_COOKIE_NAME, value, {
    httpOnly: false,                     // frontend reads token from JSON; this stays false for debug parity
    secure: isProd,                      // required on https in prod
    sameSite: isProd ? 'Lax' : 'Lax',                   // robust across subdomains; both are https
    path: '/',
    //...(isProd ? { partitioned: true } : {}) //commented out to supprt api rewriting
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
*/
