# Syllabus correction status

## Verified root cause
The active Illustrative NEET 2026 development syllabus contains 9 chapters and 29 topics. syllabusFor queries active syllabus records without limits or question-existence filtering. The six uploaded school syllabuses were not imported. The PYQ archive has 54 source-paper/subject containers and zero topics.

## Changes
- Class and subject view filters no longer erase topic or full-chapter selections in test-builder.tsx.
- scripts/extract-syllabus.py produces private staged JSON with source filename, SHA256, page, unit, chapter and original theory text.
- All 79 numbered theory chapter headings detected: Physics 14/14, Chemistry 9/10, Biology 19/13 (Class 11/12).
- Typecheck and 25 existing unit tests passed.

## Not complete / not deployed
The staged extraction is NOT a validated or published complete syllabus. Formative-only sections need inclusion, wrapped headings need joining, and topic segmentation needs review. No syllabus activation or question remapping has been performed. The running production build is unchanged.

## Remaining work
1. Validate theory extraction against rendered pages, including formative-only and excluded content.
2. Add auditable units and explicit unverified NEET eligibility; migrate and import idempotently.
3. Share eligibility-aware counts with generation, preserving zero-question entries.
4. Correct scope select/deselect controls and test selection persistence and search.
5. Build a human-review classification pipeline for unmapped PYQs without automatic publication of guesses.
6. Add required integration/browser tests, run production build, restart and verify UI.
