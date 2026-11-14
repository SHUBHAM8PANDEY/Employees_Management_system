const cron = require('node-cron');
const db = require('../models');
const { sendEmail } = require('../utils/emailService');
const LeaveLimit = db.LeaveLimit;
const Employee = db.Employee;

// ============================================
// LEAVE CONFIGURATION
// ============================================
const LEAVE_CONFIG = {
    SICK_LIMIT: 12,          // Annual - Reset in January
    CASUAL_LIMIT: 1,         // Monthly - Reset every month (1 per month)
    PAID_LIMIT: 10,          // Annual - Reset in January
    RESET_DAY: 1,
    RESET_HOUR: 0,
    RESET_MINUTE: 0
};

// ============================================
// HELPERS
// ============================================
const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
};

// ============================================
// MAIN RESET FUNCTION
// ============================================
const resetLeaveLimits = async () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthName = getMonthName(currentMonth);
    const isJanuary = currentMonth === 0;

    console.log(`🔄 Starting monthly leave reset for ${monthName} ${currentYear}...`);
    console.log(`📌 ${isJanuary ? 'ANNUAL' : 'MONTHLY'} reset`);

    try {
        const employees = await Employee.findAll({
            attributes: ['employee_code', 'first_name', 'last_name', 'email']
        });

        let updatedCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const employee of employees) {
            try {
                let leaveLimit = await LeaveLimit.findOne({
                    where: { employee_code: employee.employee_code }
                });

                // ✅ If no leave limits exist, create defaults
                if (!leaveLimit) {
                    leaveLimit = await LeaveLimit.create({
                        employee_code: employee.employee_code,
                        sick_limit: LEAVE_CONFIG.SICK_LIMIT,
                        sick_taken: 0,
                        casual_limit: LEAVE_CONFIG.CASUAL_LIMIT,
                        casual_taken: 0,
                        paid_limit: LEAVE_CONFIG.PAID_LIMIT,
                        paid_taken: 0
                    });
                    updatedCount++;
                    console.log(`✅ Created default limits for ${employee.employee_code}`);
                    continue;
                }

                // ============================================
                // ✅ JANUARY - ANNUAL RESET (All limits reset)
                // ============================================
                if (isJanuary) {
                    leaveLimit.sick_limit = LEAVE_CONFIG.SICK_LIMIT;
                    leaveLimit.sick_taken = 0;
                    
                    leaveLimit.casual_limit = LEAVE_CONFIG.CASUAL_LIMIT;
                    leaveLimit.casual_taken = 0;
                    
                    leaveLimit.paid_limit = LEAVE_CONFIG.PAID_LIMIT;
                    leaveLimit.paid_taken = 0;
                    
                    console.log(`✅ ANNUAL RESET for ${employee.employee_code}: Sick=12, Casual=1, Paid=10`);
                } 
                // ============================================
                // ✅ OTHER MONTHS - Monthly Reset (Only Casual)
                // ============================================
                else {
                    // ✅ Casual Leave: Reset to 1 every month
                    leaveLimit.casual_limit = LEAVE_CONFIG.CASUAL_LIMIT;
                    leaveLimit.casual_taken = 0;
                    
                    // ✅ Sick & Paid: No change (Annual reset only)
                    // Keep existing values
                    
                    console.log(`✅ MONTHLY RESET for ${employee.employee_code}: Casual=1 (new month)`);
                }

                await leaveLimit.save();
                updatedCount++;

            } catch (err) {
                errorCount++;
                errors.push({
                    employee_code: employee.employee_code,
                    error: err.message
                });
                console.error(`❌ Error updating ${employee.employee_code}:`, err.message);
            }
        }

        // ✅ Send notification
        await sendResetNotification(employees.length, updatedCount, errorCount, errors, isJanuary, monthName, currentYear);

        console.log(`✅ Monthly reset completed!`);
        console.log(`📊 Updated: ${updatedCount} employees`);
        console.log(`❌ Errors: ${errorCount} employees`);

        return {
            success: true,
            updatedCount,
            errorCount,
            errors,
            isJanuary,
            month: monthName,
            year: currentYear
        };

    } catch (error) {
        console.error('❌ Monthly reset failed:', error);
        await sendResetFailureNotification(error);
        return {
            success: false,
            error: error.message
        };
    }
};

