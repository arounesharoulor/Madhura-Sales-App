const express = require('express');
const router = express.Router();
const {
  createTaskReport,
  getTaskReports,
  verifyTaskReport,
} = require('../controllers/taskReportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(authorize('Field Executive'), createTaskReport)
  .get(getTaskReports);

router.put('/:id/verify', authorize('Admin'), verifyTaskReport);

module.exports = router;
