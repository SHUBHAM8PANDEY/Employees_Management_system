const express = require('express');
const router = express.Router();

const { protect: verifyToken, authorizeAdmin } = require('../middlewares/authMiddleware');

// Import audit controller
let auditController;
try {
    auditController = require('../controllers/auditController');
} catch (error) {
    console.error('❌ Failed to load auditController:', error.message);
    auditController = {
        getAuditLogs: (req, res) => res.json({ success: true, data: [], total: 0 }),
        getAuditSummary: (req, res) => res.json({ success: true, data: { total: 0, summary: [] } }),
        getUserActivity: (req, res) => res.json({ success: true, data: [] })
    };
}

// ============================================
// ROUTES
// ============================================

// ✅ GET AUDIT LOGS
router.get('/logs', verifyToken, authorizeAdmin, auditController.getAuditLogs);

// ✅ GET AUDIT SUMMARY
router.get('/summary', verifyToken, authorizeAdmin, auditController.getAuditSummary);

// ✅ GET USER ACTIVITY
router.get('/user/:code', verifyToken, authorizeAdmin, auditController.getUserActivity);

module.exports = router;