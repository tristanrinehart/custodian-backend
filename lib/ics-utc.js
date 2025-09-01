// lib/ics-utc.js
const crypto = require('crypto');
const { toIcsUtc } = require('./time');

/** Escape text per RFC 5545 (\, \; \, and \n) */
function esc(v) {
  return String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold lines at ~75 chars with CRLF + space continuation (simple byte-safe for ASCII) */
function fold(line) {
  const MAX = 75;
  if (line.length <= MAX) return line;
  let out = '';
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i === 0 ? MAX : i + MAX - i);
    out += (i ? '\r\n ' : '') + chunk.slice(0, MAX);
    i += MAX;
  }
  return out;
}

/**
 * Build a single VEVENT calendar in UTC.
 * Pass startUtc/endUtc as Date objects (UTC), everything else is strings.
 */
function buildIcsUtc({ title, description, location, startUtc, endUtc, uid, url, organizerEmail }) {
  const now = new Date();
  const uidFinal =
    uid ||
    `${crypto.randomBytes(8).toString('hex')}@custodian.app`; // any stable domain is fine

  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Custodian//App//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uidFinal}`,
    `DTSTAMP:${toIcsUtc(now)}`,             // generation timestamp in UTC
    `DTSTART:${toIcsUtc(startUtc)}`,        // event start in UTC (Z)
    `DTEND:${toIcsUtc(endUtc)}`,            // event end in UTC (Z)
    `SUMMARY:${esc(title)}`,
    description ? `DESCRIPTION:${esc(description)}` : null,
    location ? `LOCATION:${esc(location)}` : null,
    url ? `URL:${esc(url)}` : null,
    organizerEmail ? `ORGANIZER:mailto:${esc(organizerEmail)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  // Fold and ensure CRLF line endings (ICS requires CRLF)
  return lines.map(fold).join('\r\n') + '\r\n';
}

module.exports = { buildIcsUtc };
