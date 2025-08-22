// middleware/csrf.js
// Minimal double-submit CSRF: sets a non-HttpOnly cookie `csrf` that
// clients must echo in `X-CSRF-Token` for unsafe methods.
const crypto = require('crypto');
const isProd = process.env.NODE_ENV === 'production';

const CSRF_COOKIE_NAME = 'csrf';

function ensureCsrfCookie(req, res, next) {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = crypto.randomBytes(24).toString('base64url');
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // client must read it
      sameSite: isProd ? 'None' : 'Lax',
      secure: isProd,
      partitioned: true,
      path: '/',
      maxAge: 2 * 60 * 60 * 1000, // 2h
    });
    req.csrfToken = token;
  } else {
    req.csrfToken = req.cookies[CSRF_COOKIE_NAME];
  }
  next();
}

function requireCsrf(req, res, next) {
  const method = (req.method || 'GET').toUpperCase();
  const unsafe = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!unsafe.includes(method)) return next();

  const header = req.get('X-CSRF-Token');
  const cookie = req.cookies?.[CSRF_COOKIE_NAME];
  if (!header || !cookie || header !== cookie) return res.sendStatus(403);
  return next();
}

module.exports = { ensureCsrfCookie, requireCsrf };
