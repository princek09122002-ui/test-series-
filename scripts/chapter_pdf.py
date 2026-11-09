"""Private, source-scoped chapter PDF extraction. Never publishes questions."""
import argparse,hashlib,json,re,shutil,uuid
from pathlib import Path
import pymupdf as fitz
from pyq_ingest import parse_question_body,Q_RE
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'.local/physics-import'; VERSION='physics-v1'
SOURCE_KEY_RE=re.compile(r'(?m)^(\d{1,3})\.\s+([A-D](?:\s*,\s*[A-D])*|Scan QR)\s*$')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def audit(folder,subject="Physics"):
 files=sorted(folder.glob('NEET *Previous Year Questions with Answer Key.pdf')); result=[]
 for p in files:
  with fitz.open(p) as d:
   cover=d[0].get_text()
   if f'NEET {subject} · Previous Year Questions' not in cover:continue
   title=cover.split('CHAPTER-WISE PYQS\n',1)[1].split(f'NEET {subject}',1)[0].strip().replace('\n',' ')
   count=re.search(r'(\d+)\s+QUESTIONS',cover);oos=re.search(r'(\d+)\s+OUT OF\s+SYLLABUS',cover)
   result.append(dict(id=digest(p),path=str(p),file=p.name,title=title,pages=len(d),declared=int(count[1]),declaredOut=int(oos[1]) if oos else 0,rights='UNVERIFIED',status='AUDITED'))
 return result

def extract(meta,render=False,output_dir=None,vector_review=False):
 output_dir=Path(output_dir) if output_dir else OUT
 doc=fitz.open(meta['path']); keys={}; rows=[];out=False;kind='SINGLE_CORRECT';keymode=False;errors=[]
 for pi,page in enumerate(doc):
  if pi==0:continue
  raw=page.get_text();matches=list(Q_RE.finditer(raw));drawings=page.get_drawings() if vector_review and matches else []
  if 'Answer Key' in raw:keymode=True
  if keymode:
   for m in SOURCE_KEY_RE.finditer(raw):keys.setdefault(int(m[1]),[]).append(dict(answer=None if m[2]=='Scan QR' else re.sub(r'\s','',m[2]),page=pi+1,evidence=m[0].strip()))
   continue
  for i,m in enumerate(matches):
   before=raw[:m.start()]; headings=list(re.finditer(r'(?m)^(Out of syllabus|MCQ \([^\n]+\))',before))
   for h in headings:
    if h[1]=='Out of syllabus':out=True
    elif 'More than' in h[1]:kind='MULTIPLE_CORRECT'
    else:kind='SINGLE_CORRECT'
   number=int(m[1]);body=raw[m.end():matches[i+1].start() if i+1<len(matches) else len(raw)]
   lines=body.strip().splitlines();exam=lines[0] if lines else '';year=re.search(r'\b(19\d{2}|20\d{2})\b',exam)
   stem,options,flags=parse_question_body('\n'.join(lines[1:]));
   if not year:flags.append('YEAR_REVIEW_REQUIRED')
   if 'Open solution' not in body:flags.append('CONTINUATION_REVIEW_REQUIRED')
   rects=page.search_for('Q'+str(number)+'.');top=rects[0].y0-3 if rects else 0
   nxt=page.search_for('Q'+matches[i+1][1]+'.') if i+1<len(matches) else []
   end=nxt[0].y0-3 if nxt else page.rect.height-75
   region=fitz.Rect(25,top,page.rect.width-25,end)
   visuals=[im for im in page.get_image_info() if im['width'] not in [900,120] and fitz.Rect(im['bbox']).intersects(region) and im['bbox'][0]<page.rect.width-100]
   # Embedded formula images are visual content too; no claim that this counts only diagrams.
   vectors=[d for d in drawings if d['rect'].intersects(region) and d['rect'].x0<page.rect.width-100 and d['rect'].width<page.rect.width-70 and d['rect'].height<page.rect.height-100]
   if visuals or vectors:flags.append('VISUAL_OR_FORMULA_REVIEW')
   if vectors:flags.append('VECTOR_FORMULA_OR_STRUCTURE_REVIEW')
   if re.search(r'figure|diagram|graph|circuit',stem,re.I):flags.append('DIAGRAM_REFERENCE')
   qid=str(uuid.uuid5(uuid.NAMESPACE_URL,meta['id']+':'+str(number)))
   media=output_dir/'media'/f'{qid}.png'
   if render and not media.exists():
    media.parent.mkdir(exist_ok=True,parents=True);page.get_pixmap(matrix=fitz.Matrix(1.4,1.4),clip=region,alpha=False).save(media)
   flags+=['ACADEMIC_REVIEW_REQUIRED','TOPIC_REVIEW_REQUIRED','RIGHTS_UNVERIFIED','ELIGIBILITY_UNVERIFIED']
   rows.append(dict(id=qid,sourceId=meta['id'],number=number,page=pi+1,exam=exam,year=int(year[1]) if year else None,stem=stem,options=options,kind=kind,sourceOut=out,flags=sorted(set(flags)),media=str(media.relative_to(ROOT)),visual=bool(visuals or vectors),sourceText=body.split('Open solution')[0],contentHash=hashlib.sha256((stem+'|'+ '|'.join(options)).encode()).hexdigest()))
  # Headings can be at the end of a page, after its last question.
  tail=raw[matches[-1].end():] if matches else raw
  if re.search(r'(?m)^Out of syllabus\s*\n\d+ questions',tail):out=True
  if 'MCQ (More than One Correct Answer)' in tail:kind='MULTIPLE_CORRECT'
 for r in rows:
  evidence=keys.get(r['number'],[]);answers=set(e['answer'] for e in evidence if e['answer'] is not None);r['answerEvidence']=evidence
  r['answer']=next(iter(answers)) if len(answers)==1 else None
  if not r['answer']:r['flags'].append('ANSWER_REVIEW_REQUIRED')
  elif ',' in r['answer']:r['kind']='MULTIPLE_CORRECT'
  r['answerStatus']='SOURCE_MATCHED' if r['answer'] else 'REVIEW_REQUIRED'
 numbers=[r['number'] for r in rows]
 if sorted(numbers)!=list(range(1,meta['declared']+1)):errors.append('QUESTION_SEQUENCE_MISMATCH')
 if len(numbers)!=len(set(numbers)):errors.append('DUPLICATE_SOURCE_NUMBER')
 if sum(r['sourceOut'] for r in rows)!=meta['declaredOut']:errors.append('OUT_OF_SYLLABUS_COUNT_MISMATCH')
 meta.update(parsed=len(rows),matched=sum(r['answer'] is not None for r in rows),multiple=sum(r['kind']=='MULTIPLE_CORRECT' for r in rows),sourceOut=sum(r['sourceOut'] for r in rows),visual=sum(r['visual'] for r in rows),manualReview=len(rows),errors=errors,status='EXTRACTED_PRIVATE' if not errors else 'REVIEW_REQUIRED')
 return rows

