# NEET Adaptive

A database-backed NEET practice platform built around a student’s actual syllabus progress. Create tests from full chapters and individual topics, take resumable timed assessments, review server-scored results, and plan revision from mistakes.

The original development brief is preserved in [NEET_PERSONALIZED_ASSESSMENT_PLATFORM.md](NEET_PERSONALIZED_ASSESSMENT_PLATFORM.md).

## Stack

Next.js 16 App Router, React, strict TypeScript, Tailwind CSS 4, shadcn-style Radix components, Lucide, PostgreSQL, Prisma 7 with the PostgreSQL driver adapter, stable Auth.js/NextAuth 4, Zod, React Hook Form, Recharts, KaTeX, Vitest, and Playwright. Exact installed resolutions are recorded in `package-lock.json`.

## Run locally

Requires Node.js 22.12+ (Node 24 LTS recommended), npm, and PostgreSQL. All commands below run from the repository root.

```sh
npm ci
npm run setup
```

`setup` creates an ignored `.env` with random secrets and unique development passwords. It preserves an existing `.env`. Development account credentials are saved only in the ignored `.local/credentials.json`; no shared default administrator password is included in source.

Start the project-local PostgreSQL server in a **separate terminal**:

```sh
npm run db:local
```

Then initialize and run the application:

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:3000**. Register your own student account, or use a generated local account from `.local/credentials.json`. Administrator tools are at `/admin` after signing in with the generated administrator account. Stop the local database with Ctrl+C in its terminal; its files persist under `.local/postgres`.

The local helper binds PostgreSQL to loopback, uses SCRAM authentication, and explicitly creates UTF-8 databases. On an existing Windows development database with a different encoding, `node scripts/ensure-utf8.mjs` creates a separate UTF-8 database and updates `.env`, preserving the old database. Reapply migrations and seed afterward.

### Use an existing PostgreSQL server instead

Copy `.env.example` to `.env` and supply your own `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_SECRET`, and `CRON_SECRET`. Both auth secret variables must have the same random value. Run `npm run db:migrate`, optionally seed a development database, and start the application. The embedded local helper is not needed.

For Docker PostgreSQL, set `POSTGRES_PASSWORD` in your shell, run `docker compose up -d db`, and set the matching connection string in `.env`. Do not reuse the placeholder password from `.env.example`.

## Demonstration content

The opt-in seed (`DEMO_SEED=true`) contains **68 original illustrative MCQs, 9 chapters, and 29 topics** across Physics, Chemistry, and Biology, with examples from Classes 11 and 12. It demonstrates:

- Full-chapter plus partial-chapter combinations.
- Multi-subject selection and explicit prerequisite exclusion.
- Editorial difficulty labels, deterministic question order, and manual allocation.
- Submission, scoring, explanations, mistake recording, and revision.

The seed is development teaching material, not a professionally validated NEET question bank or a complete official syllabus. No student attempts or performance metrics are seeded. It deliberately cannot produce a complete 180-question mock; impossible configurations return an availability error.

For the brief’s example, choose the full **Some Basic Concepts of Chemistry** chapter and only **Atomic models** and **Bohr’s model** from **Structure of Atom**. Use 10 questions and the Foundation mix initially. Questions that additionally require Quantum Numbers are excluded.

Re-seeding adds missing demonstration records without overwriting edited questions or rotating account passwords. Keep `DEMO_SEED=false` on production databases. Use a verified content import and publish the intended syllabus before opening the app to students.

## Available workflows

- Email/password registration and authentication, optional Google login, short onboarding, profile preferences, password reset through configured Resend email, and revocable sessions.
- Preparation tracker with separate Not Started/Learning/Completed/Revising states.
- Four-step builder supporting six test types, subject/class/chapter/topic filters, full or partial chapters, exact counts, chapter allocations, difficulty mixes, exposure preferences, language, timer, and marking modes.
- Student-safe exam payloads, answer autosave, same-tab offline recovery, review flags, navigation, foreground timing estimates, server deadlines, and idempotent submission.
- Results, explanations, subject/topic analytics, timing analysis, test history, bookmarks, error reports, mistake categories, and revision tasks.
- Standardized public and invitation-only challenges with a frozen common paper, equal duration, delayed results, and opt-in alias leaderboards.
- Staff question creation/editing/preview, versioning, review submission, administrator approval/archive, validated transactional JSON import, topic coverage, user permissions, question reports, syllabus version creation, blueprint configuration, revision settings, audit logs, and explicit historical rescoring.

## Configuration

| Variable                                      | Purpose                                                                                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                | Runtime and migration PostgreSQL connection string. Use TLS with hosted PostgreSQL.                                                      |
| `AUTH_SECRET`, `NEXTAUTH_SECRET`              | Same high-entropy value used by Auth.js.                                                                                                 |
| `NEXTAUTH_URL`                                | Canonical app origin, including the port locally. Also validates mutation origins.                                                       |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`        | Optional Google OAuth credentials. Callback: `<origin>/api/auth/callback/google`.                                                        |
| `RESEND_API_KEY`, `MAIL_FROM`                 | Optional password-reset email delivery. Use a verified sender domain. Without these, the reset screen explains that mail is unavailable. |
| `CRON_SECRET`                                 | Bearer secret for the expiration endpoint.                                                                                               |
| `RUN_EXPIRY_WORKER`                           | `true` enables the 15-second in-process expiration sweep on a persistent Node server. Use an external scheduler on serverless hosting.   |
| `DEMO_SEED`                                   | Explicit opt-in for illustrative development content.                                                                                    |
| `SEED_STUDENT_EMAIL`, `SEED_STUDENT_PASSWORD` | Optional local student account seed.                                                                                                     |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`     | Optional local administrator account seed.                                                                                               |

