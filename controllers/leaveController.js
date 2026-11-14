const db = require('../models');
const { sendEmail, getLeaveStatusEmailTemplate } = require('../utils/emailService');
const LeaveRequest = db.LeaveRequest;
const Employee = db.Employee;
const LeaveLimit = db.LeaveLimit;
const User = db.User;
const { Op } = require('sequelize');
const {
    getLeaveBalanceForEmployee,
    getBalanceKeyFromLeaveType
} = require('../utils/leaveBalanceHelper');
const auditLogger = require('../utils/auditLogger');
const notificationHelper = require('../utils/notificationHelper');

// ============================================
// APPLY LEAVE
// ============================================
const applyLeave = async (req, res) => {
    try {
        const { leave_type, start_date, end_date, reason } = req.body;

        const activeEmpCode = req.user.employee_code;
        if (!activeEmpCode) {
            return res.status(400).json({ error: 'Employee code missing!' });
        }

        const validDate = value => {
            if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
            const date = new Date(value);
            return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
        };
        if (!validDate(start_date) || !validDate(end_date) || typeof reason !== 'string' || !reason.trim()) {
            return res.status(400).json({ error: 'Enter valid leave dates and a reason.' });
        }
        if (!['Sick Leave', 'Casual Leave', 'Paid Leave'].includes(leave_type)) {
            return res.status(400).json({ error: 'Choose a valid leave type.' });
        }
        const inputDays = (Date.parse(end_date) - Date.parse(start_date)) / 86400000 + 1;
        if (inputDays <= 0) {
            return res.status(400).json({ error: 'Minimum 1 day required' });
        }

        const balanceKey = getBalanceKeyFromLeaveType(leave_type);
        const leaveBalance = await getLeaveBalanceForEmployee(activeEmpCode);
        const remaining = leaveBalance[balanceKey]?.left ?? 0;

        if (inputDays > remaining) {
            return res.status(400).json({
                error: `Insufficient ${leave_type} balance. Only ${remaining} day(s) remaining.`
            });
        }

        const newLeave = await LeaveRequest.create({
            employee_code: activeEmpCode,
            leave_type,
            start_date,
            end_date,
            reason,
            days: inputDays,
            status: 'Pending',
            applied_at: new Date()
        });

        // Audit Log
        await auditLogger.log({
            employee_code: activeEmpCode,
            action: 'CREATE',
            entity_type: 'Leave',
            entity_id: newLeave.id,
            new_data: { leave_type, start_date, end_date, days: inputDays, reason },
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent']
        });

        // Notification to admins
        try {
            const employee = await Employee.findOne({
                where: { employee_code: activeEmpCode }
            });
            const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : activeEmpCode;

            const admins = await User.findAll({
                where: { role: ['Admin', 'HR'] },
                attributes: ['employee_code']
            });

            for (const admin of admins) {
                await notificationHelper.create({
                    employee_code: admin.employee_code,
                    type: 'LEAVE_APPLIED',
                    title: '📝 Leave Request Submitted',
                    message: `${employeeName} applied for ${leave_type} (${inputDays} days)`,
                    link: '/dashboard?tab=leaves',
                    icon: '📝',
                    color: 'blue'
                });
            }
        } catch (notifError) {
            console.error('Notification error:', notifError);
        }

        res.status(201).json({
            message: 'Leave applied successfully!',
            leave: newLeave
        });

    } catch (error) {
        console.error('Apply Leave Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// GET ALL LEAVE REQUESTS
// ============================================
const getAllRequests = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = '',
            leave_type = '',
            start_date = '',
            end_date = '',
            sortBy = 'applied_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereCondition = {};
        
        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            const searchWords = searchTerm.split(' ').filter(word => word.length > 0);
            
            const orConditions = [];
            
            searchWords.forEach(word => {
                orConditions.push(
                    { employee_code: { [Op.iLike]: `%${word}%` } },
                    { leave_type: { [Op.iLike]: `%${word}%` } },
                    { reason: { [Op.iLike]: `%${word}%` } }
                );
            });
            
            orConditions.push(
                { employee_code: { [Op.iLike]: `%${searchTerm}%` } },
                { leave_type: { [Op.iLike]: `%${searchTerm}%` } },
                { reason: { [Op.iLike]: `%${searchTerm}%` } }
            );
            
            whereCondition = {
                [Op.or]: orConditions
            };
        }

        if (status) {
            whereCondition.status = status;
        }

        if (leave_type) {
            whereCondition.leave_type = leave_type;
        }

        if (start_date && end_date) {
            whereCondition.applied_at = {
                [Op.between]: [new Date(start_date), new Date(end_date)]
            };
        }

        const totalCount = await LeaveRequest.count({
            where: whereCondition
        });

        const leaves = await LeaveRequest.findAll({
            where: whereCondition,
            order: [[sortBy || 'applied_at', sortOrder || 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: leaves,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get All Requests Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// GET MY LEAVES
// ============================================
const getMyLeaves = async (req, res) => {
    try {
        const activeEmpCode = req.user?.employee_code || req.query.employee_code;
        if (!activeEmpCode) {
            return res.status(400).json({ error: 'Employee code missing' });
        }

        const {
            page = 1,
            limit = 10,
            status = '',
            sortBy = 'applied_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereCondition = { employee_code: activeEmpCode };
        if (status) {
            whereCondition.status = status;
        }

        const totalCount = await LeaveRequest.count({
            where: whereCondition
        });

        const leaves = await LeaveRequest.findAll({
            where: whereCondition,
            order: [[sortBy || 'applied_at', sortOrder || 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: leaves,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get My Leaves Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// UPDATE LEAVE STATUS
// ============================================
const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comments } = req.body;

        const adminCode = req.user?.employee_code || req.user?.email || 'ADMIN';

        const request = await LeaveRequest.findByPk(id);
        if (!request) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        if (request.status === 'Approved') {
            return res.status(400).json({ error: 'Leave already approved!' });
        }
        if (request.status === 'Rejected') {
            return res.status(400).json({ error: 'Leave already rejected!' });
        }

        const oldStatus = request.status;
        let finalComments = '';

        // Get employee name
        const employee = await Employee.findOne({
            where: { employee_code: request.employee_code }
        });
        const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : request.employee_code;

        if (String(status).toLowerCase() === 'approved') {
            const balanceKey = getBalanceKeyFromLeaveType(request.leave_type);
            const requestedDays = parseInt(request.days, 10) || 1;

            const leaveLimit = await LeaveLimit.findOne({
                where: { employee_code: request.employee_code }
            });

            if (!leaveLimit) {
                return res.status(404).json({
                    error: 'Leave limits not configured for this employee!'
                });
            }

            let currentTaken = 0;
            let totalLimit = 0;

            if (balanceKey === 'sick') {
                currentTaken = leaveLimit.sick_taken || 0;
                totalLimit = leaveLimit.sick_limit || 12;
            } else if (balanceKey === 'casual') {
                currentTaken = leaveLimit.casual_taken || 0;
                totalLimit = leaveLimit.casual_limit || 15;
            } else if (balanceKey === 'paid') {
                currentTaken = leaveLimit.paid_taken || 0;
                totalLimit = leaveLimit.paid_limit || 10;
            }

            if (currentTaken + requestedDays > totalLimit) {
                return res.status(400).json({
                    error: `Cannot approve: Only ${totalLimit - currentTaken} ${balanceKey} day(s) left.`
                });
            }

            if (balanceKey === 'sick') {
                leaveLimit.sick_taken = (leaveLimit.sick_taken || 0) + requestedDays;
            } else if (balanceKey === 'casual') {
                leaveLimit.casual_taken = (leaveLimit.casual_taken || 0) + requestedDays;
            } else if (balanceKey === 'paid') {
                leaveLimit.paid_taken = (leaveLimit.paid_taken || 0) + requestedDays;
            }
            await leaveLimit.save();

            finalComments = comments && comments.trim() !== '' ? comments.trim() : '✅ Approved - Enjoy your leave!';

            request.status = 'Approved';
            request.approved_by = adminCode;
            request.approved_at = new Date();
            request.comments = finalComments;
            await request.save();

            // Audit Log
            await auditLogger.log({
                employee_code: req.user?.employee_code || 'SYSTEM',
                action: 'APPROVE',
                entity_type: 'Leave',
                entity_id: id,
                old_data: { status: oldStatus },
                new_data: { status: 'Approved', comments: finalComments },
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent']
            });

            // Notification to employee
            await notificationHelper.create({
                employee_code: request.employee_code,
                type: 'LEAVE_APPROVED',
                title: '✅ Leave Approved!',
                message: `Your ${request.leave_type} request for ${requestedDays} day${requestedDays > 1 ? 's' : ''} has been approved!`,
                link: '/employee-leave',
                icon: '✅',
                color: 'green'
            });

            let emailStatus = 'skipped';
            // Send email
            try {
                if (employee && employee.email) {
                    const subject = `✅ Leave Approved - ${employeeName}`;
                    const html = getLeaveStatusEmailTemplate(
                        employeeName,
                        {
                            leave_type: request.leave_type,
                            start_date: request.start_date,
                            end_date: request.end_date,
                            days: request.days,
                            reason: request.reason
                        },
                        'Approved',
                        finalComments
                    );
                    await sendEmail(employee.email, subject, html);
                    emailStatus = 'sent';
                }
            } catch (emailError) {
                emailStatus = 'failed';
                console.error('Email sending failed:', emailError.message);
            }

            res.json({
                emailStatus,
                message: `✅ Leave approved! ${requestedDays} ${balanceKey} day(s) deducted.`,
                request: request
            });

        } else if (String(status).toLowerCase() === 'rejected') {
            finalComments = comments && comments.trim() !== '' ? comments.trim() : '❌ Rejected - Contact HR for details.';

            request.status = 'Rejected';
            request.approved_by = adminCode;
            request.approved_at = new Date();
            request.comments = finalComments;
            await request.save();

            // Audit Log
            await auditLogger.log({
                employee_code: req.user?.employee_code || 'SYSTEM',
                action: 'REJECT',
                entity_type: 'Leave',
                entity_id: id,
                old_data: { status: oldStatus },
                new_data: { status: 'Rejected', comments: finalComments },
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent']
            });

            // Notification to employee
            await notificationHelper.create({
                employee_code: request.employee_code,
                type: 'LEAVE_REJECTED',
                title: '❌ Leave Rejected',
                message: `Your ${request.leave_type} request for ${request.days} day${request.days > 1 ? 's' : ''} was rejected.`,
                link: '/employee-leave',
                icon: '❌',
                color: 'red'
            });

            let emailStatus = 'skipped';
            // Send email
            try {
                if (employee && employee.email) {
                    const subject = `❌ Leave Rejected - ${employeeName}`;
                    const html = getLeaveStatusEmailTemplate(
                        employeeName,
                        {
                            leave_type: request.leave_type,
                            start_date: request.start_date,
                            end_date: request.end_date,
                            days: request.days,
                            reason: request.reason
                        },
                        'Rejected',
                        finalComments
                    );
                    await sendEmail(employee.email, subject, html);
                    emailStatus = 'sent';
                }
            } catch (emailError) {
                emailStatus = 'failed';
                console.error('Email sending failed:', emailError.message);
            }

            res.json({
                emailStatus,
                message: '❌ Leave rejected!',
                request: request
            });

        } else {
            return res.status(400).json({
                error: 'Invalid status! Use "Approved" or "Rejected".'
            });
        }

    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// EDIT LEAVE
// ============================================
const editLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const { leave_type, start_date, end_date, days, reason } = req.body;

        const leaveRequest = await LeaveRequest.findByPk(id);
        if (!leaveRequest) {
            return res.status(404).json({ error: 'Leave request not found!' });
        }

        const oldData = leaveRequest.toJSON();

        if (leave_type) leaveRequest.leave_type = leave_type;
        if (start_date) leaveRequest.start_date = start_date;
        if (end_date) leaveRequest.end_date = end_date;
        if (days) leaveRequest.days = parseInt(days);
        if (reason) leaveRequest.reason = reason;

        await leaveRequest.save();

        // Audit Log
        await auditLogger.log({
            employee_code: req.user?.employee_code || 'SYSTEM',
            action: 'UPDATE',
            entity_type: 'Leave',
            entity_id: id,
            old_data: oldData,
            new_data: leaveRequest.toJSON(),
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent']
        });

        res.json({
            message: '✅ Leave updated successfully!',
            leave: leaveRequest
        });

    } catch (error) {
        console.error('Edit leave error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    applyLeave,
    getAllRequests,
    getMyLeaves,
    updateStatus,
    editLeave
};
