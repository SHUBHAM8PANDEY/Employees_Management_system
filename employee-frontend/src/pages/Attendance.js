import { API_BASE } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './Attendance.module.css';
import AttendanceExport from '../components/AttendanceExport';

const Attendance = () => {
    const navigate = useNavigate();
    const userRole = localStorage.getItem('role') || 'Employee';
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const token = localStorage.getItem('token');

    // ============ EMPLOYEE STATES ============
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [isPunchedIn, setIsPunchedIn] = useState(false);
    const [isPunchedOut, setIsPunchedOut] = useState(false);
    const [shouldAutoPunchOut, setShouldAutoPunchOut] = useState(false);
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
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // ============ HR/ADMIN STATES ============
    const [allAttendance, setAllAttendance] = useState([]);
    const [adminSummary, setAdminSummary] = useState({ total: 0, present: 0, absent: 0, halfDay: 0, shortLeave: 0, onLeave: 0, holiday: 0 });
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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
            if (userRole === 'Admin' || userRole === 'HR') {
                const params = new URLSearchParams({
                    date: selectedDate,
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
                setIsPunchedOut(todayRes.data.isPunchedOut || false);
                setShouldAutoPunchOut(todayRes.data.shouldAutoPunchOut || false);
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
    }, [pagination.page, filterStatus, selectedDate, selectedYear, selectedMonth, selectedDay, startDate, endDate]);

    // ============ PUNCH IN ============
    const handlePunchIn = async () => {
        setProcessing(true);
        try {
            const response = await axios.post(
                `${API_BASE}/api/attendance/punch-in`,
                { punch_in_type: punchInType, location, notes },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (response.data.isLate) {
                alert(`⚠️ ${response.data.message}`);
            } else {
                alert('✅ Punch In successful!');
            }
            
            setTodayAttendance(response.data.attendance);
            setIsPunchedIn(true);
            fetchData();
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to punch in!';
            alert(`❌ ${msg}`);
        }
        setProcessing(false);
    };

    // ============ PUNCH OUT ============
    const handlePunchOut = async () => {
        setProcessing(true);
        try {
            const response = await axios.post(
                `${API_BASE}/api/attendance/punch-out`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const { status, totalHours, reason } = response.data;
            const statusEmoji = {
                'Present': '✅',
                'Short Leave': '⏳',
                'Half Day': '🌓',
                'Absent': '❌'
            };
            
            alert(`✅ Punch Out successful!\nStatus: ${statusEmoji[status] || '📌'} ${status}\nTotal Hours: ${totalHours} hrs\n${reason}`);
            
            setTodayAttendance(response.data.attendance);
            setIsPunchedOut(true);
            fetchData();
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to punch out!';
            alert(`❌ ${msg}`);
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
    if (userRole === 'Admin' || userRole === 'HR') {
        return (
            <div className={styles.attendancePage}>
                <div className={styles.pageActions}>
                    <button className={styles.exportBtn} onClick={() => setShowExportModal(true)}>Export Report</button>
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
                                        <th>Punch In</th>
                                        <th>Punch Out</th>
                                        <th>Type</th>
                                        <th>Hours</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allAttendance.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.employee?.first_name} {item.employee?.last_name}</td>
                                            <td>{formatDateOnly(item.date)}</td>
                                            <td>{item.punch_in ? new Date(item.punch_in).toLocaleTimeString() : '—'}</td>
                                            <td>{item.punch_out ? new Date(item.punch_out).toLocaleTimeString() : '—'}</td>
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
                <button className={styles.exportBtn} onClick={() => setShowExportModal(true)}>Export Report</button>
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
                        {!isPunchedIn ? (
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
                        {todayAttendance.location && <div><strong>Location:</strong> {todayAttendance.location}</div>}
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

                
{shouldAutoPunchOut && !isPunchedOut && (
    <div className={styles.autoPunchoutWarning}>
        ⏰ Auto punch out at 9:30 PM. Please punch out manually if leaving early.
    </div>
)}

                <div className={styles.punchActions}>
                    {!isPunchedIn ? (
                        <div className={styles.punchInForm}>
                            <select value={punchInType} onChange={(e) => setPunchInType(e.target.value)} className={styles.selectInput}>
                                <option value="Office">🏢 Office</option>
                                <option value="Client">🤝 Client</option>
                                <option value="Remote">🏠 Remote</option>
                            </select>
                            <input type="text" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className={styles.textInput} />
                            <input type="text" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={styles.textInput} />
                            <button className={styles.punchInBtn} onClick={handlePunchIn} disabled={processing}>
                                {processing ? '⏳ Processing...' : '✅ Punch In'}
                            </button>
                        </div>
                    ) : !isPunchedOut ? (
                        <button className={styles.punchOutBtn} onClick={handlePunchOut} disabled={processing}>
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
                            {day.punch_in && <div className={styles.dayTime}>IN: {new Date(day.punch_in).toLocaleTimeString()}</div>}
                            {day.punch_out && <div className={styles.dayTime}>OUT: {new Date(day.punch_out).toLocaleTimeString()}</div>}
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
                            <span style={{ color: '#94a3b8' }}>to</span>
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
                                        <tr key={item.id}>
                                            <td>{formatDateOnly(item.date)}</td>
                                            <td>{new Date(item.date).toLocaleDateString('en-IN', { weekday: 'long' })}</td>
                                            <td>{item.punch_in ? new Date(item.punch_in).toLocaleTimeString() : '—'}</td>
                                            <td>{item.punch_out ? new Date(item.punch_out).toLocaleTimeString() : '—'}</td>
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