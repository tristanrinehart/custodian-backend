// 3100

const User = require('../../models/user.model.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config()

console.log("Signin controller loaded");
const handleSignIn = async (req, res) => {
    const { email, pwd } = req.body; //destructure
    if (!email || !pwd) return res.status(400).json({ 'message': 'Email and password are required.' });
    const foundUser = await User.findOne({ email }).exec(); //look for email match

    if (!foundUser) return res.sendStatus(401); // Unauthorized
    // Evaluate password
    const match = await bcrypt.compare(pwd, foundUser.password); 
    if (match) {
        //Need to create JWTs here
        const accessToken = jwt.sign(
            {"email": foundUser.email},
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn: '15m'} // Access token expires in 15 minutes,
        )
        const refreshToken = jwt.sign(
            {"email": foundUser.email},
            process.env.REFRESH_TOKEN_SECRET,
            {expiresIn: '1000d'} // Refresh tokoen expires in 1000 days
        )
        //Saving refreshToken with current user via nuke & pave
        foundUser.refreshToken = refreshToken;
        const result = await foundUser.save(); // Save the updated user
        console.log(result); // Log the result for debugging
        
        res.cookie('jwt', refreshToken, {
            httpOnly: true, // Accessible only by web server
            sameSite: 'None', // Cross-site cookie
            secure: true,
            maxAge: 24 * 60 * 60 * 1000 * 1000// 1000 days
        });
        res.json(
            {accessToken, 
            email: foundUser.email, 
            userId: foundUser._id
        }); // Respond with access token and email
    } else {
        res.sendStatus(401); // Unauthorized
    }

}

module.exports = { handleSignIn };