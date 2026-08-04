const express = require('express');
const router = express.Router();
const { 
  getReceipts, 
  getNextReceiptDetails, 
  getReceiptById, 
  createReceipt, 
  updateReceipt, 
  deleteReceipt 
} = require('../controllers/paymentReceiptController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getReceipts);
router.route('/next-details').get(protect, getNextReceiptDetails);
router.route('/create').post(protect, createReceipt);
router.route('/:id').get(protect, getReceiptById).put(protect, updateReceipt).delete(protect, deleteReceipt);

module.exports = router;