### Administrator creation and rotation

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your process environment, then run:

```sh
npm run admin:create
```

Use a unique password of 12–72 characters. The command creates an administrator or rotates that account’s password and invalidates existing sessions. It does not print the password. Unset the environment variables afterward. UI permission changes require another administrator and invalidate affected sessions.

## Verification

```sh
npm run typecheck
npm run lint
npm run test
npm run test:integration
npm run test:e2e
npm run build
```

Integration and browser commands create a **separate local database** with a unique run suffix ending in `_test`, migrate it, and seed it. They refuse hosted database URLs. They do not clear the development database. PostgreSQL must already be running.

Install a Playwright browser once if needed:

```sh
npx playwright install chromium
```

Alternatively, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chrome/Chromium executable. Browser checks build the production application and start it on port 3100 with an independent `.next-e2e` output directory. Test screenshots and traces are ignored under `test-results/`.

Unit tests cover scoring, accuracy denominators, shared-topic timing, strict eligibility, prerequisites, difficulty rounding, max-flow allocation, shortages, duplicates, deadlines, revision intervals, and invalid configurations. Integration checks exercise real PostgreSQL persistence, ownership, concurrent submission, exposure, deadlines, and question versioning. Browser checks cover student and administrator journeys.

## Build and deploy

```sh
npm run build
npm run db:migrate
npm start
```

Use a Node-capable Next.js host and PostgreSQL. Static-only hosting cannot run this app. Configure production secrets and the exact HTTPS `NEXTAUTH_URL` at runtime. Run migrations as a release step, never from individual requests. The included Dockerfile supports a Node deployment; see [deployment instructions](docs/DEPLOYMENT.md).

On a persistent server, enable `RUN_EXPIRY_WORKER=true`. On a serverless host, schedule a POST to `/api/cron/expire` at least once per minute with `Authorization: Bearer <CRON_SECRET>`. Expired answers are always rejected by deadline, regardless of when the sweep materializes the result. Reads also finalize expired owned attempts.

## Documentation

### Previous-year paper extraction audit

The supplied ExamGOAL PDF is processed offline into a **review-only SQLite staging database**. This command does not publish third-party questions into student tests. The six accompanying school syllabus PDFs are inventoried; they have not been structurally mapped to the current NTA syllabus.

On Windows, with the seven PDFs in your `Downloads` folder:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-pyq.txt
.\.venv\Scripts\python.exe scripts\pyq_ingest.py ingest
.\.venv\Scripts\python.exe scripts\pyq_ingest.py pilot
.\.venv\Scripts\python.exe scripts\pyq_ingest.py report
.\.venv\Scripts\python.exe -m unittest discover -s tests\pyq -v
```

Use `--source <PDF path>` and `--out <staging directory>` to override defaults. Each paper/page has a versioned checkpoint; rerunning `ingest` resumes and uses stable source keys. The full scan writes `manifest.json`, `reconciliation.json`, `review-queue.jsonl`, and `staging.sqlite3` under ignored `.local/pyq-ingest/`. The pilot renders sample question crops; [the extraction and per-paper reconciliation report](docs/PYQ_INGESTION_REPORT.md) records its accuracy and remaining review work. The complete source question bank cannot be used in the live app until visual, academic, syllabus, and publication-rights review is complete.

- [Architecture and database design](docs/ARCHITECTURE.md)
- [Generation, scoring, analytics, and revision rules](docs/ASSESSMENT_RULES.md)
- [Question import and editorial operations](docs/CONTENT.md)
- [JSON question import example](docs/question-import.example.json)
- [Official references and syllabus assumptions](docs/SOURCES.md)
- [Deployment and operations](docs/DEPLOYMENT.md)
- [Scope, limitations, and roadmap](docs/STATUS.md)

Brand text lives in `src/lib/brand.ts` and theme tokens in `src/app/globals.css`. UI components are owned by the project under `src/components/ui/` with `components.json` for shadcn tooling.

## Uploaded PYQ practice

Open `/pyq` after signing in. The uploaded archive is stored in PostgreSQL under its own inactive syllabus version; it is available through paper/subject practice without claiming unreviewed chapter mappings. There are 3,370 imported records, with 3,047 available for practice and 323 held. Ten ambiguous answer-key records remain in SQLite staging. The full collection has 940 text representations and 2,440 original question screenshots; only single-key eligible records are imported.

Images are stored in `.local/question-media`, outside `public`, and served only to staff or the student assigned the question. Screenshots include the original question and options; solution QR/link regions are omitted. Preserve this directory with the PostgreSQL database when deploying. The source PDF remains in Downloads.

To regenerate and import on Windows:

```powershell
.\.venv\Scripts\python.exe scripts\export-pyq.py
npx tsx scripts/import-pyq.ts
```

Normal use should run `npm run build` once after changes, followed by `npm start`. `npm run dev` intentionally compiles routes on demand and is intended for editing. The running local server now uses the production build.

Active attempts never receive answer keys or explanations, even for older learning configurations with instant feedback enabled. Scoring stays on the server. Results reveal answers after submission; anything intentionally displayed in the browser can be inspected in developer tools. Authentication, ownership, anonymous image access, active result gates, and legacy instant-feedback configurations are exercised by `node scripts/pyq-smoke.mjs` against the local demo account. That verification creates practice attempts and captures browser screenshots under `.local/qa`.
