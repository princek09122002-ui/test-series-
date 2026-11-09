"""Independent source-PDF reconciliation for the private Biology import."""
import collections
import hashlib
import json
import re
from pathlib import Path
import pymupdf

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'.local/biology-import'
manifest=json.loads((BASE/'biology-import-manifest.json').read_text(encoding='utf8'))
rows=json.loads((BASE/'questions.json').read_text(encoding='utf8'))
syllabus=json.loads((BASE/'syllabus.json').read_text(encoding='utf8'))
result={'files':[],'syllabus':[],'issues':[],'keyExceptions':[]}

for source in manifest:
    path=Path.home()/'Downloads'/source['file']
    doc=pymupdf.open(path)
    sha=hashlib.sha256(path.read_bytes()).hexdigest()
    cover=doc[0].get_text()
    declared=int(re.search(r'(\d+)\s+QUESTIONS',cover)[1])
    keymode=False; keys={}; questions={}; duplicate=[]
    for pi,page in enumerate(doc):
        if pi==0:continue
        text=page.get_text()
        if re.search(r'(?m)^Answer Key\s*$',text):keymode=True
        if keymode:
            for block in page.get_text('blocks'):
                for m in re.finditer(r'(?m)^\s*(\d+)\.\s*([A-D](?:\s*,\s*[A-D])*|Scan QR|[1-4])\s*$',block[4]):
                    n=int(m[1]);value=re.sub(r'\s','',m[2]);key={'answer':None if value=='ScanQR' else value,'page':pi+1,'evidence':m[0].strip()}
                    if n in keys:duplicate.append(('key',n))
                    keys[n]=key
        else:
            found=list(re.finditer(r'(?m)^Q(\d+)\.\s*$',text))
            for i,m in enumerate(found):
                n=int(m[1]);body=text[m.end():found[i+1].start() if i+1<len(found) else len(text)].strip()
                exam=body.splitlines()[0]
                y=re.search(r'\b(19\d{2}|20\d{2})\b',exam)
                if n in questions:duplicate.append(('question',n))
                questions[n]={'exam':exam,'year':int(y[1]) if y else None,'page':pi+1,'text':body.split('Open solution')[0].strip()}
    stored=[r for r in rows if r['sourceId']==source['id']]
    mismatches=[];missing_media=0;matched=0
    for row in stored:
        n=row['number'];q=questions.get(n);key=keys.get(n)
        if not q or any(q[k]!=row[k] for k in ['exam','year','page']):mismatches.append((n,'PROVENANCE'))
        if q and re.sub(r'\s+',' ',q['text'])!=re.sub(r'\s+',' ',row['sourceText']).strip():mismatches.append((n,'SOURCE_TEXT'))
        if not key or key['answer']!=row['answer']:mismatches.append((n,'ANSWER_KEY'))
        elif not any(e['answer']==key['answer'] and e['page']==key['page'] for e in row['answerEvidence']):mismatches.append((n,'KEY_EVIDENCE'))
        elif key['answer'] and re.fullmatch(r'[A-D](?:,[A-D])*',key['answer']):matched+=1
        else:result['keyExceptions'].append({'source':source['title'],'question':n,'status':row['answerStatus'],**key})
        if not (ROOT/row['media']).is_file():missing_media+=1
    private=BASE/'sources'/f'{sha}.pdf'
    copy_ok=private.is_file() and hashlib.sha256(private.read_bytes()).hexdigest()==sha
    out_declared=source['declaredOut']
    record={'source':source['title'],'file':source['file'],'sha256':sha,'sourceHashMatches':sha==source['id'],
            'privateCopyMatches':copy_ok,'pages':len(doc),'declared':declared,'detected':len(questions),'stored':len(stored),
            'keyCells':len(keys),'sourceMatched':matched,'missingKeys':sum(k['answer'] is None for k in keys.values()),
            'completeSequence':sorted(questions)==list(range(1,declared+1)),'duplicateNumbers':duplicate,
            'sourceOutDeclared':out_declared,'sourceOutStored':sum(r['sourceOut'] for r in stored),
            'multipleCorrectStored':sum(r['kind']=='MULTIPLE_CORRECT' for r in stored),
            'visualCandidates':sum(r['visual'] for r in stored),'emptyTextOptions':sum(any(not o for o in r['options']) for r in stored),
            'missingMedia':missing_media,'mismatches':mismatches}
    result['files'].append(record)
    if not all([record['sourceHashMatches'],copy_ok,record['completeSequence'],declared==len(stored)==len(keys),
                not duplicate,not mismatches,not missing_media,out_declared==record['sourceOutStored']]):result['issues'].append(source['title'])

for level,filename in [(11,'11_Biology_SYLLABUS_2026_27_EM.pdf'),(12,'12_Biology_SYLLABUS_2026_27_EM.pdf')]:
    path=Path.home()/'Downloads'/filename
    doc=pymupdf.open(path)
    sha=hashlib.sha256(path.read_bytes()).hexdigest()
    source_chapters=[c for c in syllabus if c['classLevel']==level and c['scope']=='THEORY']
    expected=19 if level==11 else 13
    checks=[]
    for n in range(1,expected+1):
        chapter=next(c for c in source_chapters if c['number']==n)
        page=doc[chapter['page']-1].get_text()
        checks.append({'id':chapter['id'],'name':chapter['name'],'topics':len(chapter['topics']),
                       'sourcePage':chapter['page'],'headingOnPage':bool(re.search(rf'Chapter-\s*{n}:',page)),
                       'sourceHashMatches':chapter['hash']==sha})
    if not all(c['headingOnPage'] and c['sourceHashMatches'] for c in checks):result['issues'].append(filename)
    result['syllabus'].append({'class':level,'file':filename,'sha256':sha,'pagesRead':len(doc),'theoryChapters':checks,
                               'additionalScopes':[{'name':c['name'],'scope':c['scope'],'topics':len(c['topics'])} for c in syllabus if c['classLevel']==level and c['scope']!='THEORY']})

(BASE/'source-reconciliation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'files':len(result['files']),'pages':sum(f['pages'] for f in result['files']),
                  'declared':sum(f['declared'] for f in result['files']),
                  'stored':sum(f['stored'] for f in result['files']),
                  'keysMatched':sum(f['sourceMatched'] for f in result['files']),
                  'keyExceptions':result['keyExceptions'],'issues':result['issues']},indent=2))
