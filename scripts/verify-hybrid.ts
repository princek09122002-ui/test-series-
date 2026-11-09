import 'dotenv/config';
import {db} from '../src/lib/db';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const records=JSON.parse(await readFile('.local/hybrid-extraction/records.json','utf8')) as Array<{id:string;sourceId:string;sourceNumber:number;section:string;answerState:string;answerEvidence:Array<{answer:string}>;segments:Array<{bbox:number[];page:number}>;warnings:string[]}>;
assert.equal(new Set(records.map(r=>r.id)).size,records.length,'Duplicate staging identity');
for(const record of records){
  assert(record.segments.every(s=>s.bbox[2]>s.bbox[0]&&s.bbox[3]>s.bbox[1]&&s.page>0),'Invalid crop bounds');
  if(record.answerState==='ANSWER_MATCHED') assert.equal(new Set(record.answerEvidence.map(e=>e.answer)).size,1);
  assert(record.warnings.includes('SOURCE_COMPARISON_PENDING'),'Unreviewed extraction cannot claim validation');
}
const stored=await db.sourceQuestion.findMany({select:{id:true,sourceId:true,sourceNumber:true,extracted:true}});
for(const record of records){const original=stored.find(s=>s.id===record.id);assert(original);assert.equal(original.sourceId,record.sourceId);assert.equal(original.sourceNumber,record.sourceNumber);assert('stem' in (original.extracted as object),'Raw source text must remain');}
console.log({verifiedRecords:records.length,uniqueIds:true,sourceIdentitiesPreserved:true,validCoordinates:true,unreviewedPublicationBlocked:true});
await db.$disconnect();
