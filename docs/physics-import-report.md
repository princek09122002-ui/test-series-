# Physics import report

{
  "sources": 26,
  "pages": 652,
  "detected": 2346,
  "stored": 2346,
  "keysMatched": 2343,
  "missingKeys": 3,
  "multipleCorrect": 3,
  "sourceOut": 161,
  "visualOrFormulaCandidates": 349,
  "mappingSuggestions": 1055,
  "reviewedMappings": 0,
  "academicallyApproved": 0,
  "rightsCleared": 0,
  "studentAvailable": 0,
  "reviewQueue": 2346
}

## Chapter availability
| Class | Chapter | Topics | Available imported questions |
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

All 238 Physics topics currently have zero published imported questions.

## Review and publication
All source records are private PostgreSQL staging. Keyword suggestions are not approved topic mappings. Source answer matching is not academic verification. Three source keys say Scan QR: Dual Nature Q100, Electromagnetic Induction Q39, Rotational Motion Q94. No external solutions were fetched or fabricated. Source exclusion classifications remain separate from NEET eligibility.

The official 2026 syllabus notice is at https://www.nta.ac.in/Download/Notice/Notice_20260108180635.pdf . The application 2027 configuration remains provisional and unverified.

## Implementation
SourceDocument and SourceQuestion retain hashes, source occurrences, private extraction, answer evidence, years, exams, suggestions and review metadata. ImportJob checkpoints each file; stable IDs and upserts prevent duplicates. Legacy merged-PDF archive remains untouched. Chemistry/Biology data was not imported.

## Quality limitations
The pilot was accepted for private staging only. Six source crops were visually inspected; this is not an academic accuracy percentage for 2,346 questions. Text drops formula images; original crops are retained and no raw text auto-publishes. Visual/formula candidates are not an exact diagram count. All records require individual review; no difficulty labels were academically assigned.

## Review workflow
Open /admin/imports as staff. Inspect original image and source-key evidence, assign chapter/topics/prerequisites and reviewed difficulty, and document eligibility and rights. Only an admin can publish. Image publication requires a reviewed QR-free crop at .local/physics-import/approved-media/<id>.png; the raw private source crop is never automatically copied to student media. Detailed explanations remain unavailable until separately reviewed.

## Physics selection
PHYSICS_SECTION reads the provisional database policy: 45 questions; 22 Class 11 and 23 Class 12, supply-weighted chapter coverage with optional chapter weights. This is an application policy, not official chapter weighting. Selection enforces difficulty quotas, complete topic/prerequisite scope, reviewed publication, supported type, source/year/exposure filters, stable seeded shuffle and unique questions. Missing supply fails explicitly. No complete 180-question mock is claimed.

## Commands
python scripts/physics_ingest.py --full (requires pilot record); npx tsx scripts/import-physics.ts; npx tsx scripts/verify-physics.ts. No importer runs on server startup.

## Verification
Type checking, unit and extraction tests, production build and authenticated HTTP checks are recorded in the completion response. This report is generated from the stored database counts.

## Completion checks
39 unit tests, 15 isolated PostgreSQL integration tests and 4 extraction tests passed. The production build and TypeScript checks passed. Live HTTP checks confirmed the complete builder, staff overview/detail/media access, anonymous 401 and student 403 for private media, zero imported availability and a 422 shortage for Physics generation. Browser review confirmed all 28 Physics chapters, topic expansion, zero-question labels and selection persistence across class filtering and the next step. Six pilot answer-key entries were visually matched (6/6); this is a spot-check, not whole-bank academic accuracy. Existing user/profile/test/result records were compared with the pre-import backup and are unchanged.
