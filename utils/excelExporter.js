const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

// Export to Excel
const exportToExcel = (data, sheetName = 'Leave Report') => {
    try {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        return buffer;
    } catch (error) {
        console.error('Excel export error:', error);
        throw error;
    }
};

// Export to CSV
const exportToCSV = (data) => {
    try {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        return csv;
    } catch (error) {
        console.error('CSV export error:', error);
        throw error;
    }
};

// Format data for report
const formatLeaveReportData = (leaves, employees) => {
    return leaves.map(leave => {
        const employee = employees.find(e => e.employee_code === leave.employee_code);
        return {
            'Employee Code': leave.employee_code,
            'Employee Name': employee ? `${employee.first_name} ${employee.last_name}` : 'N/A',
            'Leave Type': leave.leave_type,
            'Start Date': leave.start_date,
            'End Date': leave.end_date,
            'Days': leave.days || 1,
            'Reason': leave.reason || 'N/A',
            'Status': leave.status,
            'Applied On': leave.applied_at ? new Date(leave.applied_at).toLocaleDateString() : 'N/A',
            'Approved By': leave.approved_by || '—',
            'Approved On': leave.approved_at ? new Date(leave.approved_at).toLocaleDateString() : '—'
        };
    });
};

module.exports = {
    exportToExcel,
    exportToCSV,
    formatLeaveReportData
};