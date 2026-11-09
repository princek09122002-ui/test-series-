"""Read both complete Chemistry school syllabi; keep theory, formative, practical and project scopes distinct."""
import json,re,hashlib
from pathlib import Path
import pymupdf as fitz
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'.local/chemistry-import';OUT.mkdir(exist_ok=True);rows=[];sources=[]
def clauses(text):
 parts=[];buf='';depth=0
 for ch in text:
  depth+=1 if ch=='(' else -1 if ch==')' else 0
  if ch in ',;' and depth==0:
   if buf.strip(' .'):parts.append(buf.strip(' .'))
   buf=''
  else:buf+=ch
 if buf.strip(' .'):parts.append(buf.strip(' .'))
 return parts

def add(level,key,name,body,page,scope,category,number,filename,sha):
 cid=f'chemistry-school-{level}-{key}';ref=f'{filename}#page={page}; sha256={sha}'
 body=re.sub(r'(?m)^Page \d+\s*$','',body);body=re.sub(r'\s+',' ',body).strip()
 r={'id':cid,'classLevel':level,'number':number,'name':name,'unit':f'{scope}: {name}','source':filename,'page':page,'hash':sha,'sourceText':body,'scope':scope,'category':category,'topics':[]}
 for i,t in enumerate(clauses(body)):
  if t:r['topics'].append({'id':cid+f'-t{i+1}','name':t,'sourceRef':ref,'parentId':None,'scope':scope})
 rows.append(r);return r

