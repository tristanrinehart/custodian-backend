// middleware/csrf.js
const crypto = require('crypto');
const isProd = process.env.NODE_ENV === 'production';
const CSRF_COOKIE_NAME = 'csrf';

function ensureCsrfCookie(req, res, next) {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  if (existing) {
    res.locals.csrfToken = existing;    // expose existing
    return next();
  }
  const token = crypto.randomBytes(24).toString('base64url');
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: isProd ? 'None' : 'Lax',
    secure: isProd,
    path: '/',
    ...(isProd ? { partitioned: true } : {}),  // only in prod
    maxAge: 2 * 60 * 60 * 1000,
  });
  res.locals.csrfToken = token;          // expose newly set token
  return next();
}

function requireCsrf(req, res, next) {
  if (req.method === 'OPTIONS' || req.method === 'GET' || req.method === 'HEAD') return next();
  const header = req.get('X-CSRF-Token');
  const cookie = req.cookies?.[CSRF_COOKIE_NAME];
  if (!header || !cookie || header !== cookie) {
    return res.status(403).json({ message: 'Forbidden (CSRF). Please try again.' });
  }
  return next();
}

module.exports = { ensureCsrfCookie, requireCsrf };
