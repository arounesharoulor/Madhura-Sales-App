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
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/checkin', authorize('Field Executive'), checkIn);
router.put('/checkout', authorize('Field Executive'), checkOut);
router.post('/leave', authorize('Field Executive'), requestLeave);
router.get('/today', authorize('Field Executive'), getTodayAttendance);
router.get('/my', authorize('Field Executive'), getMyAttendance);
router.get('/', authorize('Admin', 'Manager'), getAllAttendance);
router.put('/:id/approve', authorize('Admin'), approveAttendance);
router.put('/:id/reject', authorize('Admin'), rejectAttendance);
router.put('/:id/hold', authorize('Admin'), holdAttendance);

module.exports = router;
