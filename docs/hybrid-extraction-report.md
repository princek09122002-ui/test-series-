# Hybrid extraction execution — 2026-11-07

## Measured results

| Measure | Actual result |
|---|---:|
| Available cached source PDFs opened and hash checked | 80 |
| Missing source PDFs | 0 |
| Independently detected question markers | 8,592 |
| Existing staged identities preserved | 8,592 |
| Coordinate regions generated | 8,592 |
| Visually certified segmentations | Not measured for the full bank |
| Records with four nonblank staged text options | 7,130 |
| Records with incomplete staged text options | 1,462 |
| Unambiguous raw source-key associations | 8,586 |
| Ambiguous or missing source-key associations | 6 |
| Visual-content candidates (includes formulae and structures) | 2,311 |
| Corrupted diagrams | Not measured; visual review required |
| Exact missing-symbol count | Not measured; visual review required |
| Questions requiring extraction review | 8,592 |
| Automatically certified CONTENT_VALIDATED | 0 |
| Versioned extraction records saved to PostgreSQL | 8,592 |
| Academically approved imports | 0 |
| Rights-cleared imports | 0 |
| Published imports | 0 |
| Student-available imports | 0 |

An unambiguous raw key association is not equivalent to a verified normalized answer. Numeric keys, multiple-correct keys and academic correctness still need explicit review. Coordinate segmentation counts establish that regions were found, not that every diagram or continuation was visually checked.

## Real pilot and visual comparison

The pilot processed three PDFs and 285 question regions. Its staged text had four nonblank options in 229 records; 56 were incomplete. Three question crops were actually inspected visually:

| Sample | Before | Source-grounded reconstruction |
|---|---|---|
| Physics, Alternating Current, Q1, RE-NEET 2026 | Voltage equation and L/C/R values absent; options intact | Equation and component values transcribed from the crop into private reconstructed content |
| Chemistry, Alcohol/Phenols/Ethers source, Q1, RE-NEET 2026 | Four compound formulae and all options absent | Formulae and all options transcribed from the crop into private reconstructed content |
| Biology, Anatomy source, Q1, NEET 2026 | Stem and four options matched the crop | No transcription change needed |

Only one of these three original text presentations was complete. Two source-grounded private reconstructions were saved. This small targeted sample cannot establish overall extraction accuracy. It does not cover every requested layout category. No human academic review or rights approval was recorded.

## Storage and review model

Existing raw extraction stays in `SourceQuestion.extracted`. The new `hybridVersions` array stores extraction version, immutable source hash/identity, paper label, question section, page coordinates, word boxes, character boxes and font sizes, image boxes, raw source-key evidence, structured stem/options, warnings and separate review states. Every inserted version has an automated audit entry. Repeating the persistence job skips an already stored version.

High-resolution source crops are private. The pilot crops were rendered; remaining crops render on demand from saved coordinates. They retain the original source QR links for internal inspection and are never student media. Student crops still require independent presentation and rights approval.

`/admin/extraction-review` provides source/subject/issue filtering, two-column source and text comparison, text/option correction, extraction approval, rejection, re-extraction requests, and save-and-next. Saves append review history, audit the reviewer and invalidate existing publication approval. A separate extraction-quality approval is required by the import publication service.

## Executed jobs and checks

- `python scripts/hybrid_extract.py --pilot`: 3 PDFs, 285 records.
- `python scripts/hybrid_extract.py`: 80 PDFs, 8,592 records.
- `npx tsx scripts/persist-hybrid.ts`: 8,592 versioned records stored.
- `npx tsx scripts/verify-hybrid.ts`: 8,592 unique identities, valid region bounds and preserved source identity/raw stem fields.
- TypeScript and lint passed.
- Unit suite: 50 passed.
- Isolated PostgreSQL integration suite: 31 passed.
- Production build passed; server restarted on port 3000.

## Work still required for the complete requested system

This is a coordinate-evidence and review foundation, not a completed certified extraction system. The structured transcription still begins with the existing text except for the two visually repaired pilot examples. Automated STEM OCR has not been configured or run. Exact corruption, diagram fidelity, symbol accuracy and complete gold-set accuracy remain unmeasured.

The requested comprehensive gold set (including genetic crosses, assertion/reason, reaction schemes and images inside options), rich table/figure editing, diagram attachment editing, keyboard shortcuts, full review pagination and batch approval workflows are not complete. The current review page uses a bounded 100-record query. Per-topic mappings were preserved; no new academic topic mapping was certified.

The existing database uniqueness constraint `(sourceId, sourceNumber)` also remains. The new extraction records track section and flag duplicate markers rather than merging them, but a future migration is still needed to admit genuinely reused question numbers across sections as separate canonical source records.

No current-NEET eligibility, academic approval or third-party rights were inferred from a successful parser run. Publication remains blocked until actual reviews and permissions are recorded.
