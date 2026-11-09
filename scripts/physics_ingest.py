"""Physics entry point; shared chapter-PDF parser preserves stable source IDs."""
import argparse,json,shutil
from pathlib import Path
from chapter_pdf import ROOT,OUT,VERSION,audit,extract,digest,SOURCE_KEY_RE

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--full',action='store_true');ap.add_argument('--folder',type=Path,default=Path.home()/'Downloads');args=ap.parse_args();OUT.mkdir(parents=True,exist_ok=True)
 manifest=audit(args.folder)
 if len(manifest)!=26:raise ValueError(f'Expected 26 source files; found {len(manifest)}')
 if args.full and not (OUT/'pilot-approved.json').exists():raise ValueError('Complete pilot review before full extraction')
 allrows=[]
 for meta in manifest:
  if not args.full and meta['title'] not in ['Current Electricity','Motion in a Plane','Vector Algebra','Atoms and Nuclei','Semiconductor Electronics']:continue
  rows=extract(meta,render=True);allrows.extend(rows)
  if args.full:
   (OUT/'sources').mkdir(exist_ok=True);shutil.copy2(meta['path'],OUT/'sources'/f"{meta['id']}.pdf")
   (OUT/'batches').mkdir(exist_ok=True);(OUT/'batches'/f"{meta['id']}.json").write_text(json.dumps(rows,ensure_ascii=False),encoding='utf8')
  print(meta['title'],meta['declared'],meta['parsed'],meta['matched'],meta['errors'],flush=True)
 (OUT/'physics-import-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
 (OUT/('questions.json' if args.full else 'pilot.json')).write_text(json.dumps(allrows,ensure_ascii=False),encoding='utf8')
if __name__=='__main__':main()

