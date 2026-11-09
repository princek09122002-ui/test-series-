# NEET PYQ staging-to-publication execution — 7 November 2026

## Current database and executed work

The running Next.js site and processing scripts use `D:\neet\.env`, PostgreSQL `localhost:55432/neet_adaptive_utf8`, schema `public`. The previously reported 8,592 staged `SourceQuestion` rows remain present. All 80 source PDFs remain registered; none was reuploaded or reextracted for this run.

**Executed on the live development database:**

1. `scripts/staged-evidence-plan.py` compared each staged answer-key evidence string and original question number with the cited PDF key page, checked answer conflicts, four option strings, stem, media existence, question type, year, source scope and extraction flags. Its private 8,592-row plan is `.local/staged-processing/evidence-plan.json`.
2. `scripts/process-staged-evidence.mjs` wrote the evidence version, cited key page, technical readiness and explicit blockers into `SourceQuestion.extracted.processing`. It marked **8,564** unambiguous single-letter source keys `VERIFIED`; this means verified against the source key page, **not** academically approved. It wrote a pre-change backup under `.local/backups`. A second execution changed **0** rows.
3. `scripts/promote-technical-drafts.ts` reused the existing chapter/topic proposals and created **4,689** inactive `Question` drafts with four `QuestionOption` rows each, linked by `SourceQuestion.questionId`. **1,084** received provisional lexical `QuestionTopic` links. All remain `PENDING`, `active=false`, rights unverified and unavailable to students. The other **232** technically ready rows lacked a unique active chapter proposal. A second execution created **0** duplicates.
4. The admin queue now shows technical and publication stages, exception filters, source PDF evidence, prefilled but unapproved chapter/topic proposals, source-permission decisions, and a selected-record batch publication action. The transaction-based promotion service checks reviewed content, answer, mapping, eligibility, diagram presentation, duplicate detection and both source and question rights before publishing. It records reviewer actions and versions. Source permission revocation excludes previously published imported questions from student availability.

## Actual stage counts

Counts below are from live PostgreSQL after both jobs. A provisional topic link is a machine proposal. **Reviewed mapping is zero.** Categories can overlap; transition rows are not a sum of mutually exclusive groups.

| Stage | Physics | Chemistry | Biology | Total |
| --- | ---: | ---: | ---: | ---: |
| Staged | 2,346 | 1,986 | 4,260 | **8,592** |
| Parsed stem and four option slots | 2,345 | 1,981 | 4,258 | **8,584** |
| Single-answer key found in staged text | 2,341 | 1,976 | 4,253 | **8,570** |
| Key independently matched to cited PDF page | 2,340 | 1,972 | 4,252 | **8,564** |
| Text technically validated | 916 | 613 | 3,392 | **4,921** |
| Unique school-chapter proposal, all staged | 1,777 | 1,967 | 4,260 | **8,004** |
| Canonical private `Question` draft linked | 687 | 610 | 3,392 | **4,689** |
| Provisional topic link on a draft | 200 | 108 | 776 | **1,084** |
| Academically reviewed topic mapping | 0 | 0 | 0 | **0** |
| Academic approval | 0 | 0 | 0 | **0** |
| Question and source rights cleared | 0 | 0 | 0 | **0** |
| Published imported questions | 0 | 0 | 0 | **0** |
| Available for student tests | 0 | 0 | 0 | **0** |

The exact stopping transition is **provisional technical data → reviewed topic/academic decision → documented source and question distribution rights**. The publication service correctly refuses to mark a machine suggestion as human academic approval and refuses to clear third-party rights automatically. All 80 `SourceDocument.rightsStatus` values are `UNVERIFIED` (26 Physics, 22 Chemistry, 32 Biology). The active syllabus remains a provisional school-derived development version; NEET 2027 eligibility still needs review.

## Technical exception queue

| Review reason | Physics | Chemistry | Biology |
| --- | ---: | ---: | ---: |
| Source answer needs manual review | 6 | 14 | 8 |
| Visual, formula, glyph or layout review | 1,243 | 1,362 | 819 |
| Empty/incomplete extracted option text | 938 | 465 | 59 |
| Duplicate extracted options | 148 | 82 | 34 |
| Source marked outside scope | 161 | 14 | 41 |
| Multiple/unsupported question type | 3 | 12 | 6 |
| Short/incomplete stem | 1 | 5 | 2 |

