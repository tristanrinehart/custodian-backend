// 3100

// Unify on CORS_ORIGINS and export an array
const raw =
  process.env.CORS_ORIGINS ||
  process.env.ALLOWED_ORIGINS_DEV ||
  process.env.ALLOWED_ORIGINS_PROD ||
  'http://localhost:5173';

const allowedOrigins = raw
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

module.exports = allowedOrigins;



/*
// config/allowedOrigins.js
const csv = process.env.CORS_ORIGINS || 'http://localhost:5173';
module.exports = csv.split(',').map(s => s.trim()).filter(Boolean);
*/