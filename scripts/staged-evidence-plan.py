"""Read-only, repeatable PDF key and text-readiness reconciliation."""
import collections
import json
import re
from pathlib import Path
import pymupdf

ROOT = Path(r"D:\neet")
OUT = Path(__file__).with_name("staged-evidence-plan.json")
ISSUES = {
    "VISUAL_OR_FORMULA_REVIEW", "VECTOR_FORMULA_OR_STRUCTURE_REVIEW",
    "OPTIONS_NOT_FOUND", "CHEMICAL_STRUCTURE_OR_FORMULA_REVIEW",
    "BIOLOGICAL_VISUAL_OR_GLYPH_REVIEW", "MULTILINE_OPTIONS_LAYOUT_REVIEW",
    "DIAGRAM_REFERENCE", "BIOLOGY_LAYOUT_REVIEW", "MULTIPLE_OPTION_GROUPS",
    "EMPTY_OPTION", "VISUAL_REFERENCE", "ANSWER_REVIEW_REQUIRED",
    "EMPTY_STEM", "UNREADABLE_OR_CONFLICTED_SOURCE_KEY",
    "NUMERIC_OPTION_LABELS_REVIEW_REQUIRED",
}
VERSION = "source-evidence-v1"


def condensed(s):
    return re.sub(r"\s+", "", s or "").casefold()


rows_out = []
by_subject = {}
for subject in ("Physics", "Chemistry", "Biology"):
    folder = ROOT / ".local" / f"{subject.lower()}-import"
    rows = json.loads((folder / "questions.json").read_text(encoding="utf8"))
    per_source = collections.defaultdict(list)
    for row in rows:
        per_source[row["sourceId"]].append(row)
    tally = collections.Counter()
    for source_id, group in per_source.items():
        source_path = folder / "sources" / f"{source_id}.pdf"
        if not source_path.is_file():
            raise FileNotFoundError(source_path)
        with pymupdf.open(source_path) as pdf:
            page_cache = {}
            for row in group:
                blockers = []
                number = row["number"]
                answer = row.get("answer")
                evidence = row.get("answerEvidence") or []
                matched = []
                evidence_answers = set()
                for entry in evidence:
                    key = entry.get("answer")
                    if key:
                        evidence_answers.add(condensed(key).upper())
                    page_no = entry.get("page")
                    raw = entry.get("evidence") or ""
                    if not isinstance(page_no, int) or not (1 <= page_no <= len(pdf)):
                        continue
                    if not re.match(rf"^{number}\.\s*", raw):
                        continue
                    if page_no not in page_cache:
                        page_cache[page_no] = condensed(pdf[page_no - 1].get_text())
                    if condensed(raw) in page_cache[page_no]:
                        matched.append(page_no)
                answer_normalized = condensed(answer).upper()
                key_verified = bool(
                    row.get("answerStatus") == "SOURCE_MATCHED"
                    and row.get("kind") == "SINGLE_CORRECT"
                    and answer_normalized in set("ABCD")
                    and evidence_answers == {answer_normalized}
                    and matched
                )
                if not key_verified:
                    blockers.append("ANSWER_KEY_REVIEW")
                if row.get("kind") != "SINGLE_CORRECT":
                    blockers.append("QUESTION_TYPE_REVIEW")
                if row.get("sourceOut"):
                    blockers.append("SOURCE_OUT_OF_SCOPE")
                if not isinstance(row.get("year"), int) or not (1980 <= row["year"] <= 2027):
                    blockers.append("YEAR_REVIEW")
                if len((row.get("stem") or "").strip()) < 10:
                    blockers.append("STEM_REVIEW")
                options = row.get("options") or []
                if len(options) != 4 or any(not str(x).strip() for x in options):
                    blockers.append("OPTIONS_REVIEW")
                elif len({condensed(x) for x in options}) != 4:
                    blockers.append("DUPLICATE_OPTIONS_REVIEW")
                flags = set(row.get("flags") or [])
                if row.get("visual") or flags.intersection(ISSUES):
                    blockers.append("VISUAL_OR_LAYOUT_REVIEW")
                media = row.get("media")
                if not media or not (ROOT / media).is_file():
                    blockers.append("SOURCE_MEDIA_MISSING")
                ready = not blockers
                tally["staged"] += 1
                tally["key_source_verified"] += int(key_verified)
                tally["text_technical_ready"] += int(ready)
                for reason in set(blockers):
                    tally[reason] += 1
                rows_out.append({
                    "id": row["id"], "subject": subject,
                    "sourceId": source_id, "number": number,
                    "keySourceVerified": key_verified,
                    "keyPage": matched[0] if matched else None,
                    "textTechnicalReady": ready,
                    "blockers": blockers,
                })
    by_subject[subject] = dict(tally)
result = {"version": VERSION, "subjects": by_subject, "rows": rows_out}
OUT.write_text(json.dumps(result, ensure_ascii=False), encoding="utf8")
print(json.dumps({"version": VERSION, "subjects": by_subject}, indent=2))
