// 3100

const express = require('express');
const router = express.Router();
const handleRefreshToken = require('./controllers/refreshtoken.controller.js');

router.get('/', handleRefreshToken);

module.exports = router;