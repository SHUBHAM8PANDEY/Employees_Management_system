import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import NotificationBell from '../NotificationBell';
import UserMenu from '../UserMenu';
import styles from './AppLayout.module.css';

const NavIcon = ({ children }) => (
    <span className={styles.navIcon}>{children}</span>
);

const AppLayout = ({ children }) => {
    const role = localStorage.getItem('role') || 'Employee';
    const isHr = role === 'Admin' || role === 'HR';
    const location = useLocation();

    const dashboardPath = isHr ? '/dashboard' : '/employee-dashboard';

    const getPageTitle = () => {
        const titles = {
            '/dashboard': 'Dashboard',
            '/employee-dashboard': 'Dashboard',
            '/chat': 'Messages',
            '/attendance': 'Attendance',
            '/notifications': 'Notifications',
            '/audit-logs': 'Audit Logs',
            '/add-employee': 'Add Employee',
            '/employee-leave': 'Leave Management'
        };
        if (location.pathname.startsWith('/edit-employee')) return 'Edit Employee';
        return titles[location.pathname] || 'WorkHub';
    };

    const isChatPage = location.pathname === '/chat';

    return (
        <div className={styles.shell}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <div className={styles.brandMark}>W</div>
                    <div>
                        <strong>WorkHub</strong>
                        <span>Employee Portal</span>
                    </div>
                </div>

                <nav className={styles.nav}>
                    <p className={styles.navLabel}>Main</p>
                    <NavLink to={dashboardPath} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
                        <NavIcon>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                        </NavIcon>
                        <span className={styles.navText}>Dashboard</span>
                    </NavLink>
                    <NavLink to="/chat" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
                        <NavIcon>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </NavIcon>
                        <span className={styles.navText}>Messages</span>
                    </NavLink>
                    <NavLink to="/attendance" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
                        <NavIcon>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </NavIcon>
                        <span className={styles.navText}>Attendance</span>
                    </NavLink>
                    <NavLink to="/notifications" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
                        <NavIcon>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                        </NavIcon>
                        <span className={styles.navText}>Notifications</span>
                    </NavLink>

                    {isHr && (
                        <>
                            <p className={styles.navLabel}>Management</p>
                            <NavLink to="/add-employee" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
                                <NavIcon>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                                </NavIcon>
                                <span className={styles.navText}>Add Employee</span>
                            </NavLink>
                            <NavLink to="/audit-logs" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
                                <NavIcon>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                </NavIcon>
                                <span className={styles.navText}>Audit Logs</span>
                            </NavLink>
                        </>
                    )}

                    {!isHr && (
                        <>
                            <p className={styles.navLabel}>Self Service</p>
                            <NavLink to="/employee-leave" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
                                <NavIcon>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                </NavIcon>
                                <span className={styles.navText}>Apply Leave</span>
                            </NavLink>
                        </>
                    )}
                </nav>
            </aside>

            <div className={styles.main}>
                <header className={styles.topbar}>
                    <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
                    <div className={styles.topbarActions}>
                        <NotificationBell />
                        <UserMenu />
                    </div>
                </header>
                <main className={`${styles.content} ${isChatPage ? styles.contentFlush : ''}`}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
