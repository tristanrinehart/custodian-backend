// 3100
const allowedOrigins = require('../config/allowedOrigins');
module.exports = (req, res, next) => {
  const { origin } = req.headers;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
};
