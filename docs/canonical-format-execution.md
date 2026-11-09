# Structured assessment format — execution results

## Implemented and executed

- Version 1.0 JSON Schema, Zod/TypeScript contract and semantic validator.
- Separate text, LaTeX, image, list and table blocks; four stable option IDs and server-side answer IDs.
- Chapter/subject-partitioned JSONL, streamed validation/import, source-media manifest, exception queue and content-hash duplicate report.
- Additive relational `CanonicalQuestionRecord`, `CanonicalQuestionOption` and `CanonicalQuestionTopic` tables. Source identities and existing Question drafts remain intact.
- Transactional imports, immutable versions, idempotent reimports, source-answer checks, syllabus relationships and rejection of import-supplied approvals/publication.
- `/admin/question-review` displays private source regions and structured presentation, stable selectable options, provenance, review states and an immutable JSON revision editor. Existing linked extraction/academic/source-permission forms remain the review actions.
- Reviewed publication now fills a safe structured-content field on the published Question projection. Test snapshots and ExamPlayer consume structured blocks when present and retain compatibility with old snapshots. Correct answer IDs and source-key evidence are excluded from student content.

## Actual pilot

| Chapter | Converted, validated and imported privately |
|---|---:|
| Physics — Units and Measurements | 82 |
| Chemistry — Structure of Atom | 92 |
| Biology — Cell — The Unit of Life | 193 |
| Total | 367 |

Pilot reimport: 367 processed, 0 inserted. A real live-database ten-question Units generation attempt returned `Requested 10; available 0`. No successful production test ID, submitted score or student result was created. This remains an acceptance blocker, not a successful end-to-end pilot.

## Full private conversion

All 80 existing sources were converted without reuploading PDFs. The full private conversion was continued to retain unresolved records in the new format, despite the production acceptance pilot remaining blocked.

| Result | Actual count |
|---|---:|
| Source questions converted to schema-valid JSONL | 8,592 |
| Versioned PostgreSQL records | 8,592 |
| Relational option rows | 34,368 |
| Provisional topic relationships | 1,084 |
| Verified topic mappings | 0 |
| Source-matched, normalized answer keys | 8,564 |
| Questions passing complete structural/review acceptance | 0 |
| Questions requiring review | 8,592 |
| Possible duplicate-content matches | 60 |
| Academically approved imports | 0 |
| Owner-attested permission records | 8,592 |
| Independently verified rights in this pass | 0 |
| Published/student-available imported questions | 0 |

The 34,368 option rows include explicitly empty unresolved content. Their presence does not prove option completeness. The previous 1,466 private image fallback repairs and source-grounded transcription evidence were retained. This pass did not perform new STEM OCR or certify those repairs. Private media stays unavailable to students.

The owner confirmed permission in chat. The format records this as OWNER_ATTESTED, distinct from independently verified licensing. No permission or academic approval was invented. Missing chapter candidates remain null, not fabricated mappings; 569 Physics and 19 Chemistry records lack a unique canonical chapter.

## Artifacts and commands

- `docs/question-format.schema.json`: generated JSON Schema.
- `docs/question.sample.jsonl`: one real source-backed question record with its unresolved states preserved.
- `docs/simple-mcq-template.csv`: simple-entry preparation template (a CSV upload service is not implemented).
- `docs/question-format.md`: contract, state and import documentation.
- `.local/canonical-format/pilot/manifest.json`: pilot partitions and counts.
- `.local/canonical-format/full/manifest.json`: full JSONL partitions and duplicate candidates.
- `.local/canonical-format/full/exceptions.jsonl`: unresolved records.
- `.local/canonical-format/full/media.jsonl`: private source-media manifest.
- `.local/canonical-format/database-report.json`: actual database reconciliation by subject/chapter.

`npx tsx scripts/canonical-pipeline.ts convert --pilot`

`npx tsx scripts/canonical-pipeline.ts validate --pilot`

`npx tsx scripts/canonical-pipeline.ts import --pilot`

Omit `--pilot` for the full bank. JSONL validation streams each complete line; it does not load a giant question array. `importCanonicalQuestion` is the reusable server import service.

## Verification and limits

TypeScript and targeted lint passed. Unit tests: 57 passed. Isolated PostgreSQL integration tests: 32 passed, including transactional private import, version immutability, idempotency, provenance/answer rejection and publication blocking. Renderer tests verified math output, table order, escaping and withholding private images. Production build was run.

No live staff-browser visual comparison or completed reviewer decisions were fabricated. The new preview and editor still need a real authenticated reviewer acceptance pass. Complex per-option figure reconstruction, full-bank visual certification and the requested successful ten-question student test remain unfinished.

The runtime bank remains a published PostgreSQL projection of reviewed content. Importing schema-valid private records does not change student availability. A successful production pilot requires ten actual approved active-syllabus questions; the existing original Units set contains only eight questions under an inactive legacy chapter.

Backup before the migrations: `.local/backups/pre-biology-2026-11-07T13-14-29.278Z/database.json`. Existing migrations were not rewritten; two new additive migrations introduced storage and the structured runtime field.
