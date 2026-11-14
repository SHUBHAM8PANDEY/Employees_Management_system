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



const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const response = await axios.get(`${API_BASE}/api/auth/verify-token`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (localStorage.getItem('token') !== token) return false;
        localStorage.setItem('role', response.data.user.role);
        localStorage.setItem('session_expires_at', response.data.expiresAt);
        return response.data.valid;
    } catch (error) {
        return false;
    }
};

const ProtectedRoute = ({ children, allowedRoles }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    useEffect(() => {
        let disposed = false;
        let timeout;
        const endSession = () => {
            if (localStorage.getItem('token') !== token) return;
            disconnectSocket();
            localStorage.clear();
            sessionStorage.clear();
            setIsAuthenticated(false);
        };
        const verifyAuth = async () => {
            const valid = await checkAuth();
            if (disposed) return;
            setIsAuthenticated(valid);
            if (!valid) return endSession();
            clearTimeout(timeout);
            const expiresAt = Number(localStorage.getItem('session_expires_at'));
            timeout = setTimeout(endSession, Math.max(0, expiresAt - Date.now()));
        };
        const interceptor = axios.interceptors.response.use(undefined, error => {
            if (error.response?.status === 401) endSession();
            return Promise.reject(error);
        });
        verifyAuth();
        const refresh = setInterval(verifyAuth, 30000);
        return () => {
            disposed = true;
            clearInterval(refresh);
            clearTimeout(timeout);
            axios.interceptors.response.eject(interceptor);
        };
    }, [token]);

    if (isAuthenticated === null) {
        return (
            <div className="app-loading">
                <div className="app-loading-spinner" />
                <span>Verifying session...</span>
            </div>
        );
    }

    if (!isAuthenticated || !token) {
        localStorage.clear();
        sessionStorage.clear();
        return <Navigate to="/" replace />;
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verify = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                const valid = await checkAuth();
                if (!valid) {
                    localStorage.clear();
                    sessionStorage.clear();
                } else {
                    connectSocket(token);
                    try {
                        const res = await axios.get(`${API_BASE}/api/auth/profile`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (res.data.profile_picture) {
                            localStorage.setItem('profile_picture', res.data.profile_picture);
                        }
                    } catch (e) {
                        /* ignore */
                    }
                }
            }
            setLoading(false);
        };
        verify();

        const handleStorageChange = (e) => {
            if (e.key === 'token' && !e.newValue) {
                disconnectSocket();
                window.location.href = '/';
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    if (loading) {
        return (
            <div className="app-loading">
                <div className="app-loading-spinner" />
                <span>Loading...</span>
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login />} />

                <Route path="/dashboard" element={withLayout(Dashboard, ['Admin', 'HR'])} />
                <Route path="/employee-dashboard" element={withLayout(Dashboard, ['Employee'])} />
                <Route path="/add-employee" element={withLayout(AddEmployee, ['Admin', 'HR'])} />
                <Route path="/edit-employee/:code" element={withLayout(EditEmployee, ['Admin', 'HR'])} />
                <Route path="/audit-logs" element={withLayout(AuditLogs, ['Admin', 'HR'])} />
                <Route path="/employee-leave" element={withLayout(EmployeeLeave, ['Employee'])} />
                <Route path="/attendance" element={withLayout(Attendance, ['Admin', 'HR', 'Employee'])} />
                <Route path="/notifications" element={withLayout(Notifications, ['Admin', 'HR', 'Employee'])} />
                <Route path="/chat" element={withLayout(Chat, ['Admin', 'HR', 'Employee'])} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
