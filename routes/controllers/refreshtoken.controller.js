// 3100
// 
const usersDB = {
    users: require('../../models/users.json'),
    setUsers: function (data) {this.users = data }
}

const jwt = require('jsonwebtoken');
require('dotenv').config()


const handleRefreshToken = (req, res) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) return res.sendStatus(401)
    console.log(cookies.jwt) // Log the refresh token for debugging
    const refreshToken = cookies.jwt;

    const foundUser = usersDB.users.find(user => user.refreshToken === refreshToken);
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