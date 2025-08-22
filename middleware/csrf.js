// middleware/csrf.js
const crypto = require('crypto');
const isProd = process.env.NODE_ENV === 'production';
const CSRF_COOKIE_NAME = 'csrf';

function setCanonicalCookie(res, value) {
  res.cookie(CSRF_COOKIE_NAME, value, {
    httpOnly: false,          // we return the token in JSON; JS- readable is OK for debugging
    secure: isProd,           // required on HTTPS in prod
    sameSite: 'None',         // robust across subdomains; both are HTTPS
    path: '/',                // root
    // IMPORTANT: host-only cookie -> omit "domain"
    // DO NOT set "Partitioned" while stabilizing
  });
}

function clearLegacyVariants(res) {
  // Clear any old wide-scope cookie so we don't have two cookies with the same name
  try { res.clearCookie(CSRF_COOKIE_NAME, { domain: '.onrender.com', path: '/' }); } catch {}
}

function ensureCsrfCookie(req, res, next) {
  // If we've already minted a token earlier in this *same request*, reuse it.
  if (res.locals.csrfToken) {
    setCanonicalCookie(res, res.locals.csrfToken);
    return next();
  }

  // Otherwise, reuse the request cookie if present, else mint a new token.
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  const token = existing || crypto.randomBytes(24).toString('base64url');

  // Normalize to ONE canonical cookie, and clear legacy wide-scope variants
  clearLegacyVariants(res);
  setCanonicalCookie(res, token);

  res.locals.csrfToken = token;
  next();
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
        header8: header ? header.slice(0,8) : null,
        cookie8: cookie ? cookie.slice(0,8) : null,
      });
    }
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
