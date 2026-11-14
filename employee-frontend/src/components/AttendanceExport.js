import { API_BASE } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AttendanceExport = ({ employeeCode, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [options, setOptions] = useState({ availableMonths: [], employee: null });
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [exportType, setExportType] = useState('excel');
    const [error, setError] = useState('');
    const userRole = localStorage.getItem('role') || 'Employee';

    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = `${API_BASE}/api/attendance/export/options`;
            if (employeeCode && (userRole === 'Admin' || userRole === 'HR')) {
                url += `?employee_code=${employeeCode}`;
            }
            
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOptions(response.data.data);
        } catch (err) {
            setError('Failed to load options!');
        }
        setLoading(false);
    };

    const handleExport = async () => {
        setExportLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            
            if (employeeCode && (userRole === 'Admin' || userRole === 'HR')) {
                params.append('employee_code', employeeCode);
            }
            
            if (selectedMonth && selectedYear) {
                params.append('month', selectedMonth);
                params.append('year', selectedYear);
            }

            let endpoint;
            if (userRole === 'Admin' || userRole === 'HR') {
                endpoint = exportType === 'excel' 
                    ? '/api/attendance/admin/export/excel' 
                    : '/api/attendance/admin/export/pdf';
            } else {
                endpoint = exportType === 'excel' 
                    ? '/api/attendance/export/excel' 
                    : '/api/attendance/export/pdf';
            }
            
            const url = `${API_BASE}${endpoint}?${params.toString()}`;
            
            const response = await axios.get(url, {
                headers: { 
                    Authorization: `Bearer ${token}`
                },
                responseType: 'blob'
            });

            const contentType = exportType === 'excel' 
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/pdf';
            
            const blob = new Blob([response.data], { type: contentType });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            const fileExt = exportType === 'excel' ? 'xlsx' : 'pdf';
            const fileName = `Attendance_${options.employee?.employee_code || 'employee'}_${selectedMonth || 'all'}_${selectedYear || 'all'}.${fileExt}`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            
            alert(`✅ Attendance exported as ${exportType.toUpperCase()} successfully!`);
            if (onClose) onClose();
        } catch (err) {
            setError('Failed to export! Please try again.');
            console.error(err);
        }
        setExportLoading(false);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '16px',
                maxWidth: '420px',
                width: '100%',
                boxShadow: '0 25px 60px rgba(0,0,0,0.15)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    paddingBottom: '14px',
                    borderBottom: '2px solid #e9edf4'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0a0a23', margin: 0 }}>
                        📊 Export Attendance
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f1f5f9',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '16px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div style={{
                        background: '#fee2e2',
                        color: '#b91c1c',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        fontSize: '13px'
                    }}>
                        ❌ {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                        ⏳ Loading...
                    </div>
                ) : (
                    <>
                        {options.employee && (
                            <div style={{
                                background: '#f8fafc',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                border: '1px solid #e9edf4'
                            }}>
                                <p style={{ margin: '2px 0', fontSize: '13px' }}>
                                    <strong>Employee:</strong> {options.employee.first_name} {options.employee.last_name}
                                </p>
                                <p style={{ margin: '2px 0', fontSize: '13px' }}>
                                    <strong>Code:</strong> {options.employee.employee_code}
                                </p>
                            </div>
                        )}

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{
                                display: 'block',
                                fontWeight: '600',
                                marginBottom: '4px',
                                fontSize: '13px',
                                color: '#475569'
                            }}>
                                Select Month
                            </label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    background: 'white',
                                    outline: 'none'
                                }}
                            >
                                <option value="">All Months</option>
                                {options.availableMonths.map((m) => (
                                    <option key={`${m.year}-${m.month}`} value={m.month}>
                                        {m.monthName} {m.year}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{
                                display: 'block',
                                fontWeight: '600',
                                marginBottom: '4px',
                                fontSize: '13px',
                                color: '#475569'
                            }}>
                                Select Year
                            </label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    background: 'white',
                                    outline: 'none'
                                }}
                            >
                                {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{
                                display: 'block',
                                fontWeight: '600',
                                marginBottom: '4px',
                                fontSize: '13px',
                                color: '#475569'
                            }}>
                                Export Format
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setExportType('excel')}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        border: `2px solid ${exportType === 'excel' ? '#4f46e5' : '#e2e8f0'}`,
                                        borderRadius: '10px',
                                        background: exportType === 'excel' ? '#eef2ff' : 'white',
                                        color: exportType === 'excel' ? '#4f46e5' : '#64748b',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    📊 Excel
                                </button>
                                <button
                                    onClick={() => setExportType('pdf')}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        border: `2px solid ${exportType === 'pdf' ? '#4f46e5' : '#e2e8f0'}`,
                                        borderRadius: '10px',
                                        background: exportType === 'pdf' ? '#eef2ff' : 'white',
                                        color: exportType === 'pdf' ? '#4f46e5' : '#64748b',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    📄 PDF
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleExport}
                            disabled={exportLoading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: exportLoading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '600',
                                fontSize: '16px',
                                cursor: exportLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {exportLoading ? '⏳ Exporting...' : `📥 Download ${exportType.toUpperCase()}`}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default AttendanceExport;