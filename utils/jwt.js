// utils/jwt.js
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

exports.signAccessToken = (payload) =>
  jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

exports.signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL });

exports.verifyAccess = (token, cb) =>
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, cb);

exports.verifyRefresh = (token, cb) =>
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, cb);
