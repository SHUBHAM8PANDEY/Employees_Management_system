const db = require('../models');
const { Op } = require('sequelize');
const { attendanceDate } = require('../utils/attendanceRules');
const { getTeamAttendance } = require('./attendanceController');

const iso = date => date.toISOString().slice(0, 10);
const shift = (date, days) => {
    const next = new Date(date + 'T00:00:00Z');
    next.setUTCDate(next.getUTCDate() + days);
    return iso(next);
};

async function overview(req, res) {
    const today = attendanceDate(new Date());
    const windowSize = req.query.days === '14' ? 14 : 7;
    const start = shift(today, 1 - windowSize);
    const [employees, roster, punches, leave, pending, holidays] = await Promise.all([
        db.Employee.findAll({ attributes: ['employee_code', 'first_name', 'last_name', 'date_of_birth', 'joining_date'], raw: true }),
        getTeamAttendance(today),
        db.Attendance.findAll({ attributes: ['date', 'status', 'employee_code', 'punch_in'], where: { date: { [Op.between]: [start, today] } }, raw: true }),
        db.LeaveRequest.findAll({ attributes: ['employee_code', 'start_date', 'end_date'], where: {
            status: 'Approved', start_date: { [Op.lte]: today }, end_date: { [Op.gte]: start }
        }, raw: true }),
        db.LeaveRequest.findAndCountAll({ attributes: ['id', 'employee_code', 'leave_type', 'start_date', 'end_date'],
            where: { status: 'Pending' }, order: [['applied_at', 'DESC'], ['id', 'DESC']], limit: 5, raw: true }),
        db.Attendance.findAll({ attributes: ['date'], where: { status: 'Holiday', date: { [Op.between]: [today, shift(today, 45)] } },
            group: ['date'], raw: true })
    ]);
    const names = new Map(employees.map(employee => [employee.employee_code, employee.first_name + ' ' + employee.last_name]));
    const records = new Map(punches.map(row => [row.date + '/' + row.employee_code, row]));
    const history = Array.from({ length: windowSize }, (_, index) => {
        const date = shift(start, index);
        const totals = { date, present: 0, absent: 0, leave: 0 };
        for (const employee of employees) {
            const row = records.get(date + '/' + employee.employee_code);
            if (!row && employee.joining_date && employee.joining_date > date) continue;
            if (row?.punch_in || ['Present', 'Half Day', 'Short Leave'].includes(row?.status)) totals.present++;
            else if (row?.status === 'Holiday' || new Date(date + 'T00:00:00Z').getUTCDay() === 0) continue;
            else if (row?.status === 'On Leave' || leave.some(item => item.employee_code === employee.employee_code &&
                item.start_date <= date && item.end_date >= date)) totals.leave++;
            else totals.absent++;
        }
        return totals;
    });
    const upcoming = [];
    for (let offset = 0; offset <= 45; offset++) {
        const date = shift(today, offset);
        const year = Number(date.slice(0, 4));
        const matches = source => source && (source.slice(5) === date.slice(5) ||
            (source.slice(5) === '02-29' && date.slice(5) === '02-28' && new Date(Date.UTC(year, 2, 0)).getUTCDate() === 28));
        for (const employee of employees) {
            const { employee_code, date_of_birth, joining_date } = employee;
            if (matches(date_of_birth)) upcoming.push({ code: employee_code, name: names.get(employee_code), date, kind: 'Birthday' });
            if (matches(joining_date) && year > Number(joining_date.slice(0, 4))) {
                const years = year - Number(joining_date.slice(0, 4));
                upcoming.push({ code: employee_code, name: names.get(employee_code), date, kind: 'Work anniversary', years });
            }
        }
    }
    const daysOff = new Map(holidays.map(({ date }) => [date, 'Recorded holiday']));
    for (let offset = 0; offset <= 45; offset++) {
        const date = shift(today, offset);
        if (new Date(date + 'T00:00:00Z').getUTCDay() === 0) daysOff.set(date, 'Sunday weekly off');
    }

    res.json({
        today, history,
        totals: { employees: employees.length,
            present: roster.filter(row => ['Present', 'Half Day', 'Short Leave'].includes(row.status)).length,
            absent: roster.filter(row => row.status === 'Absent').length, pending: pending.count },
        upcoming: upcoming.slice(0, 6),
        daysOff: [...daysOff].sort(([a], [b]) => a.localeCompare(b)).slice(0, 5).map(([date, label]) => ({ date, label })),
        pending: pending.rows.map(row => ({ ...row, name: names.get(row.employee_code) || row.employee_code })),
        arrivals: roster.filter(row => row.punch_in).sort((a, b) => new Date(b.punch_in) - new Date(a.punch_in)).slice(0, 5)
            .map(row => ({ code: row.employee_code, name: names.get(row.employee_code), time: row.punch_in, mode: row.punch_in_type, late: row.late }))
    });
}

module.exports = overview;
