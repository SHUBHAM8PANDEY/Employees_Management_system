import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { Skeleton } from '../components/Skeleton';
import styles from './EmailTools.module.css';

const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
const dateLabel = date => date ? dateFormat.format(new Date(date)) : '—';

export default function EmailHistory() {
    const [page, setPage] = useState(1);
    const [input, setInput] = useState('');
    const [search, setSearch] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [id, setId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailError, setDetailError] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        setResult(null);
        setError('');
        axios.get(`${API_BASE}/api/email/history`, { ...config(), params: { search, page }, signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setResult(data); })
            .catch(() => { if (!controller.signal.aborted) setError('Unable to load email history.'); });
        return () => controller.abort();
    }, [page, search]);
    useEffect(() => {
        if (id === null) return;
        const controller = new AbortController();
        setDetail(null);
        setDetailError('');
        axios.get(`${API_BASE}/api/email/history/${id}`, { ...config(), signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setDetail(data); })
            .catch(() => { if (!controller.signal.aborted) setDetailError('Unable to load this email.'); });
        return () => controller.abort();
    }, [id]);

    return <section className="ui-panel">
        <header className="ui-heading"><h2>Email history</h2></header>
        <form className={styles.historyActions} onSubmit={event => {
            event.preventDefault(); setPage(1); setSearch(input.trim());
        }}>
            <input aria-label="Search email history" placeholder="Search recipient or subject" value={input}
                maxLength={255} onChange={event => setInput(event.target.value)} />
            <button type="submit" className="ui-button">Search</button>
        </form>
        {error ? <p role="alert">{error}</p> : !result ? <Skeleton label="Loading email history" /> :
            result.data.length ? <div className={styles.historyTable}><table>
                <thead><tr><th>Subject</th><th>Recipient</th><th>Status</th><th>Time · IST</th></tr></thead>
                <tbody>{result.data.map(row => <tr key={row.id}>
                    <td><button type="button" className="ui-button" onClick={() => setId(row.id)}>{row.subject}</button></td>
                    <td>{row.to_email}</td><td>{row.status}</td><td>{dateLabel(row.sent_at || row.created_at)}</td>
                </tr>)}</tbody>
            </table></div> : <p>No emails found.</p>}
        <div className={styles.historyActions}>
            <button type="button" className="ui-button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page}</span>
            <button type="button" className="ui-button" disabled={!result?.hasMore} onClick={() => setPage(page + 1)}>Next</button>
        </div>
        {id !== null && <section className="ui-panel">
            <header className="ui-heading"><h3>{detail?.subject || 'Email details'}</h3>
                <button type="button" className="ui-button" onClick={() => setId(null)}>Close</button></header>
            {detailError ? <p role="alert">{detailError}</p> : !detail ? <Skeleton label="Loading email details" rows={2} /> : <>
                <p>To {detail.to_email} · {detail.status} · {dateLabel(detail.sent_at || detail.created_at)}</p>
                {detail.error_message && <p role="status">{detail.error_message}</p>}
                <iframe title="Email body" sandbox="" className={styles.preview}
                    srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><meta name="viewport" content="width=device-width"><style>body{font:15px system-ui;padding:12px;overflow-wrap:anywhere}</style>${detail.body_html}`} />
            </>}
        </section>}
    </section>;
}
