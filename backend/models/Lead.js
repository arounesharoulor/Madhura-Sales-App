const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    companyId: {
      type: String,
      default: 'company_madhura',
      index: true
    },
  clientName: { type: String, required: true },
  companyName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  serviceInterested: { type: String },
  status: { 
    type: String, 
    enum: ["Lead Taken", "Lead Taken to the Meeting", "Meeting", "Meeting Completed", "Client Onboarded", "Project Onboarded"], 
    default: "Lead Taken" 
  },
  meetingType: { type: String, enum: ["In-Person", "Online", ""] },
  meetingDate: { type: Date },
  notes: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.model("Lead", leadSchema);
