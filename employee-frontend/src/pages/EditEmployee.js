import { API_BASE } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const EditEmployee = () => {
    const navigate = useNavigate();
    const { code } = useParams();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        mobile_number: '',
        date_of_birth: '',
        joining_date: '',
        role: 'Employee'
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchEmployee();
    }, []);

    const fetchEmployee = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${API_BASE}/api/employee/${code}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setFormData({
                first_name: response.data.first_name || '',
                last_name: response.data.last_name || '',
                email: response.data.email || '',
                mobile_number: response.data.mobile_number || '',
                date_of_birth: response.data.date_of_birth || '',
                joining_date: response.data.joining_date || '',
                role: response.data.role || 'Employee'
            });
        } catch (err) {
            setError('Failed to fetch employee details!');
        }
        setFetching(false);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_BASE}/api/employee/update/${code}`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('✅ Employee updated successfully!');
            navigate('/dashboard');
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to update employee!';
            setError(msg);
        }
        setLoading(false);
    };

    if (fetching) {
        return (
            <div style={{ padding: '90px 40px 40px', textAlign: 'center' }}>
                <h2>⏳ Loading...</h2>
            </div>
        );
    }

    return (
        <div style={{ padding: '90px 40px 40px', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--ui-text)', marginBottom: '24px' }}>✏️ Edit Employee</h2>
            <p style={{ color: 'var(--ui-muted)', marginBottom: '16px' }}>Employee Code: <b>{code}</b></p>

            {error && (
                <div style={{
                    background: 'var(--ui-danger-bg)',
                    color: 'var(--ui-danger)',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px'
                }}>
                    ❌ {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{
                background: 'var(--ui-surface)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>
                        First Name *
                    </label>
                    <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
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
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>
                        Last Name *
                    </label>
                    <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <label>Date of birth <input type="date" required value={formData.date_of_birth}
                        onChange={event => setFormData({ ...formData, date_of_birth: event.target.value })} /></label>
                    <label>Joining date <input type="date" required value={formData.joining_date}
                        onChange={event => setFormData({ ...formData, joining_date: event.target.value })} /></label>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Mobile number <input type="tel" autoComplete="tel" inputMode="tel"
                        placeholder="+91 98765 43210" maxLength={24} value={formData.mobile_number}
                        onChange={event => setFormData({ ...formData, mobile_number: event.target.value })} /></label>
                </div>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>
                        Email *
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
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
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>
                        Role
                    </label>
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                        }}
                    >
                        <option value="Employee">👤 Employee</option>
                        <option value="Admin">👑 Admin</option>
                        <option value="HR">👔 HR</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        {loading ? '⏳ Updating...' : '✅ Update Employee'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        style={{
                            padding: '12px 24px',
                            background: 'var(--ui-subtle)',
                            color: 'var(--ui-text)',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditEmployee;