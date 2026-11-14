import { API_BASE } from '../config';
import { io } from 'socket.io-client';



let socket = null;

export const connectSocket = (token) => {
    if (!token) return null;

    if (socket?.connected) {
        return socket;
    }

    if (socket) {
        socket.auth = { token };
        socket.connect();
        return socket;
    }

    socket = io(API_BASE || window.location.origin, {
        auth: { token },
        // Start with HTTP polling so the CRA proxy can establish the session.
        transports: ['polling', 'websocket'],
        autoConnect: true
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
