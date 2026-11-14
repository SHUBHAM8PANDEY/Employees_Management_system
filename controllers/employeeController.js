const db = require('../models');
const Employee = db.Employee;
const LeaveLimit = db.LeaveLimit;
const LeaveRequest = db.LeaveRequest;
const User = db.User;
const EmployeeAddress = db.EmployeeAddress;
const EmployeeQualification = db.EmployeeQualification;
const EmployeeSkill = db.EmployeeSkill;
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const validator = require('sequelize').Validator;
const { generateEmployeeCode, isEmployeeCodeUnique } = require('../utils/generateEmployeeCode');
const auditLogger = require('../utils/auditLogger');
const notificationHelper = require('../utils/notificationHelper');

function employeeContact(body) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (body.email !== undefined && (!email || email.length > 255 || !validator.isEmail(email))) {
        return { error: 'Enter a valid email address.' };
    }
    const mobile = body.mobile_number;
    const normalized = typeof mobile === 'string' ? mobile.trim().replace(/[ ()-]/g, '') : '';
    if (mobile != null && mobile !== '' && !/^\+?[0-9]{10,15}$/.test(normalized)) {
        return { error: 'Enter a mobile number with 10–15 digits, optionally starting with +.' };
    }
    return { email, mobile_number: mobile === undefined ? undefined : normalized || null };
}

function employeeDateFields(body, required = false) {
    const fields = {};
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(new Date());
    for (const name of ['date_of_birth', 'joining_date']) {
        const value = body[name];
        if (value === undefined && !required) continue;
        const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value) : null;
        if (!date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value ||
            value < '1900-01-01' || (name === 'date_of_birth' && value > today)) return null;
        fields[name] = value;
    }
    return fields;
}

