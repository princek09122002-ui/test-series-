import json
import sys
import unittest
from pathlib import Path
import pymupdf

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts'))
from biology_ingest import discover
BASE=ROOT/'.local/biology-import'

class BiologyExtraction(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest=json.loads((BASE/'biology-import-manifest.json').read_text(encoding='utf8'))
        cls.rows=json.loads((BASE/'questions.json').read_text(encoding='utf8'))
        cls.syllabus=json.loads((BASE/'syllabus.json').read_text(encoding='utf8'))
        cls.audit=json.loads((BASE/'source-reconciliation.json').read_text(encoding='utf8'))

    def test_all_32_sources_and_question_numbers(self):
        sources=discover()
        self.assertEqual(len(sources),32)
        self.assertEqual(sum(s['pages'] for s in sources),979)
        self.assertEqual(sum(s['declared'] for s in sources),4260)
        self.assertEqual(len({s['id'] for s in sources}),32)
        for source in sources:
            self.assertEqual(sorted(r['number'] for r in self.rows if r['sourceId']==source['id']),list(range(1,source['declared']+1)))

    def test_complete_school_syllabus_and_fine_topics(self):
        self.assertEqual(len(self.syllabus),38)
        self.assertEqual(sum(len(c['topics']) for c in self.syllabus),445)
        for level,total in [(11,19),(12,13)]:
            self.assertEqual([c['number'] for c in self.syllabus if c['classLevel']==level and c['scope']=='THEORY'],list(range(1,total+1)))
        for name in ['Calvin cycle (biosynthetic phase)','meiosis','Mendelian inheritance','Hardy - Weinberg','lac operon']:
            self.assertTrue(any(t['name']==name for c in self.syllabus for t in c['topics']),name)

    def test_numbered_options_and_numeric_key_are_preserved_for_review(self):
        source=next(s for s in self.manifest if s['title']=='Ecosystem')
        row=next(r for r in self.rows if r['sourceId']==source['id'] and r['number']==75)
        self.assertEqual(row['options'],['B','A','D','C'])
        self.assertEqual(row['answerEvidence'][0]['evidence'],'75. 1')
        self.assertEqual(row['answerStatus'],'REVIEW_REQUIRED')
        self.assertIn('NUMERIC_OPTION_LABELS_REVIEW_REQUIRED',row['flags'])
        pix=pymupdf.Pixmap(str(ROOT/row['media']))
        self.assertGreater(pix.width,700)

    def test_missing_qr_key_is_not_guessed(self):
        source=next(s for s in self.manifest if s['title']=='Cell - The Unit of Life')
        row=next(r for r in self.rows if r['sourceId']==source['id'] and r['number']==176)
        self.assertIsNone(row['answer'])
        self.assertEqual(row['answerStatus'],'REVIEW_REQUIRED')
        self.assertEqual(row['answerEvidence'][0]['evidence'],'176. Scan QR')

    def test_multiple_correct_source_out_and_graphical_text_stay_private(self):
        self.assertEqual(sum(r['sourceOut'] for r in self.rows),41)
        self.assertEqual(sum(r['kind']=='MULTIPLE_CORRECT' for r in self.rows),6)
        self.assertEqual(len(self.rows),4260)
        self.assertTrue(all('RIGHTS_UNVERIFIED' in r['flags'] for r in self.rows))
        self.assertTrue(all((ROOT/r['media']).is_file() for r in self.rows))
        molecular=next(s for s in self.manifest if s['title']=='Molecular Basis of Inheritance')
        first=next(r for r in self.rows if r['sourceId']==molecular['id'] and r['number']==1)
        self.assertIn('BIOLOGICAL_VISUAL_OR_GLYPH_REVIEW',first['flags'])

    def test_independent_reconciliation_has_no_unresolved_file(self):
        self.assertEqual(self.audit['issues'],[])
        self.assertEqual(len(self.audit['files']),32)
        self.assertEqual(sum(f['sourceMatched'] for f in self.audit['files']),4258)
        self.assertEqual(len(self.audit['keyExceptions']),2)

if __name__=='__main__':unittest.main()
