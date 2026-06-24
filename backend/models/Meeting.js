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
    nextFollowUpDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Meeting', meetingSchema);
