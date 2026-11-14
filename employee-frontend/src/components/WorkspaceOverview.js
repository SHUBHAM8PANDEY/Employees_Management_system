import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowUpRight, Cake, CalendarCheck, CalendarDays, Clock3, RefreshCw, UserMinus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';
import { Skeleton } from './Skeleton';
import styles from './WorkspaceOverview.module.css';

const dateLabel = (date, options = { month: 'short', day: 'numeric' }) =>
    new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...options }).format(new Date(date + 'T00:00:00Z'));
const segments = [['present', 'Present'], ['absent', 'Absent'], ['leave', 'On leave']];

function OverviewList({ title, link, items, empty, renderItem }) {
    return <section className="ui-panel">
        <header className={styles.sectionHead}><h3>{title}</h3>
            {link && <Link to={link} aria-label={`Open ${title}`}><ArrowUpRight size={17} /></Link>}</header>
        {items.length ? <ul className={styles.list}>{items.map(renderItem)}</ul> : <p className="ui-muted">{empty}</p>}
    </section>;
}

export default function WorkspaceOverview({ token }) {
    const [data, setData] = useState(null);
    const [days, setDays] = useState('7');
    const [revision, setRevision] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await axios.get(`${API_BASE}/api/reports/workspace-overview`, {
                    params: { days }, headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal, timeout: 15000
                });
                if (!controller.signal.aborted) setData(response.data);
            } catch {
                if (!controller.signal.aborted) setError('Could not refresh the overview. Try again.');
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        void load();
        const timer = setInterval(() => { if (!document.hidden) void load(); }, 60000);
        return () => { controller.abort(); clearInterval(timer); };
    }, [days, revision, token]);

    const peak = Math.max(1, ...(data?.history || []).map(day => day.present + day.absent + day.leave));
    return <section className={styles.overview} aria-labelledby="overview-title">
        <header className={styles.hero}>
            <div><h2 id="overview-title">Workforce overview</h2>
                {data && <p>{dateLabel(data.today, { dateStyle: 'full' })} · India time</p>}</div>
            <button type="button" className="ui-button" disabled={loading} onClick={() => setRevision(previous => previous + 1)}>
                <RefreshCw size={16} /> Refresh
            </button>
        </header>
        {error && <p role="alert">{error}</p>}
        {!data && loading && <Skeleton label="Loading workforce overview" rows={5} />}
        {data && <>
            <div className={styles.metrics}>
                {[
                    ['Employees', 'employees', Users, '/dashboard?tab=employees'],
                    ['Present today', 'present', CalendarCheck, '/attendance'],
                    ['Absent today', 'absent', UserMinus, '/attendance'],
                    ['Pending leave', 'pending', Clock3, '/dashboard?tab=leaves']
                ].map(([label, key, Icon, to]) => <Link className={`ui-panel ${styles.metric}`} key={key} to={to}>
                    <span><Icon size={18} />{label}<ArrowUpRight size={15} /></span>
                    <strong>{data.totals[key]}</strong>
                </Link>)}
            </div>
            <div className={styles.chartRow}>
                <section className="ui-panel">
                    <header className={styles.sectionHead}><h3>Attendance summary</h3><select aria-label="Attendance period" value={days} onChange={event => setDays(event.target.value)}>
                        <option value="7">Last 7 days</option><option value="14">Last 14 days</option>
                    </select></header>
                    <ul className={styles.legend}>{segments.map(([key, label]) => <li key={key}><i className={styles[key]} />{label}</li>)}</ul>
                    <ul className={styles.chart} aria-label="Daily attendance totals">
                        {data.history.map(day => {
                            const label = `${dateLabel(day.date)}: ${day.present} present, ${day.absent} absent, ${day.leave} on leave`;
                            return <li key={day.date} title={label} aria-label={label} tabIndex={0}>
                                <div className={styles.bar}>{segments.map(([key]) =>
                                    <span key={key} className={styles[key]} style={{ height: `${day[key] / peak * 100}%` }} />)}</div>
                                <small>{dateLabel(day.date)}</small>
                            </li>;
                        })}
                    </ul>
                </section>
                <OverviewList title="Upcoming days off" items={data.daysOff} empty="No upcoming days off recorded."
                    renderItem={item => <li key={item.date}><CalendarDays size={17} /><div><strong>{item.label}</strong><small>{dateLabel(item.date)}</small></div></li>} />
            </div>
            <div className={styles.listRow}>
                <OverviewList title="Birthdays & anniversaries" items={data.upcoming} empty="No milestones in the next 45 days."
                    renderItem={item => <li key={`${item.code}/${item.kind}/${item.date}`}><Cake size={17} /><div><strong>{item.name}</strong>
                        <small>{item.kind}{item.years ? ` · ${item.years} yr` : ''} · {dateLabel(item.date)}</small></div></li>} />
                <OverviewList title="Pending leave requests" link="/dashboard?tab=leaves" items={data.pending} empty="No leave requests awaiting review."
                    renderItem={item => <li key={item.id}><Clock3 size={17} /><div><strong>{item.name}</strong>
                        <small>{item.leave_type} · {dateLabel(item.start_date)} – {dateLabel(item.end_date)}</small></div></li>} />
                <OverviewList title="Recent punch-ins" link="/attendance" items={data.arrivals} empty="No punch-ins recorded today."
                    renderItem={item => <li key={item.code}><CalendarCheck size={17} /><div><strong>{item.name}</strong>
                        <small>{new Intl.DateTimeFormat('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(item.time))} · {item.mode || 'Office'}{item.late ? ' · Late' : ''}</small></div></li>} />
            </div>
        </>}
    </section>;
}
