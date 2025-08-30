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



/*
// 3100

const Asset = require('../../models/asset.model.js'); // Import the Asset model

//Asset listing endpoint
// This endpoint retrieves all assets from the database
const getAssets = async (req, res) => {
    try {
        
        const assets = await Asset.find();

        console.log(`getAssets,assets: ${JSON.stringify(assets)}`);
        if (!assets || assets.length === 0) {
            console.log(`No assets found`);
            return res.status(204).end();
        }
      res.status(200).json(assets);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
}

const getUserAssets = async (req, res) => {
    const {userId} = req.params
    try {
        const assets = await Asset.find({ userId: userId });

        console.log(`getUserAssets,assets: ${JSON.stringify(assets)}`);

        if (!assets || assets.length === 0) {
            console.log(`No assets found for user ${userId}`);
            return res.status(204).json(assets);
        }
      res.status(200).json(assets);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
}

//Asset retrieval endpoint
// This endpoint retrieves a specific asset by its ID
const getAsset = async (req, res) => {
  try {
      const { id } = req.params;
      const asset = await Asset.findById(id);
      res.status(200).json(asset);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
} 

//Asset creation endpoint
// This endpoint creates a new asset in the database
const createAsset = async (req, res) => {
  try {
      const asset =  await Asset.create(req.body);
      res.status(201).json(asset);
  } catch (error) {
      res.status(500).json({ message: error.message });
  } 
};

//Asset update endpoint
// This endpoint updates a specific asset by its ID
const updateAsset = async (req, res) => {
  try {
    const id = req.body.id; // prefer params
    const userId = req.body.userId;
    const submittedAsset = req.body; // prefer params
    console.log(`submittedAsset: ${JSON.stringify(submittedAsset)}`);

    if (!id) return res.status(400).json({ message: "ID parameter is required" });
    if (!userId) return res.status(400).json({ message: "userId parameter is required" });

    const foundAsset = await Asset.findOne({ id, userId }).exec();
    if (!foundAsset) {
      console.log(`Asset with ID ${id} not found for user ${userId}`);
      return res.status(404).json({ message: "Asset not found" });
    }

    Object.assign(foundAsset, submittedAsset); // apply only provided fields
    console.log(`foundAsset: ${JSON.stringify(foundAsset)}`);

    const result = await foundAsset.save();
    return res.status(200).json(result);
  } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
  }
};
//Asset deletion endpoint
// This endpoint deletes a specific asset by its ID
const deleteAsset = async (req, res) => {
    try {
        console.log(JSON.stringify(req.body));
        if (!req?.body?.id) {
            return res.status(400).json({ 'message': 'ID parameter is required' });
        }
        if (!req?.body?.userId) {
            return res.status(400).json({ 'message': 'userId parameter is required' });
        }
        const foundAsset = await Asset.findOne({ id: req.body.id, userId: req.body.userId }).exec();

        if (!foundAsset) {
            return res.status(404).json({ 'message': 'Asset not found' });
        }
        console.log(`Deleting ${foundAsset.assetName}...`);
        // Delete the asset

        const result = await foundAsset.deleteOne();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ 'message': error.message });
    }
};

const deleteAssetNew = async (req, res) => {
  try {
      const { id } = req.params;
      const userId = req.userId; // Assuming user ID is available in req.user
      const asset = await Asset.findByIdAndDelete(id);
      if (!asset) {
          return res.status(404).json({ message: 'Asset not found' });
      }
      res.status(200).json({ message: 'Asset deleted successfully' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

// GET /api/assets
// Optional: ?include=tasks:summary | tasks:full
async function assetsWithTasksSummary(req, res) {
try {
const userId = req.user.id;
const include = String(req.query.include || '').toLowerCase();


if (!include || include === 'none') {
const assets = await Asset.find({ userId }).sort({ createdAt: -1 }).lean();
return res.json(assets);
}


if (include === 'tasks:summary') {
// Use aggregation to join tasks but only project a few fields
const pipeline = [
{ $match: { userId } },
{ $sort: { createdAt: -1 } },
{ $lookup: {
from: 'tasks',
localField: '_id',
foreignField: 'asset',
as: 'tasks'
}},
{ $addFields: {
tasks: {
$map: {
input: '$tasks',
as: 't',
in: { taskName: '$$t.taskName', priority: '$$t.priority' }
}
}
}},
{ $project: {
userId: 1, name: 1, type: 1, metadata: 1,
tasksStatus: 1, tasksUpdatedAt: 1, tasksVersion: 1,
tasks: 1,
}}
];
const assets = await Asset.aggregate(pipeline);
return res.json(assets);
}


if (include === 'tasks:full') {
// Simpler: two queries + manual join to preserve lean docs
const assets = await Asset.find({ userId }).sort({ createdAt: -1 }).lean();
const ids = assets.map(a => a._id);
const Task = require('../models/task.model');
const tasks = await Task.find({ asset: { $in: ids }, userId }).lean();
const byAsset = tasks.reduce((m, t) => { (m[t.asset] ||= []).push(t); return m; }, {});
const enriched = assets.map(a => ({ ...a, tasks: byAsset[a._id] || [] }));
return res.json(enriched);
}


// Fallback: no tasks
const assets = await Asset.find({ userId }).sort({ createdAt: -1 }).lean();
return res.json(assets);
} catch (err) {
console.error('listAssets error', err);
return res.status(500).json({ message: 'Failed to list assets' });
}
}

module.exports = {
    getAssets,
    getUserAssets,
    getAsset,
    createAsset,
    updateAsset,
    deleteAsset,
    assetsWithTasksSummary
};
*/