const db = require('../models');
const LeaveLimit = db.LeaveLimit;

const getBalanceKeyFromLeaveType = (leaveType) => {
    if (!leaveType) return 'sick';
    const type = leaveType.toLowerCase();
    if (type.includes('sick')) return 'sick';
    if (type.includes('casual')) return 'casual';
    if (type.includes('paid')) return 'paid';
    return 'sick';
};

const getLeaveBalanceForEmployee = async (employeeCode) => {
    try {
        if (!employeeCode) {
            return {
                sick: { total: 12, taken: 0, left: 12 },
                casual: { total: 15, taken: 0, left: 15 },
                paid: { total: 10, taken: 0, left: 10 }
            };
        }

        const leaveLimit = await LeaveLimit.findOne({
            where: { employee_code: employeeCode }
        });

        if (!leaveLimit) {
            // ✅ CREATE DEFAULT LEAVE LIMITS IF NOT EXISTS
            try {
                await LeaveLimit.create({
                    employee_code: employeeCode,
                    sick_limit: 12,
                    sick_taken: 0,
                    casual_limit: 15,
                    casual_taken: 0,
                    paid_limit: 10,
                    paid_taken: 0
                });
                console.log(`✅ Default leave limits created for ${employeeCode}`);
            } catch (createError) {
                console.error('❌ Error creating default leave limits:', createError);
            }

            return {
                sick: { total: 12, taken: 0, left: 12 },
                casual: { total: 15, taken: 0, left: 15 },
                paid: { total: 10, taken: 0, left: 10 }
            };
        }

        // ✅ SAFE ACCESS WITH DEFAULT VALUES
        const sickTaken = leaveLimit.sick_taken || 0;
        const casualTaken = leaveLimit.casual_taken || 0;
        const paidTaken = leaveLimit.paid_taken || 0;
        const sickLimit = leaveLimit.sick_limit || 12;
        const casualLimit = leaveLimit.casual_limit || 15;
        const paidLimit = leaveLimit.paid_limit || 10;

        return {
            sick: {
                total: sickLimit,
                taken: sickTaken,
                left: sickLimit - sickTaken
            },
            casual: {
                total: casualLimit,
                taken: casualTaken,
                left: casualLimit - casualTaken
            },
            paid: {
                total: paidLimit,
                taken: paidTaken,
                left: paidLimit - paidTaken
            }
        };
    } catch (error) {
        console.error('❌ Error getting leave balance:', error);
        // ✅ RETURN DEFAULT ON ERROR
        return {
            sick: { total: 12, taken: 0, left: 12 },
            casual: { total: 15, taken: 0, left: 15 },
            paid: { total: 10, taken: 0, left: 10 }
        };
    }
};

const updateLeaveBalance = async (employeeCode, leaveType, days, isApproved) => {
    try {
        let leaveLimit = await LeaveLimit.findOne({
            where: { employee_code: employeeCode }
        });

        if (!leaveLimit) {
            // ✅ CREATE IF NOT EXISTS
            leaveLimit = await LeaveLimit.create({
                employee_code: employeeCode,
                sick_limit: 12,
                sick_taken: 0,
                casual_limit: 15,
                casual_taken: 0,
                paid_limit: 10,
                paid_taken: 0
            });
        }

        const balanceKey = getBalanceKeyFromLeaveType(leaveType);
        const daysToAdd = isApproved ? days : -days;

        if (balanceKey === 'sick') {
            leaveLimit.sick_taken = Math.max(0, (leaveLimit.sick_taken || 0) + daysToAdd);
        } else if (balanceKey === 'casual') {
            leaveLimit.casual_taken = Math.max(0, (leaveLimit.casual_taken || 0) + daysToAdd);
        } else if (balanceKey === 'paid') {
            leaveLimit.paid_taken = Math.max(0, (leaveLimit.paid_taken || 0) + daysToAdd);
        }

        await leaveLimit.save();
        return true;
    } catch (error) {
        console.error('❌ Error updating leave balance:', error);
        throw error;
    }
};

module.exports = {
    getBalanceKeyFromLeaveType,
    getLeaveBalanceForEmployee,
    updateLeaveBalance
};