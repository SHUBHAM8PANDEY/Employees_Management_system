const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/attachments/:id', protect, chatController.getAttachment);
router.get('/contacts', protect, chatController.getContacts);
router.get('/conversations', protect, chatController.getConversations);
router.get('/online', protect, chatController.getOnlineUsers);
router.get('/history/:otherCode', protect, chatController.getHistory);

module.exports = router;
