import { Skeleton } from './components/Skeleton';
import { API_BASE } from './config';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useOutletContext } from 'react-router-dom';
import Login from './pages/Login';
import axios from 'axios';
import AppLayout from './components/layout/AppLayout';
import { connectSocket, disconnectSocket } from './utils/socket';



const Reports = lazy(() => import('./components/Reports'));
const EmailTools = lazy(() => import('./pages/EmailTools'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AddEmployee = lazy(() => import('./pages/AddEmployee'));
const EditEmployee = lazy(() => import('./pages/EditEmployee'));
const EmployeeLeave = lazy(() => import('./pages/EmployeeLeave'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Chat = lazy(() => import('./pages/Chat'));


const Settings = lazy(() => import('./pages/Settings'));

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

const ProtectedRoute = () => {
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
            setSession(previous => previous?.role === result.role && previous.expiresAt === result.expiresAt ? previous : result);
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

    return (
        <AppLayout role={role}>
            <Suspense fallback={<Skeleton label="Loading page" />}>
                <Outlet context={role} />
            </Suspense>
        </AppLayout>
    );
};

const RolePage = ({ component: Component, roles }) => {
    const role = useOutletContext();
    if (roles.includes(role)) return <Component />;
    return <Navigate to={['Admin', 'HR'].includes(role) ? '/dashboard' : '/employee-dashboard'} replace />;
};

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

                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<RolePage component={Dashboard} roles={['Admin', 'HR']} />} />
                    <Route path="/employee-dashboard" element={<RolePage component={Dashboard} roles={['Employee']} />} />
                    <Route path="/add-employee" element={<RolePage component={AddEmployee} roles={['Admin', 'HR']} />} />
                    <Route path="/edit-employee/:code" element={<RolePage component={EditEmployee} roles={['Admin', 'HR']} />} />
                    <Route path="/reports" element={<RolePage component={Reports} roles={['Admin', 'HR']} />} />
                    <Route path="/email" element={<RolePage component={EmailTools} roles={['Admin', 'HR']} />} />
                    <Route path="/audit-logs" element={<RolePage component={AuditLogs} roles={['Admin', 'HR']} />} />
                    <Route path="/employee-leave" element={<RolePage component={EmployeeLeave} roles={['Employee', 'Admin', 'HR']} />} />
                    <Route path="/attendance" element={<RolePage component={Attendance} roles={['Admin', 'HR', 'Employee']} />} />
                    <Route path="/notifications" element={<RolePage component={Notifications} roles={['Admin', 'HR', 'Employee']} />} />
                    <Route path="/settings" element={<RolePage component={Settings} roles={['Admin', 'HR', 'Employee']} />} />
                    <Route path="/chat" element={<RolePage component={Chat} roles={['Admin', 'HR', 'Employee']} />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
