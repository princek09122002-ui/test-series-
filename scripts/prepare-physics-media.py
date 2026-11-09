"""Create a private source-PDF crop for manual academic and rights review."""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".local" / "python"))
import pymupdf as fitz  # noqa: E402

parser = argparse.ArgumentParser()
parser.add_argument("id", help="SourceQuestion UUID")
parser.add_argument("--subject", choices=["Physics", "Chemistry", "Biology"], default="Physics")
args = parser.parse_args()

if not re.fullmatch(r"[0-9a-f-]{36}", args.id):
    raise ValueError("Invalid source question ID")

base = ROOT / ".local" / f"{args.subject.lower()}-import"
questions = json.loads((base / "questions.json").read_text(encoding="utf8"))
question = next((row for row in questions if row["id"] == args.id), None)
if question is None:
    raise ValueError("Question ID not found in this subject's staged import")

with fitz.open(base / "sources" / f"{question['sourceId']}.pdf") as source:
    page_index = question["page"] - 1
    page = source[page_index]
    starts = page.search_for(f"Q{question['number']}.")
    if len(starts) != 1:
        raise ValueError("Question marker is missing or ambiguous; crop manually")
    top = starts[0].y0 - 3
    next_starts = page.search_for(f"Q{question['number'] + 1}.")
    bottom = next_starts[0].y0 - 10 if next_starts else page.rect.height - 75
    if bottom <= top:
        raise ValueError("Question bounds overlap; crop manually")

    with fitz.open() as copy:
        copy.insert_pdf(source, from_page=page_index, to_page=page_index)
        output_page = copy[0]
        # The source places a solution QR/link at the upper-right edge.
        output_page.draw_rect(
            fitz.Rect(page.rect.width - 95, top, page.rect.width - 25, top + 75),
            color=(1, 1, 1), fill=(1, 1, 1), overlay=True,
        )
        target = base / "approved-media"
        target.mkdir(exist_ok=True)
        output_page.get_pixmap(
            matrix=fitz.Matrix(1.6, 1.6),
            clip=fitz.Rect(25, top, page.rect.width - 25, bottom),
            alpha=False,
        ).save(target / f"{args.id}.png")

print("Private crop prepared. Reviewer must verify all content, answer isolation, and rights before publication.")
