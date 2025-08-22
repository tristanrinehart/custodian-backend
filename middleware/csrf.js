// middleware/csrf.js
const crypto = require('crypto');

const CSRF_COOKIE = 'csrf';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const cookieOptions = {
  maxAge: TWO_HOURS_MS,
  path: '/',
  secure: true,
  sameSite: 'none',
  partitioned: true,
  // httpOnly can be true with double-submit when you send the token via JSON,
  // because JS doesn’t need to read the cookie. The browser will still send it back.
  httpOnly: true,
};

function ensureCsrfCookie(req, res, next) {
  try {
    // Reuse existing token if present on the request; otherwise mint a new one.
    // Note: this reads an *existing* cookie sent by the browser on the request,
    // not the one we're about to set in the response.
    let token = req.cookies?.[CSRF_COOKIE];
    if (!token) {
      token = crypto.randomBytes(32).toString('base64url');
    }

    // Set exactly once per request
    res.cookie(CSRF_COOKIE, token, cookieOptions);

    // Expose for the /csrf-token JSON route
    res.locals.csrfToken = token;

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { ensureCsrfCookie };