// ============================================
// ADD EMPLOYEE
// ============================================
const addEmployee = async (req, res) => {
    try {
        const { 
            first_name, 
            last_name, 
            employee_code,
            password = '123456',
            role = 'Employee',
            addresses = [],
            qualifications = [],
            skills = []
        } = req.body;

        const { email, mobile_number, error: contactError } = employeeContact(req.body);
        if (contactError) return res.status(400).json({ error: contactError });
        const dates = employeeDateFields(req.body, true);
        if (!dates || dates.date_of_birth > dates.joining_date) {
            return res.status(400).json({ error: 'Enter a valid date of birth and joining date.' });
        }

        console.log('📝 Adding employee:', { first_name, last_name, email });

        if (!first_name || !last_name || !email) {
            return res.status(400).json({ 
                error: 'First name, last name and email are required!' 
            });
        }

        // Generate unique employee code
        let empCode = employee_code;
        if (!empCode) {
            empCode = await generateEmployeeCode();
        } else {
            const isUnique = await isEmployeeCodeUnique(empCode);
            if (!isUnique) {
                return res.status(400).json({
                    error: `Employee code ${empCode} already exists! Please use a different code.`
                });
            }
        }

        // Check if email already exists
        const existingEmployee = await Employee.findOne({
            where: db.Sequelize.where(db.Sequelize.fn('lower', db.Sequelize.col('email')), email)
        });

        if (existingEmployee) {
            return res.status(400).json({ 
                error: 'Employee with this email already exists!' 
            });
        }

        // Create user
        let user = await User.findOne({
            where: { employee_code: empCode }
        });

        if (!user) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user = await User.create({
                employee_code: empCode,
                email: email,
                password: hashedPassword,
                role: role
            });
            console.log(`✅ User created for ${empCode}`);
        }

        // Create employee
        const newEmployee = await Employee.create({
            employee_code: empCode,
            first_name,
            last_name,
            email,
            mobile_number,
            ...dates
        });
        console.log(`✅ Employee created for ${empCode}`);

        // Create addresses
        if (addresses && addresses.length > 0) {
            for (const addr of addresses) {
                if (addr.address_line || addr.city) {
                    await EmployeeAddress.create({
                        employee_code: empCode,
                        address_line: addr.address_line || '',
                        city: addr.city || ''
                    });
                }
            }
        }

        // Create qualifications
        if (qualifications && qualifications.length > 0) {
            for (const qual of qualifications) {
                if (qual.degree || qual.institution) {
                    await EmployeeQualification.create({
                        employee_code: empCode,
                        degree: qual.degree || '',
                        institution: qual.institution || ''
                    });
                }
            }
        }

        // Create skills
        if (skills && skills.length > 0) {
            for (const skill of skills) {
                if (skill.skill_name) {
                    await EmployeeSkill.create({
                        employee_code: empCode,
                        skill_name: skill.skill_name
                    });
                }
            }
        }

        // Create leave limits
        await LeaveLimit.create({
            employee_code: empCode,
            sick_limit: 12,
            sick_taken: 0,
            casual_limit: 15,
            casual_taken: 0,
            paid_limit: 10,
            paid_taken: 0
        });

        // ✅ Audit Log
        await auditLogger.log({
            employee_code: req.user?.employee_code || 'SYSTEM',
            action: 'CREATE',
            entity_type: 'Employee',
            entity_id: empCode,
            new_data: { first_name, last_name, email, role },
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent']
        });

        // Notification to admins
        try {
            const admins = await User.findAll({
                where: { role: ['Admin', 'HR'] },
                attributes: ['employee_code']
            });

            for (const admin of admins) {
                await notificationHelper.create({
                    employee_code: admin.employee_code,
                    type: 'EMPLOYEE_ADDED',
                    title: '👤 New Employee Added',
                    message: `${first_name} ${last_name} has been added to the system (${empCode})`,
                    link: '/dashboard?tab=employees',
                    icon: '👤',
                    color: 'purple'
                });
            }
        } catch (notifError) {
            console.error('❌ Notification error:', notifError);
        }

        const createdEmployee = await Employee.findOne({
            where: { employee_code: empCode },
            include: [
                { model: EmployeeAddress, as: 'EmployeeAddresses' },
                { model: EmployeeQualification, as: 'EmployeeQualifications' },
                { model: EmployeeSkill, as: 'EmployeeSkills' }
            ]
        });

        res.status(201).json({
            message: '✅ Employee added successfully!',
            employee: createdEmployee
        });

    } catch (error) {
        console.error('❌ Add employee error:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                error: 'Employee code or email already exists! Please use unique values.'
            });
        }
        
        res.status(500).json({ 
            error: error.message || 'Failed to add employee' 
        });
    }
};

