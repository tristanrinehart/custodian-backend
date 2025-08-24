// routes/auth.routes.js
const express = require('express');
const router = express.Router();

const refresh = require('./controllers/refreshtoken.controller');
//const signout = require('./controllers/signout.controller');
const { ensureCsrfCookie } = require('../middleware/csrf');

// Refresh access (reads jwt cookie; sets access cookie)
router.get('/refresh', refresh);

/* this should not be here
router.get('/csrf-token', ensureCsrfCookie, (req, res) => {
  res.json({ csrfToken: req.csrfToken || req.cookies?.csrf || null });
});
*/

module.exports = router;
