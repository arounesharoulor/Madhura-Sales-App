const express = require('express');
const router = express.Router();
const { createMeeting, getMeetings, getMeetingById } = require('../controllers/meetingController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

router.route('/')
  .post(authorize('Field Executive'), upload.single('photo'), createMeeting)
  .get(getMeetings);

router.get('/:id', getMeetingById);

module.exports = router;
