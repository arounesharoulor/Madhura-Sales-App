const express = require('express');
const router = express.Router();
const { getQuotations, createQuotation } = require('../controllers/quotationController');
const { protect } = require('../middleware/authMiddleware');
router.route('/').get(protect, getQuotations).post(protect, createQuotation);
module.exports = router;
