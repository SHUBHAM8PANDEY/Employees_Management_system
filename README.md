# Employee Management

## Deploy

1. Create a Render Blueprint from this repository. Set `DATABASE_URL` to the Neon pooled PostgreSQL URL and `FRONTEND_ORIGINS` to the Vercel HTTPS origin. Render generates `JWT_SECRET`. Use a single always-on backend instance for scheduled jobs and in-memory chat presence.
2. Import this repository into Vercel. Set the **Root Directory** to `employee-frontend`, use Node 24.x, and set `REACT_APP_API_URL` to the Render HTTPS URL before building. Use origins without a trailing slash. For multiple frontend origins, separate them with commas in Render.
3. Open the Vercel URL and sign in with an existing account. Admin/HR users create employee accounts. Render checks `/healthz`, which returns a minimal public status.

The Neon schema and data are already imported on the configured database. For a new empty Neon database, run `npm run db:import -- <local-dump.sql>` with its `DATABASE_URL` set before deploying. The import uses the direct Neon endpoint and refuses to overwrite existing tables.

## Local development

Create a backend `.env` from `.env.example` and supply a Neon URL and a random JWT signing secret of at least 32 characters. Run `npm ci` and `npm start` in the repository root, then `npm ci` and `npm start` in `employee-frontend`.

Sessions expire 24 hours after sign-in. Signing out or forcing logout revokes the database session. Changing the signing secret requires all users to sign in again.

## Email and chat files

For Render, set `RESEND_API_KEY` and `EMAIL_FROM` to a verified sender address. The HTTPS API works on Render Free, which blocks standard outbound SMTP ports. On an SMTP-capable host, set `EMAIL_USER`, `EMAIL_PASS`, and optionally `SMTP_HOST` and `SMTP_PORT`.

Chat accepts PDF, JPEG, PNG and WebP files up to 4 MB. Files are stored in Neon and can be downloaded by the sender and recipient. Backend startup adds the attachment columns to an existing database.

## Automated employee greetings

Fill in date of birth and joining date in Add Employee or Edit Employee. Existing records with missing dates can be updated there. The backend checks on startup and every 15 minutes in Asia/Kolkata. Birthday greetings repeat yearly and work anniversaries start after the first completed year. February 29 dates are observed on February 28 in non-leap years. Keep Render running continuously for same-day delivery and configure the email provider above.
