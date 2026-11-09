import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {readQuestionJsonl} from '../src/lib/services/canonical-import';
import {db} from '../src/lib/db';
const manifest=JSON.parse(await readFile('.local/canonical-format/full/manifest.json','utf8')) as {files:string[];stats:unknown;duplicates:unknown[]};
for await(const question of readQuestionJsonl(manifest.files[0])){await writeFile('docs/question.sample.jsonl',JSON.stringify(question)+'\n');break;}
const scopes=await db.canonicalQuestionRecord.groupBy({by:['subject','chapterId','technicalState'],_count:true});
const report={stats:manifest.stats,possibleDuplicates:manifest.duplicates.length,records:await db.canonicalQuestionRecord.count(),options:await db.canonicalQuestionOption.count(),topicLinks:await db.canonicalQuestionTopic.count(),scopes};
await writeFile('.local/canonical-format/database-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await db.$disconnect();
