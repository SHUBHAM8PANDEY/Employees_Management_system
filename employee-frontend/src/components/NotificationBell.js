import { API_BASE } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './NotificationBell.module.css';



const NotificationBell = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await axios.get(
                `${API_BASE}/api/notifications/my?limit=10`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNotifications(response.data.data);
            setUnreadCount(response.data.unreadCount);
        } catch (error) {
            console.error('Fetch notifications error:', error);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await axios.get(
                `${API_BASE}/api/notifications/unread-count`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUnreadCount(response.data.unreadCount);
        } catch (error) {
            console.error('Fetch unread count error:', error);
        }
    };

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_BASE}/api/notifications/read/${id}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNotifications(notifications.map((n) =>
                n.id === id ? { ...n, is_read: true } : n
            ));
            setUnreadCount(Math.max(0, unreadCount - 1));
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_BASE}/api/notifications/read-all`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Mark all as read error:', error);
        }
    };

    return (
        <div className={styles.wrapper}>
            <button
                type="button"
                className={styles.bellBtn}
                onClick={() => {
                    setShowDropdown(!showDropdown);
                    if (!showDropdown) fetchNotifications();
                }}
                aria-label="Notifications"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {showDropdown && (
                <div className={styles.dropdown}>
                    <div className={styles.dropdownHead}>
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button type="button" onClick={markAllAsRead}>Mark all read</button>
                        )}
                    </div>

                    <div className={styles.list}>
                        {notifications.length === 0 ? (
                            <p className={styles.empty}>No notifications</p>
                        ) : (
                            notifications.map((notif) => (
                                <button
                                    key={notif.id}
                                    type="button"
                                    className={`${styles.item} ${!notif.is_read ? styles.unread : ''}`}
                                    onClick={() => {
                                        if (!notif.is_read) markAsRead(notif.id);
                                        if (notif.link) navigate(notif.link);
                                        setShowDropdown(false);
                                    }}
                                >
                                    <div className={styles.itemContent}>
                                        <strong>{notif.title}</strong>
                                        <span>{notif.message}</span>
                                        <time>{new Date(notif.created_at).toLocaleString('en-IN')}</time>
                                    </div>
                                    {!notif.is_read && <span className={styles.dot} />}
                                </button>
                            ))
                        )}
                    </div>

                    <button
                        type="button"
                        className={styles.viewAll}
                        onClick={() => {
                            setShowDropdown(false);
                            navigate('/notifications');
                        }}
                    >
                        View all
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
