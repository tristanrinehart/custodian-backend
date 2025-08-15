// 3100

const express = require('express');
const router = express.Router();
const signoutController = require('./controllers/signout.controller.js');

router.get('/', signoutController.handleSignOut);

module.exports = router;