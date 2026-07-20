const express = require('express');
const router = express.Router();
const { getProjects } = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
router.route('/').get(protect, getProjects);
module.exports = router;
