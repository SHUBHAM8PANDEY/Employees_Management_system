const db = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = db.User;
const Employee = db.Employee;
const UserSession = db.UserSession;
const LoginHistory = db.LoginHistory;
const { Op } = require('sequelize');
const notificationHelper = require('../utils/notificationHelper');
const auditLogger = require('../utils/auditLogger');
const { checkLoginAttempts, resetLoginAttempts } = require('../utils/securityUtils');

const { randomUUID } = require('node:crypto');
const { JWT_SECRET, SESSION_SECONDS } = require('../utils/sessionAuth');

// ============================================
// LOGIN
// ============================================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Email and password required!' 
            });
        }

        // Rate limiting
        const attemptCheck = checkLoginAttempts(email);
        if (!attemptCheck.allowed) {
            return res.status(429).json({
                success: false,
                error: 'Too many login attempts! Please try again after 15 minutes.'
            });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            await LoginHistory.create({
                employee_code: 'UNKNOWN',
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'],
                status: 'Failed',
                failure_reason: 'Invalid email'
            });
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials!' 
            });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            await LoginHistory.create({
                employee_code: user.employee_code,
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'],
                status: 'Failed',
                failure_reason: 'Invalid password'
            });
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials!' 
            });
        }

        resetLoginAttempts(email);

        // Check existing session
        const existingSession = await UserSession.findOne({
            where: {
                employee_code: user.employee_code,
                is_active: true
            }
        });

        if (existingSession) {
            existingSession.is_active = false;
            existingSession.logout_time = new Date();
            await existingSession.save();
            
            await LoginHistory.create({
                employee_code: user.employee_code,
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'],
                status: 'Force Logout',
                failure_reason: 'New login from different location'
            });

            await notificationHelper.create({
                employee_code: user.employee_code,
                type: 'SECURITY_ALERT',
                title: '🔐 New Login Detected',
                message: `You have logged in from new device. Previous session was terminated.`,
                link: '/profile',
                icon: '🔐',
                color: 'red'
            });
        }

        const token = jwt.sign(
            { 
                employee_code: user.employee_code, 
                email: user.email, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: SESSION_SECONDS, jwtid: randomUUID() }
        );

        await UserSession.create({
            employee_code: user.employee_code,
            token: token,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            login_time: new Date(),
            last_activity: new Date(),
            is_active: true
        });

        await LoginHistory.create({
            employee_code: user.employee_code,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            status: 'Success'
        });

        const employee = await Employee.findOne({
            where: { employee_code: user.employee_code },
            attributes: ['employee_code', 'first_name', 'last_name', 'email', 'profile_picture']
        });

        await notificationHelper.create({
            employee_code: user.employee_code,
            type: 'LOGIN_SUCCESS',
            title: '✅ Login Successful',
            message: `You have logged in at ${new Date().toLocaleString()} from IP: ${req.ip || 'Unknown'}`,
            link: '/dashboard',
            icon: '✅',
            color: 'green'
        });

        await auditLogger.log({
            employee_code: user.employee_code,
            action: 'LOGIN',
            entity_type: 'User',
            entity_id: user.employee_code,
            new_data: { email: user.email, role: user.role, ip: req.ip },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        res.json({
            success: true,
            message: '✅ Login successful!',
            token,
            user: {
                employee_code: user.employee_code,
                first_name: employee?.first_name || '',
                last_name: employee?.last_name || '',
                email: user.email,
                role: user.role,
                profile_picture: employee?.profile_picture || null
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// ============================================
// VERIFY TOKEN
// ============================================
const verifyToken = (req, res) => {
    res.json({ valid: true, user: req.user, expiresAt: req.sessionExpiresAt });
};

// ============================================
// LOGOUT
// ============================================
const logout = async (req, res) => {
    try {
        const employee_code = req.user?.employee_code;
        const token = req.headers.authorization?.split(' ')[1];

        if (employee_code && token) {
            await UserSession.update(
                {
                    is_active: false,
                    logout_time: new Date()
                },
                {
                    where: {
                        employee_code: employee_code,
                        token: token
                    }
                }
            );

            await LoginHistory.create({
                employee_code: employee_code,
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'],
                status: 'Logout',
                login_time: new Date()
            });
        }

        res.json({
            success: true,
            message: '✅ Logout successful!'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// ============================================
// GET PROFILE
// ============================================
const getProfile = async (req, res) => {
    try {
        const employeeCode = req.user?.employee_code;
        if (!employeeCode) {
            return res.status(401).json({ error: 'Unauthorized!' });
        }

        const user = await User.findOne({
            where: { employee_code: employeeCode }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found!' });
        }

        const employee = await Employee.findOne({
            where: { employee_code: employeeCode },
            attributes: ['employee_code', 'first_name', 'last_name', 'email', 'profile_picture']
        });

        const activeSessions = await UserSession.findAll({
            where: {
                employee_code: employeeCode,
                is_active: true
            },
            attributes: ['id', 'ip_address', 'user_agent', 'login_time', 'last_activity']
        });

        const loginHistory = await LoginHistory.findAll({
            where: {
                employee_code: employeeCode
            },
            order: [['login_time', 'DESC']],
            limit: 10
        });

        res.json({
            employee_code: user.employee_code,
            first_name: employee?.first_name || '',
            last_name: employee?.last_name || '',
            email: user.email,
            role: user.role,
            profile_picture: employee?.profile_picture || null,
            activeSessions: activeSessions,
            loginHistory: loginHistory
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// UPDATE PROFILE
// ============================================
const updateProfile = async (req, res) => {
    try {
        const employeeCode = req.user?.employee_code;
        const { first_name, last_name, email, password } = req.body;

        const user = await User.findOne({
            where: { employee_code: employeeCode }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found!' });
        }

        if (email) user.email = email;
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }
        await user.save();

        const employee = await Employee.findOne({
            where: { employee_code: employeeCode }
        });

        if (employee) {
            if (first_name) employee.first_name = first_name;
            if (last_name) employee.last_name = last_name;
            if (email) employee.email = email;
            await employee.save();
        }

        res.json({
            message: '✅ Profile updated!',
            user: {
                employee_code: user.employee_code,
                first_name: employee?.first_name || '',
                last_name: employee?.last_name || '',
                email: user.email,
                role: user.role,
                profile_picture: employee?.profile_picture || null
            }
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// FORCE LOGOUT - Admin
// ============================================
const forceLogout = async (req, res) => {
    try {
        const { employee_code } = req.params;
        const adminCode = req.user?.employee_code;

        if (req.user?.role !== 'Admin' && req.user?.role !== 'HR') {
            return res.status(403).json({ 
                success: false,
                error: 'Unauthorized! Only Admin/HR can force logout.' 
            });
        }

        await UserSession.update(
            {
                is_active: false,
                logout_time: new Date()
            },
            {
                where: {
                    employee_code: employee_code,
                    is_active: true
                }
            }
        );

        await LoginHistory.create({
            employee_code: employee_code,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            status: 'Force Logout',
            failure_reason: `Force logout by ${adminCode}`
        });

        await notificationHelper.create({
            employee_code: employee_code,
            type: 'FORCE_LOGOUT',
            title: '🔐 Force Logout',
            message: `Your session has been terminated by ${adminCode}. Please login again.`,
            link: '/',
            icon: '🔐',
            color: 'red'
        });

        res.json({
            success: true,
            message: `✅ Force logout successful for ${employee_code}`
        });

    } catch (error) {
        console.error('Force logout error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// ============================================
// GET ACTIVE SESSIONS - Admin
// ============================================
const getActiveSessions = async (req, res) => {
    try {
        if (req.user?.role !== 'Admin' && req.user?.role !== 'HR') {
            return res.status(403).json({ 
                success: false,
                error: 'Unauthorized!' 
            });
        }

        const sessions = await UserSession.findAll({
            attributes: { exclude: ['token'] },
            where: { is_active: true, login_time: { [Op.gt]: new Date(Date.now() - SESSION_SECONDS * 1000) } },
            include: [{
                model: User,
                as: 'user',
                attributes: ['email', 'role']
            }],
            order: [['login_time', 'DESC']]
        });

        res.json({
            success: true,
            data: sessions
        });

    } catch (error) {
        console.error('Get active sessions error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// ============================================
// GET LOGIN HISTORY - Admin
// ============================================
const getLoginHistory = async (req, res) => {
    try {
        if (req.user?.role !== 'Admin' && req.user?.role !== 'HR') {
            return res.status(403).json({ 
                success: false,
                error: 'Unauthorized!' 
            });
        }

        const { employee_code, limit = 50 } = req.query;

        let where = {};
        if (employee_code) {
            where.employee_code = employee_code;
        }

        const history = await LoginHistory.findAll({
            where,
            order: [['login_time', 'DESC']],
            limit: parseInt(limit),
            include: [{
                model: User,
                as: 'user',
                attributes: ['email', 'role']
            }]
        });

        res.json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error('Get login history error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// ============================================
// UPDATE AVATAR
// ============================================
const updateAvatar = async (req, res) => {
    try {
        const employeeCode = req.user?.employee_code;
        const { profile_picture } = req.body;

        if (!profile_picture) {
            return res.status(400).json({ error: 'Profile picture is required!' });
        }

        if (profile_picture.length > 3 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image is too large. Max 2MB allowed.' });
        }

        const employee = await Employee.findOne({
            where: { employee_code: employeeCode }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found!' });
        }

        employee.profile_picture = profile_picture;
        await employee.save();

        res.json({
            message: 'Profile picture updated!',
            profile_picture: employee.profile_picture
        });
    } catch (error) {
        console.error('Update avatar error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    login,
    logout,
    verifyToken,
    getProfile,
    updateProfile,
    updateAvatar,
    forceLogout,
    getActiveSessions,
    getLoginHistory
};