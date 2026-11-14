const { authenticateSession, InvalidSessionError } = require('../utils/sessionAuth');

async function protect(req, res, next) {
    if (req.user && req.session) return next();
    try {
        const token = /^Bearer (\S+)$/i.exec(req.get('authorization') || '')?.[1];
        const { user, session, expiresAt } = await authenticateSession(token);
        req.user = user;
        req.session = session;
        req.sessionExpiresAt = expiresAt;
        next();
    } catch (error) {
        if (!(error instanceof InvalidSessionError)) return next(error);
        res.status(401).json({ success: false, error: 'Invalid or expired session. Please sign in.' });
    }
}

function authorizeAdmin(req, res, next) {
    if (['Admin', 'HR'].includes(req.user?.role)) return next();
    res.status(403).json({ success: false, error: 'Admin/HR access required' });
}

module.exports = { protect, authorizeAdmin, checkSession: protect };
