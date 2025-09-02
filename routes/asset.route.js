// backend/src/routes/assets.route.js (or similar)
const express = require("express");
const router = express.Router();
const verifyJWT = require('../middleware/verifyJWT');
const Task = require('../models/task.model');
const { buildIcsForTask } = require('../services/calendarIcs');
const eventIcs = require('./controllers/event-ics.controller');

const {
  assetsWithTasksSummary, getAssets, getAsset, createAsset, updateAsset, deleteAsset
} = require('./controllers/asset.controller.js');

const { getTasksForAsset, generateTasksForAsset } = require('./controllers/task.controller');



// 🔐 everything below here sets req.user (including ICS)
router.use(verifyJWT);

// Public (optional): list/summary
router.get('/', assetsWithTasksSummary);

// CRUD
router.post('/', createAsset);
router.patch('/', updateAsset);
router.delete('/', deleteAsset);

// Tasks
router.get('/:assetId/tasks', getTasksForAsset);
router.post('/:assetId/tasks/generate', generateTasksForAsset);

// 🔐 ICS route (now behind verifyJWT so req.user.id is set)
async function loadTaskOr404(assetId, taskId, req, res) {
  // Example only; wire to your persistence
  const task = await req.services.tasks.getById(assetId, taskId); // ← your impl
  if (!task) {
    res.status(404).json({ error: 'Not found' });
    return null;
  }
  return task;
}

router.post('/events/ical', eventIcs);

router.get('/:assetId/tasks/:taskId/ics', async (req, res) => {
  const { assetId, taskId } = req.params;
  const userId = req.user?.id || null;

  // tz precedence
  const tz =
    (req.query.tz && String(req.query.tz)) ||
    req.headers['x-timezone'] ||
    (req.user && req.user.timeZone) ||
    null;

  try {
    // 🔒 Scope to asset + user (prevent cross-tenant leaks)
    const query = { _id: taskId, asset: assetId };
    if (userId) query.userId = userId;

    const task = await Task.findOne(query)
      // Builder only needs these (no `date` exists in your Task schema)
      .select('_id taskName description duration priority frequency asset userId')
      .lean();

    if (!task) {
      return res.status(404).json({ error: 'Task not found', query });
    }

    // 🏗 Build ICS
    let ics;
    try {
      ics = buildIcsForTask(task, { calendarName: 'Custodian', tz });
      if (ics && typeof ics !== 'string' && typeof ics.toString === 'function') {
        ics = ics.toString();
      }
      if (typeof ics !== 'string' || !/^BEGIN:VCALENDAR/m.test(ics)) {
        throw new Error('ICS builder returned invalid output');
      }
    } catch (e) {
      // Return useful info in dev so you can see *why* it failed
      if (process.env.NODE_ENV !== 'production') {
        return res.status(500).json({
          error: 'buildIcsForTask failed',
          message: e?.message || String(e),
          stack: e?.stack,
          taskShape: {
            _id: task._id,
            taskName: task.taskName,
            frequency: task.frequency,
            duration: task.duration,
            priority: task.priority,
          },
          tz,
        });
      }
      return res.status(500).json({ error: 'Failed to build ICS' });
    }

    res
      .status(200)
      .type('text/calendar; charset=utf-8')
      .set('Content-Disposition', `attachment; filename=task-${task._id}.ics`)
      .send(ics);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ error: err?.message || String(err), tz, assetId, taskId });
    }
    res.status(500).json({ error: 'Failed to generate ICS' });
  }
});

module.exports = router;
