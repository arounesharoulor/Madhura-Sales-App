const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: [true, 'Please add client name'],
    },
    companyName: {
      type: String,
      required: [true, 'Please add company name'],
    },
    phone: {
      type: String,
      required: [true, 'Please add contact phone'],
    },
    notes: {
      type: String,
      required: [true, 'Please add meeting notes'],
    },
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      address: {
        type: String,
        default: '',
      },
    },
    executive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    photo: {
      data: {
        type: Buffer,
      },
      contentType: {
        type: String,
      },
    },
    photoUrl: {
      type: String, // Cloudinary URL
    },
    nextFollowUpDate: {
      type: Date,
    },
    // New fields
    meetingType: {
      type: String,
      enum: ['In-Person', 'Online'],
      default: 'In-Person',
    },
    scheduledAt: {
      type: Date, // Scheduled meeting date/time (future meetings)
    },
    reminderAt: {
      type: Date, // When to send reminder notification
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    meetingFollowUp: {
      type: String, // Follow-up notes set after meeting
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled'],
      default: 'Completed',
    },
    onlineMeetingLink: {
      type: String, // For online meetings (Zoom, Meet link etc.)
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Meeting', meetingSchema);
