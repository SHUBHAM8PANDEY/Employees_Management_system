const db = require('../models');
const Notification = db.Notification;

const notificationHelper = {
    create: async ({
        employee_code,
        type,
        title,
        message,
        link = null,
        icon = '🔔',
        color = 'blue'
    }) => {
        try {
            if (!employee_code) {
                console.log('No employee_code provided for notification');
                return null;
            }

            const notification = await Notification.create({
                employee_code,
                type,
                title,
                message,
                link,
                icon,
                color,
                is_read: false
            });
            
            console.log(`Notification created for ${employee_code}: ${title}`);
            return notification;
        } catch (error) {
            console.error('Create notification error:', error);
            return null;
        }
    },

    createBulk: async (notifications) => {
        try {
            const results = await Notification.bulkCreate(notifications);
            console.log(`${results.length} notifications created`);
            return results;
        } catch (error) {
            console.error('Bulk notification error:', error);
            return [];
        }
    },

    getUserNotifications: async (employee_code, limit = 20, offset = 0) => {
        try {
            const notifications = await Notification.findAndCountAll({
                where: { employee_code },
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            return notifications;
        } catch (error) {
            console.error('Get user notifications error:', error);
            return { count: 0, rows: [] };
        }
    },

    getUnreadCount: async (employee_code) => {
        try {
            const count = await Notification.count({
                where: {
                    employee_code,
                    is_read: false
                }
            });
            return count;
        } catch (error) {
            console.error('Get unread count error:', error);
            return 0;
        }
    },

    markAsRead: async (notification_id, employee_code) => {
        try {
            const notification = await Notification.findOne({
                where: {
                    id: notification_id,
                    employee_code
                }
            });
            if (notification) {
                notification.is_read = true;
                notification.read_at = new Date();
                await notification.save();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Mark as read error:', error);
            return false;
        }
    },

    markAllAsRead: async (employee_code) => {
        try {
            await Notification.update(
                {
                    is_read: true,
                    read_at: new Date()
                },
                {
                    where: {
                        employee_code,
                        is_read: false
                    }
                }
            );
            return true;
        } catch (error) {
            console.error('Mark all as read error:', error);
            return false;
        }
    },

    delete: async (notification_id, employee_code) => {
        try {
            await Notification.destroy({
                where: {
                    id: notification_id,
                    employee_code
                }
            });
            return true;
        } catch (error) {
            console.error('Delete notification error:', error);
            return false;
        }
    },

    sendToAdmins: async (notificationData) => {
        try {
            const User = db.User;
            const admins = await User.findAll({
                where: { role: ['Admin', 'HR'] },
                attributes: ['employee_code']
            });

            const notifications = [];
            for (const admin of admins) {
                notifications.push({
                    ...notificationData,
                    employee_code: admin.employee_code
                });
            }

            if (notifications.length > 0) {
                await notificationHelper.createBulk(notifications);
            }
            return notifications;
        } catch (error) {
            console.error('Send to admins error:', error);
            return [];
        }
    },

    sendToEmployeeAndAdmins: async (employee_code, notificationData) => {
        try {
            const User = db.User;
            const notifications = [];

            if (employee_code) {
                notifications.push({
                    ...notificationData,
                    employee_code: employee_code
                });
            }

            const admins = await User.findAll({
                where: { role: ['Admin', 'HR'] },
                attributes: ['employee_code']
            });

            for (const admin of admins) {
                if (admin.employee_code !== employee_code) {
                    notifications.push({
                        ...notificationData,
                        employee_code: admin.employee_code
                    });
                }
            }

            if (notifications.length > 0) {
                await notificationHelper.createBulk(notifications);
            }
            return notifications;
        } catch (error) {
            console.error('Send to employee and admins error:', error);
            return [];
        }
    },

    // ============================================
    // ATTENDANCE NOTIFICATIONS
    // ============================================
    
    punchIn: function(employee_name, punch_in_type) {
        return {
            type: 'PUNCH_IN',
            title: '✅ Punch In',
            message: `${employee_name} punched in at ${new Date().toLocaleTimeString()} (${punch_in_type})`,
            link: '/attendance',
            icon: '✅',
            color: 'green'
        };
    },

    punchOut: function(employee_name, total_hours) {
        return {
            type: 'PUNCH_OUT',
            title: '❌ Punch Out',
            message: `${employee_name} punched out (Total: ${total_hours} hours)`,
            link: '/attendance',
            icon: '❌',
            color: 'red'
        };
    },

    autoPunchOut: function(employee_name, total_hours) {
        return {
            type: 'AUTO_PUNCH_OUT',
            title: '⏰ Auto Punch Out',
            message: `${employee_name} auto punched out (Total: ${total_hours} hours)`,
            link: '/attendance',
            icon: '⏰',
            color: 'yellow'
        };
    },

    // ============================================
    // LEAVE NOTIFICATIONS
    // ============================================
    
    leaveApplied: function(employee_name, leave_type, days) {
        return {
            type: 'LEAVE_APPLIED',
            title: '📝 Leave Request Submitted',
            message: `${employee_name} applied for ${leave_type} (${days} days)`,
            link: '/dashboard?tab=leaves',
            icon: '📝',
            color: 'blue'
        };
    },

    leaveApproved: function(employee_name, leave_type, days) {
        return {
            type: 'LEAVE_APPROVED',
            title: '✅ Leave Approved',
            message: `${employee_name}'s ${leave_type} (${days} days) approved`,
            link: '/employee-leave',
            icon: '✅',
            color: 'green'
        };
    },

    leaveRejected: function(employee_name, leave_type, days, reason) {
        return {
            type: 'LEAVE_REJECTED',
            title: '❌ Leave Rejected',
            message: `${employee_name}'s ${leave_type} (${days} days) rejected${reason ? ': ' + reason : ''}`,
            link: '/employee-leave',
            icon: '❌',
            color: 'red'
        };
    },

    // ============================================
    // EMPLOYEE NOTIFICATIONS
    // ============================================
    
    employeeAdded: function(employee_name) {
        return {
            type: 'EMPLOYEE_ADDED',
            title: '👤 New Employee Added',
            message: `${employee_name} added to system`,
            link: '/dashboard?tab=employees',
            icon: '👤',
            color: 'purple'
        };
    },

    employeeUpdated: function(employee_name) {
        return {
            type: 'EMPLOYEE_UPDATED',
            title: '✏️ Profile Updated',
            message: `${employee_name}'s profile updated`,
            link: '/dashboard?tab=employees',
            icon: '✏️',
            color: 'yellow'
        };
    },

    employeeDeleted: function(employee_name) {
        return {
            type: 'EMPLOYEE_DELETED',
            title: '🗑️ Employee Deleted',
            message: `${employee_name} removed from system`,
            link: '/dashboard?tab=employees',
            icon: '🗑️',
            color: 'red'
        };
    },

    leaveLimitUpdated: function(employee_name) {
        return {
            type: 'LEAVE_LIMIT_UPDATED',
            title: '⚙️ Leave Limit Updated',
            message: `${employee_name}'s leave limits updated`,
            link: '/dashboard?tab=employees',
            icon: '⚙️',
            color: 'blue'
        };
    },

    // ============================================
    // SECURITY NOTIFICATIONS
    // ============================================
    
    securityAlert: function(message) {
        return {
            type: 'SECURITY_ALERT',
            title: '🔐 Security Alert',
            message: message,
            link: '/profile',
            icon: '🔐',
            color: 'red'
        };
    },

    loginSuccess: function(ip) {
        return {
            type: 'LOGIN_SUCCESS',
            title: '✅ Login Successful',
            message: `You have logged in from IP: ${ip || 'Unknown'}`,
            link: '/dashboard',
            icon: '✅',
            color: 'green'
        };
    },

    loginFailed: function(reason) {
        return {
            type: 'LOGIN_FAILED',
            title: '❌ Login Failed',
            message: `Failed login attempt${reason ? ': ' + reason : ''}`,
            link: '/',
            icon: '❌',
            color: 'red'
        };
    },

    forceLogout: function(adminName) {
        return {
            type: 'FORCE_LOGOUT',
            title: '🔐 Force Logout',
            message: `Your session has been terminated by ${adminName || 'Admin'}`,
            link: '/',
            icon: '🔐',
            color: 'red'
        };
    }
};

module.exports = notificationHelper;
