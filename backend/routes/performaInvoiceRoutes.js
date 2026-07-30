const express = require('express');
const router = express.Router();
const { 
  getProformaInvoices, 
  getProformaInvoiceById, 
  createProformaInvoice, 
  updateProformaInvoice, 
  deleteProformaInvoice, 
  sendEmail 
} = require('../controllers/performaInvoiceController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getProformaInvoices);
router.route('/create').post(protect, createProformaInvoice);
router.route('/:id').get(protect, getProformaInvoiceById).put(protect, updateProformaInvoice).delete(protect, deleteProformaInvoice);
router.route('/send-email/:id').post(protect, sendEmail);

module.exports = router;
