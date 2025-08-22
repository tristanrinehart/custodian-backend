// routes/auth.routes.js
const express = require('express');
const router = express.Router();

const signin = require('./controllers/signin.controller');
const refresh = require('./controllers/refreshtoken.controller');
// const signout = require('./controllers/signout.controller');
const { ensureCsrfCookie } = require('../middleware/csrf');

// Sign in (sets cookies and should also verify CSRF on POST)
router.post('/signin', ensureCsrfCookie, signin);

// Refresh access (reads jwt cookie; sets access cookie)
router.get('/refresh', refresh);

// Return the CSRF token in JSON so the frontend can send it back via X-CSRF-Token
router.get('/csrf-token', ensureCsrfCookie, (req, res) => {
  const token =
    // If using csurf, call the function:
    (typeof req.csrfToken === 'function' ? req.csrfToken() : req.csrfToken) ||
    // If using custom middleware, read what it stashed:
    res.locals?.csrfToken ||
    // (Do NOT rely on req.cookies here; this request won’t see the fresh cookie)
    null;

  res.json({ csrfToken: token });
});

// router.post('/logout', logout);

module.exports = router;
