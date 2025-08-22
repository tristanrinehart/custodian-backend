// routes/auth.routes.js
const express = require('express');
const router = express.Router();

const signin = require('./controllers/signin.controller');
const refresh = require('./controllers/refreshtoken.controller');
//const signout = require('./controllers/signout.controller');
const { ensureCsrfCookie } = require('../middleware/csrf');

// Sign in (sets cookies)
router.post('/signin', ensureCsrfCookie, signin);

// Refresh access (reads jwt cookie; sets access cookie)
router.get('/refresh', refresh);

// Logout (clears cookies)
//router.post('/logout', logout);

// Optionally expose CSRF token to clients that want to prefetch it

router.get('/csrf-token', ensureCsrfCookie, (req, res) => {
  res.json({ csrfToken: req.csrfToken || req.cookies?.csrf || null });
});


module.exports = router;
