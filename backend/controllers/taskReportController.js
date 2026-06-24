const TaskReport = require('../models/TaskReport');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

// @desc    Submit a task report
// @route   POST /api/task-reports
// @access  Private/FieldExecutive
exports.createTaskReport = async (req, res, next) => {
  try {
    const { taskId, clientName, clientPhone, address, latitude, longitude, dateTime, details } = req.body;

    if (!taskId || !clientName || !clientPhone || !dateTime || !details) {
      res.status(400);
      throw new Error('Please provide all required fields (taskId, clientName, clientPhone, dateTime, details)');
    }

    const task = await Task.findById(taskId);
    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }

    const taskReport = await TaskReport.create({
      task: taskId,
      employee: req.user.id,
      clientName,
      clientPhone,
      location: {
        address: address || '',
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      },
      dateTime: new Date(dateTime),
      details,
      status: 'Pending',
    });

    // Notify admins
    const admins = await require('../models/User').find({ role: 'Admin', isActive: true }).select('_id');
    await Promise.all(
      admins.map(async (admin) => {
        const notif = await Notification.create({
          recipient: admin._id,
          sender: req.user.id,
          title: 'Task Report Submitted',
          message: `${req.user.name} submitted a report for task: "${task.title}".`,
          type: 'Alert',
        });
        if (req.io) req.io.to(admin._id.toString()).emit('notification', notif);
      })
    );

    res.status(201).json({
      success: true,
      data: taskReport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all task reports
// @route   GET /api/task-reports
// @access  Private
exports.getTaskReports = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== 'Admin') {
      query.employee = req.user.id;
    }

    const reports = await TaskReport.find(query)
      .populate('task', 'title description')
      .populate('employee', 'name employeeId designation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify or reject a task report
// @route   PUT /api/task-reports/:id/verify
// @access  Private/Admin
exports.verifyTaskReport = async (req, res, next) => {
  try {
    const { status, adminFeedback } = req.body;

    if (!['Verified', 'Rejected'].includes(status)) {
      res.status(400);
      throw new Error('Invalid verification status');
    }

    const report = await TaskReport.findById(req.params.id).populate('task', 'title');
    if (!report) {
      res.status(404);
      throw new Error('Task report not found');
    }

    report.status = status;
    report.adminFeedback = adminFeedback || '';
    await report.save();

    // Notify the employee about the feedback
    const notif = await Notification.create({
      recipient: report.employee,
      sender: req.user.id,
      title: status === 'Verified' ? 'Report Verified' : 'Report Rejected / Default Alert',
      message: `Your report for "${report.task.title}" has been ${status.toLowerCase()}.${
        adminFeedback ? ` Feedback: "${adminFeedback}"` : ''
      }`,
      type: status === 'Verified' ? 'Success' : 'Warning',
    });

    if (req.io) req.io.to(report.employee.toString()).emit('notification', notif);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};
