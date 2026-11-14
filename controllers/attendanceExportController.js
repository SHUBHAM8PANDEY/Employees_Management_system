const db = require('../models');
const Attendance = db.Attendance;
const Employee = db.Employee;
const { Op, cast, col, where: sqlWhere } = require('sequelize');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const getTargetEmployeeCode = (req) => {
    const role = req.user?.role;
    if ((role === 'Admin' || role === 'HR') && req.query.employee_code) {
        return req.query.employee_code;
    }
    return req.user.employee_code;
};

const buildDateFilter = (query) => {
    const { month, year } = query;
    const where = {};

    if (year && month) {
        const prefix = `${year}-${String(month).padStart(2, '0')}-`;
        where[Op.and] = sqlWhere(cast(col("date"), "text"), { [Op.like]: `${prefix}%` });
    } else if (year) {
        where[Op.and] = sqlWhere(cast(col("date"), "text"), { [Op.like]: `${year}-%` });
    }

    return where;
};

const getExportOptions = async (req, res) => {
    try {
        const employeeCode = getTargetEmployeeCode(req);

        const employee = await Employee.findOne({
            where: { employee_code: employeeCode },
            attributes: ['employee_code', 'first_name', 'last_name', 'email']
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found!' });
        }

        const records = await Attendance.findAll({
            where: { employee_code: employeeCode },
            attributes: ['date'],
            order: [['date', 'DESC']]
        });

        const monthSet = new Map();
        records.forEach((r) => {
            const d = new Date(r.date);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            if (!monthSet.has(key)) {
                monthSet.set(key, {
                    year: d.getFullYear(),
                    month: d.getMonth() + 1,
                    monthName: MONTH_NAMES[d.getMonth()]
                });
            }
        });

        res.json({
            data: {
                employee,
                availableMonths: Array.from(monthSet.values())
            }
        });
    } catch (error) {
        console.error('Export options error:', error);
        res.status(500).json({ error: error.message });
    }
};

const fetchAttendanceForExport = async (employeeCode, query) => {
    const where = { employee_code: employeeCode, ...buildDateFilter(query) };
    return Attendance.findAll({
        where,
        order: [['date', 'ASC']]
    });
};

const exportAttendanceExcel = async (req, res) => {
    try {
        const employeeCode = getTargetEmployeeCode(req);
        const employee = await Employee.findOne({ where: { employee_code: employeeCode } });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found!' });
        }

        const records = await fetchAttendanceForExport(employeeCode, req.query);

        const rows = records.map((r) => ({
            Date: r.date,
            'Punch In': r.punch_in ? new Date(r.punch_in).toLocaleString('en-IN') : '',
            'Punch Out': r.punch_out ? new Date(r.punch_out).toLocaleString('en-IN') : '',
            Type: r.punch_in_type || 'Office',
            'Total Hours': r.total_hours || 0,
            Status: r.status,
            Location: r.location || '',
            Notes: r.notes || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Date: 'No records' }]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Attendance_${employeeCode}.xlsx`);
        res.send(buffer);
    } catch (error) {
        console.error('Export Excel error:', error);
        res.status(500).json({ error: error.message });
    }
};

const exportAttendancePDF = async (req, res) => {
    try {
        const employeeCode = getTargetEmployeeCode(req);
        const employee = await Employee.findOne({ where: { employee_code: employeeCode } });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found!' });
        }

        const records = await fetchAttendanceForExport(employeeCode, req.query);

        const doc = new PDFDocument({ margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Attendance_${employeeCode}.pdf`);
        doc.pipe(res);

        doc.fontSize(18).text('Attendance Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Employee: ${employee.first_name} ${employee.last_name} (${employeeCode})`);
        doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`);
        doc.moveDown();

        if (!records.length) {
            doc.text('No attendance records found.');
        } else {
            records.forEach((r) => {
                doc.fontSize(11).text(`${r.date} | ${r.status} | IN: ${r.punch_in ? new Date(r.punch_in).toLocaleTimeString('en-IN') : '-'} | OUT: ${r.punch_out ? new Date(r.punch_out).toLocaleTimeString('en-IN') : '-'} | ${r.total_hours || 0} hrs`);
            });
        }

        doc.end();
    } catch (error) {
        console.error('Export PDF error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getExportOptions,
    exportAttendanceExcel,
    exportAttendancePDF
};
