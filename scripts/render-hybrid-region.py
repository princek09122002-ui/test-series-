import json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.local/python'))
import pymupdf as fitz
manifest=json.loads(Path(sys.argv[1]).read_text(encoding='utf8'))
with fitz.open(ROOT/manifest['source']) as pdf:
    page=pdf[manifest['page']-1]
    page.get_pixmap(matrix=fitz.Matrix(2,2),clip=fitz.Rect(manifest['bbox']),alpha=False).save(ROOT/manifest['target'])
