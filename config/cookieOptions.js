const isProd = process.env.NODE_ENV === 'production';

const base = {
  path: '/',
  httpOnly: true,
  sameSite: isProd ? 'None' : 'Lax',
  secure: isProd,
  // IMPORTANT: host-only cookie (no "domain")
  ...(isProd ? { partitioned: true } : {}),   // CHIPS for cross-site
};

exports.accessCookie = {
  ...base,
  maxAge: 15 * 60 * 1000, // 15m
};

exports.refreshCookie = {
  ...base,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
};

/*
const isProd = process.env.NODE_ENV === 'production';

const base = {
  path: '/',
  httpOnly: true,
  sameSite: isProd ? 'None' : 'Lax',
  secure: isProd,
  domain: isProd ? '.onrender.com' : null,
  ...(isProd ? { partitioned: true } : {}) // must be true in prod with SameSite=None
};

exports.accessCookie = {
  ...base,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

exports.refreshCookie = {
  ...base,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

exports.clearBase = base;
*/