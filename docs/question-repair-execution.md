# Question repair execution

This report describes jobs actually executed on 2026-11-07. Private source-image fallback preparation is distinct from text reconstruction, extraction certification, academic approval and publication.

## Preservation

A consistent repeatable-read, read-only backup captured all 43 public PostgreSQL tables at `.local/backups/pre-biology-2026-11-07T12-20-40.292Z/database.json`. The Prisma schema and migration files accompany it. This is a logical table-data backup plus schema/migrations, not a pg_dump archive or a tested disaster-recovery restore.

Verified against that backup: 4 users, 12 tests, 12 attempts, 4,925 canonical questions, 6 subjects, 158 chapters, 993 topics, 2 syllabus versions, 8,592 source questions, 17 responses and 11 analytics snapshots retain the same identities. No reset was performed.

All 80 source PDF hashes were recomputed and preserved in `.local/question-repair-v2/source-manifest.json`.

## Results by subject

| Metric | Physics | Chemistry | Biology |
|---|---:|---:|---:|
| Staged questions | 2,346 | 1,986 | 4,260 |
| Missing-option records | 938 | 465 | 59 |
| Additional missing-stem records | 1 | 3 | 0 |
| Private visual fallback versions saved | 939 | 468 | 59 |
| New source-image text transcriptions | 0 | 0 | 2 |
| Newly certified structurally valid | 0 | 0 | 0 |
| Existing technically verified source keys | 2,340 | 1,972 | 4,252 |
| Canonical questions with provisional primary topic links | 200 | 108 | 776 |
| Academically approved imports | 0 | 0 | 0 |
| Rights-cleared imports | 0 | 0 | 0 |
| Published imports | 0 | 0 | 0 |
| Available imported questions in student tests | 0 | 0 | 0 |

The original 1,462 count refers to incomplete options. Four additional records have missing stems, making 1,466 records in this repair pass. They are not four corrupt-glyph detections.

The batch prepared 1,479 PNG source regions, including continuations, at 2x page resolution. Each image hash, PNG signature and dimensions were checked. Every repair preserves its source ID, section, source question number, year, paper label, page coordinates, key evidence and separate A-D selection identities. The new `repairVersions` array preserves original raw evidence. An audit entry records each automatic preparation without claiming human review or permission.

All 1,466 remain REVIEW_REQUIRED. Preparing a readable image fallback does not mean their text has been repaired or their scientific content certified. Public display still requires a separately reviewed presentation crop and actual rights clearance.

## Actual methods and sample comparisons

- Reused the coordinate extraction already stored for all 8,592 sources; PDFs were not reuploaded.
- Rendered each needed page once and copied multiple question regions from its page image. Existing completed crops are reused on reruns.
- Physics source example `ca830cb9-81ec-5398-ac28-702f928d38fe`: the four answer options are graphs. They are preserved as image content; no invented text or diagram code was generated.
- Chemistry source example `4e72bb5c-f4e9-5369-b992-75d19d4a82e5`: reaction and all four choices contain molecular structures. Their private source image is intact and still needs review.
- Biology `3ef8913d-0dca-5124-9111-1c6fa3361e83`: recovered the four ordered A/B/C/D sequences directly from the rendered source.
- Biology `1e4391e5-5ea7-5ca9-b859-72b7541aa229`: recovered the mammary-gland route options and arrows directly from the source. Both new transcriptions are agent source comparisons, not human academic approvals.

The failures arise because flat text omits scientific content drawn as images/vectors and interleaves spatial layouts. Rendering preserves that information; text recovery still requires source comparison or configured selective recognition. No STEM OCR service was configured or used in this pass.

## Working review paths

`/admin/question-review` opens the existing authenticated extraction workspace. It offers original regions, corrected-text preview, private image fallback with separate selectable A-D controls, text/option edits, presentation choice, source-review evidence, approve/reject/re-extract actions, Save and Next, and Alt+S save access key. Saved corrections now reload and flow into the academic-review form.

Linked academic review handles answer evidence, chapter, topics, prerequisites, difficulty and eligibility. Source permissions record the rights holder, license type, evidence, document reference, effective date, publication scope, reviewer identity and decision timestamp.

Import promotion rejects reprocessed content without extraction-quality approval. Text differing from its approved extraction requires repeat review. A reviewer-approved text reconstruction can advance despite an obsolete failed parser flag. Known diagram-dependent content retains the image-presentation requirement. Rights and academic gates remain intact.

The review workspace still has a bounded 100-record filter query and individual approvals. Full batch extraction certification, richer figure editing and comprehensive filter pagination remain unfinished. Existing batch publication is restricted to already reviewed and source-authorized records; it cannot create approvals.

## Jobs executed

1. Full-table backup and schema/migration preservation.
2. `python scripts/repair-incomplete.py`: 80 source hashes, 1,466 private fallback versions.
3. `npx tsx scripts/persist-repairs.ts`: 1,466 stored with audit history.
4. Persistence rerun: 0 new, 1,466 skipped, demonstrating version idempotency.
5. `npx tsx scripts/persist-transcriptions.ts`: 2 source-image transcriptions retained privately.
6. `npx tsx scripts/verify-repairs.ts`: all 1,479 image hashes and preserved database identities verified.
7. Real production-path Units pilot attempted through `availability` and `generateTest` against the live database.

## Real ten-question pilot

Configuration: Physics, active Class 11 Units and Measurements (`physics-school-11-1`), 10 questions, Learning, untimed, English, all exposure, Any Difficulty.

Actual availability: 0. Actual generation result: `Insufficient eligible questions. Requested 10; available 0.` The transaction produced no test ID, responses, score or result. No browser-local demo was substituted.

The database has eight previously approved original Units questions under the inactive legacy chapter `demo-units`, not ten questions under the active syllabus selection. Those original records were preserved and were not silently remapped or supplemented. A ten-question authorized, academically reviewed active-syllabus set is still required for a successful production acceptance pilot.

Third-party imports still require actual academic review and publication permission. All 80 sources requiring permission are listed in the source manifest; each PDF with defective regions is represented by source ID in `repairs.json`. Full NEET mocks remain unavailable because there is no sufficient approved authorized pool.

## Verification limits

TypeScript, lint, unit and PostgreSQL integration checks and a production build were run. The regression now checks that missing extraction approval blocks an otherwise licensed fixture and that a reviewed text repair can proceed despite an old technical-failure flag. Existing tests cover safe student payloads, topic selection, response persistence, scoring, mistake records and permission revocation.

The full bank has not received source-by-source human visual or academic certification. The new staff review actions have not been exercised end-to-end in a live authenticated staff browser. A successful production ten-question pilot and full-mock test are not claimed.
