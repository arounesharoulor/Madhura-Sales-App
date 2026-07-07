const express = require('express');
const router = express.Router();
const { createMeeting, getMeetings, getMeetingById, updateMeeting } = require('../controllers/meetingController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

router.route('/')
  .post(upload.single('photo'), createMeeting)
  .get(getMeetings);

router.route('/:id')
  .get(getMeetingById)
  .put(upload.single('photo'), updateMeeting);

module.exports = router;
