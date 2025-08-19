//AI-generated
// middleware/rateLimit.js
import rateLimit from "express-rate-limit";

export const generateTasksLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 10,                    // 10 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});
