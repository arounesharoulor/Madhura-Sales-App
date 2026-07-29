const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company_name: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, required: true },
  address1: { type: String, default: '' },
  address2: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  gstin: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);