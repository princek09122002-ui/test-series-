import json,unittest,sys
from pathlib import Path
import pymupdf as fitz
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts'))
from chapter_pdf import audit,extract
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'.local/chemistry-import'
class ChemistryExtraction(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.rows=json.loads((BASE/'questions.json').read_text(encoding='utf8'));cls.manifest=json.loads((BASE/'chemistry-import-manifest.json').read_text(encoding='utf8'));cls.syllabus=json.loads((BASE/'syllabus.json').read_text(encoding='utf8'))
 def test_all_sources_and_source_numbers(self):
  sources=audit(Path.home()/'Downloads','Chemistry');self.assertEqual(len(sources),22);self.assertEqual(sum(s['pages'] for s in sources),615);self.assertEqual(sum(s['declared'] for s in sources),1986)
  for s in sources:self.assertEqual(sorted(q['number'] for q in self.rows if q['sourceId']==s['id']),list(range(1,s['declared']+1)))
 def test_complete_school_scopes(self):
  for level,total in [(11,9),(12,10)]:self.assertEqual(sorted(c['number'] for c in self.syllabus if c['classLevel']==level and c['scope']=='THEORY'),list(range(1,total+1)))
  self.assertEqual(sum(c['scope']=='FORMATIVE' for c in self.syllabus),6);self.assertEqual(sum(c['scope']=='PRACTICAL' for c in self.syllabus),2);self.assertEqual(sum(c['scope']=='PROJECT' for c in self.syllabus),2)
 def test_vector_formula_falls_back_to_source_image(self):
  source=next(s for s in self.manifest if s['title']=='Some Basic Concepts of Chemistry');q=next(q for q in extract(dict(source),output_dir=BASE,vector_review=True) if q['number']==2)
  self.assertTrue(q['visual']);self.assertIn('VECTOR_FORMULA_OR_STRUCTURE_REVIEW',q['flags']);self.assertEqual(q['answer'],'B');self.assertEqual(q['options'][1],'352 g')
  pix=fitz.Pixmap(str(ROOT/q['media']));self.assertGreater(pix.width,700);self.assertGreater(pix.height,80)
 def test_every_question_has_a_private_source_crop(self):
  self.assertTrue(all((ROOT/q['media']).is_file() for q in self.rows));self.assertEqual(len(set(q['id'] for q in self.rows)),1986)
 def test_key_exceptions_and_unsupported_types_not_guessed(self):
  missing=[q for q in self.rows if q['answer'] is None];self.assertEqual(len(missing),2);self.assertTrue(all(q['answerStatus']=='REVIEW_REQUIRED' and q['answerEvidence'][0]['evidence'].endswith('Scan QR') for q in missing))
  self.assertEqual(sum(q['kind']=='MULTIPLE_CORRECT' for q in self.rows),12);self.assertEqual(sum(q['sourceOut'] for q in self.rows),14);self.assertTrue(all('RIGHTS_UNVERIFIED' in q['flags'] for q in self.rows))
 def test_pilot_preserves_graphical_options_and_option_order(self):
  pilot=json.loads((BASE/'pilot.json').read_text(encoding='utf8'));aromatic=next(s['row'] for s in pilot if s['label']=='aromatic structure');orbital=next(s['row'] for s in pilot if s['label']=='orbital configuration')
  self.assertTrue(aromatic['visual']);self.assertEqual(aromatic['options'],['','','','']);self.assertEqual(orbital['options'],['D','A','B','C']);self.assertEqual(orbital['answer'],'D')
if __name__=='__main__':unittest.main()
