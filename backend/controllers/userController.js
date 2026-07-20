const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/helpers');

// @desc    Create a new user (Admin / Super Admin only)
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, manager, designation } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this email');
    }

    const userData = { name, email, password, role, phone, designation };
    if (manager) userData.manager = manager;

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (with filters)
// @route   GET /api/users
// @access  Private
exports.getUsers = async (req, res, next) => {
  try {
    let query = {};

    // Managers see only their executives
    if (req.user.role === 'Manager') {
      query.manager = req.user.id;
    }

    // Support optional role filtering
    if (req.query.role) {
      query.role = req.query.role;
    }

    const users = await User.find(query).populate('manager', 'name email').lean();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('manager', 'name email');

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    user.employeeId = req.body.employeeId || user.employeeId;
    user.designation = req.body.designation || user.designation;
    user.address = req.body.address || user.address;

    if (req.body.isLiveLocationShared !== undefined) {
      user.isLiveLocationShared = req.body.isLiveLocationShared;
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    // Profile photo upload
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'profile_pics');
      user.profilePicture = result.secure_url;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        employeeId: updatedUser.employeeId,
        designation: updatedUser.designation,
        address: updatedUser.address,
        profilePicture: updatedUser.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user status (Active/Inactive)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User status changed to ${user.isActive ? 'Active' : 'Inactive'}`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
