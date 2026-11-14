import { API_BASE } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
);

const AnalyticsDashboard = () => {
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [employeeSummary, setEmployeeSummary] = useState([]);
    const [selectedChart, setSelectedChart] = useState('bar');

    useEffect(() => {
        fetchStatistics();
    }, []);

    const fetchStatistics = async () => {
        try {
            const token = localStorage.getItem('token');
            const [statsRes, summaryRes] = await Promise.all([
                axios.get(`${API_BASE}/api/reports/statistics`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_BASE}/api/reports/employee-summary`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            setStatistics(statsRes.data);
            setEmployeeSummary(summaryRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching statistics:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ fontSize: '24px' }}>📊 Loading Analytics...</div>
            </div>
        );
    }

    if (!statistics) {
        return <div>No data available</div>;
    }

    // Chart data for leave types
    const leaveTypeData = {
        labels: statistics.leaveByType?.map(item => item.leave_type) || [],
        datasets: [{
            label: 'Leave Count by Type',
            data: statistics.leaveByType?.map(item => item.count) || [],
            backgroundColor: [
                '#0284c7', // Sick - Blue
                '#d97706', // Casual - Orange
                '#059669', // Paid - Green
                '#8b5cf6'  // Other - Purple
            ],
            borderWidth: 0
        }]
    };
