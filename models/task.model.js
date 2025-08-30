// ✅ DO this exact export pattern
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  asset:  { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', index: true, required: true },
  userId: { type: String, index: true, required: true },

  taskName:    { type: String, required: true },
  description: { type: String },
  priority:    { type: String, enum: ['1','2','3'], default: '2' },
  frequency:   { type: String },
  difficulty:  { type: String, enum: ['easy','medium','hard','very hard'], default: 'medium' },
  duration:    { type: String },
  who:         { type: String, enum: ['owner','professional'], default: 'owner' },
  steps:       { type: [String], default: [] },
  tools:       { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema); // <<— important
