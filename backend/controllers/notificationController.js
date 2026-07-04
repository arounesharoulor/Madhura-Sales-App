const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const query = { recipient: req.user.id };
    // Allow filtering by read status: ?isRead=false or ?isRead=true
    if (req.query.isRead !== undefined) {
      query.isRead = req.query.isRead === 'true';
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    if (req.params.id === 'all') {
      await Notification.updateMany(
        { recipient: req.user.id, isRead: false },
        { isRead: true }
      );
      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      res.status(404);
      throw new Error('Notification not found');
    }

    if (notification.recipient.toString() !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized to access this notification');
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Broadcast notification alert (Admin / Manager only)
// @route   POST /api/notifications/broadcast
// @access  Private/Admin/Manager
exports.broadcastNotification = async (req, res, next) => {
  try {
    const { recipientType, recipientId, title, message, type } = req.body;

    let recipients = [];

    if (recipientId) {
      recipients = [recipientId];
    } else {
      let query = {};
      if (recipientType === 'executives') {
        query.role = 'Field Executive';
      } else if (recipientType === 'managers') {
        query.role = 'Manager';
      } else {
        // Broadcast to all active users
        query.isActive = true;
      }
      const users = await User.find(query).select('_id');
      recipients = users.map((u) => u._id);
    }

    if (recipients.length === 0) {
      res.status(400);
      throw new Error('No recipients matching query');
    }

    // Save notifications in DB and emit socket alerts
    const notifications = await Promise.all(
      recipients.map(async (uid) => {
        const notif = await Notification.create({
          recipient: uid,
          sender: req.user.id,
          title,
          message,
          type: type || 'Alert',
        });

        // Emit socket event if server connected
        if (req.io) {
          req.io.to(uid.toString()).emit('notification', notif);
        }

        return notif;
      })
    );

    res.status(201).json({
      success: true,
      count: notifications.length,
      message: 'Broadcast alert sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send notification to Admins
// @route   POST /api/notifications/admin
// @access  Private/FieldExecutive
exports.notifyAdmins = async (req, res, next) => {
  try {
    const { title, message, type } = req.body;

    // Find all admins
    const admins = await User.find({ role: 'Admin', isActive: true }).select('_id');
    const adminIds = admins.map((a) => a._id);

    if (adminIds.length === 0) {
      return res.status(200).json({ success: true, message: 'No admins to notify' });
    }

    const notifications = await Promise.all(
      adminIds.map(async (uid) => {
        const notif = await Notification.create({
          recipient: uid,
          sender: req.user.id,
          title,
          message,
          type: type || 'Alert',
        });

        if (req.io) {
          req.io.to(uid.toString()).emit('notification', notif);
        }

        return notif;
      })
    );

    res.status(201).json({
      success: true,
      message: 'Admins notified successfully',
    });
  } catch (error) {
    next(error);
  }
};
