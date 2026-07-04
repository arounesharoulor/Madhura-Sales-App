const mongoose = require('mongoose');

const workUpdateSchema = new mongoose.Schema(
  {
    executive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientOnboarding',
    },
    notes: {
      type: String,
      required: [true, 'Please add update details/notes'],
    },
    tasksCompleted: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
    meetingsCount: {
      type: Number,
      default: 0,
    },
    hoursWorked: {
      type: Number,
      required: [true, 'Please add estimated hours worked'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('WorkUpdate', workUpdateSchema);
