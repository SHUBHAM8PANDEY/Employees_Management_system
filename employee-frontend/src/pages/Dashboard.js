import EmployeeOverview from '../components/EmployeeOverview';
import WorkspaceOverview from '../components/WorkspaceOverview';
import { Skeleton } from '../components/Skeleton';
import { API_BASE } from '../config';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './Dashboard.module.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const userRole = useOutletContext();
    
    // Check if user is logged in - redirect if not
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/', { replace: true });
            return;
        }
    }, [navigate]);

    // Role-based redirect
    useEffect(() => {
        const role = userRole;
        const currentPath = window.location.pathname;
        
        if (role === 'Employee' && currentPath === '/dashboard') {
            navigate('/employee-dashboard', { replace: true });
        } else if ((role === 'Admin' || role === 'HR') && currentPath === '/employee-dashboard') {
            navigate('/dashboard', { replace: true });
        }
    }, [navigate]);

    // ============ ALL STATES ============
    const [employees, setEmployees] = useState([]);
    const [adminLeaveRequests, setAdminLeaveRequests] = useState([]);
    const [myProfile, setMyProfile] = useState(null);
    const [myLeaves, setMyLeaves] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [deliveryNotice, setDeliveryNotice] = useState('');
    const [activeTab, setActiveTab] = useState(userRole === 'Admin' || userRole === 'HR' ? 'employees' : 'my-profile');
    const [searchParams] = useSearchParams();
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (['Admin', 'HR'].includes(userRole)) {
            setActiveTab(['leaves', 'history'].includes(tab) ? tab : 'employees');
        }
    }, [searchParams, userRole]);
    const [selectedViewEmp, setSelectedViewEmp] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editFormData, setEditFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        addresses: [{ address_line: '', city: '' }],
        qualifications: [{ degree: '', institution: '' }],
        skills: [{ skill_name: '' }]
    });
    const [leaveFormData, setLeaveFormData] = useState({
        leave_type: 'Sick Leave',
        start_date: '',
        end_date: '',
        reason: '',
        days: 1
    });

    // Pagination
    const [empPage, setEmpPage] = useState(1);
    const [empLimit, setEmpLimit] = useState(10);
    const [empSearch, setEmpSearch] = useState('');
    const [empSort, setEmpSort] = useState('employee_code:ASC');
    const [directoryView, setDirectoryView] = useState('table');
    useEffect(() => {
        setEmpSearch(searchParams.get('search') || '');
        setEmpPage(1);
    }, [searchParams]);
    const [empTotal, setEmpTotal] = useState(0);
    const [empTotalPages, setEmpTotalPages] = useState(0);

    const [leavePage, setLeavePage] = useState(1);
    const [leaveLimit, setLeaveLimit] = useState(10);
    const [leaveSearch, setLeaveSearch] = useState('');
    const [leaveStatus, setLeaveStatus] = useState('');
    const [leaveTotal, setLeaveTotal] = useState(0);
    const [leaveTotalPages, setLeaveTotalPages] = useState(0);

    const [myLeavePage, setMyLeavePage] = useState(1);
    const [myLeaveLimit, setMyLeaveLimit] = useState(10);
    const [myLeaveStatus, setMyLeaveStatus] = useState('');
    const [myLeaveTotal, setMyLeaveTotal] = useState(0);
    const [myLeaveTotalPages, setMyLeaveTotalPages] = useState(0);

    const [editingLeaveLimits, setEditingLeaveLimits] = useState(null);
    const [leaveLimitForm, setLeaveLimitForm] = useState({
        sick_limit: 12,
        casual_limit: 15,
        paid_limit: 10
    });

    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedLeaveId, setSelectedLeaveId] = useState(null);
    const [selectedAction, setSelectedAction] = useState('');
    const [commentText, setCommentText] = useState('');
    const [processingAction, setProcessingAction] = useState(false);

    const [showEditLeaveModal, setShowEditLeaveModal] = useState(false);
    const [editingLeave, setEditingLeave] = useState(null);
    const [editLeaveData, setEditLeaveData] = useState({
        leave_type: '',
        start_date: '',
        end_date: '',
        days: 1,
        reason: ''
    });

    // ============ FETCH DATA ============
    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }

        setLoading(true);
        const headers = { Authorization: `Bearer ${token}` };

        try {
            if (userRole === 'Admin' || userRole === 'HR') {
                const empParams = new URLSearchParams({
                    page: empPage,
                    limit: empLimit,
                    search: empSearch, sortBy: empSort.split(':')[0], sortOrder: empSort.split(':')[1]
                });
                
                const leaveParams = new URLSearchParams({
                    page: leavePage,
                    limit: leaveLimit,
                    search: leaveSearch,
                    status: leaveStatus
                });

                const [empRes, leaveRes] = await Promise.all([
                    axios.get(`${API_BASE}/api/employee/all?${empParams}`, { headers }),
                    axios.get(`${API_BASE}/api/leaves/admin/all-requests?${leaveParams}`, { headers })
                ]);
                
                setEmployees(empRes.data.data || []);
                setEmpTotal(empRes.data.pagination?.total || 0);
                setEmpTotalPages(empRes.data.pagination?.totalPages || 0);

                setAdminLeaveRequests(leaveRes.data.data || []);
                setLeaveTotal(leaveRes.data.pagination?.total || 0);
                setLeaveTotalPages(leaveRes.data.pagination?.totalPages || 0);
                
            } else {
                const [profileRes, leaveRes] = await Promise.all([
                    axios.get(`${API_BASE}/api/employee/me`, { headers }),
                    axios.get(`${API_BASE}/api/leaves/my-leaves?page=${myLeavePage}&limit=${myLeaveLimit}&status=${myLeaveStatus}`, { headers })
                ]);
                setMyProfile(profileRes.data);
                setMyLeaves(leaveRes.data.data || []);
                setMyLeaveTotal(leaveRes.data.pagination?.total || 0);
                setMyLeaveTotalPages(leaveRes.data.pagination?.totalPages || 0);
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
    }, [empPage, empLimit, empSearch, empSort, leavePage, leaveLimit, leaveSearch, leaveStatus, myLeavePage, myLeaveLimit, myLeaveStatus]);

    // ============ HANDLE LOGOUT ============
    const handleLogout = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                await axios.post(
                    `${API_BASE}/api/auth/logout`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
        // Clear ALL storage
        localStorage.clear();
        sessionStorage.clear();
        navigate('/');
        window.location.reload();
    };

    const handleDeleteEmployee = async (employeeCode, employeeName) => {
        if (!window.confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone!`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(
                `${API_BASE}/api/employee/${employeeCode}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
                alert(`${employeeName} deleted successfully!`);
                fetchData();
            } else {
                alert('Delete failed!');
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Delete failed!';
            alert(`${msg}`);
        }
    };

    const handleLeaveActionWithComment = (leaveId, action) => {
        setSelectedLeaveId(leaveId);
        setSelectedAction(action);
        setCommentText('');
        setShowCommentModal(true);
    };

    const submitLeaveAction = async () => {
        setProcessingAction(true);
        try {
            const token = localStorage.getItem('token');
            const finalComment = commentText.trim() || (selectedAction === 'Approved' 
                ? 'Approved - Enjoy your leave!'
                : 'Rejected - Please contact HR for more details.');
            
            const response = await axios.put(
                `${API_BASE}/api/leaves/admin/status/${selectedLeaveId}`,
                { 
                    status: selectedAction,
                    comments: finalComment
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (response.data && response.data.request) {
                setAdminLeaveRequests(prev => 
                    prev.map(item => 
                        item.id === selectedLeaveId ? response.data.request : item
                    )
                );
            }
            
            const email = { sent: 'Email sent.', failed: 'Email delivery failed.', skipped: 'Email was skipped.' };
            setDeliveryNotice(`Leave ${selectedAction.toLowerCase()}. ${email[response.data.emailStatus] || ''}`);
            setShowCommentModal(false);
            fetchData();
        } catch (err) {
            setDeliveryNotice(err.response?.data?.error || 'Could not update leave.');
        }
        setProcessingAction(false);
    };

    const handleApplyLeave = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE}/api/leaves/apply`, leaveFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Leave applied!');
            setLeaveFormData({ leave_type: 'Sick Leave', start_date: '', end_date: '', reason: '', days: 1 });
            fetchData();
        } catch (err) {
            alert('Failed to apply leave!');
        }
    };

    const openViewEmployee = (emp) => {
        setSelectedViewEmp(emp);
        setEditFormData({
            first_name: emp.first_name || '',
            last_name: emp.last_name || '',
            email: emp.email || '',
            password: '',
            addresses: emp.EmployeeAddresses?.length > 0 ? emp.EmployeeAddresses : [{ address_line: '', city: '' }],
            qualifications: emp.EmployeeQualifications?.length > 0 ? emp.EmployeeQualifications : [{ degree: '', institution: '' }],
            skills: emp.EmployeeSkills?.length > 0 ? emp.EmployeeSkills : [{ skill_name: '' }]
        });
        setIsEditing(false);
    };

    const openLeaveLimitEditor = (emp) => {
        setEditingLeaveLimits(emp.employee_code);
        setLeaveLimitForm({
            sick_limit: emp.leaveBalance?.sick?.total ?? 12,
            casual_limit: emp.leaveBalance?.casual?.total ?? 15,
            paid_limit: emp.leaveBalance?.paid?.total ?? 10
        });
    };

    const handleLeaveLimitSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_BASE}/api/employee/leave-limits/${editingLeaveLimits}`,
                leaveLimitForm,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setEditingLeaveLimits(null);
            fetchData();
            alert('Leave limits updated successfully!');
        } catch (err) {
            alert('Failed to update leave limits!');
        }
    };

    const openEditLeave = (leave) => {
        setEditingLeave(leave);
        setEditLeaveData({
            leave_type: leave.leave_type || '',
            start_date: leave.start_date || '',
            end_date: leave.end_date || '',
            days: leave.days || 1,
            reason: leave.reason || ''
        });
        setShowEditLeaveModal(true);
    };

    const submitEditLeave = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_BASE}/api/leaves/edit/${editingLeave.id}`,
                editLeaveData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Leave updated successfully!');
            setShowEditLeaveModal(false);
            fetchData();
        } catch (err) {
            setDeliveryNotice(err.response?.data?.error || 'Could not update leave.');
        }
    };

    const addAddress = () => {
        setEditFormData({
            ...editFormData,
            addresses: [...editFormData.addresses, { address_line: '', city: '' }]
        });
    };
    const removeAddress = (index) => {
        if (editFormData.addresses.length <= 1) return;
        const newAddresses = editFormData.addresses.filter((_, i) => i !== index);
        setEditFormData({ ...editFormData, addresses: newAddresses });
    };
    const updateAddress = (index, field, value) => {
        const newAddresses = [...editFormData.addresses];
        newAddresses[index][field] = value;
        setEditFormData({ ...editFormData, addresses: newAddresses });
    };

    const addQualification = () => {
        setEditFormData({
            ...editFormData,
            qualifications: [...editFormData.qualifications, { degree: '', institution: '' }]
        });
    };
    const removeQualification = (index) => {
        if (editFormData.qualifications.length <= 1) return;
        const newQualifications = editFormData.qualifications.filter((_, i) => i !== index);
        setEditFormData({ ...editFormData, qualifications: newQualifications });
    };
    const updateQualification = (index, field, value) => {
        const newQualifications = [...editFormData.qualifications];
        newQualifications[index][field] = value;
        setEditFormData({ ...editFormData, qualifications: newQualifications });
    };

    const addSkill = () => {
        setEditFormData({
            ...editFormData,
            skills: [...editFormData.skills, { skill_name: '' }]
        });
    };
    const removeSkill = (index) => {
        if (editFormData.skills.length <= 1) return;
        const newSkills = editFormData.skills.filter((_, i) => i !== index);
        setEditFormData({ ...editFormData, skills: newSkills });
    };
    const updateSkill = (index, value) => {
        const newSkills = [...editFormData.skills];
        newSkills[index].skill_name = value;
        setEditFormData({ ...editFormData, skills: newSkills });
    };

    const saveProfile = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                first_name: editFormData.first_name,
                last_name: editFormData.last_name,
                email: editFormData.email,
                password: editFormData.password || undefined,
                addresses: editFormData.addresses.filter(a => a.address_line || a.city),
                qualifications: editFormData.qualifications.filter(q => q.degree || q.institution),
                skills: editFormData.skills.filter(s => s.skill_name)
            };

            await axios.put(
                `${API_BASE}/api/employee/update/${selectedViewEmp.employee_code}`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert('Employee profile updated successfully!');
            setIsEditing(false);
            fetchData();
        } catch (err) {
            alert('Failed to update profile!');
        }
        setSaving(false);
    };

    // ============ PAGINATION COMPONENT ============
    const Pagination = ({ page, totalPages, setPage, total }) => {
        if (totalPages <= 1) return null;

        const getPageNumbers = () => {
            const pages = [];
            if (totalPages <= 5) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                if (page > 3) pages.push('...');
                for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                    pages.push(i);
                }
                if (page < totalPages - 2) pages.push('...');
                pages.push(totalPages);
            }
            return pages;
        };

        return (
            <div className={styles.paginationWrapper}>
                <div className={styles.paginationInfo}>
                    Showing {((page - 1) * 10) + 1} - {Math.min(page * 10, total)} of {total} records
                </div>
                <div className={styles.pagination}>
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className={styles.pageBtn}
                    >
                        ◀
                    </button>
                    {getPageNumbers().map((p, i) => (
                        <button
                            key={i}
                            onClick={() => typeof p === 'number' && setPage(p)}
                            className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                            disabled={typeof p !== 'number'}
                        >
                            {p}
                        </button>
                    ))}
                    <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className={styles.pageBtn}
                    >
                        ▶
                    </button>
                </div>
            </div>
        );
    };

    // ============================================
    // HR / ADMIN VIEW
    // ============================================
    if (userRole === 'Admin' || userRole === 'HR') {
        const pendingLeaves = (adminLeaveRequests || []).filter(r => r.status === 'Pending');

        return (
            <div className={styles.dashboard}>
                {error && <div className={styles.error}>{error}</div>}

                {!searchParams.get('tab') && <WorkspaceOverview token={localStorage.getItem('token')} />}
                {deliveryNotice && <p role="status">{deliveryNotice}</p>}
                <div className={styles.tabs}>
                    <button onClick={() => setActiveTab('employees')} className={`${styles.tabBtn} ${activeTab === 'employees' ? styles.tabBtnActive : ''}`}>
                        Employees ({empTotal})
                    </button>
                    <button onClick={() => setActiveTab('leaves')} className={`${styles.tabBtn} ${activeTab === 'leaves' ? styles.tabBtnActive : ''}`}>
                        Requests ({pendingLeaves.length})
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}>
                        History ({leaveTotal})
                    </button>
                </div>

                {loading ? (
                    <Skeleton label="Loading dashboard" />
                ) : (
                    <>
                        {/* EMPLOYEES TAB */}
                        {activeTab === 'employees' && (
                            <div>
                                <button className={styles.addBtn} onClick={() => navigate('/add-employee')}>Add Employee</button>
                                
                                <div className={styles.searchWrapper}>
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, code..."
                                        value={empSearch}
                                        onChange={(e) => {
                                            setEmpSearch(e.target.value);
                                            setEmpPage(1);
                                        }}
                                        className={styles.searchInput}
                                    />
                                    <button onClick={() => fetchData()} className={styles.searchBtn}>Search</button>
                                    <select
                                        value={empLimit}
                                        onChange={(e) => {
                                            setEmpLimit(parseInt(e.target.value));
                                            setEmpPage(1);
                                        }}
                                        className={styles.limitSelect}
                                    >
                                        <option value="5">5 per page</option>
                                        <option value="10">10 per page</option>
                                        <option value="20">20 per page</option>
                                        <option value="50">50 per page</option>
                                    </select>
                                </div>

                                <div className={styles.directoryOptions}>
                                    <label>Sort by <select value={empSort} onChange={event => { setEmpSort(event.target.value); setEmpPage(1); }}>
                                        <option value="employee_code:ASC">Employee ID</option>
                                        <option value="first_name:ASC">Name A–Z</option>
                                        <option value="first_name:DESC">Name Z–A</option>
                                        <option value="email:ASC">Email</option>
                                    </select></label>
                                    <button className="ui-button" onClick={() => setDirectoryView(directoryView === 'table' ? 'cards' : 'table')}>
                                        {directoryView === 'table' ? 'Card view' : 'Table view'}
                                    </button>
                                </div>
                                {directoryView === 'table' ? <div className={styles.tableWrapper}>
                                    <table className={styles.historyTable}>
                                        <thead><tr><th>Employee</th><th>ID</th><th>Email</th><th>Actions</th></tr></thead>
                                        <tbody>{employees.map(emp => <tr key={emp.employee_code}>
                                            <td><button className="ui-button" onClick={() => openViewEmployee(emp)}>{emp.first_name} {emp.last_name}</button></td>
                                            <td>{emp.employee_code}</td><td>{emp.email}</td>
                                            <td><div className={styles.directoryOptions}>
                                                <button className="ui-button" onClick={() => navigate(`/edit-employee/${emp.employee_code}`)}>Edit</button>
                                                <button className="ui-button" onClick={() => handleDeleteEmployee(emp.employee_code, `${emp.first_name} ${emp.last_name}`)}>Delete</button>
                                            </div></td>
                                        </tr>)}</tbody>
                                    </table>
                                    {!employees.length && <p className="ui-muted">No employees match your search.</p>}
                                </div> :
                                <div className={styles.employeeGrid}>
                                    {(employees || []).map((emp) => (
                                        <div key={emp.employee_code} className={styles.employeeCard}>
                                            <div className={styles.cardHeader}>
                                                <span className={styles.empCode}>{emp.employee_code}</span>
                                                <div className={styles.cardActions}>
                                                    <button className={styles.viewBtn} onClick={() => openViewEmployee(emp)}>View</button>
                                                    <button className={styles.editBtn} onClick={() => navigate(`/edit-employee/${emp.employee_code}`)}>Edit</button>
                                                    <button className={styles.deleteBtn} onClick={() => handleDeleteEmployee(emp.employee_code, `${emp.first_name} ${emp.last_name}`)}>Delete</button>
                                                </div>
                                            </div>
                                            <h3 className={styles.empName}>{emp.first_name} {emp.last_name}</h3>
                                            <p className={styles.empEmail}>{emp.email}</p>
                                            <div className={styles.leaveBadges}>
                                                <span className={styles.badgeSick}>Sick {emp.leaveBalance?.sick?.taken || 0}/{emp.leaveBalance?.sick?.total || 12}</span>
                                                <span className={styles.badgeCasual}>Casual {emp.leaveBalance?.casual?.taken || 0}/{emp.leaveBalance?.casual?.total || 15}</span>
                                                <span className={styles.badgePaid}>Paid {emp.leaveBalance?.paid?.taken || 0}/{emp.leaveBalance?.paid?.total || 10}</span>
                                            </div>

                                            <div className={styles.empDetails}>
                                                <div><strong>Address:</strong>
                                                    {emp.EmployeeAddresses && emp.EmployeeAddresses.length > 0 ? (
                                                        emp.EmployeeAddresses.map((addr, i) => (
                                                            <span key={i}> {addr.address_line}, {addr.city}</span>
                                                        ))
                                                    ) : (
                                                        <span className={styles.empty}> No address</span>
                                                    )}
                                                </div>
                                                <div><strong>Education:</strong>
                                                    {emp.EmployeeQualifications && emp.EmployeeQualifications.length > 0 ? (
                                                        emp.EmployeeQualifications.map((qual, i) => (
                                                            <span key={i}> {qual.degree} - {qual.institution}</span>
                                                        ))
                                                    ) : (
                                                        <span className={styles.empty}> No education</span>
                                                    )}
                                                </div>
                                                <div><strong>Skills:</strong>
                                                    {emp.EmployeeSkills && emp.EmployeeSkills.length > 0 ? (
                                                        emp.EmployeeSkills.map((skill, i) => (
                                                            <span key={i} className={styles.skillTag}>{skill.skill_name}</span>
                                                        ))
                                                    ) : (
                                                        <span className={styles.empty}> No skills</span>
                                                    )}
                                                </div>
                                            </div>

                                            <button className={styles.setLimitBtn} onClick={() => openLeaveLimitEditor(emp)}>Set Leave Limits</button>
                                        </div>
                                    ))}
                                </div>}

                                <Pagination 
                                    page={empPage}
                                    totalPages={empTotalPages}
                                    setPage={setEmpPage}
                                    total={empTotal}
                                />
                            </div>
                        )}

                        {/* LEAVES TAB */}
                        {activeTab === 'leaves' && (
                            <div className={styles.profileCard}>
                                <h3 className={styles.profileSectionTitle}>Pending Requests</h3>
                                
                                <div className={styles.searchWrapper}>
                                    <input
                                        type="text"
                                        placeholder="Search by employee, type, reason..."
                                        value={leaveSearch}
                                        onChange={(e) => {
                                            setLeaveSearch(e.target.value);
                                            setLeavePage(1);
                                        }}
                                        className={styles.searchInput}
                                    />
                                    <button onClick={() => fetchData()} className={styles.searchBtn}>Search</button>
                                    <select
                                        value={leaveStatus}
                                        onChange={(e) => {
                                            setLeaveStatus(e.target.value);
                                            setLeavePage(1);
                                        }}
                                        className={styles.limitSelect}
                                    >
                                        <option value="">All Status</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                    <select
                                        value={leaveLimit}
                                        onChange={(e) => {
                                            setLeaveLimit(parseInt(e.target.value));
                                            setLeavePage(1);
                                        }}
                                        className={styles.limitSelect}
                                    >
                                        <option value="5">5 per page</option>
                                        <option value="10">10 per page</option>
                                        <option value="20">20 per page</option>
                                        <option value="50">50 per page</option>
                                    </select>
                                </div>

                                {pendingLeaves.length === 0 ? (
                                    <p className={styles.profileSectionEmpty}>No pending requests!</p>
                                ) : (
                                    <div className={styles.tableWrapper}>
                                        <table className={styles.historyTable}>
                                            <thead><tr>
                                                <th>Employee</th><th>Type</th><th>Days</th>
                                                <th>Reason</th>
                                                <th>Action</th>
                                            </tr></thead>
                                            <tbody>
                                                {pendingLeaves.map((req) => {
                                                    const emp = (employees || []).find(e => e.employee_code === req.employee_code);
                                                    return (
                                                        <tr key={req.id}>
                                                            <td>{emp ? emp.first_name : req.employee_code}</td>
                                                            <td>{req.leave_type}</td>
                                                            <td><b>{req.days || 1}</b></td>
                                                            <td style={{ maxWidth: '200px', fontSize: '13px', wordWrap: 'break-word', color: 'var(--ui-text)', fontWeight: '500' }}>
                                                                {req.reason || '—'}
                                                            </td>
                                                            <td>
                                                                <button className={styles.approveBtn} onClick={() => handleLeaveActionWithComment(req.id, 'Approved')}>Approve</button>
                                                                <button className={styles.rejectBtn} onClick={() => handleLeaveActionWithComment(req.id, 'Rejected')}>Reject</button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <Pagination 
                                    page={leavePage}
                                    totalPages={leaveTotalPages}
                                    setPage={setLeavePage}
                                    total={leaveTotal}
                                />
                            </div>
                        )}

                        {/* HISTORY TAB */}
                        {activeTab === 'history' && (
                            <div className={styles.profileCard}>
                                <h3 className={styles.profileSectionTitle}>Leave History</h3>
                                
                                <div className={styles.searchWrapper}>
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={leaveSearch}
                                        onChange={(e) => {
                                            setLeaveSearch(e.target.value);
                                            setLeavePage(1);
                                        }}
                                        className={styles.searchInput}
                                    />
                                    <button onClick={() => fetchData()} className={styles.searchBtn}>Search</button>
                                    <select
                                        value={leaveStatus}
                                        onChange={(e) => {
                                            setLeaveStatus(e.target.value);
                                            setLeavePage(1);
                                        }}
                                        className={styles.limitSelect}
                                    >
                                        <option value="">All Status</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                    <select
                                        value={leaveLimit}
                                        onChange={(e) => {
                                            setLeaveLimit(parseInt(e.target.value));
                                            setLeavePage(1);
                                        }}
                                        className={styles.limitSelect}
                                    >
                                        <option value="5">5 per page</option>
                                        <option value="10">10 per page</option>
                                        <option value="20">20 per page</option>
                                        <option value="50">50 per page</option>
                                    </select>
                                </div>

                                {(adminLeaveRequests || []).length === 0 ? (
                                    <p className={styles.profileSectionEmpty}>No records</p>
                                ) : (
                                    <div className={styles.tableWrapper}>
                                        <table className={styles.historyTable}>
                                            <thead><tr>
                                                <th>Employee</th><th>Type</th><th>Days</th>
                                                <th>Reason</th>
                                                <th>Status</th>
                                                <th>Comments</th>
                                                <th>Action</th>
                                            </tr></thead>
                                            <tbody>
                                                {(adminLeaveRequests || []).map((req) => {
                                                    const emp = (employees || []).find(e => e.employee_code === req.employee_code);
                                                    return (
                                                        <tr key={req.id}>
                                                            <td>{emp ? emp.first_name : req.employee_code}</td>
                                                            <td>{req.leave_type}</td>
                                                            <td><b>{req.days || 1}</b></td>
                                                            <td style={{ maxWidth: '150px', fontSize: '12px', wordWrap: 'break-word', color: 'var(--ui-muted)' }}>
                                                                {req.reason || '—'}
                                                            </td>
                                                            <td>
                                                                <span className={`${styles.statusBadge} ${req.status === 'Approved' ? styles.statusApproved : req.status === 'Rejected' ? styles.statusRejected : styles.statusPending}`}>
                                                                    {req.status}
                                                                </span>
                                                            </td>
                                                            <td style={{ fontSize: '12px', maxWidth: '120px', wordWrap: 'break-word' }}>
                                                                {req.comments || '—'}
                                                            </td>
                                                            <td>
                                                                <button className={styles.editLeaveBtn} onClick={() => openEditLeave(req)}>Edit</button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <Pagination 
                                    page={leavePage}
                                    totalPages={leaveTotalPages}
                                    setPage={setLeavePage}
                                    total={leaveTotal}
                                />
                            </div>
                        )}
                    </>
                )}

                {/* ========== VIEW MODAL ========== */}
                {selectedViewEmp && (
                    <div className={styles.modalOverlay} onClick={() => { setSelectedViewEmp(null); setIsEditing(false); }}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h2 className={styles.modalTitle}>{isEditing ? 'Edit Employee (Full Profile)' : 'Employee Profile'}</h2>
                                <button className={styles.modalClose} onClick={() => { setSelectedViewEmp(null); setIsEditing(false); }}>×</button>
                            </div>

                            <div className={styles.modalCode}>{selectedViewEmp.employee_code}</div>

                            <div className={styles.modalField} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                                <div className={styles.modalField}>
                                    <label>First Name *</label>
                                    <input type="text" value={editFormData.first_name} onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })} disabled={!isEditing} className={isEditing ? styles.editMode : ''} />
                                </div>
                                <div className={styles.modalField}>
                                    <label>Last Name *</label>
                                    <input type="text" value={editFormData.last_name} onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })} disabled={!isEditing} className={isEditing ? styles.editMode : ''} />
                                </div>
                                <div className={styles.modalField} style={{ gridColumn: '1 / -1' }}>
                                    <label>Email *</label>
                                    <input type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} disabled={!isEditing} className={isEditing ? styles.editMode : ''} />
                                </div>
                                <div className={styles.modalField} style={{ gridColumn: '1 / -1' }}>
                                    <label>Password (Leave empty to keep current)</label>
                                    <input type="password" value={editFormData.password} onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })} disabled={!isEditing} placeholder="Enter new password or leave empty" className={isEditing ? styles.editMode : ''} />
                                    {isEditing && <small>Only fill if you want to change password</small>}
                                </div>
                            </div>

                            <hr className={styles.modalDivider} />

                            <div className={styles.sectionEdit}>
                                <h4>Addresses</h4>
                                {isEditing && <button className={styles.addBtnSmall} onClick={addAddress}>+ Add</button>}
                            </div>
                            {editFormData.addresses.map((addr, index) => (
                                <div key={index} className={styles.modalAddressItem}>
                                    {isEditing ? (
                                        <>
                                            <input type="text" value={addr.address_line} placeholder="Address Line" onChange={(e) => updateAddress(index, 'address_line', e.target.value)} />
                                            <input type="text" value={addr.city} placeholder="City" onChange={(e) => updateAddress(index, 'city', e.target.value)} style={{ marginTop: '4px' }} />
                                            {editFormData.addresses.length > 1 && <button className={styles.removeBtnSmall} onClick={() => removeAddress(index)}>Remove</button>}
                                        </>
                                    ) : <span>{addr.address_line}, {addr.city}</span>}
                                </div>
                            ))}
                            {!isEditing && editFormData.addresses.length === 0 && <p className={styles.profileSectionEmpty}>No address added</p>}

                            <div className={styles.sectionEdit} style={{ marginTop: '16px' }}>
                                <h4>Education</h4>
                                {isEditing && <button className={styles.addBtnSmall} onClick={addQualification}>+ Add</button>}
                            </div>
                            {editFormData.qualifications.map((qual, index) => (
                                <div key={index} className={styles.modalQualItem}>
                                    {isEditing ? (
                                        <>
                                            <input type="text" value={qual.degree} placeholder="Degree (e.g. B.Tech)" onChange={(e) => updateQualification(index, 'degree', e.target.value)} />
                                            <input type="text" value={qual.institution} placeholder="Institution" onChange={(e) => updateQualification(index, 'institution', e.target.value)} style={{ marginTop: '4px' }} />
                                            {editFormData.qualifications.length > 1 && <button className={styles.removeBtnSmall} onClick={() => removeQualification(index)}>Remove</button>}
                                        </>
                                    ) : <span><b>{qual.degree}</b> - {qual.institution}</span>}
                                </div>
                            ))}
                            {!isEditing && editFormData.qualifications.length === 0 && <p className={styles.profileSectionEmpty}>No education details</p>}

                            <div className={styles.sectionEdit} style={{ marginTop: '16px' }}>
                                <h4>Skills</h4>
                                {isEditing && <button className={styles.addBtnSmall} onClick={addSkill}>+ Add</button>}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                {editFormData.skills.map((skill, index) => (
                                    <div key={index} className={styles.modalSkillItem}>
                                        {isEditing ? (
                                            <>
                                                <input type="text" value={skill.skill_name} placeholder="Skill" onChange={(e) => updateSkill(index, e.target.value)} />
                                                {editFormData.skills.length > 1 && <button className={styles.removeBtnSmall} onClick={() => removeSkill(index)}>×</button>}
                                            </>
                                        ) : <span>{skill.skill_name}</span>}
                                    </div>
                                ))}
                            </div>
                            {!isEditing && editFormData.skills.length === 0 && <p className={styles.profileSectionEmpty}>No skills added</p>}

                            <hr className={styles.modalDivider} />

                            <h4 className={styles.profileSectionTitle}>Leave Balance</h4>
                            <div className={styles.modalBalanceGrid}>
                                <div className={`${styles.modalBalanceCard} ${styles.blue}`}>
                                    <div className={styles.modalBalanceLabel}>Sick</div>
                                    <div className={`${styles.modalBalanceNum} ${styles.blue}`}>{selectedViewEmp.leaveBalance?.sick?.left || 0}</div>
                                    <div className={styles.modalBalanceUsed}>Used: {selectedViewEmp.leaveBalance?.sick?.taken || 0}</div>
                                </div>
                                <div className={`${styles.modalBalanceCard} ${styles.yellow}`}>
                                    <div className={styles.modalBalanceLabel}>Casual</div>
                                    <div className={`${styles.modalBalanceNum} ${styles.yellow}`}>{selectedViewEmp.leaveBalance?.casual?.left || 0}</div>
                                    <div className={styles.modalBalanceUsed}>Used: {selectedViewEmp.leaveBalance?.casual?.taken || 0}</div>
                                </div>
                                <div className={`${styles.modalBalanceCard} ${styles.green}`}>
                                    <div className={styles.modalBalanceLabel}>Paid</div>
                                    <div className={`${styles.modalBalanceNum} ${styles.green}`}>{selectedViewEmp.leaveBalance?.paid?.left || 0}</div>
                                    <div className={styles.modalBalanceUsed}>Used: {selectedViewEmp.leaveBalance?.paid?.taken || 0}</div>
                                </div>
                            </div>

                            <div className={styles.modalActions}>
                                {!isEditing ? (
                                    <button className={styles.modalEditBtn} onClick={() => setIsEditing(true)}>Edit Full Profile</button>
                                ) : (
                                    <>
                                        <button className={styles.modalSaveBtn} onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save All Changes'}</button>
                                        <button className={styles.modalCancelBtn} onClick={() => setIsEditing(false)}>Cancel</button>
                                    </>
                                )}
                            </div>
                            {isEditing && <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--ui-muted)', textAlign: 'center' }}>You can edit: Name, Email, Password, Address, Education, Skills</div>}
                        </div>
                    </div>
                )}

                {/* ========== LEAVE LIMITS MODAL ========== */}
                {editingLeaveLimits && (
                    <div className={styles.modalOverlay} onClick={() => setEditingLeaveLimits(null)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                            <div className={styles.modalHeader}>
                                <h2 className={styles.modalTitle}>Set Leave Limits</h2>
                                <button className={styles.modalClose} onClick={() => setEditingLeaveLimits(null)}>×</button>
                            </div>
                            <form onSubmit={handleLeaveLimitSubmit}>
                                <div className={styles.modalField}>
                                    <label>Sick Leave Limit</label>
                                    <input type="number" min="0" value={leaveLimitForm.sick_limit} onChange={(e) => setLeaveLimitForm({...leaveLimitForm, sick_limit: parseInt(e.target.value)})} required />
                                </div>
                                <div className={styles.modalField}>
                                    <label>Casual Leave Limit</label>
                                    <input type="number" min="0" value={leaveLimitForm.casual_limit} onChange={(e) => setLeaveLimitForm({...leaveLimitForm, casual_limit: parseInt(e.target.value)})} required />
                                </div>
                                <div className={styles.modalField}>
                                    <label>Paid Leave Limit</label>
                                    <input type="number" min="0" value={leaveLimitForm.paid_limit} onChange={(e) => setLeaveLimitForm({...leaveLimitForm, paid_limit: parseInt(e.target.value)})} required />
                                </div>
                                <div className={styles.modalActions}>
                                    <button type="submit" className={styles.modalSaveBtn}>Save Limits</button>
                                    <button type="button" className={styles.modalCancelBtn} onClick={() => setEditingLeaveLimits(null)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ========== COMMENT MODAL ========== */}
                {showCommentModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowCommentModal(false)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                            <div className={styles.modalHeader}>
                                <h2 className={styles.modalTitle}>{selectedAction === 'Approved' ? 'Approve Leave' : 'Reject Leave'}</h2>
                                <button className={styles.modalClose} onClick={() => setShowCommentModal(false)}>×</button>
                            </div>
                            
                            <div className={styles.modalField}>
                                <label>Comments {selectedAction === 'Rejected' ? '(Recommended)' : '(Optional)'}</label>
                                <textarea
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder={selectedAction === 'Approved' 
                                        ? 'Add approval comments or leave empty...' 
                                        : 'Why are you rejecting? (Recommended for employee clarity)'}
                                    rows="4"
                                />
                                <small>{selectedAction === 'Approved' 
                                    ? 'Leave empty for default: "Approved - Enjoy your leave!"'
                                    : 'Leave empty for default: "Rejected - Please contact HR for more details."'}</small>
                            </div>

                            <div className={styles.modalActions}>
                                <button className={styles.modalSaveBtn} onClick={submitLeaveAction} disabled={processingAction}>
                                    {processingAction ? 'Processing...' : (selectedAction === 'Approved' ? 'Approve' : 'Reject')}
                                </button>
                                <button className={styles.modalCancelBtn} onClick={() => setShowCommentModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========== EDIT LEAVE MODAL ========== */}
                {showEditLeaveModal && editingLeave && (
                    <div className={styles.modalOverlay} onClick={() => setShowEditLeaveModal(false)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                            <div className={styles.modalHeader}>
                                <h2 className={styles.modalTitle}>Edit Leave Request</h2>
                                <button className={styles.modalClose} onClick={() => setShowEditLeaveModal(false)}>×</button>
                            </div>
                            
                            <div className={styles.modalField}>
                                <label>Leave Type</label>
                                <select value={editLeaveData.leave_type} onChange={(e) => setEditLeaveData({...editLeaveData, leave_type: e.target.value})}>
                                    <option value="Sick Leave">Sick Leave</option>
                                    <option value="Casual Leave">Casual Leave</option>
                                    <option value="Paid Leave">Paid Leave</option>
                                </select>
                            </div>

                            <div className={styles.modalField}>
                                <label>Start Date</label>
                                <input type="date" value={editLeaveData.start_date} onChange={(e) => setEditLeaveData({...editLeaveData, start_date: e.target.value})} />
                            </div>

                            <div className={styles.modalField}>
                                <label>End Date</label>
                                <input type="date" value={editLeaveData.end_date} onChange={(e) => setEditLeaveData({...editLeaveData, end_date: e.target.value})} />
                            </div>

                            <div className={styles.modalField}>
                                <label>Total Days</label>
                                <input type="number" min="1" value={editLeaveData.days} onChange={(e) => setEditLeaveData({...editLeaveData, days: parseInt(e.target.value)})} />
                            </div>

                            <div className={styles.modalField}>
                                <label>Reason</label>
                                <textarea rows="3" value={editLeaveData.reason} onChange={(e) => setEditLeaveData({...editLeaveData, reason: e.target.value})} />
                            </div>

                            <div className={styles.modalActions}>
                                <button className={styles.modalSaveBtn} onClick={submitEditLeave}>Save Changes</button>
                                <button className={styles.modalCancelBtn} onClick={() => setShowEditLeaveModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // EMPLOYEE VIEW
    // ============================================
    return (
        <div className={styles.dashboard}>
                <EmployeeOverview profile={myProfile} />
            {error && <div className={styles.error}>{error}</div>}

            {loading ? (
                <Skeleton label="Loading dashboard" />
            ) : myProfile ? (
                <>
                    <div className={styles.tabs}>
                        <button onClick={() => setActiveTab('my-profile')} className={`${styles.tabBtn} ${activeTab === 'my-profile' ? styles.tabBtnActive : ''}`}>My Profile</button>
                        <button onClick={() => setActiveTab('my-leaves')} className={`${styles.tabBtn} ${activeTab === 'my-leaves' ? styles.tabBtnActive : ''}`}>Apply Leave</button>
                        <button onClick={() => setActiveTab('my-history')} className={`${styles.tabBtn} ${activeTab === 'my-history' ? styles.tabBtnActive : ''}`}>History ({myLeaveTotal})</button>
                    </div>

                    {activeTab === 'my-profile' && (
                        <div className={styles.profileGrid}>
                            <div className={styles.profileCard}>
                                <div className={styles.profileHeader}>
                                    <div className={styles.profileAvatar}>{myProfile.first_name?.charAt(0) || 'U'}</div>
                                    <div>
                                        <h2 className={styles.profileName}>{myProfile.first_name} {myProfile.last_name}</h2>
                                        <p className={styles.profileEmail}>{myProfile.email}</p>
                                        <span className={styles.profileRole}>{myProfile.role || 'Employee'}</span>
                                    </div>
                                </div>

                                <div className={styles.profileSection}>
                                    <p className={styles.profileSectionText}>{myProfile.email}</p>
                                    <p className={styles.profileSectionText}>🆔 {myProfile.employee_code}</p>
                                </div>

                                <div className={styles.profileSection}>
                                    <h4 className={styles.profileSectionTitle}>Address</h4>
                                    {myProfile.EmployeeAddresses && myProfile.EmployeeAddresses.length > 0 ? (
                                        myProfile.EmployeeAddresses.map((addr, i) => <p key={i} className={styles.profileSectionText}>{addr.address_line}, {addr.city}</p>)
                                    ) : <p className={styles.profileSectionEmpty}>No address added</p>}
                                </div>

                                <div className={styles.profileSection}>
                                    <h4 className={styles.profileSectionTitle}>Education</h4>
                                    {myProfile.EmployeeQualifications && myProfile.EmployeeQualifications.length > 0 ? (
                                        myProfile.EmployeeQualifications.map((qual, i) => <p key={i} className={styles.profileSectionText}><b>{qual.degree}</b> - {qual.institution}</p>)
                                    ) : <p className={styles.profileSectionEmpty}>No education details</p>}
                                </div>

                                <div className={styles.profileSection}>
                                    <h4 className={styles.profileSectionTitle}>Skills</h4>
                                    {myProfile.EmployeeSkills && myProfile.EmployeeSkills.length > 0 ? (
                                        <div className={styles.skillTags}>
                                            {myProfile.EmployeeSkills.map((skill, i) => <span key={i} className={styles.skillTag}>{skill.skill_name}</span>)}
                                        </div>
                                    ) : <p className={styles.profileSectionEmpty}>No skills added</p>}
                                </div>
                            </div>

                            <div>
                                <div className={styles.balanceCard}>
                                    <h3 className={styles.balanceTitle}>Leave Balance</h3>

                                    <div className={styles.balanceItem}>
                                        <div className={styles.balanceRow}><span>Sick Leave</span><span><b>{myProfile.leaveBalance?.sick?.left || 0}</b> days left</span></div>
                                        <div className={styles.balanceBar}><div className={`${styles.balanceBarFill} ${styles.blue}`} style={{ width: `${((myProfile.leaveBalance?.sick?.taken || 0) / (myProfile.leaveBalance?.sick?.total || 12)) * 100}%` }}></div></div>
                                        <div className={styles.balanceStats}><span>Used: {myProfile.leaveBalance?.sick?.taken || 0}</span><span>Total: {myProfile.leaveBalance?.sick?.total || 12}</span></div>
                                    </div>

                                    <div className={styles.balanceItem}>
                                        <div className={styles.balanceRow}><span>Casual Leave</span><span><b>{myProfile.leaveBalance?.casual?.left || 0}</b> days left</span></div>
                                        <div className={styles.balanceBar}><div className={`${styles.balanceBarFill} ${styles.yellow}`} style={{ width: `${((myProfile.leaveBalance?.casual?.taken || 0) / (myProfile.leaveBalance?.casual?.total || 15)) * 100}%` }}></div></div>
                                        <div className={styles.balanceStats}><span>Used: {myProfile.leaveBalance?.casual?.taken || 0}</span><span>Total: {myProfile.leaveBalance?.casual?.total || 15}</span></div>
                                    </div>

                                    <div className={styles.balanceItem}>
                                        <div className={styles.balanceRow}><span>Paid Leave</span><span><b>{myProfile.leaveBalance?.paid?.left || 0}</b> days left</span></div>
                                        <div className={styles.balanceBar}><div className={`${styles.balanceBarFill} ${styles.green}`} style={{ width: `${((myProfile.leaveBalance?.paid?.taken || 0) / (myProfile.leaveBalance?.paid?.total || 10)) * 100}%` }}></div></div>
                                        <div className={styles.balanceStats}><span>Used: {myProfile.leaveBalance?.paid?.taken || 0}</span><span>Total: {myProfile.leaveBalance?.paid?.total || 10}</span></div>
                                    </div>

                                    <div className={styles.balanceTotal}><span>Total</span><span>{(myProfile.leaveBalance?.sick?.left || 0) + (myProfile.leaveBalance?.casual?.left || 0) + (myProfile.leaveBalance?.paid?.left || 0)} days left</span></div>
                                </div>

                                <div className={styles.quickActions}>
                                    <h4>Quick Actions</h4>
                                    <button className={`${styles.quickActionBtn} ${styles.primary}`} onClick={() => setActiveTab('my-leaves')}>Apply Leave</button>
                                    <button className={`${styles.quickActionBtn} ${styles.secondary}`} onClick={() => setActiveTab('my-history')}>View History</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'my-leaves' && (
                        <div className={styles.leaveForm}>
                            <h3 className={styles.profileSectionTitle}>Apply Leave</h3>
                            <form onSubmit={handleApplyLeave}>
                                <div className={styles.modalField}>
                                    <label>Leave Type</label>
                                    <select value={leaveFormData.leave_type} onChange={(e) => setLeaveFormData({...leaveFormData, leave_type: e.target.value})}>
                                        <option value="Sick Leave">Sick Leave</option>
                                        <option value="Casual Leave">Casual Leave</option>
                                        <option value="Paid Leave">Paid Leave</option>
                                    </select>
                                </div>
                                <div className={styles.modalField}><label>Start Date</label><input type="date" value={leaveFormData.start_date} onChange={(e) => setLeaveFormData({...leaveFormData, start_date: e.target.value})} required /></div>
                                <div className={styles.modalField}><label>End Date</label><input type="date" value={leaveFormData.end_date} onChange={(e) => setLeaveFormData({...leaveFormData, end_date: e.target.value})} required /></div>
                                <div className={styles.modalField}><label>Total Days</label><input type="number" min="1" value={leaveFormData.days} onChange={(e) => setLeaveFormData({...leaveFormData, days: e.target.value})} required /></div>
                                <div className={styles.modalField}><label>Reason</label><textarea rows="3" value={leaveFormData.reason} onChange={(e) => setLeaveFormData({...leaveFormData, reason: e.target.value})} required /></div>
                                <button type="submit" className={styles.leaveSubmitBtn}>Apply Leave</button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'my-history' && (
                        <div className={styles.profileCard}>
                            <h3 className={styles.profileSectionTitle}>My Leave History</h3>
                            
                            <div className={styles.searchWrapper}>
                                <select
                                    value={myLeaveStatus}
                                    onChange={(e) => {
                                        setMyLeaveStatus(e.target.value);
                                        setMyLeavePage(1);
                                    }}
                                    className={styles.limitSelect}
                                >
                                    <option value="">All Status</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                                <select
                                    value={myLeaveLimit}
                                    onChange={(e) => {
                                        setMyLeaveLimit(parseInt(e.target.value));
                                        setMyLeavePage(1);
                                    }}
                                    className={styles.limitSelect}
                                >
                                    <option value="5">5 per page</option>
                                    <option value="10">10 per page</option>
                                    <option value="20">20 per page</option>
                                    <option value="50">50 per page</option>
                                </select>
                            </div>

                            {(myLeaves || []).length === 0 ? (
                                <p className={styles.profileSectionEmpty}>No leaves applied yet!</p>
                            ) : (
                                <div className={styles.tableWrapper}>
                                    <table className={styles.historyTable}>
                                        <thead><tr>
                                            <th>Type</th><th>From</th><th>To</th>
                                            <th>Days</th><th>Status</th>
                                            <th>Comments</th>
                                        </tr></thead>
                                        <tbody>
                                            {(myLeaves || []).map((leave) => (
                                                <tr key={leave.id}>
                                                    <td>{leave.leave_type}</td>
                                                    <td>{leave.start_date}</td>
                                                    <td>{leave.end_date}</td>
                                                    <td><b>{leave.days || 1}</b></td>
                                                    <td>
                                                        <span className={`${styles.statusBadge} ${leave.status === 'Approved' ? styles.statusApproved : leave.status === 'Rejected' ? styles.statusRejected : styles.statusPending}`}>
                                                            {leave.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '12px', maxWidth: '150px', wordWrap: 'break-word' }}>
                                                        {leave.comments || '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <Pagination 
                                page={myLeavePage}
                                totalPages={myLeaveTotalPages}
                                setPage={setMyLeavePage}
                                total={myLeaveTotal}
                            />
                        </div>
                    )}
                </>
            ) : (
                <div className={styles.loading}>No profile data</div>
            )}
        </div>
    );
};

export default Dashboard;
