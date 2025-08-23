// 3100

// routes/controllers/logout.controller.js
const User = require('../../models/User');
const { clearBase } = require('../../config/cookieOptions');

module.exports = async function logoutController(req, res) {
  const refreshToken = req.cookies?.jwt;

  if (refreshToken) {
    // Best effort: clear stored refresh token
    const user = await User.findOne({ refreshToken }).exec();
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
  }

  // Clear both cookies using the same attributes used to set them
  res.clearCookie('access', clearBase);
  res.clearCookie('jwt', clearBase);

  return res.sendStatus(204);
};
