const bcrypt = require('bcryptjs');
const database = require('../config/database');
const { migrate } = require('./run');

async function main() {
    const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
    if (email.length > 255 || !require('sequelize').Validator.isEmail(email) ||
        password.length < 12 || Buffer.byteLength(password) > 72) {
        throw new Error('Set a valid BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of 12–72 bytes.');
    }
    await migrate(database);
    const hash = await bcrypt.hash(password, 12);
    await database.transaction(async transaction => {
        const query = (sql, bind) => database.query(sql, { transaction, bind });
        await query('LOCK TABLE public.users IN SHARE ROW EXCLUSIVE MODE');
        const [rows] = await query('SELECT 1 FROM public.users LIMIT 1');
        if (rows.length) throw new Error('Bootstrap requires an empty users table.');
        await query("INSERT INTO public.users (employee_code, email, password, role) VALUES ('EMP-1', $email, $hash, 'Admin')", { email, hash });
        await query("INSERT INTO public.employees (employee_code, first_name, last_name, email) VALUES ('EMP-1', 'WorkHub', 'Admin', $email)", { email });
    });
    console.log('Initial admin created.');
}

main().catch(error => {
    console.error('Bootstrap failed:', error.original?.code || error.message);
    process.exitCode = 1;
}).finally(() => database.close());
