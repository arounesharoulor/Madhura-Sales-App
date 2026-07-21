const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Project Name
  projectCode: { type: String }, // Project Code / ID
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientOnboarding', required: true },
  
  // Storing snapshots just in case client data changes
  clientNameSnapshot: { type: String }, 
  clientContactSnapshot: { type: String }, 

  category: { type: String }, // Project Category / Type
  services: [{ type: String }],
  description: { type: String }, // Project Description
  clientRequirement: { type: String }, // Client Requirements
  softwareDetails: { type: String },
  
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status: { type: String, default: 'In Progress' },
  
  startDate: { type: Date },
  targetCompletionDate: { type: Date },
  actualCompletionDate: { type: Date },
  
  progress: { type: Number, default: 0 }, // Progress Bar / % Complete
  
  assignedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Assigned Team Members

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
