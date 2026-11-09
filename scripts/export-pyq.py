import json, sqlite3, uuid, re
from pathlib import Path
import pymupdf
root=Path(__file__).resolve().parents[1]
out=root/'.local/pyq-ingest'
manifest=json.loads((out/'manifest.json').read_text())
papers={p['identity']:p for p in manifest['papers'] if not p['duplicate_of_block']}
db=sqlite3.connect(out/'staging.sqlite3');db.row_factory=sqlite3.Row
doc=pymupdf.open(manifest['files'][0]['file'])
media=root/'.local/question-media';media.mkdir(exist_ok=True)
rows=[];images=0
for row in db.execute('select * from question order by block,number'):
 r=dict(row);flags=json.loads(r['flags_json'])
 key=str(uuid.uuid5(uuid.NAMESPACE_URL,r['source_sha']+r['paper_id']+str(r['number'])))
 image=bool(flags) or r['subject']!='Biology' or bool(re.search(r'[^\x20-\x7e\n]',r['stem']))
 if re.search(r'\d|equation|diagram|figure|graph|match|column|list[ -]i|structure shown',r['stem']+' '+' '.join(r['option_'+c] or '' for c in 'abcd'),re.I): image=True
 if image:
  target=media/(key+'.png')
  if not target.exists():
   page=doc[r['page']-1];start=page.search_for('Q'+str(r['number'])+'.')[0]
   nxt=page.search_for('Q'+str(r['number']+1)+'.')
   bottom=nxt[0].y0-3 if nxt else page.rect.height-75
   clip=pymupdf.Rect(30,start.y0-3,page.rect.width-30,bottom)
   # Render a temporary page; omit the solution QR/link area, without changing the source PDF.
   temp=pymupdf.open();temp.insert_pdf(doc,from_page=r['page']-1,to_page=r['page']-1)
   temp[0].draw_rect(pymupdf.Rect(page.rect.width-95,start.y0-3,page.rect.width-30,start.y0+68),color=(1,1,1),fill=(1,1,1),overlay=True)
   temp[0].get_pixmap(matrix=pymupdf.Matrix(1.6,1.6),clip=clip,alpha=False).save(target);temp.close()
  images+=1
 r.update(id=key,image=image,paper=papers[r['paper_id']]['label'])
 rows.append(r)
(out/'app-import.json').write_text(json.dumps(rows,ensure_ascii=False),encoding='utf8')
print(json.dumps({'questions':len(rows),'image':images,'text':len(rows)-images}))
