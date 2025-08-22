// routes/controllers/me.controller.js
const User = require('../../models/user.model.js'); // adjust path if needed

/**
 * GET /me
 * Requires verifyJWT (reads access token from cookie or Authorization header)
 * Responds with { user: { id, email, name, roles } }
 */
module.exports = async function handleMe(req, res) {
  try {
    // verifyJWT should set req.user to the decoded payload
    // We normalized it earlier to decoded?.UserInfo || decoded?.user || decoded
    const decoded = req.user;
    if (!decoded) return res.sendStatus(401);

    // Support multiple payload shapes
    const userId =
      decoded?.id ||
      decoded?._id ||
      decoded?.UserInfo?.id ||
      decoded?.UserInfo?._id;

    if (!userId) return res.sendStatus(401);

    // Look up fresh data (email, roles, etc.)
    const user = await User.findById(userId)
      .select('_id email name roles') // project only safe fields
      .lean()
      .exec();

    if (!user) return res.sendStatus(401);

    return res.status(200).json({
      user: {
        id: user._id?.toString?.() || user._id,
        email: user.email || null,
        name: user.name || null,
        roles: user.roles || [],
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load current user' });
  }
};
