// routes/controllers/event-ics.controller.js
const { localInTzToUtc } = require('../../lib/time');
const { buildIcsUtc } = require('../../lib/ics-utc');

module.exports = async function eventIcs(req, res, next) {
  try {
    const { title, description, location, startLocal, endLocal, tz } = req.body || {};
    if (!title || !startLocal || !endLocal || !tz) {
      return res.status(400).json({ message: 'Missing title/startLocal/endLocal/tz' });
    }

    // Convert local wall-clock -> UTC
    const startUtc = localInTzToUtc(startLocal, tz);
    const endUtc   = localInTzToUtc(endLocal, tz);

    // DEBUG once: verify the UTC looks right in logs
    if (process.env.LOG_ICS === 'true') {
      console.log('[ICS DEBUG]', {
        tz,
        startLocal,
        endLocal,
        startUtcISO: startUtc.toISOString(),
        endUtcISO: endUtc.toISOString(),
      });
      // For 2025-09-06 08:00 America/Los_Angeles, you should see 15:00:00.000Z
    }

    const ics = buildIcsUtc({
      title,
      description,
      location,
      startUtc,
      endUtc,
    });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=event.ics');
    res.setHeader('Cache-Control', 'no-store');
    res.send(ics);
  } catch (err) {
    next(err);
  }
};
