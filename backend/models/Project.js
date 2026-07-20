const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientOnboarding', required: true },
  services: [{ type: String }],
  softwareDetails: { type: String },
  status: { type: String, default: 'In Progress' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
