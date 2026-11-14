import styles from './Reports.module.css';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

export default function Reports() {
    const [stats, setStats] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [error, setError] = useState('');
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

    useEffect(() => {
        const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
        Promise.all([
            axios.get(`${API_BASE}/api/reports/statistics`, config),
            axios.get(`${API_BASE}/api/reports/employee-summary`, config)
        ]).then(([statistics, summary]) => {
            setStats(statistics.data);
            setEmployees(summary.data);
        }).catch(() => setError('Could not load leave reports.'));
    }, []);

    async function download() {
        try {
            const { data } = await axios.get(`${API_BASE}/api/reports/leave-report-excel`, {
                headers, responseType: 'blob'
            });
            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'leave-report.xlsx';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setError('Could not download the leave report.');
        }
    }

    return <section className={styles.report}>
        <header className={styles.header}><h2>Leave Reports</h2><button type="button" onClick={download}>Download Excel</button></header>
        {error && <p role="alert">{error}</p>}
        {stats && <dl className={styles.metrics}>{[
            ['Total requests', stats.totalLeaves], ['Pending', stats.pendingLeaves],
            ['Approved', stats.approvedLeaves], ['Rejected', stats.rejectedLeaves]
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        <div className={styles.tableWrap}>
        <table>
            <caption>Remaining leave days</caption>
            <thead><tr><th>Employee</th><th>Sick</th><th>Casual</th><th>Paid</th></tr></thead>
            <tbody>{employees.map(employee => <tr key={employee.employee_code}>
                <th scope="row">{employee.name}</th>
                <td>{employee.leaveBalance.sick.left}</td>
                <td>{employee.leaveBalance.casual.left}</td>
                <td>{employee.leaveBalance.paid.left}</td>
            </tr>)}</tbody>
        </table>
        </div>
    </section>;
}
