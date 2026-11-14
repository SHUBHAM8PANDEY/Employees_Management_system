// ============================================
// ATTENDANCE RULES ENGINE
// ============================================

const ATTENDANCE_RULES = { FULL_DAY_HOURS: 9, CUTOFF_EARLY: '09:30', AUTO_PUNCH_OUT: '21:30' };
const attendanceDate = date => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(date);
const getTimeString = date => new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
}).format(date);
const parseTime = value => {
    const [hours, minutes] = value.split(':').map(Number);
    return { hours, minutes };
};
const getTimeInMinutes = date => {
    const { hours, minutes } = parseTime(getTimeString(date));
    return hours * 60 + minutes;
};
const isBeforeTime = (date, time) => getTimeString(date) < time;
const isAfterTime = (date, time) => getTimeString(date) > time;
const autoPunchTime = date => new Date(date + 'T21:30:00+05:30');

function calculateAttendanceStatus(punchIn, punchOut) {
    if (!punchIn) return { status: 'Absent', totalHours: 0, reason: 'No punch-in' };
    const start = new Date(punchIn);
    const isLate = isAfterTime(start, ATTENDANCE_RULES.CUTOFF_EARLY);
    if (!punchOut) return { status: 'Present', totalHours: 0, isLate, inProgress: true, reason: 'Shift in progress' };
    const hours = Math.max(0, (new Date(punchOut) - start) / 3600000);
    const fullDay = hours >= ATTENDANCE_RULES.FULL_DAY_HOURS;
    return {
        status: fullDay ? 'Present' : 'Half Day',
        totalHours: Math.round(hours * 100) / 100,
        isLate,
        reason: fullDay ? 'Completed at least 9 hours' : 'Worked fewer than 9 hours'
    };
}

const shouldAutoPunchOut = punchIn => Boolean(punchIn && new Date() >= autoPunchTime(attendanceDate(new Date(punchIn))));

const getWorkDayStatus = (punchIn, punchOut) => {
    const result = calculateAttendanceStatus(punchIn, punchOut);
    
    const statusMap = {
        'Present': '✅ Present',
        'Short Leave': '⏳ Short Leave',
        'Half Day': '🌓 Half Day',
        'Absent': '❌ Absent'
    };

    return {
        ...result,
        displayStatus: statusMap[result.status] || result.status,
        isFullDay: result.status === 'Present' && result.totalHours >= ATTENDANCE_RULES.FULL_DAY_HOURS,
        isShortLeave: result.status === 'Short Leave',
        isHalfDay: result.status === 'Half Day',
        isAbsent: result.status === 'Absent'
    };
};

module.exports = {
    ATTENDANCE_RULES, attendanceDate, autoPunchTime,
    parseTime,
    getTimeInMinutes,
    getTimeString,
    isBeforeTime,
    isAfterTime,
    calculateAttendanceStatus,
    shouldAutoPunchOut,
    getWorkDayStatus
};