const cron = require('node-cron');
const db = require('../models');
const Attendance = db.Attendance;
const Employee = db.Employee;
const User = db.User;
const notificationHelper = require('../utils/notificationHelper');
const auditLogger = require('../utils/auditLogger');
const {
    ATTENDANCE_RULES,
    calculateAttendanceStatus, attendanceDate, autoPunchTime,
    getTimeString,
    shouldAutoPunchOut
} = require('../utils/attendanceRules');

// ============================================
// AUTO PUNCH OUT - Runs at 9:30 PM Daily
// ============================================
const autoPunchOut = async () => {

    try {
        const today = new Date();
        const todayStr = attendanceDate(today);

        const attendances = await Attendance.findAll({
            where: {
                date: { [db.Sequelize.Op.lte]: todayStr },
                punch_in: {
                    [db.Sequelize.Op.ne]: null
                },
                punch_out: null
            },
            attributes: { exclude: ['punch_in_photo', 'punch_out_photo'] },
            include: [{
                model: Employee,
                as: 'employee',
                attributes: ['first_name', 'last_name', 'email', 'employee_code']
            }]
        });

        console.log(`Found ${attendances.length} employees with open attendance`);

        let updatedCount = 0;
        let errorCount = 0;
        let statusSummary = {
            Present: 0,
            'Short Leave': 0,
            'Half Day': 0,
            Absent: 0
        };

        for (const attendance of attendances) {
            try {
                const punchInTime = new Date(attendance.punch_in);
                const punchOutTime = autoPunchTime(attendance.date);
                if (punchInTime > punchOutTime || new Date() < punchOutTime) continue;
                
                // Calculate status using rules
                const result = calculateAttendanceStatus(punchInTime, punchOutTime);

                const [updated] = await Attendance.update({
                    punch_out: punchOutTime, punch_out_type: 'Auto',
                    status: result.status, total_hours: result.totalHours
                }, { where: { id: attendance.id, punch_out: null } });
                if (!updated) continue;

                // Update summary
                if (statusSummary[result.status] !== undefined) {
                    statusSummary[result.status]++;
                }

                // Audit Log
                await auditLogger.log({
                    employee_code: attendance.employee_code,
                    action: 'AUTO_PUNCH_OUT',
                    entity_type: 'Attendance',
                    entity_id: attendance.id,
                    new_data: { total_hours: result.totalHours, status: result.status },
                    status: 'Success'
                });

                // Notification
                const employeeName = attendance.employee 
                    ? `${attendance.employee.first_name} ${attendance.employee.last_name}` 
                    : attendance.employee_code;

                const statusEmoji = {
                    'Present': '✅',
                    'Short Leave': '⏳',
                    'Half Day': '🌓',
                    'Absent': '❌'
                };

                await notificationHelper.sendToEmployeeAndAdmins(
                    attendance.employee_code,
                    {
                        type: 'AUTO_PUNCH_OUT',
                        title: `⏰ Auto Punch Out - ${result.status}`,
                        message: `${employeeName} auto punched out (${result.totalHours} hours - ${result.status})`,
                        link: '/attendance',
                        icon: statusEmoji[result.status] || '⏰',
                        color: result.status === 'Present' ? 'green' : result.status === 'Short Leave' ? 'yellow' : 'red'
                    }
                );

                updatedCount++;
                console.log(`Auto punched out: ${attendance.employee_code} - ${result.status} (${result.totalHours} hours)`);

            } catch (err) {
                errorCount++;
                console.error(`Error auto punching out ${attendance.employee_code}:`, err.message);
            }
        }

        // Notification to HR/Admin
        try {
            const admins = await User.findAll({
                where: { role: ['Admin', 'HR'] },
                attributes: ['employee_code']
            });

            const message = `📊 Auto Punch Out Report\n\nDate: ${todayStr}\n✅ Present: ${statusSummary.Present}\n⏳ Short Leave: ${statusSummary['Short Leave']}\n🌓 Half Day: ${statusSummary['Half Day']}\n❌ Absent: ${statusSummary.Absent}\nTotal: ${attendances.length}`;

            for (const admin of admins) {
                await notificationHelper.create({
                    employee_code: admin.employee_code,
                    type: 'AUTO_PUNCH_OUT_REPORT',
                    title: '📊 Auto Punch Out Report',
                    message: message,
                    link: '/attendance/admin',
                    icon: '📊',
                    color: 'purple'
                });
            }
        } catch (adminNotifError) {
            console.error('Admin notification error:', adminNotifError);
        }

        console.log(`Auto Punch Out completed! Updated: ${updatedCount}, Errors: ${errorCount}`);
        console.log(`Summary:`, statusSummary);

        return {
            success: true,
            total: attendances.length,
            updated: updatedCount,
            errors: errorCount,
            statusSummary
        };

    } catch (error) {
        console.error('Auto Punch Out failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// ============================================
// START CRON JOB - 9:30 PM (21:30) Daily
// ============================================
const startAutoPunchOutJob = () => {
    // Run at 9:30 PM every day
    cron.schedule('*/5 * * * *', async () => {
        await autoPunchOut();
    }, {
        noOverlap: true,
        timezone: "Asia/Kolkata"
    });

    void autoPunchOut();
    console.log('Auto Punch Out cron job scheduled successfully!');
    console.log('Will run at 9:30 PM every day');
};

// ============================================
// MANUAL TRIGGER
// ============================================
const manualPunchOut = async () => {
    console.log('Manual Auto Punch Out triggered...');
    return await autoPunchOut();
};

module.exports = {
    startAutoPunchOutJob,
    autoPunchOut,
    manualPunchOut
};
