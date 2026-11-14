import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarCheck, CalendarDays, Clock3 } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config';
import { Skeleton } from './Skeleton';
import styles from './WorkspaceOverview.module.css';

export default function EmployeeOverview({ profile }) {
    const [attendance, setAttendance] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const controller = new AbortController();
        axios.get(`${API_BASE}/api/attendance/today`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            signal: controller.signal
        }).then(({ data }) => setAttendance(data)).catch(() => {}).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, []);

    const status = !attendance ? 'Unavailable' : attendance.isPunchedOut
        ? attendance.data?.status : attendance.isPunchedIn ? 'Shift in progress'
            : attendance.weeklyOff ? 'Weekly off' : attendance.data?.status || 'Not punched in';
    const formatTime = date => date ? new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', timeStyle: 'short'
    }).format(new Date(date)) : '—';
    return <section className={styles.overview} aria-labelledby="employee-overview">
        <header className={styles.hero}>
            <div><h2 id="employee-overview">{profile?.first_name ? `Welcome, ${profile.first_name}` : 'My workspace'}</h2>
                <span>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeZone: 'Asia/Kolkata' }).format(new Date())}</span></div>
            <Link className="ui-button" to="/attendance">Open attendance <ArrowUpRight size={15} /></Link>
        </header>
        <div className={styles.charts}>
            <section className="ui-panel"><h3><CalendarCheck size={17} /> Attendance today</h3>
                {loading ? <Skeleton label="Loading attendance" rows={2} /> : <dl className={styles.activity}>
                    <div><dt>Status</dt><dd>{status}</dd></div>
                    <div><dt>Punch in · IST</dt><dd>{formatTime(attendance?.data?.punch_in)}</dd></div>
                    <div><dt>Punch out · IST</dt><dd>{formatTime(attendance?.data?.punch_out)}</dd></div>
                </dl>}
            </section>
            <section className="ui-panel"><h3><CalendarDays size={17} /> Leave balances</h3>
                <dl className={styles.activity}>{[['sick', 'Sick'], ['casual', 'Casual'], ['paid', 'Paid']].map(([key, label]) =>
                    <div key={key}><dt>{label}</dt><dd>{profile?.leaveBalance?.[key]?.left ?? '—'} days left</dd></div>
                )}</dl>
                <Link className="ui-button" to="/employee-leave"><Clock3 size={15} /> My leave</Link>
            </section>
        </div>
    </section>;
}
