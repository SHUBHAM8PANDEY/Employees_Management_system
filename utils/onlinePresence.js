const onlineUsers = new Map();

const addConnection = (employeeCode, socketId) => {
    if (!onlineUsers.has(employeeCode)) {
        onlineUsers.set(employeeCode, new Set());
    }
    onlineUsers.get(employeeCode).add(socketId);
};

const removeConnection = (employeeCode, socketId) => {
    const sockets = onlineUsers.get(employeeCode);
    if (!sockets) return true;

    sockets.delete(socketId);
    if (sockets.size === 0) {
        onlineUsers.delete(employeeCode);
        return true;
    }
    return false;
};

const isOnline = (employeeCode) => {
    const sockets = onlineUsers.get(employeeCode);
    return !!(sockets && sockets.size > 0);
};

const getOnlineEmployeeCodes = () => Array.from(onlineUsers.keys());

const getPresenceSnapshot = () => {
    const snapshot = {};
    onlineUsers.forEach((sockets, code) => {
        snapshot[code] = { isOnline: sockets.size > 0 };
    });
    return snapshot;
};

module.exports = {
    addConnection,
    removeConnection,
    isOnline,
    getOnlineEmployeeCodes,
    getPresenceSnapshot
};
