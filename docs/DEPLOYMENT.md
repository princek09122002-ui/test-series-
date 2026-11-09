# Deployment and operations

## Node hosting

Use a persistent Node 22.12+ server or a Next.js-compatible Node serverless host with PostgreSQL network connectivity. This is not a static export and does not target Cloudflare Workers’ restricted TCP runtime.

1. Provision a UTF-8 PostgreSQL database. Use a least-privileged application user and a separate migration role where your host supports it.
2. Configure DATABASE_URL with the host’s TLS settings. Do not disable certificate verification to work around connection errors.
3. Set the canonical HTTPS NEXTAUTH_URL and high-entropy auth/cron secrets through the host’s environment settings.
4. Build with `npm ci && npm run build`.
5. Apply `npm run db:migrate` as a controlled release step.
6. Start with `npm start` and health-check `/` plus database connectivity separately.
7. Create your administrator via `npm run admin:create` in a controlled operator environment. Do not expose shared credentials.
8. Import and review actual curriculum content. Do not seed demonstration accounts into production.

Prisma CLI is a development dependency; migration jobs need the build environment’s full dependencies. A pruned runtime should not run migrations during startup.

## Docker

```sh
docker build --target build -t neet-adaptive-build .
docker build -t neet-adaptive .
```

Run migrations using the build image with production environment variables supplied securely, then run the final image with the same runtime database and auth settings on port 3000. Keep secrets out of Docker build arguments and image layers. Mount no development `.local` directory in production.

## Expiration finalization

Persistent Node: `RUN_EXPIRY_WORKER=true` enables a 15-second sweep. Concurrent instances are safe because submission is row-locked and idempotent. Disable it during build jobs if the build environment cannot reach the runtime database.

Serverless: set `RUN_EXPIRY_WORKER=false` and configure a host scheduler to POST `/api/cron/expire` once a minute with `Authorization: Bearer <CRON_SECRET>`. The endpoint processes up to 100 overdue attempts per invocation. At higher volume, invoke until the batch is smaller than 100 or increase scheduling frequency. Never put the secret in a URL query string.

The hard deadline is checked on every write, independently of the sweep. A delayed sweep delays result materialization but never permits late answers.

## OAuth and reset email

Register `<NEXTAUTH_URL>/api/auth/callback/google` with Google and configure AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET. Test callback and account-linking behavior with your own credentials before enabling it for students.

Configure RESEND_API_KEY and MAIL_FROM using a verified Resend sender. Password reset reports a clear unavailable state when mail is absent. The application never logs reset links or raw reset tokens. Email delivery failures must be monitored through your mail provider and server error reporting.

## Backups and maintenance

- Back up PostgreSQL on a schedule and rehearse restoration. Question snapshots and audit records are part of the recovery set.
- Retain question versions and audit records when archiving content.
- Periodically remove expired RateLimit, Session, and PasswordReset records according to a documented retention policy. These tables never grant access after expiration.
- Configure proxy request/body limits and host-level registration abuse controls before public launch. The app also applies bounded request parsing and database-backed sensitive-endpoint limits.
- Configure operational alerting, log retention, and a real privacy/contact process before onboarding minors at scale.
- Run tests and migrations in staging against a restored copy before releases. Never point local automated test helpers at a hosted production URL.
- Optional HTTPS image URLs are loaded by the student’s browser. Use approved image hosts and a privacy-appropriate media policy.
