# Live question availability audit — 6 November 2026

## Root cause

The running Next.js application and the import scripts use `D:\neet\.env` and the same PostgreSQL database: `localhost:55432/neet_adaptive_utf8`, schema `public`. No database mismatch was found. All 80 supplied chapter PDF files still exist in Downloads, and 8,592 extracted source questions are in PostgreSQL `SourceQuestion`, not merely temporary JSON.

The importers intentionally stop at private staging. None of the 8,592 `SourceQuestion` rows has a linked `Question` row, academically verified answer, approved review, cleared rights, or verified NEET 2027 eligibility. The 236 existing `Question` rows are 68 illustrative demo questions on inactive demo chapters and 168 inactive archive questions without topic mappings. School syllabus chapters are active but contain zero published mapped questions. This is why `src/lib/services/syllabus.ts` and `src/lib/services/testing.ts` return zero for all selected school chapters. The rights/academic gate in `src/lib/services/publication.ts` is working as intended and was not relaxed.

The active syllabus version is `demo-syllabus-2026` (`demo=true`) even though school Physics, Chemistry and Biology chapter trees were imported into it. That warning is truthful. Old demo question mappings reference inactive demo chapter/topic IDs. No verified cross-version concept mapping exists for moving those questions to school topics; they remain excluded. The `pyq-archive` version is inactive. The `NEET_2027_PROVISIONAL` blueprint is configuration, not an official NTA syllabus approval.

## Database stages

Physics `SourceDocument.metadata` lacks an explicit subject field; the application's importer classifies those 26 records as Physics by its existing fallback. The raw SQL audit labels them `UNKNOWN` for that reason. They are the 26 Physics sources in the Physics manifest. No source records were relabeled or deleted.

| Metric | Physics | Chemistry | Biology |
| --- | ---: | ---: | ---: |
| Source PDFs registered and still present | 26 | 22 | 32 |
| Import jobs, all `STAGED` | 26 | 22 | 32 |
| Completed / failed jobs | 0 / 0 | 0 / 0 | 0 / 0 |
| Extracted questions in `SourceQuestion` | 2,346 | 1,986 | 4,260 |
| Printed key matched, **not** academically verified | 2,343 | 1,984 | 4,258 |
| Imported source answers academically verified | 0 | 0 | 0 |
| Imported source questions linked to main `Question` | 0 | 0 | 0 |
| Existing main `Question` rows, demo + archive | 54 | 91 | 91 |
| Existing main rows with four nonempty options / key | 54 / 54 | 91 / 91 | 91 / 91 |
| Existing main rows mapped to a topic | 18 | 34 | 16 |
| Imported questions with verified chapter/topic mapping | 0 / 0 | 0 / 0 | 0 / 0 |
| Imported academic approvals | 0 | 0 | 0 |
| Imported rights clearances | 0 | 0 | 0 |
| Imported NEET 2027 eligibility approvals | 0 | 0 | 0 |
| Imported published questions | 0 | 0 | 0 |
| Available for current student tests | **0** | **0** | **0** |

The 18/34/16 topic-mapped main rows are illustrative demo content on inactive chapters, not the imported PDFs. All 80 jobs are staged for human review. The 3/2/2 unmatched or ambiguous printed-key cases, visual content, source year/variant, concept mapping, and rights evidence remain review tasks. Staged chapter/topic suggestions are not approvals.

## Filter trace

The student path is `TestBuilder` → `POST /api/tests/availability` → `availability()` → `preparePool()` → `eligibleBankWhere` → PostgreSQL `Question`. The same `preparePool()` is called by `generateTest()`.

| Stage | Physics | Chemistry | Biology |
| --- | ---: | ---: | ---: |
| Main `Question` rows | 54 | 91 | 91 |
| Active rows | 18 | 34 | 16 |
| Active and approved | 18 | 34 | 16 |
| Single-correct and publication gate, before syllabus check | 18 | 34 | 16 |
| Active current syllabus chapter **and** mapped active topic | **0** | **0** | **0** |
| Final service pool for full syllabus | **0** | **0** | **0** |

