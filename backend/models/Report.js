const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['Weekly', 'Monthly', 'Closure'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    customClientName: { type: String, default: '' },
    customProjectName: { type: String, default: '' },
    customSummary: { type: String, default: '' },
    customNextSteps: { type: String, default: '' },
    customQuotes: { type: String, default: '' },
    summary: {
      totalTasks: { type: Number, default: 0 },
      completedTasks: { type: Number, default: 0 },
      totalMeetings: { type: Number, default: 0 },
      totalFollowUps: { type: Number, default: 0 },
      totalExecutivesActive: { type: Number, default: 0 },
    },
    activities: [
      {
        executiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        executiveName: String,
        clientName: String,
        companyName: String,
        activityType: String, // 'Meeting' or 'FollowUp'
        date: Date,
        status: String,
        notes: String,
      }
    ],
    fileUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Report', reportSchema);
