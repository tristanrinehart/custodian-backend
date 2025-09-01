// lib/time.js
const { zonedTimeToUtc } = require('date-fns-tz');

/**
 * Normalize a local wall-clock string by stripping any trailing 'Z' or numeric offset.
 * We want "2025-09-06T08:00" (no timezone info) so we can apply the *user's* tz.
 */
function normalizeLocalWallClock(localish) {
  if (!localish) return localish;
  // Remove trailing Z or ±HH:MM or ±HHMM or ±HH
  return String(localish).replace(/(?:Z|[+-]\d{2}(?::?\d{2})?)$/i, '');
}

/**
 * Convert "local time in tz" -> a real UTC Date.
 * Accepts "YYYY-MM-DDTHH:mm" (no seconds OK) or a fuller ISO string.
 */
function localInTzToUtc(localInput, tz) {
  if (!tz || typeof tz !== 'string') {
    throw new Error('Missing/invalid IANA time zone (tz).');
  }
  const clean = normalizeLocalWallClock(localInput);
  // Example: "2025-09-06T08:00" + "America/Los_Angeles" -> Date(2025-09-06T15:00:00.000Z)
  return zonedTimeToUtc(clean, tz);
}

/** Format a Date (assumed UTC) to ICS UTC form: YYYYMMDDTHHMMSSZ */
function toIcsUtc(dt) {
  // "2025-09-06T15:00:00.000Z" -> "20250906T150000Z"
  return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

module.exports = { localInTzToUtc, toIcsUtc, normalizeLocalWallClock };
