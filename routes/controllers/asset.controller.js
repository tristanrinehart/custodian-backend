const Asset = require('../../models/asset.model.js'); // Import the Asset model

//Asset listing endpoint
// This endpoint retrieves all assets from the database
const getAssets = async (req, res) => {
  try {
      const assets = await Asset.find({});
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
      const { id } = req.params;
      const asset = await Asset.findByIdAndUpdate(id, req.body);
      if (!asset) {
          return res.status(404).json({ message: 'Asset not found' });
      }
      const updatedAsset = await Asset.findById(id);
      res.status(200).json(updatedAsset);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

//Asset deletion endpoint
// This endpoint deletes a specific asset by its ID
const deleteAsset = async (req, res) => {
  try {
      const { id } = req.params;
      const asset = await Asset.findByIdAndDelete(id);
      if (!asset) {
          return res.status(404).json({ message: 'Asset not found' });
      }
      res.status(200).json({ message: 'Asset deleted successfully' });
  } catch (error) {
      res.status(500).json({ message: error.message });
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