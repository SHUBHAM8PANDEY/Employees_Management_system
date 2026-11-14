import { Bell } from 'lucide-react';
import { API_BASE } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [limit] = useState(20);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        fetchNotifications();
    }, [limit, offset]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${API_BASE}/api/notifications/my?limit=${limit}&offset=${offset}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNotifications(response.data.data);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Fetch notifications error:', error);
        }
        setLoading(false);
    };

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_BASE}/api/notifications/read/${id}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNotifications(notifications.map(n => 
                n.id === id ? { ...n, is_read: true } : n
            ));
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
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Mark all as read error:', error);
        }
    };

    const deleteNotification = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(
                `${API_BASE}/api/notifications/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNotifications(notifications.filter(n => n.id !== id));
        } catch (error) {
            console.error('Delete notification error:', error);
        }
    };



    const getNotificationColor = (color) => {
        const colors = {
            blue: '#3b82f6',
            green: '#10b981',
            red: '#ef4444',
            yellow: '#d97706',
            purple: '#8b5cf6'
        };
        return colors[color] || '#6b7280';
    };

    return (
        <div className="ui-page-stack">

            <div className="ui-panel">
                <div className="ui-heading">
                    <h2>Inbox</h2>
                    <button
                        onClick={markAllAsRead}
                        style={{
                            padding: '8px 16px',
                            background: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Mark All as Read
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
                ) : notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ui-muted)' }}>
                        No notifications yet
                    </div>
                ) : (
                    <>
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                style={{
                                    padding: '16px',
                                    borderRadius: '10px',
                                    marginBottom: '10px',
                                    background: notif.is_read ? 'var(--ui-surface)' : 'var(--ui-tint)',
                                    border: '1px solid #e2e8f0',
                                    display: 'flex',
                                    gap: '14px',
                                    alignItems: 'flex-start',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                }}
                                onClick={() => {
                                    if (!notif.is_read) markAsRead(notif.id);
                                    if (notif.link) navigate(notif.link);
                                }}
                            >
                                <div style={{
                                    fontSize: '24px',
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    background: getNotificationColor(notif.color),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    flexShrink: 0
                                }}>
                                    {<Bell size={18} aria-hidden="true" />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontWeight: notif.is_read ? '500' : '700',
                                        fontSize: '15px',
                                        color: 'var(--ui-text)'
                                    }}>
                                        {notif.title}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        color: 'var(--ui-muted)',
                                        marginTop: '4px'
                                    }}>
                                        {notif.message}
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--ui-muted)',
                                        marginTop: '6px'
                                    }}>
                                        {new Date(notif.created_at).toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                    {!notif.is_read && (
                                        <div style={{
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '50%',
                                            background: '#4f46e5',
                                            marginTop: '4px'
                                        }} />
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(notif.id);
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--ui-muted)',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            padding: '4px 8px'
                                        }}
                                    >

                                    </button>
                                </div>
                            </div>
                        ))}

                        {total > notifications.length && (
                            <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                <button
                                    onClick={() => setOffset(offset + limit)}
                                    style={{
                                        padding: '8px 24px',
                                        background: 'var(--ui-subtle)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    Load More
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Notifications;
