const express = require('express');
const router = express.Router();
const { onboardClient, getOnboardedClients } = require('../controllers/onboardingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(authorize('Field Executive'), onboardClient)
  .get(getOnboardedClients);

module.exports = router;
