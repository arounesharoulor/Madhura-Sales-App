const express = require('express');
const router = express.Router();
const { createUpdate, getUpdates } = require('../controllers/workUpdateController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(authorize('Field Executive'), createUpdate)
  .get(getUpdates);

module.exports = router;
