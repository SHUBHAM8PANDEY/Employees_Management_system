const auditLogger = require('./auditLogger');

const auditMiddleware = {
    /**
     * Log all API requests
     */
    logRequest: (req, res, next) => {
        // Store original send function
        const originalSend = res.send;
        const startTime = Date.now();

        // Override send to capture response
        res.send = function(data) {
            const responseTime = Date.now() - startTime;
            
            // Log API request
            auditLogger.log({
                employee_code: req.user?.employee_code || 'SYSTEM',
                action: `${req.method} ${req.path}`,
                entity_type: 'API_REQUEST',
                entity_id: req.params.id || null,
                old_data: req.query,
                new_data: req.body,
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'],
                status: res.statusCode < 400 ? 'Success' : 'Failed'
            });

            // Call original send
            originalSend.call(this, data);
        };

        next();
    },

    /**
     * Log employee actions
     */
    logEmployeeAction: (action, entity_type, getOldData, getNewData) => {
        return async (req, res, next) => {
            const oldData = getOldData ? await getOldData(req) : null;
            
            // Store original send
            const originalSend = res.send;
            
            res.send = function(data) {
                const newData = getNewData ? getNewData(req, data) : null;
                
                auditLogger.log({
                    employee_code: req.user?.employee_code || 'SYSTEM',
                    action,
                    entity_type,
                    entity_id: req.params.code || req.params.id || null,
                    old_data: oldData,
                    new_data: newData,
                    ip_address: req.ip || req.connection.remoteAddress,
                    user_agent: req.headers['user-agent']
                });

                originalSend.call(this, data);
            };

            next();
        };
    }
};

module.exports = auditMiddleware;