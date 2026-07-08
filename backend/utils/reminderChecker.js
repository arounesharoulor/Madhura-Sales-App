const Meeting = require('../models/Meeting');
const FollowUp = require('../models/FollowUp');
const Notification = require('../models/Notification');

exports.checkReminders = async (io) => {
  try {
    const now = new Date();
    
    // 1. Check upcoming Meetings (within 30 mins)
    const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60000);
    
    const upcomingMeetings = await Meeting.find({
      status: 'Scheduled',
      reminderSent: false,
      scheduledAt: { $lte: thirtyMinsFromNow, $gte: now }
    });

    for (let meeting of upcomingMeetings) {
      meeting.reminderSent = true;
      await meeting.save();

      const notif = await Notification.create({
        recipient: meeting.executive,
        title: 'Meeting Reminder',
        message: `Your ${meeting.meetingType} meeting with ${meeting.clientName} is starting in less than 30 minutes.`,
        type: 'Meeting',
      });

      if (io) {
        io.to(meeting.executive.toString()).emit('notification', notif);
      }
    }

    // 2. Check FollowUps (start of day)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Consider 8 AM to be the "start of the day" for reminders
    if (now.getHours() >= 8) { 
      const todaysFollowUps = await FollowUp.find({
        status: 'Pending',
        reminderSent: false,
        followUpDate: { $gte: startOfDay, $lte: endOfDay }
      });

      for (let fw of todaysFollowUps) {
        fw.reminderSent = true;
        await fw.save();

        const notif = await Notification.create({
          recipient: fw.executive,
          title: 'Daily Follow-up Reminder',
          message: `You have a pending follow-up with ${fw.clientName} scheduled for today.`,
          type: 'FollowUp',
        });

        if (io) {
          io.to(fw.executive.toString()).emit('notification', notif);
        }
      }
    }

  } catch (error) {
    console.error('Error checking reminders:', error.message);
  }
};
