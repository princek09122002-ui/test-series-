# Biology PYQ import and test generation audit

Captured 6 November 2026. This report describes the live local PostgreSQL database and private staging artifacts in `D:\neet`.

## Outcome

All **32 supplied Biology PYQ PDFs** were discovered, copied privately, extracted, and staged. Their 979 pages declare 4260 questions; the pipeline detected and stored 4260. Every source has a matching SHA-256, private copy, complete question-number sequence, and zero missing media. All 32 import jobs are `STAGED`; none is published.

The live approved Biology pool is **0**. All 4260 records remain `PENDING` academic review, `UNVERIFIED` for rights, and `UNVERIFIED` for NEET 2027 eligibility. This is a complete *private ingestion*, not a cleared student question bank. No imported answer key is sent to students before submission.

## Actual database counts

| Measure | Count |
| --- | ---: |
| Biology source documents / import jobs | 32 |
| PDF pages | 979 |
| Declared / staged questions | 4260 / 4260 |
| Source key matched / key review required | 4258 / 2 |
| Single correct / multiple correct | 4254 / 6 |
| Source tagged outside current syllabus | 41 |
| Possible image, symbol, table or layout review candidates | 632 |
| Source chapter suggestions / topic suggestions | 4260 / 1493 |
| Academic topic mappings reviewed | 0 |
| Published links / eligible Biology | 0 / 0 |
| Active school Biology chapters / topics | 38 / 445 |
| Unvalidated foreign keys | 0 |

The 632 visual candidates are a conservative review queue, **not** a verified diagram count. The 60 empty extracted text option fields across sources require original-page inspection; source crops are stored privately. Source key matching means a printed key was located and parsed, not that an academic reviewer has verified its correctness.

## Reconciliation by source PDF

Each row is `declared / detected / database staged`. The complete manifest includes hashes, exam labels, years, and additional checks. No source question text or answer key is included in public documentation.

| PDF topic | Pages | Questions | Key matched | Multiple | Source out | Visual candidates | Empty text options |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Anatomy of Flowering Plants | 27 | 129/129/129 | 129 | 0 | 1 | 4 | 0 |
| Animal Kingdom | 49 | 213/213/213 | 213 | 0 | 0 | 28 | 2 |
| Biodiversity and Conservation | 24 | 108/108/108 | 108 | 0 | 0 | 8 | 0 |
| Biological Classification | 34 | 177/177/177 | 177 | 0 | 0 | 16 | 1 |
| Biomolecules Previous Year Questions with Answer Key (1).pdf | 39 | 143/143/143 | 143 | 0 | 11 | 33 | 2 |
| Biotechnology and It's Applications | 22 | 97/97/97 | 97 | 0 | 0 | 10 | 1 |
| Biotechnology Principles and Processes | 33 | 137/137/137 | 137 | 0 | 0 | 20 | 2 |
| Body Fluids and Its Circulation | 27 | 113/113/113 | 113 | 0 | 2 | 25 | 1 |
| Breathing and Exchange of Gases | 21 | 74/74/74 | 74 | 0 | 0 | 17 | 1 |
| Cell - The Unit of Life | 43 | 193/193/193 | 192 | 0 | 0 | 30 | 2 |
| Cell Cycle and Cell Division | 27 | 105/105/105 | 105 | 0 | 0 | 23 | 0 |
| Chemical Coordination and Integration | 30 | 111/111/111 | 111 | 0 | 1 | 24 | 0 |
| Ecosystem | 27 | 111/111/111 | 110 | 0 | 0 | 18 | 4 |
| Evolution | 40 | 187/187/187 | 187 | 1 | 0 | 18 | 2 |
| Excretory Products and Their Elimination | 20 | 71/71/71 | 71 | 0 | 0 | 15 | 2 |
| Human Health and Diseases | 40 | 178/178/178 | 178 | 0 | 0 | 27 | 3 |
| Human Reproduction | 35 | 148/148/148 | 148 | 0 | 0 | 22 | 2 |
| Locomotion and Movement | 22 | 79/79/79 | 79 | 1 | 0 | 23 | 0 |
| Microbes in Human Welfare | 23 | 102/102/102 | 102 | 0 | 0 | 12 | 1 |
| Molecular Basis of Inheritance | 52 | 255/255/255 | 255 | 1 | 0 | 31 | 1 |
| Morphology of Flowering Plants | 41 | 160/160/160 | 160 | 0 | 0 | 29 | 8 |
| Neural Control and Coordination | 21 | 82/82/82 | 82 | 0 | 26 | 14 | 0 |
| Organisms and Populations | 30 | 120/120/120 | 120 | 0 | 0 | 25 | 4 |
| Photosynthesis in Higher Plants | 27 | 125/125/125 | 125 | 0 | 0 | 41 | 4 |
| Plant Growth and Development | 24 | 131/131/131 | 131 | 1 | 0 | 8 | 1 |
| Plant Kingdom | 36 | 174/174/174 | 174 | 0 | 0 | 13 | 1 |
| Principles of Inheritance and Variation | 56 | 269/269/269 | 269 | 0 | 0 | 33 | 9 |
| Reproductive Health | 20 | 72/72/72 | 72 | 2 | 0 | 11 | 1 |
| Respiration in Plants | 17 | 74/74/74 | 74 | 0 | 0 | 23 | 3 |
| Sexual Reproduction in Flowering Plants | 33 | 167/167/167 | 167 | 0 | 0 | 10 | 1 |
| Structural Organisation in Animals | 28 | 117/117/117 | 117 | 0 | 0 | 18 | 0 |
| The Living World | 11 | 38/38/38 | 38 | 0 | 0 | 3 | 0 |

