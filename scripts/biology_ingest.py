"""Resumable private Biology PDF extraction. Never publishes questions to students."""
import argparse
import datetime
import hashlib
import json
import re
import shutil
from pathlib import Path
import pymupdf
from chapter_pdf import extract, ROOT

OUT=ROOT/'.local/biology-import'
VERSION='biology-v2'
EXPECTED=32

def discover():
    rows=[]
    for p in sorted((Path.home()/'Downloads').glob('NEET *Previous Year Questions with Answer Key*.pdf')):
        with pymupdf.open(p) as d:
            cover=d[0].get_text()
            if not re.search(r'NEET Biology . Previous Year Questions',cover):continue
            title=cover.split('CHAPTER-WISE PYQS\n',1)[1].split('NEET Biology',1)[0].strip().replace('\n',' ')
            count=re.search(r'(\d+)\s+QUESTIONS',cover)
            oos=re.search(r'(\d+)\s+OUT OF\s+SYLLABUS',cover)
            sha=hashlib.sha256(p.read_bytes()).hexdigest()
            rows.append({'id':sha,'sha256':sha,'file':p.name,'path':str(p),'title':title,'bytes':p.stat().st_size,
                         'pages':len(d),'declared':int(count[1]),'declaredOut':int(oos[1]) if oos else 0,
                         'subject':'Biology','rights':'UNVERIFIED','status':'AUDITED'})
    assert len(rows)==EXPECTED, f'Expected 32 Biology sources, found {len(rows)}'
    assert len({m['id'] for m in rows})==EXPECTED,'Duplicate source hashes need review'
    assert len({m['title'] for m in rows})==EXPECTED,'Duplicate source chapter names need review'
    return rows

def render(meta,row):
    target=ROOT/row['media']
    if target.exists():return
    with pymupdf.open(meta['path']) as doc:
        page=doc[row['page']-1]
        numbers=[int(x[1]) for x in re.finditer(r'(?m)^Q(\d+)\.\s*$',page.get_text())]
        i=numbers.index(row['number'])
        current=page.search_for(f"Q{row['number']}.")
        following=page.search_for(f'Q{numbers[i+1]}.') if i+1<len(numbers) else []
        clip=pymupdf.Rect(25,current[0].y0-3 if current else 0,page.rect.width-25,
                          following[0].y0-3 if following else page.rect.height-75)
        target.parent.mkdir(parents=True,exist_ok=True)
        page.get_pixmap(matrix=pymupdf.Matrix(1.7,1.7),clip=clip,alpha=False).save(target)

