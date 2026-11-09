# PYQ extraction pilot and paper reconciliation

## Scope and method

- Source: `ilovepdf_merged (1).pdf`, SHA-256 `f591b3778ee8993a6a74a61897085d253e153862b299a50dcc6dde5fe20b4a92`; all 1,110 pages scanned for paper covers and boundaries.
- Six supplied Class 11/12 syllabus PDFs were opened, hashed, and counted in `.local/pyq-ingest/manifest.json`. Their structural curriculum import and separate current NTA eligibility review remain outstanding.
- 20 source paper blocks were detected. Two are exact repeated 2023 blocks; 18 distinct papers were staged.
- 968 unique question/key/back pages have durable versioned checkpoints. The other pages are 18 distinct covers and 124 repeated-block pages.
- Extraction uses PyMuPDF text and coordinates. A SQLite staging database records source hash, paper identity, page, question number, four option fields, answer-key page, warnings, and checkpoints. Reruns use the same primary keys.
- This is an ExamGOAL compilation. A source-key match is a transcription match, not independent NTA answer validation or permission to publish.

| Supplied syllabus PDF | Pages | SHA-256 prefix |
|---|---:|---|
| `11_Physics_SYLLABUS_2026_27_EM.pdf` | 4 | `368bc656ab24` |
| `11_chemistry_SYLLABUS_2026_27_EM.pdf` | 5 | `76b3fc912819` |
| `11_Biology_SYLLABUS_2026_27_EM.pdf` | 6 | `2ac6c1faf169` |
| `12_Physics_SYLLABUS_2026_27_EM.pdf` | 4 | `ac35d8fb9210` |
| `12_chemitry_SYLLABUS_2026_27_EM.pdf` | 5 | `4c31078f2d1e` |
| `12_Biology_SYLLABUS_2026_27_EM.pdf` | 5 | `c1250b41dcb9` |

## Pilot against rendered PDF pages

Eight questions from five paper/year combinations were compared with their question crops and the answer-key page images. For every sample, the cover/footer, number, subject, and key row agreed with the paper context. The answer labels matched the visible compilation keys in **8/8** cases. **3/8** samples preserve the complete stem and four option texts without a meaning-changing formatting loss. This small, deliberately difficult sample is a diagnostic pilot, not a statistical estimate of collection-wide accuracy.

| Paper / question | Type | PDF page → key page | Text/options compared with page | Outcome |
|---|---|---:|---|---|
| NEET 2016 Phase 1 Q1 (key C) | Text Biology | 2 → 37 | Complete; four options in source order | Clean |
| NEET 2016 Phase 1 Q9 (key C) | Biology table | 3 → 37 | All four option words captured; table cells flattened | Layout review |
| NEET 2016 Phase 1 Q172 (key D) | Chemistry numerical | 35 → 38 | Four options captured; superscripts, minus signs and multiplication symbol lost | Math review |
| NEET 2016 Phase 1 Q178 (key A) | Physics numerical | 36 → 38 | Four options captured; inverse-second exponent lost | Math review |
| NEET 2019 Q95 (key D) | Chemical structures | 200 → 223 | Structure options A–D exist only as images; extracted option fields empty | Image review |
| NEET 2023 Q139 (key D) | Circuit diagram | 600 → 618 | Question and four labels captured; circuit image and µ in µF absent from text | Image and math review |
| NEET 2024 Q1 (key B) | Text Biology | 805 → 870 | Complete; four options in source order | Clean |
| NEET 2026 Q1 (key D) | Text Biology | 996 → 1050 | Complete; four options in source order | Clean |

Rendered sample crops are in `.local/pyq-ingest/review-crops/`; the six answer-key page images are in `.local/pyq-ingest/key-pages/`. The `pilot.json` file has exact extracted text and option fields with those source references.

## Systematic fixes applied before the final pass

1. Track section headings within a page and inline out-of-syllabus/subject labels. The initial pass misclassified a Chemistry question as Biology; the corrected sample is Chemistry.
2. Flag math notation for review where glyph extraction loses superscripts, signs, multiplication marks, or µ. Never reconstruct symbols by guessing.
3. Keep image-only questions in staging and flag them. A question crop preserves their visible source representation for manual transcription.
4. Exclude recurring tiled watermarks and footer QR images from per-question media detection. This removed a false media flag on every question.
5. Use paper identity plus source hash and question number as the staging key, and recognize the two repeated source blocks without duplicating their questions.

## Full-run totals

- Source-number coverage: **3,380/3,380 (100%)** across distinct papers; no missing numbers and no processing errors were recorded.
- Four nonempty extracted option fields: **2,813/3,380 (83.2%)**. This is structural completeness, not visual correctness.
- One unambiguous compilation key matched by paper and number: **3,370/3,380 (99.7%)**; **10** entries have multiple accepted options and require review.
- At least one extraction warning: **1,823/3,380 (53.9%)**. Warnings can overlap; unflagged rows have not received individual human verification.
- Source marked out of syllabus: **323**; source question type not single correct: **14**. These classifications remain excluded from publication pending separate academic review.
- Academic/rights/NEET syllabus approvals and student publication: **0**. No PYQ rows were added to the live question pool.

