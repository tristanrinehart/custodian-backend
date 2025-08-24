const isProd = process.env.NODE_ENV === 'production';

const base = {
  path: '/',
  httpOnly: true,
  sameSite: isProd ? 'Lax' : 'Lax',
  secure: isProd,
  // IMPORTANT: host-only cookie (no "domain")
  //...(isProd ? { partitioned: true } : {}),  // CHIPS for cross-site
};

exports.accessCookie = {
  ...base,
  maxAge: 15 * 60 * 1000, // 15m
};

exports.refreshCookie = {
  ...base,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
};
