const express = require('express');
const router = express.Router();
const { generateReport, getReports } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
// Access to Field Executive is now allowed; controller will filter data.

router.route('/')
  .post(generateReport)
  .get(getReports);

module.exports = router;
