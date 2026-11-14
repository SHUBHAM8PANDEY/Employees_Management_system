const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

// Auth middleware
const { protect: verifyToken, authorizeAdmin } = require('../middlewares/authMiddleware');

// Routes
router.post('/send-leave-status', verifyToken, authorizeAdmin, emailController.sendLeaveStatusEmail);
router.post('/send-bulk-notification', verifyToken, authorizeAdmin, emailController.sendBulkLeaveNotification);

module.exports = router;