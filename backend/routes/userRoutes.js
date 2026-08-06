const express = require('express');
const router = express.Router();
const { createUser, getUsers, getUserById, updateProfile, toggleUserStatus, updateEmployeeRecord, uploadEmployeeDocument, approveUser, updateEmployeeId, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

router.route('/')
  .post(authorize('Admin'), createUser)
  .get(getUsers);

router.put('/profile', upload.single('profilePicture'), updateProfile);

router.route('/:id')
  .get(getUserById)
  .delete(authorize('Super Admin', 'Admin', 'Managing Director MD'), deleteUser);

router.put('/:id/toggle', authorize('Super Admin', 'Admin', 'Managing Director MD'), toggleUserStatus);
router.put('/:id/approve', authorize('Super Admin', 'Admin', 'Managing Director MD'), approveUser);
router.put('/:id/employeeId', authorize('Super Admin', 'Admin', 'Managing Director MD'), updateEmployeeId);
router.put('/:id/record', authorize('Super Admin', 'Admin', 'HR', 'Managing Director MD'), updateEmployeeRecord);
router.post('/:id/documents', authorize('Super Admin', 'Admin', 'HR', 'Managing Director MD'), upload.single('document'), uploadEmployeeDocument);

module.exports = router;
