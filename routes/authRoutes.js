const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorizeAdmin } = require('../middlewares/authMiddleware');

// ============================================
// PUBLIC ROUTES
// ============================================
router.post('/login', authController.login);
router.get('/verify-token', protect, authController.verifyToken);

// ============================================
// PROTECTED ROUTES
// ============================================
router.post('/logout', protect, authController.logout);
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);
router.put('/profile/avatar', protect, authController.updateAvatar);

// ============================================
// ADMIN ROUTES
// ============================================
router.post('/force-logout/:employee_code', protect, authorizeAdmin, authController.forceLogout);
router.get('/active-sessions', protect, authorizeAdmin, authController.getActiveSessions);
router.get('/login-history', protect, authorizeAdmin, authController.getLoginHistory);

module.exports = router;