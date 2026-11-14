import { API_BASE } from '../config';
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AddEmployee = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        date_of_birth: '',
        joining_date: '',
        password: '123456',
        role: 'Employee',
        addresses: [{ address_line: '', city: '' }],
        qualifications: [{ degree: '', institution: '' }],
        skills: [{ skill_name: '' }]
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Address handlers
    const addAddress = () => {
        setFormData({
            ...formData,
            addresses: [...formData.addresses, { address_line: '', city: '' }]
        });
    };
    const removeAddress = (index) => {
        const newAddresses = formData.addresses.filter((_, i) => i !== index);
        setFormData({ ...formData, addresses: newAddresses });
    };
    const updateAddress = (index, field, value) => {
        const newAddresses = [...formData.addresses];
        newAddresses[index][field] = value;
        setFormData({ ...formData, addresses: newAddresses });
    };

    // Qualification handlers
    const addQualification = () => {
        setFormData({
            ...formData,
            qualifications: [...formData.qualifications, { degree: '', institution: '' }]
        });
    };
    const removeQualification = (index) => {
        const newQualifications = formData.qualifications.filter((_, i) => i !== index);
        setFormData({ ...formData, qualifications: newQualifications });
    };
    const updateQualification = (index, field, value) => {
        const newQualifications = [...formData.qualifications];
        newQualifications[index][field] = value;
        setFormData({ ...formData, qualifications: newQualifications });
    };

    // Skill handlers
    const addSkill = () => {
        setFormData({
            ...formData,
            skills: [...formData.skills, { skill_name: '' }]
        });
    };
    const removeSkill = (index) => {
        const newSkills = formData.skills.filter((_, i) => i !== index);
        setFormData({ ...formData, skills: newSkills });
    };
    const updateSkill = (index, value) => {
        const newSkills = [...formData.skills];
        newSkills[index].skill_name = value;
        setFormData({ ...formData, skills: newSkills });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_BASE}/api/employee/add`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('✅ Employee added successfully!');
            navigate('/dashboard');
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to add employee!';
            setError(msg);
        }
        setLoading(false);
    };

    return (
        <div style={{ padding: 0, maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--ui-text)', marginBottom: '20px' }}>➕ Add New Employee</h2>

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
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
            }}>
                {/* Basic Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '13px' }}>First Name *</label>
                        <input
                            type="text"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            required
                            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '13px' }}>Last Name *</label>
                        <input
                            type="text"
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            required
                            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <label>Date of birth (DOB) <input type="date" max={new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format()} required value={formData.date_of_birth}
                        onChange={event => setFormData({ ...formData, date_of_birth: event.target.value })} /></label>
                    <label>Joining date <input type="date" required value={formData.joining_date}
                        onChange={event => setFormData({ ...formData, joining_date: event.target.value })} /></label>
                </div>
                <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '13px' }}>Email *</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '13px' }}>Role</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        >
                            <option value="Employee">👤 Employee</option>
                            <option value="Admin">👑 Admin</option>
                            <option value="HR">👔 HR</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '13px' }}>Password</label>
                        <input
                            type="text"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        />
                        <small style={{ color: 'var(--ui-muted)' }}>Default: 123456</small>
                    </div>
                </div>

                <hr style={{ margin: '20px 0', borderColor: '#e2e8f0' }} />

                {/* Addresses */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0 }}>📍 Addresses</h4>
                    <button type="button" onClick={addAddress} style={{ padding: '4px 12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Add</button>
                </div>
                {formData.addresses.map((addr, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Address Line"
                            value={addr.address_line}
                            onChange={(e) => updateAddress(index, 'address_line', e.target.value)}
                            style={{ flex: 2, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                        />
                        <input
                            type="text"
                            placeholder="City"
                            value={addr.city}
                            onChange={(e) => updateAddress(index, 'city', e.target.value)}
                            style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                        />
                        {formData.addresses.length > 1 && (
                            <button type="button" onClick={() => removeAddress(index)} style={{ background: 'var(--ui-danger-bg)', color: 'var(--ui-danger)', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                        )}
                    </div>
                ))}

                <hr style={{ margin: '20px 0', borderColor: '#e2e8f0' }} />

                {/* Qualifications */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0 }}>🎓 Education</h4>
                    <button type="button" onClick={addQualification} style={{ padding: '4px 12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Add</button>
                </div>
                {formData.qualifications.map((qual, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Degree (e.g. B.Tech)"
                            value={qual.degree}
                            onChange={(e) => updateQualification(index, 'degree', e.target.value)}
                            style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                        />
                        <input
                            type="text"
                            placeholder="Institution"
                            value={qual.institution}
                            onChange={(e) => updateQualification(index, 'institution', e.target.value)}
                            style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                        />
                        {formData.qualifications.length > 1 && (
                            <button type="button" onClick={() => removeQualification(index)} style={{ background: 'var(--ui-danger-bg)', color: 'var(--ui-danger)', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                        )}
                    </div>
                ))}

                <hr style={{ margin: '20px 0', borderColor: '#e2e8f0' }} />

                {/* Skills */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0 }}>⚡ Skills</h4>
                    <button type="button" onClick={addSkill} style={{ padding: '4px 12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {formData.skills.map((skill, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', background: 'var(--ui-subtle)', padding: '4px 8px', borderRadius: '20px' }}>
                            <input
                                type="text"
                                placeholder="Skill"
                                value={skill.skill_name}
                                onChange={(e) => updateSkill(index, e.target.value)}
                                style={{ border: 'none', background: 'transparent', padding: '4px 4px', width: '80px', outline: 'none' }}
                            />
                            {formData.skills.length > 1 && (
                                <button type="button" onClick={() => removeSkill(index)} style={{ background: 'none', border: 'none', color: 'var(--ui-danger)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                            )}
                        </div>
                    ))}
                </div>

                <hr style={{ margin: '20px 0', borderColor: '#e2e8f0' }} />

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        {loading ? '⏳ Adding...' : '✅ Add Employee'}
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

export default AddEmployee;