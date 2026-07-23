const express = require('express');
const router = express.Router();
const { createUser, getUsers, getUserById, updateProfile, toggleUserStatus, updateEmployeeRecord, uploadEmployeeDocument } = require('../controllers/userController');
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

router.put('/:id/record', updateEmployeeRecord);
router.post('/:id/documents', upload.single('document'), uploadEmployeeDocument);

module.exports = router;
