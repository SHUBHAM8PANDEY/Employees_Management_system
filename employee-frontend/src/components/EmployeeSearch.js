import { API_BASE } from '../config';
import React, { useState } from 'react';
import axios from 'axios';

const EmployeeSearch = ({ onSearchResults }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        department: '',
        leaveBalance: '',
        status: 'all'
    });
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${API_BASE}/api/employee/search?q=${searchTerm}&department=${filters.department}&balance=${filters.leaveBalance}&status=${filters.status}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onSearchResults(response.data);
        } catch (error) {
            console.error('Search error:', error);
            alert('Search failed!');
        }
        setLoading(false);
    };

    return (
        <div className="search-container" style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginBottom: '24px'
        }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="🔍 Search by name, code, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        flex: 2,
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '14px',
                        minWidth: '200px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                
                <select
                    value={filters.department}
                    onChange={(e) => setFilters({...filters, department: e.target.value})}
                    style={{
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: 'white'
                    }}
                >
                    <option value="">All Departments</option>
                    <option value="Engineering">Engineering</option>
                    <option value="HR">HR</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                </select>

                <select
                    value={filters.leaveBalance}
                    onChange={(e) => setFilters({...filters, leaveBalance: e.target.value})}
                    style={{
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: 'white'
                    }}
                >
                    <option value="">All Leave Balance</option>
                    <option value="low">Low Balance (&lt; 5 days)</option>
                    <option value="medium">Medium Balance (5-10 days)</option>
                    <option value="high">High Balance (&gt; 10 days)</option>
                </select>

                <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    style={{
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: 'white'
                    }}
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>

                <button
                    onClick={handleSearch}
                    disabled={loading}
                    style={{
                        padding: '12px 32px',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    {loading ? '⏳ Searching...' : '🔍 Search'}
                </button>
            </div>

            <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
                💡 Tip: Use filters to narrow down results
            </div>
        </div>
    );
};

export default EmployeeSearch;