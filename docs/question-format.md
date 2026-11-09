# Canonical assessment question contract 1.0

The authoritative validation model is `src/lib/domain/canonical-question.ts`. The generated `docs/question-format.schema.json` describes its JSON shape. Zod also checks answer references, option identity uniqueness and A-D order; consumers must run the JSONL validator, not only a generic JSON Schema validator.

Every JSONL line is one complete question. Exports are partitioned by subject and canonical chapter; unmapped content goes to `unmapped.jsonl`. `manifest.json` lists files and possible content duplicates. `exceptions.jsonl` lists defects without discarding their source records. `media.jsonl` lists private source evidence references. `simple-mcq-template.csv` is the entry template for simple questions; rich questions require JSONL. Topic ID lists use a semicolon separator in the CSV template.

Blocks are `text`, `latex`, `image`, `table` or `list`. Four stable option IDs belong to each source question. `correctAnswerIds` refers to those IDs and stays server-side. Empty content is permitted in an unresolved source record so defects are preserved; it fails structural acceptance. Tables preserve cell order. Images have explicit visibility and verification. Only authenticated local media URLs are accepted. Extracted HTML is never rendered. KaTeX uses trust=false.

Source identity includes document hash, original question ID/number, section, exam year, paper label, pages and key evidence. Academic review, extraction review, answer verification, mapping, eligibility, editorial difficulty, permission and publication remain independent. OWNER_ATTESTED means the owner's chat declaration was recorded; it does not claim independent licensing verification.

Run `npx tsx scripts/canonical-pipeline.ts convert --pilot`, then `validate --pilot` and `import --pilot` for the three pilot chapters. Omit `--pilot` for the full source bank. JSONL is streamed one line at a time. The importer uses transactions to create a version, four option rows and topic relationships. Reimporting an identical version is a no-op. Changing a version in place is rejected; increment contentVersion for changes. Related chapter/subject/syllabus and topic identities are validated against PostgreSQL. Duplicate content hashes are reported and never silently erase source occurrences.

Imports are private even when records are schema-valid. Approval claims are checked against existing source-review states. Public generation continues through the reviewed Question pool and source permission gate; structured content is attached only through approved publication. Existing historical snapshots remain valid.

The CSV is a documented preparation template, not a rich-content interchange format or an implemented CSV upload endpoint. Do not use it to guess missing notation. The JSONL importer is the implemented import contract.
