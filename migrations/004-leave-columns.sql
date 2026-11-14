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

ALTER TABLE public.leaverequests
            ADD COLUMN IF NOT EXISTS applied_at timestamptz DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS approved_by varchar(100),
            ADD COLUMN IF NOT EXISTS approved_at timestamptz,
            ADD COLUMN IF NOT EXISTS comments text;
        ALTER TABLE public.leave_limits
            ADD COLUMN IF NOT EXISTS sick_taken integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS casual_taken integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS paid_taken integer NOT NULL DEFAULT 0;
