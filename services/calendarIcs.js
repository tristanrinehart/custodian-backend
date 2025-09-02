// services/calendarIcs.js
'use strict';

const crypto = require('crypto');

/* ---------------- helpers ---------------- */
function esc(v) {
  return String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n'); // ICS newlines
}
function toIcsUtc(date) {
  // YYYYMMDDTHHMMSSZ
  const s = date.toISOString();
  return s.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function fold75(line) {
  // RFC5545 line folding: 75 octets (approx chars), subsequent lines start with a space
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
  if (n === 1) return 1; // critical -> highest
  if (n === 2) return 5; // recommended -> medium
  if (n === 3) return 9; // optional -> lowest
  return 0; // undefined
}
function parseDurationMinutes(d) {
  if (typeof d === 'number' && Number.isFinite(d)) return Math.max(1, Math.round(d));
  if (typeof d === 'string') {
    const m = d.match(/(\d+)/);
    if (m) return Math.max(1, parseInt(m[1], 10));
  }
  return 60;
}
function toList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
  // allow comma/semicolon/newline separated strings
  return String(val)
    .split(/[,;\n]+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

/* ---------- try to load date-fns-tz (works in CJS/ESM) ---------- */
let zonedTimeToUtc = null;
try {
  const mod = require('date-fns-tz');
  zonedTimeToUtc =
    (mod && typeof mod.zonedTimeToUtc === 'function' && mod.zonedTimeToUtc) ||
    (mod && mod.default && typeof mod.default.zonedTimeToUtc === 'function' && mod.default.zonedTimeToUtc) ||
    null;
} catch (_) { zonedTimeToUtc = null; }

/* ---------- fallback: convert "YYYY-MM-DDTHH:mm" in IANA tz -> UTC Date using Intl ---------- */
function partsToObj(parts) {
  const m = {};
  for (const p of parts) if (p.type !== 'literal') m[p.type] = p.value;
  return {
    year: +m.year, month: +m.month, day: +m.day,
    hour: +m.hour, minute: +m.minute, second: +(m.second || 0),
  };
}
function fallbackZonedTimeToUtc(wallISO, tz) {
  const baseUtc = new Date(wallISO + ':00.000Z');
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
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
 * Build an ICS file with a single VEVENT at 08:00 in the user's IANA timezone.
 * Includes Steps, Tools, and Materials in DESCRIPTION.
 *
 * @param {Object} task
 * @param {string}  [task.taskName]
 * @param {string}  [task.description]
 * @param {string|number} [task.duration]     // minutes or "45 min"
 * @param {1|2|3|number} [task.priority]     // 1,2,3 => 1,5,9
 * @param {string[]|string} [task.steps]
 * @param {string[]|string} [task.tools]
 * @param {string[]|string} [task.materials]  // or "supplies" (fallback)
 * @param {string[]|string} [task.supplies]
 * @param {string|Date}     [task.date]       // optional, calendar day
 * @param {string}          [task.location]   // optional
 * @param {string}          [task.url]        // optional
 *
 * @param {Object} opts
 * @param {string} [opts.calendarName='Easy Upkeep AI']
 * @param {string} opts.tz  // e.g., "America/Los_Angeles"
 */
function buildIcsForTask(task, opts = {}) {
  const calendarName = opts.calendarName || 'Easy Upkeep AI';
  const tz = opts.tz || process.env.DEFAULT_TZ || null;
  if (!tz) throw new Error('Missing timezone (tz). Pass ?tz=America/Los_Angeles or set DEFAULT_TZ');

  const title       = task?.taskName || 'Task';
  const durationMin = parseDurationMinutes(task?.duration);
  const priority    = toIcsPriority(task?.priority);
  const location    = task?.location || '';
  const url         = task?.url || '';

  // normalize lists
  const steps     = toList(task?.steps);
  const tools     = toList(task?.tools);
  const materials = toList(task?.materials || task?.supplies);

  // Build a rich, readable DESCRIPTION
  const descParts = [];
  if (task?.description) descParts.push(String(task.description).trim());

  if (steps.length) {
    descParts.push('','Steps:');
    steps.forEach((s, i) => descParts.push(`${i + 1}. ${s}`));
  }
  if (tools.length) {
    descParts.push('','Tools:');
    tools.forEach(t => descParts.push(`• ${t}`));
  }
  if (materials.length) {
    descParts.push('','Materials:');
    materials.forEach(m => descParts.push(`• ${m}`));
  }
  const description = descParts.join('\n').trim();

  // --- Determine the anchor calendar day ---
  let anchor;
  if (task?.date) {
    const d = (task.date instanceof Date) ? task.date : new Date(task.date);
    if (!Number.isNaN(d.getTime())) {
      anchor = new Date(d.getFullYear(), d.getMonth(), d.getDate()); // local midnight
    }
  }
  if (!anchor) {
    // Fallback: next Saturday
    const now = new Date();
    const dow = now.getDay();            // 0..6 (Sun..Sat)
    const add = (6 - dow + 7) % 7;       // days to Saturday
    anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add);
  }

  const yyyy = anchor.getFullYear();
  const mm   = String(anchor.getMonth() + 1).padStart(2, '0');
  const dd   = String(anchor.getDate()).padStart(2, '0');
  const wall = `${yyyy}-${mm}-${dd}T08:00`; // 8:00 AM local time in user's tz

  const startUtc = toUtc(wall, tz);
  const endUtc   = new Date(startUtc.getTime() + durationMin * 60 * 1000);

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
    location ?   `LOCATION:${esc(location)}`       : null,
    url ?        `URL:${esc(url)}`                 : null,
    priority ?   `PRIORITY:${priority}`            : null,
    // Optional custom props (handy for debugging/exports)
    // steps.length ?     `X-EUA-STEPS:${esc(steps.join(' | '))}`     : null,
    // tools.length ?     `X-EUA-TOOLS:${esc(tools.join(' | '))}`     : null,
    // materials.length ? `X-EUA-MATERIALS:${esc(materials.join(' | '))}` : null,
    'END:VEVENT',

    'END:VCALENDAR'
  ].filter(Boolean);

  return lines.map(fold75).join('\r\n') + '\r\n';
}

module.exports = { buildIcsForTask };
