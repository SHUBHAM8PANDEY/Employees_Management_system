const db = require('../models');
const ChatMessage = db.ChatMessage;
const Employee = db.Employee;
const User = db.User;
const { Op } = require('sequelize');
const { isOnline, getOnlineEmployeeCodes } = require('../utils/onlinePresence');

const getPartnerCode = (myCode, msg) =>
    msg.sender_code === myCode ? msg.receiver_code : msg.sender_code;

const buildPeerWhere = (myCode, otherCode) => ({
    [Op.or]: [
        { sender_code: myCode, receiver_code: otherCode },
        { sender_code: otherCode, receiver_code: myCode }
    ]
});

const getContacts = async (req, res) => {
    try {
        const myCode = req.user.employee_code;
        const onlineCodes = new Set(getOnlineEmployeeCodes());

        const contacts = await Employee.findAll({
            where: { employee_code: { [Op.ne]: myCode } },
            include: [{
                model: User,
                as: 'userDetails',
                attributes: ['role', 'last_seen'],
                required: true
            }],
            attributes: ['employee_code', 'first_name', 'last_name', 'email', 'profile_picture'],
            order: [['first_name', 'ASC']]
        });

        const data = contacts.map((emp) => ({
            employee_code: emp.employee_code,
            first_name: emp.first_name,
            last_name: emp.last_name,
            email: emp.email,
            role: emp.userDetails?.role || 'Employee',
            profile_picture: emp.profile_picture || null,
            isOnline: onlineCodes.has(emp.employee_code),
            last_seen: emp.userDetails?.last_seen || null
        }));

        data.sort((a, b) => {
            if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
            return a.first_name.localeCompare(b.first_name);
        });

        res.json({ data });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getConversations = async (req, res) => {
    try {
        const myCode = req.user.employee_code;

        const messages = await ChatMessage.findAll({
            attributes: { exclude: ['attachment_data'] },
            where: {
                [Op.or]: [
                    { sender_code: myCode },
                    { receiver_code: myCode }
                ]
            },
            order: [['created_at', 'DESC']]
        });

        const conversationMap = new Map();

        messages.forEach((msg) => {
            const otherCode = getPartnerCode(myCode, msg);
            if (!conversationMap.has(otherCode)) {
                conversationMap.set(otherCode, {
                    employee_code: otherCode,
                    first_name: '',
                    last_name: '',
                    role: '',
                    lastMessage: msg.message || msg.attachment_name,
                    lastMessageAt: msg.created_at,
                    unreadCount: 0,
                    isOnline: isOnline(otherCode),
                    last_seen: null
                });
            }
        });

        const unreadMessages = await ChatMessage.findAll({
            where: {
                receiver_code: myCode,
                is_read: false
            },
            attributes: ['sender_code']
        });

        unreadMessages.forEach((msg) => {
            const conv = conversationMap.get(msg.sender_code);
            if (conv) conv.unreadCount++;
        });

        const codes = Array.from(conversationMap.keys());
        if (codes.length) {
            const employees = await Employee.findAll({
                where: { employee_code: { [Op.in]: codes } },
                include: [{
                    model: User,
                    as: 'userDetails',
                    attributes: ['role', 'last_seen']
                }],
                attributes: ['employee_code', 'first_name', 'last_name', 'profile_picture']
            });

            employees.forEach((emp) => {
                const conv = conversationMap.get(emp.employee_code);
                if (conv) {
                    conv.first_name = emp.first_name;
                    conv.last_name = emp.last_name;
                    conv.role = emp.userDetails?.role || 'Employee';
                    conv.profile_picture = emp.profile_picture || null;
                    conv.isOnline = isOnline(emp.employee_code);
                    conv.last_seen = emp.userDetails?.last_seen || null;
                }
            });
        }

        const sorted = Array.from(conversationMap.values()).sort(
            (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        );

        res.json({ data: sorted });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getHistory = async (req, res) => {
    try {
        const { otherCode } = req.params;
        const myCode = req.user.employee_code;

        if (!otherCode || otherCode === myCode) {
            return res.status(400).json({ error: 'Valid contact employee code required!' });
        }

        const otherExists = await Employee.findByPk(otherCode);
        if (!otherExists) {
            return res.status(404).json({ error: 'Employee not found!' });
        }

        const messages = await ChatMessage.findAll({
            attributes: { exclude: ['attachment_data'] },
            where: buildPeerWhere(myCode, otherCode),
            order: [['created_at', 'DESC'], ['id', 'DESC']],
            limit: 200
        });

        const read = await acknowledgeRead(req, { sender_code: otherCode });
        const readIds = new Set(read.map(message => message.id));
        for (const message of messages) {
            if (readIds.has(message.id)) message.is_read = true;
        }

        const otherUser = await User.findByPk(otherCode, { attributes: ['last_seen'] });

        res.json({
            data: messages.reverse(),
            partner: {
                employee_code: otherCode,
                first_name: otherExists.first_name,
                last_name: otherExists.last_name,
                profile_picture: otherExists.profile_picture || null,
                isOnline: isOnline(otherCode),
                last_seen: otherUser?.last_seen || null
            }
        });
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getOnlineUsers = async (req, res) => {
    try {
        const onlineCodes = getOnlineEmployeeCodes();
        const users = await User.findAll({
            where: { employee_code: { [Op.in]: onlineCodes } },
            attributes: ['employee_code', 'last_seen']
        });

        res.json({
            data: onlineCodes.map((code) => {
                const user = users.find((u) => u.employee_code === code);
                return {
                    employee_code: code,
                    isOnline: true,
                    last_seen: user?.last_seen || null
                };
            })
        });
    } catch (error) {
        console.error('Get online users error:', error);
        res.status(500).json({ error: error.message });
    }
};

const saveMessage = async ({ senderCode, receiverCode, message, attachment }) => {
    const text = typeof message === 'string' ? message.trim() : '';
    const file = attachment ? validateAttachment(attachment) : {};
    if ((!text && !attachment) || text.length > 10000) throw new Error('Invalid message');
    if (senderCode === receiverCode) {
        throw new Error('Cannot send message to yourself!');
    }

    const codes = [senderCode, receiverCode];
    const existing = await Employee.findAll({
        where: { employee_code: { [Op.in]: codes } },
        attributes: ['employee_code']
    });

    if (existing.length !== codes.length) {
        const found = new Set(existing.map((e) => e.employee_code));
        const missing = codes.filter((c) => !found.has(c));
        throw new Error(`Invalid employee code(s): ${missing.join(', ')}`);
    }

    const { attachment_data, ...metadata } = file;
    const values = {
        sender_code: senderCode,
        receiver_code: receiverCode,
        message: text,
        ...metadata,
        is_read: false
    };
    if (!attachment_data) return ChatMessage.create(values);
    return db.sequelize.transaction(async transaction => {
        const saved = await ChatMessage.create(values, { transaction });
        await db.sequelize.query(
            'INSERT INTO public.chat_files (message_id, content) VALUES ($id, $content)',
            { bind: { id: saved.id, content: attachment_data }, transaction }
        );
        return saved;
    });
};

function validateAttachment({ name, type, data }) {
    const signatures = {
        'application/pdf': ['255044462d', 0],
        'image/jpeg': ['ffd8ff', 0],
        'image/png': ['89504e470d0a1a0a', 0],
        'image/webp': ['57454250', 8]
    };
    if (!Object.hasOwn(signatures, type) || !Buffer.isBuffer(data) || data.length > 4 * 1024 * 1024) {
        throw new Error('Choose a PDF, JPEG, PNG or WebP file up to 4 MB');
    }
    const [signature, offset] = signatures[type];
    if (data.subarray(offset, offset + signature.length / 2).toString('hex') !== signature) {
        throw new Error('File contents do not match its type');
    }
    const fileName = typeof name === 'string' ? name.split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240) : '';
    return { attachment_name: fileName || 'attachment', attachment_type: type, attachment_data: data };
}

async function postMessage(req, res) {
    const { receiverCode, message, attachment } = req.body ?? {};
    if (typeof receiverCode !== 'string' || !receiverCode.trim() || receiverCode.length > 100) {
        return res.status(400).json({ error: 'Choose a valid recipient.' });
    }
    try {
        const saved = await saveMessage({
            senderCode: req.user.employee_code, receiverCode, message,
            attachment: req.file ? {
                name: req.file.originalname, type: req.file.mimetype, data: req.file.buffer
            } : attachment && { name: attachment.name, type: attachment.type,
                data: typeof attachment.data === 'string' ? Buffer.from(attachment.data, 'base64') : null }
        });
        const { attachment_data, ...result } = saved.get({ plain: true });
        const io = req.app.get('io');
        io.to([`user:${result.sender_code}`, `user:${result.receiver_code}`]).emit('receive_message', result);
        res.status(201).json({ message: result });
    } catch (error) {
        if (error.name.startsWith('Sequelize')) throw error;
        res.status(400).json({ error: error.message });
    }
}

async function getAttachment(req, res) {
    if (!/^\d{1,10}$/.test(req.params.id) || Number(req.params.id) > 2147483647) return res.sendStatus(404);
    const code = req.user.employee_code;
    const message = await ChatMessage.findOne({
        where: { id: req.params.id, [Op.or]: [{ sender_code: code }, { receiver_code: code }] }
    });
    if (!message?.attachment_name) return res.sendStatus(404);
    const [rows] = await db.sequelize.query(
        'SELECT content FROM public.chat_files WHERE message_id = $id', { bind: { id: message.id } }
    );
    const content = rows[0]?.content ?? message.attachment_data;
    if (!content) return res.sendStatus(404);
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.attachment(message.attachment_name).type(message.attachment_type).send(content);
}

async function acknowledgeRead(req, filter) {
    const [, messages] = await ChatMessage.update({ is_read: true }, {
        where: { ...filter, receiver_code: req.user.employee_code, is_read: false },
        returning: ['id', 'sender_code', 'receiver_code']
    });
    const idsBySender = new Map();
    for (const message of messages) {
        const ids = idsBySender.get(message.sender_code) ?? [];
        ids.push(message.id);
        idsBySender.set(message.sender_code, ids);
    }
    const io = req.app.get('io');
    for (const [sender, ids] of idsBySender) {
        io?.to(`user:${sender}`).emit('messages_read', { ids });
    }
    if (messages.length) io?.to(`user:${req.user.employee_code}`).emit('unread_changed');
    return messages;
}

async function markMessageRead(req, res) {
    const { id } = req.params;
    if (!/^\d{1,10}$/.test(id) || Number(id) > 2147483647) return res.sendStatus(400);
    await acknowledgeRead(req, { id });
    res.sendStatus(204);
}

module.exports = {
    markMessageRead,
    getAttachment,
    postMessage,
    getContacts,
    getConversations,
    getHistory,
    getOnlineUsers,
    saveMessage,
    buildPeerWhere
};
