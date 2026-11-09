"""Resumable private visual repair; never certifies extraction or publication."""
import hashlib,json,sys,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.local/python'))
import pymupdf as fitz
base=ROOT/'.local/question-repair-v2';base.mkdir(exist_ok=True)
records=json.loads((ROOT/'.local/hybrid-extraction/records.json').read_text(encoding='utf8'))
defects=[r for r in records if 'MISSING_OPTIONS' in r['warnings'] or 'MISSING_STEM' in r['warnings'] or 'CORRUPTED_GLYPH' in r['warnings']]
groups={}
for r in defects: groups.setdefault(r['sourceId'],[]).append(r)
manifest=[];results=[]
for subject in ['physics','chemistry','biology']:
    source_dir=ROOT/f'.local/{subject}-import/sources'
    for path in source_dir.glob('*.pdf'):
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        if digest!=path.stem: raise ValueError('Source identity changed: '+str(path))
        manifest.append({'subject':subject,'id':digest,'path':str(path),'bytes':path.stat().st_size})
        questions=groups.get(digest,[])
        if not questions: continue
        with fitz.open(path) as pdf:
            by_page={}
            for r in questions:
                for segment in r['segments']: by_page.setdefault(segment['page'],[]).append((r,segment))
            for page_no,items in by_page.items():
                pending=[(r,s) for r,s in items if not (base/f'{r["id"]}-{page_no}.png').exists()]
                if not pending: continue
                page=pdf[page_no-1];pix=page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
                for r,segment in pending:
                    box=fitz.Rect(segment['bbox'])*fitz.Matrix(2,2)
                    clip=fitz.IRect(box)&pix.irect
                    cropped=fitz.Pixmap(pix.colorspace,clip,False)
                    cropped.copy(pix,clip)
                    cropped.save(base/f'{r["id"]}-{page_no}.png')
        for r in questions:
            identity=f'{r["sourceId"]}:{r["section"]}:{r["sourceNumber"]}'
            result={'id':r['id'],'version':'visual-repair-v2','sourceIdentity':identity,'sourceId':digest,'section':r['section'],'sourceNumber':r['sourceNumber'],'year':r['year'],'paperVariant':r['paperVariant'],'method':'SOURCE_REGION_IMAGE_FALLBACK','status':'REVIEW_REQUIRED','reason':r['warnings'],'answerState':r['answerState'],'answerEvidence':r['answerEvidence'],'media':[{'page':s['page'],'bbox':s['bbox'],'path':f'.local/question-repair-v2/{r["id"]}-{s["page"]}.png','sha256':hashlib.sha256((base/f'{r["id"]}-{s["page"]}.png').read_bytes()).hexdigest()} for s in r['segments']], 'selectionOptions':[{'id':r['id']+':'+label,'label':label} for label in 'ABCD'],'rawPreserved':True,'requiresRights':True,'requiresVisualReview':True}
            (base/f'{r["id"]}.json').write_text(json.dumps(result),encoding='utf8');results.append(result)
        print(json.dumps({'subject':subject,'sourceId':digest,'prepared':len(questions)}),flush=True)
(base/'source-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
(base/'repairs.json').write_text(json.dumps(results),encoding='utf8')
print(json.dumps({'sources':len(manifest),'defectiveRecords':len(defects),'privateVisualFallbacks':len(results),'approved':0}))
