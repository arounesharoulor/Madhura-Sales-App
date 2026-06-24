const Report = require('../models/Report');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const FollowUp = require('../models/FollowUp');
const User = require('../models/User');

// @desc    Generate a status report (Admin / Manager)
// @route   POST /api/reports
// @access  Private/Admin/Manager
exports.generateReport = async (req, res, next) => {
  try {
    const { title, type, startDate, endDate } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const queryFilter = { createdAt: { $gte: start, $lte: end } };
    if (req.user.role === 'Field Executive') {
      queryFilter.executive = req.user.id;
    }

    // Note: Tasks use 'assignedTo' instead of 'executive'
    const taskQueryFilter = { createdAt: { $gte: start, $lte: end } };
    if (req.user.role === 'Field Executive') {
      taskQueryFilter.assignedTo = req.user.id;
    }

    const totalTasks = await Task.countDocuments(taskQueryFilter);
    const completedTasks = await Task.countDocuments({ ...taskQueryFilter, status: 'Completed' });

    const meetings = await Meeting.find(queryFilter).populate('executive', 'name');
    const totalMeetings = meetings.length;

    const followUps = await FollowUp.find(queryFilter).populate('executive', 'name');
    const totalFollowUps = followUps.length;

    const totalExecutivesActive = await User.countDocuments({ role: 'Field Executive', isActive: true });

    const activities = [];
    meetings.forEach(m => {
      activities.push({
        executiveId: m.executive?._id,
        executiveName: m.executive?.name || 'Unknown',
        clientName: m.clientName,
        companyName: m.companyName,
        activityType: 'Meeting',
        date: m.createdAt,
        status: m.purpose,
        notes: m.outcome,
      });
    });

    followUps.forEach(f => {
      activities.push({
        executiveId: f.executive?._id,
        executiveName: f.executive?.name || 'Unknown',
        clientName: f.clientName,
        companyName: f.companyName,
        activityType: 'FollowUp',
        date: f.followUpDate,
        status: f.status,
        notes: f.notes,
      });
    });

    // Sort by date descending
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    const report = await Report.create({
      title,
      type,
      startDate: start,
      endDate: end,
      generatedBy: req.user.id,
      summary: {
        totalTasks,
        completedTasks,
        totalMeetings,
        totalFollowUps,
        totalExecutivesActive,
      },
      activities,
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reports list
// @route   GET /api/reports
// @access  Private
exports.getReports = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'Field Executive') {
      query.generatedBy = req.user.id;
    }
    const reports = await Report.find(query)
      .populate('generatedBy', 'name role')
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
