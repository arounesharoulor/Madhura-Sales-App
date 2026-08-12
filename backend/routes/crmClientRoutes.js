const express = require('express');
const router = express.Router();
const { searchClients } = require('../controllers/crmClientController');
const { getClientAggregatedData } = require('../controllers/clientDataAggregator');
const { protect } = require('../middleware/authMiddleware');

router.get('/search', protect, searchClients);
router.get('/:id/aggregated-data', protect, getClientAggregatedData);

module.exports = router;
