const Task = require('../models/Task');
const Notification = require('../models/Notification');

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private/Admin/Manager
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, assignedTo, dueDate } = req.body;

    const task = await Task.create({
      title,
      description,
      assignedTo,
      assignedBy: req.user.id,
      dueDate,
    });

    // Create a database notification
    const notification = await Notification.create({
      recipient: assignedTo,
      sender: req.user.id,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${title}". Due: ${new Date(dueDate).toLocaleDateString()}`,
      type: 'Task',
    });

    // Emit live Socket.io event if socket server is attached
    if (req.io) {
      req.io.to(assignedTo.toString()).emit('notification', notification);
      req.io.to(assignedTo.toString()).emit('task_assigned', task);
    }

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res, next) => {
  try {
    let query = {};

    // Executives only see their own tasks
    if (req.user.role === 'Field Executive') {
      query.assignedTo = req.user.id;
    } else if (req.user.role === 'Manager') {
      // Managers see tasks they assigned, or tasks assigned to executives they manage
      // First find all executives managed by this manager
      const User = require('../models/User');
      const managedUsers = await User.find({ manager: req.user.id }).select('_id');
      const managedIds = managedUsers.map(u => u._id);
      
      query.$or = [
        { assignedBy: req.user.id },
        { assignedTo: { $in: managedIds } }
      ];
    }

    // Optional status filter
    if (req.query.status) {
      query.status = req.query.status;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task details (Admin)
// @route   PUT /api/tasks/:id
// @access  Private/Admin/Manager
exports.updateTaskDetails = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }

    // Verify assignment permission
    if (req.user.role === 'Manager' && task.assignedBy.toString() !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized to edit this task');
    }

    const { title, description, assignedTo, dueDate, priority, status } = req.body;
    
    if (title) task.title = title;
    if (description) task.description = description;
    if (assignedTo) task.assignedTo = assignedTo;
    if (dueDate) task.dueDate = dueDate;
    if (priority) task.priority = priority;
    if (status) {
      task.status = status;
      if (status === 'Completed' && !task.completedAt) {
        task.completedAt = Date.now();
      } else if (status !== 'Completed') {
        task.completedAt = undefined;
      }
    }

    await task.save();

    // Create a database notification
    const notification = await Notification.create({
      recipient: task.assignedTo,
      sender: req.user.id,
      title: 'Task Updated',
      message: `The task "${task.title}" has been updated by the admin.`,
      type: 'Task',
    });

    if (req.io) {
      req.io.to(task.assignedTo.toString()).emit('notification', notification);
      req.io.to(task.assignedTo.toString()).emit('task_updated', task);
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task status
// @route   PUT /api/tasks/:id/status
// @access  Private
exports.updateTaskStatus = async (req, res, next) => {
  try {
    console.log('--- UPDATE TASK STATUS DEBUG ---');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body:', req.body);
    console.log('File:', req.file ? { filename: req.file.originalname, size: req.file.size } : 'None');
    
    const { notes } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }

    // Verify ownership/assignment
    if (
      req.user.role === 'Field Executive' &&
      task.assignedTo.toString() !== req.user.id
    ) {
      res.status(403);
      throw new Error('Not authorized to update this task');
    }

    if (!notes || !notes.trim()) {
      res.status(400);
      throw new Error('Follow-up notes are required to update task');
    }

    const status = req.body.status || (req.file ? 'Completed' : 'In Progress');

    const newUpdate = {
      notes: notes.trim(),
      statusAfterUpdate: status,
      createdAt: new Date(),
    };

    if (req.file) {
      newUpdate.photo = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    task.status = status;
    if (status === 'Completed') {
      task.completedAt = Date.now();
    } else {
      task.completedAt = undefined;
    }

    task.updates.push(newUpdate);
    await task.save();

    // Create a database notification
    const notificationTitle = status === 'Completed' ? 'Task Completed' : 'Task Update';
    const notificationMsg = status === 'Completed'
      ? `${req.user.name} completed the task "${task.title}" with image evidence.`
      : `${req.user.name} submitted a follow-up for "${task.title}": "${notes.substring(0, 50)}..."`;

    const notification = await Notification.create({
      recipient: task.assignedBy,
      sender: req.user.id,
      title: notificationTitle,
      message: notificationMsg,
      type: 'Task',
    });

    if (req.io) {
      req.io.to(task.assignedBy.toString()).emit('notification', notification);
      req.io.to(task.assignedBy.toString()).emit('task_updated', task);
      req.io.to(task.assignedTo.toString()).emit('task_updated', task);
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get task update photo
// @route   GET /api/tasks/:id/updates/:updateId/photo
// @access  Private
exports.getTaskUpdatePhoto = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }
    const update = task.updates.id(req.params.updateId);
    if (!update || !update.photo || !update.photo.data) {
      res.status(404);
      throw new Error('Photo not found');
    }
    res.set('Content-Type', update.photo.contentType || 'image/jpeg');
    res.send(update.photo.data);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin/Manager
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }

    // Verify assignment permission
    if (
      req.user.role === 'Manager' &&
      task.assignedBy.toString() !== req.user.id
    ) {
      res.status(403);
      throw new Error('Not authorized to delete this task');
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
