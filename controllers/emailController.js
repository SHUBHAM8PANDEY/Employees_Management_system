const db = require('../models');
const Employee = db.Employee;
const LeaveRequest = db.LeaveRequest;
const { sendEmail, getLeaveStatusEmailTemplate } = require('../utils/emailService');

// Send leave status email
const sendLeaveStatusEmail = async (req, res) => {
    try {
        const { leaveId, status, comments } = req.body;

        const leaveRequest = await LeaveRequest.findByPk(leaveId);
        if (!leaveRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        const employee = await Employee.findOne({
            where: { employee_code: leaveRequest.employee_code }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const employeeName = `${employee.first_name} ${employee.last_name}`;
        const subject = `Leave Request ${status} - ${employeeName}`;
        const html = getLeaveStatusEmailTemplate(
            employeeName,
            {
                leave_type: leaveRequest.leave_type,
                start_date: leaveRequest.start_date,
                end_date: leaveRequest.end_date,
                days: leaveRequest.days,
                reason: leaveRequest.reason
            },
            status,
            comments
        );

        await sendEmail(employee.email, subject, html);

        res.json({
            message: `✅ Email sent to ${employee.email}`,
            success: true
        });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Send bulk email notification
const sendBulkLeaveNotification = async (req, res) => {
    try {
        const { employeeCodes, subject, message } = req.body;

        const employees = await Employee.findAll({
            where: { employee_code: employeeCodes }
        });

        const emailPromises = employees.map(emp => {
            const html = `
                <h2>📢 Leave Notification</h2>
                <p>Dear ${emp.first_name} ${emp.last_name},</p>
                <p>${message}</p>
                <p>Please check your leave balance and plan accordingly.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">View Dashboard</a>
            `;
            return sendEmail(emp.email, subject, html);
        });

        await Promise.all(emailPromises);

        res.json({
            message: `✅ Emails sent to ${employees.length} employees`,
            success: true
        });
    } catch (error) {
        console.error('Bulk email error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    sendLeaveStatusEmail,
    sendBulkLeaveNotification
};