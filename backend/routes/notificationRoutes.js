const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, broadcastNotification, notifyAdmins } = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getNotifications);
router.post('/broadcast', authorize('Admin', 'Manager'), broadcastNotification);
router.post('/admin', authorize('Field Executive'), notifyAdmins);
router.put('/:id/read', markAsRead);

module.exports = router;
