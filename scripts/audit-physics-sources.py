"""Independent source reconciliation. Does not call the production extractor."""
import json,re,hashlib,collections
from pathlib import Path
import pymupdf as fitz
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'.local/physics-audit';db=json.loads((OUT/'database.json').read_text(encoding='utf8'))
names=['Semiconductor Electronics','Atoms and Nuclei','Dual Nature of Radiation and Matter','Geometrical Optics','Wave Optics','Current Electricity','Moving Charges and Magnetism','Electromagnetic Induction','Electromagnetic Waves','Alternating Current','Magnetism and Matter','Capacitor','Electrostatics','Vector Algebra','Motion in a Plane','Work, Energy and Power','Rotational Motion','Properties of Matter','Oscillations','Waves','Heat and Thermodynamics','Gravitation','Center of Mass and Collision','Laws of Motion','Motion in a Straight Line','Units & Measurement']
result={'files':[],'syllabus':[],'keyExceptions':[],'issues':[]};allkeymatches=0
for name in names:
 p=Path.home()/'Downloads'/f'NEET {name} Previous Year Questions with Answer Key.pdf'
 if not p.exists():result['issues'].append('Missing PDF '+str(p));continue
 sha=hashlib.sha256(p.read_bytes()).hexdigest();source=next((s for s in db['sources'] if s['sha256']==sha),None)
 if not source:result['issues'].append('No stored source for '+p.name);continue
 d=fitz.open(p);cover=d[0].get_text();declared=int(re.search(r'(\d+)\s+QUESTIONS',cover)[1]);keypages=False;keys={};anchors={};duplicates=[];duplicateQuestions=[]
 for pi,pg in enumerate(d):
  if pi==0:continue
  text=pg.get_text(sort=True)
  if re.search(r'(?m)^Answer Key\s*$',text):keypages=True
  if keypages:
   # Key-table cells are distinct text blocks; retain unknown values as evidence too.
   for block in pg.get_text('blocks'):
    for match in re.finditer(r'(?m)^\s*(\d+)\.\s*((?:[A-D](?:\s*,\s*[A-D])*)|Scan QR)\s*$',block[4]):
     n=int(match[1]);value=re.sub(r'\s+','',match[2]);cell={'answer':None if value=='ScanQR' else value,'raw':match[0].strip(),'page':pi+1,'bbox':list(block[:4])}
     if n in keys:duplicates.append(n)
     keys[n]=cell
  else:
   # Question identity and source label use a separate pass, never global key numbering.
   raw=pg.get_text();matches=list(re.finditer(r'(?m)^Q(\d+)\.\s*$',raw))
   for mi,m in enumerate(matches):
    n=int(m[1]);body=raw[m.end():matches[mi+1].start() if mi+1<len(matches) else len(raw)].strip();label=body.splitlines()[0]
    if n in anchors:duplicateQuestions.append(n)
    year=re.search(r'\b(19\d{2}|20\d{2})\b',label)
    anchors[n]={'page':pi+1,'exam':label,'year':int(year[1]) if year else None,'sourceText':body.split('Open solution')[0].strip()}

 rows=[r for r in db['records'] if r['sourceId']==source['id']];mismatch=[];matches=0
 for r in rows:
  n=r['sourceNumber'];key=keys.get(n);ex=r['extracted'];anchor=anchors.get(n)
  if not anchor or anchor['page']!=r['page'] or anchor['exam']!=r['exam'] or anchor['year']!=r['year']:mismatch.append({'q':n,'kind':'source_identity'})
  if anchor and re.sub(r'\s+',' ',anchor['sourceText']).strip()!=re.sub(r'\s+',' ',ex.get('sourceText','')).strip():mismatch.append({'q':n,'kind':'source_text'})
  if not key or ex.get('answer')!=key['answer']:mismatch.append({'q':n,'kind':'answer_value','pdf':key,'stored':ex.get('answer')})
  elif key['answer']:
   matches+=1
   if not any(e['page']==key['page'] and e['answer']==key['answer'] for e in ex.get('answerEvidence',[])):mismatch.append({'q':n,'kind':'key_evidence'})
  else:result['keyExceptions'].append({'source':name,'question':n,'key':key,'storedEvidence':ex.get('answerEvidence',[])})
  if not (ROOT/ex['media']).exists():mismatch.append({'q':n,'kind':'missing_media'})
 copy=ROOT/'.local/physics-import/sources'/f'{sha}.pdf'
 copyok=copy.exists() and hashlib.sha256(copy.read_bytes()).hexdigest()==sha
 checks={'source':name,'file':p.name,'sha256':sha,'pages':len(d),'declared':declared,'questionAnchors':len(anchors),'stored':len(rows),'keyCells':len(keys),'matchedKeys':matches,'unknownKeys':sum(k['answer'] is None for k in keys.values()),'duplicates':duplicates,'duplicateQuestionNumbers':duplicateQuestions,'numberSequenceComplete':sorted(anchors)==list(range(1,declared+1)),'privateCopyHashMatches':copyok,'mismatches':mismatch}
 result['files'].append(checks);allkeymatches+=matches
 if mismatch or duplicates or duplicateQuestions or len(rows)!=declared or not checks['numberSequenceComplete'] or len(keys)!=declared or not copyok:result['issues'].append(name+' reconciliation failed')
