const Asset = require('../../models/asset.model');
const Task = require('../../models/task.model');

// GET /api/assets
// ?include=tasks:summary to attach a small tasks projection
async function assetsWithTasksSummary(req, res) {
  try {
    const userId = req.user.id;
    const include = String(req.query.include || '').toLowerCase();

    if (include !== 'tasks:summary') {
      const assets = await Asset.find({ userId }).sort({ createdAt: -1 }).lean();
      return res.json(assets);
    }

    const pipeline = [
      { $match: { userId } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'tasks',
          localField: '_id',
          foreignField: 'asset',
          as: 'tasks'
        }
      },
      {
        $addFields: {
          tasks: {
            $map: {
              input: '$tasks',
              as: 't',
              in: { taskName: '$$t.taskName', priority: '$$t.priority' }
            }
          }
        }
      },
      {
        $project: {
          userId: 1,
          assetName: 1,
          assetType: 1,
          assetSubType: 1,
          manufacturer: 1,
          modelNumber: 1,
          year: 1,
          metadata: 1,
          tasksStatus: 1,
          tasksUpdatedAt: 1,
          tasksVersion: 1,
          tasks: 1
        }
      }
    ];

    const assets = await Asset.aggregate(pipeline);
    return res.json(assets);
  } catch (err) {
    console.error('assetsWithTasksSummary error', err);
    return res.status(500).json({ message: 'Failed to list assets' });
  }
}

// Optional: lean list (no tasks)
async function getAssets(req, res) {
  try {
    const userId = req.user.id;
    const assets = await Asset.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json(assets);
  } catch (err) {
    console.error('getAssets error', err);
    return res.status(500).json({ message: 'Failed to list assets' });
  }
}

// Optional: GET /api/assets/:id
async function getAsset(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const asset = await Asset.findOne({ _id: id, userId }).lean();
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    return res.json(asset);
  } catch (err) {
    console.error('getAsset error', err);
    return res.status(500).json({ message: 'Failed to get asset' });
  }
}

// POST /api/assets
async function createAsset(req, res) {
  try {
    const userId = req.user.id;
    const payload = { ...req.body, userId };
    if (!payload.tasksStatus) payload.tasksStatus = 'none';
    if (!payload.tasksVersion) payload.tasksVersion = 1;
    const created = await Asset.create(payload);
    return res.status(201).json(created);
  } catch (err) {
    console.error('createAsset error', err);
    return res.status(400).json({ message: 'Failed to create asset', error: err?.message });
  }
}

// PATCH /api/assets  (body: { _id, ...updates })
async function updateAsset(req, res) {
  try {
    const userId = req.user.id;
    const { _id, ...updates } = req.body || {};
    if (!_id) return res.status(400).json({ message: '_id is required' });
    delete updates.userId;

    const updated = await Asset.findOneAndUpdate(
      { _id, userId },
      { $set: updates },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: 'Asset not found' });
    return res.json(updated);
  } catch (err) {
    console.error('updateAsset error', err);
    return res.status(400).json({ message: 'Failed to update asset', error: err?.message });
  }
}

// DELETE /api/assets  (body: { _id })
async function deleteAsset(req, res) {
  try {
    const userId = req.user.id;
    const { _id } = req.body || {};
    if (!_id) return res.status(400).json({ message: '_id is required' });

    const deleted = await Asset.findOneAndDelete({ _id, userId }).lean();
    if (!deleted) return res.status(404).json({ message: 'Asset not found' });

    // optional cascade
    await Task.deleteMany({ asset: _id, userId });

    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteAsset error', err);
    return res.status(400).json({ message: 'Failed to delete asset', error: err?.message });
  }
}

module.exports = {
  getAssets,
  assetsWithTasksSummary,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
};

