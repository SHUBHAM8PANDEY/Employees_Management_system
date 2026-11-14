const sequelize = require('../config/database');

async function migrate() {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS public.leave_limits (
            employee_code varchar(100) PRIMARY KEY
                REFERENCES public.employees(employee_code) ON DELETE CASCADE ON UPDATE CASCADE
        );
        ALTER TABLE public.leave_limits
            ADD COLUMN IF NOT EXISTS sick_limit integer NOT NULL DEFAULT 12,
            ADD COLUMN IF NOT EXISTS casual_limit integer NOT NULL DEFAULT 15,
            ADD COLUMN IF NOT EXISTS paid_limit integer NOT NULL DEFAULT 10,
            ADD COLUMN IF NOT EXISTS sick_taken integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS casual_taken integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS paid_taken integer NOT NULL DEFAULT 0;
    `);
}

migrate().catch(error => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
}).finally(() => sequelize.close());
