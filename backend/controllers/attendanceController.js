const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Helper: notify all admins
const notifyAdmins = async (io, senderId, title, message, type = 'Alert') => {
  try {
    const admins = await User.find({ role: 'Admin', isActive: true }).select('_id');
    await Promise.all(
      admins.map(async (admin) => {
        const notif = await Notification.create({
          recipient: admin._id,
          sender: senderId,
          title,
          message,
          type,
        });
        if (io) io.to(admin._id.toString()).emit('notification', notif);
      })
    );
  } catch (err) {
    console.error('Failed to notify admins:', err.message);
  }
};

// Helper: emit attendance_updated to all admins
const emitAttendanceUpdate = async (io, payload) => {
  if (!io) return;
  try {
    const admins = await User.find({ role: 'Admin', isActive: true }).select('_id');
    admins.forEach(a => io.to(a._id.toString()).emit('attendance_updated', payload));
  } catch (e) {
    console.error('emitAttendanceUpdate failed (non-fatal):', e.message);
  }
};

// @desc    Check in for today
// @route   POST /api/attendance/checkin
// @access  Private/FieldExecutive
exports.checkIn = async (req, res, next) => {
  try {
    const { workPlan, latitude, longitude } = req.body;

    if (!workPlan || !workPlan.trim()) {
      res.status(400);
      throw new Error('Work plan description is required for check-in');
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Prevent duplicate check-in
    const existing = await Attendance.findOne({ executive: req.user.id, date: today });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted attendance/leave request for today.',
        data: existing,
      });
    }

    const attendance = await Attendance.create({
      executive: req.user.id,
      date: today,
      checkInTime: new Date(),
      workPlan: workPlan.trim(),
      checkInLocation: {
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      },
      status: 'Pending Check-In',
      checkInStatus: 'Pending',
    });

    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    await notifyAdmins(
      req.io,
      req.user.id,
      'Check-in Request',
      `${req.user.name} requested Check-in at ${timeStr}. Plan: ${workPlan.substring(0, 80)}`,
      'Alert'
    );

    // Real-time: push new attendance to all admins & employee
    await emitAttendanceUpdate(req.io, { executiveId: req.user.id, action: 'checkin' });
    if (req.io) req.io.to(req.user.id.toString()).emit('attendance_updated', { action: 'checkin' });

    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

// @desc    Check out for today
// @route   PUT /api/attendance/checkout
// @access  Private/FieldExecutive
exports.checkOut = async (req, res, next) => {
  try {
    const { workSummary, latitude, longitude, earlyCheckoutReason } = req.body;

    if (!workSummary || !workSummary.trim()) {
      res.status(400);
      throw new Error('Work summary is required for check-out');
    }

    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({ executive: req.user.id, date: today });

    if (!attendance) {
      res.status(404);
      throw new Error('No check-in record found for today. Please check in first.');
    }

    if (attendance.checkInStatus !== 'Approved') {
      res.status(400);
      throw new Error('Your check-in has not been approved by the Admin yet.');
    }

    if (attendance.status === 'Checked Out' || attendance.status === 'Pending Check-Out') {
      return res.status(400).json({ success: false, message: 'Check-out already pending or completed.' });
    }

    // ── Early Checkout Detection ─────────────────────────
    // IST = UTC + 5h30m. Calculate IST hour directly from UTC to avoid
    // toLocaleString timezone issues on Node.js environments without full ICU.
    const nowUTC = new Date();
    const ISTOffsetMs = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(nowUTC.getTime() + ISTOffsetMs);
    const officeEndHour = 18; // 6 PM IST
    const isEarly = nowIST.getUTCHours() < officeEndHour;

    if (isEarly) {
      // Check if admin has locked this employee's early checkout
      const employee = await User.findById(req.user.id).select('earlyCheckoutLocked name');
      if (employee?.earlyCheckoutLocked) {
        return res.status(403).json({
          success: false,
          message: 'Early check-out is locked for your account by the Admin. Please contact your administrator.',
        });
      }

      // Require a reason for early checkout
      if (!earlyCheckoutReason || !earlyCheckoutReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'You are checking out before 6:00 PM. A reason is required for early checkout.',
          isEarly: true,
        });
      }

      // Increment earlyCheckoutCount on the User
      await User.findByIdAndUpdate(req.user.id, { $inc: { earlyCheckoutCount: 1 } });

      attendance.earlyCheckout = true;
      attendance.earlyCheckoutReason = earlyCheckoutReason.trim();
    }
    // ─────────────────────────────────────────────────────

    attendance.checkOutTime = new Date();
    attendance.workSummary = workSummary.trim();
    attendance.checkOutLocation = {
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
    };
    attendance.status = 'Pending Check-Out';
    attendance.checkOutStatus = 'Pending';
    await attendance.save();

    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const locStr =
      latitude && longitude ? `Lat: ${Number(latitude).toFixed(4)}, Lng: ${Number(longitude).toFixed(4)}` : 'Location unavailable';

    const earlyNote = isEarly ? ` ⚠️ EARLY CHECKOUT — Reason: ${earlyCheckoutReason?.substring(0, 60) || 'N/A'}` : '';

    await notifyAdmins(
      req.io,
      req.user.id,
      isEarly ? '⚠️ Early Check-out Request' : 'Check-out Request',
      `${req.user.name} requested Check-out at ${timeStr}. Location: ${locStr}. Summary: ${workSummary.substring(0, 80)}${earlyNote}`,
      isEarly ? 'Warning' : 'Info'
    );

    // Real-time: push checkout update to all admins & employee
    await emitAttendanceUpdate(req.io, { executiveId: req.user.id, action: 'checkout' });
    if (req.io) req.io.to(req.user.id.toString()).emit('attendance_updated', { action: 'checkout' });

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};


