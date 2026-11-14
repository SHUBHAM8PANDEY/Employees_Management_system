const sequelize = require('../config/database');

async function migrate() {
    await sequelize.query(`
        ALTER TABLE public.leaverequests
            ADD COLUMN IF NOT EXISTS applied_at timestamptz DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS approved_by varchar(100),
            ADD COLUMN IF NOT EXISTS approved_at timestamptz,
            ADD COLUMN IF NOT EXISTS comments text;
        ALTER TABLE public.leave_limits
            ADD COLUMN IF NOT EXISTS sick_taken integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS casual_taken integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS paid_taken integer NOT NULL DEFAULT 0;
    `);
}

migrate().catch(error => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
}).finally(() => sequelize.close());
