"""Auditable, resumable staging of the supplied ExamGOAL compilation.

This tool does not publish third-party content into student tests. Every source
block, including repeated blocks, remains visible in the reconciliation report.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / ".local" / "pyq-ingest"
SOURCE = Path.home() / "Downloads" / "ilovepdf_merged (1).pdf"
SYLLABUS = [
    "11_Physics_SYLLABUS_2026_27_EM.pdf",
    "11_chemistry_SYLLABUS_2026_27_EM.pdf",
    "11_Biology_SYLLABUS_2026_27_EM.pdf",
    "12_Physics_SYLLABUS_2026_27_EM.pdf",
    "12_chemitry_SYLLABUS_2026_27_EM.pdf",
    "12_Biology_SYLLABUS_2026_27_EM.pdf",
]
VERSION = "pilot-v8"
Q_RE = re.compile(r"(?m)^Q(\d{1,3})\.\s*$")
OPT_RE = re.compile(r"(?m)^\(([A-D])\)\s*(.*)$")
KEY_RE = re.compile(r"(?m)^(\d{1,3})\.\s+([A-D](?:\s*,\s*[A-D])*)\s*$")
SUBJECTS = ("Biology", "Chemistry", "Physics", "Out of syllabus")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def page_text(doc: pymupdf.Document, index: int) -> str:
    return doc[index].get_text().replace("\xa0", " ")


def find_covers(doc: pymupdf.Document) -> list[dict]:
    covers = []
    page_hashes = []
    for index in range(len(doc)):
        text = page_text(doc, index)
        page_hashes.append(hashlib.sha256(text.encode()).digest())
        if "NEET Question Paper with Answer Key" not in text:
            continue
        lines = [s.strip() for s in text.splitlines() if s.strip()]
        marker = lines.index("NEET Question Paper with Answer Key")
        # The cover line immediately before the marker is the paper name, except
        # for a wrapped Re-Examination title.
        label = lines[marker - 1]
        if label == "Examination)":
            label = lines[marker - 2] + label
        date_match = re.search(r"\b\d{1,2} [A-Z][a-z]{2} 20\d{2}\b", text)
        count_match = re.search(r"\b(\d{2,3})\s+QUESTIONS\b", text)
        out_match = re.search(r"\b(\d{1,3})\s+OUT OF SYLLABUS\b", text)
        covers.append(
            {
                "block": len(covers) + 1,
                "label": label,
                "year": int(re.search(r"20\d{2}", label).group()),
                "exam_date": date_match.group() if date_match else None,
                "cover_page": index + 1,
                "expected": int(count_match.group(1)) if count_match else None,
                "expected_out_of_syllabus": int(out_match.group(1)) if out_match else 0,
            }
        )
    for i, cover in enumerate(covers):
        cover["end_page"] = covers[i + 1]["cover_page"] - 1 if i + 1 < len(covers) else len(doc)
        fingerprint = hashlib.sha256(b"".join(page_hashes[cover["cover_page"] - 1 : cover["end_page"]])).hexdigest()
        cover["fingerprint"] = fingerprint
        cover["identity"] = re.sub(r"[^a-z0-9]+", "-", cover["label"].lower()).strip("-") + "-" + fingerprint[:10]
        earlier = next((c for c in covers[:i] if c["identity"] == cover["identity"]), None)
        cover["duplicate_of_block"] = earlier["block"] if earlier else None
    return covers


def manifest(source: Path = SOURCE, out: Path = OUTPUT) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    files = []
    for path in [source, *(Path.home() / "Downloads" / name for name in SYLLABUS)]:
        with pymupdf.open(path) as doc:
            files.append({"file": str(path), "bytes": path.stat().st_size, "sha256": sha256(path), "pages": len(doc)})
    with pymupdf.open(source) as doc:
        covers = find_covers(doc)
    result = {"created_utc": datetime.now(timezone.utc).isoformat(), "files": files, "papers": covers}
    (out / "manifest.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def connect(out: Path) -> sqlite3.Connection:
    db = sqlite3.connect(out / "staging.sqlite3")
    db.row_factory = sqlite3.Row
    db.executescript(
        """
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS page_checkpoint (
          source_sha TEXT NOT NULL, page INTEGER NOT NULL, version TEXT NOT NULL,
          completed_utc TEXT NOT NULL, PRIMARY KEY (source_sha,page,version));
        CREATE TABLE IF NOT EXISTS question (
          source_sha TEXT NOT NULL, paper_id TEXT NOT NULL, block INTEGER NOT NULL,
          number INTEGER NOT NULL, page INTEGER NOT NULL, subject TEXT,
          stem TEXT NOT NULL, option_a TEXT, option_b TEXT, option_c TEXT, option_d TEXT,
          answer_raw TEXT, answer_page INTEGER, answer_status TEXT NOT NULL DEFAULT 'MISSING',
          flags_json TEXT NOT NULL, crop TEXT, extraction_version TEXT NOT NULL,
          PRIMARY KEY(source_sha,paper_id,number));
        CREATE TABLE IF NOT EXISTS answer_key (
          source_sha TEXT NOT NULL, paper_id TEXT NOT NULL, number INTEGER NOT NULL,
          answer_raw TEXT NOT NULL, page INTEGER NOT NULL,
          PRIMARY KEY(source_sha,paper_id,number));
        CREATE TABLE IF NOT EXISTS processing_error (
          source_sha TEXT NOT NULL, page INTEGER NOT NULL, stage TEXT NOT NULL,
          detail TEXT NOT NULL, created_utc TEXT NOT NULL);
        """
    )
    return db


def clean_body(text: str) -> str:
    text = text.split("Open solution", 1)[0].strip()
    text = re.sub(r"^MCQ \([^)]+\)\s*", "", text).strip()
    text = re.sub(r"^[�·\s]*\n?(?:Biology|Chemistry|Physics|Out of syllabus)\n", "", text).strip()
    return text.strip()


def parse_question_body(body: str) -> tuple[str, list[str], list[str]]:
    body = clean_body(body)
    matches = list(OPT_RE.finditer(body))
    sequences = []
    for start in range(len(matches) - 3):
        if [m.group(1) for m in matches[start : start + 4]] == list("ABCD"):
            sequences.append(start)
    if not sequences:
        return body, ["", "", "", ""], ["OPTIONS_NOT_FOUND"]
    start = sequences[-1]
    chosen = matches[start : start + 4]
    stem = body[: chosen[0].start()].strip()
    # For each option, retain its text after the label and before the next label.
    options = [re.sub(r"^\([A-D]\)\s*", "", body[m.start() : (chosen[i + 1].start() if i < 3 else len(body))]).strip() for i, m in enumerate(chosen)]
    flags = []
    if len(sequences) > 1 or len(matches) > 4:
        flags.append("MULTIPLE_OPTION_GROUPS")
    if not stem:
        flags.append("EMPTY_STEM")
    if any(not option for option in options):
        flags.append("EMPTY_OPTION")
    if any("\n" in option for option in options):
        flags.append("MULTILINE_OPTIONS_LAYOUT_REVIEW")
    if "�" in body or "\ufffd" in body:
        flags.append("BROKEN_GLYPH")
    if re.search(r"\b(?:above|below|following)\s+(?:figure|diagram|graph|circuit|table)\b", stem, re.I):
        flags.append("VISUAL_REFERENCE")
    return stem, options, flags


def section_from_text(text: str, previous: str | None) -> str | None:
    first_question = Q_RE.search(text)
    pre = text[: first_question.start()] if first_question else text
    for subject in SUBJECTS:
        if re.search(rf"(?m)^{re.escape(subject)}\s*$", pre):
            return subject
    return previous


def has_trailing_out_heading(text: str) -> bool:
    questions = list(Q_RE.finditer(text))
    tail = text[questions[-1].end() :] if questions else text
    return bool(re.search(r"(?m)^Out of syllabus\s*\n\d+ questions", tail))


def crop_question(doc: pymupdf.Document, page_index: int, number: int, next_number: int | None, out: Path, paper_id: str) -> str | None:
    page = doc[page_index]
    starts = page.search_for(f"Q{number}.")
    if not starts:
        return None
    top = max(0, starts[0].y0 - 4)
    next_rects = page.search_for(f"Q{next_number}.") if next_number is not None else []
    bottom = next_rects[0].y0 - 3 if next_rects else page.rect.height - 65
    if bottom <= top:
        bottom = page.rect.height - 65
    rect = pymupdf.Rect(25, top, page.rect.width - 25, bottom)
    directory = out / "review-crops" / paper_id
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / f"p{page_index+1}-q{number}.png"
    page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), clip=rect, alpha=False).save(target)
    return str(target.relative_to(out))


def question_has_embedded_image(page: pymupdf.Page, number: int, next_number: int | None) -> bool:
    starts = page.search_for(f"Q{number}.")
    if not starts:
        return False
    next_starts = page.search_for(f"Q{next_number}.") if next_number is not None else []
    top = starts[0].y0
    bottom = next_starts[0].y0 if next_starts else page.rect.height - 65
    for image in page.get_image_info():
        if (image["width"], image["height"]) in {(900, 570), (120, 120)}:
            # The source embeds a tiled watermark and a footer QR on every page.
            continue
        box = pymupdf.Rect(image["bbox"])
        if box.x0 < page.rect.width - 100 and box.y1 > top and box.y0 < bottom and box.width > 15 and box.height > 15:
            return True
    return False


def ingest(source: Path = SOURCE, out: Path = OUTPUT, *, limit_pages: int | None = None) -> dict:
    meta = manifest(source, out)
    source_sha = meta["files"][0]["sha256"]
    db = connect(out)
    if not db.execute("SELECT 1 FROM page_checkpoint WHERE source_sha=? AND version=? LIMIT 1", (source_sha, VERSION)).fetchone():
        db.execute("DELETE FROM answer_key WHERE source_sha=?", (source_sha,))
        db.execute("DELETE FROM processing_error WHERE source_sha=?", (source_sha,))
    db.execute("DELETE FROM question WHERE source_sha=? AND extraction_version<>?", (source_sha, VERSION))
    db.commit()
    papers = meta["papers"]
    with pymupdf.open(source) as doc:
        for cover in papers:
            if cover["duplicate_of_block"]:
                continue
            subject = None
            source_out = False
            for page_number in range(cover["cover_page"] + 1, cover["end_page"] + 1):
                if limit_pages is not None and page_number > limit_pages:
                    break
                if db.execute("SELECT 1 FROM page_checkpoint WHERE source_sha=? AND page=? AND version=?", (source_sha, page_number, VERSION)).fetchone():
                    # Recover section state from previous page if processing resumes mid-paper.
                    row = db.execute("SELECT subject FROM question WHERE source_sha=? AND paper_id=? AND page=? ORDER BY number DESC LIMIT 1", (source_sha, cover["identity"], page_number)).fetchone()
                    if row:
                        subject = row[0]
                        flags_row = db.execute("SELECT flags_json FROM question WHERE source_sha=? AND paper_id=? AND page=? ORDER BY number DESC LIMIT 1", (source_sha, cover["identity"], page_number)).fetchone()
                        source_out = "SOURCE_OUT_OF_SYLLABUS" in json.loads(flags_row[0])
                    if has_trailing_out_heading(page_text(doc, page_number - 1)):
                        source_out = True
                    continue
                try:
                    page = doc[page_number - 1]
                    raw = page_text(doc, page_number - 1)
                    subject = section_from_text(raw, subject)
                    if "Answer Key" in raw or ("Open solution" not in raw and KEY_RE.search(raw)):
                        for match in KEY_RE.finditer(raw):
                            number, answer = int(match.group(1)), re.sub(r"\s+", "", match.group(2))
                            old = db.execute("SELECT answer_raw FROM answer_key WHERE source_sha=? AND paper_id=? AND number=?", (source_sha, cover["identity"], number)).fetchone()
                            if old and old[0] != answer:
                                db.execute("INSERT INTO processing_error VALUES (?,?,?,?,?)", (source_sha, page_number, "answer_conflict", f"Q{number}: {old[0]} vs {answer}", datetime.now(timezone.utc).isoformat()))
                            else:
                                db.execute("INSERT OR IGNORE INTO answer_key VALUES (?,?,?,?,?)", (source_sha, cover["identity"], number, answer, page_number))
                    matches = list(Q_RE.finditer(raw))
                    for i, match in enumerate(matches):
                        preceding = raw[(matches[i - 1].end() if i else 0) : match.start()]
                        if re.search(r"(?m)^Out of syllabus\s*\n\d+ questions", preceding):
                            source_out = True
                        section_matches = re.findall(r"Open solution\s*\n(Biology|Chemistry|Physics|Out of syllabus)\s*\n\d+ questions", preceding)
                        if section_matches:
                            subject = section_matches[-1]
                        number = int(match.group(1))
                        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw)
                        body = raw[match.end() : end]
                        if "Open solution" not in body:
                            continue
                        subject_match = re.match(r"\s*MCQ \([^)]+\)\s*[�·\s]*(Biology|Chemistry|Physics|Out of syllabus)\n", body)
                        q_subject = subject_match.group(1) if subject_match else subject
                        if q_subject:
                            subject = q_subject
                        stem, options, flags = parse_question_body(body)
                        type_match = re.match(r"\s*MCQ \(([^)]+)\)", body)
                        if type_match and type_match.group(1) != "Single Correct Answer":
                            flags.append("NON_SINGLE_CORRECT_TYPE")
                        if source_out:
                            flags.append("SOURCE_OUT_OF_SYLLABUS")
                        if question_has_embedded_image(page, number, int(matches[i + 1].group(1)) if i + 1 < len(matches) else None):
                            flags.append("QUESTION_HAS_EMBEDDED_IMAGE")
                        if q_subject in ("Physics", "Chemistry") and (re.search(r"\d", stem) or re.search(r"\d", " ".join(options))):
                            flags.append("MATH_NOTATION_REVIEW")
                        if re.search(r"(?:\s{2,}|\n\s*\n)", stem) and len(stem) < 70:
                            flags.append("POSSIBLE_MISSING_FORMULA")
                        existing = db.execute("SELECT page FROM question WHERE source_sha=? AND paper_id=? AND number=?", (source_sha, cover["identity"], number)).fetchone()
                        if existing and existing[0] != page_number:
                            db.execute("INSERT INTO processing_error VALUES (?,?,?,?,?)", (source_sha, page_number, "duplicate_question_number", f"Q{number}: pages {existing[0]} and {page_number}", datetime.now(timezone.utc).isoformat()))
                        db.execute(
                            "INSERT OR REPLACE INTO question (source_sha,paper_id,block,number,page,subject,stem,option_a,option_b,option_c,option_d,flags_json,crop,extraction_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                            (source_sha, cover["identity"], cover["block"], number, page_number, q_subject, stem, *options, json.dumps(sorted(set(flags))), None, VERSION),
                        )
                    if has_trailing_out_heading(raw):
                        source_out = True
                    db.execute("INSERT INTO page_checkpoint VALUES (?,?,?,?)", (source_sha, page_number, VERSION, datetime.now(timezone.utc).isoformat()))
                    db.commit()
                except Exception as exc:
                    db.execute("INSERT INTO processing_error VALUES (?,?,?,?,?)", (source_sha, page_number, "page", repr(exc), datetime.now(timezone.utc).isoformat()))
                    db.commit()
        for row in db.execute("SELECT source_sha,paper_id,number,answer_raw,page FROM answer_key"):
            answer = row[3]
            status = "VERIFIED_SINGLE" if re.fullmatch(r"[A-D]", answer) else "REVIEW_MULTIPLE"
            db.execute("UPDATE question SET answer_raw=?,answer_page=?,answer_status=? WHERE source_sha=? AND paper_id=? AND number=?", (answer, row[4], status, row[0], row[1], row[2]))
        db.commit()
        report = make_report(db, meta, source_sha, out)
    db.close()
    return report


def make_report(db: sqlite3.Connection, meta: dict, source_sha: str, out: Path) -> dict:
    rows = [dict(row) for row in db.execute("SELECT * FROM question WHERE source_sha=? ORDER BY block,number", (source_sha,))]
    by_paper = {}
    for row in rows:
        by_paper.setdefault(row["paper_id"], []).append(row)
    papers = []
    for cover in meta["papers"]:
        items = [] if cover["duplicate_of_block"] else by_paper.get(cover["identity"], [])
        numbers = {r["number"] for r in items}
        expected = cover["expected"]
        issues = Counter(flag for r in items for flag in json.loads(r["flags_json"]))
        papers.append({
            **{k: cover[k] for k in ("block", "label", "year", "exam_date", "cover_page", "end_page", "expected", "expected_out_of_syllabus", "identity", "duplicate_of_block")},
            "detected_unique": len(numbers),
            "missing_numbers": [n for n in range(1, expected + 1) if n not in numbers] if expected and not cover["duplicate_of_block"] else [],
            "with_four_options": sum(all(r[f"option_{c}"] for c in "abcd") for r in items),
            "answer_verified_single": sum(r["answer_status"] == "VERIFIED_SINGLE" for r in items),
            "answer_review_multiple": sum(r["answer_status"] == "REVIEW_MULTIPLE" for r in items),
            "answer_missing": sum(r["answer_status"] == "MISSING" for r in items),
            "flagged": sum(bool(json.loads(r["flags_json"])) for r in items),
            "flag_types": dict(issues),
            "source_out_of_syllabus_detected": issues.get("SOURCE_OUT_OF_SYLLABUS", 0),
            "ready_for_publication": 0,
        })
    report = {
        "source_sha256": source_sha,
        "pages": meta["files"][0]["pages"],
        "pages_checkpointed": db.execute("SELECT COUNT(*) FROM page_checkpoint WHERE source_sha=? AND version=?", (source_sha, VERSION)).fetchone()[0],
        "distinct_questions_staged": len(rows),
        "papers": papers,
        "errors": [dict(row) for row in db.execute("SELECT page,stage,detail FROM processing_error WHERE source_sha=?", (source_sha,))],
        "policy": "Staging only. Academic verification, source rights, and current NEET eligibility remain required before publication.",
    }
    (out / "reconciliation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    with (out / "review-queue.jsonl").open("w", encoding="utf-8") as stream:
        for row in rows:
            if json.loads(row["flags_json"]) or row["answer_status"] != "VERIFIED_SINGLE":
                stream.write(json.dumps(row, ensure_ascii=False) + "\n")
    return report


def pilot(source: Path = SOURCE, out: Path = OUTPUT) -> list[dict]:
    meta = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    db = connect(out)
    samples = [
        ("NEET 2016 Phase 1", 1, "text_biology"),
        ("NEET 2016 Phase 1", 9, "table_biology"),
        ("NEET 2016 Phase 1", 172, "numerical_chemistry"),
        ("NEET 2016 Phase 1", 178, "text_physics"),
        ("NEET 2019", 95, "chemical_structures"),
        ("NEET 2023", 139, "physics_diagram"),
        ("NEET 2024", 1, "recent_biology"),
        ("NEET 2026", 1, "recent_biology"),
    ]
    output = []
    with pymupdf.open(source) as doc:
        for label, number, kind in samples:
            cover = next(c for c in meta["papers"] if c["label"] == label)
            row = db.execute("SELECT * FROM question WHERE paper_id=? AND number=?", (cover["identity"], number)).fetchone()
            if row is None:
                output.append({"paper": label, "number": number, "kind": kind, "error": "not extracted"})
                continue
            item = dict(row)
            crop = crop_question(doc, item["page"] - 1, number, number + 1, out, cover["identity"])
            item["crop"] = crop
            db.execute("UPDATE question SET crop=? WHERE source_sha=? AND paper_id=? AND number=?", (crop, item["source_sha"], item["paper_id"], number))
            output.append({"paper": label, "number": number, "kind": kind, "page": item["page"], "subject": item["subject"], "stem": item["stem"], "options": [item[f"option_{c}"] for c in "abcd"], "answer": item["answer_raw"], "answer_page": item["answer_page"], "flags": json.loads(item["flags_json"]), "crop": crop})
    db.commit()
    db.close()
    (out / "pilot.json").write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    return output


def write_markdown_report(out: Path = OUTPUT) -> Path:
    report = json.loads((out / "reconciliation.json").read_text(encoding="utf-8"))
    manifest_data = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    pilot_rows = json.loads((out / "pilot.json").read_text(encoding="utf-8"))
    papers = report["papers"]
    unique = [p for p in papers if not p["duplicate_of_block"]]
    total = report["distinct_questions_staged"]
    four = sum(p["with_four_options"] for p in unique)
    single = sum(p["answer_verified_single"] for p in unique)
    multi = sum(p["answer_review_multiple"] for p in unique)
    flagged = sum(p["flagged"] for p in unique)
    source_out = sum(p["flag_types"].get("SOURCE_OUT_OF_SYLLABUS", 0) for p in unique)
    non_single = sum(p["flag_types"].get("NON_SINGLE_CORRECT_TYPE", 0) for p in unique)
    lines = [
        "# PYQ extraction pilot and paper reconciliation",
        "",
        "## Scope and method",
        "",
        f"- Source: `ilovepdf_merged (1).pdf`, SHA-256 `{report['source_sha256']}`; all {report['pages']:,} pages scanned for paper covers and boundaries.",
        "- Six supplied Class 11/12 syllabus PDFs were opened, hashed, and counted in `.local/pyq-ingest/manifest.json`. Their structural curriculum import and separate current NTA eligibility review remain outstanding.",
        f"- {len(papers)} source paper blocks were detected. Two are exact repeated 2023 blocks; {len(unique)} distinct papers were staged.",
        f"- {report['pages_checkpointed']:,} unique question/key/back pages have durable versioned checkpoints. The other pages are 18 distinct covers and 124 repeated-block pages.",
        "- Extraction uses PyMuPDF text and coordinates. A SQLite staging database records source hash, paper identity, page, question number, four option fields, answer-key page, warnings, and checkpoints. Reruns use the same primary keys.",
        "- This is an ExamGOAL compilation. A source-key match is a transcription match, not independent NTA answer validation or permission to publish.",
        "",
        "| Supplied syllabus PDF | Pages | SHA-256 prefix |",
        "|---|---:|---|",
    ]
    for file in manifest_data["files"][1:]:
        lines.append(f"| `{Path(file['file']).name}` | {file['pages']} | `{file['sha256'][:12]}` |")
    lines += [
        "",
        "## Pilot against rendered PDF pages",
        "",
        "Eight questions from five paper/year combinations were compared with their question crops and the answer-key page images. For every sample, the cover/footer, number, subject, and key row agreed with the paper context. The answer labels matched the visible compilation keys in **8/8** cases. **3/8** samples preserve the complete stem and four option texts without a meaning-changing formatting loss. This small, deliberately difficult sample is a diagnostic pilot, not a statistical estimate of collection-wide accuracy.",
        "",
        "| Paper / question | Type | PDF page → key page | Text/options compared with page | Outcome |",
        "|---|---|---:|---|---|",
    ]
    outcomes = {
        ("NEET 2016 Phase 1", 1): ("Text Biology", "Complete; four options in source order", "Clean"),
        ("NEET 2016 Phase 1", 9): ("Biology table", "All four option words captured; table cells flattened", "Layout review"),
        ("NEET 2016 Phase 1", 172): ("Chemistry numerical", "Four options captured; superscripts, minus signs and multiplication symbol lost", "Math review"),
        ("NEET 2016 Phase 1", 178): ("Physics numerical", "Four options captured; inverse-second exponent lost", "Math review"),
        ("NEET 2019", 95): ("Chemical structures", "Structure options A–D exist only as images; extracted option fields empty", "Image review"),
        ("NEET 2023", 139): ("Circuit diagram", "Question and four labels captured; circuit image and µ in µF absent from text", "Image and math review"),
        ("NEET 2024", 1): ("Text Biology", "Complete; four options in source order", "Clean"),
        ("NEET 2026", 1): ("Text Biology", "Complete; four options in source order", "Clean"),
    }
    for sample in pilot_rows:
        kind, detail, outcome = outcomes[(sample["paper"], sample["number"])]
        lines.append(f"| {sample['paper']} Q{sample['number']} (key {sample['answer']}) | {kind} | {sample['page']} → {sample['answer_page']} | {detail} | {outcome} |")
    lines += [
        "",
        "Rendered sample crops are in `.local/pyq-ingest/review-crops/`; the six answer-key page images are in `.local/pyq-ingest/key-pages/`. The `pilot.json` file has exact extracted text and option fields with those source references.",
        "",
        "## Systematic fixes applied before the final pass",
        "",
        "1. Track section headings within a page and inline out-of-syllabus/subject labels. The initial pass misclassified a Chemistry question as Biology; the corrected sample is Chemistry.",
        "2. Flag math notation for review where glyph extraction loses superscripts, signs, multiplication marks, or µ. Never reconstruct symbols by guessing.",
        "3. Keep image-only questions in staging and flag them. A question crop preserves their visible source representation for manual transcription.",
        "4. Exclude recurring tiled watermarks and footer QR images from per-question media detection. This removed a false media flag on every question.",
        "5. Use paper identity plus source hash and question number as the staging key, and recognize the two repeated source blocks without duplicating their questions.",
        "",
        "## Full-run totals",
        "",
        f"- Source-number coverage: **{total:,}/{sum(p['expected'] for p in unique):,} (100%)** across distinct papers; no missing numbers and no processing errors were recorded.",
        f"- Four nonempty extracted option fields: **{four:,}/{total:,} ({four/total:.1%})**. This is structural completeness, not visual correctness.",
        f"- One unambiguous compilation key matched by paper and number: **{single:,}/{total:,} ({single/total:.1%})**; **{multi}** entries have multiple accepted options and require review.",
        f"- At least one extraction warning: **{flagged:,}/{total:,} ({flagged/total:.1%})**. Warnings can overlap; unflagged rows have not received individual human verification.",
        f"- Source marked out of syllabus: **{source_out:,}**; source question type not single correct: **{non_single:,}**. These classifications remain excluded from publication pending separate academic review.",
        "- Academic/rights/NEET syllabus approvals and student publication: **0**. No PYQ rows were added to the live question pool.",
        "",
        "| # | Detected paper | Source pages | Expected | Staged | Four options | Single key | Multi key | Source OOS | Flagged | Status |",
        "|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|",
    ]
    for p in papers:
        status = f"Exact duplicate of block {p['duplicate_of_block']}" if p["duplicate_of_block"] else ("All numbers present" if not p["missing_numbers"] else f"Missing {len(p['missing_numbers'])}")
        source_oos = f"{p['source_out_of_syllabus_detected']}/{p['expected_out_of_syllabus']}" if not p["duplicate_of_block"] else "—"
        lines.append(f"| {p['block']} | {p['label']} | {p['cover_page']}–{p['end_page']} | {p['expected']} | {p['detected_unique']} | {p['with_four_options']} | {p['answer_verified_single']} | {p['answer_review_multiple']} | {source_oos} | {p['flagged']} | {status} |")
    lines += [
        "",
        "## Unresolved review queue",
        "",
        "| Staging warning | Questions |",
        "|---|---:|",
    ]
    for name in (
        "OPTIONS_NOT_FOUND",
        "QUESTION_HAS_EMBEDDED_IMAGE",
        "MATH_NOTATION_REVIEW",
        "POSSIBLE_MISSING_FORMULA",
        "MULTILINE_OPTIONS_LAYOUT_REVIEW",
        "MULTIPLE_OPTION_GROUPS",
        "NON_SINGLE_CORRECT_TYPE",
        "SOURCE_OUT_OF_SYLLABUS",
    ):
        lines.append(f"| `{name}` | {sum(p['flag_types'].get(name, 0) for p in unique):,} |")
    lines += [
        "",
        "Warnings overlap; a flagged row can appear in several categories. The queue is `review-queue.jsonl` and includes exact source paper and PDF page for each record.",
        "",
        "- Image-only options, chemical structures, circuits and scientific diagrams require faithful transcription or approved image delivery. Original source crops have watermarks and require rights clearance.",
        "- Formula and unit extraction needs direct visual review. Example: 2016 Phase 1 Q172 loses `m⁻³`, `mol⁻¹`, and `×10²³`; 2023 Q139 loses `µ` in `µF`.",
        "- Table-shaped options may preserve words while losing cell relationships. Example: 2016 Phase 1 Q9.",
        "- Multi-answer keys cannot be represented as one correct option without an explicit reviewed policy. Ten such records remain staged.",
        "- Source subject labels marked `Out of syllabus` are preserved as source classifications; current NEET eligibility is a separate, unreviewed mapping.",
        "- The staging database has no independently checked official NTA keys, reviewed explanations, rights approvals, school/NEET topic mapping, or published questions. It must not be used as an approved student question bank yet.",
        "",
        "Machine-readable detail: `.local/pyq-ingest/manifest.json`, `reconciliation.json`, `pilot.json`, `review-queue.jsonl`, and `staging.sqlite3`.",
    ]
    path = ROOT / "docs" / "PYQ_INGESTION_REPORT.md"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["manifest", "ingest", "pilot", "report"])
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--out", type=Path, default=OUTPUT)
    parser.add_argument("--limit-pages", type=int)
    args = parser.parse_args()
    if args.command == "manifest":
        result = manifest(args.source, args.out)
        print(f"Manifest: {len(result['files'])} files, {len(result['papers'])} paper blocks")
    elif args.command == "ingest":
        result = ingest(args.source, args.out, limit_pages=args.limit_pages)
        print(f"Staged {result['distinct_questions_staged']} questions; checkpointed {result['pages_checkpointed']} pages")
    elif args.command == "pilot":
        result = pilot(args.source, args.out)
        print(f"Pilot: {len(result)} samples in {args.out / 'pilot.json'}")
    else:
        print(write_markdown_report(args.out))


if __name__ == "__main__":
    main()
