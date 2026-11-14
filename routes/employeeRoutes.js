const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

const { protect: verifyToken, authorizeAdmin } = require('../middlewares/authMiddleware');

router.post('/add', verifyToken, authorizeAdmin, employeeController.addEmployee);
router.get('/all', verifyToken, authorizeAdmin, employeeController.getAllEmployees);
router.get('/me', verifyToken, employeeController.getMyProfile);
router.get('/:code', verifyToken, authorizeAdmin, employeeController.getEmployeeByCode);
router.put('/update/:code', verifyToken, authorizeAdmin, employeeController.updateEmployee);
router.put('/leave-limits/:code', verifyToken, authorizeAdmin, employeeController.updateLeaveLimits);
router.delete('/:code', verifyToken, authorizeAdmin, employeeController.deleteEmployee);

module.exports = router;