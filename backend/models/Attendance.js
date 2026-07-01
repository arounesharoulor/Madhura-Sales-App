const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    executive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // "YYYY-MM-DD" — one record per employee per day
      required: true,
    },
    checkInTime: {
      type: Date,
      default: null,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    workPlan: {
      type: String,
      default: '',
    },
    workSummary: {
      type: String,
      default: '',
    },
    checkInLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    checkOutLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    status: {
      type: String,
      enum: ['Pending Check-In', 'Checked In', 'Pending Check-Out', 'Checked Out', 'Pending Leave', 'On Leave', 'Absent', 'Rejected Check-In', 'Rejected Check-Out', 'Rejected Leave'],
      default: 'Pending Check-In',
    },
    checkInStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Held'],
      default: 'Pending',
    },
    checkOutStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Held', null],
      default: null,
    },
    leaveStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Held', null],
      default: null,
    },
    leaveType: {
      type: String,
      default: '',
    },
    leaveReason: {
      type: String,
      default: '',
    },
    earlyCheckout: {
      type: Boolean,
      default: false,
    },
    earlyCheckoutReason: {
      type: String,
      default: '',
    },
    pendingNotified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Unique per executive per day
attendanceSchema.index({ executive: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
