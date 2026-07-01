const express = require('express');
const router = express.Router();
const { onboardClient, getOnboardedClients, updateClient, deleteClient } = require('../controllers/onboardingController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(onboardClient)
  .get(getOnboardedClients);

router.route('/:id')
  .put(updateClient)
  .delete(deleteClient);

module.exports = router;
