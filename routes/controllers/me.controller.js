// routes/controllers/me.controller.js
const User = require('../../models/user.model.js');

module.exports = async function handleMe(req, res) {
  try {
    // verifyJWT should have set req.user from the access token
    const decoded = req.user;
    if (!decoded) return res.sendStatus(401);

    // Support your current payload shapes (e.g., { UserInfo: { id, roles } })
    const userId =
      decoded?.id ??
      decoded?._id ??
      decoded?.UserInfo?.id ??
      decoded?.UserInfo?._id;

    if (!userId) return res.sendStatus(401);

    // Fetch fresh user fields
    const user = await User.findById(userId)
      .select('_id email name roles')
      .lean()
      .exec();

    if (!user) return res.sendStatus(401);

    // ✅ Flat response (no nesting)
    return res.status(200).json({
      id: user._id?.toString?.() ?? String(user._id),
      email: user.email ?? null,
      name: user.name ?? null,
      roles: Array.isArray(user.roles) ? user.roles : [],
    });
  } catch (err) {
    console.error('GET /api/users/me error:', err);
    return res.status(500).json({ message: 'Failed to load current user' });
  }
};

