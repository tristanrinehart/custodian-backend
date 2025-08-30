const mongoose = require('mongoose');

const assetSchema = mongoose.Schema(
    {
        timestamp: {
            type: Date,
            default: Date.now
        },
       userId: {
            type: String,
            required: false,
            trim: true
        },
        propertyId: {
            type: String,
            required: false,
            trim: true
        },
        assetStatus: {
            type: String,
            required: true,
            enum: ['active', 'inactive', 'maintenance', 'disposed'],
            default: 'active',
            trim: true
        },
        assetName: {
            type: String,
            required: true,
            trim: true
        },
        assetDescription: {
            type: String,
            required: false,
            trim: true
        },
        assetType: {
            type: String,
            required: false,
            enum: ['structure', 'plumbing', 'hvac', 'vehicle', 'appliance', 'furniture', 'boat', 'bicycle', 'other'],
            trim: true
        },
        assetSubType: {
            type: String,
            required: false,
            enum: ['dishwasher', 'refrigerator', 'freezer', 'washing machine', 'dryer', 'garbage disposal', 'oven & stove', 'table', 'furnace', 'air conditioner', 'ventilation', 'smoke detector', 'roof', 'gutters', 'chimney', 'deck', 'driveway', 'irragation', 'fence', 'siding', 'foundation', 'emergency supplies', 'other'],
            trim: true
        },
        assetSubtypeId: {
            type: String,
            required: false,
            trim: true
        },
        assetNewDate: {
            type: Date,    
        },
        assetPurchaseDate: {
            type: Date,   
        },
        assetBrand: {
            type: String,
            required: false,
            trim: true
        },
        assetModel: {
            type: String,
            required: false,
            trim: true
        },
        assetModelNumber: {
            type: String,
            required: false,
            trim: true
        },
        assetSerialNumber: {
            type: String,
            required: false,
            trim: true
        },
        assetCondition: {
            type: String,
            required: false,
            enum: ['new', 'like new', 'good', 'fair', 'poor'],
            trim: true
        },
        assetLocation: {
            type: String,
            required: false,
            trim: true
        },
        assetImage: {
            type: String,   // URL to the image
            required: false,
            trim: true
        },
        assetValue: {
            type: Number,
            required: false,
        },
        checked: {
            type: Boolean,
            default: false
        },
        id: {
            type: Number,
            default: false
        },
        tasksStatus: { 
            type: String, enum: ['none','pending','ready','error'], default: 'none' 
        },
        tasksUpdatedAt: { 
            type: Date 
        },
        tasksVersion: { 
            type: Number, default: 1 
        },   // bump when your prompt/recipe changes
        tasksPromptHash: { 
            type: String 
        }           // hash(prompt + relevant asset attrs + version)
    }
);

const Asset = mongoose.model("Asset", assetSchema); //mongoose will look for the plural, lowercase version of the model name, so it will create a collection called "assets"

module.exports = Asset;