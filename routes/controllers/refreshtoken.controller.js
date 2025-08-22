// routes/controllers/refreshtoken.controller.js
const User = require('../../models/user.model.js');
const { verifyRefresh, signAccessToken, signRefreshToken } = require('../../utils/jwt');
const { accessCookie, refreshCookie } = require('../../config/cookieOptions');

module.exports = async function handleRefreshToken(req, res) {
  const refreshToken = req.cookies?.jwt;
  if (!refreshToken) return res.sendStatus(401);

  // Verify refresh first
  verifyRefresh(refreshToken, async (err, decoded) => {
    if (err?.name === 'TokenExpiredError') return res.sendStatus(401);
    if (err) return res.sendStatus(403);

    // Look up user and ensure token matches what we have on record
    const user = await User.findOne({ _id: decoded.id }).exec();
    if (!user || user.refreshToken !== refreshToken) return res.sendStatus(403);

    // Mint new access token
    const payload = { UserInfo: { id: user._id.toString(), roles: user.roles || [] } };
    const newAccess = signAccessToken(payload);

    // (Optional) rotate refresh tokens. If you do, set + persist new one:
    // const newRefresh = signRefreshToken({ id: user._id.toString() });
    // user.refreshToken = newRefresh;
    // await user.save();
    // res.cookie('jwt', newRefresh, refreshCookie);

    res.cookie('access', newAccess, accessCookie);
    return res.sendStatus(204); // nothing else to return
  });
};

/*
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
*/