The nonzero publication-gate rows are unlinked original demo questions, not imported PYQs. All are attached to inactive demo chapters. The student service also checks selection, prerequisites, language, source/year, exposure, and content-hash deduplication. Those later filters do not cause this zero; the pool is already empty at the syllabus/topic stage. No staged answer is returned to student APIs.

## Live availability service checks

These numbers came from the actual `availability()` Prisma service using the live database and an existing user. All checks used the default English language and all exposure states; the questions are unavailable before year, difficulty, or attempted filters matter.

| Selection | Available |
| --- | ---: |
| Physics Class 11: Units And Measurements, full chapter | 0 |
| Physics Class 11: Motion In A Straight-Line, full chapter | 0 |
| Physics Class 12: Current Electricity, full chapter | 0 |
| Chemistry Class 11: Some Basic Concepts of Chemistry, full chapter | 0 |
| Chemistry Class 11: Structure of Atom, full chapter | 0 |
| Chemistry Class 12: Electrochemistry, full chapter | 0 |
| Chemistry: Bohr's Model for Hydrogen Atom topic | 0 |
| Chemistry: Nernst Equation topic | 0 |
| Biology Class 11: Cell - The Unit of Life, full chapter | 0 |
| Biology Class 12: Molecular Basis of Inheritance, full chapter | 0 |

| Live generation request | Result | Reason |
| --- | --- | --- |
| Physics custom selection A | BLOCKED | All three selected school chapters have 0 eligible questions. |
| Chemistry custom selection B | BLOCKED | Both chapters and the Bohr/Nernst selected topics have 0 eligible questions. |
| Biology custom selection C | BLOCKED | Both selected chapters have 0 eligible questions. |
| Mixed-subject selection D | BLOCKED | All three subject pools are empty. |
| Physics 45-question section | BLOCKED | Class 11 needs 22, available 0; Class 12 needs 23, available 0. |
| Chemistry 45-question section | BLOCKED | All six provisional class/category quotas lack approved questions. |
| Biology 90-question section | BLOCKED | All six provisional class/category quotas lack approved questions. |
| Full 180-question mock | BLOCKED | Physics needs 45/available 0; Chemistry 45/0; Biology 90/0. |

No live test session was created, because doing so would require unverified content. Isolated integration tests use explicitly test-only approved fixtures and verify selection, mixed-subject allocation, no duplicate questions, withheld answers, persisted attempts, scoring, and the provisional 45/45/90 mock. These fixture results are **not** presented as live production availability.

## Repairs made

- `src/components/test-builder.tsx`: labels the configured count as **Requested questions**, shows the server-checked **Available for this selection** count, calls availability automatically on entering review, displays the exact zero-availability message, and labels the score as possible only if a test is generated. Generate stays disabled when the pool or quotas are insufficient. Topic counts say they precede year/exposure/test filters.
- `src/lib/services/syllabus.ts`: provides a chapter-level unique approved-question count instead of summing topic counts; topics and chapter counts remain zero for the current school tree.
- `src/lib/services/testing.ts`: Physics section availability now reports its Class 11/12 shortage, matching the generator's existing coverage policy.
- `tests/integration/physics-selection.test.ts`: checks Physics shortage before sufficient approved test-only fixtures and no shortage afterward.
- `scripts/audit-availability-live.ts`: read-only live service check for the requested chapters/topics and sections.

No migration or data deletion was performed. The academic, answer, eligibility, and rights filters remain intact. No fake questions or hardcoded available counts were added.

## Verification

TypeScript typecheck passed. ESLint passed for the modified UI/syllabus files. The production build passed and the local site was restarted. Unit tests: **49/49 passed**. Isolated database integration tests: **30/30 passed**. In the signed-in browser, the updated page showed zero approved chapter counts, automatically checked live availability on review, displayed `No verified questions are currently available for this selection`, and kept **Generate & start test** disabled. The HTTP homepage and test-builder route responded successfully after restart.

## Work still required before student tests can use imported PYQs

Academic reviewers must verify the PDF stem and four options against the source page, answer key, exam/year variant, chapter, topics, prerequisites, render mode, and source scope. Rights evidence and the relevant NEET syllabus eligibility must then be recorded per source/question. The existing admin import review page can publish individual cleared items into `Question`; at present none meets those gates. A claimed live 45/45/90 mock would be false until enough cleared questions cover its provisional quotas.
