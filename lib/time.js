// lib/time.js
const { zonedTimeToUtc } = require('date-fns-tz');

/**
 * Convert an ISO-like local date-time (no offset) in tz -> UTC Date.
 * Example: localInTzToUtc("2025-09-06T08:00", "America/Los_Angeles")
 */
function localInTzToUtc(localISO, tz) {
  // Accept either "YYYY-MM-DDTHH:mm" or full ISO; let date-fns-tz parse it in tz.
  return zonedTimeToUtc(localISO, tz);
}

/** Format a Date (assumed UTC) to ICS UTC form: YYYYMMDDTHHMMSSZ */
function toIcsUtc(dt) {
  // "2025-09-06T15:00:00.000Z" -> "20250906T150000Z"
  return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

module.exports = { localInTzToUtc, toIcsUtc };
