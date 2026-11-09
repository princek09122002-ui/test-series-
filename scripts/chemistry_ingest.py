"""Chemistry private ingestion: pilot before resumable full extraction; never publishes."""
import argparse,json,re,shutil,datetime
from pathlib import Path
import pymupdf as fitz
from chapter_pdf import audit,extract,ROOT
OUT=ROOT/'.local/chemistry-import';VERSION='chemistry-v2'
EXPECTED=['Some Basic Concepts of Chemistry','Structure of Atom','Periodic Table and Periodicity','Chemical Bonding and Molecular Structure','Redox Reactions','Thermodynamics','Chemical Equilibrium','Ionic Equilibrium','Some Basic Concepts of Organic Chemistry','Hydrocarbons','Solutions','Electrochemistry','Chemical Kinetics','d and f Block Elements','Coordination Compounds','p-Block Elements','Haloalkanes and Haloarenes','Alcohol, Phenols and Ethers','Aldehydes, Ketones and Carboxylic Acids','Organic Compounds Containing Nitrogen','Biomolecules','Nuclear Chemistry']
PILOT=[('mole numerical','Some Basic Concepts of Chemistry',r'mol|mass'),('ionic equilibrium','Ionic Equilibrium',r'pH|acid'),('electrochemical cell','Electrochemistry',r'cell|potential'),('reaction scheme','Aldehydes, Ketones and Carboxylic Acids',r'reaction|product'),('aromatic structure','Hydrocarbons',r'benzene|aromatic'),('stereochemistry','Some Basic Concepts of Organic Chemistry',r'isomer|stereo|optical'),('coordination complex','Coordination Compounds',r'complex|coordination'),('orbital configuration','Structure of Atom',r'configuration|orbital'),('assertion reason','Biomolecules',r'Assertion|Statement I'),('match following','Chemical Bonding and Molecular Structure',r'Match'),('multiple correct',None,None),('source out of syllabus',None,None)]
def render(meta,r):
 path=ROOT/r['media']
 if path.exists():return
 doc=fitz.open(meta['path']);pg=doc[r['page']-1];markers=list(re.finditer(r'(?m)^Q(\d+)\.\s*$',pg.get_text()));numbers=[int(m[1]) for m in markers];i=numbers.index(r['number']);rects=pg.search_for(f"Q{r['number']}.");nxt=pg.search_for(f'Q{numbers[i+1]}.') if i+1<len(numbers) else []
 clip=fitz.Rect(25,rects[0].y0-3 if rects else 0,pg.rect.width-25,nxt[0].y0-3 if nxt else pg.rect.height-75)
 path.parent.mkdir(exist_ok=True,parents=True);pg.get_pixmap(matrix=fitz.Matrix(1.7,1.7),clip=clip,alpha=False).save(path)
def enriched(meta):
 rows=extract(meta,output_dir=OUT,vector_review=True)
 for r in rows:
  r.update(subject='Chemistry',contentVersion=VERSION,extractedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),presentationStatus='REVIEW_REQUIRED',solutionStatus='MISSING')
  if r['visual']:r['flags']=sorted(set(r['flags']+['CHEMICAL_STRUCTURE_OR_FORMULA_REVIEW']))
 meta.update(subject='Chemistry',version=VERSION,yearRange=[min(r['year'] for r in rows if r['year']),max(r['year'] for r in rows if r['year'])],examLabels=sorted(set(r['exam'] for r in rows)),keyPages=sorted(set(e['page'] for r in rows for e in r['answerEvidence'])),missingAnswers=sum(r['answer'] is None for r in rows),emptyTextOptions=sum(any(not x for x in r['options']) for r in rows),continuationIssues=sum('CONTINUATION_REVIEW_REQUIRED' in r['flags'] for r in rows))
 return rows

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--full',action='store_true');args=parser.parse_args();OUT.mkdir(exist_ok=True);(OUT/'batches').mkdir(exist_ok=True);(OUT/'sources').mkdir(exist_ok=True)
 manifest=audit(Path.home()/'Downloads','Chemistry');assert sorted(m['title'] for m in manifest)==sorted(EXPECTED),'Chemistry source list mismatch'
 if args.full and not (OUT/'pilot-reviewed.json').exists():raise ValueError('Inspect pilot PDF regions and record review before full extraction')
 allrows=[];metadata={}
 for meta in manifest:
  if not args.full and meta['title'] not in [p[1] for p in PILOT if p[1]]:continue
  cache=OUT/'batches'/f"{meta['id']}.json";checkpoint=OUT/'batches'/f"{meta['id']}.meta.json"
  if cache.exists() and checkpoint.exists() and json.loads(checkpoint.read_text())['version']==VERSION:
   saved=json.loads(checkpoint.read_text());rows=json.loads(cache.read_text());meta.update(saved)
  else:
   rows=enriched(meta);cache.write_text(json.dumps(rows,ensure_ascii=False),encoding='utf8');checkpoint.write_text(json.dumps(meta,ensure_ascii=False),encoding='utf8')
  if args.full:
   for r in rows:render(meta,r)
   shutil.copy2(meta['path'],OUT/'sources'/f"{meta['id']}.pdf")
  metadata[meta['id']]=meta;allrows.extend(rows);print(meta['title'],len(rows),meta['matched'],meta['errors'],flush=True)
 if args.full:
  (OUT/'questions.json').write_text(json.dumps(allrows,ensure_ascii=False),encoding='utf8');(OUT/'chemistry-import-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8');return
 samples=[];used=set()
 for label,title,pattern in PILOT:
  candidates=[r for r in allrows if r['id'] not in used and (not title or metadata[r['sourceId']]['title']==title)]
  if label=='multiple correct':candidates=[r for r in candidates if r['kind']=='MULTIPLE_CORRECT']
  elif label=='source out of syllabus':candidates=[r for r in candidates if r['sourceOut']]
  else:candidates=[r for r in candidates if re.search(pattern,r['sourceText'],re.I)]
  if not candidates:samples.append({'label':label,'issue':'No matching sample in pilot files; expand pilot'});continue
  r=candidates[0];used.add(r['id']);meta=metadata[r['sourceId']];render(meta,r);samples.append({'label':label,'source':meta['title'],'file':meta['file'],'row':r})
 (OUT/'pilot.json').write_text(json.dumps(samples,ensure_ascii=False,indent=2),encoding='utf8');print('Pilot samples:',len(samples),flush=True)
if __name__=='__main__':main()
