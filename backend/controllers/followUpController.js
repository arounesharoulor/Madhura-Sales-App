const FollowUp = require('../models/FollowUp');

// @desc    Create a client follow-up reminder
// @route   POST /api/followups
// @access  Private/FieldExecutive
exports.createFollowUp = async (req, res, next) => {
  try {
    const { clientName, companyName, notes, followUpDate, meeting } = req.body;

    const followUp = await FollowUp.create({
      executive: req.user.id,
      meeting: meeting || undefined,
      clientName,
      companyName,
      followUpDate: new Date(followUpDate),
      notes,
    });

    res.status(201).json({
      success: true,
      data: followUp,
    });
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

    // Filter by executive
    if (req.user.role === 'Field Executive') {
      query.executive = req.user.id;
    } else if (req.user.role === 'Manager') {
      const User = require('../models/User');
      const managed = await User.find({ manager: req.user.id }).select('_id');
      const ids = managed.map(m => m._id);
      query.executive = { $in: ids };
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const followUps = await FollowUp.find(query)
      .populate('executive', 'name email')
      .populate('meeting')
      .sort({ followUpDate: 1 }); // nearest date first

    res.status(200).json({
      success: true,
      count: followUps.length,
      data: followUps,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update follow up status
// @route   PUT /api/followups/:id/status
// @access  Private
exports.updateFollowUpStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const validStatuses = ['Pending', 'Called', 'Visited', 'Converted', 'Not Interested', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400); throw new Error('Invalid status');
    }
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) { res.status(404); throw new Error('Follow up not found'); }
    if (req.user.role === 'Field Executive' && followUp.executive.toString() !== req.user.id) {
      res.status(403); throw new Error('Not authorized');
    }
    followUp.status = status;
    if (remarks) followUp.remarks = remarks;
    await followUp.save();
    res.status(200).json({ success: true, data: followUp });
  } catch (error) {
    next(error);
  }
};