// ============================================
// SEND NOTIFICATION EMAIL
// ============================================
const sendResetNotification = async (totalEmployees, updatedCount, errorCount, errors, isJanuary, monthName, year) => {
    try {
        const admins = await Employee.findAll({
            where: { role: ['HR', 'Admin'] },
            attributes: ['email', 'first_name', 'last_name']
        });

        if (admins.length === 0) {
            console.log('⚠️ No HR/Admin found to send notification');
            return;
        }

        const resetType = isJanuary ? 'ANNUAL' : 'MONTHLY';
        const subject = `📊 ${resetType} Leave Limit Reset Report - ${monthName} ${year}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; background-color: #f8fafc; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
                    .header h1 { color: #1e1b4b; font-size: 24px; }
                    .badge { display: inline-block; padding: 8px 24px; border-radius: 50px; color: white; font-weight: bold; background: #4f46e5; }
                    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
                    .stat-card { background: #f8fafc; padding: 16px; border-radius: 12px; text-align: center; }
                    .stat-number { font-size: 28px; font-weight: 800; color: #1e1b4b; }
                    .stat-label { font-size: 12px; color: #64748b; }
                    .reset-details { background: #f8fafc; padding: 16px; border-radius: 12px; margin: 16px 0; }
                    .reset-details ul { list-style: none; padding: 0; }
                    .reset-details li { padding: 4px 0; }
                    .footer { text-align: center; padding-top: 20px; border-top: 2px solid #e2e8f0; color: #94a3b8; font-size: 14px; }
                    .success { color: #10b981; }
                    .error { color: #ef4444; }
                    .info { color: #3b82f6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🌐 HR Dashboard</h1>
                        <h2>${resetType} Leave Limit Reset Report</h2>
                        <div class="badge">${monthName} ${year}</div>
                    </div>
                    <div class="stats">
                        <div class="stat-card">
                            <div class="stat-number">${totalEmployees}</div>
                            <div class="stat-label">Total Employees</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number success">${updatedCount}</div>
                            <div class="stat-label">✅ Updated</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number error">${errorCount}</div>
                            <div class="stat-label">❌ Errors</div>
                        </div>
                    </div>
                    <div class="reset-details">
                        <h3>📋 Reset Details:</h3>
                        <ul>
                            <li>🔄 <b>Reset Type:</b> ${resetType}</li>
                            <li>📅 <b>Month:</b> ${monthName} ${year}</li>
                            <li>✅ <b>Sick Leave:</b> ${isJanuary ? 'Reset to 12 days' : 'No change (Annual reset in January)'}</li>
                            <li>✅ <b>Casual Leave:</b> Reset to 1 day (Monthly reset)</li>
                            <li>✅ <b>Paid Leave:</b> ${isJanuary ? 'Reset to 10 days' : 'No change (Annual reset in January)'}</li>
                        </ul>
                    </div>
                    ${errors.length > 0 ? `
                    <div style="background: #fee2e2; padding: 16px; border-radius: 12px; margin: 16px 0;">
                        <h3 style="color: #b91c1c;">❌ Errors Encountered:</h3>
                        <ul>
                            ${errors.map(err => `<li>${err.employee_code}: ${err.error}</li>`).join('')}
                        </ul>
                    </div>
                    ` : `
                    <div style="background: #dcfce7; padding: 16px; border-radius: 12px; margin: 16px 0;">
                        <p style="color: #15803d; margin: 0;">✅ All employees updated successfully!</p>
                    </div>
                    `}
                    <div class="footer">
                        <p>This is an automated message from HR Dashboard.</p>
                        <p>© ${new Date().getFullYear()} HR Dashboard. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        for (const admin of admins) {
            try {
                await sendEmail(admin.email, subject, html);
                console.log(`✅ Notification sent to ${admin.email}`);
            } catch (err) {
                console.error(`❌ Failed to send email to ${admin.email}:`, err.message);
            }
        }

    } catch (error) {
        console.error('❌ Failed to send reset notification:', error);
    }
};

// ============================================
// SEND FAILURE NOTIFICATION
// ============================================
const sendResetFailureNotification = async (error) => {
    try {
        const admins = await Employee.findAll({
            where: { role: ['HR', 'Admin'] },
            attributes: ['email', 'first_name', 'last_name']
        });

        if (admins.length === 0) return;

        const subject = `❌ Monthly Leave Reset FAILED - ${new Date().toLocaleDateString()}`;
        const html = `
            <h2>❌ Monthly Leave Reset Failed</h2>
            <p>The monthly leave reset job failed with the following error:</p>
            <pre style="background: #f1f5f9; padding: 16px; border-radius: 8px;">${error.message}</pre>
            <p>Please check the server logs and investigate the issue.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
        `;

        for (const admin of admins) {
            await sendEmail(admin.email, subject, html);
        }
    } catch (err) {
        console.error('Failed to send failure notification:', err);
    }
};

// ============================================
// START CRON JOB
// ============================================
const startMonthlyResetJob = () => {
    // ✅ Run at 00:00 on the 1st of every month
    cron.schedule('0 0 1 * *', async () => {
        console.log('⏰ Cron job triggered: Monthly leave limit reset');
        console.log(`📅 Date: ${new Date().toISOString()}`);
        await resetLeaveLimits();
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('✅ Monthly leave reset cron job scheduled successfully!');
    console.log('📅 Will run at 00:00 on the 1st of every month');
    console.log('📋 Reset Rules:');
    console.log('   - Sick Leave: 12 days (Annual reset in January)');
    console.log('   - Casual Leave: 1 day (Monthly reset every month)');
    console.log('   - Paid Leave: 10 days (Annual reset in January)');
};

// ============================================
// MANUAL RESET (For Testing)
// ============================================
const manualReset = async () => {
    console.log('🔧 Manual reset triggered...');
    return await resetLeaveLimits();
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
    startMonthlyResetJob,
    resetLeaveLimits,
    manualReset
};