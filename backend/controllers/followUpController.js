const FollowUp = require('../models/FollowUp');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Create a client follow-up reminder (Employee or Admin)
// @route   POST /api/followups
// @access  Private
exports.createFollowUp = async (req, res, next) => {
  try {
    const { clientName, companyName, notes, followUpDate, meeting, priority, assignedTo } = req.body;

    // If Admin is creating, they must provide assignedTo.
    // If Employee is creating, executive is themselves.
    const executiveId = req.user.role === 'Admin' ? assignedTo : req.user.id;

    if (!executiveId) {
      res.status(400);
      throw new Error('Please select an employee to assign this follow-up.');
    }

    const followUp = await FollowUp.create({
      executive: executiveId,
      assignedTo: req.user.role === 'Admin' ? assignedTo : null,
      assignedByAdmin: req.user.role === 'Admin' ? req.user.id : null,
      assignedAt: req.user.role === 'Admin' ? new Date() : null,
      meeting: meeting || undefined,
      clientName,
      companyName,
      followUpDate: new Date(followUpDate),
      notes,
      priority: priority || 'Medium',
    });

    // Notify the assigned employee if created by admin
    if (req.user.role === 'Admin' && assignedTo) {
      try {
        const notif = await Notification.create({
          recipient: assignedTo,
          sender: req.user.id,
          title: '📞 New Follow-up Assigned',
          message: `Admin assigned a new follow-up with ${clientName} (${companyName}). Priority: ${followUp.priority}. Date: ${new Date(followUp.followUpDate).toLocaleDateString('en-IN')}.`,
          type: 'Task',
        });
        if (req.io) req.io.to(assignedTo.toString()).emit('notification', notif);
      } catch (e) {
        console.error('Follow-up creation notification failed (non-fatal):', e.message);
      }
    }

    res.status(201).json({ success: true, data: followUp });
  } catch (error) {
    next(error);
  }
};

// @desc    Get followups list
// @route   GET /api/followups
// @access  Private
exports.getFollowUps = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'Field Executive') {
      // Executives see their own follow-ups OR ones assigned to them by admin
      query.$or = [
        { executive: req.user.id },
        { assignedTo: req.user.id },
      ];
    } else if (req.user.role === 'Manager') {
      const managed = await User.find({ manager: req.user.id }).select('_id');
      const ids = managed.map(m => m._id);
      query.executive = { $in: ids };
    }
    // Admin: no filter — sees all

    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;

    const followUps = await FollowUp.find(query)
      .populate('executive', 'name email designation')
      .populate('assignedTo', 'name email designation')
      .populate('assignedByAdmin', 'name')
      .populate('meeting')
      .sort({ priority: 1, followUpDate: 1 }); // High → Medium → Low, then nearest date

    res.status(200).json({ success: true, count: followUps.length, data: followUps });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin assigns an employee to a follow-up and/or sets priority
// @route   PUT /api/followups/:id/assign
// @access  Private/Admin
exports.assignFollowUp = async (req, res, next) => {
  try {
    const { assignedTo, priority } = req.body;

    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) { res.status(404); throw new Error('Follow-up not found'); }

    if (req.user.role !== 'Admin') { res.status(403); throw new Error('Only admins can assign follow-ups'); }

    if (assignedTo) {
      followUp.assignedTo = assignedTo;
      followUp.assignedByAdmin = req.user.id;
      followUp.assignedAt = new Date();
    }
    if (priority && ['High', 'Medium', 'Low'].includes(priority)) {
      followUp.priority = priority;
    }

    await followUp.save();

    // Notify the assigned employee
    if (assignedTo) {
      try {
        const notif = await Notification.create({
          recipient: assignedTo,
          sender: req.user.id,
          title: '📞 Follow-up Assigned',
          message: `You have been assigned to follow up with ${followUp.clientName} (${followUp.companyName}). Priority: ${followUp.priority}. Date: ${new Date(followUp.followUpDate).toLocaleDateString('en-IN')}.`,
          type: 'Task',
        });
        if (req.io) req.io.to(assignedTo.toString()).emit('notification', notif);
      } catch (e) {
        console.error('Follow-up assignment notification failed (non-fatal):', e.message);
      }
    }

    const populated = await FollowUp.findById(req.params.id)
      .populate('executive', 'name email designation')
      .populate('assignedTo', 'name email designation')
      .populate('assignedByAdmin', 'name')
      .populate('meeting');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update follow-up status
// @route   PUT /api/followups/:id/status
// @access  Private
exports.updateFollowUpStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const validStatuses = ['Pending', 'Called', 'Visited', 'Converted', 'Not Interested', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) { res.status(400); throw new Error('Invalid status'); }

    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) { res.status(404); throw new Error('Follow-up not found'); }

    // Field Executive can only update their own or ones assigned to them
    if (req.user.role === 'Field Executive') {
      const isOwner = followUp.executive.toString() === req.user.id;
      const isAssigned = followUp.assignedTo?.toString() === req.user.id;
      if (!isOwner && !isAssigned) { res.status(403); throw new Error('Not authorized'); }
    }

    followUp.status = status;
    if (remarks) followUp.remarks = remarks;

    if (req.file) {
      followUp.attachment = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        filename: req.file.originalname,
      };
    }

    // Save GPS location proof when employee marks as Visited
    if (status === 'Visited' && req.body.latitude && req.body.longitude) {
      followUp.visitLocation = {
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
        address: req.body.address || '',
        capturedAt: new Date(),
      };
    }

    await followUp.save();

    // If status is Completed/Converted, notify admin who assigned this
    if (['Completed', 'Converted'].includes(status) && followUp.assignedByAdmin) {
      try {
        const notif = await Notification.create({
          recipient: followUp.assignedByAdmin,
          sender: req.user.id,
          title: `Follow-up ${status}`,
          message: `${req.user.name} marked the follow-up with ${followUp.clientName} (${followUp.companyName}) as ${status}.`,
          type: 'Success',
        });
        if (req.io) req.io.to(followUp.assignedByAdmin.toString()).emit('notification', notif);
      } catch (e) {
        console.error('Follow-up status notification failed (non-fatal):', e.message);
      }
    }

    res.status(200).json({ success: true, data: followUp });
  } catch (error) {
    next(error);
  }
};

// @desc    Get follow-up attachment
// @route   GET /api/followups/:id/attachment
// @access  Private
exports.getFollowUpAttachment = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp || !followUp.attachment || !followUp.attachment.data) {
      res.status(404);
      throw new Error('Attachment not found');
    }
    res.set('Content-Type', followUp.attachment.contentType);
    res.set('Content-Disposition', `inline; filename="${followUp.attachment.filename || 'attachment'}"`);
    res.send(followUp.attachment.data);
  } catch (error) {
    next(error);
  }
};
