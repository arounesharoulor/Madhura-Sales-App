const Task = require('../models/Task');
const Notification = require('../models/Notification');

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

      // Create notification for admin/manager
      const adminNotif = await Notification.create({
        recipient: task.assignedBy,
        sender: task.assignedTo,
        title: 'Task Overdue ⚠️',
        message: `Task "${task.title}" assigned is overdue!`,
        type: 'Task',
      });

      if (io) {
        // Emit to employee
        io.to(task.assignedTo.toString()).emit('notification', employeeNotif);
        io.to(task.assignedTo.toString()).emit('task_overdue', task);

        // Emit to admin
        io.to(task.assignedBy.toString()).emit('notification', adminNotif);
        io.to(task.assignedBy.toString()).emit('task_overdue', task);
      }
    }
  } catch (error) {
    console.error('Error checking overdue tasks:', error);
  }
};

module.exports = { checkOverdueTasks };
