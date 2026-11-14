import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, CalendarCheck, CalendarDays, ChartNoAxesCombined, ChevronDown, LayoutDashboard, Mail, Menu, MessageCircle, Moon, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck, Sun, UserPlus, Users, Bell, X, Settings as SettingsIcon } from 'lucide-react';
import NotificationBell from '../NotificationBell';
import UserMenu from '../UserMenu';
import styles from './AppLayout.module.css';

export default function AppLayout({ children }) {
    const role = localStorage.getItem('role');
    const isHr = ['Admin', 'HR'].includes(role);
    const home = isHr ? '/dashboard' : '/employee-dashboard';
    const location = useLocation();
    const navigate = useNavigate();
    const searchInput = useRef(null);
    const [query, setQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [drawer, setDrawer] = useState(false);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('hrms-sidebar') === 'collapsed');
    const [theme, setTheme] = useState(() => localStorage.getItem('hrms-theme') || 'light');

    const groups = [
        { label: 'Workspace', links: [
            ['Overview', home, LayoutDashboard], ['Attendance', '/attendance', CalendarCheck],
            ['My leave', '/employee-leave', CalendarDays], ['Messages', '/chat', MessageCircle],
            ['Notifications', '/notifications', Bell], ['Settings', '/settings', SettingsIcon]
        ]},
        ...(isHr ? [{ label: 'Management', links: [
            ['Employee directory', '/dashboard?tab=employees', Users], ['Add employee', '/add-employee', UserPlus],
            ['Leave requests', '/dashboard?tab=leaves', CalendarDays], ['Leave history', '/dashboard?tab=history', Activity],
            ['Reports', '/reports', ChartNoAxesCombined], ['Email', '/email', Mail], ['Audit logs', '/audit-logs', ShieldCheck]
        ]}] : [])
    ];
    const currentPath = location.pathname + location.search;
    const links = groups.flatMap(group => group.links);
    const title = links.find(([, path]) => path === currentPath)?.[0] ||
        (location.pathname.startsWith('/edit-employee/') ? 'Employee profile' : 'Workspace');
    const matches = links.filter(([label]) => label.toLowerCase().includes(query.trim().toLowerCase()));
    const go = path => { navigate(path); setQuery(''); setSearchOpen(false); setDrawer(false); };

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme; };
        apply();
        media.addEventListener('change', apply);
        return () => { media.removeEventListener('change', apply); delete document.documentElement.dataset.theme; };
    }, [theme]);

    useEffect(() => {
        const sync = () => setTheme(localStorage.getItem('hrms-theme') || 'light');
        window.addEventListener('hrms-theme-change', sync);
        return () => window.removeEventListener('hrms-theme-change', sync);
    }, []);

    useEffect(() => {
        const keyboard = event => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                searchInput.current?.focus();
            }
            if (event.key === 'Escape') { setDrawer(false); setSearchOpen(false); }
        };
        window.addEventListener('keydown', keyboard);
        return () => window.removeEventListener('keydown', keyboard);
    }, []);

    return (
        <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>
            {drawer && <button className={styles.scrim} aria-label="Close navigation" onClick={() => setDrawer(false)} />}
            <aside id="app-navigation" className={`${styles.sidebar} ${drawer ? styles.sidebarOpen : ''}`}>
                <NavLink to={home} className={styles.brand} onClick={() => setDrawer(false)}>
                    <span className={styles.brandMark}><Activity size={21} /></span>
                    <span className={styles.brandText}>WorkHub<small>People operations</small></span>
                </NavLink>
                <nav className={styles.nav} aria-label="Workspace navigation">
                    {groups.map(({ label, links: groupLinks }) => <div key={label} className={styles.navGroup}>
                        <p>{label}</p>
                        {groupLinks.map(([name, path, Icon]) => <NavLink key={path} to={path}
                            onClick={() => setDrawer(false)} title={name}
                            className={`${styles.navLink} ${currentPath === path ? styles.active : ''}`}>
                            <Icon size={18} aria-hidden="true" /><span>{name}</span>
                        </NavLink>)}
                    </div>)}
                </nav>
                <button type="button" className={styles.collapse} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => {
                    localStorage.setItem('hrms-sidebar', collapsed ? 'expanded' : 'collapsed');
                    setCollapsed(!collapsed);
                }}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    <span>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span></button>
            </aside>
            <div className={styles.main}>
                <header className={styles.topbar}>
                    <div className={styles.context}>
                        <button type="button" className={`${styles.iconButton} ${styles.mobileMenu}`}
                            aria-label={drawer ? 'Close navigation' : 'Open navigation'} aria-expanded={drawer}
                            aria-controls="app-navigation" onClick={() => setDrawer(!drawer)}>{drawer ? <X size={21} /> : <Menu size={21} />}</button>
                        <h1>{title}</h1>
                    </div>
                    <div className={styles.tools}>
                        <div className={styles.search} onBlur={event => {
                            if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);
                        }}>
                            <form role="search" onSubmit={event => {
                                event.preventDefault();
                                if (matches.length) go(matches[0][1]);
                                else if (isHr && query.trim()) go('/dashboard?tab=employees&search=' + encodeURIComponent(query.trim()));
                            }}>
                                <Search size={17} />
                                <input ref={searchInput} aria-label="Search workspace" placeholder="Search workspace…" value={query}
                                    onFocus={() => setSearchOpen(true)} onChange={event => setQuery(event.target.value)} />
                                <kbd>⌘ K</kbd>
                            </form>
                            {searchOpen && <div className={styles.results}>
                                {matches.map(([name, path, Icon]) => <button type="button" key={path} onClick={() => go(path)}>
                                    <Icon size={16} />{name}<ArrowUpRight size={14} /></button>)}
                                {isHr && query.trim() && <button type="button" onClick={() => go('/dashboard?tab=employees&search=' + encodeURIComponent(query.trim()))}>
                                    <Users size={16} />Search employee directory <ChevronDown size={14} /></button>}
                                {!matches.length && !isHr && <p>No matching pages.</p>}
                            </div>}
                        </div>
                        <button type="button" className={styles.iconButton} title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
                            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                            onClick={() => {
                                const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
                                localStorage.setItem('hrms-theme', next);
                                window.dispatchEvent(new Event('hrms-theme-change'));
                            }}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>
                        <NotificationBell /><UserMenu />
                    </div>
                </header>
                <main id="main-content" className={`${styles.content} ${location.pathname === '/chat' ? styles.contentFlush : ''}`}>{children}</main>
            </div>
        </div>
    );
}
