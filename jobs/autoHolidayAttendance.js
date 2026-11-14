const { attendanceDate } = require('../utils/attendanceRules');
const cron = require('node-cron');
const db = require('../models');
const Attendance = db.Attendance;
const Employee = db.Employee;
const User = db.User;
const { Op } = require('sequelize');
const notificationHelper = require('../utils/notificationHelper');
const auditLogger = require('../utils/auditLogger');

// ============================================
// AUTO HOLIDAY ATTENDANCE - Sunday
// ============================================
const autoHolidayAttendance = async () => {
    console.log(`⏰ Auto Holiday Attendance Job started at ${new Date().toISOString()}`);

    try {
        const today = new Date();
        const todayStr = attendanceDate(today);
        const dayOfWeek = today.getDay(); // 0 = Sunday

        // ✅ Only run on Sunday
        if (dayOfWeek !== 0) {
            console.log('📅 Today is not Sunday, skipping...');
            return {
                success: true,
                message: 'Not Sunday, skipping...',
                skipped: true
            };
        }

        // ✅ Get all employees
        const employees = await Employee.findAll({
            attributes: ['employee_code', 'first_name', 'last_name', 'email']
        });

        let updatedCount = 0;
        let errorCount = 0;

        for (const employee of employees) {
            try {
                // ✅ Check if attendance already exists
                let attendance = await Attendance.findOne({
                    where: {
                        employee_code: employee.employee_code,
                        date: todayStr
                    }
                });

                if (attendance) {
                    // ✅ Update existing attendance to Holiday
                    attendance.status = 'Holiday';
                    attendance.notes = 'Auto marked Holiday (Sunday)';
                    attendance.punch_in = null;
                    attendance.punch_out = null;
                    attendance.total_hours = 0;
                    await attendance.save();
                } else {
                    // ✅ Create new holiday attendance
                    await Attendance.create({
                        employee_code: employee.employee_code,
                        date: todayStr,
                        status: 'Holiday',
                        notes: 'Auto marked Holiday (Sunday)',
                        total_hours: 0
                    });
                }

                updatedCount++;
                console.log(`✅ ${employee.employee_code} - Holiday (Sunday)`);

            } catch (err) {
                errorCount++;
                console.error(`❌ Error processing ${employee.employee_code}:`, err.message);
            }
        }

        // ✅ Audit Log
        await auditLogger.log({
            employee_code: 'SYSTEM',
            action: 'AUTO_HOLIDAY',
            entity_type: 'Attendance',
            new_data: {
                date: todayStr,
                updated: updatedCount,
                errors: errorCount
            },
            status: 'Success'
        });

        // ✅ Notification to HR/Admin
        try {
            const admins = await User.findAll({
                where: { role: ['Admin', 'HR'] },
                attributes: ['employee_code']
            });

            const message = `📊 Sunday Holiday Auto Update\n\nDate: ${todayStr}\n✅ Updated: ${updatedCount} employees\n❌ Errors: ${errorCount}`;

            for (const admin of admins) {
                await notificationHelper.create({
                    employee_code: admin.employee_code,
                    type: 'AUTO_HOLIDAY_REPORT',
                    title: '📊 Sunday Holiday Update',
                    message: message,
                    link: '/attendance/admin',
                    icon: '📊',
                    color: 'purple'
                });
            }
        } catch (notifError) {
            console.error('Admin notification error:', notifError);
        }

        console.log(`✅ Auto Holiday completed! Updated: ${updatedCount}, Errors: ${errorCount}`);

        return {
            success: true,
            date: todayStr,
            updated: updatedCount,
            errors: errorCount
        };

    } catch (error) {
        console.error('❌ Auto Holiday failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// ============================================
// START CRON JOB - Runs on Sunday at 12:00 AM
// ============================================
const startAutoHolidayJob = () => {
    // ✅ Run at 12:00 AM on Sunday (day 0)
    cron.schedule('0 0 * * 0', async () => {
        console.log('⏰ Auto Holiday Cron triggered (Sunday)');
        await autoHolidayAttendance();
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('✅ Auto Holiday cron job scheduled successfully!');
    console.log('📅 Will run at 12:00 AM every Sunday');
};

// ============================================
// MANUAL TRIGGER (Testing)
// ============================================
const manualHoliday = async () => {
    console.log('🔧 Manual Auto Holiday triggered...');
    return await autoHolidayAttendance();
};

module.exports = {
    startAutoHolidayJob,
    autoHolidayAttendance,
    manualHoliday
};