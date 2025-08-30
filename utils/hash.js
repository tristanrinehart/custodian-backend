// backend/src/utils/hash.js
const crypto = require('crypto');

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// Fingerprint only fields that affect generation. Adapt to your domain.
// Your assets use fields like assetName / assetType (not name/type).
function assetFingerprint(assetDoc) {
  const core = {
    _id: String(assetDoc?._id || ''),
    assetName: assetDoc?.assetName || '',
    assetType: assetDoc?.assetType || '',
    assetSubType: assetDoc?.assetSubType || '',
    manufacturer: assetDoc?.manufacturer || '',
    modelNumber: assetDoc?.modelNumber || '',
    year: assetDoc?.year || '',
  };
  return sha256(JSON.stringify(core));
}

function promptHash({ prompt, assetDoc, version }) {
  return sha256(JSON.stringify({
    prompt: String(prompt || ''),
    asset: assetFingerprint(assetDoc || {}),
    version: Number(version || 1),
  }));
}

module.exports = { sha256, assetFingerprint, promptHash };