Every source has zero missing media, zero sequence gaps, and zero reconciliation mismatches. The private `source-reconciliation.json` records the per-file checks.

## Syllabus provenance

Both supplied Class 11/12 school syllabus PDFs were read in full. The database contains 19 Class 11 and 13 Class 12 theory chapters, plus formative, practical, and project scopes: 38 active chapters and 445 topics/subtopics in total. Each row retains its source PDF page reference. The old Biology demo chapters were deactivated; Physics and Chemistry syllabus rows were preserved. School coverage does not establish NEET 2027 eligibility, so all new Biology topics remain `UNVERIFIED`.

| Class | Chapter / scope | Topics | Source page |
| --- | --- | ---: | --- |
| 11 | The Living World | 6 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=1 |
| 11 | Biological Classification | 9 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=1 |
| 11 | Plant Kingdom | 7 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=1 |
| 11 | Animal Kingdom | 4 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=1 |
| 11 | Morphology of Flowering Plants | 9 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=2 |
| 11 | Anatomy of Flowering Plants | 3 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=2 |
| 11 | Structural Organization in Animals | 6 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=2 |
| 11 | Cell - The Unit of Life | 27 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=2 |
| 11 | Biomolecules | 7 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=2 |
| 11 | Cell Cycle and Cell Division | 4 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=2 |
| 11 | Photosynthesis in Higher Plants | 16 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=3 |
| 11 | Respiration in Plants | 11 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=3 |
| 11 | Plant Growth and Development | 16 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=3 |
| 11 | Breathing and Exchange of Gases | 11 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=4 |
| 11 | Body Fluids and Circulation | 15 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=4 |
| 11 | Excretory Products and Their Elimination | 15 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=4 |
| 11 | Locomotion and Movement | 11 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=4 |
| 11 | Neural Control and Coordination | 9 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=4 |
| 11 | Chemical Coordination and Integration | 14 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=4 |
| 11 | Digestion and Absorption (formative only) | 15 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=5 |
| 11 | Biology Practicals | 20 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=5 |
| 11 | Biology Investigatory Project | 1 | 11_Biology_SYLLABUS_2026_27_EM.pdf#page=5 |
| 12 | Sexual Reproduction in Flowering Plants | 22 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=1 |
| 12 | Human Reproduction | 16 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=1 |
| 12 | Reproductive Health | 13 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=1 |
| 12 | Principles of Inheritance and Variation | 22 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=2 |
| 12 | Molecular Basis of Inheritance | 15 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=2 |
| 12 | Evolution | 15 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=2 |
| 12 | Human Health and Diseases | 19 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=2 |
| 12 | Microbes in Human Welfare | 9 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=2 |
| 12 | Biotechnology - Principles and Processes | 3 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=3 |
| 12 | Biotechnology and its Application | 13 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=3 |
| 12 | Organisms and Populations | 10 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=3 |
| 12 | Ecosystem | 11 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=3 |
| 12 | Biodiversity and its Conservation | 17 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=3 |
| 12 | Environmental Issues (formative only) | 7 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=4 |
| 12 | Biology Practicals | 16 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=4 |
| 12 | Biology Investigatory Project | 1 | 12_Biology_SYLLABUS_2026_27_EM.pdf#page=4 |

