// backend/src/routes/controllers/task.controller.js
const Asset = require('../../models/asset.model');
const Task = require('../../models/task.model');
const { promptHash } = require('../../utils/hash');
const { callOpenAIForTasks } = require('../../services/openaiTasks.service');

// GET /api/assets/:assetId/tasks
async function getTasksForAsset(req, res) {
  try {
    const userId = req.user.id;
    const { assetId } = req.params;

    const asset = await Asset.findOne({ _id: assetId, userId });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const tasks = await Task.find({ asset: asset._id, userId }).sort({ priority: 1, createdAt: 1, _id: 1 }).lean();
    return res.json({ assetId: asset._id, tasksStatus: asset.tasksStatus, tasks });
  } catch (err) {
    console.error('getTasksForAsset error', err);
    return res.status(500).json({ message: 'Failed to fetch tasks' });
  }
}

// POST /api/assets/:assetId/tasks/generate
// body: { prompt?: string }
async function generateTasksForAsset(req, res) {
  const session = await Asset.startSession();
  session.startTransaction();
  try {
    const userId = req.user.id;
    const { assetId } = req.params;
    const { prompt } = req.body || {};

    const asset = await Asset.findOne({ _id: assetId, userId }).session(session);
    if (!asset) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Asset not found' });
    }

    const hash = promptHash({ prompt, assetDoc: asset, version: asset.tasksVersion || 1 });

    // Idempotent fast-path
    if (asset.tasksStatus === 'ready' && asset.tasksPromptHash === hash) {
      const tasks = await Task.find({ asset: asset._id, userId }).sort({ createdAt: 1 }).lean();
      await session.commitTransaction();
      return res.json({ source: 'cache', tasksStatus: 'ready', tasks });
    }

    // Optimistic lock: set pending unless already pending
    const updated = await Asset.findOneAndUpdate(
      { _id: assetId, userId, tasksStatus: { $ne: 'pending' } },
      { $set: { tasksStatus: 'pending' } },
      { new: true, session }
    );

    if (!updated) {
      await session.abortTransaction();
      return res.status(202).json({ message: 'Tasks generation in progress' });
    }

    // Don’t hold the transaction across network I/O
    await session.commitTransaction();
    session.endSession();

    // Call OpenAI
    const plan = await callOpenAIForTasks({ prompt, asset: asset.toObject() });

    // Overwrite tasks
    await Task.deleteMany({ asset: asset._id, userId });
    if (plan.length) {
      const docs = plan.map(t => ({ ...t, asset: asset._id, userId }));
      await Task.insertMany(docs);
    }

    await Asset.updateOne(
      { _id: asset._id, userId },
      { $set: { tasksStatus: 'ready', tasksUpdatedAt: new Date(), tasksPromptHash: hash } }
    );

    const tasks = await Task.find({ asset: asset._id, userId }).sort({ createdAt: 1 }).lean();
    return res.json({ source: 'openai', tasksStatus: 'ready', tasks });
  } catch (err) {
    console.error('generateTasksForAsset error', err);
    try {
      await Asset.updateOne(
        { _id: req.params.assetId, userId: req.user.id },
        { $set: { tasksStatus: 'error' } }
      );
    } catch (_) {}
    try { await session.abortTransaction(); } catch (_) {}
    try { session.endSession(); } catch (_) {}
    return res.status(502).json({ message: 'Failed to generate tasks', error: err?.message });
  }
}

module.exports = { getTasksForAsset, generateTasksForAsset };
