// backend/src/routes/assets.route.js (or similar)
const express = require("express");
const router = express.Router();

const verifyJWT = require('../middleware/verifyJWT');
const Task = require('../models/task.model');
const { buildIcsForTask } = require('../services/calendarIcs');

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
router.get('/:assetId/tasks/:taskId/ics', async (req, res) => {
  const { assetId, taskId } = req.params;
  const userId = req.user.id; // ✅ now defined

  try {
    const task = await Task.findOne({ _id: taskId, asset: assetId, userId }).lean();
    if (!task) return res.status(404).json({ message: 'Task not found', assetId, taskId });

    let ics = buildIcsForTask(task, { calendarName: 'Custodian' });
    if (ics && typeof ics !== 'string' && typeof ics.toString === 'function') ics = ics.toString();

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="task-${task._id}.ics"`);
    return res.send(ics);
  } catch (e) {
    console.error('[ICS route] unexpected error:', e);
    return res.status(500).json({ message: 'Failed to build ICS', error: e?.message || String(e) });
  }
});

// (Optional) Debug route also behind auth
router.get('/:assetId/tasks/:taskId/ics/__debug', async (req, res) => {
  const { assetId, taskId } = req.params;
  const userId = req.user.id;

  try {
    const task = await Task.findOne({ _id: taskId, asset: assetId, userId }).lean();
    if (!task) return res.status(404).json({ ok: false, message: 'Task not found', assetId, taskId, userId });

    let ics = buildIcsForTask(task, { calendarName: 'Custodian' });
    if (ics && typeof ics !== 'string' && typeof ics.toString === 'function') ics = ics.toString();

    const pick = (k) => (ics.match(new RegExp(`^${k}(?::|;).*$`, 'm')) || [null])[0];
    return res.json({
      ok: true, assetId, taskId, userId,
      preview: {
        summary: pick('SUMMARY'),
        dtstart: pick('DTSTART'),
        dtend: pick('DTEND'),
        rrule: pick('RRULE'),
        priority: pick('PRIORITY'),
        calname: pick('X-WR-CALNAME'),
      }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'Debug failed', error: e?.message || String(e) });
  }
});

module.exports = router;

/*
const express = require("express");
const router = express.Router();
const { buildIcsForTask } = require('../services/calendarIcs');
const Task = require('../models/task.model'); // adjust path

const verifyJWT = require('../middleware/verifyJWT');
const {
  // use one list handler that can also handle ?include=tasks:summary if you wire that up
  getAssets,            // or rename to listAssets if you prefer
  getAsset,             // optional
  createAsset,
  updateAsset,
  deleteAsset,
  assetsWithTasksSummary // if you want the ?include=tasks:summary path
} = require('./controllers/asset.controller.js');

const {
  getTasksForAsset,
  generateTasksForAsset
} = require('./controllers/task.controller');

// routes/assets.js (or wherever you mounted it)
// GET /api/assets/:assetId/tasks/:taskId/ics
router.get('/:assetId/tasks/:taskId/ics', async (req, res) => {
  const { assetId, taskId } = req.params;
  const userId = req.user?.id; // present if verifyJWT ran earlier in the chain

  try {
    console.log('[ICS route]', { assetId, taskId, userId });

    // 🔒 tighten lookup: the task must belong to this user & asset
    const query = { _id: taskId, asset: assetId };
    if (userId) query.userId = userId;

    const task = await Task.findOne(query).lean();
    if (!task) {
      console.warn('[ICS route] task not found', query);
      return res.status(404).json({ message: 'Task not found', query });
    }

    // 🧭 sanity: is the builder a function?
    if (typeof buildIcsForTask !== 'function') {
      console.error('[ICS route] buildIcsForTask is not a function:', buildIcsForTask);
      return res.status(500).json({
        message: 'ICS builder misconfigured',
        hint: "Check services/calendarIcs export. It should export { buildIcsForTask }."
      });
    }

    // 🏗️ build ICS
    let ics;
    try {
      ics = buildIcsForTask(task, { calendarName: 'Custodian' });
      // Some builders return an object (e.g., ical-generator instance)
      if (ics && typeof ics !== 'string' && typeof ics.toString === 'function') {
        ics = ics.toString();
      }
      if (typeof ics !== 'string' || !/^BEGIN:VCALENDAR/m.test(ics)) {
        throw new Error('ICS builder did not return a VCALENDAR string');
      }
    } catch (e) {
      console.error('[ICS route] buildIcsForTask failed:', e);
      const payload = {
        message: 'buildIcsForTask failed',
        error: e?.message || String(e),
        taskShape: {
          _id: task._id,
          taskName: task.taskName,
          frequency: task.frequency,
          duration: task.duration,
          priority: task.priority,
          description: !!task.description
        }
      };
      // In dev, return JSON to help you fix quickly; in prod, keep generic
      if (process.env.NODE_ENV !== 'production') {
        return res.status(500).json(payload);
      }
      return res.status(500).send('Failed to build ICS');
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="task-${task._id}.ics"`);
    return res.send(ics);
  } catch (e) {
    console.error('[ICS route] unexpected error:', e);
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ message: 'Unexpected ICS error', error: e?.message || String(e) });
    }
    return res.status(500).send('Failed to build ICS');
  }
});


router.use(verifyJWT);


// router.get('/', getAssets); //replaced with task summary support

router.get('/', assetsWithTasksSummary);

// CRUD
router.post('/', createAsset);
router.patch('/', updateAsset);
router.delete('/', deleteAsset);

// Tasks (place BEFORE any param routes like "/:id")
router.get('/:assetId/tasks', getTasksForAsset);
router.post('/:assetId/tasks/generate', generateTasksForAsset);



module.exports = router;
*/