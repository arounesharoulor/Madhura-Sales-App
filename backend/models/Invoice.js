const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientOnboarding', required: true },
  
  // Snapshots for invoice immutability
  companyName: { type: String },
  contactName: { type: String },
  address: { type: String },
  gstin: { type: String },
  
  // Auto-generated fields
  serviceType: { type: String },
  serviceNo: { type: String },
  invoiceNo: { type: String, required: true, unique: true },
  clientCode: { type: String },
  runningBillNo: { type: String },
  
  billDate: { type: Date, default: Date.now },
  advanceAmountReceived: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },

  status: { type: String, default: 'Draft' }, // Draft, Sent, Paid, Overdue
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