// ============================================
// GET ALL EMPLOYEES
// ============================================
const getAllEmployees = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            sortBy = 'employee_code',
            sortOrder = 'ASC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereCondition = {};
        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            const searchWords = searchTerm.split(' ').filter(word => word.length > 0);
            
            const orConditions = [];
            
            searchWords.forEach(word => {
                orConditions.push(
                    { first_name: { [Op.iLike]: `%${word}%` } },
                    { last_name: { [Op.iLike]: `%${word}%` } },
                    { email: { [Op.iLike]: `%${word}%` } },
                    { employee_code: { [Op.iLike]: `%${word}%` } }
                );
            });
            
            orConditions.push(
                { first_name: { [Op.iLike]: `%${searchTerm}%` } },
                { last_name: { [Op.iLike]: `%${searchTerm}%` } },
                { email: { [Op.iLike]: `%${searchTerm}%` } },
                { employee_code: { [Op.iLike]: `%${searchTerm}%` } }
            );
            
            whereCondition = {
                [Op.or]: orConditions
            };
        }

        const totalCount = await Employee.count({
            where: whereCondition
        });

        const employees = await Employee.findAll({
            where: whereCondition,
            include: [
                { model: EmployeeAddress, as: 'EmployeeAddresses' },
                { model: EmployeeQualification, as: 'EmployeeQualifications' },
                { model: EmployeeSkill, as: 'EmployeeSkills' }
            ],
            order: [[sortBy || 'employee_code', sortOrder || 'ASC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const result = await Promise.all(
            employees.map(async (emp) => {
                const leaveLimit = await LeaveLimit.findOne({
                    where: { employee_code: emp.employee_code }
                });
                
                let leaveBalance = {
                    sick: { total: 12, taken: 0, left: 12 },
                    casual: { total: 15, taken: 0, left: 15 },
                    paid: { total: 10, taken: 0, left: 10 }
                };

                if (leaveLimit) {
                    leaveBalance = {
                        sick: {
                            total: leaveLimit.sick_limit || 12,
                            taken: leaveLimit.sick_taken || 0,
                            left: (leaveLimit.sick_limit || 12) - (leaveLimit.sick_taken || 0)
                        },
                        casual: {
                            total: leaveLimit.casual_limit || 15,
                            taken: leaveLimit.casual_taken || 0,
                            left: (leaveLimit.casual_limit || 15) - (leaveLimit.casual_taken || 0)
                        },
                        paid: {
                            total: leaveLimit.paid_limit || 10,
                            taken: leaveLimit.paid_taken || 0,
                            left: (leaveLimit.paid_limit || 10) - (leaveLimit.paid_taken || 0)
                        }
                    };
                }

                return {
                    ...emp.toJSON(),
                    leaveBalance
                };
            })
        );

        res.json({
            success: true,
            data: result,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                hasNext: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
                hasPrev: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error('❌ Get employees error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// GET EMPLOYEE BY CODE
// ============================================
const getEmployeeByCode = async (req, res) => {
    try {
        const { code } = req.params;
        
        const employee = await Employee.findOne({
            where: { employee_code: code },
            include: [
                { model: EmployeeAddress, as: 'EmployeeAddresses' },
                { model: EmployeeQualification, as: 'EmployeeQualifications' },
                { model: EmployeeSkill, as: 'EmployeeSkills' }
            ]
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const leaveLimit = await LeaveLimit.findOne({
            where: { employee_code: code }
        });

        let leaveBalance = {
            sick: { total: 12, taken: 0, left: 12 },
            casual: { total: 15, taken: 0, left: 15 },
            paid: { total: 10, taken: 0, left: 10 }
        };

        if (leaveLimit) {
            leaveBalance = {
                sick: {
                    total: leaveLimit.sick_limit || 12,
                    taken: leaveLimit.sick_taken || 0,
                    left: (leaveLimit.sick_limit || 12) - (leaveLimit.sick_taken || 0)
                },
                casual: {
                    total: leaveLimit.casual_limit || 15,
                    taken: leaveLimit.casual_taken || 0,
                    left: (leaveLimit.casual_limit || 15) - (leaveLimit.casual_taken || 0)
                },
                paid: {
                    total: leaveLimit.paid_limit || 10,
                    taken: leaveLimit.paid_taken || 0,
                    left: (leaveLimit.paid_limit || 10) - (leaveLimit.paid_taken || 0)
                }
            };
        }

        res.json({
            ...employee.toJSON(),
            leaveBalance
        });
    } catch (error) {
        console.error('❌ Get employee error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// GET MY PROFILE
// ============================================
const getMyProfile = async (req, res) => {
    try {
        const employeeCode = req.user?.employee_code;

        if (!employeeCode) {
            return res.status(401).json({ error: 'Unauthorized!' });
        }

        const employee = await Employee.findOne({
            where: { employee_code: employeeCode },
            include: [
                { model: EmployeeAddress, as: 'EmployeeAddresses' },
                { model: EmployeeQualification, as: 'EmployeeQualifications' },
                { model: EmployeeSkill, as: 'EmployeeSkills' }
            ]
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found!' });
        }

        const leaveLimit = await LeaveLimit.findOne({
            where: { employee_code: employeeCode }
        });

        let leaveBalance = null;
        if (leaveLimit) {
            leaveBalance = {
                sick: {
                    total: leaveLimit.sick_limit || 12,
                    taken: leaveLimit.sick_taken || 0,
                    left: (leaveLimit.sick_limit || 12) - (leaveLimit.sick_taken || 0)
                },
                casual: {
                    total: leaveLimit.casual_limit || 15,
                    taken: leaveLimit.casual_taken || 0,
                    left: (leaveLimit.casual_limit || 15) - (leaveLimit.casual_taken || 0)
                },
                paid: {
                    total: leaveLimit.paid_limit || 10,
                    taken: leaveLimit.paid_taken || 0,
                    left: (leaveLimit.paid_limit || 10) - (leaveLimit.paid_taken || 0)
                }
            };
        }

        const user = await User.findOne({
            where: { employee_code: employeeCode }
        });

        res.json({
            employee_code: employee.employee_code,
            first_name: employee.first_name,
            last_name: employee.last_name,
            email: employee.email,
            mobile_number: employee.mobile_number,
            date_of_birth: employee.date_of_birth,
            joining_date: employee.joining_date,
            role: user?.role || 'Employee',
            leaveBalance: leaveBalance,
            EmployeeAddresses: employee.EmployeeAddresses || [],
            EmployeeQualifications: employee.EmployeeQualifications || [],
            EmployeeSkills: employee.EmployeeSkills || []
        });

    } catch (error) {
        console.error('❌ Get my profile error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// UPDATE EMPLOYEE
// ============================================
const updateEmployee = async (req, res) => {
    try {
        const { code } = req.params;
        const { 
            first_name, 
            last_name, 
            password,
            addresses,
            qualifications,
            skills
        } = req.body;

        const contact = employeeContact(req.body);
        if (contact.error) return res.status(400).json({ error: contact.error });
        const email = req.body.email === undefined ? undefined : contact.email;
        if (email) {
            const existing = await User.findOne({ where: {
                employee_code: { [Op.ne]: code },
                [Op.and]: db.Sequelize.where(db.Sequelize.fn('lower', db.Sequelize.col('email')), email)
            } });
            if (existing) return res.status(409).json({ error: 'This email address is already in use.' });
        }
        const employee = await Employee.findOne({
            where: { employee_code: code }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const oldData = employee.toJSON();

        const dates = employeeDateFields(req.body);
        if (!dates || (dates.date_of_birth ?? employee.date_of_birth) > (dates.joining_date ?? employee.joining_date)) {
            return res.status(400).json({ error: 'Enter a valid date of birth and joining date.' });
        }
        await employee.update({ first_name, last_name, email, mobile_number: contact.mobile_number, ...dates });

        if (email !== undefined) await User.update(
            { email: email },
            { where: { employee_code: code } }
        );

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await User.update(
                { password: hashedPassword },
                { where: { employee_code: code } }
            );
        }

        // Update addresses
        if (addresses !== undefined) {
            await EmployeeAddress.destroy({ where: { employee_code: code } });
            if (addresses && addresses.length > 0) {
                for (const addr of addresses) {
                    if (addr.address_line || addr.city) {
                        await EmployeeAddress.create({
                            employee_code: code,
                            address_line: addr.address_line || '',
                            city: addr.city || ''
                        });
                    }
                }
            }
        }

        // Update qualifications
        if (qualifications !== undefined) {
            await EmployeeQualification.destroy({ where: { employee_code: code } });
            if (qualifications && qualifications.length > 0) {
                for (const qual of qualifications) {
                    if (qual.degree || qual.institution) {
                        await EmployeeQualification.create({
                            employee_code: code,
                            degree: qual.degree || '',
                            institution: qual.institution || ''
                        });
                    }
                }
            }
        }

        // Update skills
        if (skills !== undefined) {
            await EmployeeSkill.destroy({ where: { employee_code: code } });
            if (skills && skills.length > 0) {
                for (const skill of skills) {
                    if (skill.skill_name) {
                        await EmployeeSkill.create({
                            employee_code: code,
                            skill_name: skill.skill_name
                        });
                    }
                }
            }
        }

        // ✅ Audit Log
        await auditLogger.log({
            employee_code: req.user?.employee_code || 'SYSTEM',
            action: 'UPDATE',
            entity_type: 'Employee',
            entity_id: code,
            old_data: oldData,
            new_data: { first_name, last_name, email },
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent']
        });

        // Notification
        await notificationHelper.create({
            employee_code: code,
            type: 'EMPLOYEE_UPDATED',
            title: '✏️ Profile Updated',
            message: `Your profile has been updated`,
            link: '/dashboard?tab=employees',
            icon: '✏️',
            color: 'yellow'
        });

        const updatedEmployee = await Employee.findOne({
            where: { employee_code: code },
            include: [
                { model: EmployeeAddress, as: 'EmployeeAddresses' },
                { model: EmployeeQualification, as: 'EmployeeQualifications' },
                { model: EmployeeSkill, as: 'EmployeeSkills' }
            ]
        });

        res.json({
            message: '✅ Employee updated successfully!',
            employee: updatedEmployee
        });
    } catch (error) {
        console.error('❌ Update employee error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// DELETE EMPLOYEE
// ============================================
const deleteEmployee = async (req, res) => {
    try {
        const { code } = req.params;

        const employee = await Employee.findOne({
            where: { employee_code: code }
        });

        if (!employee) {
            return res.status(404).json({ 
                success: false,
                error: 'Employee not found!' 
            });
        }

        const oldData = employee.toJSON();

        // Delete in order (child tables first)
        await EmployeeAddress.destroy({ where: { employee_code: code } });
        await EmployeeQualification.destroy({ where: { employee_code: code } });
        await EmployeeSkill.destroy({ where: { employee_code: code } });
        await LeaveLimit.destroy({ where: { employee_code: code } });
        await LeaveRequest.destroy({ where: { employee_code: code } });
        await Employee.destroy({ where: { employee_code: code } });
        await User.destroy({ where: { employee_code: code } });

        // ✅ Audit Log
        await auditLogger.log({
            employee_code: req.user?.employee_code || 'SYSTEM',
            action: 'DELETE',
            entity_type: 'Employee',
            entity_id: code,
            old_data: oldData,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent']
        });

        res.json({ 
            success: true,
            message: '✅ Employee deleted successfully!' 
        });
    } catch (error) {
        console.error('❌ Delete employee error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// ============================================
// UPDATE LEAVE LIMITS
// ============================================
const updateLeaveLimits = async (req, res) => {
    try {
        const { code } = req.params;
        const { sick_limit, casual_limit, paid_limit } = req.body;

        let leaveLimit = await LeaveLimit.findOne({
            where: { employee_code: code }
        });

        if (!leaveLimit) {
            leaveLimit = await LeaveLimit.create({
                employee_code: code,
                sick_limit: sick_limit || 12,
                sick_taken: 0,
                casual_limit: casual_limit || 15,
                casual_taken: 0,
                paid_limit: paid_limit || 10,
                paid_taken: 0
            });
        } else {
            const oldData = leaveLimit.toJSON();
            if (sick_limit !== undefined) leaveLimit.sick_limit = sick_limit;
            if (casual_limit !== undefined) leaveLimit.casual_limit = casual_limit;
            if (paid_limit !== undefined) leaveLimit.paid_limit = paid_limit;
            await leaveLimit.save();

            // ✅ Audit Log
            await auditLogger.log({
                employee_code: req.user?.employee_code || 'SYSTEM',
                action: 'UPDATE',
                entity_type: 'LeaveLimit',
                entity_id: code,
                old_data: oldData,
                new_data: { sick_limit, casual_limit, paid_limit },
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent']
            });
        }

        res.json({
            message: '✅ Leave limits updated successfully!',
            leaveLimit
        });
    } catch (error) {
        console.error('❌ Update leave limits error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    addEmployee,
    getAllEmployees,
    getMyProfile,
    getEmployeeByCode,
    updateEmployee,
    deleteEmployee,
    updateLeaveLimits
};