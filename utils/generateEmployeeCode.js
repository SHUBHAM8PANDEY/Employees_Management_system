const db = require('../models');
const Employee = db.Employee;

const generateEmployeeCode = async () => {
    try {
        // Get all existing employee codes
        const employees = await Employee.findAll({
            attributes: ['employee_code'],
            order: [['employee_code', 'ASC']]
        });

        let maxNumber = 0;

        // Find max number from existing codes
        employees.forEach(emp => {
            const code = emp.employee_code;
            // Extract number from EMP-XXX
            const match = code.match(/^EMP-(\d+)$/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxNumber) maxNumber = num;
            }
        });

        // Generate next number
        let nextNumber = maxNumber + 1;
        let newCode = `EMP-${nextNumber}`;

        // Double check - if code already exists (safety)
        let exists = await Employee.findOne({
            where: { employee_code: newCode }
        });

        // If exists, keep incrementing until unique
        while (exists) {
            nextNumber++;
            newCode = `EMP-${nextNumber}`;
            exists = await Employee.findOne({
                where: { employee_code: newCode }
            });
        }

        console.log(`Generated unique employee code: ${newCode}`);
        return newCode;
    } catch (error) {
        console.error('Error generating employee code:', error);
        // Fallback: use timestamp + random
        return `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
};

// Function to validate if code is unique
const isEmployeeCodeUnique = async (code) => {
    try {
        const employee = await Employee.findOne({
            where: { employee_code: code }
        });
        return !employee; // true if not exists (unique)
    } catch (error) {
        console.error('Error checking employee code:', error);
        return false;
    }
};

module.exports = {
    generateEmployeeCode,
    isEmployeeCodeUnique
};
