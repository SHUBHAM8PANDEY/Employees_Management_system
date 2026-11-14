import { API_BASE } from '../config';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useOutletContext, useNavigate } from 'react-router-dom';
import styles from './Attendance.module.css';
import AttendanceExport from '../components/AttendanceExport';

const indiaDate = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format();
const calendarStatuses = { Present: 'present', Absent: 'absent', 'Half Day': 'halfDay', 'On Leave': 'onLeave', Holiday: 'holiday', 'Short Leave': 'shortLeave' };
const indiaTime = value => value ? new Date(value).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit'
}) : '—';

function PunchLocation({ latitude, longitude, fallback }) {
    if (latitude == null || longitude == null || latitude === '' || longitude === '') return fallback || '—';
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return fallback || '—';
    const coordinates = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const label = fallback && /[\p{L}]/u.test(fallback) ? fallback : 'View location on map';
    return <a className={styles.mapLink} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`}
        target="_blank" rel="noreferrer" aria-label={`Open map at ${coordinates}`}>{label} ↗</a>;
}

const Attendance = () => {
    const navigate = useNavigate();
    const userRole = useOutletContext();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const token = localStorage.getItem('token');

    // ============ EMPLOYEE STATES ============
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [isPunchedIn, setIsPunchedIn] = useState(false);
    const [weeklyOff, setWeeklyOff] = useState(false);
    const [isPunchedOut, setIsPunchedOut] = useState(false);
    const [statusInfo, setStatusInfo] = useState(null);
    const [history, setHistory] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
    const [stats, setStats] = useState({ present: 0, absent: 0, halfDay: 0, shortLeave: 0, onLeave: 0 });
    const [last7Days, setLast7Days] = useState([]);
    const [activeTab, setActiveTab] = useState('today');
    const [filterStatus, setFilterStatus] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedDay, setSelectedDay] = useState('');
    const [yearlyStats, setYearlyStats] = useState([]);
    const [monthlyStats, setMonthlyStats] = useState([]);
    const [summary, setSummary] = useState({ present: 0, absent: 0, halfDay: 0, shortLeave: 0, onLeave: 0, holiday: 0, total: 0 });
    const [punchInType, setPunchInType] = useState('Office');
    const [place, setPlace] = useState('');
    const [photo, setPhoto] = useState('');
    const [captureOpen, setCaptureOpen] = useState(false);
    const [teamPeriod, setTeamPeriod] = useState('day');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [teamView, setTeamView] = useState(['Admin', 'HR'].includes(userRole));
    const [teamSearch, setTeamSearch] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [calendarMonth, setCalendarMonth] = useState(indiaDate().slice(0, 7));
    const [calendarMode, setCalendarMode] = useState('month');
    const [calendar, setCalendar] = useState(null);
    const [calendarError, setCalendarError] = useState('');
    const [notice, setNotice] = useState('');
    const camera = useRef(null);
    const video = useRef(null);
    const cameraRequest = useRef(0);
    const canSeeTeam = ['Admin', 'HR'].includes(userRole);

    useEffect(() => () => {
        cameraRequest.current++;
        camera.current?.getTracks().forEach(track => track.stop());
    }, []);

    useEffect(() => {
        if (cameraOpen && video.current) video.current.srcObject = camera.current;
    }, [cameraOpen]);

    const calendarPeriod = calendarMode === 'year' ? calendarMonth.slice(0, 4) : calendarMonth;
    useEffect(() => {
        if (!selectedEmployee || !calendarPeriod) return;
        const controller = new AbortController();
        setCalendar(null);
        setCalendarError('');
        axios.get(`${API_BASE}/api/attendance/admin/employee/${encodeURIComponent(selectedEmployee.employee_code)}/calendar`, {
            params: { period: calendarPeriod }, headers: { Authorization: `Bearer ${token}` }, signal: controller.signal
        }).then(({ data }) => {
            if (!controller.signal.aborted) setCalendar(data);
        }).catch(error => {
            if (!controller.signal.aborted) setCalendarError(error.response?.data?.error || 'Could not load employee attendance.');
        });
        return () => controller.abort();
    }, [selectedEmployee, calendarPeriod, token]);

    const startCamera = async () => {
        setCaptureOpen(true);
        const request = ++cameraRequest.current;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            if (request !== cameraRequest.current) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            camera.current?.getTracks().forEach(track => track.stop());
            camera.current = stream;
            setCameraOpen(true);
            setError('');
        } catch {
            setError('Camera unavailable. Open the app over HTTPS or localhost and allow camera access.');
        }
    };

    const takePhoto = () => {
        if (!video.current?.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(640, video.current.videoWidth);
        canvas.height = Math.round(video.current.videoHeight * canvas.width / video.current.videoWidth);
        canvas.getContext('2d').drawImage(video.current, 0, 0, canvas.width, canvas.height);
        setPhoto(canvas.toDataURL('image/jpeg', .8));
        camera.current.getTracks().forEach(track => track.stop());
        setCameraOpen(false);
    };

    const getEvidence = async () => {
        if (!place.trim()) throw new Error('Enter your office, client site or locality name.');
        if (!photo) throw new Error('Take a selfie before submitting attendance.');
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('Location is unavailable on this device.'));
            navigator.geolocation.getCurrentPosition(({ coords }) => resolve({
                latitude: coords.latitude, longitude: coords.longitude, photo, place: place.trim()
            }), () => reject(new Error('Allow location access and try again.')),
            { enableHighAccuracy: true, timeout: 15000 });
        });
    };
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // ============ HR/ADMIN STATES ============
    const [allAttendance, setAllAttendance] = useState([]);
    const [adminSummary, setAdminSummary] = useState({ total: 0, present: 0, absent: 0, halfDay: 0, shortLeave: 0, onLeave: 0, holiday: 0 });
    const [selectedDate, setSelectedDate] = useState(indiaDate());
    const [editingAttendance, setEditingAttendance] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        punch_in: '',
        punch_out: '',
        status: 'Present',
        punch_in_type: 'Office',
        notes: ''
    });

    // ============ EXPORT MODAL ============
    const [showExportModal, setShowExportModal] = useState(false);

    // ============ FETCH DATA ============
    const fetchData = async () => {
        if (!token) {
            navigate('/');
            return;
        }

        setLoading(true);
        const headers = { Authorization: `Bearer ${token}` };

        try {
            if (canSeeTeam && teamView) {
                const params = new URLSearchParams({
                    date: selectedDate, period: teamPeriod, search: teamSearch,
                    page: pagination.page || 1,
                    limit: 10
                });
                if (filterStatus) params.append('status', filterStatus);

                const res = await axios.get(`${API_BASE}/api/attendance/admin/all?${params}`, { headers });
                setAllAttendance(res.data.data || []);
                setAdminSummary(res.data.summary || { total: 0, present: 0, absent: 0, halfDay: 0, shortLeave: 0, onLeave: 0, holiday: 0 });
                setPagination(res.data.pagination || { page: 1, total: 0, totalPages: 0 });
            } else {
                let url = `${API_BASE}/api/attendance/history?page=${pagination.page || 1}&limit=10`;
                
                if (startDate && endDate) {
                    url += `&start_date=${startDate}&end_date=${endDate}`;
                } else if (selectedYear) {
                    url += `&year=${selectedYear}`;
                    if (selectedMonth) {
                        url += `&month=${selectedMonth}`;
                        if (selectedDay) {
                            url += `&day=${selectedDay}`;
                        }
                    }
                }
                
                if (filterStatus) url += `&status=${filterStatus}`;

                const [todayRes, statsRes, historyRes] = await Promise.all([
                    axios.get(`${API_BASE}/api/attendance/today`, { headers }),
                    axios.get(`${API_BASE}/api/attendance/stats`, { headers }),
                    axios.get(url, { headers })
                ]);

                setTodayAttendance(todayRes.data.data);
                setIsPunchedIn(todayRes.data.isPunchedIn || false);
                setWeeklyOff(Boolean(todayRes.data.weeklyOff));
                setIsPunchedOut(todayRes.data.isPunchedOut || false);
                setStatusInfo(todayRes.data.statusInfo || null);
                setStats(statsRes.data.monthlyStats || { present: 0, absent: 0, halfDay: 0, shortLeave: 0, onLeave: 0 });
                setLast7Days(statsRes.data.last7Days || []);
                setHistory(historyRes.data.data || []);
                setPagination(historyRes.data.pagination || { page: 1, total: 0, totalPages: 0 });
                setSummary(historyRes.data.summary || { present: 0, absent: 0, halfDay: 0, shortLeave: 0, onLeave: 0, holiday: 0, total: 0 });
                setYearlyStats(historyRes.data.yearlyStats || []);
                setMonthlyStats(historyRes.data.monthlyStats || []);
            }

            setError('');
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to fetch data!';
            setError(msg);
            console.error('Fetch error:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [teamView, teamPeriod, teamSearch, pagination.page, filterStatus, selectedDate, selectedYear, selectedMonth, selectedDay, startDate, endDate]);

    // ============ PUNCH IN ============
    const handlePunchIn = async () => {
        setProcessing(true);
        try {
            const response = await axios.post(
                `${API_BASE}/api/attendance/punch-in`,
                { punch_in_type: punchInType, notes, ...await getEvidence() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            setNotice(response.data.message);
            setPhoto('');
            setPlace('');
            setCaptureOpen(false);
            setTodayAttendance(response.data.attendance);
            setIsPunchedIn(true);
            fetchData();
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to punch in!';
            setError(msg);
        }
        setProcessing(false);
    };

    // ============ PUNCH OUT ============
    const handlePunchOut = async () => {
        setProcessing(true);
        try {
            const response = await axios.post(
                `${API_BASE}/api/attendance/punch-out`,
                await getEvidence(),
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            setNotice(`Punch out recorded · ${response.data.status} · ${response.data.totalHours} hours`);
            setPhoto('');
            setPlace('');
            setCaptureOpen(false);
            setTodayAttendance(response.data.attendance);
            setIsPunchedOut(true);
            fetchData();
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to punch out!';
            setError(msg);
        }
        setProcessing(false);
    };

    // ============ FORMAT HELPERS ============
    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleString('en-IN');
    };

    const formatDateOnly = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-IN');
    };

    const getStatusBadge = (status) => {
        const classes = {
            Present: 'badgePresent',
            Absent: 'badgeAbsent',
            'Half Day': 'badgeHalf',
            'Short Leave': 'badgeShortLeave',
            'On Leave': 'badgeLeave',
            Holiday: 'badgeHoliday'
        };
        return classes[status] || 'badgePresent';
    };

    const getStatusEmoji = (status) => {
        const emojis = {
            'Present': '✅',
            'Absent': '❌',
            'Half Day': '🌓',
            'Short Leave': '⏳',
            'On Leave': '🏖️',
            'Holiday': '🎉'
        };
        return emojis[status] || '📌';
    };

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > pagination.totalPages) return;
        setPagination({ ...pagination, page: newPage });
    };

    const getMonthName = (month) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1] || month;
    };

    // ============================================
    // HR/ADMIN VIEW
    // ============================================
    const downloadTeam = async (format) => {
        try {
            const { data } = await axios.get(`${API_BASE}/api/attendance/admin/export/team`, {
                params: { date: selectedDate, period: teamPeriod, format }, responseType: 'blob',
                headers: { Authorization: `Bearer ${token}` }
            });
            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `team-attendance-${selectedDate}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setError('Could not download team attendance.');
        }
    };

    const switchView = () => {
        camera.current?.getTracks().forEach(track => track.stop());
        cameraRequest.current++;
        setCameraOpen(false);
        setCaptureOpen(false);
        setPhoto('');
        setFilterStatus('');
        setPagination({ page: 1 });
        setTeamView(!teamView);
    };

    if (canSeeTeam && teamView) {
        return (
            <div className={styles.attendancePage}>
                <div className={styles.pageActions}>
                    <button type="button" className={styles.exportBtn} onClick={switchView}>Mark Attendance</button>
                    <button className={styles.exportBtn} onClick={() => downloadTeam('pdf')}>Team PDF</button>
                    <button className={styles.exportBtn} onClick={() => downloadTeam('excel')}>Team Excel</button>
                </div>

                {error && <div className={styles.error}>❌ {error}</div>}

                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statNumber}>{adminSummary.total || 0}</div>
                        <div className={styles.statLabel}>👥 Total</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statNumber}>{adminSummary.present || 0}</div>
                        <div className={styles.statLabel}>✅ Present</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statNumber}>{adminSummary.shortLeave || 0}</div>
                        <div className={styles.statLabel}>⏳ Short Leave</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statNumber}>{adminSummary.halfDay || 0}</div>
                        <div className={styles.statLabel}>🌓 Half Day</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statNumber}>{adminSummary.absent || 0}</div>
                        <div className={styles.statLabel}>❌ Absent</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statNumber}>{adminSummary.onLeave || 0}</div>
                        <div className={styles.statLabel}>🏖️ On Leave</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statNumber}>{adminSummary.holiday || 0}</div>
                        <div className={styles.statLabel}>🎉 Holiday</div>
                    </div>
                </div>

                <div className={styles.filterBar}>
                    <input type="search" aria-label="Search employee name or ID" placeholder="Search name or employee ID"
                        className={styles.textInput} value={teamSearch} onChange={event => {
                            setTeamSearch(event.target.value);
                            setPagination({ page: 1 });
                        }} />
                    <button type="button" className={styles.exportBtn} onClick={() => {
                        setSelectedDate(indiaDate()); setTeamPeriod('day'); setPagination({ page: 1 });
                    }}>Today</button>
                    <select aria-label="Report period" value={teamPeriod} className={styles.selectInput} onChange={event => {
                        setTeamPeriod(event.target.value);
                        setPagination({ page: 1 });
                    }}>
                        <option value="day">Day</option>
                        <option value="month">Month</option>
                        <option value="year">Year</option>
                    </select>
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)} 
                        className={styles.filterDate} 
                    />
                    <select 
                        value={filterStatus} 
                        onChange={(e) => { setFilterStatus(e.target.value); setPagination({ ...pagination, page: 1 }); }} 
                        className={styles.filterSelect}
                    >
                        <option value="">All Status</option>
                        <option value="Present">✅ Present</option>
                        <option value="Short Leave">⏳ Short Leave</option>
                        <option value="Half Day">🌓 Half Day</option>
                        <option value="Absent">❌ Absent</option>
                        <option value="On Leave">🏖️ On Leave</option>
                        <option value="Holiday">🎉 Holiday</option>
                    </select>
                    <button className={styles.filterBtn} onClick={fetchData}>🔍 Filter</button>
                </div>

                <div className={styles.historyCard}>
                    {loading ? (
                        <div className={styles.loading}>⏳ Loading...</div>
                    ) : allAttendance.length === 0 ? (
                        <div className={styles.empty}>No attendance records found</div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.attendanceTable}>
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Date</th>
                                        <th>Punch In · IST</th>
                                        <th>Punch Out · IST</th>
                                        <th>Work mode</th>
                                        <th>Hours</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allAttendance.map((item) => (
                                        <tr key={item.id || `${item.employee_code}-${item.date}`}>
                                            <td><button type="button" className={styles.employeeButton} onClick={() => {
                                                setCalendarMonth(item.date.slice(0, 7));
                                                setCalendarMode('month');
                                                setSelectedEmployee(item.employee);
                                            }}>{item.employee?.first_name} {item.employee?.last_name}
                                                <small>{item.employee_code} · View history</small>
                                            </button></td>
                                            <td>{formatDateOnly(item.date)}</td>
                                            <td><strong>{indiaTime(item.punch_in)}{item.late && ' · Late'}</strong>
                                                {item.punch_in && <small className={styles.punchDetail}><PunchLocation latitude={item.latitude} longitude={item.longitude} fallback={item.location} /></small>}
                                            </td>
                                            <td><strong>{indiaTime(item.punch_out)}</strong>
                                                {item.punch_out && <small className={styles.punchDetail}>{item.punch_out_type === 'Auto' ? 'Auto punch-out' :
                                                    <PunchLocation latitude={item.punch_out_latitude} longitude={item.punch_out_longitude} fallback={item.punch_out_location} />}</small>}
                                            </td>
                                            <td>{item.punch_in ? item.punch_in_type || 'Office' : '—'}</td>
                                            <td>{item.total_hours || 0}</td>
                                            <td><span className={`${styles.badge} ${styles[getStatusBadge(item.status)]}`}>
                                                {getStatusEmoji(item.status)} {item.status === 'Holiday' && new Date(item.date + 'T00:00:00Z').getUTCDay() === 0 ? 'Weekly Off' : item.status}
                                            </span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {pagination.totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>◀</button>
                            <span>Page {pagination.page} of {pagination.totalPages}</span>
                            <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>▶</button>
                        </div>
                    )}
                </div>

                {selectedEmployee && <div className={styles.calendarOverlay} onClick={event => {
                    if (event.target === event.currentTarget) setSelectedEmployee(null);
                }}>
                    <section className={styles.employeeCalendar} role="dialog" aria-modal="true" aria-labelledby="employee-history"
                        onKeyDown={event => { if (event.key === 'Escape') setSelectedEmployee(null); }}>
                        <header className={styles.calendarHeader}>
                            <div><h2 id="employee-history">{selectedEmployee.first_name} {selectedEmployee.last_name}</h2>
                                <p>{selectedEmployee.employee_code} · Attendance history</p></div>
                            <button type="button" autoFocus className={styles.exportBtn} onClick={() => setSelectedEmployee(null)}>Close</button>
                        </header>
                        <div className={styles.filterBar}>
                            <select aria-label="History view" className={styles.selectInput} value={calendarMode} onChange={event => setCalendarMode(event.target.value)}>
                                <option value="month">Monthly</option><option value="year">Yearly</option>
                            </select>
                            <input type="month" aria-label={calendarMode === 'year' ? 'Choose a month in the report year' : 'Report month'}
                                className={styles.dateInput} value={calendarMonth} max={indiaDate().slice(0, 7)}
                                onChange={event => { if (event.target.value) setCalendarMonth(event.target.value); }} />
                        </div>
                        {calendarError ? <p role="alert">{calendarError}</p> : !calendar ? <p role="status">Loading attendance…</p> : <>
                            <div className={styles.calendarSummary}>{Object.entries(calendarStatuses).map(([label, field]) =>
                                <div key={field}><strong>{calendar.summary[field]}</strong><span>{label === 'Holiday' ? 'Off / Holiday' : label}</span></div>
                            )}</div>
                            {calendar.data.length ? <div className={styles.tableWrapper}><table className={styles.attendanceTable}>
                                <thead><tr><th>Date</th><th>Status</th><th>In · IST</th><th>Out · IST</th><th>Hours</th></tr></thead>
                                <tbody>{calendar.data.map(day => <tr key={day.date}>
                                    <td>{formatDateOnly(day.date)}</td>
                                    <td><span className={`${styles.badge} ${styles[getStatusBadge(day.status)]}`}>{day.status}</span></td>
                                    <td>{indiaTime(day.punch_in)}{day.late && ' · Late'}</td><td>{indiaTime(day.punch_out)}</td>
                                    <td>{day.total_hours ?? '—'}</td>
                                </tr>)}</tbody>
                            </table></div> : <p>No attendance days available for this period.</p>}
                        </>}
                    </section>
                </div>}
                {showExportModal && (
                    <AttendanceExport 
                        onClose={() => setShowExportModal(false)} 
                    />
                )}
            </div>
        );
    }

    // ============================================
    // EMPLOYEE VIEW
    // ============================================
    return (
        <div className={styles.attendancePage}>
            <div className={styles.pageActions}>
                {canSeeTeam && <button type="button" className={styles.exportBtn} onClick={switchView}>Team Attendance</button>}
                <button className={styles.exportBtn} onClick={() => setShowExportModal(true)}>Download PDF / Excel</button>
            </div>

            {error && <div className={styles.error}>❌ {error}</div>}

            {/* Today's Attendance */}
            <div className={styles.todayCard}>
                <h2>📋 Today's Attendance</h2>
                <div className={styles.todayInfo}>
                    <div className={styles.dateInfo}>
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div className={styles.statusInfo}>
                        {!isPunchedIn && weeklyOff ? null : !isPunchedIn ? (
                            <span className={styles.statusAbsent}>❌ Not Punched In</span>
                        ) : isPunchedOut ? (
                            <span className={styles.statusPresent}>✅ Punched Out</span>
                        ) : (
                            <span className={styles.statusPunched}>⏳ Punched In</span>
                        )}
                    </div>
                </div>

                {todayAttendance && (
                    <div className={styles.todayDetails}>
                        <div><strong>Punch In:</strong> {formatDate(todayAttendance.punch_in)}</div>
                        <div><strong>Punch In Type:</strong> {todayAttendance.punch_in_type || 'Office'}</div>
                        {todayAttendance.punch_out && (
                            <>
                                <div><strong>Punch Out:</strong> {formatDate(todayAttendance.punch_out)}</div>
                                <div><strong>Total Hours:</strong> {todayAttendance.total_hours || 0} hrs</div>
                            </>
                        )}
                        {todayAttendance.location && <div><strong>Location:</strong> <PunchLocation latitude={todayAttendance.latitude} longitude={todayAttendance.longitude} fallback={todayAttendance.location} /></div>}
                        {todayAttendance.notes && <div><strong>Notes:</strong> {todayAttendance.notes}</div>}
                    </div>
                )}

                {statusInfo && (
                    <div className={styles.statusSummary}>
                        <div className={styles.statusBadgeLarge}>
                            <span className={styles.statusEmoji}>{getStatusEmoji(statusInfo.status)}</span>
                            <span className={styles.statusText}>{statusInfo.status}</span>
                            <span className={styles.statusReason}>{statusInfo.reason}</span>
                        </div>
                    </div>
                )}

                
{(
    <div className={styles.autoPunchoutWarning}>
        Late after 9:30 AM IST · Under 4h 30m: Short Leave · 4h 30m to under 9h: Half Day · 9h or more: Present · Auto punch-out at 9:30 PM IST
    </div>
)}

                {weeklyOff && !isPunchedIn && <p role="status" className={styles.attendanceNotice}>Sunday · Weekly Off</p>}
                {notice && <p role="status" className={styles.attendanceNotice}>{notice}</p>}
                {captureOpen && !isPunchedOut && <div className={styles.evidencePanel}>
                    <strong>Selfie and location</strong>
                    <label className={styles.placeField}>Place name
                        <input className={styles.textInput} placeholder="Office, client site or locality" value={place}
                            maxLength={150} onChange={event => setPlace(event.target.value)} />
                    </label>
                    <p>Take a selfie. Location will be captured when you submit your punch.</p>
                    {cameraOpen && <video ref={video} autoPlay playsInline muted />}
                    {photo && <img src={photo} alt="Attendance selfie preview" />}
                    <button type="button" className={styles.exportBtn} onClick={cameraOpen ? takePhoto : startCamera}>
                        {cameraOpen ? 'Capture selfie' : photo ? 'Retake selfie' : 'Retry camera'}
                    </button>
                    {photo && <button type="button" className={styles.punchInBtn} disabled={processing || cameraOpen || !place.trim()}
                        onClick={isPunchedIn ? handlePunchOut : handlePunchIn}>
                        {processing ? 'Saving…' : isPunchedIn ? 'Confirm punch out' : 'Confirm attendance'}
                    </button>}
                    <button type="button" disabled={processing} onClick={() => {
                        cameraRequest.current++;
                        camera.current?.getTracks().forEach(track => track.stop());
                        setCaptureOpen(false);
                        setCameraOpen(false);
                        setPhoto('');
                    }}>Cancel</button>
                </div>}
                <div className={styles.punchActions}>
                    {!isPunchedIn && weeklyOff ? null : !isPunchedIn ? (
                        <div className={styles.punchInForm}>
                            <select value={punchInType} onChange={(e) => setPunchInType(e.target.value)} className={styles.selectInput}>
                                <option value="Office">🏢 Office</option>
                                <option value="Client">🤝 Client</option>
                                <option value="Remote">🏠 Remote</option>
                            </select>
                            <input type="text" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={styles.textInput} />
                            <button className={styles.punchInBtn} onClick={startCamera} disabled={processing || captureOpen}>
                                {processing ? '⏳ Processing...' : 'Mark Attendance'}
                            </button>
                        </div>
                    ) : !isPunchedOut ? (
                        <button className={styles.punchOutBtn} onClick={startCamera} disabled={processing || captureOpen}>
                            {processing ? '⏳ Processing...' : '❌ Punch Out'}
                        </button>
                    ) : (
                        <div className={styles.completedMsg}>✅ Completed!</div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{stats.present || 0}</div>
                    <div className={styles.statLabel}>✅ Present</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{stats.shortLeave || 0}</div>
                    <div className={styles.statLabel}>⏳ Short Leave</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{stats.halfDay || 0}</div>
                    <div className={styles.statLabel}>🌓 Half Day</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{stats.absent || 0}</div>
                    <div className={styles.statLabel}>❌ Absent</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{stats.onLeave || 0}</div>
                    <div className={styles.statLabel}>🏖️ On Leave</div>
                </div>
            </div>

            {/* Last 7 Days */}
            <div className={styles.last7Days}>
                <h3>📊 Last 7 Days</h3>
                <div className={styles.weekGrid}>
                    {last7Days.map((day, i) => (
                        <div key={i} className={`${styles.dayCard} ${styles[getStatusBadge(day.status)]}`}>
                            <div className={styles.dayDate}>{formatDateOnly(day.date)}</div>
                            <div className={styles.dayStatus}>{getStatusEmoji(day.status)} {day.status}</div>
                            {day.punch_in && <div className={styles.dayTime}>IN: {indiaTime(day.punch_in)}</div>}
                            {day.punch_out && <div className={styles.dayTime}>OUT: {indiaTime(day.punch_out)}</div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button onClick={() => setActiveTab('today')} className={`${styles.tabBtn} ${activeTab === 'today' ? styles.tabBtnActive : ''}`}>
                    📋 Today
                </button>
                <button onClick={() => { setActiveTab('history'); fetchData(); }} className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}>
                    📜 History
                </button>
            </div>

            {/* History */}
            {activeTab === 'history' && (
                <div className={styles.historyCard}>
                    <div className={styles.filterBar}>
                        <select 
                            value={selectedYear} 
                            onChange={(e) => { 
                                setSelectedYear(parseInt(e.target.value)); 
                                setSelectedMonth('');
                                setSelectedDay('');
                                setStartDate('');
                                setEndDate('');
                                setPagination({ ...pagination, page: 1 }); 
                            }} 
                            className={styles.filterSelect}
                        >
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>

                        <select 
                            value={selectedMonth} 
                            onChange={(e) => { 
                                setSelectedMonth(e.target.value); 
                                setSelectedDay('');
                                setStartDate('');
                                setEndDate('');
                                setPagination({ ...pagination, page: 1 }); 
                            }} 
                            className={styles.filterSelect}
                        >
                            <option value="">All Months</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{getMonthName(m)}</option>
                            ))}
                        </select>

                        {selectedMonth && (
                            <select 
                                value={selectedDay} 
                                onChange={(e) => { 
                                    setSelectedDay(e.target.value); 
                                    setStartDate('');
                                    setEndDate('');
                                    setPagination({ ...pagination, page: 1 }); 
                                }} 
                                className={styles.filterSelect}
                            >
                                <option value="">All Days</option>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        )}

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => { 
                                    setStartDate(e.target.value); 
                                    setSelectedYear('');
                                    setSelectedMonth('');
                                    setSelectedDay('');
                                    setPagination({ ...pagination, page: 1 }); 
                                }} 
                                className={styles.filterDate} 
                            />
                            <span style={{ color: 'var(--ui-muted)' }}>to</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => { 
                                    setEndDate(e.target.value); 
                                    setSelectedYear('');
                                    setSelectedMonth('');
                                    setSelectedDay('');
                                    setPagination({ ...pagination, page: 1 }); 
                                }} 
                                className={styles.filterDate} 
                            />
                        </div>

                        <select 
                            value={filterStatus} 
                            onChange={(e) => { 
                                setFilterStatus(e.target.value); 
                                setPagination({ ...pagination, page: 1 }); 
                            }} 
                            className={styles.filterSelect}
                        >
                            <option value="">All Status</option>
                            <option value="Present">✅ Present</option>
                            <option value="Short Leave">⏳ Short Leave</option>
                            <option value="Half Day">🌓 Half Day</option>
                            <option value="Absent">❌ Absent</option>
                            <option value="On Leave">🏖️ On Leave</option>
                            <option value="Holiday">🎉 Holiday</option>
                        </select>

                        <button className={styles.filterBtn} onClick={fetchData}>🔍 Filter</button>
                        <button 
                            className={styles.clearBtn} 
                            onClick={() => {
                                setSelectedYear(new Date().getFullYear());
                                setSelectedMonth('');
                                setSelectedDay('');
                                setStartDate('');
                                setEndDate('');
                                setFilterStatus('');
                                setPagination({ ...pagination, page: 1 });
                                setTimeout(fetchData, 100);
                            }}
                        >
                            Clear
                        </button>
                    </div>

                    {/* Summary */}
                    <div className={styles.yearlySummary}>
                        <h4>📊 Summary</h4>
                        <div className={styles.summaryGrid}>
                            <div className={styles.summaryItem}><span>✅ Present:</span> <b>{summary.present || 0}</b></div>
                            <div className={styles.summaryItem}><span>⏳ Short Leave:</span> <b>{summary.shortLeave || 0}</b></div>
                            <div className={styles.summaryItem}><span>🌓 Half Day:</span> <b>{summary.halfDay || 0}</b></div>
                            <div className={styles.summaryItem}><span>❌ Absent:</span> <b>{summary.absent || 0}</b></div>
                            <div className={styles.summaryItem}><span>🏖️ On Leave:</span> <b>{summary.onLeave || 0}</b></div>
                            <div className={styles.summaryItem}><span>🎉 Holiday:</span> <b>{summary.holiday || 0}</b></div>
                            <div className={styles.summaryItem}><span>📊 Total:</span> <b>{summary.total || 0}</b></div>
                        </div>
                    </div>

                    {/* Yearly Stats */}
                    {yearlyStats.length > 0 && (
                        <div className={styles.yearlyStatsTable}>
                            <h4>📈 Yearly</h4>
                            <table className={styles.attendanceTable}>
                                <thead>
                                    <tr>
                                        <th>Year</th>
                                        <th>✅</th>
                                        <th>⏳</th>
                                        <th>🌓</th>
                                        <th>❌</th>
                                        <th>🏖️</th>
                                        <th>🎉</th>
                                        <th>📊</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {yearlyStats.map((year) => (
                                        <tr key={year.year}>
                                            <td><b>{year.year}</b></td>
                                            <td>{year.Present || 0}</td>
                                            <td>{year['Short Leave'] || 0}</td>
                                            <td>{year['Half Day'] || 0}</td>
                                            <td>{year.Absent || 0}</td>
                                            <td>{year['On Leave'] || 0}</td>
                                            <td>{year.Holiday || 0}</td>
                                            <td>{(year.Present || 0) + (year['Short Leave'] || 0) + (year['Half Day'] || 0) + (year.Absent || 0) + (year['On Leave'] || 0) + (year.Holiday || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* History Table */}
                    {loading ? (
                        <div className={styles.loading}>⏳ Loading...</div>
                    ) : history.length === 0 ? (
                        <div className={styles.empty}>No records</div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.attendanceTable}>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Day</th>
                                        <th>Punch In</th>
                                        <th>Punch Out</th>
                                        <th>Type</th>
                                        <th>Hours</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((item) => (
                                        <tr key={item.id || `${item.employee_code}-${item.date}`}>
                                            <td>{formatDateOnly(item.date)}</td>
                                            <td>{new Date(item.date).toLocaleDateString('en-IN', { weekday: 'long' })}</td>
                                            <td>{indiaTime(item.punch_in)}{item.late && ' · Late'}</td>
                                            <td>{indiaTime(item.punch_out)}</td>
                                            <td>{item.punch_in_type || 'Office'}</td>
                                            <td>{item.total_hours || 0}</td>
                                            <td><span className={`${styles.badge} ${styles[getStatusBadge(item.status)]}`}>
                                                {getStatusEmoji(item.status)} {item.status}
                                            </span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {pagination.totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>◀</button>
                            <span>Page {pagination.page} of {pagination.totalPages}</span>
                            <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>▶</button>
                        </div>
                    )}
                </div>
            )}

            {showExportModal && (
                <AttendanceExport 
                    onClose={() => setShowExportModal(false)} 
                />
            )}
        </div>
    );
};

export default Attendance;