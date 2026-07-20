const WorkUpdate = require('../models/WorkUpdate');

// @desc    Create a daily work update
// @route   POST /api/workupdates
// @access  Private/FieldExecutive
exports.createUpdate = async (req, res, next) => {
  try {
    const { notes, tasksCompleted, meetingsCount, hoursWorked, client } = req.body;

    const workUpdate = await WorkUpdate.create({
      executive: req.user.id,
      notes,
      client: client || null,
      tasksCompleted: tasksCompleted || [],
      meetingsCount: Number(meetingsCount) || 0,
      hoursWorked: Number(hoursWorked),
    });

    // Notify all admins of the daily report update
    try {
      const User = require('../models/User');
      const Notification = require('../models/Notification');
      const admins = await User.find({ role: 'Admin', isActive: true }).select('_id');
      const adminIds = admins.map(a => a._id);
      
      await Promise.all(
        adminIds.map(async (adminId) => {
          const notif = await Notification.create({
            recipient: adminId,
            sender: req.user.id,
            title: 'Daily Report Notes Submitted',
            message: `${req.user.name} submitted daily notes: "${(notes || '').substring(0, 50)}..."`,
            type: 'Alert',
          });
          if (req.io) {
            req.io.to(adminId.toString()).emit('notification', notif);
          }
        })
      );
    } catch (err) {
      console.error('Failed to notify admins of report notes:', err.message);
    }

    res.status(201).json({
      success: true,
      data: workUpdate,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get work updates
// @route   GET /api/workupdates
// @access  Private
exports.getUpdates = async (req, res, next) => {
  try {
    let query = {};

    // Executives view their own updates
    if (req.user.role === 'Field Executive') {
      query.executive = req.user.id;
    } else if (req.user.role === 'Manager') {
      // Managers view updates of executives they manage
      const User = require('../models/User');
      const executives = await User.find({ manager: req.user.id }).select('_id');
      const execIds = executives.map(e => e._id);
      query.executive = { $in: execIds };
    }

    const updates = await WorkUpdate.find(query)
      .populate('executive', 'name email role')
      .populate('client', 'businessName ownerName phone location')
      .populate('tasksCompleted', 'title status')
      .sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: updates.length,
      data: updates,
    });
  } catch (error) {
    next(error);
  }
};
