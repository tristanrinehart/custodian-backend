const express = require("express");
const router = express.Router();

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

// ⚠️ REMOVE this; it conflicts with "/:assetId/tasks" and is insecure
// router.get('/:userId', getUserAssets);

module.exports = router;


/*
const express = require("express");
const Asset = require("../models/asset.model.js"); 
const router = express.Router();
const {getAssets, getUserAssets, createAsset, updateAsset, deleteAsset, assetsWithTasksSummary} = require('./controllers/asset.controller.js');
const { generateTasks } = require('./controllers/generateTasks.controller.js');
const verifyJWT = require('../middleware/verifyJWT');
const { getTasksForAsset, generateTasksForAsset } = require('./controllers/task.controller');

router.use(verifyJWT)
//controller function
router.get('/', getAssets);
router.post('/', createAsset);
router.get('/:userId', getUserAssets);
//router.get('/:id', getAsset); not used, conflict with getUserAssets
router.patch("/", updateAsset);
router.delete("/", deleteAsset);
router.post("/generateTasks", generateTasks);
router.get('/',assetsWithTasksSummary)
router.get('/:assetId/tasks', getTasksForAsset);
router.post('/:assetId/tasks/generate', generateTasksForAsset);

module.exports = router;
 */