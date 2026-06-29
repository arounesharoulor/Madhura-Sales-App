const express = require('express');
const router = express.Router();
const {
  createFollowUp,
  getFollowUps,
  updateFollowUpStatus,
  assignFollowUp,
  getFollowUpAttachment,
} = require('../controllers/followUpController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

router.route('/')
  .post(createFollowUp)
  .get(getFollowUps);

router.put('/:id/assign', authorize('Admin'), assignFollowUp);
router.put('/:id/status', upload.single('attachment'), updateFollowUpStatus);
router.get('/:id/attachment', getFollowUpAttachment);

module.exports = router;
