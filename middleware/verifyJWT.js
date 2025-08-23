// middleware/verifyJWT.js
const { verifyAccess } = require('../utils/jwt');

module.exports = (req, res, next) => {
  // Support either Authorization header OR access cookie
  const auth = req.headers.authorization || '';
  const headerToken = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const cookieToken = req.cookies?.access || null;
  const token = headerToken || cookieToken;

  if (!token) return res.sendStatus(401);

  verifyAccess(token, (err, decoded) => {
    if (err) return res.sendStatus(403);
    // normalize user info field
    req.user = decoded?.UserInfo || decoded?.user || decoded;
    return next();
  });
};
