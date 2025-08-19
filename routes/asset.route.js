const express = require("express");
const Asset = require("../models/asset.model.js"); 
const router = express.Router();
const {getAssets, getUserAssets, createAsset, updateAsset, deleteAsset} = require('./controllers/asset.controller.js');
const { generateTasks } = require('./controllers/generateTasks.controller.js');

//controller function
router.get('/', getAssets);
router.post('/', createAsset);
router.get('/:userId', getUserAssets);
//router.get('/:id', getAsset); not used, conflict with getUserAssets
router.patch("/", updateAsset);
router.delete("/", deleteAsset);
router.post("/generateTasks", generateTasks);

module.exports = router;
 