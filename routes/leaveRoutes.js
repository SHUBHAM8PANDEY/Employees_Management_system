const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');

const { protect: verifyToken, authorizeAdmin } = require('../middlewares/authMiddleware');

router.get('/admin/all-requests', verifyToken, authorizeAdmin, leaveController.getAllRequests);
router.post('/apply', verifyToken, leaveController.applyLeave);
router.get('/my-leaves', verifyToken, leaveController.getMyLeaves);
router.put('/admin/status/:id', verifyToken, authorizeAdmin, leaveController.updateStatus);
router.put('/edit/:id', verifyToken, authorizeAdmin, leaveController.editLeave);

module.exports = router;