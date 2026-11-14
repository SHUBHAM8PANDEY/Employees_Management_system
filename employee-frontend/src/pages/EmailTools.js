import React, { useState } from 'react';
import axios from 'axios';
import styles from './EmailTools.module.css';
import { API_BASE } from '../config';

export default function EmailTools() {
    const [status, setStatus] = useState(null);
    const [sending, setSending] = useState(false);

    async function send(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const fields = new FormData(form);
        const employeeCodes = [...new Set(fields.get('codes').split(/[,\s]+/).filter(Boolean))];
        if (!employeeCodes.length) return setStatus({ kind: 'error', text: 'Enter at least one employee code.' });
        setSending(true);
        setStatus(null);
        try {
            const { data } = await axios.post(`${API_BASE}/api/email/send-bulk-notification`, {
                employeeCodes, subject: fields.get('subject'), message: fields.get('message')
            }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            setStatus({ kind: data.failed ? 'error' : 'success', text: data.message });
            if (data.failed === 0) form.reset();
        } catch (error) {
            setStatus({ kind: 'error', text: error.response?.data?.error || 'Could not send email.' });
        } finally {
            setSending(false);
        }
    }

    return <section className={styles.panel}>
        <header><h2>Compose email</h2><p>Send an update to one or more employees.</p></header>
        <form onSubmit={send}>
            <p><label>Recipients <input name="codes" placeholder="EMP-12, EMP-24" required maxLength={5000} /></label></p>
            <p><label>Subject <input name="subject" required maxLength={200} /></label></p>
            <p><label>Message <textarea name="message" required maxLength={10000} /></label></p>
            <button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send Email'}</button>
        </form>
        {status && <p role={status.kind === 'error' ? 'alert' : 'status'} className={styles[status.kind]}>{status.text}</p>}
    </section>;
}
