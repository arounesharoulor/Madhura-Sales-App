const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const User = require('../models/User');

const checkPendingAttendances = async (io) => {
  try {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    const pendingRecords = await Attendance.find({
      status: { $in: ['Pending Check-In', 'Pending Check-Out', 'Pending Leave'] },
      pendingNotified: false,
      updatedAt: { $lt: threeMinutesAgo }
    }).populate('executive', 'name');

    if (pendingRecords.length === 0) return;

    const admins = await User.find({ role: 'Admin', isActive: true }).select('_id');
    
    for (const record of pendingRecords) {
      record.pendingNotified = true;
      await record.save();

      const title = `Overdue ${record.status} ⚠️`;
      const message = `${record.executive?.name || 'An employee'}'s ${record.status.toLowerCase()} has been pending for over 3 minutes. Please approve or reject it.`;

      for (const admin of admins) {
        const notif = await Notification.create({
          recipient: admin._id,
          sender: record.executive?._id,
          title,
          message,
          type: 'Warning',
        });
        
        if (io) {
          io.to(admin._id.toString()).emit('notification', notif);
        }
      }
    }
  } catch (error) {
    console.error('Error checking pending attendances:', error);
  }
};

module.exports = { checkPendingAttendances };
