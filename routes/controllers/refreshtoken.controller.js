// 3100
// 
const User = require('../../models/user.model.js');
const jwt = require('jsonwebtoken');
require('dotenv').config()


const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) return res.sendStatus(401)
    console.log(cookies.jwt) // Log the refresh token for debugging
    const refreshToken = cookies.jwt;

    const foundUser = await User.findOne({ refreshToken: refreshToken }).exec(); // use of exec is a mongoose requirement
    if (!foundUser) return res.sendStatus(403)//look for refresh token match

    if (!foundUser) return res.sendStatus(401); // Unauthorized
    
    // Evaluate jwt
    jwt.verify(
        refreshToken, 
        process.env.REFRESH_TOKEN_SECRET, 
        (err, decoded) => {
            if (err || foundUser.email !== decoded.email) return res.sendStatus(403); // Forbidden
            // Create new access token
            const accessToken = jwt.sign(
                {"email": decoded.email},
                process.env.ACCESS_TOKEN_SECRET,
                {expiresIn: '15m'} // Access token expires in 15 minutes
            );
            res.json({ accessToken });
        }
    );
}

module.exports = { handleRefreshToken }