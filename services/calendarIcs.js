// backend/src/services/calendarIcs.js

/* ---------- helpers ---------- */

function parseDurationMinutes(val) {
  if (val == null) return 60; // default 60min
  if (typeof val === 'number' && isFinite(val)) return Math.max(1, Math.round(val));
  const s = String(val).toLowerCase();
  const m = s.match(/(\d+(?:\.\d+)?)\s*(min|mins|minute|minutes|hr|hrs|hour|hours|h|m)\b/);
  if (!m) {
    const n = parseFloat(s);
    return isFinite(n) && n > 0 ? Math.round(n) : 60;
  }
  const num = parseFloat(m[1]);
  const unit = m[2];
  if (/^m/.test(unit)) return Math.max(1, Math.round(num));
  if (/^h/.test(unit)) return Math.max(1, Math.round(num * 60));
  return 60;
}

// Return a structured frequency so we can build RRULE with Saturday constraints.
function parseFrequency(str) {
  const s = String(str || '').trim().toLowerCase();
  if (!s) return { freq: null, interval: null, add: { months: 1 } };

  if (/\bquarter(ly)?\b|\bqtr\b/.test(s)) return { freq: 'MONTHLY', interval: 3, add: { months: 3 } };
  if (s.includes('daily'))   return { freq: 'DAILY',   interval: 1, add: { days: 1 } };
  if (s.includes('weekly'))  return { freq: 'WEEKLY',  interval: 1, add: { weeks: 1 } };
  if (s.includes('monthly')) return { freq: 'MONTHLY', interval: 1, add: { months: 1 } };
  if (s.includes('yearly') || s.includes('annually') || s.includes('annual'))
                             return { freq: 'YEARLY',  interval: 1, add: { years: 1 } };

  const m = s.match(/(?:every\s*)?(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months|year|years)\b/);
  if (m) {
    const n = Math.max(1, Math.round(parseFloat(m[1])));
    const unit = m[2];
    if (unit.startsWith('day'))   return { freq: 'DAILY',   interval: n, add: { days: n } };
    if (unit.startsWith('week'))  return { freq: 'WEEKLY',  interval: n, add: { weeks: n } };
    if (unit.startsWith('month')) return { freq: 'MONTHLY', interval: n, add: { months: n } };
    if (unit.startsWith('year'))  return { freq: 'YEARLY',  interval: n, add: { years: n } };
  }

  // fallback: one-time-ish anchor ~+1 month
  return { freq: null, interval: null, add: { months: 1 } };
}

function addInterval(base, add) {
  const d = new Date(base.getTime());
  if (add.years)  d.setFullYear(d.getFullYear() + add.years);
  if (add.months) {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + add.months);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
  }
  if (add.weeks)  d.setDate(d.getDate() + add.weeks * 7);
  if (add.days)   d.setDate(d.getDate() + add.days);
  return d;
}

function saturdayOnOrBefore(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay(); // 0..6 (Sun..Sat)
  const delta = (dow - 6 + 7) % 7; // 0 if Sat
  d.setDate(d.getDate() - delta);
  return d;
}

// Determine the ordinal Saturday of a given date within its month.
// Returns 1..4 normally; returns -1 if it is the 5th Saturday (treat as "last Saturday").
function saturdaySetPos(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const day = date.getDate();

  // find all Saturdays in the month
  const sats = [];
  let d = new Date(y, m, 1);
  while (d.getMonth() === m) {
    if (d.getDay() === 6) sats.push(d.getDate());
    d.setDate(d.getDate() + 1);
  }

  const idx = sats.indexOf(day); // 0-based
  if (idx === -1) {
    // Should not happen (date should be Saturday), but fallback to last
    return -1;
  }
  const nth = idx + 1; // 1..(4 or 5)
  return nth >= 5 ? -1 : nth; // if 5th, use "last Saturday"
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function fmtUTC(dt) {
  return dt.getUTCFullYear()
    + pad2(dt.getUTCMonth() + 1)
    + pad2(dt.getUTCDate())
    + 'T'
    + pad2(dt.getUTCHours())
    + pad2(dt.getUTCMinutes())
    + pad2(dt.getUTCSeconds())
    + 'Z';
}

function escapeText(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function listify(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === 'string') {
    return val.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function mapPriorityToIcs(p) {
  const n = Number(p);
  if (n === 1) return 2; // critical
  if (n === 2) return 5; // recommended
  if (n === 3) return 8; // optional
  return 5; // default
}

/* ---------- main builder ---------- */

function buildIcsForTask(task, opts = {}) {
  const calendarName = opts.calendarName || 'Custodian';
  const now = new Date();

  const summary = task?.taskName || task?.name || 'Task';
  const durationMin = parseDurationMinutes(task?.duration);
  const { freq, interval, add } = parseFrequency(task?.frequency);

  // Anchor first event: Saturday on/before target, at 8:00 AM local
  const target = addInterval(now, add || { months: 1 });
  const startLocal = saturdayOnOrBefore(target);
  startLocal.setHours(8, 0, 0, 0);
  const endLocal = new Date(startLocal.getTime() + durationMin * 60 * 1000);

  const dtstamp = fmtUTC(now);
  const dtstart = fmtUTC(startLocal);
  const dtend   = fmtUTC(endLocal);

  const uid = `task-${task?._id || task?.id || Math.random().toString(36).slice(2)}@custodian`;
  const icsPriority = mapPriorityToIcs(task?.priority);

  // Build DESCRIPTION with description + steps + tools (+ human hints)
  const descParts = [];
  if (typeof task?.description === 'string' && task.description.trim()) {
    descParts.push(task.description.trim());
  }
  const steps = listify(task?.steps);
  if (steps.length) {
    const stepsBlock = 'Steps:\n' + steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
    descParts.push(stepsBlock);
  }
  const tools = listify(task?.tools);
  if (tools.length) {
    const toolsBlock = 'Tools:\n' + tools.map(t => `- ${t}`).join('\n');
    descParts.push(toolsBlock);
  }
  if (task?.frequency) descParts.push(`Frequency: ${String(task.frequency)}`);
  if (task?.duration != null) descParts.push(`Duration: ${String(task.duration)}`);
  const fullDescription = descParts.join('\n\n');

  // Build RRULE that **always** occurs on Saturdays.
  let rrule = null;
  if (freq && interval) {
    rrule = `FREQ=${freq};INTERVAL=${interval}`;
    if (freq === 'DAILY' || freq === 'WEEKLY') {
      // Filter to Saturdays only
      rrule += ';BYDAY=SA';
    } else if (freq === 'MONTHLY' || freq === 'YEARLY') {
      // Stay on the same ordinal Saturday each recurrence (or last Saturday if 5th)
      const setpos = saturdaySetPos(startLocal);
      rrule += `;BYDAY=SA;BYSETPOS=${setpos}`;
    }
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${escapeText(calendarName)}//EN`,
    `X-WR-CALNAME:${escapeText('Easy Upkeep')}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeText(summary)}`,
    `PRIORITY:${icsPriority}`
  ];
  if (fullDescription) lines.push(`DESCRIPTION:${escapeText(fullDescription)}`);
  if (rrule)           lines.push(`RRULE:${rrule}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

module.exports = { buildIcsForTask };
