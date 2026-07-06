const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    executive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
    },
    clientName: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    followUpDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Called', 'Visited', 'Completed', 'Cancelled', 'Call Not Picked Up', 'Client Busy', 'Other'],
      default: 'Pending',
    },
    remarks: {
      type: String,
      default: '',
    },
    // Admin assignment fields
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    attachment: {
      data: Buffer,
      contentType: String,
      filename: String,
    },
    visitLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
      capturedAt: Date,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FollowUp', followUpSchema);
