const express = require('express');
const router = express.Router();
const { createTask, getTasks, updateTaskStatus, updateTaskDetails, deleteTask, getTaskUpdatePhoto } = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

router.route('/')
  .post(authorize('Admin', 'Manager'), createTask)
  .get(getTasks);

router.put('/:id/status', upload.single('photo'), updateTaskStatus);

router.put('/:id', authorize('Admin', 'Manager'), updateTaskDetails);

router.get('/:id/updates/:updateId/photo', getTaskUpdatePhoto);

router.delete('/:id', authorize('Admin', 'Manager'), deleteTask);

module.exports = router;
