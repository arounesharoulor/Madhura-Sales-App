const express = require('express');
const router = express.Router();
const { searchClients } = require('../controllers/crmClientController');
const { protect } = require('../middleware/authMiddleware');

router.get('/search', protect, searchClients);

module.exports = router;
