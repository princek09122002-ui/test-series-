"""Complete Physics theory hierarchy from the two school PDFs; no NEET eligibility inference."""
import json,re,hashlib
from pathlib import Path
import pymupdf as fitz
root=Path(__file__).resolve().parents[1];out=root/'.local/physics-import';rows=[]
for level in [11,12]:
 p=Path.home()/'Downloads'/f'{level}_Physics_SYLLABUS_2026_27_EM.pdf';doc=fitz.open(p);unit='';current=None;skip=False;pendingUnit=False
 for pi,page in enumerate(doc):
  for line in page.get_text().splitlines():
   line=line.strip().replace('\ufffd','-')
   if line.startswith('COURSE STRUCTURE'):skip=True;current=None;break
   if re.match(r'^UNIT[\s–-]*(?:[IVX]+|\d+)\b',line,re.I):unit=line;current=None;skip=False;pendingUnit=True;continue
   m=re.match(r'^CHAPTER[\s–-]*(\d+):\s*(.*)',line,re.I)
   if m:
    n=int(m[1]);
    if any(r['classLevel']==level and r['number']==n for r in rows):current=None;skip=True;continue
    name=m[2];body=[]
    if level==11 and n==11:name,inline=name.split(':',1);body=[inline]
    current=dict(id=f'physics-school-{level}-{n}',classLevel=level,number=n,name=name.title(),unit=unit,source=p.name,page=pi+1,hash=hashlib.sha256(p.read_bytes()).hexdigest(),body=body)
    rows.append(current);pendingUnit=False;skip=False;continue
   if pendingUnit and line and line.upper()==line and not line.isdigit():unit+=' '+line;continue
   if re.match(r'^(\*?Note|All the syllabus|Revision|For relevant|https:)',line,re.I):skip=True
   if current and not skip and line and not line.isdigit():
    if level==12 and current['number']==14 and line=='CIRCUITS':current['name']+=' Circuits'
    else:current['body'].append(line)
 for r in [x for x in rows if x['classLevel']==level]:
  text=' '.join(r.pop('body'));r['sourceText']=text
  # Split instructional clauses, preserving parenthesized qualifications and abbreviations.
  parts=[];buf='';depth=0
  for ch in text:
   depth+=1 if ch=='(' else -1 if ch==')' else 0
   if ch in ',;' and depth==0:
    if buf.strip():parts.append(buf.strip(' .'));buf=''
   else:buf+=ch
  if buf.strip(' .'):parts.append(buf.strip(' .'))
  r['topics']=[dict(id=r['id']+'-t'+str(i+1),name=t,sourceRef=f"{r['source']}#page={r['page']}; sha256={r['hash']}") for i,t in enumerate(parts)]
assert len(rows)==28 and all(r['topics'] for r in rows)
(out/'syllabus.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
print([(c,sum(x['classLevel']==c for x in rows),sum(len(x['topics']) for x in rows if x['classLevel']==c)) for c in [11,12]])
