const express = require('express');
const router = express.Router();
const { register, login, logout, forgotPassword, resetPassword, getDesignations, directResetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.get('/designations', getDesignations);
router.post('/login', login);
router.post('/logout', logout);   // clears active session
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.post('/directresetpassword', directResetPassword);

module.exports = router;
