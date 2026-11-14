const db = require('../models');
const Employee = db.Employee;
const LeaveRequest = db.LeaveRequest;
const { sendEmail, getLeaveStatusEmailTemplate, mailConfigured, escapeHtml } = require('../utils/emailService');

// Send leave status email
const sendLeaveStatusEmail = async (req, res) => {
    try {
        if (!mailConfigured()) return res.status(503).json({ error: 'Email provider is not configured.' });
        const { leaveId } = req.body;

        const leaveRequest = await LeaveRequest.findByPk(leaveId);
        if (!leaveRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        const { status, comments } = leaveRequest;
        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Only decided requests can be emailed.' });
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
        res.status(502).json({ error: 'Email provider could not deliver the request.' });
    }
};

// Send bulk email notification
const sendBulkLeaveNotification = async (req, res) => {
    try {
        if (!mailConfigured()) return res.status(503).json({ error: 'Email provider is not configured.' });
        const { employeeCodes, subject, message } = req.body;
        if (!Array.isArray(employeeCodes) || !employeeCodes.length || employeeCodes.length > 50 ||
            employeeCodes.some(code => typeof code !== 'string' || !code.trim() || code.length > 100) ||
            typeof subject !== 'string' || !subject.trim() || subject.length > 200 ||
            typeof message !== 'string' || !message.trim() || message.length > 10000) {
            return res.status(400).json({ error: 'Enter 1–50 employee codes, a subject and a message.' });
        }

        const employees = await Employee.findAll({
            where: { employee_code: employeeCodes }
        });

        const missing = employeeCodes.filter(code => !employees.some(employee => employee.employee_code === code));
        if (missing.length) return res.status(404).json({ error: 'Unknown employee codes: ' + missing.join(', ') });

        const deliveries = await Promise.allSettled(employees.map(employee =>
            sendEmail(employee.email, subject.trim(), `<p>Dear ${escapeHtml(employee.first_name)},</p><p>${escapeHtml(message).replace(/\r?\n/g, '<br>')}</p>`)
        ));
        const failedCodes = employees.filter((_, index) => deliveries[index].status === 'rejected')
            .map(employee => employee.employee_code);
        const sent = employees.length - failedCodes.length;
        res.json({
            sent, failed: failedCodes.length,
            message: `Sent to ${sent} employee(s).` + (failedCodes.length ? ` Failed: ${failedCodes.join(', ')}.` : '')
        });
    } catch (error) {
        console.error('Bulk email error:', error);
        res.status(502).json({ error: 'Email provider could not deliver the request.' });
    }
};

module.exports = {
    sendLeaveStatusEmail,
    sendBulkLeaveNotification
};