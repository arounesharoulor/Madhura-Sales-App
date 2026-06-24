const express = require('express');
const router = express.Router();
const { createFollowUp, getFollowUps, updateFollowUpStatus } = require('../controllers/followUpController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(createFollowUp)
  .get(getFollowUps);

router.put('/:id/status', updateFollowUpStatus);

module.exports = router;
