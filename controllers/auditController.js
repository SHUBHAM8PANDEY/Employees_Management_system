const db = require('../models');
const AuditLog = db.AuditLog;
const Employee = db.Employee;
const { Op } = require('sequelize');

// ============================================
// GET AUDIT LOGS
// ============================================
const getAuditLogs = async (req, res) => {
    try {
        const {
            employee_code,
            action,
            entity_type,
            start_date,
            end_date,
            limit = 50,
            offset = 0
        } = req.query;

        console.log('📊 Fetching audit logs with filters:', { employee_code, action, entity_type, start_date, end_date });

        const where = {};
        if (employee_code) where.employee_code = employee_code;
        if (action) where.action = action;
        if (entity_type) where.entity_type = entity_type;
        
        if (start_date && end_date) {
            where.created_at = {
                [Op.between]: [new Date(start_date), new Date(end_date)]
            };
        }

        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [{
                model: Employee,
                as: 'employee',
                attributes: ['first_name', 'last_name', 'email', 'employee_code']
            }]
        });

        console.log(`✅ Found ${count} audit logs`);

        // Format response
        const formattedData = rows.map(log => {
            const logData = log.toJSON();
            
            let entityDisplay = logData.entity_id || '—';
            
            if (logData.entity_type === 'Employee') {
                const emp = logData.employee;
                if (emp && emp.employee_code) {
                    entityDisplay = emp.employee_code;
                }
            }
            
            if (logData.entity_type === 'Attendance') {
                const emp = logData.employee;
                if (emp && emp.employee_code) {
                    entityDisplay = `${emp.employee_code}`;
                }
            }

            return {
                id: logData.id,
                created_at: logData.created_at,
                employee_code: logData.employee_code || 'SYSTEM',
                employee_name: logData.employee 
                    ? `${logData.employee.first_name} ${logData.employee.last_name}`
                    : logData.employee_code || 'SYSTEM',
                action: logData.action,
                entity_type: logData.entity_type,
                entity_id: entityDisplay,
                status: logData.status,
                old_data: logData.old_data ? JSON.parse(logData.old_data) : null,
                new_data: logData.new_data ? JSON.parse(logData.new_data) : null,
                ip_address: logData.ip_address,
                user_agent: logData.user_agent
            };
        });

        res.json({
            success: true,
            data: formattedData,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('❌ Get audit logs error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// ============================================
// GET AUDIT SUMMARY
// ============================================
const getAuditSummary = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const summary = await AuditLog.findAll({
            attributes: [
                'action',
                [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
            ],
            where: {
                created_at: {
                    [Op.gte]: startDate
                }
            },
            group: ['action'],
            order: [[db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'DESC']]
        });

        const total = await AuditLog.count({
            where: {
                created_at: {
                    [Op.gte]: startDate
                }
            }
        });

        // Get top users
        const topUsers = await AuditLog.findAll({
            attributes: [
                'employee_code',
                [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
            ],
            where: {
                created_at: {
                    [Op.gte]: startDate
                },
                employee_code: {
                    [Op.ne]: null
                }
            },
            group: [db.Sequelize.col('AuditLog.employee_code'), db.Sequelize.col('employee.employee_code')],
            order: [[db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'DESC']],
            limit: 10,
            include: [{
                model: Employee,
                as: 'employee',
                attributes: ['first_name', 'last_name', 'employee_code']
            }]
        });

        const formattedTopUsers = topUsers.map(user => ({
            employee_code: user.employee_code,
            employee_name: user.employee 
                ? `${user.employee.first_name} ${user.employee.last_name}`
                : user.employee_code,
            count: user.dataValues.count
        }));

        res.json({
            success: true,
            data: {
                total,
                summary,
                topUsers: formattedTopUsers
            }
        });
    } catch (error) {
        console.error('❌ Get audit summary error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// ============================================
// GET USER ACTIVITY
// ============================================
const getUserActivity = async (req, res) => {
    try {
        const { code } = req.params;
        const { days = 30 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const logs = await AuditLog.findAll({
            where: {
                employee_code: code,
                created_at: {
                    [Op.gte]: startDate
                }
            },
            order: [['created_at', 'DESC']],
            limit: 100,
            include: [{
                model: Employee,
                as: 'employee',
                attributes: ['first_name', 'last_name', 'email', 'employee_code']
            }]
        });

        const formattedData = logs.map(log => {
            const logData = log.toJSON();
            
            let entityDisplay = logData.entity_id || '—';
            
            if (logData.entity_type === 'Employee') {
                const emp = logData.employee;
                if (emp && emp.employee_code) {
                    entityDisplay = emp.employee_code;
                }
            }
            
            if (logData.entity_type === 'Attendance') {
                const emp = logData.employee;
                if (emp && emp.employee_code) {
                    entityDisplay = `${emp.employee_code}`;
                }
            }

            return {
                id: logData.id,
                created_at: logData.created_at,
                employee_code: logData.employee_code || 'SYSTEM',
                employee_name: logData.employee 
                    ? `${logData.employee.first_name} ${logData.employee.last_name}`
                    : logData.employee_code || 'SYSTEM',
                action: logData.action,
                entity_type: logData.entity_type,
                entity_id: entityDisplay,
                status: logData.status
            };
        });

        res.json({
            success: true,
            data: formattedData
        });
    } catch (error) {
        console.error('❌ Get user activity error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

module.exports = {
    getAuditLogs,
    getAuditSummary,
    getUserActivity
};