const express = require("express");
const User = require("../models/user.model.js"); 
const router = express.Router();
const { signUp } = require('./controllers/user.controller.js');
const {check} = require('express-validator');

//controller function
router.post('/signup', [
    check('name', 'Name is required').notEmpty(),
    check('email', 'Email is required').isEmail(),
    check('password', 'Password must be at least 6 characters long').isLength({ min: 6 })
], signUp);
///router.post('/signin', signIn);
//router.get('/signout', signOut);

module.exports = router;