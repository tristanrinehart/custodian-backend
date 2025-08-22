// 3100

const allowedOrigins = require('./allowedOrigins');

const corsOptions = {
  origin: (origin, callback) => {
    // allow non-browser tools (no Origin header)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,            // <-- important for cookies
  optionsSuccessStatus: 200
};

module.exports = corsOptions;
