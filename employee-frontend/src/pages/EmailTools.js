import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

export default function EmailTools() {
    const [status, setStatus] = useState('');
    const [sending, setSending] = useState(false);

    async function send(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const fields = new FormData(form);
        const employeeCodes = [...new Set(fields.get('codes').split(/[,\s]+/).filter(Boolean))];
        if (!employeeCodes.length) return setStatus('Enter at least one employee code.');
        setSending(true);
        setStatus('');
        try {
            const { data } = await axios.post(`${API_BASE}/api/email/send-bulk-notification`, {
                employeeCodes, subject: fields.get('subject'), message: fields.get('message')
            }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            setStatus(data.message);
            if (data.failed === 0) form.reset();
        } catch (error) {
            setStatus(error.response?.data?.error || 'Could not send email.');
        } finally {
            setSending(false);
        }
    }

    return <section>
        <h2>Send Employee Email</h2>
        <form onSubmit={send}>
            <p><label>Employee codes (comma separated) <input name="codes" required maxLength={5000} /></label></p>
            <p><label>Subject <input name="subject" required maxLength={200} /></label></p>
            <p><label>Message <textarea name="message" required maxLength={10000} /></label></p>
            <button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send Email'}</button>
        </form>
        <p role="status">{status}</p>
    </section>;
}
