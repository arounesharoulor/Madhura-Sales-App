const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getAllAttendance,
  requestLeave,
  approveAttendance,
  rejectAttendance,
  holdAttendance,
  toggleEarlyCheckoutLock,
  exportAttendanceLog,
  getAttendanceSummary,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/checkin', authorize('Field Executive', 'Admin', 'HR', 'Project Manager', 'Team Lead', 'Managing Director MD'), checkIn);
router.put('/checkout', authorize('Field Executive', 'Admin', 'HR', 'Project Manager', 'Team Lead', 'Managing Director MD'), checkOut);
router.post('/leave', authorize('Field Executive', 'Admin', 'HR', 'Project Manager', 'Team Lead', 'Managing Director MD'), requestLeave);
router.get('/today', authorize('Field Executive', 'Admin', 'HR', 'Project Manager', 'Team Lead', 'Managing Director MD'), getTodayAttendance);
router.get('/my', authorize('Field Executive', 'Admin', 'HR', 'Project Manager', 'Team Lead', 'Managing Director MD'), getMyAttendance);
router.get('/export', authorize('Admin', 'Manager'), exportAttendanceLog);
router.get('/summary', authorize('Admin', 'Manager'), getAttendanceSummary);
router.get('/', authorize('Admin', 'Manager'), getAllAttendance);
router.put('/:id/approve', authorize('Admin'), approveAttendance);
router.put('/:id/reject', authorize('Admin'), rejectAttendance);
router.put('/:id/hold', authorize('Admin'), holdAttendance);
router.put('/user/:userId/lock-early-checkout', authorize('Admin'), toggleEarlyCheckoutLock);

module.exports = router;

