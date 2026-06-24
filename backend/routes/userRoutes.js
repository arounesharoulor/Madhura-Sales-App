const express = require('express');
const router = express.Router();
const { createUser, getUsers, getUserById, updateProfile, toggleUserStatus } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

router.route('/')
  .post(authorize('Admin'), createUser)
  .get(getUsers);

router.put('/profile', upload.single('profilePicture'), updateProfile);

router.route('/:id')
  .get(getUserById)
  .delete(authorize('Admin'), toggleUserStatus);

module.exports = router;
