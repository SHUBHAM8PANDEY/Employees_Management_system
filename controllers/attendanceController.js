const db = require('../models');
const Attendance = db.Attendance;
const Employee = db.Employee;
const { Op, cast, col, where: sqlWhere } = require('sequelize');
const auditLogger = require('../utils/auditLogger');
const {
    calculateAttendanceStatus,
    shouldAutoPunchOut,
    getWorkDayStatus,
    isAfterTime, attendanceDate, autoPunchTime
} = require('../utils/attendanceRules');

const getTodayStr = () => attendanceDate(new Date());
const photos = ['punch_in_photo', 'punch_out_photo'];

function punchEvidence(body) {
    const { latitude, longitude, photo } = body;
    if (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
        typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
        typeof photo !== 'string' || photo.length > 1400000 ||
        !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(photo)) return null;
    return { latitude, longitude, photo };
}

const buildSummary = (records) => {
    const summary = {
        present: 0,
        absent: 0,
        halfDay: 0,
        shortLeave: 0,
        onLeave: 0,
        holiday: 0,
        total: records.length
    };

    records.forEach((r) => {
        const status = r.status || r.dataValues?.status;
        if (status === 'Present') summary.present++;
        else if (status === 'Absent') summary.absent++;
        else if (status === 'Half Day') summary.halfDay++;
        else if (status === 'Short Leave') summary.shortLeave++;
        else if (status === 'On Leave') summary.onLeave++;
        else if (status === 'Holiday') summary.holiday++;
    });

    return summary;
};

