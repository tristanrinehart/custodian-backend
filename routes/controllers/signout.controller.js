// routes/controllers/signout.controller.js
const isProd = process.env.NODE_ENV === 'production';

/**
 * Detect HTTPS even when behind a proxy/CDN.
 * (Make sure you have app.set('trust proxy', true) if you're behind a proxy.)
 */
function isRequestSecure(req) {
  return Boolean(req?.secure) || req?.headers?.['x-forwarded-proto'] === 'https';
}

/**
 * Clear a cookie using the same options you used when setting it.
 * Note: to reliably clear, options must match (path/sameSite/secure/httpOnly/domain).
 */
function clearCookieSafe(req, res, name, { httpOnly }) {
  const opts = {
    path: '/',
    sameSite: 'Lax',
    secure: isProd || isRequestSecure(req),
    httpOnly,
    // IMPORTANT: do NOT set `domain` here if you didn't set one when creating.
  };
  try {
    res.clearCookie(name, opts);
  } catch (_) {
    // Never throw during logout.
  }
}

/**
 * Sign out:
 * - Clear refresh cookie (`jwt`, httpOnly)
 * - Clear access cookie  (`access`, httpOnly)
 * - If you store refresh tokens server-side (DB/redis), treat absence as a no-op
 * - Always return 204
 */
async function handleSignOut(req, res) {
  // Best-effort: if you persist refresh tokens, revoke here guardedly
  try {
    const refreshToken = req.cookies?.jwt;
    // Example pattern (pseudo):
    // if (refreshToken) await RefreshTokenStore.revoke(refreshToken).catch(() => {});
  } catch (_) {
    // swallow any revoke errors — logout should not 500
  }

  // Clear cookies whether or not they exist
  clearCookieSafe(req, res, 'jwt',    { httpOnly: true  }); // refresh
  clearCookieSafe(req, res, 'access', { httpOnly: true  }); // access

  return res.sendStatus(204);
}

module.exports = { handleSignOut };
