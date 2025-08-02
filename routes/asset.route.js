const express = require("express");
const Asset = require("../models/asset.model.js"); 
const router = express.Router();
const {getAssets, getAsset, createAsset, updateAsset, deleteAsset} = require('./controllers/asset.controller.js');

//controller function
router.get('/', getAssets);
router.get("/:id", getAsset);
router.post('/', createAsset);
router.put("/:id", updateAsset);
router.delete("/:id", deleteAsset);

module.exports = router;
 