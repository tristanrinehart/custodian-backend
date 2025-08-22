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

/*
// 3100
// https://www.youtube.com/watch?v=favjC6EKFgw&list=PL0Zuz27SZ-6PFkIxaJ6Xx_X46avTM1aYw&index=11
// https://github.com/gitdagray/express_jwt/blob/main/middleware/verifyJWT.js

const jwt = require('jsonwebtoken');
require('dotenv').config()

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.sendStatus(401); // Unauthorized
    
    const token = authHeader.split(' ')[1]; // Extract the token from the header
    console.log(token) // Log the token for debugging


//Something seems to be wrong with the below code because I can't auth to a protected route
    jwt.verify(
        token, 
        process.env.ACCESS_TOKEN_SECRET, 
        (err, decoded) => {
            if (err) return res.sendStatus(403); // Forbidden
            req.user = decoded.email; // Attach the decoded user info to the request object
            //console.log(`User: ${req.user}`); // Log the user for debugging
            //console.log(err.message)
            next(); // Proceed to the next middleware or route handler
        });
}

module.exports = verifyJWT;
*/