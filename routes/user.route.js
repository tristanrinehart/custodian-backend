const express = require("express");
const User = require("../models/user.model.js"); 
const router = express.Router();
const { handleNewUser } = require('./controllers/signup.controller.js');
const { handleSignIn } = require('./controllers/signin.controller.js');
const { handleSignOut } = require('./controllers/signout.controller.js');
const {check} = require('express-validator');

//controller function
router.post('/signup', [
    //check('username', 'Username is required').notEmpty(),
    check('email', 'Email is required').isEmail(),
    check('password', 'Password must be at least 2 characters long').isLength({ min: 2 })
], handleNewUser);

router.post('/signin', handleSignIn);
router.get('/signout', handleSignOut);

module.exports = router;