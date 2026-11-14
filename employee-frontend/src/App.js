import Reports from './components/Reports';
import EmailTools from './pages/EmailTools';
import { API_BASE } from './config';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddEmployee from './pages/AddEmployee';
import EditEmployee from './pages/EditEmployee';
import EmployeeLeave from './pages/EmployeeLeave';
import AuditLogs from './pages/AuditLogs';
import Notifications from './pages/Notifications';
import Attendance from './pages/Attendance';
import Chat from './pages/Chat';
import AppLayout from './components/layout/AppLayout';
import axios from 'axios';
import { connectSocket, disconnectSocket } from './utils/socket';



const checkAuth = async (token) => {
    if (!token) return { status: 'invalid' };

    try {
        const { data } = await axios.get(`${API_BASE}/api/auth/verify-token`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
        });
        if (!data.valid) return { status: 'invalid' };

        let expiresAt = Number(data.expiresAt);
        if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
            // Older deployments omit the timestamp. Cap their signed JWT lifetime at 24 hours.
            const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const { exp, iat } = JSON.parse(atob(payload));
            expiresAt = Math.min(exp, iat + 86400) * 1000;
        }
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return { status: 'invalid' };
        return { status: 'valid', expiresAt, role: data.user.role };
    } catch (error) {
        return { status: error.response?.status === 401 ? 'invalid' : 'unavailable' };
    }
};

const ProtectedRoute = ({ children, allowedRoles }) => {
    const [session, setSession] = useState(null);
    const token = localStorage.getItem('token');
    const role = session?.role;

    useEffect(() => {
        let disposed = false;
        let timeout;
        const endSession = () => {
            if (localStorage.getItem('token') !== token) return;
            disconnectSocket();
            localStorage.clear();
            sessionStorage.clear();
            setSession({ status: 'invalid' });
        };
        const verifyAuth = async () => {
            const result = await checkAuth(token);
            if (disposed || localStorage.getItem('token') !== token) return;
            if (result.status === 'invalid') return endSession();
            if (result.status === 'unavailable') {
                setSession(previous => previous?.status === 'valid' ? previous : result);
                return;
            }
            localStorage.setItem('role', result.role);
            setSession(result);
            connectSocket(token);
            clearTimeout(timeout);
            timeout = setTimeout(endSession, Math.max(0, result.expiresAt - Date.now()));
        };
        verifyAuth();
        const refresh = setInterval(verifyAuth, 30000);
        return () => {
            disposed = true;
            clearInterval(refresh);
            clearTimeout(timeout);
        };
    }, [token]);

    if (!token || session?.status === 'invalid') return <Navigate to="/" replace />;

    if (!session || session.status === 'unavailable') {
        return (
            <div className="app-loading">
                <div className="app-loading-spinner" />
                <span>{session ? 'Unable to verify session. Retrying…' : 'Verifying session...'}</span>
            </div>
        );
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        if (role === 'Admin' || role === 'HR') {
            return <Navigate to="/dashboard" replace />;
        }
        if (role === 'Employee') {
            return <Navigate to="/employee-dashboard" replace />;
        }
        return <Navigate to="/" replace />;
    }

    return children;
};

const withLayout = (Component, roles) => (
    <ProtectedRoute allowedRoles={roles}>
        <AppLayout>
            <Component />
        </AppLayout>
    </ProtectedRoute>
);

function App() {
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'token' && !e.newValue) {
                disconnectSocket();
                window.location.href = '/';
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login />} />

                <Route path="/dashboard" element={withLayout(Dashboard, ['Admin', 'HR'])} />
                <Route path="/employee-dashboard" element={withLayout(Dashboard, ['Employee'])} />
                <Route path="/add-employee" element={withLayout(AddEmployee, ['Admin', 'HR'])} />
                <Route path="/edit-employee/:code" element={withLayout(EditEmployee, ['Admin', 'HR'])} />
                <Route path="/reports" element={withLayout(Reports, ['Admin', 'HR'])} />
                <Route path="/email" element={withLayout(EmailTools, ['Admin', 'HR'])} />
                <Route path="/audit-logs" element={withLayout(AuditLogs, ['Admin', 'HR'])} />
                <Route path="/employee-leave" element={withLayout(EmployeeLeave, ['Employee', 'Admin', 'HR'])} />
                <Route path="/attendance" element={withLayout(Attendance, ['Admin', 'HR', 'Employee'])} />
                <Route path="/notifications" element={withLayout(Notifications, ['Admin', 'HR', 'Employee'])} />
                <Route path="/chat" element={withLayout(Chat, ['Admin', 'HR', 'Employee'])} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
