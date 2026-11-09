# Physics import audit

Captured: 2026-11-04T15:15:05.829Z. Scope: all 26 supplied Physics PYQ PDFs and both supplied Class 11/12 school syllabus PDFs.

## Outcome

Private extraction is reconciled. Publication is incomplete: 2,346 source questions remain pending, with zero academically approved, rights-cleared or test-eligible imported Physics questions. No real test could be generated from the live pool. Successful fixture tests are reported separately.

## Actual PostgreSQL counts

| Item | Count |
|---|---:|
| Source documents | 26 |
| Processed source pages | 652 |
| Private SourceQuestion records | 2346 |
| Source-key values matched | 2343 |
| QR-only unresolved keys | 3 |
| Verified answers | 0 |
| Reviewed topic mappings | 0 |
| Rights cleared | 0 |
| Published new Physics questions | 0 |
| Active school chapters | 28 |
| Active selectable topic clauses | 238 |
| Pending import jobs (STAGED) | 26 |

Question table also contains 18 approved original demonstration Physics records under inactive chapters and 36 archived Physics PYQs. Neither contributes to the current eligible pool. No source record was skipped or published automatically.

## Per-source reconciliation

All rows below have matching original/private-copy SHA-256 hashes, complete sequential numbering, matching exam labels, years, source pages and retained raw text, and zero duplicate source numbers or answer-value mismatches. `Matched` means a printed key was correctly associated; it does not mean an academic answer verification. All sources remain STAGED pending review.

| PDF group | Pages | Declared / stored | Matched keys | Unresolved |
|---|---:|---:|---:|---:|
| Semiconductor Electronics | 66 | 167 / 167 | 167 | 0 |
| Atoms and Nuclei | 39 | 192 / 192 | 192 | 0 |
| Dual Nature of Radiation and Matter | 32 | 122 / 122 | 121 | 1 |
| Geometrical Optics | 28 | 113 / 113 | 113 | 0 |
| Wave Optics | 14 | 59 / 59 | 59 | 0 |
| Current Electricity | 52 | 169 / 169 | 169 | 0 |
| Moving Charges and Magnetism | 32 | 108 / 108 | 108 | 0 |
| Electromagnetic Induction | 17 | 51 / 51 | 50 | 1 |
| Electromagnetic Waves | 15 | 53 / 53 | 53 | 0 |
| Alternating Current | 23 | 77 / 77 | 77 | 0 |
| Magnetism and Matter | 17 | 54 / 54 | 54 | 0 |
| Capacitor | 18 | 47 / 47 | 47 | 0 |
| Electrostatics | 29 | 94 / 94 | 94 | 0 |
| Vector Algebra | 4 | 3 / 3 | 3 | 0 |
| Motion in a Plane | 19 | 76 / 76 | 76 | 0 |
| Work, Energy and Power | 19 | 77 / 77 | 77 | 0 |
| Rotational Motion | 30 | 111 / 111 | 110 | 1 |
| Properties of Matter | 23 | 88 / 88 | 88 | 0 |
| Oscillations | 26 | 83 / 83 | 83 | 0 |
| Waves | 19 | 94 / 94 | 94 | 0 |
| Heat and Thermodynamics | 37 | 141 / 141 | 141 | 0 |
| Gravitation | 22 | 90 / 90 | 90 | 0 |
| Center of Mass and Collision | 16 | 54 / 54 | 54 | 0 |
| Laws of Motion | 21 | 77 / 77 | 77 | 0 |
| Motion in a Straight Line | 18 | 64 / 64 | 64 | 0 |
| Units & Measurement | 16 | 82 / 82 | 82 | 0 |

Printed-key association: 2,343/2,343 (100%). Key coverage across all source questions: 2,343/2,346 (99.87%). This is not a claim of 100% scientific, formula, diagram or academic accuracy. Exam variants are preserved exactly as supplied; the chapter compilations do not always identify original booklet codes.

## Unresolved keys

| Source | Question | Key page | Source entry |
|---|---:|---:|---|
| Dual Nature of Radiation and Matter | 100 | 30 | 100. Scan QR |
| Electromagnetic Induction | 39 | 16 | 39. Scan QR |
| Rotational Motion | 94 | 29 | 94. Scan QR |

The missing key-page evidence for these three records was repaired. Their answers remain null and REVIEW_REQUIRED; no QR-linked solutions were fetched or guessed.

## Syllabus reconciliation

Both school PDFs were read in full. All 14 chapters per class are present. Each chapter theory body matches retained source text after punctuation/whitespace normalization, and all source theory words are represented in the active selectable topic clauses. Some clauses contain more than one related concept; 238 is a selectable-clause count, not a count of distinct scientific concepts. School coverage does not establish NEET 2027 eligibility.

