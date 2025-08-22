// 3100

// config/corsOptions.js
const allowedOrigins = require('./allowedOrigins');

const corsOptions = {
  origin: (origin, callback) => {
    // allow tools with no Origin (curl, Postman)
    if (!origin) return callback(null, true);
    const ok = allowedOrigins.includes(origin);
    // DEBUG: see what's being allowed/blocked
    if (process.env.LOG_CORS === 'true') {
      console.log(`[CORS] origin=${origin} -> ${ok ? 'ALLOW' : 'BLOCK'}`);
    }
    return ok ? callback(null, true)
              : callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 204,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  // IMPORTANT: let `cors` reflect Access-Control-Request-Headers automatically
  // (do not set `allowedHeaders` at all)
};

module.exports = corsOptions;

