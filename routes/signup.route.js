// 3100

const express = require('express');
const router = express.Router();
const signupController = require('./controllers/signup.controller.js');

router.post('/', signupController.handleNewUser);

module.exports = router;