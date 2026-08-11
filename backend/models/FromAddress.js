const mongoose = require('mongoose');

const fromAddressSchema = new mongoose.Schema({
    companyId: {
      type: String,
      default: 'company_madhura',
      index: true
    },
  label: { type: String, required: true },
  address: { type: String, required: true },
  is_default: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('FromAddress', fromAddressSchema);
