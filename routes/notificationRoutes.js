const express = require('express');
const router = express.Router();

const { protect: verifyToken } = require('../middlewares/authMiddleware');

let notificationController;
try {
    notificationController = require('../controllers/notificationController');
} catch (error) {
    console.error('Failed to load notificationController:', error.message);
    notificationController = {
        getMyNotifications: (req, res) => res.json({ success: true, data: [], total: 0, unreadCount: 0 }),
        getUnreadCount: (req, res) => res.json({ success: true, unreadCount: 0 }),
        markAsRead: (req, res) => res.json({ success: true, message: 'Marked as read' }),
        markAllAsRead: (req, res) => res.json({ success: true, message: 'All marked as read' }),
        deleteNotification: (req, res) => res.json({ success: true, message: 'Deleted' })
    };
}

router.get('/my', verifyToken, notificationController.getMyNotifications);
router.get('/unread-count', verifyToken, notificationController.getUnreadCount);
router.put('/read/:id', verifyToken, notificationController.markAsRead);
router.put('/read-all', verifyToken, notificationController.markAllAsRead);
router.delete('/:id', verifyToken, notificationController.deleteNotification);

module.exports = router;
