-- PostgreSQL schema derived from the legacy dump. Contains schema only.

CREATE TABLE IF NOT EXISTS "attendances" (
    "id" integer NOT NULL,
    "employee_code" varchar(100) NOT NULL,
    "date" date NOT NULL,
    "punch_in" timestamptz DEFAULT NULL,
    "punch_out" timestamptz DEFAULT NULL,
    "punch_in_type" text DEFAULT 'Office' CHECK ("punch_in_type" IN ('Office','Client','Remote')),
    "punch_out_type" text DEFAULT 'Manual' CHECK ("punch_out_type" IN ('Manual','Auto')),
    "status" text NOT NULL DEFAULT 'Absent' CHECK ("status" IN ('Present','Absent','Half Day','Short Leave','On Leave','Holiday')),
    "total_hours" double precision DEFAULT 0,
    "ip_address" varchar(45) DEFAULT NULL,
    "location" varchar(500) DEFAULT NULL,
    "device_info" text DEFAULT NULL,
    "notes" text DEFAULT NULL,
    "created_at" timestamptz NOT NULL,
    "updated_at" timestamptz NOT NULL,
    "latitude" decimal(10,8) DEFAULT NULL,
    "longitude" decimal(11,8) DEFAULT NULL,
    "punch_in_photo" varchar(500) DEFAULT NULL,
    "punch_out_photo" varchar(500) DEFAULT NULL,
    "punch_out_location" varchar(500) DEFAULT NULL,
    "punch_out_latitude" decimal(10,8) DEFAULT NULL,
    "punch_out_longitude" decimal(11,8) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" integer NOT NULL,
    "employee_code" varchar(100) DEFAULT NULL,
    "action" varchar(100) NOT NULL,
    "entity_type" varchar(50) NOT NULL,
    "entity_id" varchar(100) DEFAULT NULL,
    "old_data" text DEFAULT NULL,
    "new_data" text DEFAULT NULL,
    "ip_address" varchar(45) DEFAULT NULL,
    "user_agent" text DEFAULT NULL,
    "status" varchar(20) DEFAULT 'Success',
    "error_message" text DEFAULT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" integer NOT NULL,
    "sender_code" varchar(100) NOT NULL,
    "receiver_code" varchar(100) NOT NULL,
    "message" text NOT NULL,
    "is_read" boolean NOT NULL DEFAULT false,
    "created_at" timestamptz NOT NULL,
    "updated_at" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_config" (
    "id" integer NOT NULL DEFAULT 1,
    "smtp_host" varchar(255) DEFAULT NULL,
    "smtp_port" integer DEFAULT 587,
    "smtp_secure" boolean DEFAULT false,
    "smtp_user" varchar(255) DEFAULT NULL,
    "smtp_pass" varchar(255) DEFAULT NULL,
    "from_email" varchar(255) DEFAULT NULL,
    "from_name" varchar(150) DEFAULT 'WorkHub HR',
    "enabled" boolean DEFAULT false,
    "created_at" timestamptz NOT NULL,
    "updated_at" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_queue" (
    "id" integer NOT NULL,
    "template_code" varchar(80) DEFAULT NULL,
    "to_email" varchar(255) NOT NULL,
    "to_name" varchar(150) DEFAULT NULL,
    "subject" varchar(255) NOT NULL,
    "body_html" text NOT NULL,
    "payload" text DEFAULT NULL,
    "status" text DEFAULT 'pending' CHECK ("status" IN ('pending','processing','sent','failed')),
    "attempts" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 3,
    "error_message" text DEFAULT NULL,
    "message_id" varchar(255) DEFAULT NULL,
    "scheduled_at" timestamptz DEFAULT NULL,
    "sent_at" timestamptz DEFAULT NULL,
    "created_at" timestamptz NOT NULL,
    "updated_at" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_templates" (
    "id" integer NOT NULL,
    "code" varchar(80) NOT NULL,
    "name" varchar(150) NOT NULL,
    "subject" varchar(255) NOT NULL,
    "body_html" text NOT NULL,
    "variables" text DEFAULT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamptz NOT NULL,
    "updated_at" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "employees" (
    "employee_code" varchar(100) NOT NULL,
    "first_name" varchar(100) NOT NULL,
    "last_name" varchar(100) NOT NULL,
    "email" varchar(255) NOT NULL,
    "profile_picture" text DEFAULT NULL,
    "date_of_birth" date DEFAULT NULL,
    "joining_date" date DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "employee_addresses" (
    "id" integer NOT NULL,
    "employee_code" varchar(100) NOT NULL,
    "address_line" text DEFAULT NULL,
    "city" varchar(100) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "employee_qualification" (
    "id" integer NOT NULL,
    "employee_code" varchar(100) NOT NULL,
    "degree" varchar(100) DEFAULT NULL,
    "institution" varchar(255) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "employee_skills" (
    "id" integer NOT NULL,
    "employee_code" varchar(100) NOT NULL,
    "skill_name" varchar(100) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "leaverequests" (
    "id" integer NOT NULL,
    "employee_code" varchar(100) NOT NULL,
    "leave_type" varchar(255) NOT NULL,
    "start_date" date NOT NULL,
    "end_date" date NOT NULL,
    "reason" text NOT NULL,
    "status" varchar(255) DEFAULT 'Pending',
    "days" integer DEFAULT 1,
    "applied_at" timestamptz DEFAULT NULL,
    "approved_by" varchar(100) DEFAULT NULL,
    "approved_at" timestamptz DEFAULT NULL,
    "comments" text DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "leave_limits" (
    "employee_code" varchar(100) NOT NULL,
    "sick_limit" integer NOT NULL DEFAULT 12,
    "casual_limit" integer NOT NULL DEFAULT 15,
    "paid_limit" integer NOT NULL DEFAULT 10,
    "sick_taken" integer NOT NULL DEFAULT 0,
    "casual_taken" integer NOT NULL DEFAULT 0,
    "paid_taken" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "login_history" (
    "id" integer NOT NULL,
    "employee_code" varchar(100) NOT NULL,
    "ip_address" varchar(45) DEFAULT NULL,
    "user_agent" text DEFAULT NULL,
    "location" varchar(255) DEFAULT NULL,
    "status" text DEFAULT 'Success' CHECK ("status" IN ('Success','Failed','Logout','Force Logout')),
    "failure_reason" text DEFAULT NULL,
    "login_time" timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" integer NOT NULL,
    "employee_code" varchar(100) NOT NULL,
    "type" varchar(50) NOT NULL,
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "link" varchar(255) DEFAULT NULL,
    "is_read" boolean DEFAULT false,
    "read_at" timestamptz DEFAULT NULL,
    "icon" varchar(50) DEFAULT '?',
    "color" varchar(20) DEFAULT 'blue',
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "permissions" (
    "id" integer NOT NULL,
    "name" varchar(100) NOT NULL,
    "module" varchar(50) NOT NULL,
    "action" varchar(50) NOT NULL,
    "description" varchar(255) DEFAULT NULL,
    "created_at" timestamptz NOT NULL,
    "updated_at" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "roles" (
    "id" integer NOT NULL,
    "name" varchar(50) NOT NULL,
    "description" varchar(255) DEFAULT NULL,
    "created_at" timestamptz NOT NULL,
    "updated_at" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "role_permissions" (
    "id" integer NOT NULL,
    "role_id" integer NOT NULL,
    "permission_id" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
    "employee_code" varchar(100) NOT NULL,
    "email" varchar(255) NOT NULL,
    "password" varchar(255) NOT NULL,
    "role" varchar(50) DEFAULT 'Employee',
    "last_seen" timestamptz DEFAULT NULL,
    "role_id" integer DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" integer NOT NULL,
    "employee_code" varchar(100) NOT NULL,
    "token" text NOT NULL,
    "ip_address" varchar(45) DEFAULT NULL,
    "user_agent" text DEFAULT NULL,
    "login_time" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "last_activity" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "is_active" boolean DEFAULT true,
    "logout_time" timestamptz DEFAULT NULL
);

ALTER TABLE "attendances" ADD PRIMARY KEY ("id");

CREATE UNIQUE INDEX "attendances_idx_unique_employee_date" ON "attendances" ("employee_code","date");

CREATE INDEX "attendances_idx_employee_code" ON "attendances" ("employee_code");

CREATE INDEX "attendances_idx_date" ON "attendances" ("date");

CREATE INDEX "attendances_idx_status" ON "attendances" ("status");

ALTER TABLE "audit_logs" ADD PRIMARY KEY ("id");

CREATE INDEX "audit_logs_idx_employee_code" ON "audit_logs" ("employee_code");

CREATE INDEX "audit_logs_idx_action" ON "audit_logs" ("action");

CREATE INDEX "audit_logs_idx_entity_type" ON "audit_logs" ("entity_type");

CREATE INDEX "audit_logs_idx_created_at" ON "audit_logs" ("created_at");

ALTER TABLE "chat_messages" ADD PRIMARY KEY ("id");

CREATE INDEX "chat_messages_sender_code" ON "chat_messages" ("sender_code");

CREATE INDEX "chat_messages_receiver_code" ON "chat_messages" ("receiver_code");

ALTER TABLE "email_config" ADD PRIMARY KEY ("id");

ALTER TABLE "email_queue" ADD PRIMARY KEY ("id");

ALTER TABLE "email_templates" ADD PRIMARY KEY ("id");

CREATE UNIQUE INDEX "email_templates_code" ON "email_templates" ("code");

ALTER TABLE "employees" ADD PRIMARY KEY ("employee_code");

CREATE UNIQUE INDEX "employees_email" ON "employees" ("email");

CREATE UNIQUE INDEX "employees_employee_code" ON "employees" ("employee_code");

ALTER TABLE "employee_addresses" ADD PRIMARY KEY ("id");

CREATE INDEX "employee_addresses_fk_address_employee" ON "employee_addresses" ("employee_code");

ALTER TABLE "employee_qualification" ADD PRIMARY KEY ("id");

CREATE INDEX "employee_qualification_fk_qualification_employee" ON "employee_qualification" ("employee_code");

ALTER TABLE "employee_skills" ADD PRIMARY KEY ("id");

CREATE INDEX "employee_skills_fk_skill_employee" ON "employee_skills" ("employee_code");

ALTER TABLE "leaverequests" ADD PRIMARY KEY ("id");

CREATE INDEX "leaverequests_fk_leave_request_employee" ON "leaverequests" ("employee_code");

ALTER TABLE "leave_limits" ADD PRIMARY KEY ("employee_code");

ALTER TABLE "login_history" ADD PRIMARY KEY ("id");

CREATE INDEX "login_history_idx_employee_code" ON "login_history" ("employee_code");

CREATE INDEX "login_history_idx_status" ON "login_history" ("status");

CREATE INDEX "login_history_idx_login_time" ON "login_history" ("login_time");

ALTER TABLE "notifications" ADD PRIMARY KEY ("id");

CREATE INDEX "notifications_idx_employee_code" ON "notifications" ("employee_code");

CREATE INDEX "notifications_idx_is_read" ON "notifications" ("is_read");

CREATE INDEX "notifications_idx_created_at" ON "notifications" ("created_at");

ALTER TABLE "permissions" ADD PRIMARY KEY ("id");

CREATE UNIQUE INDEX "permissions_name" ON "permissions" ("name");

ALTER TABLE "roles" ADD PRIMARY KEY ("id");

CREATE UNIQUE INDEX "roles_name" ON "roles" ("name");

ALTER TABLE "role_permissions" ADD PRIMARY KEY ("id");

CREATE UNIQUE INDEX "role_permissions_role_permissions_role_id_permission_id_unique" ON "role_permissions" ("role_id","permission_id");

CREATE INDEX "role_permissions_permission_id" ON "role_permissions" ("permission_id");

ALTER TABLE "users" ADD PRIMARY KEY ("employee_code");

CREATE UNIQUE INDEX "users_email" ON "users" ("email");

CREATE UNIQUE INDEX "users_employee_code" ON "users" ("employee_code");

CREATE INDEX "users_role_id" ON "users" ("role_id");

ALTER TABLE "user_sessions" ADD PRIMARY KEY ("id");

CREATE INDEX "user_sessions_idx_employee_code" ON "user_sessions" ("employee_code");

CREATE INDEX "user_sessions_idx_is_active" ON "user_sessions" ("is_active");

ALTER TABLE "attendances" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "audit_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "chat_messages" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "email_queue" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "email_templates" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "employee_addresses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "employee_qualification" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "employee_skills" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "leaverequests" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "login_history" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "notifications" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "permissions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "roles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "role_permissions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "user_sessions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "attendances" ADD CONSTRAINT "attendances_ibfk_1" FOREIGN KEY ("employee_code") REFERENCES "employees" ("employee_code") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_ibfk_1" FOREIGN KEY ("sender_code") REFERENCES "employees" ("employee_code") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_ibfk_2" FOREIGN KEY ("receiver_code") REFERENCES "employees" ("employee_code") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "employees" ADD CONSTRAINT "employees_ibfk_1" FOREIGN KEY ("employee_code") REFERENCES "users" ("employee_code") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employee_addresses" ADD CONSTRAINT "fk_address_employee" FOREIGN KEY ("employee_code") REFERENCES "employees" ("employee_code") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employee_qualification" ADD CONSTRAINT "fk_qualification_employee" FOREIGN KEY ("employee_code") REFERENCES "employees" ("employee_code") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employee_skills" ADD CONSTRAINT "fk_skill_employee" FOREIGN KEY ("employee_code") REFERENCES "employees" ("employee_code") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "leaverequests" ADD CONSTRAINT "fk_leave_request_employee" FOREIGN KEY ("employee_code") REFERENCES "employees" ("employee_code") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "leaverequests" ADD CONSTRAINT "leaverequests_ibfk_2" FOREIGN KEY ("employee_code") REFERENCES "employees" ("employee_code") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "leave_limits" ADD CONSTRAINT "fk_leave_limit_employee" FOREIGN KEY ("employee_code") REFERENCES "employees" ("employee_code") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "login_history" ADD CONSTRAINT "login_history_ibfk_1" FOREIGN KEY ("employee_code") REFERENCES "users" ("employee_code") ON DELETE CASCADE;

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_ibfk_17" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_ibfk_18" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users" ADD CONSTRAINT "users_ibfk_1" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_ibfk_1" FOREIGN KEY ("employee_code") REFERENCES "users" ("employee_code") ON DELETE CASCADE;