refinements={
 (11,1):{'Mole Concept and Molar Masses':['Mole concept','Molar mass'],'Percentage Composition':['Percentage composition','Empirical and molecular formulae'],'Stoichiometry and Stoichiometric Calculations':['Stoichiometry','Stoichiometric calculations']},
 (11,2):{'Discovery of Sub-atomic Particles':['Subatomic particles'],'Atomic Models':['Thomson atomic model','Rutherford atomic model'],'Developments Leading to the Bohr’s Model of Atom':['Electromagnetic radiation','Atomic spectra'],'Bohr’s Model for Hydrogen Atom':['Bohr model','Hydrogen spectrum'],'Towards Quantum Mechanical Model of the Atom':['Matter waves','Uncertainty principle'],'Quantum Mechanical Model of Atom':['Quantum numbers','Atomic orbitals','Electronic configuration']},
 (11,6):{'Acids':['Acids and bases','pH and ionization'],'Buffer Solutions':['Buffer solutions and buffer action']},
 (12,2):{'Galvanic Cells':['Electrode potential'],'Nernst Equation':['Nernst equation and cell potential'],'Electrolytic Cells and Electrolysis':['Electrolysis']},
}
for level,pattern in [(11,'11_chemistry_SYLLABUS_2026_27_EM*.pdf'),(12,'12_chemitry_SYLLABUS_2026_27_EM*.pdf')]:
 candidates=sorted((Path.home()/'Downloads').glob(pattern));assert candidates,'Missing syllabus'
 # Duplicate filenames are acceptable only when their bytes agree.
 hashes={hashlib.sha256(p.read_bytes()).hexdigest() for p in candidates};assert len(hashes)==1,'Conflicting syllabus copies require review'
 p=candidates[0];sha=next(iter(hashes));doc=fitz.open(p);pages=[pg.get_text() for pg in doc];text='\n'.join(pages)
 sources.append({'file':p.name,'sha256':sha,'pages':len(doc),'fullText':text,'duplicateFiles':[x.name for x in candidates[1:]]})
 heads=list(re.finditer(r'(?m)^\s*Unit\s+(\d+):\s*([^\n]+)\n',text))
 for i,h in enumerate(heads):
  n=int(h[1]);body=text[h.end():heads[i+1].start() if i+1<len(heads) else len(text)];body=re.split(r'(?mi)^\s*(?:NOTE\s*:|MID\s*-?\s*TERM|Sr\.No\.|PRACTICAL)',body)[0]
  category=('Organic Chemistry' if n in [8,9] else 'Inorganic Chemistry' if n in [3,4] else 'Physical Chemistry') if level==11 else ('Organic Chemistry' if n>=6 else 'Inorganic Chemistry' if n in [4,5] else 'Physical Chemistry')
  page=1+sum(len(x)+1 for x in pages[:0])
  offset=0
  for pi,txt in enumerate(pages):
   if offset<=h.start()<offset+len(txt)+1:page=pi+1;break
   offset+=len(txt)+1
  r=add(level,str(n),h[2].strip(),body,page,'THEORY',category,n,p.name,sha)
  for t in list(r['topics']):
   for j,name in enumerate(refinements.get((level,n),{}).get(t['name'],[])):
    r['topics'].append({'id':t['id']+f'-s{j+1}','name':name,'sourceRef':t['sourceRef'],'parentId':t['id'],'scope':'THEORY','derivation':'Concept subdivision of source clause; not a verbatim syllabus heading'})
 if level==11:
  section=pages[1];groups=[('formative-block','s & p Block Elements','Inorganic Chemistry','s & p Block Elements','The Gaseous State'),('formative-gas','The Gaseous State','Physical Chemistry','The Gaseous State',None)]
  for i,(key,name,cat,start,end) in enumerate(groups):
   body=section.split(start,1)[1];body=body.split(end,1)[0] if end else body
   add(level,key,name+' (formative only)',body,2,'FORMATIVE',cat,20+i,p.name,sha)
 else:
  section=pages[1].split('MID-TERM EXAMINATION')[0];fheads=list(re.finditer(r'(?m)^([1-4])\.\s*(Surface Chemistry|General Principles and Processes of Isolation of Elements|Polymers|Chemistry in Everyday life)\s*[–-]?',section))
  for i,h in enumerate(fheads):
   body=section[h.end():fheads[i+1].start() if i+1<len(fheads) else len(section)]
   add(level,'formative-'+h[1],h[2]+' (formative only)',body,2,'FORMATIVE',['Physical Chemistry','Inorganic Chemistry','Organic Chemistry','Organic Chemistry'][i],20+i,p.name,sha)
 practical='\n'.join(pages[3:]).split('PROJECTS')[0];practical=re.sub(r'(?m)^Page \d+\s*$','',practical);ph=list(re.finditer(r'(?m)^([A-K])\.\s*([^\n]+)',practical));r=add(level,'practical','Practical Chemistry',practical,4,'PRACTICAL','Practical Chemistry',30,p.name,sha);r['topics']=[]
 for i,h in enumerate(ph):
  body=practical[h.end():ph[i+1].start() if i+1<len(ph) else len(practical)];name=h[2].strip();pid=r['id']+f'-t{i+1}';ref=f'{p.name}#page={4 if h.start()<len(pages[3]) else 5}; sha256={sha}'
  r['topics'].append({'id':pid,'name':name,'sourceRef':ref,'parentId':None,'scope':'PRACTICAL'})
  parts=re.split(r'(?m)^\s*(?:\d+\.|[a-b]\)|[•])\s*',body)
  for j,part in enumerate(parts):
   cleaned=re.sub(r'\s+',' ',re.sub(r'(?mi)^\s*MID\s*-?\s*TERM.*$','',part)).strip()
   if cleaned:r['topics'].append({'id':pid+f'-s{j+1}','name':cleaned,'sourceRef':ref,'parentId':pid,'scope':'PRACTICAL'})
 projects=text.split('PROJECTS',1)[1].split('Evaluation Scheme',1)[0];projects=projects.split('A few suggested Projects',1)[1];projects=re.split(r'(?mi)^Note:',projects)[0]
 r=add(level,'projects','Suggested Chemistry Projects',projects,5,'PROJECT','Practical Chemistry',31,p.name,sha);r['topics']=[]
 for i,part in enumerate(re.split(r'(?m)^\s*[a-h][.)]\s*',projects)):
  cleaned=re.sub(r'\s+',' ',part).strip(' :')
  if cleaned:r['topics'].append({'id':r['id']+f'-t{i+1}','name':cleaned,'sourceRef':f'{p.name}#page=5; sha256={sha}','parentId':None,'scope':'PROJECT'})
assert sum(c['scope']=='THEORY' for c in rows)==19
assert sum(c['scope']=='FORMATIVE' for c in rows)==6
OUT.joinpath('syllabus.json').write_text(json.dumps(sorted(rows,key=lambda c:(c['classLevel'],c['number'])),ensure_ascii=False,indent=2),encoding='utf8');OUT.joinpath('syllabus-sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps([{'class':level,'chapters':sum(c['classLevel']==level for c in rows),'topics':sum(len(c['topics']) for c in rows if c['classLevel']==level)} for level in [11,12]],indent=2))
