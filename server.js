require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });

const express = require('express');
const http = require('http');
const cors = require('cors');
const cron = require('node-cron');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);

app.disable('x-powered-by');
const configuredOrigins = process.env.FRONTEND_ORIGINS || (process.env.NODE_ENV === 'production'
    ? ''
    : 'http://localhost:3000,http://127.0.0.1:3000');
const frontendOrigins = configuredOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({ origin: frontendOrigins }));
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

const db = require('./models');
const { cleanupExpiredSessions } = require('./utils/securityUtils');

// ============================================
// DATABASE CONNECTION
// ============================================
// ============================================
// ROUTES
// ============================================
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const auditRoutes = require('./routes/auditRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reportRoutes = require('./routes/reportRoutes');

const { protect, authorizeAdmin } = require('./middlewares/authMiddleware');

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', (req, res, next) => {
    if (req.method === 'POST' && req.path === '/auth/login') return next();
    return protect(req, res, next);
});
app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/email', require('./routes/emailRoutes'));

// ============================================
// CRON JOB TEST ROUTES
// ============================================
app.post('/api/test-cron', authorizeAdmin, async (req, res) => {
    try {
        const { manualReset } = require('./jobs/monthlyLeaveReset');
        const result = await manualReset();
        res.json({ success: true, message: '✅ Cron job tested!', result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/cron-status', authorizeAdmin, async (req, res) => {
    try {
        const LeaveLimit = db.LeaveLimit;
        const Employee = db.Employee;
        const totalEmployees = await Employee.count();
        const sample = await LeaveLimit.findOne({ limit: 1 });
        res.json({
            status: 'active',
            scheduled: '0 0 1 * *',
            timezone: 'Asia/Kolkata',
            nextRun: '1st of every month at 00:00',
            totalEmployees,
            sampleLeaveLimit: sample || 'No data'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/test-punchout', authorizeAdmin, async (req, res) => {
    try {
        const { manualPunchOut } = require('./jobs/autoPunchOut');
        const result = await manualPunchOut();
        res.json({ success: true, message: '✅ Auto Punch Out tested!', result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/test-holiday', authorizeAdmin, async (req, res) => {
    try {
        const { manualHoliday } = require('./jobs/autoHolidayAttendance');
        const result = await manualHoliday();
        res.json({ success: true, message: '✅ Auto Holiday tested!', result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// HOME ROUTE
// ============================================
app.get('/', protect, (req, res) => {
    res.json({
        message: '🚀 HR Dashboard API is running!',
        endpoints: {
            auth: '/api/auth',
            employee: '/api/employee',
            leaves: '/api/leaves',
            audit: '/api/audit',
            notifications: '/api/notifications',
            attendance: '/api/attendance',
            chat: '/api/chat',
            reports: '/api/reports',
            cron: { test: 'POST /api/test-cron', status: 'GET /api/cron-status' },
            punchout: { test: 'POST /api/test-punchout' },
            holiday: { test: 'POST /api/test-holiday' }
        }
    });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START AUTO PUNCH OUT JOB (9:30 PM)
// ============================================


// ============================================
// ✅ AUTO ATTENDANCE REMOVED - Employees do punch in manually
// ============================================
// ❌ Auto Attendance job removed

// ============================================
// START AUTO HOLIDAY JOB (Sunday 12:00 AM)
// ============================================
try {
    const { startAutoHolidayJob } = require('./jobs/autoHolidayAttendance');
    startAutoHolidayJob();
    console.log('✅ Auto Holiday job initialized (Sunday 12:00 AM)');
} catch (error) {
    console.log('⚠️ Auto Holiday job not loaded:', error.message);
}

// ============================================
// START MONTHLY LEAVE RESET JOB (1st of month)
// ============================================
try {
    const { startMonthlyResetJob } = require('./jobs/monthlyLeaveReset');
    startMonthlyResetJob();
    console.log('✅ Monthly leave reset job initialized');
} catch (error) {
    console.log('⚠️ Monthly leave reset job not loaded:', error.message);
}

// ============================================
// SESSION CLEANUP - Daily at 2:00 AM
// ============================================
cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running session cleanup...');
    await cleanupExpiredSessions();
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});
console.log('✅ Session cleanup job scheduled (Daily at 2:00 AM)');

// ============================================
// SOCKET.IO SETUP
// ============================================
const io = new Server(server, {
    maxHttpBufferSize: 6 * 1024 * 1024,
    allowRequest: (req, callback) => callback(null, !req.headers.origin || frontendOrigins.includes(req.headers.origin)),
    cors: {
        origin: frontendOrigins,
        methods: ['GET', 'POST']
    }
});

const { setupSocketIO } = require('./socket/chatHandler');
setupSocketIO(io);
app.set('io', io);

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
db.sequelize.authenticate()
    .then(() => db.sequelize.query(`
        ALTER TABLE public.chat_messages
            ADD COLUMN IF NOT EXISTS attachment_name varchar(255),
            ADD COLUMN IF NOT EXISTS attachment_type varchar(100),
            ADD COLUMN IF NOT EXISTS attachment_data bytea;
        CREATE TABLE IF NOT EXISTS public.chat_files (
            message_id integer PRIMARY KEY REFERENCES public.chat_messages(id) ON DELETE CASCADE,
            content bytea NOT NULL
        );
        ALTER TABLE public.attendances
            ALTER COLUMN punch_in_photo TYPE text,
            ALTER COLUMN punch_out_photo TYPE text;
        ALTER TABLE public.employees
            ADD COLUMN IF NOT EXISTS date_of_birth date,
            ADD COLUMN IF NOT EXISTS joining_date date,
            ADD COLUMN IF NOT EXISTS mobile_number varchar(16);
        CREATE TABLE IF NOT EXISTS public.employee_greetings (
            employee_code varchar(100) REFERENCES public.employees(employee_code) ON DELETE CASCADE ON UPDATE CASCADE,
            kind text NOT NULL,
            greeting_date date NOT NULL,
            PRIMARY KEY (employee_code, kind, greeting_date)
        )
    `))
    .then(() => require('./utils/emailHistory').ensureEmailHistory())
    .then(() => server.listen(PORT, () => {
    require('./jobs/autoPunchOut').startAutoPunchOutJob();
    require('./jobs/employeeGreetings').startEmployeeGreetings();
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`\n🔐 Security Features:`);
    console.log(`   - Token Verification ✅`);
    console.log(`   - Session Timeout (24 hours) ✅`);
    console.log(`   - No Auto Login ✅`);
    console.log(`   - Protected Routes ✅`);
    console.log(`   - Role-Based Access ✅`);
    console.log(`\n⏰ Cron Jobs:`);
    console.log(`   - Auto Punch Out: 9:30 PM Daily ✅`);
    console.log(`   - Auto Holiday: 12:00 AM Sunday ✅`);
    console.log(`   - Monthly Leave Reset: 1st of month ✅`);
    console.log(`   - Session Cleanup: 2:00 AM Daily ✅`);
    console.log(`\n📋 Routes Available:`);
    console.log(`   - /api/auth ✅`);
    console.log(`   - /api/employee ✅`);
    console.log(`   - /api/leaves ✅`);
    console.log(`   - /api/audit ✅`);
    console.log(`   - /api/notifications ✅`);
    console.log(`   - /api/attendance ✅`);
    console.log(`   - /api/chat ✅ (Socket.IO)`);
    console.log(`   - /api/reports ✅`);
    console.log(`   - /api/test-cron ✅`);
    console.log(`   - /api/cron-status ✅`);
    console.log(`   - /api/test-punchout ✅`);
    console.log(`   - /api/test-holiday ✅`);
})).catch(error => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
});