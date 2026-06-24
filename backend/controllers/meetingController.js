const Meeting = require('../models/Meeting');
const FollowUp = require('../models/FollowUp');

// @desc    Create client meeting entry
// @route   POST /api/meetings
// @access  Private/FieldExecutive
exports.createMeeting = async (req, res, next) => {
  try {
    const { clientName, companyName, phone, notes, latitude, longitude, address, nextFollowUpDate } = req.body;

    const meetingData = {
      clientName,
      companyName,
      phone,
      notes,
      location: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        address: address || '',
      },
      executive: req.user.id,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
    };

    if (req.file) {
      meetingData.photo = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    const meeting = await Meeting.create(meetingData);

    // Automatically create a follow-up if date is provided
    if (nextFollowUpDate) {
      await FollowUp.create({
        executive: req.user.id,
        meeting: meeting._id,
        clientName,
        companyName,
        followUpDate: new Date(nextFollowUpDate),
        notes: `Follow up on meeting notes: ${notes.substring(0, 100)}...`,
      });
    }

    // Notify all admins of the logged client visit
    try {
      const User = require('../models/User');
      const Notification = require('../models/Notification');
      const admins = await User.find({ role: 'Admin', isActive: true }).select('_id');
      const adminIds = admins.map(a => a._id);
      const meetingLocationText = meetingData.location.address
        ? `${meetingData.location.address} (${meetingData.location.latitude.toFixed(4)}, ${meetingData.location.longitude.toFixed(4)})`
        : `Lat: ${meetingData.location.latitude.toFixed(4)}, Lng: ${meetingData.location.longitude.toFixed(4)}`;
      
      await Promise.all(
        adminIds.map(async (adminId) => {
          const notif = await Notification.create({
            recipient: adminId,
            sender: req.user.id,
            title: 'Client Visit Logged',
            message: `${req.user.name} logged a visit with ${clientName} at ${companyName}. Location: ${meetingLocationText}`,
            type: 'Meeting',
          });
          if (req.io) {
            req.io.to(adminId.toString()).emit('notification', notif);
          }
        })
      );
    } catch (err) {
      console.error('Failed to notify admins of meeting:', err.message);
    }

    res.status(201).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get meetings list
// @route   GET /api/meetings
// @access  Private
exports.getMeetings = async (req, res, next) => {
  try {
    let query = {};

    // Executives see only their own meetings
    if (req.user.role === 'Field Executive') {
      query.executive = req.user.id;
    } else if (req.user.role === 'Manager') {
      // Managers see meetings of executives they manage
      const User = require('../models/User');
      const executives = await User.find({ manager: req.user.id }).select('_id');
      const execIds = executives.map(e => e._id);
      query.executive = { $in: execIds };
    }

    const meetings = await Meeting.find(query)
      .populate('executive', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: meetings.length,
      data: meetings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get meeting detail by ID
// @route   GET /api/meetings/:id
// @access  Private
exports.getMeetingById = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('executive', 'name email phone');

    if (!meeting) {
      res.status(404);
      throw new Error('Meeting not found');
    }

    res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    next(error);
  }
};
