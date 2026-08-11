const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    companyId: {
      type: String,
      default: 'company_madhura',
      index: true
    },
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxInvoice', required: true },
  amount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
