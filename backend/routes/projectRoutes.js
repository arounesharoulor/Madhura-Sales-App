const express = require('express');
const router = express.Router();
const { getProjects, createProject } = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
router.route('/').get(protect, getProjects).post(protect, createProject);
module.exports = router;
