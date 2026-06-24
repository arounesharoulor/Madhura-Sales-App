const mongoose = require('mongoose');

const clientOnboardingSchema = new mongoose.Schema(
  {
    executive: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    businessName: { type: String, required: true },
    businessType: { type: String, required: true },
    gstNumber: { type: String, default: '' },
    ownerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
      latitude: Number,
      longitude: Number,
    },
    shopPhotoUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    followUpDate: { type: Date },
    onboardingDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClientOnboarding', clientOnboardingSchema);