const punchIn = async (req, res) => {
    try {
        const employeeCode = req.user.employee_code;
        const today = getTodayStr();
        const { punch_in_type = 'Office', notes } = req.body;
        const evidence = punchEvidence(req.body);
        if (!evidence) return res.status(400).json({ error: 'Take a selfie and allow location before punching in.' });
        const { latitude, longitude, photo } = evidence;
        const location = latitude.toFixed(5) + ', ' + longitude.toFixed(5);
        if (new Date() >= autoPunchTime(today)) return res.status(400).json({ error: 'Punch-in closes at 9:30 PM IST.' });

        const existing = await Attendance.findOne({
            where: { employee_code: employeeCode, date: today }
        });

        if (existing && existing.punch_in) {
            return res.status(400).json({ error: 'Already punched in today!' });
        }

        const now = new Date();
        const statusInfo = calculateAttendanceStatus(now, null);
        const isLate = isAfterTime(now, '09:30');

        let attendance;
        if (existing) {
            existing.punch_in = now;
            existing.punch_in_type = punch_in_type;
            existing.location = location;
            existing.latitude = latitude;
            existing.longitude = longitude;
            existing.punch_in_photo = photo;
            existing.notes = notes || null;
            existing.status = 'Present';
            existing.ip_address = req.ip || req.connection?.remoteAddress;
            existing.device_info = req.headers['user-agent'];
            await existing.save();
            attendance = existing;
        } else {
            attendance = await Attendance.create({
                employee_code: employeeCode,
                date: today,
                punch_in: now,
                punch_in_type,
                location, latitude, longitude, punch_in_photo: photo,
                notes: notes || null,
                status: 'Present',
                ip_address: req.ip || req.connection?.remoteAddress,
                device_info: req.headers['user-agent']
            });
        }

        await auditLogger.log({
            employee_code: employeeCode,
            action: 'PUNCH_IN',
            entity_type: 'Attendance',
            entity_id: attendance.id,
            new_data: { punch_in: now, punch_in_type },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        res.json({
            message: isLate ? 'Late punch-in recorded (after 9:30 AM IST)' : 'Punch in successful',
            isLate,
            attendance,
            statusInfo
        });
    } catch (error) {
        console.error('Punch in error:', error);
        res.status(500).json({ error: error.message });
    }
};

const punchOut = async (req, res) => {
    try {
        const employeeCode = req.user.employee_code;
        const today = getTodayStr();

        const attendance = await Attendance.findOne({
            where: { employee_code: employeeCode, date: today }
        });

        if (!attendance || !attendance.punch_in) {
            return res.status(400).json({ error: 'No punch in record found for today!' });
        }

        if (attendance.punch_out) {
            return res.status(400).json({ error: 'Already punched out today!' });
        }

        const evidence = punchEvidence(req.body);
        const cutoff = autoPunchTime(today);
        const current = new Date();
        const auto = current >= cutoff;
        if (!auto && !evidence) return res.status(400).json({ error: 'Take a selfie and allow location before punching out.' });
        const now = auto ? cutoff : current;
        const result = calculateAttendanceStatus(attendance.punch_in, now);

        attendance.punch_out = now;
        attendance.punch_out_type = auto ? 'Auto' : 'Manual';
        if (!auto) {
            attendance.punch_out_photo = evidence.photo;
            attendance.punch_out_latitude = evidence.latitude;
            attendance.punch_out_longitude = evidence.longitude;
        }
        attendance.total_hours = result.totalHours;
        attendance.status = result.status;
        const [updated] = await Attendance.update(attendance.get({ plain: true }), {
            fields: attendance.changed(), where: { id: attendance.id, punch_out: null }
        });
        if (!updated) return res.status(409).json({ error: 'Already punched out today.' });

        await auditLogger.log({
            employee_code: employeeCode,
            action: 'PUNCH_OUT',
            entity_type: 'Attendance',
            entity_id: attendance.id,
            new_data: { punch_out: now, status: result.status, total_hours: result.totalHours },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        res.json({
            message: 'Punch out successful',
            attendance,
            status: result.status,
            totalHours: result.totalHours,
            reason: result.reason
        });
    } catch (error) {
        console.error('Punch out error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getTodayAttendance = async (req, res) => {
    try {
        const employeeCode = req.user.employee_code;
        const today = getTodayStr();

        const attendance = await Attendance.findOne({
            where: { employee_code: employeeCode, date: today },
            attributes: { exclude: photos }
        });

        const isPunchedIn = !!(attendance && attendance.punch_in);
        const isPunchedOut = !!(attendance && attendance.punch_out);
        const autoPunchOut = isPunchedIn && !isPunchedOut && shouldAutoPunchOut(attendance.punch_in);

        let statusInfo = null;
        if (attendance && attendance.punch_in) {
            statusInfo = getWorkDayStatus(attendance.punch_in, attendance.punch_out);
        }

        res.json({
            data: attendance,
            isPunchedIn,
            isPunchedOut,
            shouldAutoPunchOut: autoPunchOut,
            statusInfo
        });
    } catch (error) {
        console.error('Get today attendance error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getAttendanceHistory = async (req, res) => {
    try {
        const employeeCode = req.user.employee_code;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const { start_date, end_date, year, month, day, status } = req.query;

        const where = { employee_code: employeeCode };

        if (start_date && end_date) {
            where.date = { [Op.between]: [start_date, end_date] };
        } else if (year) {
            const y = parseInt(year, 10);
            if (month && day) {
                const dateStr = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                where.date = dateStr;
            } else if (month) {
                const m = String(month).padStart(2, '0');
                where[Op.and] = sqlWhere(cast(col("date"), "text"), { [Op.like]: `${y}-${m}-%` });
            } else {
                where[Op.and] = sqlWhere(cast(col("date"), "text"), { [Op.like]: `${y}-%` });
            }
        }

        if (status) where.status = status;

        const { count, rows } = await Attendance.findAndCountAll({
            attributes: { exclude: photos },
            where,
            order: [['date', 'DESC']],
            limit,
            offset
        });

        const allRecords = await Attendance.findAll({
            where: { employee_code: employeeCode, ...(status ? { status } : {}) },
            order: [['date', 'DESC']]
        });

        const filteredForSummary = allRecords.filter((r) => {
            if (start_date && end_date) {
                return r.date >= start_date && r.date <= end_date;
            }
            if (year) {
                const y = parseInt(year, 10);
                if (month && day) {
                    const dateStr = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    return r.date === dateStr;
                }
                if (month) {
                    const prefix = `${y}-${String(month).padStart(2, '0')}-`;
                    return String(r.date).startsWith(prefix);
                }
                return String(r.date).startsWith(`${y}-`);
            }
            return true;
        });

        const summary = buildSummary(filteredForSummary);

        const yearlyMap = {};
        allRecords.forEach((r) => {
            const y = String(r.date).slice(0, 4);
            if (!yearlyMap[y]) {
                yearlyMap[y] = { year: parseInt(y, 10), Present: 0, 'Short Leave': 0, 'Half Day': 0, Absent: 0, 'On Leave': 0, Holiday: 0 };
            }
            if (yearlyMap[y][r.status] !== undefined) yearlyMap[y][r.status]++;
        });

        const monthlyMap = {};
        filteredForSummary.forEach((r) => {
            const key = String(r.date).slice(0, 7);
            if (!monthlyMap[key]) {
                monthlyMap[key] = { month: key, Present: 0, 'Short Leave': 0, 'Half Day': 0, Absent: 0, 'On Leave': 0, Holiday: 0 };
            }
            if (monthlyMap[key][r.status] !== undefined) monthlyMap[key][r.status]++;
        });

        res.json({
            data: rows,
            pagination: {
                page,
                total: count,
                totalPages: Math.ceil(count / limit) || 1
            },
            summary,
            yearlyStats: Object.values(yearlyMap).sort((a, b) => b.year - a.year),
            monthlyStats: Object.values(monthlyMap).sort((a, b) => b.month.localeCompare(a.month))
        });
    } catch (error) {
        console.error('Get attendance history error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getAttendanceStats = async (req, res) => {
    try {
        const employeeCode = req.user.employee_code;
        const now = new Date();
        const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`;

        const monthRecords = await Attendance.findAll({
            where: {
                employee_code: employeeCode,
                [Op.and]: sqlWhere(cast(col("date"), "text"), { [Op.like]: `${monthPrefix}%` })
            }
        });

        const monthlyStats = buildSummary(monthRecords);
        delete monthlyStats.total;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];

        const last7Days = await Attendance.findAll({
            where: {
                employee_code: employeeCode,
                date: { [Op.gte]: sevenDaysStr }
            },
            order: [['date', 'ASC']]
        });

        res.json({ monthlyStats, last7Days });
    } catch (error) {
        console.error('Get attendance stats error:', error);
        res.status(500).json({ error: error.message });
    }
};

async function getTeamAttendance(targetDate) {
    const [employees, records, leaves] = await Promise.all([
        Employee.findAll({ attributes: ['employee_code', 'first_name', 'last_name', 'email', 'joining_date'], order: [['first_name', 'ASC'], ['employee_code', 'ASC']] }),
        Attendance.findAll({ where: { date: targetDate }, attributes: { exclude: photos } }),
        db.LeaveRequest.findAll({ attributes: ['employee_code'], where: {
            status: 'Approved', start_date: { [Op.lte]: targetDate }, end_date: { [Op.gte]: targetDate }
        } })
    ]);
    const byEmployee = new Map(records.map(record => [record.employee_code, record]));
    const onLeave = new Set(leaves.map(leave => leave.employee_code));
    const sunday = new Date(targetDate + 'T00:00:00Z').getUTCDay() === 0;
    return employees.filter(employee => byEmployee.has(employee.employee_code) ||
        !employee.joining_date || employee.joining_date <= targetDate).map(employee => {
        const record = byEmployee.get(employee.employee_code)?.get({ plain: true });
        return {
            ...record, employee, employee_code: employee.employee_code, date: targetDate,
            status: record?.punch_in ? record.status : onLeave.has(employee.employee_code) ? 'On Leave' : record?.status ?? (sunday ? 'Holiday' : 'Absent'),
            late: record?.punch_in ? isAfterTime(record.punch_in, '09:30') : false
        };
    });
}

const getAllEmployeeAttendance = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const { date, status } = req.query;
        const targetDate = date || getTodayStr();
        const parsed = typeof targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? new Date(targetDate) : null;
        if (!parsed || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== targetDate) {
            return res.status(400).json({ error: 'Choose a valid attendance date.' });
        }

        const allForDate = await getTeamAttendance(targetDate);
        const filtered = status ? allForDate.filter(record => record.status === status) : allForDate;
        res.json({
            data: filtered.slice(offset, offset + limit), summary: buildSummary(allForDate),
            pagination: { page, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) || 1 }
        });
    } catch (error) {
        console.error('Get all attendance error:', error);
        res.status(500).json({ error: error.message });
    }
};

const editAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { punch_in, punch_out, status, punch_in_type, notes } = req.body;

        const attendance = await Attendance.findByPk(id);
        if (!attendance) {
            return res.status(404).json({ error: 'Attendance record not found!' });
        }

        const oldData = attendance.toJSON();

        if (punch_in !== undefined) attendance.punch_in = punch_in ? new Date(punch_in) : null;
        if (punch_out !== undefined) attendance.punch_out = punch_out ? new Date(punch_out) : null;
        if (punch_in_type) attendance.punch_in_type = punch_in_type;
        if (notes !== undefined) attendance.notes = notes;

        if (attendance.punch_in && attendance.punch_out) {
            const result = calculateAttendanceStatus(attendance.punch_in, attendance.punch_out);
            attendance.total_hours = result.totalHours;
            attendance.status = status || result.status;
        } else if (status) {
            attendance.status = status;
        }

        await attendance.save();

        await auditLogger.log({
            employee_code: req.user.employee_code,
            action: 'UPDATE',
            entity_type: 'Attendance',
            entity_id: attendance.id,
            old_data: oldData,
            new_data: attendance.toJSON(),
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        res.json({ message: 'Attendance updated', data: attendance });
    } catch (error) {
        console.error('Edit attendance error:', error);
        res.status(500).json({ error: error.message });
    }
};

const markAttendance = async (req, res) => {
    try {
        const { employee_code, date, status, punch_in, punch_out, punch_in_type, notes } = req.body;

        if (!employee_code || !date || !status) {
            return res.status(400).json({ error: 'employee_code, date and status are required!' });
        }

        let attendance = await Attendance.findOne({
            where: { employee_code, date }
        });

        const payload = {
            employee_code,
            date,
            status,
            punch_in: punch_in ? new Date(punch_in) : null,
            punch_out: punch_out ? new Date(punch_out) : null,
            punch_in_type: punch_in_type || 'Office',
            notes: notes || null
        };

        if (payload.punch_in && payload.punch_out) {
            const result = calculateAttendanceStatus(payload.punch_in, payload.punch_out);
            payload.total_hours = result.totalHours;
            payload.status = status || result.status;
        }

        if (attendance) {
            await attendance.update(payload);
        } else {
            attendance = await Attendance.create(payload);
        }

        await auditLogger.log({
            employee_code: req.user.employee_code,
            action: 'MARK_ATTENDANCE',
            entity_type: 'Attendance',
            entity_id: attendance.id,
            new_data: payload,
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        res.json({ message: 'Attendance marked', data: attendance });
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getTeamAttendance,
    punchIn,
    punchOut,
    getTodayAttendance,
    getAttendanceHistory,
    getAttendanceStats,
    getAllEmployeeAttendance,
    editAttendance,
    markAttendance
};
