const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customer_name: { type: String, required: true },
  mobile_number: { type: String, required: true },
  email: { type: String, default: '' },
  location_city: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