These reasons overlap. The visual row is a **review-candidate count**, not a proven count of broken diagrams. Source page crops remain private; diagram and structure questions require visual review and a separately approved presentation crop before publication. No key or scientific symbol was guessed.

## Requested chapter comparison

The staged count uses the stored source-chapter proposal. Drafts are linked to those staged rows. The signed-in Custom Test Builder and the actual `availability()` Prisma service both returned **0** for each chapter.

| School chapter | Staged proposal | Canonical private draft | Source-key verified draft | Academic approved | Rights cleared | Published | API | UI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Physics · Units And Measurements | 82 | 40 | 40 | 0 | 0 | 0 | 0 | 0 |
| Chemistry · Structure of Atom | 92 | 17 | 17 | 0 | 0 | 0 | 0 | 0 |
| Biology · Cell - The Unit of Life | 193 | 146 | 146 | 0 | 0 | 0 | 0 | 0 |

The live service also returned 0 for the other requested chapters and selected Bohr/Nernst topics. The provisional 45 Physics, 45 Chemistry, 90 Biology sections and 180-question mock are **blocked**: each subject has 0 approved available questions. The browser disabled `Generate & start test`; no real student test was fabricated. An isolated integration fixture did generate an approved question, expose it through the same availability service, and then exclude it after source-rights revocation. This proves the pipeline implementation, not live content readiness.

## Reviewer action in the admin UI

1. Open `/admin/imports`. Filter by subject/chapter and **Text technically ready** or **Exceptions only**. Open a question to compare its private PDF crop, key-page evidence, stem/options, proposed chapter/topics, and scientific rendering. Correct any errors. Save the review with explicit answer, topic, prerequisite, eligibility, duplicate and presentation decisions plus academic evidence. Machine-filled fields are only suggestions.
2. An administrator opens the source name in the same queue, or `/admin/imports/sources/{sourceId}`, and records the actual license/permission type, student-test usage scope, supporting document reference, effective date, detailed evidence and decision. The administrator identity and timestamp are audited. No source has such clearance yet. Revoking permission immediately removes imported content from student availability.
3. After source permission and question review are complete, an admin may publish an individual question or select up to 30 saved, technically ready, text-only reviewed records and use **Publish selected reviewed questions**. Each selected record passes the transaction-based promotion gate independently; failed rows stay private and their reason is audited. Image records require individual reviewed-crop handling.

Possession of third-party chapter PDFs does not establish student-display rights. The UI records rights decisions; it cannot supply the missing legal permission or human academic judgment.

## Verification and integrity

TypeScript, ESLint and production Next.js build passed. Unit tests: **49/49**. Isolated PostgreSQL integration tests: **31/31**, including idempotent promotion, topic/option persistence, student availability, and source-rights revocation. The local site restarted and responded at `http://localhost:3000/`; its signed-in builder showed 0 approved questions for each requested chapter. PostgreSQL checks found **0 orphan source links, 0 orphan topic links, 0 draft option errors, 0 active staged drafts and 0 unvalidated constraints**. Existing history remained: 12 attempts, 17 responses, 193 test questions. No source PDF, historical attempt or prior question bank was deleted.

## Answers to the requested questions

- **A:** Yes, all 8,592 staged records remain.
- **B:** 8,564 single-answer keys were independently matched to the cited PDF key page; 28 need source-key review.
- **C:** 8,004 staged rows have one school-chapter proposal; 1,084 canonical drafts have a provisional topic link; **0** mappings have human academic verification.
- **D:** 0 academically approved.
- **E:** 0 questions and 0 sources have verified student-publication rights.
- **F:** 0 published and 0 available.
- **G:** Human academic review of content/mapping/eligibility and documented source plus question rights are the immediate gates. Technical exceptions also block their affected records.
- **H:** Use `/admin/imports` and its source-permission links as described above. Bulk publication applies only after saved review and rights evidence.
- **I:** Yes. The source-evidence job updated 8,592 staging records and the canonical-draft job created 4,689 linked inactive questions; second runs changed or created 0. Code, tests, build and site were executed.
- **J:** No real student test can be generated from the imported collection yet. The approved live pool is 0, and the API/UI both block generation. Isolated approved-content tests pass but are not live student tests.
