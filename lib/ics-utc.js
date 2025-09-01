// lib/ics-utc.js
const crypto = require('crypto');
const { toIcsUtc } = require('./time');

function esc(v) {
  return String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function fold(line) {
  const MAX = 75;
  if (line.length <= MAX) return line;
  let out = '';
  for (let i = 0; i < line.length; i += MAX) {
    out += (i ? '\r\n ' : '') + line.slice(i, i + MAX);
  }
  return out;
}

function buildIcsUtc({ title, description, location, startUtc, endUtc, uid, url, organizerEmail }) {
  if (!(startUtc instanceof Date) || isNaN(startUtc)) {
    throw new Error('buildIcsUtc: startUtc must be a valid Date');
  }
  if (!(endUtc instanceof Date) || isNaN(endUtc)) {
    throw new Error('buildIcsUtc: endUtc must be a valid Date');
  }

  const now = new Date();
  const uidFinal = uid || `${crypto.randomBytes(8).toString('hex')}@custodian.app`;

  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Custodian//App//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uidFinal}`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(startUtc)}`,
    `DTEND:${toIcsUtc(endUtc)}`,
    `SUMMARY:${esc(title)}`,
    description ? `DESCRIPTION:${esc(description)}` : null,
    location ? `LOCATION:${esc(location)}` : null,
    url ? `URL:${esc(url)}` : null,
    organizerEmail ? `ORGANIZER:mailto:${esc(organizerEmail)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.map(fold).join('\r\n') + '\r\n';
}

module.exports = { buildIcsUtc };
