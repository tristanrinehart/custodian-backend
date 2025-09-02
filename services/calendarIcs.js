// services/calendarIcs.js
'use strict';

const crypto = require('crypto');

/* ---------- small helpers ---------- */
function esc(v) {
  return String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}
function toIcsUtc(date) {
  // YYYYMMDDTHHMMSSZ
  const s = date.toISOString();
  return s.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function fold75(line) {
  const MAX = 75;
  if (line.length <= MAX) return line;
  let out = '';
  for (let i = 0; i < line.length; i += MAX) {
    out += (i ? '\r\n ' : '') + line.slice(i, i + MAX);
  }
  return out;
}
function toIcsPriority(p) {
  const n = Number(p);
  if (n === 1) return 1;  // critical -> highest
  if (n === 2) return 5;  // recommended -> medium
  if (n === 3) return 9;  // optional -> lowest
  return 0;               // 0 = undefined per RFC 5545
}
function parseDurationMinutes(d) {
  if (typeof d === 'number' && Number.isFinite(d)) return Math.max(1, Math.round(d));
  if (typeof d === 'string') {
    const m = d.match(/(\d+)/);
    if (m) return Math.max(1, parseInt(m[1], 10));
  }
  return 60; // default 1 hour
}

/* ---------- try to load date-fns-tz (works in CJS/ESM) ---------- */
let zonedTimeToUtc = null;
try {
  const mod = require('date-fns-tz'); // CJS export shape varies by bundler
  zonedTimeToUtc =
    (mod && typeof mod.zonedTimeToUtc === 'function' && mod.zonedTimeToUtc) ||
    (mod && mod.default && typeof mod.default.zonedTimeToUtc === 'function' && mod.default.zonedTimeToUtc) ||
    null;
} catch (_) {
  zonedTimeToUtc = null;
}

/* ---------- fallback: convert "YYYY-MM-DDTHH:mm" in IANA tz -> UTC Date using Intl ---------- */
function partsToObj(parts) {
  const m = {};
  for (const p of parts) if (p.type !== 'literal') m[p.type] = p.value;
  return {
    year: +m.year,
    month: +m.month,
    day: +m.day,
    hour: +m.hour,
    minute: +m.minute,
    second: +(m.second || 0),
  };
}
function fallbackZonedTimeToUtc(wallISO, tz) {
  // Treat the wall time digits as if they were UTC to get a base, then correct using the tz offset.
  const baseUtc = new Date(wallISO + ':00.000Z');
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const obs = partsToObj(fmt.formatToParts(baseUtc));

  const [dateStr, timeStr] = wallISO.split('T');
  const [Y, M, D] = dateStr.split('-').map(Number);
  const [h, m]   = timeStr.split(':').map(Number);

  const desiredMs  = Date.UTC(Y, M - 1, D, h, m, 0);
  const observedMs = Date.UTC(obs.year, obs.month - 1, obs.day, obs.hour, obs.minute, obs.second);
  const diff = observedMs - desiredMs;

  return new Date(baseUtc.getTime() - diff);
}
const toUtc = (wallISO, tz) =>
  (typeof zonedTimeToUtc === 'function') ? zonedTimeToUtc(wallISO, tz) : fallbackZonedTimeToUtc(wallISO, tz);

/**
 * Build an ICS file with a single VEVENT that starts at 08:00 in the user's IANA timezone.
 * - If task.date exists (Date or ISO), it uses that calendar day.
 * - Otherwise, it anchors to the next Saturday.
 * - Emits DTSTART/DTEND in UTC (Z) so all clients render correctly in local time.
 *
 * @param {Object} task
 * @param {string} [task.taskName]
 * @param {string|number} [task.duration]  // minutes or string like "45 min"
 * @param {1|2|3|number} [task.priority]   // 1,2,3 map to 1,5,9
 * @param {string} [task.description]
 * @param {string|Date} [task.date]        // optional calendar day (local wall date)
 *
 * @param {Object} [opts]
 * @param {string} [opts.calendarName='Easy Upkeep AI']
 * @param {string} [opts.tz]               // required; e.g., "America/Los_Angeles"
 *
 * @returns {string} VCALENDAR text
 */
function buildIcsForTask(task, opts = {}) {
  const calendarName = opts.calendarName || 'Easy Upkeep AI';
  const tz = opts.tz || process.env.DEFAULT_TZ || null;
  if (!tz) throw new Error('Missing timezone (tz). Pass ?tz=America/Los_Angeles or set DEFAULT_TZ');

  const title = task?.taskName || 'Task';
  const description = task?.description || '';
  const durationMin = parseDurationMinutes(task?.duration);
  const priority = toIcsPriority(task?.priority);

  // --- Determine the anchor calendar day ---
  let anchor;
  if (task?.date) {
    const d = (task.date instanceof Date) ? task.date : new Date(task.date);
    if (!Number.isNaN(d.getTime())) {
      anchor = new Date(d.getFullYear(), d.getMonth(), d.getDate()); // Y-M-D at midnight (system tz)
    }
  }
  if (!anchor) {
    // Fallback: next Saturday
    const now = new Date();
    const dow = now.getDay();                  // 0..6 (Sun..Sat)
    const add = (6 - dow + 7) % 7;            // days to Saturday
    anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add);
  }

  const yyyy = anchor.getFullYear();
  const mm = String(anchor.getMonth() + 1).padStart(2, '0');
  const dd = String(anchor.getDate()).padStart(2, '0');
  const wall = `${yyyy}-${mm}-${dd}T08:00`; // 8:00 AM local in user's tz

  // Convert "08:00 in tz" => UTC instants
  const startUtc = toUtc(wall, tz);
  const endUtc = new Date(startUtc.getTime() + durationMin * 60 * 1000);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${esc(calendarName)}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calendarName)}`,
    `X-WR-TIMEZONE:${esc(tz)}`,

    'BEGIN:VEVENT',
    `UID:${(crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex'))}@easy-upkeep-ai`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(startUtc)}`,
    `DTEND:${toIcsUtc(endUtc)}`,
    `SUMMARY:${esc(title)}`,
    description ? `DESCRIPTION:${esc(description)}` : null,
    priority ? `PRIORITY:${priority}` : null,
    'END:VEVENT',

    'END:VCALENDAR'
  ].filter(Boolean);

  return lines.map(fold75).join('\r\n') + '\r\n';
}

module.exports = { buildIcsForTask };
