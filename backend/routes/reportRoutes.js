const express = require('express');
const router = express.Router();
const {
  generateReport,
  getReports,
  downloadReportExcel,
  sendReportEmail,
  generateCustomReport,
  updateReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(generateReport)
  .get(getReports);

router.get('/:id/download', downloadReportExcel);
router.post('/custom-download', generateCustomReport);
router.put('/:id', updateReport);
router.post('/:id/send-email', authorize('Admin', 'Project Manager', 'Team Lead', 'Managing Director MD'), sendReportEmail);

module.exports = router;
