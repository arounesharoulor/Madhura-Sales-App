const express = require('express');
const router = express.Router();
const { getQuotations, createQuotation } = require('../controllers/quotationController');
const { protect } = require('../middleware/auth');
router.route('/').get(protect, getQuotations).post(protect, createQuotation);
module.exports = router;
