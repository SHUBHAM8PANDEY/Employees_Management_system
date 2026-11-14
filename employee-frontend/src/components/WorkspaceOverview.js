import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowUpRight, CalendarCheck, CalendarDays, Clock3, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';
import { Skeleton } from './Skeleton';
import styles from './WorkspaceOverview.module.css';

const colors = ['#634ed4', '#20a78b', '#e6a550', '#e17686', '#8995b4'];

export default function WorkspaceOverview({ token }) {
    const [state, setState] = useState(null);
    useEffect(() => {
        const controller = new AbortController();
        const config = { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal };
        Promise.allSettled([
            axios.get(`${API_BASE}/api/attendance/admin/all?limit=1`, config),
            axios.get(`${API_BASE}/api/reports/statistics`, config),
            axios.get(`${API_BASE}/api/employee/all?limit=1`, config),
            axios.get(`${API_BASE}/api/reports/workspace-overview`, config)
        ]).then(([attendance, leave, employees, overview]) => {
            if (!controller.signal.aborted) setState({
                attendance: attendance.value?.data?.summary,
                leave: leave.value?.data,
                employees: overview.value?.data?.totals.employees ?? employees.value?.data?.pagination?.total,
                overview: overview.value?.data
            });
        });
        return () => controller.abort();
    }, [token]);

    const attendance = state?.attendance;
    const trends = (state?.leave?.monthlyTrends || []).filter(entry => entry.month);
    const peak = Math.max(1, ...trends.map(entry => Number(entry.count)));
    const distribution = attendance ? [
        ['Present', attendance.present], ['Absent', attendance.absent], ['On leave', attendance.onLeave],
        ['Partial day', attendance.halfDay + attendance.shortLeave], ['Holiday', attendance.holiday]
    ] : [];
    const total = distribution.reduce((sum, [, value]) => sum + value, 0);
    let offset = 0;
    const ring = distribution.map(([, value], index) => {
        const start = offset;
        offset += value * 100 / Math.max(total, 1);
        return `${colors[index]} ${start}% ${offset}%`;
    }).join(', ');

    return <section className={styles.overview} aria-labelledby="overview-title">
        <div className={styles.hero}>
            <div><p>People operations</p><h2 id="overview-title">Workforce overview</h2>
                <span>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeZone: 'Asia/Kolkata' }).format(new Date())}</span></div>
            <Link to="/attendance" className="ui-button">Open attendance <ArrowUpRight size={15} /></Link>
        </div>
        {!state ? <Skeleton label="Loading workforce statistics" rows={3} /> : <>
            <div className={styles.metrics}>
                {[
                    ['Employees', state.employees, Users], ['Present today', attendance?.present, CalendarCheck],
                    ['On leave today', attendance?.onLeave, CalendarDays], ['Pending requests', state.leave?.pendingLeaves, Clock3]
                ].map(([label, value, Icon]) => <div className="ui-panel" key={label}>
                    <Icon size={19} /><strong>{value ?? '—'}</strong><span>{label}</span>
                </div>)}
            </div>
            <div className={styles.charts}>
                <section className="ui-panel">
                    <h3>Attendance today</h3>
                    {attendance ? <div className={styles.attendanceChart}>
                        <div aria-hidden="true" className={styles.ring} style={total ? { background: `conic-gradient(${ring})` } : undefined}>
                            <strong>{total}<small>Employees</small></strong>
                        </div>
                        <ul>{distribution.map(([label, value], index) => <li key={label}>
                            <i style={{ background: colors[index] }} />{label}<b>{value}</b></li>)}</ul>
                    </div> : <p className="ui-muted">Attendance totals unavailable.</p>}
                </section>
                <section className="ui-panel">
                    <h3>Leave requests by month</h3>
                    {trends.length ? <div className={styles.trends}>
                        {trends.map(({ month, count }) => <div key={month} className={styles.barRow}>
                            <span>{month}</span><div aria-hidden="true"><i style={{ width: `${Number(count) / peak * 100}%` }} /></div><b>{count}</b>
                        </div>)}
                    </div> : <p className="ui-muted">{state.leave ? 'No dated leave requests.' : 'Leave trends unavailable.'}</p>}
                </section>
            </div>
            {state.overview && <div className={styles.charts}>
                <section className="ui-panel"><h3>Upcoming milestones</h3>
                    {state.overview.upcoming.length ? <ul className={styles.activity}>{state.overview.upcoming.map(item =>
                        <li key={item.code + item.kind + item.date}><strong>{item.name}</strong><span>{item.kind} · {item.date}</span></li>
                    )}</ul> : <p className="ui-muted">No upcoming milestones.</p>}
                </section>
                <section className="ui-panel"><h3>Pending leave requests</h3>
                    {state.overview.pending.length ? <ul className={styles.activity}>{state.overview.pending.map(item =>
                        <li key={item.id}><strong>{item.name}</strong><span>{item.leave_type} · {item.start_date}</span></li>
                    )}</ul> : <p className="ui-muted">No pending leave requests.</p>}
                </section>
            </div>}
        </>}
    </section>;
}
