// 3100

const User = require('../../models/user.model.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config()

console.log("Signup controller loaded");
const handleNewUser = async (req, res) => {
    const { email, pwd } = req.body; //destructure
    if (!email || !pwd) return res.status(400).json({ 'message': 'Email and password are required.' });
    
    //check for duplicate email
    const duplicate = await User.findOne({ email }).exec(); // Check for duplicate email
    if (duplicate) return res.sendStatus(409); //Conflict

    try {
        //encrypt password
        const hashedPwd = await bcrypt.hash(pwd, 10);
        //create and store new user
        const result = await User.create({
            "email": email,
            "password": hashedPwd
        });

        console.log(result);
        
        res.status(201).json({ 'success': `New user ${email} created!` });
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
}

module.exports = { handleNewUser };