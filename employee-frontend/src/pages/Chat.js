import { API_BASE } from '../config';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { connectSocket } from '../utils/socket';
import Avatar from '../components/Avatar';
import styles from './Chat.module.css';



const formatLastSeen = (isOnline, lastSeen) => {
    if (isOnline) return 'Online';
    if (!lastSeen) return 'Offline';

    const date = new Date(lastSeen);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);

    if (diffMins < 1) return 'Last seen just now';
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;

    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
        return `Last seen today ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return `Last seen yesterday ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return `Last seen ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
};

const Chat = () => {
    const token = localStorage.getItem('token');
    const employeeCode = localStorage.getItem('employee_code');

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [contacts, setContacts] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [typing, setTyping] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarTab, setSidebarTab] = useState('all');

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const selectedContactRef = useRef(null);

    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const updateContactPresence = useCallback((code, isOnline, lastSeen) => {
        const updater = (c) =>
            c.employee_code === code
                ? { ...c, isOnline, last_seen: lastSeen ?? c.last_seen }
                : c;

        setContacts((prev) => [...prev.map(updater)].sort((a, b) => {
            if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
            return a.first_name.localeCompare(b.first_name);
        }));
        setConversations((prev) => prev.map(updater));
        setSelectedContact((prev) => (prev?.employee_code === code ? { ...prev, isOnline, last_seen: lastSeen ?? prev.last_seen } : prev));
    }, []);

    const fetchConversations = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(res.data.data || []);
        } catch (err) {
            console.error(err);
        }
    }, [token]);

    const fetchContacts = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/chat/contacts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setContacts(res.data.data || []);
        } catch (err) {
            setError('Failed to load contacts');
        }
    }, [token]);

    const loadHistory = async (otherCode) => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.get(`${API_BASE}/api/chat/history/${otherCode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data.data || []);
            if (res.data.partner) {
                setSelectedContact((prev) => ({ ...prev, ...res.data.partner }));
            }
            fetchConversations();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load messages');
        }
        setLoading(false);
    };

    const isMessageForChat = (msg, contactCode) => {
        if (!contactCode) return false;
        return (
            (msg.sender_code === employeeCode && msg.receiver_code === contactCode) ||
            (msg.sender_code === contactCode && msg.receiver_code === employeeCode)
        );
    };

    useEffect(() => {
        if (!token) return;

        fetchContacts();
        fetchConversations();

        const socket = connectSocket(token);
        if (!socket) return;
        socketRef.current = socket;

        const onConnect = () => {
            socket.emit('get_presence', (response) => {
                Object.entries(response?.data || {}).forEach(([code, info]) => {
                    if (info.isOnline) updateContactPresence(code, true, null);
                });
            });
        };

        if (socket.connected) onConnect();

        const onReceiveMessage = (msg) => {
            if (isMessageForChat(msg, selectedContactRef.current?.employee_code)) {
                setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            }
            fetchConversations();
        };

        socket.on('connect', onConnect);
        socket.on('receive_message', onReceiveMessage);
        socket.on('new_conversation_message', fetchConversations);
        socket.on('presence_update', ({ employee_code, isOnline, last_seen }) => {
            updateContactPresence(employee_code, isOnline, last_seen);
        });
        socket.on('user_typing', ({ isTyping, from }) => {
            if (selectedContactRef.current?.employee_code === from) setTyping(isTyping);
        });

        return () => {
            socket.off('connect', onConnect);
            socket.off('receive_message', onReceiveMessage);
            socket.off('new_conversation_message', fetchConversations);
            socket.off('presence_update');
            socket.off('user_typing');
        };
    }, [token, fetchContacts, fetchConversations, updateContactPresence]);

    const selectContact = async (contact) => {
        if (sending) return;
        setAttachment(null);
        setSelectedContact(contact);
        setMessages([]);
        await loadHistory(contact.employee_code);
    };

    const handleSend = async () => {
        if ((!newMessage.trim() && !attachment) || sending || !selectedContact) return;
        const socket = socketRef.current;
        if (!socket?.connected) return setError('Chat is reconnecting. Please try again.');
        setSending(true);
        setError('');
        const receiverCode = selectedContact.employee_code;
        try {
            const file = attachment && {
                name: attachment.name, type: attachment.type, data: await attachment.arrayBuffer()
            };
            const response = await socket.timeout(20000).emitWithAck('send_message', {
                message: newMessage.trim(), receiverCode, attachment: file
            });
            if (response?.error) throw new Error(response.error);
            setNewMessage('');
            setAttachment(null);
            if (selectedContactRef.current?.employee_code === receiverCode) {
                setMessages(previous => previous.some(m => m.id === response.message.id)
                    ? previous : [...previous, response.message]);
            }
            fetchConversations();
        } catch (error) {
            setError(error.message || 'Could not send message.');
        } finally {
            setSending(false);
        }
    };

    const downloadAttachment = async (message) => {
        try {
            const response = await axios.get(`${API_BASE}/api/chat/attachments/${message.id}`, {
                headers: { Authorization: `Bearer ${token}` }, responseType: 'blob'
            });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = message.attachment_name;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setError('Could not download the attachment.');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTyping = (value) => {
        setNewMessage(value);
        if (!selectedContact) return;

        socketRef.current?.emit('typing', { receiverCode: selectedContact.employee_code, isTyping: true });
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socketRef.current?.emit('typing', { receiverCode: selectedContact.employee_code, isTyping: false });
        }, 1000);
    };

    const getUnreadCount = (code) => conversations.find((c) => c.employee_code === code)?.unreadCount || 0;

    const filteredContacts = contacts.filter((c) => {
        const q = searchQuery.toLowerCase();
        const match =
            c.first_name?.toLowerCase().includes(q) ||
            c.last_name?.toLowerCase().includes(q) ||
            c.employee_code?.toLowerCase().includes(q);
        if (sidebarTab === 'online') return match && c.isOnline;
        if (sidebarTab === 'recent') {
            const codes = new Set(conversations.map((cv) => cv.employee_code));
            return match && codes.has(c.employee_code);
        }
        return match;
    });

    const sidebarList =
        sidebarTab === 'recent'
            ? conversations
                  .map((conv) => {
                      const contact = contacts.find((c) => c.employee_code === conv.employee_code);
                      return contact ? { ...contact, ...conv } : conv;
                  })
                  .filter((c) => {
                      const q = searchQuery.toLowerCase();
                      return (
                          c.first_name?.toLowerCase().includes(q) ||
                          c.last_name?.toLowerCase().includes(q) ||
                          c.employee_code?.toLowerCase().includes(q)
                      );
                  })
            : filteredContacts;

    const renderContact = (person) => (
        <button
            key={person.employee_code}
            type="button"
            className={`${styles.contactItem} ${
                selectedContact?.employee_code === person.employee_code ? styles.contactItemActive : ''
            }`}
            onClick={() => selectContact(person)}
        >
            <Avatar
                src={person.profile_picture}
                firstName={person.first_name}
                lastName={person.last_name}
                size="md"
                showStatus
                isOnline={person.isOnline}
            />
            <div className={styles.contactInfo}>
                <strong>{person.first_name} {person.last_name}</strong>
                <span className={person.isOnline ? styles.onlineText : styles.contactMeta}>
                    {formatLastSeen(person.isOnline, person.last_seen)}
                </span>
                {sidebarTab === 'recent' && person.lastMessage && (
                    <span className={styles.lastPreview}>{person.lastMessage}</span>
                )}
            </div>
            {getUnreadCount(person.employee_code) > 0 && (
                <span className={styles.unreadBadge}>{getUnreadCount(person.employee_code)}</span>
            )}
        </button>
    );

    return (
        <div className={styles.chatRoot}>
            <aside className={styles.contactsPanel}>
                <div className={styles.panelHead}>
                    <h2>Contacts</h2>
                    <input
                        type="text"
                        placeholder="Search people..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
                <div className={styles.tabs}>
                    {['all', 'online', 'recent'].map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            className={`${styles.tab} ${sidebarTab === tab ? styles.tabActive : ''}`}
                            onClick={() => setSidebarTab(tab)}
                        >
                            {tab === 'all' ? 'All' : tab === 'online' ? 'Online' : 'Recent'}
                        </button>
                    ))}
                </div>
                <div className={styles.contactList}>
                    {sidebarList.length === 0 ? (
                        <div className={styles.emptySidebar}>No contacts found</div>
                    ) : (
                        sidebarList.map(renderContact)
                    )}
                </div>
            </aside>

            <section className={styles.chatPanel}>
                {!selectedContact ? (
                    <div className={styles.emptyState}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <p>Select a contact to start messaging</p>
                    </div>
                ) : (
                    <>
                        {error && <div className={styles.error}>{error}</div>}
                        <div className={styles.chatHead}>
                            <Avatar
                                src={selectedContact.profile_picture}
                                firstName={selectedContact.first_name}
                                lastName={selectedContact.last_name}
                                size="lg"
                                showStatus
                                isOnline={selectedContact.isOnline}
                            />
                            <div className={styles.chatHeadInfo}>
                                <h3>{selectedContact.first_name} {selectedContact.last_name}</h3>
                                <p className={selectedContact.isOnline ? styles.onlineText : ''}>
                                    {formatLastSeen(selectedContact.isOnline, selectedContact.last_seen)}
                                </p>
                            </div>
                        </div>

                        <div className={styles.messages}>
                            {loading ? (
                                <div className={styles.loading}>Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p>No messages yet. Say hello.</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`${styles.bubble} ${
                                            msg.sender_code === employeeCode ? styles.sent : styles.received
                                        }`}
                                    >
                                        <div>{msg.message}</div>
                                        {msg.attachment_name && (
                                            <button type="button" onClick={() => downloadAttachment(msg)}>
                                                Download {msg.attachment_name}
                                            </button>
                                        )}
                                        <div className={styles.bubbleMeta}>
                                            {new Date(msg.created_at).toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                            {typing && <div className={styles.typing}>{selectedContact.first_name} is typing...</div>}
                            <div ref={messagesEndRef} />
                        </div>

                        <div>
                            <label>
                                Attach PDF or image
                                <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
                                    disabled={sending} onChange={event => {
                                        const file = event.currentTarget.files[0];
                                        event.currentTarget.value = '';
                                        if (!file) return;
                                        if (file.size > 4 * 1024 * 1024) return setError('File must be 4 MB or smaller.');
                                        setError('');
                                        setAttachment(file);
                                    }} />
                            </label>
                            {attachment && <button type="button" disabled={sending} onClick={() => setAttachment(null)}>
                                Remove {attachment.name}
                            </button>}
                        </div>
                        <div className={styles.inputBar}>
                            <textarea
                                value={newMessage}
                                onChange={(e) => handleTyping(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Message ${selectedContact.first_name}...`}
                                rows={1}
                            />
                            <button
                                type="button"
                                className={styles.sendBtn}
                                onClick={handleSend}
                                disabled={(!newMessage.trim() && !attachment) || sending}
                            >
                                Send
                            </button>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

export default Chat;
