import { API_BASE } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Clear session on login page load
    useEffect(() => {
        localStorage.clear();
        sessionStorage.clear();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_BASE}/api/auth/login`, {
                email: formData.email,
                password: formData.password
            });
            
            const { token, user } = response.data;
            
            localStorage.setItem('token', token);
            localStorage.setItem('employee_code', user.employee_code);
            localStorage.setItem('email', user.email);
            localStorage.setItem('role', user.role);
            localStorage.setItem('first_name', user.first_name || '');
            localStorage.setItem('last_name', user.last_name || '');
            localStorage.setItem('login_time', new Date().toISOString());
            if (user.profile_picture) {
                localStorage.setItem('profile_picture', user.profile_picture);
            }


            if (user.role === 'Admin' || user.role === 'HR') {
                navigate('/dashboard', { replace: true });
            } else if (user.role === 'Employee') {
                navigate('/employee-dashboard', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
            
        } catch (err) {
            const msg = err.response?.data?.error || 'Invalid email or password!';
            setError(msg);
            localStorage.clear();
            sessionStorage.clear();
        }
        setLoading(false);
    };

    return (
        <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            overflow: 'hidden',
            background: '#0a0a1a'
        }}>
            {/* ✅ Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 0,
                    opacity: 0.6
                }}
            >
                <source
                    src="https://cdn.coverr.co/videos/coverr-digital-technology-network-5389/1080p.mp4"
                    type="video/mp4"
                />
            </video>

            {/* Overlay Gradient */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 27, 75, 0.9) 100%)',
                zIndex: 1
            }} />

            {/* Login Card */}
            <div style={{
                position: 'relative',
                zIndex: 2,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                padding: '48px 40px',
                borderRadius: '20px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
                width: '100%',
                maxWidth: '420px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{
                        fontSize: '30px',
                        fontWeight: '800',
                        color: '#1a1a2e',
                        letterSpacing: '-0.5px'
                    }}>
                        🌐 HR<span style={{ color: '#4f46e5' }}>Dashboard</span>
                    </h1>
                    <p style={{
                        color: '#64748b',
                        marginTop: '6px',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}>
                        Secure Employee Management System
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: '#fef2f2',
                        color: '#991b1b',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        fontSize: '13px',
                        border: '1px solid #fecaca',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '18px' }}>🔒</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '18px' }}>
                        <label style={{
                            display: 'block',
                            fontWeight: '600',
                            marginBottom: '6px',
                            color: '#334155',
                            fontSize: '13px'
                        }}>
                            📧 Email Address
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="Enter your email"
                            required
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'all 0.3s',
                                background: 'white'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    <div style={{ marginBottom: '22px' }}>
                        <label style={{
                            display: 'block',
                            fontWeight: '600',
                            marginBottom: '6px',
                            color: '#334155',
                            fontSize: '13px'
                        }}>
                            🔑 Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                placeholder="Enter your password"
                                required
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.3s',
                                    background: 'white',
                                    paddingRight: '50px'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: '#94a3b8',
                                    padding: '4px'
                                }}
                            >
                                {showPassword ? '👁️' : '🙈'}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: '700',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s',
                            boxShadow: '0 4px 20px rgba(79, 70, 229, 0.3)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 8px 30px rgba(79, 70, 229, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 20px rgba(79, 70, 229, 0.3)';
                        }}
                    >
                        {loading ? (
                            <>
                                <span style={{
                                    display: 'inline-block',
                                    width: '18px',
                                    height: '18px',
                                    border: '2px solid white',
                                    borderTopColor: 'transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite'
                                }} />
                                Logging in...
                            </>
                        ) : (
                            '🔐 Sign In'
                        )}
                    </button>
                </form>

                {/* ✅ Footer - No Demo Credentials */}
                <div style={{
                    marginTop: '24px',
                    textAlign: 'center',
                    paddingTop: '20px',
                    borderTop: '1px solid #e2e8f0'
                }}>
                    <p style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        margin: 0
                    }}>
                        © {new Date().getFullYear()} HR Dashboard. All rights reserved.
                    </p>
                    <p style={{
                        fontSize: '11px',
                        color: '#cbd5e1',
                        marginTop: '4px'
                    }}>
                        Secure Employee Management System v2.0
                    </p>
                </div>
            </div>

            {/* ✅ Spin Animation */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Login;