## Pilot and unresolved review

A 14-question cross-topic pilot compared original PDF page images with extracted stems, options, exam labels, question numbers, and printed key evidence. It covered plain text, numerical/symbol content, match tables, assertion format, multiple-correct format, and source-out content. The pilot accepted private staging only: academic approvals 0, rights clearances 0.

1. `Cell - The Unit of Life`, question 176, key page 42: printed key says `Scan QR`; the answer remains null and needs source/academic review.
2. `Ecosystem`, question 75, key page 26: source uses numeric answer `1` and numbered options; mapped only as a staged candidate and requires visual confirmation.
3. Six multiple-correct source items require separate editorial handling because the current single-answer test generator must not admit them.
4. Review 632 potential nontext/layout candidates against private page crops; 60 have empty text option fields. Keep diagram/table questions as original cropped images with options once rights are cleared.
5. Review source chapter suggestions and 1,493 topic suggestions. No suggested mapping is treated as academically approved.
6. Obtain publication rights and verify actual NEET 2027 syllabus eligibility before publishing any item. Some source pages carry third-party branding; possession of a PDF does not establish display rights.

## Test generation verification

The provisional blueprint is **45 Physics + 45 Chemistry + 90 Biology = 180 questions**, 180 minutes, +4/−1/0, maximum 720. Its Class 11/12 and Botany/Zoology/Mixed allocations are configurable planning values, not official chapter or category weights.

An isolated integration fixture with 180 approved questions generated an exact Biology 90 section and a full 180-question mock. It verified section allocation, selected-topic filtering, time/marks, answer withholding from the student payload, and server-side scoring. The browser check against the live database reported `Physics: need 45, available 0`, `Chemistry: need 45, available 0`, `Biology: need 90, available 0`; `Generate & start test` was disabled. A **real live mock cannot be generated yet** because no approved source question meets the publication gate.

Checks completed: TypeScript typecheck, ESLint, production Next.js build, 49 unit tests, 30 integration tests, and 23 Python tests. HTTP home/auth routes returned 200 after rebuild and server restart. The Biology chapter tree and live shortage message were verified in the signed-in browser.

## Safety and repeatability

A 43-table database backup was created before import at `.local/backups/pre-biology-2026-11-06T07-29-46.421Z/database.json`. Re-running the pipeline kept 4260 staged questions and the same record hash `8c32bc9184714ac1d8c24d3f6c85acc9aa7747666be72eff14c91ed8effed528`; it did not duplicate records or publish questions.

Protected row counts remained unchanged: 236 existing questions, 944 options, 12 tests, 12 attempts, 193 test questions, 17 responses, 11 analytics snapshots, 11 mistake records, 4 users and profiles, 99 Physics/Chemistry chapters, 540 topics, 48 source documents, and 4,332 source questions. PostgreSQL reported zero unvalidated foreign keys. No import or seed runs automatically on server restart.

## Next release gate

Human academic review must confirm every stem, four options, printed answer, question year/variant, topic, NEET scope, and image crop. Rights evidence must be recorded. Only then can individual records be approved and published; the existing server-side eligibility gate excludes all pending items from student tests.
