import { API_BASE } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './Dashboard.module.css';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState({
        action: '',
        entity_type: '',
        start_date: '',
        end_date: '',
        limit: 50
    });

    useEffect(() => {
        fetchLogs();
    }, [filters]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams(filters);
            const response = await axios.get(
                `${API_BASE}/api/audit/logs?${params}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setLogs(response.data.data);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Fetch logs error:', error);
        }
        setLoading(false);
    };

    const getActionColor = (action) => {
        if (action.includes('CREATE')) return '#10b981';
        if (action.includes('UPDATE')) return '#d97706';
        if (action.includes('DELETE')) return '#ef4444';
        if (action.includes('APPROVE')) return '#059669';
        if (action.includes('REJECT')) return '#b91c1c';
        if (action.includes('LOGIN')) return '#3b82f6';
        return '#6b7280';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-IN');
    };

    return (
        <div style={{ padding: 0, background: 'var(--ui-bg)', minHeight: '100vh' }}>
            <div style={{ background: 'var(--ui-surface)', padding: '24px', borderRadius: '16px' }}>
                <h2 style={{ marginBottom: '20px' }}>Audit Logs</h2>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <select
                        value={filters.action}
                        onChange={(e) => setFilters({...filters, action: e.target.value})}
                        style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    >
                        <option value="">All Actions</option>
                        <option value="CREATE">CREATE</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                        <option value="APPROVE">APPROVE</option>
                        <option value="REJECT">REJECT</option>
                        <option value="LOGIN">LOGIN</option>
                    </select>

                    <select
                        value={filters.entity_type}
                        onChange={(e) => setFilters({...filters, entity_type: e.target.value})}
                        style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    >
                        <option value="">All Entities</option>
                        <option value="Employee">Employee</option>
                        <option value="Leave">Leave</option>
                        <option value="User">User</option>
                    </select>

                    <input
                        type="date"
                        value={filters.start_date}
                        onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                        style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <input
                        type="date"
                        value={filters.end_date}
                        onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                        style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />

                    <button
                        onClick={() => fetchLogs()}
                        style={{
                            padding: '8px 20px',
                            background: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Filter
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
                ) : (
                    <>
                        <div style={{ marginBottom: '12px', color: 'var(--ui-muted)' }}>
                            Total: {total} logs
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--ui-subtle)' }}>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Time</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>User</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Entity</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px', fontSize: '12px' }}>
                                                {formatDate(log.created_at)}
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                {log.employee?.first_name} {log.employee?.last_name || log.employee_code}
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <span style={{
                                                    padding: '2px 10px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    background: getActionColor(log.action),
                                                    color: 'white'
                                                }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px' }}>{log.entity_type}</td>
                                            <td style={{ padding: '10px', fontSize: '12px', maxWidth: '200px' }}>
                                                {log.entity_id && <div>ID: {log.entity_id}</div>}
                                                {log.status && <div>Status: {log.status}</div>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuditLogs;
