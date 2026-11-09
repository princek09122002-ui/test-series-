# Zero eligible Physics questions — verified execution report

Captured against the PostgreSQL database used by `localhost:3000` on 2026-11-07.

## Exact reproduction

- Kind: Custom
- Full chapters: `physics-school-11-1`, `physics-school-11-4`, `physics-school-11-7`, `physics-school-11-14`
- Expanded active topics: 30
- Count: 10
- Mode: Learning, untimed
- Difficulty: strict Easy 100%
- Exposure: All
- Language: English
- Active syllabus: `demo-syllabus-2026` (Illustrative NEET 2026 — development)
- Availability service result: 0

## Filter trace

| Stage | Remaining |
|---|---:|
| All source Physics records | 2,346 |
| Canonical imported Physics questions | 687 |
| Selected chapters | 134 |
| Selected topics | 27 |
| Prerequisites satisfied | 27 |
| Valid single-correct options | 27 |
| Source answer verified | 27 |
| Academically approved | 0 |
| Rights-cleared | 0 |
| Published | 0 |
| Eligible for `NEET-2027-PROVISIONAL` | 0 |
| English | 0 |
| Strict Easy | 0 |
| Final eligible | 0 |

The first zero is academic approval. Publication rights are a second independent blocker. Difficulty is not the cause of the current zero because availability is already zero before generation applies the strict mix.

## Current import state

- All subjects staged: 8,592
- All subjects canonical private drafts: 4,689
- Physics source keys verified: 2,340 of 2,346
- Physics text technically ready: 916 of 2,346
- Physics review status: 2,346 pending
- Physics rights status: 2,346 unverified
- Published imported questions: 0
- Existing canonical import drafts marked `DIFFICULTY_UNRATED`: 4,689

The idempotent canonical promotion dry-run found 232 technically ready unlinked records, all blocked because no unique chapter mapping exists. It found zero safe automatic promotions.

## Changes executed

- Added strict and Any Difficulty generation behavior.
- Any Difficulty ignores editorial difficulty quotas while retaining publication, syllabus, topic, prerequisite, exposure and uniqueness gates.
- Changed the Custom Test Builder default from 100% Easy to NEET Balanced (30/50/20).
- Added explicit shortage messages for strict difficulty requests.
- Marked all 4,689 private imported drafts as difficulty-unrated. Backup: `.local/backups/pre-unrated-tag-2026-11-07T09-13-08.161Z.json`.
- Future canonical draft promotion adds `DIFFICULTY_UNRATED` automatically.
- Added a development-only, browser-local assessment lab with original sample MCQs. It never calls the test API or writes PostgreSQL analytics. Production returns 404 for `/dev-test`.

## Verification

- TypeScript: passed
- ESLint: passed
- Unit tests: 50 passed
- PostgreSQL integration tests: 31 passed
- Production build: passed
- Production server: running at `localhost:3000`
- Development lab E2E: answered 3 questions, submitted, scored 3/3, and created zero production tests

The exact production Physics test cannot be generated legitimately yet. An authorized reviewer must approve academic content, assign reviewed topics and difficulty, record publication-rights evidence at source level, and publish enough questions for the requested selection.
