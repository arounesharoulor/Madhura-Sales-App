const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a task title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a task description'],
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientOnboarding',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Hold'],
      default: 'Pending',
    },
    dueDate: {
      type: Date,
      required: [true, 'Please add a due date'],
    },
    followUpDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    overdueNotified: {
      type: Boolean,
      default: false,
    },
    updates: [
      {
        notes: {
          type: String,
          required: true,
        },
        photo: {
          data: Buffer,
          contentType: String,
        },
        statusAfterUpdate: {
          type: String,
          enum: ['Pending', 'In Progress', 'Completed', 'Hold'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Task', taskSchema);
