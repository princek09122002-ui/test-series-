import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {db} from '../src/lib/db';
const backup=JSON.parse(await readFile('.local/backups/pre-biology-2026-11-07T12-20-40.292Z/database.json','utf8')) as {tables:Record<string,Array<{id:string;attemptId?:string;testQuestionId?:string}>>};
const repairs=JSON.parse(await readFile('.local/question-repair-v2/repairs.json','utf8')) as Array<{id:string;media:Array<{path:string;sha256:string}>}>;
let images=0;
for(const repair of repairs){
  assert(repair.media.length);
  for(const media of repair.media){const bytes=await readFile(media.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),media.sha256);assert.equal(bytes.subarray(1,4).toString(),'PNG');assert(bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0);images++;}
}
const checks:Record<string,number>={};
for(const table of ['User','Test','TestAttempt','Question','Subject','Chapter','Topic','SyllabusVersion','SourceQuestion','QuestionResponse','TestAnalyticsSnapshot']){
  if(!backup.tables[table])continue;
  const field=table==='TestAnalyticsSnapshot'?'attemptId':'id';
  const expression=table==='QuestionResponse'?'"attemptId" || \':\' || "testQuestionId"':`"${field}"`;
  const result=await db.$queryRawUnsafe<Array<{id:string}>>(`SELECT ${expression} AS id FROM "${table}"`);
  assert.deepEqual(result.map(r=>r.id).sort(),backup.tables[table].map(r=>table==='QuestionResponse'?r.attemptId+':'+r.testQuestionId:field==='attemptId'?r.attemptId:r.id).sort(),table+' identity changed');checks[table]=result.length;
}
const source=await db.sourceQuestion.findMany({where:{id:{in:repairs.map(r=>r.id)}},select:{id:true,extracted:true}});
for(const row of source){assert('stem' in (row.extracted as object));assert((row.extracted as {repairVersions?:unknown[]}).repairVersions?.length);}
for(const table of ['Test','TestAttempt','QuestionResponse','TestAnalyticsSnapshot']){
  const rows=await db.$queryRawUnsafe<Array<{row:unknown}>>(`SELECT row_to_json(t) AS row FROM "${table}" t`);
  assert.deepEqual(rows.map(r=>JSON.stringify(r.row)).sort(),backup.tables[table].map(r=>JSON.stringify(r)).sort(),table+' historical data changed');
}
const result={repairRecords:repairs.length,hashedImagesVerified:images,preservedIdentities:checks,historicalResultsUnchanged:true};
await writeFile('.local/question-repair-v2/integrity.json',JSON.stringify(result,null,2));console.log(result);await db.$disconnect();
