const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const attendanceExportController = require('../controllers/attendanceExportController');

const { protect: verifyToken, authorizeAdmin } = require('../middlewares/authMiddleware');

// ============================================
// EMPLOYEE ROUTES
// ============================================
router.post('/punch-in', verifyToken, attendanceController.punchIn);
router.post('/punch-out', verifyToken, attendanceController.punchOut);
router.get('/today', verifyToken, attendanceController.getTodayAttendance);
router.get('/history', verifyToken, attendanceController.getAttendanceHistory);
router.get('/stats', verifyToken, attendanceController.getAttendanceStats);

// EXPORT ROUTES
router.get('/export/options', verifyToken, attendanceExportController.getExportOptions);
router.get('/export/excel', verifyToken, attendanceExportController.exportAttendanceExcel);
router.get('/export/pdf', verifyToken, attendanceExportController.exportAttendancePDF);

// ============================================
// HR/ADMIN ROUTES
// ============================================
router.get('/admin/export/team', verifyToken, authorizeAdmin, attendanceExportController.exportTeamAttendance);
router.get('/admin/employee/:code/calendar', verifyToken, authorizeAdmin, attendanceController.getEmployeeCalendar);
router.get('/admin/all', verifyToken, authorizeAdmin, attendanceController.getAllEmployeeAttendance);
router.put('/admin/edit/:id', verifyToken, authorizeAdmin, attendanceController.editAttendance);
router.post('/admin/mark', verifyToken, authorizeAdmin, attendanceController.markAttendance);

// ADMIN EXPORT ROUTES
router.get('/admin/export/excel', verifyToken, authorizeAdmin, attendanceExportController.exportAttendanceExcel);
router.get('/admin/export/pdf', verifyToken, authorizeAdmin, attendanceExportController.exportAttendancePDF);

module.exports = router;
