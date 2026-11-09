# Pilot visual QA — preparation and access blocker

The 367-question visual QA milestone is **not complete**. Both attempts to access the existing review interface returned `Local browser use is disabled in Work settings`. The user's “ok” acknowledgement did not change that tool state. No claim of inspecting the 367 questions through the admin UI is made.

## Exact current counts

| Metric | Units and Measurements | Structure of Atom | Cell — The Unit of Life |
|---|---:|---:|---:|
| Total questions | 82 | 92 | 193 |
| Machine content-shape complete | 46 | 18 | 163 |
| Visually verified structurally complete | 0 | 0 | 0 |
| New extraction corrections in this pass | 0 | 0 | 0 |
| Confirmed missing diagrams | Not assessed | Not assessed | Not assessed |
| Source-answer keys matched | 82 | 92 | 192 |
| Topic mappings verified | 0 | 0 | 0 |
| Awaiting human decisions | 82 | 92 | 193 |
| Academically approved | 0 | 0 | 0 |
| Rights verified beyond owner declaration | 0 | 0 | 0 |
| Published | 0 | 0 | 0 |
| Student available | 0 | 0 | 0 |

“Machine content-shape complete” checks nonempty content blocks and excludes unresolved image fallbacks. It does not establish fidelity of equations, missing symbols, diagram components or meaning. No review status was promoted based on that count. Missing diagrams remain unassessed rather than being reported as zero.

## Work actually completed

- Created a consistent read-only backup of 46 public tables: `.local/backups/pre-biology-2026-11-07T14-14-44.645Z/database.json`.
- Reconciled current latest canonical pilot versions and source-review states, without reimporting PDFs or defining a new schema.
- Added pilot chapter navigation and Previous/Next controls to `/admin/question-review`.
- Separated content-shape checks from complete extraction/mapping/approval acceptance, preserving the existing acceptance gate.
- Generated `.local/pilot-qa/review-queue.jsonl`: one pilot record per line with exact outstanding decisions and its admin URL. All 367 legitimately need academic and rights review; source comparison remains undone.
- Generated `.local/pilot-qa/counts.json` from live database queries.
- Preserved the owner permission declarations. Tightened publication and availability so `OWNER_CHAT_DECLARATION` alone cannot satisfy rights verification even if an older raw column says CLEARED.
- Updated academic review to show the declaration accurately and disable publication while documentation review is pending.
- Added a database regression showing that owner-only declarations block both promotion and student availability for otherwise approved content.

## Reviewer route and exact actions

Open `/admin/question-review?chapter=physics-school-11-1`, `/admin/question-review?chapter=chemistry-school-11-2`, or `/admin/question-review?chapter=biology-school-11-8` as an authorized reviewer. Use chapter links and Previous/Next to cover every question.

1. Compare the original source region on the left with the structured presentation and all four options on the right. Include scientific notation, diagrams, table order and source year/paper label.
2. For a source-supported correction, use **Edit content blocks as a new immutable revision**, then **Validate and save new private revision**. This preserves the original version.
3. Follow **Correct extraction and compare media**. Save the exact source-comparison evidence; approve extraction only after all required symbols/options/media are checked. Uncertain records remain queued.
4. Follow **Academic, answer and syllabus review**. Verify the original key entry, chapter, primary/additional concepts, prerequisites, difficulty and eligibility. Use **Save review** while undecided. Do not mark ambiguous mappings verified.
5. Follow **Source licensing**. Review genuine documentation, rights holder, license/permission type, usage scope and effective date. Save a cleared source decision only after actual authorization review; the prior chat declaration remains in audit history.
6. After all requirements are met, an authorized admin can use **Approve and publish**. The publication service checks extraction review, source key, mapping, eligibility, rendering, duplicates, academic evidence and source authorization.

No ten-question test was attempted in this pass because the latest instruction permits it only when at least ten eligible questions exist; current availability is zero in each pilot chapter.

TypeScript, lint, unit and database integration checks were run. The browser access blocker prevents the requested live UI comparison and reviewer acceptance pass. A build/test result is not treated as visual or academic certification.
