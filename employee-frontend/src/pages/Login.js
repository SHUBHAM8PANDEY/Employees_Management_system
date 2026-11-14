import { Activity, Eye, EyeOff, ArrowRight } from 'lucide-react';
import './Login.css';
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

    return <main className="sign-in">
        <section className="sign-in__brand">
            <a className="sign-in__logo" href="/"><Activity size={23} /> WorkHub</a>
            <p>People operations</p>
            <h1>Manage your people in one workspace.</h1>
            <div className="sign-in__modules"><span>People</span><span>Attendance</span><span>Leave</span></div>
        </section>
        <section className="sign-in__form">
            <div>
                <h2>Sign in</h2>
                <p>Use your work account to continue.</p>
                {error && <p role="alert" className="sign-in__error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <label>Work email<input type="email" autoComplete="username" value={formData.email} required
                        onChange={event => setFormData({ ...formData, email: event.target.value })} /></label>
                    <label>Password<div className="sign-in__password">
                        <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={formData.password} required
                            onChange={event => setFormData({ ...formData, password: event.target.value })} />
                        <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div></label>
                    <button className="ui-button ui-button-primary" type="submit" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} /></button>
                </form>
            </div>
        </section>
    </main>;
};

export default Login;
