const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Auth middleware
const { protect: verifyToken, authorizeAdmin } = require('../middlewares/authMiddleware');

// Routes
router.get('/workspace-overview', verifyToken, authorizeAdmin, require('../controllers/workspaceOverviewController'));
router.get('/leave-report-excel', verifyToken, authorizeAdmin, reportController.exportLeaveReportExcel);
router.get('/statistics', verifyToken, authorizeAdmin, reportController.getLeaveStatistics);
router.get('/employee-summary', verifyToken, authorizeAdmin, reportController.getEmployeeLeaveSummary);

module.exports = router;