# Reconcile every source theory chapter against its stored source text and selectable topic text.
normalize=lambda s:re.sub(r'[^a-z0-9]+',' ',s.lower()).strip()
for level in [11,12]:
 p=Path.home()/'Downloads'/f'{level}_Physics_SYLLABUS_2026_27_EM.pdf';d=fitz.open(p);text='\n'.join(pg.get_text() for pg in d);text=text.split('COURSE STRUCTURE')[0];heads=list(re.finditer(r'(?mi)^CHAPTER[\s\u2013\u2014\ufffd-]*(\d+)\s*:\s*([^\n]+)',text))
 for i,h in enumerate(heads):
  n=int(h[1]);c=next((c for c in db['chapters'] if c['id']==f'physics-school-{level}-{n}'),None)
  segment=text[h.end():heads[i+1].start() if i+1<len(heads) else len(text)]
  segment=re.split(r'(?mi)^\s*(?:UNIT[\s\u2013\u2014\ufffd-]*(?:[IVX]+|\d+)\b|\*?Note|All the syllabus|Revision|For relevant)',segment)[0]
  header=h[2]
  if level==11 and n==11:segment=header.split(':',1)[1]+' '+segment
  if level==12 and n==14:segment=re.sub(r'^\s*CIRCUITS\b','',segment)
  segment=re.sub(r'(?m)^\s*\d+\s*$','',segment)
  expected=normalize(segment);stored=normalize(c['topics'][0]['description'] or '') if c else ''
  topictext=normalize(' '.join(t['name'] for t in sorted(c['topics'],key=lambda t:t['order']) if t['active'])) if c else ''
  missing=list((collections.Counter(expected.split())-collections.Counter(topictext.split())).elements())
  entry={'class':level,'chapter':n,'name':c['name'] if c else header,'exists':bool(c),'topics':len(c['topics']) if c else 0,'sourceTextMatches':expected==stored,'missingTopicWords':missing,'active':c['active'] if c else False,'sourceHashReferenced':all(hashlib.sha256(p.read_bytes()).hexdigest() in (t['ncertRef'] or '') for t in c['topics']) if c else False}
  result['syllabus'].append(entry)
  if not c or expected!=stored or missing:result['issues'].append(f'Syllabus {level} chapter {n}: body/topic coverage mismatch')
result['totals']={'files':len(result['files']),'pages':sum(f['pages'] for f in result['files']),'questions':sum(f['stored'] for f in result['files']),'keysMatched':allkeymatches,'keyExceptions':len(result['keyExceptions']),'schoolChapters':len(result['syllabus']),'schoolTopics':sum(c['topics'] for c in result['syllabus'])}
(OUT/'source-reconciliation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'totals':result['totals'],'issues':result['issues'],'exceptions':result['keyExceptions']},ensure_ascii=False,indent=2))
