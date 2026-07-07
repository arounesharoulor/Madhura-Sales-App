const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Hash a token for safe storage in DB
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// @desc    Register a new user (self-registration as Field Executive)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, employeeId, designation } = req.body;
    const normalizedEmail = email ? email.toString().trim().toLowerCase() : '';

    if (!name || !normalizedEmail || !password) {
      res.status(400);
      throw new Error('Please provide name, email, and password');
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }

    let normalizedRole = !role ? 'Field Executive' : role.toString().trim();
    if (/^employee$/i.test(normalizedRole) || /^field\s*executive$/i.test(normalizedRole)) {
      normalizedRole = 'Field Executive';
    } else if (/^admin$/i.test(normalizedRole)) {
      normalizedRole = 'Admin';
    }
    // Allow self-registration for Admin and Field Executive (app treats Admin as elevated role).
    if (!['Field Executive', 'Admin', 'Project Manager', 'Team Lead', 'HR', 'Managing Director MD'].includes(normalizedRole)) {
      normalizedRole = 'Field Executive';
    }

    if (normalizedRole === 'Field Executive' && (!employeeId || !designation)) {
      res.status(400);
      throw new Error('Please provide employee ID and designation for Field Executives');
    }

    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const adminRoles = ['Admin', 'Project Manager', 'Team Lead', 'HR', 'Managing Director MD'];
    if (adminRoles.includes(normalizedRole)) {
      const existingUser = await User.findOne({
        email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' },
        role: { $in: adminRoles }
      });
      if (existingUser) {
        res.status(400);
        throw new Error('An Admin account with this email already exists');
      }
    } else {
      const existingExec = await User.findOne({ employeeId });
      if (existingExec) {
        res.status(400);
        throw new Error('An Employee with this 5-digit ID already exists');
      }
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone: phone ? phone.toString().trim() : '',
      role: normalizedRole,
      employeeId: employeeId ? employeeId.toString().trim() : '',
      designation: designation ? designation.toString().trim() : '',
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        employeeId: user.employeeId,
        designation: user.designation,
        profilePicture: user.profilePicture,
      },
    });

    // Notify all admins when a new Field Executive registers
    if (normalizedRole === 'Field Executive') {
      try {
        const Notification = require('../models/Notification');
        const admins = await User.find({ role: 'Admin', isActive: true }).select('_id');
        await Promise.all(
          admins.map(async (admin) => {
            const notif = await Notification.create({
              recipient: admin._id,
              sender: user._id,
              title: 'New Employee Registered',
              message: `${user.name} (ID: ${user.employeeId}, ${user.designation}) has registered and joined the platform.`,
              type: 'Alert',
            });
            if (req.io) req.io.to(admin._id.toString()).emit('notification', notif);
          })
        );
      } catch (notifErr) {
        console.error('Failed to notify admins on registration:', notifErr.message);
      }
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, employeeId, password, role } = req.body;

    const adminRoles = ['Admin', 'Project Manager', 'Team Lead', 'HR', 'Managing Director MD'];
    let user;
    if (adminRoles.includes(role)) {
      if (!email || !password) {
        res.status(400);
        throw new Error('Please provide email and password');
      }
      user = await User.findOne({ email, role: { $in: adminRoles } }).select('+password');
    } else {
      if (!employeeId || !password) {
        res.status(400);
        throw new Error('Please provide Employee ID and password');
      }
      user = await User.findOne({ employeeId, role: 'Field Executive' }).select('+password');
    }

    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      res.status(403);
      throw new Error('Your account is deactivated. Please contact admin.');
    }

    const token = generateToken(user._id);
    const tokenHash = hashToken(token);

    // Save active session token hash — this invalidates any other active session
    await User.findByIdAndUpdate(user._id, { activeSessionToken: tokenHash });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        employeeId: user.employeeId,
        designation: user.designation,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout — clear the active session token
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
      await User.findByIdAndUpdate(decoded.id, { activeSessionToken: null });
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch {
    // Always respond 200 on logout even if token is already expired
    res.status(200).json({ success: true, message: 'Logged out' });
  }
};

// @desc    Forgot password request
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      throw new Error('There is no user with that email');
    }

    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash and set resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // In a real application, you would send an email here.
    // For demonstration and simplified deployment, we will return the token in the API response.
    res.status(200).json({
      success: true,
      message: 'Reset token generated (Simulated email delivery)',
      resetToken, // Return token for development/demo ease
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    // Hash token from URL params
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      throw new Error('Invalid or expired reset token');
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
};
