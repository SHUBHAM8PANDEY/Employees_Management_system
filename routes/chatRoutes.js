const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: {
    fileSize: 4 * 1024 * 1024, files: 1, fields: 2, fieldSize: 40000, parts: 4
} }).single('file');
const chatController = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/attachments/:id', protect, chatController.getAttachment);
router.post('/messages', protect, chatController.postMessage);
router.post('/files', protect, (req, res, next) => {
    upload(req, res, error => {
        if (error) {
            const tooLarge = error.code === 'LIMIT_FILE_SIZE';
            return res.status(tooLarge ? 413 : 400).json({
                error: tooLarge ? 'File must be 4 MB or smaller.' : 'Invalid file upload.'
            });
        }
        if (!req.file) return res.status(400).json({ error: 'Select a file first.' });
        next();
    });
}, chatController.postMessage);
router.get('/contacts', protect, chatController.getContacts);
router.get('/conversations', protect, chatController.getConversations);
router.get('/online', protect, chatController.getOnlineUsers);
router.get('/history/:otherCode', protect, chatController.getHistory);

module.exports = router;
