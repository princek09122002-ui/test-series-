"""Independent reconciliation against original Chemistry PDFs and both full school syllabi."""
import json,re,hashlib,collections
from pathlib import Path
import pymupdf as fitz
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'.local/chemistry-import';db=json.loads((BASE/'database-audit.json').read_text(encoding='utf8'));result={'files':[],'syllabus':[],'issues':[],'keyExceptions':[]}
for source in db['sources']:
 path=Path.home()/'Downloads'/source['fileName'];doc=fitz.open(path);sha=hashlib.sha256(path.read_bytes()).hexdigest();cover=doc[0].get_text();declared=int(re.search(r'(\d+)\s+QUESTIONS',cover)[1]);keys={};questions={};duplicate=[];keymode=False
 for pi,pg in enumerate(doc):
  if pi==0:continue
  text=pg.get_text()
  if re.search(r'(?m)^Answer Key\s*$',text):keymode=True
  if keymode:
   for b in pg.get_text('blocks'):
    for m in re.finditer(r'(?m)^\s*(\d+)\.\s*([A-D](?:\s*,\s*[A-D])*|Scan QR)\s*$',b[4]):
     n=int(m[1]);val=re.sub(r'\s','',m[2]);key={'answer':None if val=='ScanQR' else val,'page':pi+1,'evidence':m[0].strip()}
     if n in keys:duplicate.append(('key',n))
     keys[n]=key
  else:
   found=list(re.finditer(r'(?m)^Q(\d+)\.\s*$',text))
   for i,m in enumerate(found):
    n=int(m[1]);body=text[m.end():found[i+1].start() if i+1<len(found) else len(text)].strip();exam=body.splitlines()[0];year=re.search(r'\b(19\d{2}|20\d{2})\b',exam)
    if n in questions:duplicate.append(('question',n))
    questions[n]={'exam':exam,'year':int(year[1]) if year else None,'page':pi+1,'text':body.split('Open solution')[0].strip()}
 rows=[r for r in db['records'] if r['sourceId']==source['id']];mismatch=[];missingmedia=0;matched=0
 for r in rows:
  n=r['sourceNumber'];q=questions.get(n);key=keys.get(n);e=r['extracted']
  if not q or any(q[k]!=r[k] for k in ['exam','year','page']):mismatch.append({'question':n,'issue':'PROVENANCE'})
  if q and re.sub(r'\s+',' ',q['text'])!=re.sub(r'\s+',' ',e['sourceText']).strip():mismatch.append({'question':n,'issue':'RAW_SOURCE_TEXT'})
  if not key or key['answer']!=e['answer']:mismatch.append({'question':n,'issue':'ANSWER_KEY'})
  elif not any(ev['answer']==key['answer'] and ev['page']==key['page'] for ev in e['answerEvidence']):mismatch.append({'question':n,'issue':'KEY_EVIDENCE'})
  elif key['answer']:matched+=1
  else:result['keyExceptions'].append({'source':source['title'],'question':n,**key})
  if not (ROOT/e['media']).exists():missingmedia+=1
 copy=BASE/'sources'/f'{sha}.pdf';copyok=copy.exists() and hashlib.sha256(copy.read_bytes()).hexdigest()==sha
 row={'source':source['title'],'file':source['fileName'],'sha256':sha,'sourceHashMatches':sha==source['sha256'],'privateCopyMatches':copyok,'pages':len(doc),'declared':declared,'detected':len(questions),'stored':len(rows),'keyCells':len(keys),'sourceMatched':matched,'missingKeys':sum(k['answer'] is None for k in keys.values()),'completeSequence':sorted(questions)==list(range(1,declared+1)),'duplicateNumbers':duplicate,'missingMedia':missingmedia,'mismatches':mismatch}
 result['files'].append(row)
 if not all([row['sourceHashMatches'],copyok,row['completeSequence'],declared==len(rows)==len(keys),not duplicate,not mismatch,not missingmedia]):result['issues'].append(source['title'])
normalize=lambda s:re.sub(r'[^\w]+',' ',s.lower()).strip()
local=json.loads((BASE/'syllabus.json').read_text(encoding='utf8'))
for level,name in [(11,'11_chemistry_SYLLABUS_2026_27_EM.pdf'),(12,'12_chemitry_SYLLABUS_2026_27_EM.pdf')]:
 path=Path.home()/'Downloads'/name;doc=fitz.open(path);text='\n'.join(pg.get_text() for pg in doc);sha=hashlib.sha256(path.read_bytes()).hexdigest();heads=list(re.finditer(r'(?m)^\s*Unit\s+(\d+):\s*([^\n]+)\n',text));chapters=[]
 for i,h in enumerate(heads):
  n=int(h[1]);body=text[h.end():heads[i+1].start() if i+1<len(heads) else len(text)];body=re.split(r'(?mi)^\s*(?:NOTE\s*:|MID\s*-?\s*TERM|Sr\.No\.|PRACTICAL)',body)[0];body=re.sub(r'(?m)^Page \d+\s*$','',body)
  c=next(c for c in db['chapters'] if c['id']==f'chemistry-school-{level}-{n}');topics=c['topics'];missing=list((collections.Counter(normalize(body).split())-collections.Counter(normalize(' '.join(t['name'] for t in topics)).split())).elements())
  match=normalize(body)==normalize(topics[0]['description'] or '')
  chapters.append({'id':c['id'],'name':c['name'],'topics':len(topics),'active':c['active'],'sourceTextMatches':match,'missingTopicWords':missing,'sourceRefsMatch':all(sha in (t['ncertRef'] or '') for t in topics)})
  if not match or missing:result['issues'].append(c['id'])
 for c in [c for c in local if c['classLevel']==level and c['scope']!='THEORY']:
  stored=next(x for x in db['chapters'] if x['id']==c['id']);assert len(stored['topics'])==len(c['topics']);assert stored['active'];
  for t in stored['topics']:
   assert t['name']==next(x['name'] for x in c['topics'] if x['id']==t['id'])
 result['syllabus'].append({'class':level,'file':name,'sha256':sha,'pagesRead':len(doc),'coreChapters':chapters,'additionalScopes':[{'name':c['name'],'scope':c['scope'],'topics':len(c['topics'])} for c in local if c['classLevel']==level and c['scope']!='THEORY']})
before=json.loads((BASE/'before-resume.json').read_text(encoding='utf8'));result['idempotency']={'beforeCount':before['counts']['staged'],'afterCount':db['counts']['staged'],'contentHashUnchanged':before['recordsHash']==db['recordsHash']}
if not result['idempotency']['contentHashUnchanged']:result['issues'].append('Idempotency content mismatch')
(BASE/'source-reconciliation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'files':len(result['files']),'issues':result['issues'],'keyExceptions':result['keyExceptions'],'idempotency':result['idempotency']},indent=2))
