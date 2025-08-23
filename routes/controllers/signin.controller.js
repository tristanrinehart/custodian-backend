// routes/controllers/signin.controller.js
// Replace your existing sign-in controller with this pattern.
// Assumes you validate credentials and load `user` from DB.
const bcrypt = require('bcrypt');
const User = require('../../models/user.model.js');
const { signAccessToken, signRefreshToken } = require('../../utils/jwt');
const { accessCookie, refreshCookie } = require('../../config/cookieOptions');

module.exports = async function handleSignIn(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const user = await User.findOne({ email }).exec();
  if (!user) return res.sendStatus(401);

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.sendStatus(401);

  const payload = { UserInfo: { id: user._id.toString(), roles: user.roles || [] } };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ id: user._id.toString() });

  // Persist refresh token with the user (single-token strategy)
  user.refreshToken = refreshToken;
  await user.save();

  // Set cookies
  res.cookie('access', accessToken, accessCookie);
  res.cookie('jwt', refreshToken, refreshCookie);

  // No need to return tokens in body
  return res.status(200).json({ ok: true });
};
