const Task = require('../models/Task');
const Notification = require('../models/Notification');
const User = require('../models/User');

const checkOverdueTasks = async (io) => {
  try {
    const overdueTasks = await Task.find({
      status: { $ne: 'Completed' },
      dueDate: { $lt: new Date() },
      overdueNotified: { $ne: true }
    });

    for (const task of overdueTasks) {
      task.overdueNotified = true;
      await task.save();

      // Create notification for employee
      const employeeNotif = await Notification.create({
        recipient: task.assignedTo,
        sender: task.assignedBy,
        title: 'Task Overdue ⚠️',
        message: `Your task "${task.title}" is past its due date! Please complete it.`,
        type: 'Task',
      });

      if (io) {
        io.to(task.assignedTo.toString()).emit('notification', employeeNotif);
        io.to(task.assignedTo.toString()).emit('task_overdue', task);
      }

      // Find all admins
      const admins = await User.find({ role: { $in: ['Admin', 'Project Manager', 'Managing Director MD'] } });
      
      for (const admin of admins) {
        const adminNotif = await Notification.create({
          recipient: admin._id,
          sender: task.assignedTo,
          title: 'Task Overdue ⚠️',
          message: `Task "${task.title}" assigned to employee is overdue!`,
          type: 'Task',
        });
        
        if (io) {
          io.to(admin._id.toString()).emit('notification', adminNotif);
          io.to(admin._id.toString()).emit('task_overdue', task);
        }
      }
    }
  } catch (error) {
    console.error('Error checking overdue tasks:', error);
  }
};

module.exports = { checkOverdueTasks };
