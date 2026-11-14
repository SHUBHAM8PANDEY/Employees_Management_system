const { createHash } = require('node:crypto');
const { readdirSync, readFileSync } = require('node:fs');
const path = require('node:path');

const baselineTables = [
    'attendances', 'audit_logs', 'chat_messages', 'email_config', 'email_queue',
    'email_templates', 'employees', 'employee_addresses', 'employee_qualification',
    'employee_skills', 'leaverequests', 'leave_limits', 'login_history', 'notifications',
    'permissions', 'roles', 'role_permissions', 'users', 'user_sessions'
];

async function migrate(database) {
    const migrations = readdirSync(__dirname).filter(name => /^\d{3}-[a-z-]+\.sql$/.test(name)).sort();
    return database.transaction(async transaction => {
        const execute = (sql, bind) => database.query(sql, { transaction, bind });
        await execute('SELECT pg_advisory_xact_lock(157382, 1)');
        await execute('SET LOCAL search_path TO public');
        await execute(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
            name text PRIMARY KEY,
            checksum char(64) NOT NULL,
            applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        const [rows] = await execute('SELECT name, checksum FROM public.schema_migrations');
        const applied = new Map(rows.map(row => [row.name, row.checksum]));
        const executed = [];
        for (const name of migrations) {
            const sql = readFileSync(path.join(__dirname, name), 'utf8').replace(/\r\n/g, '\n');
            const checksum = createHash('sha256').update(sql).digest('hex');
            if (applied.has(name)) {
                if (applied.get(name) !== checksum) throw new Error('Applied migration changed: ' + name);
                continue;
            }
            let adopt = false;
            if (name === '001-baseline.sql') {
                const [catalog] = await execute(`SELECT table_name AS migration_table FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                    `);
                const tables = catalog.filter(row => baselineTables.includes(row.migration_table));
                if (tables.length && tables.length !== baselineTables.length) {
                    throw new Error('Partial legacy schema. Missing: ' +
                        baselineTables.filter(table => !tables.some(row => row.migration_table === table)).join(', '));
                }
                adopt = tables.length === baselineTables.length;
            }
            if (!adopt) await execute(sql);
            await execute('INSERT INTO public.schema_migrations (name, checksum) VALUES ($name, $checksum)', { name, checksum });
            executed.push(name + (adopt ? ' (existing schema adopted)' : ''));
        }
        return executed;
    });
}

async function runCli() {
    const database = require('../config/database');
    try {
        const executed = await migrate(database);
        console.log(executed.length ? executed.join('\n') : 'Database migrations are up to date.');
    } catch (error) {
        console.error('Migration failed:', error.original?.code || error.message);
        process.exitCode = 1;
    } finally {
        await database.close();
    }
}

if (require.main === module) void runCli();
module.exports = { migrate, runCli };
