const mongoose = require('mongoose');

const paymentReceiptItemSchema = new mongoose.Schema({
    companyId: {
      type: String,
      default: 'company_madhura',
      index: true
    },
  sl_no: { type: Number, required: true },
  service_name: { type: String, required: true },
  total_amount: { type: Number, required: true },
  advance_amount: { type: Number, default: 0 },
  received_amount: { type: Number, required: true }
});

const paymentReceiptSchema = new mongoose.Schema({
  receipt_no: { type: String, required: true, unique: true },
  receipt_date: { type: Date, required: true, default: Date.now },
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxInvoice' },
  invoice_no: { type: String, required: true },
  service_no: { type: String, required: true },
  payment_date: { type: Date, required: true, default: Date.now },
  payment_method: { type: String, required: true, default: 'GOOGLE PAY' },
  // Account details
  account_name: { type: String, default: 'Madhura Technologies Private Limited' },
  account_type: { type: String, default: 'Current Account' },
  bank_name: { type: String, default: 'Axis Bank, Aruppukottai' },
  account_number: { type: String, default: '925020029656189' },
  ifsc_code: { type: String, default: 'UTIB0002029' },
  // Billed To details
  client_company: { type: String, default: '' },
  client_name: { type: String, default: '' },
  client_address: { type: String, default: '' },
  // Table Items
  items: [paymentReceiptItemSchema],
  total_amount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('PaymentReceipt', paymentReceiptSchema);
