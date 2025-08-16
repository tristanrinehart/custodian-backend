// 3100

const Asset = require('../../models/asset.model.js'); // Import the Asset model

//Asset listing endpoint
// This endpoint retrieves all assets from the database
const getAssets = async (req, res) => {
  try {
      const assets = await Asset.find({});
      if (!assets || assets.length === 0) {
          return res.status(204).json({ 'message': 'No assets found' });
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


module.exports = {
    getAssets,
    getAsset,
    createAsset,
    updateAsset,
    deleteAsset
};