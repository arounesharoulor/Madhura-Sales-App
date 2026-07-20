const express = require('express');
const router = express.Router();
const { getQuotations, createQuotation, updateQuotation } = require('../controllers/quotationController');
const { protect } = require('../middleware/authMiddleware');
router.route('/').get(protect, getQuotations).post(protect, createQuotation);
router.route('/:id').put(protect, updateQuotation);
module.exports = router;
