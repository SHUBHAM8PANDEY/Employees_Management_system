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
                    lastMessage: msg.message,
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
            where: buildPeerWhere(myCode, otherCode),
            order: [['created_at', 'ASC']],
            limit: 200
        });

        await ChatMessage.update(
            { is_read: true },
            {
                where: {
                    sender_code: otherCode,
                    receiver_code: myCode,
                    is_read: false
                }
            }
        );

        const otherUser = await User.findByPk(otherCode, { attributes: ['last_seen'] });

        res.json({
            data: messages,
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

const saveMessage = async ({ senderCode, receiverCode, message }) => {
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

    return ChatMessage.create({
        sender_code: senderCode,
        receiver_code: receiverCode,
        message: message.trim(),
        is_read: false
    });
};

module.exports = {
    getContacts,
    getConversations,
    getHistory,
    getOnlineUsers,
    saveMessage,
    buildPeerWhere
};
