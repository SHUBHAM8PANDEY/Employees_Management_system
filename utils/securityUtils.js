const bcrypt = require('bcryptjs');

// ============================================
// PASSWORD VALIDATION
// ============================================
const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!hasUpperCase) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!hasLowerCase) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!hasNumber) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    if (!hasSpecialChar) {
        return { valid: false, message: 'Password must contain at least one special character' };
    }

    return { valid: true, message: 'Password is strong' };
};

// ============================================
// RATE LIMITING (Login Attempts)
// ============================================
const loginAttempts = new Map();

const checkLoginAttempts = (email) => {
    const key = email.toLowerCase();
    const attempts = loginAttempts.get(key) || { count: 0, lastAttempt: Date.now() };
    
    if (Date.now() - attempts.lastAttempt > 15 * 60 * 1000) {
        loginAttempts.set(key, { count: 1, lastAttempt: Date.now() });
        return { allowed: true, remaining: 4 };
    }

    if (attempts.count >= 5) {
        return { allowed: false, remaining: 0 };
    }

    attempts.count++;
    attempts.lastAttempt = Date.now();
    loginAttempts.set(key, attempts);
    return { allowed: true, remaining: 5 - attempts.count };
};

const resetLoginAttempts = (email) => {
    loginAttempts.delete(email.toLowerCase());
};

// ============================================
// SESSION CLEANUP
// ============================================
const cleanupExpiredSessions = async () => {
    try {
        const db = require('../models');
        const UserSession = db.UserSession;
        const { Op } = require('sequelize');

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        await UserSession.update(
            { is_active: false, logout_time: new Date() },
            { where: { is_active: true, login_time: { [Op.lte]: new Date(Date.now() - 86400000) } } }
        );

        await UserSession.destroy({
            where: {
                last_activity: {
                    [Op.lt]: thirtyDaysAgo
                }
            }
        });

        console.log('Expired sessions cleaned up');
    } catch (error) {
        console.error('Session cleanup error:', error);
    }
};

module.exports = {
    validatePassword,
    checkLoginAttempts,
    resetLoginAttempts,
    cleanupExpiredSessions
};
