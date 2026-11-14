import { API_BASE } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const EmployeeLeave = () => {
    const navigate = useNavigate();
    const [leaves, setLeaves] = useState([]);
    const [leaveBalance, setLeaveBalance] = useState(null);
    const [formData, setFormData] = useState({
        leave_type: 'Sick Leave',
        start_date: '',
        end_date: '',
        reason: '',
        days: 1
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }

        try {
            const headers = { Authorization: `Bearer ${token}` };
            const [leaveRes, profileRes] = await Promise.all([
                axios.get(`${API_BASE}/api/leaves/my-leaves`, { headers }),
                axios.get(`${API_BASE}/api/employee/me`, { headers })
            ]);
            // ✅ Fix: Ensure leaves is always an array
            setLeaves(leaveRes.data?.data || leaveRes.data || []);
            setLeaveBalance(profileRes.data?.leaveBalance);
        } catch (err) {
            setError('Failed to fetch data!');
            setLeaves([]); // ✅ Set empty array on error
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_BASE}/api/leaves/apply`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('✅ Leave applied successfully!');
            setFormData({ leave_type: 'Sick Leave', start_date: '', end_date: '', reason: '', days: 1 });
            fetchData();
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to apply leave!';
            setError(msg);
        }
        setLoading(false);
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
        window.location.reload();
    };

    return (
        <div style={{ padding: '90px 40px 40px', background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '70px',
                background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 40px',
                zIndex: 999
            }}>
                <h1 style={{ color: 'white', fontSize: '20px', fontWeight: '800' }}>
                    🌐 HR<span style={{ color: '#818cf8' }}>Dashboard</span>
                </h1>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                        👤 {localStorage.getItem('first_name') || 'Employee'}
                    </span>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{
                            background: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        📊 Dashboard
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '8px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {error && (
                <div style={{
                    background: '#fee2e2',
                    color: '#b91c1c',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    marginBottom: '16px'
                }}>
                    ❌ {error}
                </div>
            )}

            {/* Leave Balance Cards */}
            {leaveBalance && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', padding: '20px', borderRadius: '16px', color: 'white' }}>
                        <h4>Sick Leave</h4>
                        <div style={{ fontSize: '28px', fontWeight: '800' }}>
                            {leaveBalance.sick?.left || 0}/{leaveBalance.sick?.total || 12}
                        </div>
                        <small>Used: {leaveBalance.sick?.taken || 0}</small>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', padding: '20px', borderRadius: '16px', color: 'white' }}>
                        <h4>Casual Leave</h4>
                        <div style={{ fontSize: '28px', fontWeight: '800' }}>
                            {leaveBalance.casual?.left || 0}/{leaveBalance.casual?.total || 15}
                        </div>
                        <small>Used: {leaveBalance.casual?.taken || 0}</small>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', padding: '20px', borderRadius: '16px', color: 'white' }}>
                        <h4>Paid Leave</h4>
                        <div style={{ fontSize: '28px', fontWeight: '800' }}>
                            {leaveBalance.paid?.left || 0}/{leaveBalance.paid?.total || 10}
                        </div>
                        <small>Used: {leaveBalance.paid?.taken || 0}</small>
                    </div>
                </div>
            )}

            {/* Apply Leave Form */}
            <div className="leave-columns" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.5fr',
                gap: '24px'
            }}>
                <div style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{ marginBottom: '16px' }}>✈️ Apply Leave</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Leave Type</label>
                            <select
                                value={formData.leave_type}
                                onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px'
                                }}
                            >
                                <option value="Sick Leave">🤒 Sick Leave</option>
                                <option value="Casual Leave">🏖️ Casual Leave</option>
                                <option value="Paid Leave">💵 Paid Leave</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Start Date</label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>End Date</label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Total Days</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.days}
                                onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Reason</label>
                            <textarea
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                required
                                rows="3"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            {loading ? '⏳ Applying...' : '✅ Apply Leave'}
                        </button>
                    </form>
                </div>

                {/* Leave History */}
                <div style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{ marginBottom: '16px' }}>📜 My Leave History</h3>
                    {/* ✅ Fix: Check if leaves is array before using length */}
                    {!leaves || leaves.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                            No leaves applied yet!
                        </p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Duration</th>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Days</th>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* ✅ Fix: Use (leaves || []) to ensure array */}
                                    {(leaves || []).map((leave) => (
                                        <tr key={leave.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px' }}>{leave.leave_type}</td>
                                            <td style={{ padding: '8px', fontSize: '12px' }}>
                                                {leave.start_date} to {leave.end_date}
                                            </td>
                                            <td style={{ padding: '8px' }}><b>{leave.days || 1}</b></td>
                                            <td style={{ padding: '8px' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    background: leave.status === 'Approved' ? '#dcfce7' : leave.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                                                    color: leave.status === 'Approved' ? '#15803d' : leave.status === 'Rejected' ? '#b91c1c' : '#d97706'
                                                }}>
                                                    {leave.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeLeave;