# Employee Management

## Deploy

1. Create a Render Blueprint from this repository. Set `DATABASE_URL` to the Neon pooled PostgreSQL URL and `FRONTEND_ORIGINS` to the Vercel HTTPS origin. Render generates `JWT_SECRET`. Use a single always-on backend instance for scheduled jobs and in-memory chat presence.
2. Import this repository into Vercel. Set the **Root Directory** to `employee-frontend`, use Node 24.x, and set `REACT_APP_API_URL` to the Render HTTPS URL before building. Use origins without a trailing slash. For multiple frontend origins, separate them with commas in Render.
3. Open the Vercel URL and sign in with an existing account. Admin/HR users create employee accounts. Render checks `/healthz`, which returns a minimal public status.

The Neon schema and data are already imported on the configured database. For a new empty Neon database, run `npm run db:import -- <local-dump.sql>` with its `DATABASE_URL` set before deploying. The import uses the direct Neon endpoint and refuses to overwrite existing tables.

## Local development

Create a backend `.env` from `.env.example` and supply a Neon URL and a random JWT signing secret of at least 32 characters. Run `npm ci` and `npm start` in the repository root, then `npm ci` and `npm start` in `employee-frontend`.

Sessions expire 24 hours after sign-in. Signing out or forcing logout revokes the database session. Changing the signing secret requires all users to sign in again.
