# Architecture

## Application boundaries

This is a modular monolith. Next.js App Router supplies server-rendered pages and route handlers. Pages query account-scoped services; interactive components receive explicitly selected view data. Every mutation authenticates and validates again on the server.

```text
src/app/                       Routes and server-rendered views
  (auth)/                      Login, registration, recovery
  (student)/                   Protected workspace and staff subroutes
  api/                         Auth, assessments, learning, and administrative mutations
src/components/                Interactive forms, exam player, charts, app shell
src/components/ui/             Project-owned Radix/shadcn-style primitives
src/lib/domain/                Pure eligibility, allocation, scoring, validation, revision
src/lib/services/              Database-backed test, content, analytics, and rescore workflows
src/lib/auth.ts                Auth.js and current database permission checks
src/lib/security.ts            Origin checks, bounded JSON parsing, durable rate limits
prisma/                        Schema, versioned SQL migrations, original seed
tests/                         Unit, PostgreSQL integration, and browser checks
```

## Persistence design

The Prisma schema is the authoritative model contract. PostgreSQL timestamps are timezone-aware application instants stored in UTC and formatted using the user’s IANA timezone.

| Domain      | Main models and relationships                                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity    | User → UserProfile, Account, Session, PasswordReset. Auth.js Account records support OAuth; Session records provide server-side revocation of encrypted JWT sessions.                                    |
| Syllabus    | SyllabusVersion → Subject → Chapter → Topic. Class is a validated 11/12 chapter attribute; subject, class, and syllabus for a topic are derived through foreign keys. Topic.parentId supports subtopics. |
| Preparation | UserTopicProgress is unique per user/topic. Missing rows mean Not Started and remain in the denominator.                                                                                                 |
| Content     | Question → QuestionOption, QuestionTopic, QuestionMedia, QuestionVersion, QuestionReview, QuestionReport. Required prerequisites are explicit QuestionTopic mappings.                                    |
| Assessment  | ExamBlueprint → ExamBlueprintSection. Test → TestConfiguration and ordered TestQuestion snapshots. TestAttempt is unique per user/test, with QuestionResponse and interaction events.                    |
| Learning    | MistakeRecord is unique per attempt/question. RevisionTask is unique per user/topic with a RevisionAttempt history. Bookmarks and question exposure are user-scoped.                                     |
| Competition | Challenge owns a cloned/frozen Test. Participation is unique per challenge/user and points at the student’s attempt.                                                                                     |
| Operations  | AuditLog retains privileged mutations and prior rescore state. PlatformSettings stores revision intervals. RateLimit uses atomic PostgreSQL upserts.                                                     |

Indexes cover question eligibility, user attempt history, active deadlines, topic mappings, revision due dates, and unique response/submission relationships. Analytics are computed from persisted snapshots and responses; per-attempt materialized TestAnalyticsSnapshot records are written atomically on submission. There are no unexplained TopicPerformance caches to keep synchronized.

## Critical transactions

Generation validates selection, selects questions, persists configuration and ordered versioned snapshots, creates an attempt/deadline, and records exposure in one transaction. No half-generated tests survive failure.

All answer writes, event writes, and finalization acquire a PostgreSQL row lock on the attempt. This serializes answer saving against submission and deadline finalization. Finalization checks status inside that lock, writes one scoring result and one analytics snapshot, and creates mistakes/revision records atomically. Repeated submissions return the same result.

Answer revision numbers provide optimistic concurrency checks across tabs. A repeated identical save is idempotent; conflicting stale data cannot silently overwrite a newer answer. The browser keeps only pending changes in attempt-specific session storage and retries them serially. Responses already synchronized live in PostgreSQL and survive refresh.

## Authentication and authorization

The stable Auth.js/NextAuth v4 App Router integration uses encrypted JWT cookies plus a database Session registry. Each protected operation checks the current user, current role, disabled state, session version, registry record, and expiration. Cookie claims alone do not grant administrator rights.

Passwords use bcrypt with cost 12 and a 72-character cap. Reset links contain random 256-bit tokens; only SHA-256 token hashes are stored, with a 30-minute expiry and transactional single use. Reset and credential rotation invalidate old sessions. Google sign-in is enabled only when configured and requires Google’s verified email assertion; dangerous automatic account linking is not enabled.

Editors may create questions, edit their own questions, preview them, and submit them for review. Approval, import, syllabus activation, user permissions, platform settings, and historical rescoring require ADMIN. Students never receive administrator question records or active answer keys.

## Design decisions

- PostgreSQL also owns rate limits and scheduling state; no Redis or microservices are required.
- A project-local native PostgreSQL helper makes Windows development possible without Docker. It is a development dependency, never a production storage fallback.
- KaTeX runs with `trust: false`; ordinary question text is escaped by React. Arbitrary imported HTML never executes.
- Question media uses validated HTTPS references and descriptive alternative text. The server does not fetch arbitrary imported URLs, preventing an upload-based server-side fetch path.
- Email delivery uses the Resend HTTPS API without an SMTP dependency. The optional mail configuration is explicit; an unconfigured system never pretends to have sent a reset link.
- Optional AI is a provider interface returning null until configured. The core never calls a model for correctness or production question publication.
