// ============================================
// ATTENDANCE RULES ENGINE
// ============================================

const ATTENDANCE_RULES = {
    FULL_DAY_HOURS: 8,
    CUTOFF_EARLY: '09:30',   // 9:30 AM - For full attendance
    CUTOFF_LATE: '12:00',    // 12:00 PM - For short leave
    CUTOFF_HALF: '14:00',    // 2:00 PM - For half day
    AUTO_PUNCH_OUT: '21:30', // ✅ 9:30 PM - Auto punch out time
    MIN_HALF_DAY: 4,         // Minimum hours for half day
};

const parseTime = (timeStr) => {
    if (!timeStr) return { hours: 0, minutes: 0 };
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return { hours, minutes };
};

const getTimeInMinutes = (date) => {
    if (!date) return 0;
    return date.getHours() * 60 + date.getMinutes();
};

const getTimeString = (date) => {
    if (!date) return '00:00';
    return date.toTimeString().slice(0, 5);
};

const isBeforeTime = (date, timeStr) => {
    if (!date) return false;
    const timeInMinutes = getTimeInMinutes(date);
    const { hours, minutes } = parseTime(timeStr);
    const cutoffMinutes = hours * 60 + minutes;
    return timeInMinutes < cutoffMinutes;
};

const isAfterTime = (date, timeStr) => {
    if (!date) return false;
    const timeInMinutes = getTimeInMinutes(date);
    const { hours, minutes } = parseTime(timeStr);
    const cutoffMinutes = hours * 60 + minutes;
    return timeInMinutes > cutoffMinutes;
};

const calculateAttendanceStatus = (punchIn, punchOut) => {
    if (!punchIn) {
        return { 
            status: 'Absent', 
            reason: 'No punch in',
            totalHours: 0,
            isEarly: false,
            isLate: false,
            isVeryLate: false,
            isPunchedOutOnTime: false
        };
    }

    const punchInTime = new Date(punchIn);
    
    if (!punchOut) {
        const now = new Date();
        const shouldAuto = isAfterTime(now, ATTENDANCE_RULES.AUTO_PUNCH_OUT);
        
        if (shouldAuto) {
            const result = calculateAttendanceStatus(punchIn, now);
            return result;
        }
        
        return { 
            status: 'Present', 
            reason: 'Punched in, waiting for punch out',
            totalHours: 0,
            isEarly: isBeforeTime(punchInTime, ATTENDANCE_RULES.CUTOFF_EARLY),
            isLate: isAfterTime(punchInTime, ATTENDANCE_RULES.CUTOFF_LATE),
            isVeryLate: isAfterTime(punchInTime, ATTENDANCE_RULES.CUTOFF_HALF),
            isPunchedOutOnTime: false
        };
    }

    const punchOutTime = new Date(punchOut);
    
    // Calculate total hours
    const diffMs = punchOutTime - punchInTime;
    const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    // ✅ Check rules
    const isEarly = isBeforeTime(punchInTime, ATTENDANCE_RULES.CUTOFF_EARLY);
    const isLate = isAfterTime(punchInTime, ATTENDANCE_RULES.CUTOFF_LATE);
    const isVeryLate = isAfterTime(punchInTime, ATTENDANCE_RULES.CUTOFF_HALF);
    const isPunchedOutOnTime = isAfterTime(punchOutTime, ATTENDANCE_RULES.AUTO_PUNCH_OUT) || 
                                isBeforeTime(punchOutTime, ATTENDANCE_RULES.CUTOFF_EARLY);

    let status = 'Present';
    let reason = '';

    // ✅ FULL ATTENDANCE: Before 9:30 AM + After 9:30 PM + >= 8 hours
    if (isEarly && isPunchedOutOnTime && totalHours >= ATTENDANCE_RULES.FULL_DAY_HOURS) {
        status = 'Present';
        reason = `Full day (${totalHours} hours) - Early punch in, On time punch out`;
    }
    // ✅ SHORT LEAVE: After 9:30 AM but before 12:00 PM
    else if (!isEarly && !isLate && totalHours < ATTENDANCE_RULES.FULL_DAY_HOURS) {
        status = 'Short Leave';
        reason = `Short leave (${totalHours} hours) - Late punch in after 9:30 AM`;
    }
    // ✅ HALF DAY: After 12:00 PM but before 2:00 PM OR total hours 4-8
    else if ((isLate && !isVeryLate) || (totalHours >= ATTENDANCE_RULES.MIN_HALF_DAY && totalHours < ATTENDANCE_RULES.FULL_DAY_HOURS)) {
        status = 'Half Day';
        reason = `Half day (${totalHours} hours) - Late start or early end`;
    }
    // ✅ ABSENT: After 2:00 PM OR total hours < 4
    else if (isVeryLate || totalHours < ATTENDANCE_RULES.MIN_HALF_DAY) {
        status = 'Absent';
        reason = `Absent (${totalHours} hours) - Very late punch in or insufficient hours`;
    }
    // ✅ Default: Present with less hours
    else {
        status = 'Present';
        reason = `Present (${totalHours} hours)`;
    }

    return {
        status,
        reason,
        totalHours,
        isAutoPunchOut: false,
        isEarly,
        isLate,
        isVeryLate,
        isPunchedOutOnTime
    };
};

const shouldAutoPunchOut = (punchIn) => {
    if (!punchIn) return false;
    const now = new Date();
    return isAfterTime(now, ATTENDANCE_RULES.AUTO_PUNCH_OUT);
};

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
    ATTENDANCE_RULES,
    parseTime,
    getTimeInMinutes,
    getTimeString,
    isBeforeTime,
    isAfterTime,
    calculateAttendanceStatus,
    shouldAutoPunchOut,
    getWorkDayStatus
};