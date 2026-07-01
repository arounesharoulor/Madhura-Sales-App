const express = require('express');
const router = express.Router();
const {
  generateReport,
  getReports,
  downloadReportExcel,
  sendReportEmail,
  generateCustomReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(generateReport)
  .get(getReports);

router.get('/:id/download', downloadReportExcel);
router.post('/custom-download', generateCustomReport);
router.post('/:id/send-email', authorize('Admin'), sendReportEmail);

module.exports = router;
