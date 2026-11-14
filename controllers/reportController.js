const db = require('../models');
const LeaveRequest = db.LeaveRequest;
const Employee = db.Employee;
const LeaveLimit = db.LeaveLimit;
const {
    exportToExcel,
    formatLeaveReportData
} = require('../utils/excelExporter');

// Export leave report in Excel
const exportLeaveReportExcel = async (req, res) => {
    try {
        const { startDate, endDate, status, employeeCode } = req.query;

        const where = {};
        if (startDate && endDate) {
            where.start_date = { [db.Sequelize.Op.between]: [startDate, endDate] };
        }
        if (status) where.status = status;
        if (employeeCode) where.employee_code = employeeCode;

        const leaves = await LeaveRequest.findAll({
            where,
            order: [['applied_at', 'DESC']]
        });

        const employees = await Employee.findAll();
        const formattedData = formatLeaveReportData(leaves, employees);

        const excelBuffer = exportToExcel(formattedData, 'Leave Report');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Leave_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
        res.send(excelBuffer);
    } catch (error) {
        console.error('Export Excel error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get leave statistics
const getLeaveStatistics = async (req, res) => {
    try {
        const statuses = await LeaveRequest.findAll({
            attributes: ['status', [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']],
            group: ['status'], raw: true
        });
        const counts = new Map(statuses.map(row => [row.status, Number(row.count)]));
        const totalLeaves = statuses.reduce((total, row) => total + Number(row.count), 0);
        const pendingLeaves = counts.get('Pending') || 0;
        const approvedLeaves = counts.get('Approved') || 0;
        const rejectedLeaves = counts.get('Rejected') || 0;

        // Leave by type
        const leaveByType = await LeaveRequest.findAll({
            attributes: [
                'leave_type',
                [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
            ],
            group: ['leave_type']
        });

        // Monthly trends
        const monthlyTrends = await LeaveRequest.findAll({
            attributes: [
                [db.Sequelize.fn('TO_CHAR', db.Sequelize.col('applied_at'), 'YYYY-MM'), 'month'],
                [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
            ],
            group: [db.Sequelize.fn('TO_CHAR', db.Sequelize.col('applied_at'), 'YYYY-MM')],
            order: [[db.Sequelize.fn('TO_CHAR', db.Sequelize.col('applied_at'), 'YYYY-MM'), 'ASC']],
            limit: 12
        });

        res.json({
            totalLeaves,
            pendingLeaves,
            approvedLeaves,
            rejectedLeaves,
            leaveByType,
            monthlyTrends
        });
    } catch (error) {
        console.error('Statistics error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get employee leave summary
const getEmployeeLeaveSummary = async (req, res) => {
    try {
        const [employees, limits] = await Promise.all([
            Employee.findAll({ attributes: ['employee_code', 'first_name', 'last_name', 'email'] }),
            LeaveLimit.findAll()
        ]);
        const limitsByEmployee = new Map(limits.map(limit => [limit.employee_code, limit]));
        const summary = employees.map(emp => {
            const leaveLimit = limitsByEmployee.get(emp.employee_code);

            const sickTaken = leaveLimit?.sick_taken || 0;
            const sickLimit = leaveLimit?.sick_limit || 12;
            const casualTaken = leaveLimit?.casual_taken || 0;
            const casualLimit = leaveLimit?.casual_limit || 15;
            const paidTaken = leaveLimit?.paid_taken || 0;
            const paidLimit = leaveLimit?.paid_limit || 10;

            return {
                employee_code: emp.employee_code,
                name: `${emp.first_name} ${emp.last_name}`,
                email: emp.email,
                leaveBalance: {
                    sick: { total: sickLimit, taken: sickTaken, left: sickLimit - sickTaken },
                    casual: { total: casualLimit, taken: casualTaken, left: casualLimit - casualTaken },
                    paid: { total: paidLimit, taken: paidTaken, left: paidLimit - paidTaken }
                }
            };
        });

        res.json(summary);
    } catch (error) {
        console.error('Employee summary error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    exportLeaveReportExcel,
    getLeaveStatistics,
    getEmployeeLeaveSummary
};