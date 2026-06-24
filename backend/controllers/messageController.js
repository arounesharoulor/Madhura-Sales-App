const Message = require('../models/Message');

// @desc    Send a chat message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    const { text, receiver, mediaUrl } = req.body;

    const message = await Message.create({
      sender: req.user.id,
      receiver: receiver || null,
      text,
      mediaUrl: mediaUrl || '',
    });

    const populatedMsg = await Message.findById(message._id)
      .populate('sender', 'name profilePicture role')
      .populate('receiver', 'name profilePicture role');

    // Emit live Socket.io events
    if (req.io) {
      if (receiver) {
        // Private message
        req.io.to(receiver.toString()).emit('private_message', populatedMsg);
        req.io.to(req.user.id.toString()).emit('private_message', populatedMsg);
      } else {
        // Group / Team message
        req.io.emit('team_message', populatedMsg);
      }
    }

    res.status(201).json({
      success: true,
      data: populatedMsg,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get chat messages
// @route   GET /api/messages
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const { partnerId } = req.query;
    let query = {};

    if (partnerId) {
      // Private messages between logged-in user and partner
      query.$or = [
        { sender: req.user.id, receiver: partnerId },
        { sender: partnerId, receiver: req.user.id },
      ];
    } else {
      // Team messages (global group chat)
      query.receiver = null;
    }

    const messages = await Message.find(query)
      .populate('sender', 'name profilePicture role')
      .populate('receiver', 'name profilePicture role')
      .sort({ createdAt: 1 }); // ASC for chronological timeline

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};
