import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/');
    };

    if (!token) return null; // Login page par navbar nahi dikhega

    return (
        <nav style={{ backgroundColor: '#333', color: '#fff', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Employee Portal</h2>
            <div>
                <Link to="/dashboard" style={{ color: '#fff', marginRight: '15px', textDecoration: 'none' }}>Dashboard</Link>
                <Link to="/add-employee" style={{ color: '#fff', marginRight: '15px', textDecoration: 'none' }}>Add Employee</Link>
                <button onClick={handleLogout} style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '4px' }}>Logout</button>
            </div>
        </nav>
    );
};

export default Navbar;