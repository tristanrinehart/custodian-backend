// routes/controllers/event-ics.controller.js
const { localInTzToUtc } = require('../../lib/time');
const { buildIcsUtc } = require('../../lib/ics-utc');

/**
 * POST /api/events/ical
 * Body:
 *  {
 *    "title": "Custodian Check-in",
 *    "description": "Weekly sync",
 *    "location": "Zoom",
 *    "startLocal": "2025-09-06T08:00",
 *    "endLocal":   "2025-09-06T09:00",
 *    "tz": "America/Los_Angeles"
 *  }
 */
module.exports = async function eventIcs(req, res, next) {
  try {
    const { title, description, location, startLocal, endLocal, tz } = req.body || {};
    if (!title || !startLocal || !endLocal || !tz) {
      return res.status(400).json({ message: 'Missing title/startLocal/endLocal/tz' });
    }

    const startUtc = localInTzToUtc(startLocal, tz); // Date in UTC
    const endUtc = localInTzToUtc(endLocal, tz);

    const ics = buildIcsUtc({
      title,
      description,
      location,
      startUtc,
      endUtc,
      // uid/url/organizerEmail optional:
      // uid: `event-${id}@custodian.app`,
      // url: `https://custodian-frontend.onrender.com/events/${id}`,
      // organizerEmail: 'noreply@custodian.app',
    });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=event.ics`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(ics);
  } catch (err) {
    next(err);
  }
};
