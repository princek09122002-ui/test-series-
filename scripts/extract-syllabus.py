import pymupdf as fitz,re,json,hashlib,pathlib
out=pathlib.Path('.local/syllabus');out.mkdir(exist_ok=True)
records=[]
for f in pathlib.Path(r'C:\Users\princ\Downloads').glob('*SYLLABUS_2026_27_EM.pdf'):
 subject='Physics' if 'Physics' in f.name else 'Biology' if 'Biology' in f.name else 'Chemistry'
 level=int(f.name[:2]);doc=fitz.open(f);lines=[]
 for page,p in enumerate(doc,1):
  for line in p.get_text().splitlines():lines.append((page,line.strip().replace('\ufffd','-')))
 (out/(f.stem+'.txt')).write_text('\n'.join(x[1] for x in lines),encoding='utf8')
 current=None;unit='';skip=False;seen=set()
 for page,line in lines:
  pattern=r'^Unit\s*(\d+)\s*:\s*(.+)' if subject=='Chemistry' else r'^CHAPTER\s*[-–]?\s*(\d+)\s*:\s*(.+)'
  m=re.match(pattern,line,re.I)
  if m:
   number=int(m[1])
   if number in seen: current=None;continue
   seen.add(number);name=m[2];inline=''
   if ':' in name and not name.startswith('SEMICONDUCTOR'):name,inline=name.split(':',1)
   current=dict(subject=subject,classLevel=level,number=number,name=name.strip(),unit=unit if subject!='Chemistry' else name.strip(),page=page,source=f.name,sha256=hashlib.sha256(f.read_bytes()).hexdigest(),body=[inline] if inline else [])
   records.append(current);skip=False;continue
  if re.match(r'^UNIT\s*[-– ]*(?:[IVX]+|[0-9]+)\b',line,re.I):unit=line;current=None;continue
  if re.match(r'^(Practicals?\b|\*?Note\s*[:\-]|All the syllabus|Revision|For relevant|For more|COURSE STRUCTURE)',line,re.I):skip=True
  if current and not skip and line and not re.match(r'^(Page\s*)?\d+$',line):current['body'].append(line)
for r in records:
 body=' '.join(r.pop('body'));r['sourceText']=body
 # Keep semicolon-delimited clauses intact; commas may be part of scientific lists.
 r['topics']=[x.strip(' .') for x in re.split((r',\s+(?=[A-Z])|;|(?<=\.)\s+(?=[A-Z])' if r['subject']=='Chemistry' else r';|(?<=\.)\s+(?=[A-Z])'),body) if x.strip(' .')]
 if not r['topics']:raise ValueError('Empty chapter '+r['name'])
(out/'extracted.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf8')
for s in ['Physics','Chemistry','Biology']:
 for c in [11,12]:
  rows=[r for r in records if r['subject']==s and r['classLevel']==c];print(s,c,len(rows),sum(len(r['topics']) for r in rows));print([r['name'] for r in rows])
