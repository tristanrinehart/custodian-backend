// 3100
// 
const User = require('../../models/user.model.js');
const jwt = require('jsonwebtoken');
require('dotenv').config()


const handleSignOut = async (req, res) => {
    // On client, also delete the accessToken
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204); // No content
    const refreshToken = cookies.jwt;

    // Is refreshToken in db?
    const foundUser = await User.findOne({ refreshToken: refreshToken }).exec();
    if (!foundUser) {
        // If no user found, clear the cookie and return 204
        res.clearCookie('jwt', { httpOnly: true, maxAge: 24 * 60 * 1000 * 1000 }); // clear cookie
        return res.sendStatus(204); // No content
    } 
   
    // Delete refreshToken from the user
    foundUser.refreshToken = '';
    const result = await foundUser.save(); // Save the updated user
    console.log(result);  

    res.clearCookie('jwt', { 
        httpOnly: true, 
        sameSite: 'None', 
        secure: true 
    }); // clear cookie, set secure: true in Prod
    res.sendStatus(204); // No content

}

module.exports = { handleSignOut }