| # | Detected paper | Source pages | Expected | Staged | Four options | Single key | Multi key | Source OOS | Flagged | Status |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | NEET 2016 Phase 1 | 1–39 | 180 | 180 | 163 | 177 | 3 | 22/22 | 95 | All numbers present |
| 2 | NEET 2016 Phase 2 | 40–86 | 180 | 180 | 153 | 180 | 0 | 21/21 | 105 | All numbers present |
| 3 | NEET 2017 | 87–132 | 180 | 180 | 161 | 176 | 4 | 20/20 | 98 | All numbers present |
| 4 | NEET 2018 | 133–176 | 180 | 180 | 167 | 179 | 1 | 24/24 | 96 | All numbers present |
| 5 | NEET 2019 | 177–225 | 180 | 180 | 166 | 179 | 1 | 23/23 | 103 | All numbers present |
| 6 | NEET 2019 (Odisha) | 226–269 | 180 | 180 | 128 | 180 | 0 | 26/26 | 98 | All numbers present |
| 7 | NEET 2020 Phase 1 | 270–315 | 180 | 180 | 160 | 180 | 0 | 22/22 | 104 | All numbers present |
| 8 | NEET 2020 Phase 2 | 316–362 | 180 | 180 | 130 | 180 | 0 | 24/24 | 88 | All numbers present |
| 9 | NEET 2021 | 363–430 | 200 | 200 | 174 | 200 | 0 | 28/28 | 122 | All numbers present |
| 10 | NEET 2022 Phase 1 | 431–491 | 200 | 200 | 188 | 200 | 0 | 29/29 | 104 | All numbers present |
| 11 | NEET 2022 Phase 2 | 492–555 | 200 | 200 | 177 | 200 | 0 | 24/24 | 94 | All numbers present |
| 12 | NEET 2023 | 556–619 | 200 | 200 | 155 | 200 | 0 | 32/32 | 111 | All numbers present |
| 13 | NEET 2023 | 620–683 | 200 | 0 | 0 | 0 | 0 | — | 0 | Exact duplicate of block 12 |
| 14 | NEET 2023 Manipur | 684–743 | 200 | 200 | 162 | 200 | 0 | 28/28 | 125 | All numbers present |
| 15 | NEET 2023 Manipur | 744–803 | 200 | 0 | 0 | 0 | 0 | — | 0 | Exact duplicate of block 14 |
| 16 | NEET 2024 | 804–872 | 200 | 200 | 164 | 200 | 0 | 0/0 | 78 | All numbers present |
| 17 | NEET 2024 (Re-Examination) | 873–934 | 200 | 200 | 154 | 200 | 0 | 0/0 | 116 | All numbers present |
| 18 | NEET 2025 | 935–994 | 180 | 180 | 137 | 179 | 1 | 0/0 | 86 | All numbers present |
| 19 | NEET 2026 | 995–1052 | 180 | 180 | 141 | 180 | 0 | 0/0 | 92 | All numbers present |
| 20 | RE-NEET 2026 | 1053–1110 | 180 | 180 | 133 | 180 | 0 | 0/0 | 108 | All numbers present |

## Unresolved review queue

| Staging warning | Questions |
|---|---:|
| `OPTIONS_NOT_FOUND` | 564 |
| `QUESTION_HAS_EMBEDDED_IMAGE` | 353 |
| `MATH_NOTATION_REVIEW` | 864 |
| `POSSIBLE_MISSING_FORMULA` | 43 |
| `MULTILINE_OPTIONS_LAYOUT_REVIEW` | 243 |
| `MULTIPLE_OPTION_GROUPS` | 131 |
| `NON_SINGLE_CORRECT_TYPE` | 14 |
| `SOURCE_OUT_OF_SYLLABUS` | 323 |

Warnings overlap; a flagged row can appear in several categories. The queue is `review-queue.jsonl` and includes exact source paper and PDF page for each record.

- Image-only options, chemical structures, circuits and scientific diagrams require faithful transcription or approved image delivery. Original source crops have watermarks and require rights clearance.
- Formula and unit extraction needs direct visual review. Example: 2016 Phase 1 Q172 loses `m⁻³`, `mol⁻¹`, and `×10²³`; 2023 Q139 loses `µ` in `µF`.
- Table-shaped options may preserve words while losing cell relationships. Example: 2016 Phase 1 Q9.
- Multi-answer keys cannot be represented as one correct option without an explicit reviewed policy. Ten such records remain staged.
- Source subject labels marked `Out of syllabus` are preserved as source classifications; current NEET eligibility is a separate, unreviewed mapping.
- The staging database has no independently checked official NTA keys, reviewed explanations, rights approvals, school/NEET topic mapping, or published questions. It must not be used as an approved student question bank yet.

Machine-readable detail: `.local/pyq-ingest/manifest.json`, `reconciliation.json`, `pilot.json`, `review-queue.jsonl`, and `staging.sqlite3`.
