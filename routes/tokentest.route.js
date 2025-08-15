// 3100

const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/tokentest', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'tokentest.html'));
});

module.exports = router;