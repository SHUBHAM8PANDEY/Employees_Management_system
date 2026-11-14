import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { connectSocket } from './socket';

export default function useMessageAlerts(pathname) {
    const [count, setCount] = useState(0);
    const [permission, setPermission] = useState(() => window.Notification?.permission);
    const token = localStorage.getItem('token');
    const employee = localStorage.getItem('employee_code');
    useEffect(() => {
        if (!token || !employee) return;
        const controller = new AbortController();
        const socket = connectSocket(token);
        let sequence = 0;
        const refresh = async () => {
            const request = ++sequence;
            try {
                const { data } = await axios.get(`${API_BASE}/api/chat/conversations`, {
                    headers: { Authorization: `Bearer ${token}` }, signal: controller.signal
                });
                if (!controller.signal.aborted && request === sequence) {
                    setCount(data.data.reduce((total, conversation) => total + conversation.unreadCount, 0));
                }
            } catch { /* Reconnect and visibility events retry the count. */ }
        };
        const receive = async message => {
            if (message.receiver_code !== employee) return;
            void refresh();
            if ((document.hidden || pathname !== '/chat') && window.Notification?.permission === 'granted') {
                try {
                    const options = { body: 'Open Messages to read it.', tag: `workhub-message-${message.id}` };
                    if ('serviceWorker' in navigator) {
                        const registration = await navigator.serviceWorker.register('/message-alerts.js');
                        if (!registration.active) await navigator.serviceWorker.ready;
                        await registration.showNotification('WorkHub · New message', options);
                        return;
                    }
                    const alert = new Notification('WorkHub · New message', options);
                    alert.onclick = () => { window.focus(); window.location.assign('/chat'); alert.close(); };
                } catch { /* Some mobile browsers require a service worker. */ }
            }
        };
        socket?.on('receive_message', receive);
        socket?.on('unread_changed', refresh);
        socket?.on('connect', refresh);
        document.addEventListener('visibilitychange', refresh);
        const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
        void refresh();
        return () => {
            controller.abort();
            clearInterval(timer);
            socket?.off('receive_message', receive);
            socket?.off('unread_changed', refresh);
            socket?.off('connect', refresh);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [employee, pathname, token]);

    return { count, permission, enable: async () => {
        try { setPermission(await window.Notification.requestPermission()); } catch { setPermission('denied'); }
    } };
}