// @desc    Get today's attendance for logged-in executive
// @route   GET /api/attendance/today
// @access  Private/FieldExecutive
exports.getTodayAttendance = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({ executive: req.user.id, date: today })
      .populate('executive', 'earlyCheckoutLocked');
    res.status(200).json({ success: true, data: attendance || null });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance history for logged-in executive
// @route   GET /api/attendance/my
// @access  Private/FieldExecutive
exports.getMyAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.find({ executive: req.user.id }).sort({ date: -1 });
    res.status(200).json({ success: true, data: attendance || [] });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all attendance records (admin view)
// @route   GET /api/attendance
// @access  Private/Admin
exports.getAllAttendance = async (req, res, next) => {
  try {
    const { date, executiveId } = req.query;
    let query = {};
    if (date) query.date = date;
    if (executiveId) query.executive = executiveId;

    const records = await Attendance.find(query)
      .populate('executive', 'name email phone employeeId designation earlyCheckoutLocked')
      .sort({ date: -1, checkInTime: -1 });

    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
};

// @desc    Request leave for today
// @route   POST /api/attendance/leave
// @access  Private/FieldExecutive
exports.requestLeave = async (req, res, next) => {
  try {
    const { leaveType, leaveReason } = req.body;

    if (!leaveType || !leaveReason) {
      res.status(400);
      throw new Error('Leave type and reason are required');
    }

    const today = new Date().toISOString().split('T')[0];

    const existing = await Attendance.findOne({ executive: req.user.id, date: today });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted attendance/leave request for today.',
        data: existing,
      });
    }

    const attendance = await Attendance.create({
      executive: req.user.id,
      date: today,
      status: 'Pending Leave',
      leaveStatus: 'Pending',
      leaveType,
      leaveReason,
    });

    await notifyAdmins(
      req.io,
      req.user.id,
      'Leave Request Submitted',
      `${req.user.name} requested leave: "${leaveType}". Reason: "${leaveReason}"`,
      'Warning'
    );

    // Real-time: push leave request to all admins & employee
    await emitAttendanceUpdate(req.io, { executiveId: req.user.id, action: 'leave_request' });
    if (req.io) req.io.to(req.user.id.toString()).emit('attendance_updated', { action: 'leave_request' });

    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve attendance/leave action
