// 3100

const express = require('express');
const router = express.Router();
const refreshTokenController = require('./controllers/refreshtoken.controller.js');

router.get('/', refreshTokenController.handleRefreshToken);

module.exports = router;