| Class | Chapter | Active topics | Available imported questions |
|---|---|---:|---:|
| 11 | Units And Measurements | 6 | 0 |
| 11 | Motion In A Straight-Line | 7 | 0 |
| 11 | Motion In A Plane | 12 | 0 |
| 11 | Laws Of Motion | 11 | 0 |
| 11 | Work, Energy And Power | 8 | 0 |
| 11 | System Of Particles And Rotational Motion | 10 | 0 |
| 11 | Gravitation | 5 | 0 |
| 11 | Mechanical Properties Of Solids | 8 | 0 |
| 11 | Mechanical Properties Of Fluids | 12 | 0 |
| 11 | Thermal Properties Of Matter | 15 | 0 |
| 11 | Thermodynamics | 9 | 0 |
| 11 | Kinetic Theory | 8 | 0 |
| 11 | Oscillations | 9 | 0 |
| 11 | Waves | 8 | 0 |
| 12 | Electric Charges And Fields | 12 | 0 |
| 12 | Electrostatic Potential And Capacitance | 11 | 0 |
| 12 | Current Electricity | 14 | 0 |
| 12 | Moving Charges And Magnetism | 7 | 0 |
| 12 | Magnetism And Matter | 8 | 0 |
| 12 | Electromagnetic Induction | 5 | 0 |
| 12 | Alternating Current | 9 | 0 |
| 12 | Electromagnetic Waves | 4 | 0 |
| 12 | Ray Optics And Optical Instruments | 13 | 0 |
| 12 | Wave Optics | 6 | 0 |
| 12 | Dual Nature Of Radiation And Matter | 5 | 0 |
| 12 | Atoms | 6 | 0 |
| 12 | Nuclei | 6 | 0 |
| 12 | Semiconductor Electronics: Materials, Devices And Simple Circuits | 4 | 0 |

## Real Custom Test Builder and HTTP checks

Selected Units and Measurements in full (6 topics); Motion in a Straight Line only uniformly accelerated motion and the velocity/position-time graphs and accelerated-motion relations clause (2 topics); Current Electricity in full (14 topics). Total resolved scope: exactly 22 IDs, with no extra topic. Requested a 22-question, 30-minute NEET-mode PYQ test, all years/exposures.

The browser retained precisely that selection and displayed 0 eligible approved questions. The authenticated live availability endpoint returned HTTP 200 with total=0; an actual POST to /api/tests returned HTTP 422, requested=22, available=0. There is no generated live question list whose topic containment can be certified. No test or attempt was created.

![Live selected coverage and zero availability](physics-audit-live-builder.png)

## 45-question Physics mock

The active PlatformSettings NEET_2027_PROVISIONAL policy requires 45 Physics questions, 22 from Class 11 and 23 from Class 12; +4/-1/0 scoring, 45-minute section duration, supply-weighted chapters with optional weights. This is an application policy, not an official NTA chapter weighting. Availability was 0; live generation returned HTTP 422: Physics Class 11: need 22 eligible questions; available 0. A live 45-question mock is not currently possible.

## Implementation regressions and checks

- Fixed full-chapter + select-all + deselect-one behavior so the removed topic cannot remain in an overlapping explicit selection.
- Fixed last-ten-available-years filtering: compute years after source, language, topic/prerequisite and exposure filters. A real PostgreSQL regression failed before the fix and passed afterward.
- Editing a published import now withdraws approvals and its live Question row atomically; frozen attempt snapshots are preserved.
- Retained explicit Scan QR key evidence in future extraction and repaired the three current records without guessing answers.
- Extended the shared publication gate to legacy paper-practice availability and generation; included in the final integration verification.

Physics verification: 41 unit tests, 20 isolated PostgreSQL integration tests and 5 Python extraction tests passed; TypeScript, lint and production build passed before the final shared legacy-endpoint edit. The isolated suite actually persisted an exact 22-topic mixed-class test and a 45-question Physics section with 22/23 class counts, excluded unselected concepts/prerequisites and withheld answer keys. Synthetic fixtures existed only in a separate _test database; they do not demonstrate live question availability.

## Integrity and remaining work

Production history was hashed before and after live requests: 12 Tests, 193 TestQuestion snapshots, 12 TestAttempts, 17 QuestionResponses, 10 analytics snapshots and 11 mistake records were unchanged. PostgreSQL reports zero unvalidated foreign-key constraints. Private evidence returned 401 anonymously and 403 to students. No valid new published questions exist, so per-published-question validation has an empty subject set, not a substantive academic pass.

All 2,346 records still need academic answer/render review, reviewed primary/prerequisite mapping, difficulty, current NEET eligibility and documented publication rights. There are 161 source-marked exclusions, 3 multiple-correct questions and 349 visual/formula candidates. These are preserved privately. Key matching alone does not satisfy publication requirements. Raw text can omit embedded formulas; source crops are retained, and each student-facing text/image presentation must be reviewed. Source images can contain solution QR links and require reviewed presentation crops before release.

Coverage and reconciliation details are machine-readable in physics-audit-results.json. Reproducible scripts: audit-physics-db.ts, audit-physics-sources.py, audit-physics-live.ts.
