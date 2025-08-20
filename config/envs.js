// config/env.js
const dotenvFlow = require('dotenv-flow');
dotenvFlow.config({ silent: true });

const { cleanEnv, str, num, bool, url } = require('envalid');

const env = cleanEnv(process.env, {
  NODE_ENV:      str({ choices: ['development','production'], default: 'development' }),
  PORT:          num({ default: 3000 }),
  MONGODB_URI:   str(),   // <-- required
  ACCESS_TOKEN_SECRET:  str(),
  REFRESH_TOKEN_SECRET: str(),
  CORS_ORIGINS:  str({ default: 'http://localhost:5173' }),
  COOKIE_SECURE: bool({ default: false }),
  PUBLIC_API_BASE_URL: url({ default: 'http://localhost:3000' }),
});

module.exports = { env };
