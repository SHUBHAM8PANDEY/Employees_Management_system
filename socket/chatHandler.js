const { authenticateSession } = require('../utils/sessionAuth');
const db = require('../models');
const User = db.User;
const chatController = require('../controllers/chatController');
const {
    addConnection,
    removeConnection,
    getPresenceSnapshot
} = require('../utils/onlinePresence');

const { saveMessage } = chatController;

const getUserRoom = (employeeCode) => `user:${employeeCode}`;

const setupSocketIO = (io) => {
    io.use(async (socket, next) => {
        try {
            const { user, expiresAt } = await authenticateSession(socket.handshake.auth?.token);
            socket.user = user;
            socket.data.expiresAt = expiresAt;
            next();
        } catch (error) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', async (socket) => {
        const user = socket.user;
        const myCode = user.employee_code;

        const expire = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt - Date.now()));
        let validating = false;
        const recheck = async () => {
            try {
                await authenticateSession(socket.handshake.auth?.token);
                return true;
            } catch {
                socket.disconnect(true);
                return false;
            }
        };
        const interval = setInterval(async () => {
            if (validating) return;
            validating = true;
            await recheck();
            validating = false;
        }, 15000);
        socket.use(async (_packet, next) => {
            if (await recheck()) next();
        });
        socket.once('disconnect', () => {
            clearTimeout(expire);
            clearInterval(interval);
        });

        addConnection(myCode, socket.id);
        socket.join(getUserRoom(myCode));

        io.emit('presence_update', {
            employee_code: myCode,
            isOnline: true,
            last_seen: null
        });

        console.log(`💬 Online: ${myCode} (${user.role})`);

        socket.on('send_message', async (payload, callback) => {
            try {
                const { message, receiverCode } = payload || {};
                if (!message || !message.trim()) {
                    return callback?.({ error: 'Message cannot be empty' });
                }
                if (!receiverCode) {
                    return callback?.({ error: 'Receiver is required' });
                }

                const saved = await saveMessage({
                    senderCode: myCode,
                    receiverCode,
                    message
                });

                const messageData = {
                    id: saved.id,
                    sender_code: myCode,
                    receiver_code: receiverCode,
                    message: saved.message,
                    is_read: false,
                    created_at: saved.created_at
                };

                io.to(getUserRoom(receiverCode)).emit('receive_message', messageData);
                io.to(getUserRoom(myCode)).emit('receive_message', messageData);

                io.to(getUserRoom(receiverCode)).emit('new_conversation_message', {
                    ...messageData,
                    partnerCode: myCode
                });

                callback?.({ success: true, message: messageData });
            } catch (error) {
                console.error('Send message error:', error);
                callback?.({ error: error.message });
            }
        });

        socket.on('typing', ({ receiverCode, isTyping }) => {
            if (!receiverCode) return;
            io.to(getUserRoom(receiverCode)).emit('user_typing', {
                isTyping,
                from: myCode
            });
        });

        socket.on('get_presence', (callback) => {
            callback?.({ data: getPresenceSnapshot() });
        });

        socket.on('disconnect', async () => {
            const fullyOffline = removeConnection(myCode, socket.id);

            if (fullyOffline) {
                const lastSeen = new Date();
                try {
                    await User.update(
                        { last_seen: lastSeen },
                        { where: { employee_code: myCode } }
                    );
                } catch (err) {
                    console.error('Update last_seen error:', err.message);
                }

                io.emit('presence_update', {
                    employee_code: myCode,
                    isOnline: false,
                    last_seen: lastSeen
                });

                console.log(`💬 Offline: ${myCode}`);
            }
        });
    });
};

module.exports = { setupSocketIO };
