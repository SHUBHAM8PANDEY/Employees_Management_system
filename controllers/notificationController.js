const notificationHelper = require('../utils/notificationHelper');

const getMyNotifications = async (req, res) => {
    try {
        const employee_code = req.user?.employee_code;
        if (!employee_code) {
            return res.status(401).json({ error: 'Unauthorized!' });
        }

        const { limit = 20, offset = 0 } = req.query;

        const notifications = await notificationHelper.getUserNotifications(
            employee_code,
            parseInt(limit),
            parseInt(offset)
        );
        const unreadCount = await notificationHelper.getUnreadCount(employee_code);

        res.json({
            success: true,
            data: notifications.rows,
            total: notifications.count,
            unreadCount,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const employee_code = req.user?.employee_code;
        if (!employee_code) {
            return res.status(401).json({ error: 'Unauthorized!' });
        }

        const count = await notificationHelper.getUnreadCount(employee_code);

        res.json({
            success: true,
            unreadCount: count
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const employee_code = req.user?.employee_code;
        if (!employee_code) {
            return res.status(401).json({ error: 'Unauthorized!' });
        }

        const { id } = req.params;
        const result = await notificationHelper.markAsRead(id, employee_code);

        if (result) {
            res.json({
                success: true,
                message: 'Notification marked as read'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: error.message });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const employee_code = req.user?.employee_code;
        if (!employee_code) {
            return res.status(401).json({ error: 'Unauthorized!' });
        }

        await notificationHelper.markAllAsRead(employee_code);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ error: error.message });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const employee_code = req.user?.employee_code;
        if (!employee_code) {
            return res.status(401).json({ error: 'Unauthorized!' });
        }

        const { id } = req.params;
        const result = await notificationHelper.delete(id, employee_code);

        if (result) {
            res.json({
                success: true,
                message: 'Notification deleted'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
};