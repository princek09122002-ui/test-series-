"""Normalize the complete supplied 2026-27 school Biology syllabi, without claiming NEET eligibility."""
import hashlib
import json
import re
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.local' / 'biology-import'
OUT.mkdir(parents=True, exist_ok=True)
FILES = {11: '11_Biology_SYLLABUS_2026_27_EM.pdf', 12: '12_Biology_SYLLABUS_2026_27_EM.pdf'}
UNITS = {
  11: [(1,4,'Diversity of Living Organisms'),(5,7,'Structural Organization in Plants and Animals'),(8,10,'Cell: Structure and Function'),(11,13,'Plant Physiology'),(14,19,'Human Physiology')],
  12: [(1,3,'Reproduction'),(4,6,'Genetics and Evolution'),(7,8,'Biology and Human Welfare'),(9,10,'Biotechnology and its Applications'),(11,13,'Ecology and Environment')],
}
CLASSIFICATION = {
  11: {1:'Mixed',2:'Mixed',3:'Botany',4:'Zoology',5:'Botany',6:'Botany',7:'Zoology',8:'Mixed',9:'Mixed',10:'Mixed',11:'Botany',12:'Botany',13:'Botany',14:'Zoology',15:'Zoology',16:'Zoology',17:'Zoology',18:'Zoology',19:'Zoology'},
  12: {1:'Botany',2:'Zoology',3:'Zoology',4:'Mixed',5:'Mixed',6:'Mixed',7:'Zoology',8:'Mixed',9:'Mixed',10:'Mixed',11:'Mixed',12:'Mixed',13:'Mixed'},
}
REFINEMENTS = {
  (11,2): ['Five kingdom','Monera','Protista','Fungi','Lichens','Viruses','Viroids'],
  (11,3): ['Algae','Bryophyta','Pteridophyta','Gymnospermae','Angiosperms'],
  (11,4): ['non-chordates','chordates'],
  (11,5): ['root','stem','leaf','inflorescence','flower','fruit','seed','Solanaceae'],
  (11,6): ['dicots','monocots'],
  (11,7): ['digestive','circulatory','respiratory','nervous','reproductive'],
  (11,8): ['Cell theory','prokaryotic','eukaryotic','cell membrane','cell wall','endoplasmic reticulum','golgi bodies','lysosomes','vacuoles','mitochondria','ribosomes','plastids','microbodies','cytoskeleton','cilia','flagella','centrioles','nucleus'],
  (11,9): ['proteins','carbohydrates','lipids','nucleic acids','Enzyme'],
  (11,10): ['Cell cycle','mitosis','meiosis'],
  (11,11): ['photochemical','biosynthetic','photophosphorylation','chemiosmotic','photorespiration','C3','C4'],
  (11,12): ['glycolysis','fermentation','TCA cycle','Electron Transport system','amphibolic','respiratory quotient'],
  (11,13): ['Seed germination','plant growth rate','differentiation','dedifferentiation','redifferentiation','auxin','gibberellin','cytokinin','ethylene','ABA'],
  (11,14): ['Respiratory system','mechanism of breathing','exchange of gases','transport of gases','regulation of respiration','asthma','emphysema'],
  (11,15): ['blood groups','coagulation','lymph','heart','cardiac cycle','cardiac output','ECG','double circulation'],
  (11,16): ['ammonotelism','ureotelism','uricotelism','urine formation','osmoregulation','renin','ADH','dialysis'],
  (11,17): ['ciliary','flagellar','muscular','skeletal muscle','muscle contraction','joints'],
  (11,18): ['Neuron','central nervous system','peripheral nervous system','visceral nervous system','nerve impulse'],
  (11,19): ['hypothalamus','pituitary','pineal','thyroid','parathyroid','adrenal','pancreas','gonads','hormone action'],
  (12,1): ['Flower structure','gametophytes','pollination','outbreeding','pollen-pistil','double fertilization','endosperm','embryo','seed','fruit','apomixis','parthenocarpy','polyembryony'],
  (12,2): ['spermatogenesis','oogenesis','menstrual cycle','fertilisation','implantation','pregnancy','parturition','lactation'],
  (12,3): ['Sexually Transmitted Diseases','birth control','contraception','medical termination','amniocentesis','infertility','IVF','ZIFT','GIFT'],
  (12,4): ['Mendelian inheritance','incomplete dominance','co-dominance','multiple alleles','polygenic inheritance','chromosome theory','Sex determination','linkage','sex linked inheritance','Mendelian disorders','chromosomal disorders'],
  (12,5): ['DNA replication','transcription','genetic code','translation','lac operon','DNA fingerprinting'],
  (12,6): ['Darwin','natural selection','Gene flow','genetic drift','Hardy - Weinberg','adaptive radiation','human evolution'],
  (12,7): ['malaria','dengue','chikungunya','filariasis','ascariasis','typhoid','pneumonia','common cold','amoebiasis','ring worm','vaccines','cancer','HIV','drug and alcohol abuse'],
  (12,8): ['food processing','industrial production','sewage treatment','energy generation','bio-control','bio-fertilizers','Antibiotics'],
  (12,9): ['Genetic Engineering','Recombinant DNA Technology'],
  (12,10): ['Human insulin','vaccine','stem cell','gene therapy','Bt crops','transgenic animals','biosafety','biopiracy','patents'],
  (12,11): ['mutualism','competition','predation','parasitism','growth','birth rate','death rate','age distribution'],
  (12,12): ['components','productivity','decomposition','energy flow','pyramids of number','biomass','energy'],
  (12,13): ['patterns','loss of biodiversity','conservation','hotspots','endangered organisms','extinction','Red Data Book','Sacred Groves','biosphere reserves','national parks','wildlife','sanctuaries','Ramsar sites'],
}
HEADING = re.compile(r'(?m)^Chapter-\s*(\d+):\s*([^\n]+)')
rows=[]; sources=[]
for level, filename in FILES.items():
    p=Path.home()/'Downloads'/filename
    assert p.is_file(), f'Missing {filename}'
    sha=hashlib.sha256(p.read_bytes()).hexdigest()
    doc=pymupdf.open(p)
    pages=[pg.get_text() for pg in doc]
    full='\n'.join(pages)
    sources.append({'file':filename,'sha256':sha,'pages':len(doc),'fullText':full})
    headings=list(HEADING.finditer(full))
    assert len(headings)==(19 if level==11 else 13),(filename,len(headings))
    assert [int(m[1]) for m in headings]==list(range(1,len(headings)+1))
    for i,m in enumerate(headings):
        n=int(m[1]); title=m[2].strip(); body_prefix=''
        if ': ' in title:
            title,body_prefix=title.split(': ',1)
        title=title.rstrip(':').replace('Cell-The Unit of Life','Cell - The Unit of Life').replace('Plant - Growth','Plant Growth')
        body=body_prefix+'\n'+full[m.end():(headings[i+1].start() if i+1<len(headings) else len(full))]
        body=re.split(r'(?mi)^\s*(?:Practicals?\s*\(|Note\s*:?|Unit\s*[–-]|Unit\s+[IVX]+\s*:|●|❖|PROJECT:|Revision\b|Mid\s*[–-]?\s*Term\b)',body)[0]
        body=re.sub(r'(?m)^\s*\d+\s*$', '', body)
        body=re.sub(r'\s+',' ',body).strip()
        assert body, (level,n,title)
        page=next(j+1 for j,pg in enumerate(pages) if f'Chapter-{n}:' in pg or re.search(rf'Chapter-\s*{n}:',pg))
        unit=next(u for a,b,u in UNITS[level] if a<=n<=b)
        cid=f'biology-school-{level}-{n}'; ref=f'{filename}#page={page}; sha256={sha}'
        chapter={'id':cid,'name':title,'classLevel':level,'number':n,'unit':unit,'scope':'THEORY','category':CLASSIFICATION[level][n],
                 'categoryStatus':'PROVISIONAL_REPORTING','source':filename,'page':page,'hash':sha,'sourceText':body,'topics':[]}
        # Preserve the syllabus clauses as parents. Concept children below are literal terms in these clauses.
        clauses=[x.strip(' .') for x in body.split(';') if x.strip(' .')]
        for j,clause in enumerate(clauses):
            chapter['topics'].append({'id':f'{cid}-t{j+1}','name':clause,'parentId':None,'sourceRef':ref,'scope':'THEORY'})
        for term in REFINEMENTS.get((level,n),[]):
            parent=next((t for t in chapter['topics'] if term.lower() in t['name'].lower()),None)
            if parent:
                siblings=[x for x in chapter['topics'] if x['parentId']==parent['id']]
                chapter['topics'].append({'id':f"{parent['id']}-s{len(siblings)+1}",'name':term,'parentId':parent['id'],'sourceRef':ref,
                                          'scope':'THEORY','derivation':'Literal concept subdivision of the source syllabus clause'})
        if (level,n)==(11,11):
            parent=next(t for t in chapter['topics'] if 'biosynthetic phases' in t['name'])
            chapter['topics'].append({'id':parent['id']+'-calvin','name':'Calvin cycle (biosynthetic phase)','parentId':parent['id'],'sourceRef':ref,
                                      'scope':'THEORY','derivation':'Concept label for the source biosynthetic phase and C3 pathway; requires academic review'})
        rows.append(chapter)
    if level==11:
        page=5; scope_text=pages[4].split('Digestion and Absorption',1)[1].split('PRACTICALS',1)[0]
        formative=[('Digestion and Absorption',scope_text)]
    else:
        page=4; scope_text=pages[3].split('Environmental Issues',1)[1].split('PRACTICALS',1)[0]
        formative=[('Environmental Issues',scope_text)]
    for j,(name,body) in enumerate(formative,1):
        cid=f'biology-school-{level}-formative-{j}';ref=f'{filename}#page={page}; sha256={sha}'
        clauses=[re.sub(r'\s+',' ',x).strip(' .:') for x in re.split(r'[;,]',body) if x.strip(' .:')]
        rows.append({'id':cid,'name':name+' (formative only)','classLevel':level,'number':20+j,'unit':'Formative-only school topics','scope':'FORMATIVE','category':'Mixed','categoryStatus':'PROVISIONAL_REPORTING',
                     'source':filename,'page':page,'hash':sha,'sourceText':re.sub(r'\s+',' ',body).strip(),'topics':[{'id':f'{cid}-t{k+1}','name':v,'parentId':None,'sourceRef':ref,'scope':'FORMATIVE'} for k,v in enumerate(clauses)]})
    body='\n'.join(pages[4:] if level==11 else pages[3:]); body=body.split('PRACTICALS',1)[1]
    cid=f'biology-school-{level}-practical';ref=f'{filename}#page={page}; sha256={sha}'
    # Practical items remain selectable as school coverage, but unverified for official-style tests.
    items=[re.sub(r'\s+',' ',x).strip(' .') for x in re.split(r'(?m)^\s*(?:\d+\.|[A-B]:|B\.|●)\s*',body) if len(x.strip())>20]
    rows.append({'id':cid,'name':'Biology Practicals','classLevel':level,'number':30,'unit':'Practical Biology','scope':'PRACTICAL','category':'Mixed','categoryStatus':'PROVISIONAL_REPORTING',
                 'source':filename,'page':page,'hash':sha,'sourceText':re.sub(r'\s+',' ',body).strip(),'topics':[{'id':f'{cid}-t{k+1}','name':v,'parentId':None,'sourceRef':ref,'scope':'PRACTICAL'} for k,v in enumerate(items)]})
    cid=f'biology-school-{level}-project'; ref=f'{filename}#page={page}; sha256={sha}'
    rows.append({'id':cid,'name':'Biology Investigatory Project','classLevel':level,'number':31,'unit':'Practical Biology','scope':'PROJECT','category':'Mixed','categoryStatus':'PROVISIONAL_REPORTING',
                 'source':filename,'page':page,'hash':sha,'sourceText':'Investigatory project and project record','topics':[{'id':cid+'-t1','name':'Investigatory project and project record','parentId':None,'sourceRef':ref,'scope':'PROJECT'}]})

assert len(rows)==38
assert len({r['id'] for r in rows})==len(rows)
assert len({t['id'] for r in rows for t in r['topics']})==sum(len(r['topics']) for r in rows)
(OUT/'syllabus.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'syllabus-sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'chapters':len(rows),'theory':32,'topics':sum(len(r['topics']) for r in rows),
                  'class11Theory':19,'class12Theory':13,'byClass':{str(cl):{'chapters':sum(r['classLevel']==cl for r in rows),'topics':sum(len(r['topics']) for r in rows if r['classLevel']==cl)} for cl in (11,12)}},indent=2))
