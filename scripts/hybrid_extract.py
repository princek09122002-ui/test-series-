"""Coordinate-based private re-extraction. Raw imports are never overwritten."""
import argparse, hashlib, json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.local/python'))
import pymupdf as fitz

VERSION = 'hybrid-coordinate-v1'
parser = argparse.ArgumentParser()
parser.add_argument('--pilot', action='store_true')
args = parser.parse_args()
out = ROOT / '.local/hybrid-extraction'
out.mkdir(exist_ok=True)
summary = {'version': VERSION, 'pdfs': 0, 'detected': 0, 'records': 0, 'segmented': 0, 'fourOptions': 0, 'answerMatched': 0, 'visual': 0, 'reviewRequired': 0, 'missingSources': [], 'papers': []}
results = []
for subject in ['physics', 'chemistry', 'biology']:
    base = ROOT / f'.local/{subject}-import'
    staged = json.loads((base / 'questions.json').read_text(encoding='utf8'))
    groups = {}
    for q in staged: groups.setdefault(q['sourceId'], []).append(q)
    for source_id, questions in groups.items():
        if args.pilot and summary['papers'] and any(p['subject'] == subject for p in summary['papers']): continue
        pdf = base / 'sources' / f'{source_id}.pdf'
        if not pdf.exists(): summary['missingSources'].append(str(pdf)); continue
        if hashlib.sha256(pdf.read_bytes()).hexdigest() != source_id: raise ValueError(f'Source hash mismatch: {pdf}')
        doc = fitz.open(pdf)
        pages, keys, detected = {}, {}, []
        key_mode = False
        section = 'SINGLE_CORRECT'
        for index, page in enumerate(doc):
            textpage = page.get_textpage()
            text = page.get_text(textpage=textpage)
            if re.search(r'(?m)^Answer Key\s*$', text): key_mode = True
            words = page.get_text('words', sort=True, textpage=textpage)
            raw = page.get_text('rawdict', textpage=textpage)
            chars = [dict(c, size=s['size']) for b in raw['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans'] for c in s['chars']]
            images = page.get_image_info()
            if key_mode:
                for m in re.finditer(r'(?m)^(\d+)\.\s+([A-D](?:\s*,\s*[A-D])*|[1-4])\s*$', text):
                    keys.setdefault(int(m[1]), []).append({'answer': re.sub(r'\s', '', m[2]), 'page': index+1, 'text': m[0]})
            anchors = [] if key_mode else [w for w in words if re.fullmatch(r'Q\d+\.', w[4])]
            for anchor in anchors:
                before = page.get_textbox(fitz.Rect(0, 0, page.rect.width, anchor[1]), textpage=textpage)
                headings = re.findall(r'MCQ \([^\n]+\)|Out of syllabus', before)
                if headings:
                    last = headings[-1]
                    section = 'OUT_OF_SYLLABUS' if last == 'Out of syllabus' else 'MULTIPLE_CORRECT' if 'More than' in last else 'SINGLE_CORRECT'
                detected.append({'number': int(anchor[4][1:-1]), 'page': index+1, 'bbox': list(anchor[:4]), 'section': section})
            pages[index+1] = {'words': words, 'chars': chars, 'images': images, 'anchors': anchors, 'dimensions': list(page.rect)}
        counts = {}
        for anchor in detected: counts[anchor['number']] = counts.get(anchor['number'], 0)+1
        paper = {'subject': subject, 'sourceId': source_id, 'staged': len(questions), 'detected': len(detected), 'segmented': 0, 'identityCollisions': [n for n,c in counts.items() if c>1]}
        for q in questions:
            matches = [a for a in detected if a['number']==q['number'] and a['page']==q['page']]
            warnings = []
            segments = []
            structured = {'stem': {'kind':'text','text':q.get('stem','')}, 'options':[{'label':letter,'kind':'text','text':value} for letter,value in zip('ABCD',q.get('options',[]))]}
            evidence = keys.get(q['number'], [])
            matched = len({k['answer'] for k in evidence})==1 and bool(evidence) and counts.get(q['number'])==1
            if not matched: warnings.append('ANSWER_IDENTITY_REVIEW')
            if len(matches)!=1 or counts.get(q['number'])!=1: warnings.append('QUESTION_IDENTITY_REVIEW')
            else:
                anchor = matches[0]
                next_anchor = next((a for a in detected if a['page']>anchor['page'] or (a['page']==anchor['page'] and a['bbox'][1]>anchor['bbox'][1]+2)), None)
                end_page = next_anchor['page'] if next_anchor else anchor['page']
                if end_page>anchor['page'] and next_anchor['bbox'][1]<100: end_page-=1
                for number in range(anchor['page'], end_page+1):
                    page=doc[number-1]; data=pages[number]
                    top=anchor['bbox'][1]-3 if number==anchor['page'] else 45
                    bottom=next_anchor['bbox'][1]-3 if next_anchor and number==next_anchor['page'] else page.rect.height-75
                    if bottom<=top: continue
                    rect=fitz.Rect(25,top,page.rect.width-25,bottom)
                    chars=[c for c in data['chars'] if rect.contains(fitz.Rect(c['bbox']))]
                    words=[list(w) for w in data['words'] if rect.contains(fitz.Rect(w[:4]))]
                    images=[im for im in data['images'] if rect.intersects(fitz.Rect(im['bbox']))]
                    filename=f'{q["id"]}-{number}.png'
                    target=out/filename
                    if args.pilot and not target.exists(): page.get_pixmap(matrix=fitz.Matrix(2,2),clip=rect,alpha=False).save(target)
                    segments.append({'page':number,'bbox':list(rect),'dimensions':data['dimensions'],'words':words,'characters':chars,'images':[{'bbox':list(im['bbox']),'width':im['width'],'height':im['height']} for im in images], 'crop':filename})
                if segments: paper['segmented']+=1
            visual = bool(q.get('visual')) or any(im['width'] not in [900,120] and im['bbox'][0] < s['dimensions'][2]-100 for s in segments for im in s['images'])
            if visual: warnings.append('VISUAL_TRANSCRIPTION_REVIEW')
            if any('\ufffd' in c['c'] for s in segments for c in s['characters']): warnings.append('CORRUPTED_GLYPH')
            if len(q.get('options',[]))!=4 or any(not value.strip() for value in q.get('options',[])): warnings.append('MISSING_OPTIONS')
            if not q.get('stem','').strip(): warnings.append('MISSING_STEM')
            if segments and len(segments)>1: warnings.append('MULTIPAGE_LAYOUT_REVIEW')
            warnings += [f for f in q.get('flags',[]) if any(t in f for t in ['FORMULA','STRUCTURE','LAYOUT','CONTINUATION'])]
            # Coordinates and plausible text do not prove transcription fidelity.
            warnings.append('SOURCE_COMPARISON_PENDING')
            record={'id':q['id'],'version':VERSION,'sourceId':source_id,'sourceHash':source_id,'sourceNumber':q['number'],'section':matches[0]['section'] if len(matches)==1 else q.get('kind'),'year':q.get('year'),'paperVariant':q.get('exam'),'method':'PYMUPDF_COORDINATES_WITH_PRIVATE_REFERENCE','structured':structured,'segments':segments,'answerEvidence':evidence,'answerState':'ANSWER_MATCHED' if matched else 'ANSWER_REVIEW_REQUIRED','extractionState':'EXTRACTION_REVIEW_REQUIRED','contentState':'CONTENT_REVIEW_PENDING','academicState':'ACADEMIC_REVIEW_PENDING','rightsState':'RIGHTS_REVIEW_PENDING','warnings':sorted(set(warnings))}
            results.append(record)
            summary['fourOptions']+=int(len(q.get('options',[]))==4 and all(v.strip() for v in q['options']))
            summary['answerMatched']+=int(matched)
            summary['visual']+=int(visual)
        summary['pdfs']+=1; summary['detected']+=len(detected); summary['segmented']+=paper['segmented']; summary['papers'].append(paper)
        print(json.dumps(paper),flush=True)
        doc.close()
summary['records']=len(results); summary['reviewRequired']=len(results)
(out/('pilot.json' if args.pilot else 'records.json')).write_text(json.dumps(results,ensure_ascii=False),encoding='utf8')
(out/('pilot-summary.json' if args.pilot else 'summary.json')).write_text(json.dumps(summary,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in summary.items() if k!='papers'}))