def process(meta):
    rows=extract(meta,output_dir=OUT,vector_review=True)
    numeric_keys={}
    with pymupdf.open(meta['path']) as pdf:
        key_mode=False
        for pi,page in enumerate(pdf):
            text=page.get_text()
            if re.search(r'(?m)^Answer Key\s*$',text):key_mode=True
            if key_mode:
                for match in re.finditer(r'(?m)^(\d+)\.\s+([1-4])\s*$',text):
                    numeric_keys[int(match[1])]={'answer':match[2],'page':pi+1,'evidence':match[0].strip()}
    for row in rows:
        if not row['answerEvidence'] and row['number'] in numeric_keys:
            key=numeric_keys[row['number']]
            row['answerEvidence']=[key]
            row['answer']=key['answer']
            row['answerStatus']='REVIEW_REQUIRED'
            row['sourceAnswerRaw']=key['answer']
            body=row['sourceText'].strip().splitlines()[1:]
            numeric_options=list(re.finditer(r'(?m)^\(([1-4])\)\s*(.*)$','\n'.join(body)))
            if [m[1] for m in numeric_options]==list('1234'):
                text='\n'.join(body)
                row['stem']=text[:numeric_options[0].start()].strip()
                row['options']=[text[m.end(1)+1:(numeric_options[i+1].start() if i<3 else len(text))].strip().removeprefix(')').strip()
                                for i,m in enumerate(numeric_options)]
                row['contentHash']=hashlib.sha256((row['stem']+'|'+'|'.join(row['options'])).encode()).hexdigest()
                row['flags']=[f for f in row['flags'] if f not in ['OPTIONS_NOT_FOUND','ANSWER_REVIEW_REQUIRED']]
                row['flags'].append('NUMERIC_OPTION_LABELS_REVIEW_REQUIRED')
            else:
                row['flags'].append('NUMERIC_OPTIONS_PARSE_FAILED')
        evidence=row['answerEvidence']
        if len(evidence)>1:
            row['flags'].append('DUPLICATE_SOURCE_KEY_ENTRY')
            row['answerStatus']='REVIEW_REQUIRED'
            row['answer']=None
        if not evidence:row['flags'].append('MISSING_SOURCE_KEY')
        elif not row['answer']:row['flags'].append('UNREADABLE_OR_CONFLICTED_SOURCE_KEY')
        if row['visual']:row['flags'].append('BIOLOGICAL_VISUAL_OR_GLYPH_REVIEW')
        if re.search(r'\b(?:match|list[- ]?[i1]|pedigree|diagram|figure|graph|table|structure)\b',row['sourceText'],re.I):
            row['flags'].append('BIOLOGY_LAYOUT_REVIEW')
        row['flags']=sorted(set(row['flags']))
        row.update(subject='Biology',contentVersion=VERSION,extractedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                   presentationStatus='REVIEW_REQUIRED',solutionStatus='MISSING',botanyZoologyStatus='UNREVIEWED')
    years=[r['year'] for r in rows if r['year']]
    meta.update(version=VERSION,yearRange=[min(years),max(years)] if years else [],
                examLabels=sorted({r['exam'] for r in rows}),keyPages=sorted({x['page'] for r in rows for x in r['answerEvidence']}),
                matched=sum(r['answerStatus']=='SOURCE_MATCHED' for r in rows),
                missingAnswers=sum(r['answer'] is None for r in rows),
                emptyTextOptions=sum(any(not x for x in r['options']) for r in rows),
                continuationIssues=sum('CONTINUATION_REVIEW_REQUIRED' in r['flags'] for r in rows),
                diagramOrGlyphCandidates=sum(r['visual'] for r in rows),
                incompleteLayout=sum(any(f in r['flags'] for f in ['OPTIONS_NOT_FOUND','EMPTY_OPTION','BROKEN_GLYPH']) for r in rows))
    return rows

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--full',action='store_true');args=parser.parse_args()
    OUT.mkdir(exist_ok=True);(OUT/'batches').mkdir(exist_ok=True);(OUT/'sources').mkdir(exist_ok=True)
    manifest=discover()
    if not args.full:
        (OUT/'biology-import-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
        print('AUDITED',len(manifest),'sources',sum(m['pages'] for m in manifest),'pages',sum(m['declared'] for m in manifest),'declared questions')
        return
    if not (OUT/'pilot-reviewed.json').exists():raise ValueError('Pilot must be reviewed before full extraction')
    allrows=[]
    for meta in manifest:
        cache=OUT/'batches'/f"{meta['id']}.json"
        checkpoint=OUT/'batches'/f"{meta['id']}.meta.json"
        if cache.exists() and checkpoint.exists() and json.loads(checkpoint.read_text())['version']==VERSION:
            saved=json.loads(checkpoint.read_text());rows=json.loads(cache.read_text());meta.update(saved)
        else:
            rows=process(meta)
            cache.write_text(json.dumps(rows,ensure_ascii=False),encoding='utf8')
            checkpoint.write_text(json.dumps(meta,ensure_ascii=False),encoding='utf8')
        for row in rows:render(meta,row)
        source_copy=OUT/'sources'/f"{meta['id']}.pdf"
        if not source_copy.exists():shutil.copy2(meta['path'],source_copy)
        allrows.extend(rows)
        print(meta['title'],len(rows),meta['matched'],meta['errors'],flush=True)
    (OUT/'questions.json').write_text(json.dumps(allrows,ensure_ascii=False),encoding='utf8')
    (OUT/'biology-import-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
    print('COMPLETE',len(manifest),'sources',len(allrows),'questions',flush=True)
if __name__=='__main__':main()
