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
        );
