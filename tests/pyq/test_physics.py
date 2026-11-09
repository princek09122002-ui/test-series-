import sys,json,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts'))
from physics_ingest import audit,extract
class PhysicsExtraction(unittest.TestCase):
 def test_collection(self):
  sources=audit(Path.home()/'Downloads');self.assertEqual(len(sources),26);self.assertEqual(sum(x['pages'] for x in sources),652);self.assertEqual(sum(x['declared'] for x in sources),2346)
 def test_scoped_keys_and_types(self):
  sources=audit(Path.home()/'Downloads')
  for title,number,answer in [('Vector Algebra',1,'D'),('Motion in a Plane',76,'A,B')]:
   q=next(x for x in extract(next(s for s in sources if s['title']==title)) if x['number']==number)
   self.assertEqual(q['answer'],answer)
   self.assertEqual(q['kind'],'MULTIPLE_CORRECT' if ',' in answer else 'SINGLE_CORRECT')
 def test_syllabus_complete(self):
  rows=json.loads(Path('.local/physics-import/syllabus.json').read_text(encoding='utf8'))
  for level in [11,12]:self.assertEqual(sorted(r['number'] for r in rows if r['classLevel']==level),list(range(1,15)))
  self.assertTrue(all(t['sourceRef'] for r in rows for t in r['topics']))
 def test_unresolved_answers_not_guessed(self):
  rows=json.loads(Path('.local/physics-import/questions.json').read_text(encoding='utf8'));self.assertEqual(sum(q['answer'] is None for q in rows),3)
  self.assertEqual(len(set((q['sourceId'],q['number']) for q in rows)),2346)
  self.assertTrue(all('RIGHTS_UNVERIFIED' in q['flags'] for q in rows))
 def test_scan_qr_preserves_key_page_without_guessing(self):
  sources=audit(Path.home()/'Downloads')
  for title,number,page in [('Dual Nature of Radiation and Matter',100,30),('Electromagnetic Induction',39,16),('Rotational Motion',94,29)]:
   q=next(x for x in extract(next(s for s in sources if s['title']==title)) if x['number']==number)
   self.assertIsNone(q['answer'])
   self.assertEqual(q['answerStatus'],'REVIEW_REQUIRED')
   self.assertEqual(q['answerEvidence'],[{'answer':None,'page':page,'evidence':f'{number}. Scan QR'}])
if __name__=='__main__':unittest.main()
