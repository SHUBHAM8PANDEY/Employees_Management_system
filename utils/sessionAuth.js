const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, UserSession } = require('../models');

const SESSION_SECONDS = 86400;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
}

class InvalidSessionError extends Error {}

async function authenticateSession(token) {
    if (!token) throw new InvalidSessionError('Authentication required');
    let claims;
    try {
        claims = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
            maxAge: SESSION_SECONDS
        });
    } catch {
        throw new InvalidSessionError('Invalid or expired token');
    }
    if (!claims.employee_code || !Number.isFinite(claims.exp)) {
        throw new InvalidSessionError('Invalid token claims');
    }
    const session = await UserSession.findOne({
        where: {
            employee_code: claims.employee_code,
            token,
            is_active: true,
            login_time: { [Op.gt]: new Date(Date.now() - SESSION_SECONDS * 1000) }
        }
    });
    if (!session) throw new InvalidSessionError('Session expired');
    const user = await User.findByPk(claims.employee_code, {
        attributes: ['employee_code', 'email', 'role']
    });
    if (!user) throw new InvalidSessionError('User not found');
    return {
        user: user.get({ plain: true }),
        session,
        expiresAt: Math.min(claims.exp * 1000, session.login_time.getTime() + SESSION_SECONDS * 1000)
    };
}

module.exports = { authenticateSession, InvalidSessionError, JWT_SECRET, SESSION_SECONDS };
