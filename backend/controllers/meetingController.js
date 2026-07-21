const Meeting = require('../models/Meeting');
const FollowUp = require('../models/FollowUp');
const Lead = require('../models/Lead');
const cloudinary = require('../cloudinary');
const streamifier = require('streamifier');

const uploadToCloudinary = (buffer, mimetype) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'meetings', resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// @desc    Create client meeting entry
// @route   POST /api/meetings
// @access  Private/FieldExecutive
exports.createMeeting = async (req, res, next) => {
  try {
    const {
      clientName, companyName, phone, notes, latitude, longitude, address,
      nextFollowUpDate, meetingType, scheduledAt, reminderAt, meetingFollowUp,
      onlineMeetingLink, status, leadId
    } = req.body;

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
      meetingType: meetingType || 'In-Person',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      reminderAt: reminderAt ? new Date(reminderAt) : undefined,
      meetingFollowUp: meetingFollowUp || '',
      onlineMeetingLink: onlineMeetingLink || '',
      status: status || (scheduledAt ? 'Scheduled' : 'Completed'),
      lead: leadId || undefined,
    };

    // Upload photo to Cloudinary if provided
    if (req.file) {
      try {
        const photoUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
        meetingData.photoUrl = photoUrl;
      } catch (uploadErr) {
        console.error('Cloudinary upload failed, storing raw buffer:', uploadErr.message);
        meetingData.photo = { data: req.file.buffer, contentType: req.file.mimetype };
      }
    }

    const meeting = await Meeting.create(meetingData);

    // Update the associated lead with the meeting date
    if (meeting.lead && scheduledAt) {
      try {
        await Lead.findByIdAndUpdate(meeting.lead, { meetingDate: new Date(scheduledAt) });
      } catch (err) {
        console.error('Failed to update lead meeting date:', err.message);
      }
    }

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

    // Notify all admins of the logged/scheduled meeting
    try {
      const User = require('../models/User');
      const Notification = require('../models/Notification');
      const adminRoles = ['Admin', 'Project Manager', 'Team Lead', 'HR', 'Managing Director MD'];
      const admins = await User.find({ role: { $in: adminRoles }, isActive: true }).select('_id');
      const adminIds = admins.map(a => a._id);
      const meetingLocationText = meetingData.location.address
        ? `${meetingData.location.address}`
        : `Lat: ${meetingData.location.latitude.toFixed(4)}, Lng: ${meetingData.location.longitude.toFixed(4)}`;
      const isScheduled = meetingData.status === 'Scheduled';
      const scheduledText = scheduledAt
        ? ` on ${new Date(scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
        : '';

      await Promise.all(
        adminIds.map(async (adminId) => {
          const notif = await Notification.create({
            recipient: adminId,
            sender: req.user.id,
            title: isScheduled ? 'Meeting Scheduled' : 'Client Visit Logged',
            message: isScheduled
              ? `${req.user.name} scheduled a ${meetingData.meetingType} meeting with ${clientName} (${companyName})${scheduledText}.`
              : `${req.user.name} logged a visit with ${clientName} at ${companyName}. Location: ${meetingLocationText}`,
            type: 'Meeting',
          });
          if (req.io) req.io.to(adminId.toString()).emit('notification', notif);
        })
      );

      // Schedule reminder notification if reminderAt is set
      if (reminderAt) {
        const reminderDelay = new Date(reminderAt).getTime() - Date.now();
        if (reminderDelay > 0) {
          setTimeout(async () => {
            try {
              const reminderNotifs = await Promise.all(
                [meeting.executive, ...adminIds].map(uid =>
                  Notification.create({
                    recipient: uid,
                    sender: req.user.id,
                    title: '⏰ Meeting Reminder',
                    message: `Reminder: ${meetingData.meetingType} meeting with ${clientName} (${companyName}) is coming up${scheduledText}.`,
                    type: 'Meeting',
                  })
                )
              );
              reminderNotifs.forEach(notif => {
                if (req.io) req.io.to(notif.recipient.toString()).emit('notification', notif);
              });
            } catch (e) {
              console.error('Reminder notification failed:', e.message);
            }
          }, reminderDelay);
        }
      }
    } catch (err) {
      console.error('Failed to notify admins of meeting:', err.message);
    }

    res.status(201).json({ success: true, data: meeting });
  } catch (error) {
    next(error);
  }
};

// @desc    Update meeting follow-up / status
// @route   PUT /api/meetings/:id
// @access  Private
exports.updateMeeting = async (req, res, next) => {
  try {
    const { meetingFollowUp, status, notes, nextFollowUpDate, reminderAt, clientRequirement } = req.body;
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) { res.status(404); throw new Error('Meeting not found'); }

    const oldStatus = meeting.status;

    if (meetingFollowUp !== undefined) meeting.meetingFollowUp = meetingFollowUp;
    if (status) meeting.status = status;
    if (notes) meeting.notes = notes;
    if (clientRequirement !== undefined) meeting.clientRequirement = clientRequirement;
    if (nextFollowUpDate) meeting.nextFollowUpDate = new Date(nextFollowUpDate);
    if (reminderAt) meeting.reminderAt = new Date(reminderAt);

    // Handle photo upload if present
    if (req.file) {
      try {
        const photoUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
        meeting.photoUrl = photoUrl;
      } catch (uploadErr) {
        console.error('Cloudinary upload failed, storing raw buffer:', uploadErr.message);
        meeting.photo = { data: req.file.buffer, contentType: req.file.mimetype };
      }
    }

    await meeting.save();

    // Notify admins if status changed to completed or if there's a new follow-up
    if ((status === 'Completed' && oldStatus !== 'Completed') || meetingFollowUp) {
      try {
        const User = require('../models/User');
        const Notification = require('../models/Notification');
        const adminRoles = ['Admin', 'Project Manager', 'Team Lead', 'HR', 'Managing Director MD'];
        const admins = await User.find({ role: { $in: adminRoles }, isActive: true }).select('_id');
        const adminIds = admins.map(a => a._id);

        let notifTitle = 'Meeting Updated';
        let notifMsg = `${req.user.name} updated the meeting with ${meeting.clientName}.`;
        
        if (status === 'Completed' && oldStatus !== 'Completed') {
          notifTitle = 'Meeting Completed';
          notifMsg = `${req.user.name} completed the scheduled meeting with ${meeting.clientName}.`;
          
          if (meeting.lead) {
            try {
              await Lead.findByIdAndUpdate(meeting.lead, { status: 'Meeting Completed' });
            } catch (err) {
              console.error('Failed to update lead status:', err.message);
            }
          }
        } else if (meetingFollowUp) {
          notifTitle = 'Meeting Follow-up Added';
          notifMsg = `${req.user.name} added a follow-up note for the meeting with ${meeting.clientName}.`;
        }

        // Create new FollowUp if nextFollowUpDate is provided during completion
        if (nextFollowUpDate) {
           await FollowUp.create({
             executive: req.user.id,
             meeting: meeting._id,
             clientName: meeting.clientName,
             companyName: meeting.companyName,
             followUpDate: new Date(nextFollowUpDate),
             notes: `Follow up on completed meeting: ${meetingFollowUp ? meetingFollowUp.substring(0, 100) : ''}`,
           });
        }

        await Promise.all(
          adminIds.map(async (adminId) => {
            const notif = await Notification.create({
              recipient: adminId,
              sender: req.user.id,
              title: notifTitle,
              message: notifMsg,
              type: 'Meeting',
            });
            if (req.io) req.io.to(adminId.toString()).emit('notification', notif);
          })
        );
      } catch (err) {
        console.error('Failed to notify admins of meeting update:', err.message);
      }
    }

    res.status(200).json({ success: true, data: meeting });
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
      const User = require('../models/User');
      const executives = await User.find({ manager: req.user.id }).select('_id');
      const execIds = executives.map(e => e._id);
      query.executive = { $in: execIds };
    }

    const meetings = await Meeting.find(query)
      .populate('executive', 'name email phone')
      .sort({ createdAt: -1 }).lean();

    res.status(200).json({ success: true, count: meetings.length, data: meetings });
  } catch (error) {
    next(error);
  }
};

// @desc    Get meeting detail by ID
// @route   GET /api/meetings/:id
// @access  Private
exports.getMeetingById = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate('executive', 'name email phone');
    if (!meeting) { res.status(404); throw new Error('Meeting not found'); }
    res.status(200).json({ success: true, data: meeting });
  } catch (error) {
    next(error);
  }
};

