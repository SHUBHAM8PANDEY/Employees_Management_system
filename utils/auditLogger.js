const db = require('../models');
const AuditLog = db.AuditLog;

const auditLogger = {
    /**
     * Log an action to audit log
     */
    log: async ({
        employee_code,
        action,
        entity_type,
        entity_id = null,
        old_data = null,
        new_data = null,
        ip_address = null,
        user_agent = null,
        status = 'Success',
        error_message = null
    }) => {
        try {
            // Validate required fields
            if (!action || !entity_type) {
                console.log('Audit log missing required fields:', { action, entity_type });
                return null;
            }

            const logData = {
                employee_code: employee_code || 'SYSTEM',
                action: action,
                entity_type: entity_type,
                entity_id: entity_id || null,
                old_data: old_data ? JSON.stringify(old_data) : null,
                new_data: new_data ? JSON.stringify(new_data) : null,
                ip_address: ip_address || null,
                user_agent: user_agent || null,
                status: status || 'Success',
                error_message: error_message || null
            };

            // Create log entry
            const log = await AuditLog.create(logData);
            console.log(`Audit Log: ${action} on ${entity_type} by ${employee_code || 'SYSTEM'} (ID: ${log.id})`);
            return log;
        } catch (error) {
            console.error('Audit log error:', error);
            return null;
        }
    },

    /**
     * Get audit logs with filters
     */
    getLogs: async ({
        employee_code = null,
        action = null,
        entity_type = null,
        start_date = null,
        end_date = null,
        limit = 50,
        offset = 0
    }) => {
        try {
            const where = {};
            if (employee_code) where.employee_code = employee_code;
            if (action) where.action = action;
            if (entity_type) where.entity_type = entity_type;
            if (start_date && end_date) {
                where.created_at = {
                    [db.Sequelize.Op.between]: [new Date(start_date), new Date(end_date)]
                };
            }

            const logs = await AuditLog.findAndCountAll({
                where,
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [{
                    model: db.Employee,
                    as: 'employee',
                    attributes: ['first_name', 'last_name', 'email', 'employee_code']
                }]
            });

            // Format response
            const formattedData = logs.rows.map(log => {
                const logData = log.toJSON();
                
                let entityDisplay = logData.entity_id || '—';
                
                if (logData.entity_type === 'Employee' || logData.entity_type === 'Attendance') {
                    const emp = logData.employee;
                    if (emp && emp.employee_code) {
                        entityDisplay = emp.employee_code;
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

            return {
                rows: formattedData,
                count: logs.count
            };
        } catch (error) {
            console.error('Get audit logs error:', error);
            return { rows: [], count: 0 };
        }
    },

    /**
     * Get audit log summary
     */
    getSummary: async (days = 7) => {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const summary = await AuditLog.findAll({
                attributes: [
                    'action',
                    [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
                ],
                where: {
                    created_at: {
                        [db.Sequelize.Op.gte]: startDate
                    }
                },
                group: ['action'],
                order: [[db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'DESC']]
            });

            const total = await AuditLog.count({
                where: {
                    created_at: {
                        [db.Sequelize.Op.gte]: startDate
                    }
                }
            });

            return {
                total,
                summary
            };
        } catch (error) {
            console.error('Get audit summary error:', error);
            return { total: 0, summary: [] };
        }
    },

    /**
     * Get user activity
     */
    getUserActivity: async (employee_code, days = 30) => {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const logs = await AuditLog.findAll({
                where: {
                    employee_code,
                    created_at: {
                        [db.Sequelize.Op.gte]: startDate
                    }
                },
                order: [['created_at', 'DESC']],
                limit: 100,
                include: [{
                    model: db.Employee,
                    as: 'employee',
                    attributes: ['first_name', 'last_name', 'email', 'employee_code']
                }]
            });

            return logs.map(log => {
                const logData = log.toJSON();
                return {
                    id: logData.id,
                    created_at: logData.created_at,
                    employee_code: logData.employee_code || 'SYSTEM',
                    employee_name: logData.employee 
                        ? `${logData.employee.first_name} ${logData.employee.last_name}`
                        : logData.employee_code || 'SYSTEM',
                    action: logData.action,
                    entity_type: logData.entity_type,
                    entity_id: logData.entity_id || '—',
                    status: logData.status
                };
            });
        } catch (error) {
            console.error('Get user activity error:', error);
            return [];
        }
    }
};

module.exports = auditLogger;
