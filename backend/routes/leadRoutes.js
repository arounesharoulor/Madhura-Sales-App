const express = require('express');
const { createLead, getLeads, updateLeadStatus } = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createLead);
router.get('/', getLeads);
router.put('/:id/status', updateLeadStatus);

module.exports = router;
