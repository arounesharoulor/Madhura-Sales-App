const express = require('express');
const router = express.Router();
const { provisionTenant, enableTenant, disableTenant, getTenantStatus } = require('../controllers/internalTenantController');
const { internalApiAuth } = require('../middleware/tenantMiddleware');

router.use(internalApiAuth);

router.post('/provision', provisionTenant);
router.get('/:companyId', getTenantStatus);
router.post('/:companyId/enable', enableTenant);
router.post('/:companyId/disable', disableTenant);

module.exports = router;