// @route   PUT /api/attendance/:id/approve
// @access  Private/Admin
exports.approveAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id).populate('executive', 'name');
    if (!attendance) {
      res.status(404);
      throw new Error('Attendance record not found');
    }

    // Safe executive ID — works whether populated or just ObjectId
    const executiveId = attendance.executive?._id ?? attendance.executive;
    if (!executiveId) {
      res.status(404);
      throw new Error('Employee linked to this attendance record no longer exists');
    }

    let action = '';
    if (attendance.status === 'Pending Check-In' || attendance.checkInStatus === 'Pending' || attendance.checkInStatus === 'Held') {
      attendance.status = 'Checked In';
      attendance.checkInStatus = 'Approved';
      action = 'Check-In Approved';
    } else if (attendance.status === 'Pending Check-Out' || attendance.checkOutStatus === 'Pending' || attendance.checkOutStatus === 'Held') {
      attendance.status = 'Checked Out';
      attendance.checkOutStatus = 'Approved';
      action = 'Check-Out Approved';
    } else if (attendance.status === 'Pending Leave' || attendance.leaveStatus === 'Pending' || attendance.leaveStatus === 'Held') {
      attendance.status = 'On Leave';
      attendance.leaveStatus = 'Approved';
      action = 'Leave Approved';
    } else {
      res.status(400);
      throw new Error('No pending action to approve for this record');
    }

    await attendance.save();

    // Notify employee (wrapped so a notification failure never blocks the response)
    try {
      const notif = await Notification.create({
        recipient: executiveId,
        sender: req.user.id,
        title: action,
        message: `Your ${action.toLowerCase()} for ${attendance.date} has been approved by the Admin.`,
        type: 'Success',
      });
      if (req.io) req.io.to(executiveId.toString()).emit('notification', notif);
    } catch (notifErr) {
      console.error('Notification creation failed (non-fatal):', notifErr.message);
    }

    // Real-time: push approval to employee and all admins
    if (req.io) req.io.to(executiveId.toString()).emit('attendance_updated', { attendanceId: attendance._id, action });
    await emitAttendanceUpdate(req.io, { attendanceId: attendance._id, executiveId: executiveId.toString(), action });

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject attendance/leave action
// @route   PUT /api/attendance/:id/reject
// @access  Private/Admin
exports.rejectAttendance = async (req, res, next) => {
  try {
    const { feedback } = req.body;
    const attendance = await Attendance.findById(req.params.id).populate('executive', 'name');
    if (!attendance) {
      res.status(404);
      throw new Error('Attendance record not found');
    }

    // Safe executive ID — works whether populated or just ObjectId
    const executiveId = attendance.executive?._id ?? attendance.executive;
    if (!executiveId) {
      res.status(404);
      throw new Error('Employee linked to this attendance record no longer exists');
    }

    let action = '';
    if (attendance.status === 'Pending Check-In' || attendance.checkInStatus === 'Pending' || attendance.checkInStatus === 'Held') {
      attendance.status = 'Rejected Check-In';
      attendance.checkInStatus = 'Rejected';
      action = 'Check-In Rejected';
    } else if (attendance.status === 'Pending Check-Out' || attendance.checkOutStatus === 'Pending' || attendance.checkOutStatus === 'Held') {
      // Revert back to checked in since checkout was rejected
      attendance.status = 'Checked In';
      attendance.checkOutStatus = 'Rejected';
      action = 'Check-Out Rejected';
    } else if (attendance.status === 'Pending Leave' || attendance.leaveStatus === 'Pending' || attendance.leaveStatus === 'Held') {
      attendance.status = 'Rejected Leave';
      attendance.leaveStatus = 'Rejected';
      action = 'Leave Rejected';
    } else {
      res.status(400);
      throw new Error('No pending action to reject for this record');
    }

    await attendance.save();

    // Notify employee (wrapped so a notification failure never blocks the response)
    try {
      const notif = await Notification.create({
        recipient: executiveId,
        sender: req.user.id,
        title: action,
        message: `Your ${action.toLowerCase()} request for ${attendance.date} has been rejected.${
          feedback ? ` Reason: ${feedback}` : ''
        }`,
        type: 'Warning',
      });
      if (req.io) req.io.to(executiveId.toString()).emit('notification', notif);
    } catch (notifErr) {
      console.error('Notification creation failed (non-fatal):', notifErr.message);
    }

    // Real-time: push rejection to employee and all admins
    if (req.io) req.io.to(executiveId.toString()).emit('attendance_updated', { attendanceId: attendance._id, action });
    await emitAttendanceUpdate(req.io, { attendanceId: attendance._id, executiveId: executiveId.toString(), action });

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

// @desc    Hold attendance/leave action (keep in queue)
// @route   PUT /api/attendance/:id/hold
// @access  Private/Admin
exports.holdAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id).populate('executive', 'name');
    if (!attendance) {
      res.status(404);
      throw new Error('Attendance record not found');
    }

    let action = '';
    if (attendance.status === 'Pending Check-In' || attendance.status === 'Rejected Check-In' || attendance.checkInStatus === 'Pending' || attendance.checkInStatus === 'Rejected') {
      // Keep status as 'Pending Check-In' or revert to it
      attendance.status = 'Pending Check-In';
      attendance.checkInStatus = 'Held';
      action = 'Check-In Held in Queue';
    } else if (attendance.status === 'Pending Check-Out' || attendance.status === 'Rejected Check-Out' || attendance.checkOutStatus === 'Pending' || attendance.checkOutStatus === 'Rejected') {
      attendance.status = 'Pending Check-Out';
      attendance.checkOutStatus = 'Held';
      action = 'Check-Out Held in Queue';
    } else if (attendance.status === 'Pending Leave' || attendance.status === 'Rejected Leave' || attendance.leaveStatus === 'Pending' || attendance.leaveStatus === 'Rejected') {
      attendance.status = 'Pending Leave';
      attendance.leaveStatus = 'Held';
      action = 'Leave Held in Queue';
    } else {
      res.status(400);
      throw new Error('No pending action to hold');
    }

    await attendance.save();

    // Real-time: push hold update to all admins
    const heldExecId = attendance.executive?._id ?? attendance.executive;
    if (heldExecId && req.io) req.io.to(heldExecId.toString()).emit('attendance_updated', { attendanceId: attendance._id, action });
    await emitAttendanceUpdate(req.io, { attendanceId: attendance._id, action });

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle early checkout lock for an employee (Admin only)
// @route   PUT /api/attendance/user/:userId/lock-early-checkout
// @access  Private/Admin
exports.toggleEarlyCheckoutLock = async (req, res, next) => {
  try {
    const { locked } = req.body; // true = lock, false = unlock
    const employee = await User.findById(req.params.userId).select('name earlyCheckoutLocked earlyCheckoutCount');
    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    const newLockState = locked !== undefined ? locked : !employee.earlyCheckoutLocked;
    employee.earlyCheckoutLocked = newLockState;
    await employee.save();

    res.status(200).json({
      success: true,
      message: `Early checkout has been ${newLockState ? 'LOCKED 🔒' : 'UNLOCKED 🔓'} for ${employee.name}`,
      data: {
        userId: employee._id,
        name: employee.name,
        earlyCheckoutLocked: employee.earlyCheckoutLocked,
        earlyCheckoutCount: employee.earlyCheckoutCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export attendance log to Excel
// @route   GET /api/attendance/export
// @access  Private/Admin
exports.exportAttendanceLog = async (req, res, next) => {
  try {
    const ExcelJS = require('exceljs');
    const users = await User.find({ isActive: true }).select('name employeeId designation role address');
    const records = await Attendance.find();
    
    // Aggregate by employee
    const summary = {};
    users.forEach(u => {
      const empId = u._id.toString();
      summary[empId] = {
        name: u.name,
        employeeId: u.employeeId || 'N/A',
        designation: u.designation || 'N/A',
        role: u.role || 'N/A',
        address: u.address || 'N/A',
        present: 0,
        leave: 0,
        earlyCheckout: 0
      };
    });

    records.forEach(r => {
      if (!r.executive) return;
      const empId = r.executive.toString();
      if (summary[empId]) {
        if (r.status === 'Checked Out' || r.status === 'Checked In') summary[empId].present++;
        if (r.status === 'On Leave') summary[empId].leave++;
        if (r.earlyCheckout) summary[empId].earlyCheckout++;
      }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance Summary');
    
    sheet.columns = [
      { header: 'Employee Name', key: 'name', width: 25 },
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Days Present', key: 'present', width: 15 },
      { header: 'Leaves Taken', key: 'leave', width: 15 },
      { header: 'Early Checkouts', key: 'earlyCheckout', width: 18 },
    ];
    
    sheet.getRow(1).font = { bold: true };
    
    Object.values(summary).forEach(emp => {
      sheet.addRow(emp);
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Disposition', 'attachment; filename="Attendance_Log.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

