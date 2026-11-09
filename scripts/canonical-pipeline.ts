import 'dotenv/config';
import {mkdir,writeFile,appendFile,readFile} from 'node:fs/promises';
import {z} from 'zod';
import {db} from '../src/lib/db';
import {canonicalQuestionSchema,structuralIssues,type CanonicalQuestion,type ContentBlock} from '../src/lib/domain/canonical-question';
import {importCanonicalQuestion,readQuestionJsonl,questionHash} from '../src/lib/services/canonical-import';
import {importSubject} from '../src/lib/domain/import-source';
const mode=process.argv[2]??'convert';const pilot=process.argv.includes('--pilot');
const root=`.local/canonical-format/${pilot?'pilot':'full'}`;
await mkdir(root,{recursive:true});
if(mode==='convert'){
 await writeFile('docs/question-format.schema.json',JSON.stringify(z.toJSONSchema(canonicalQuestionSchema),null,2));
 const chapters=await db.chapter.findMany({include:{subject:true}});const byChapter=new Map(chapters.map(c=>[c.id,c]));
 const files=new Set<string>(),hashes=new Map<string,string>(),duplicates:Array<{id:string;otherId:string}>=[];
 const stats:Record<string,number>={converted:0,structurallyValid:0,reviewRequired:0,sourceMatched:0,topicVerified:0,academicApproved:0,rightsCleared:0,published:0};
 await writeFile(root+'/exceptions.jsonl','');await writeFile(root+'/media.jsonl','');
 let cursor:string|undefined;
 while(true){
  const rows=await db.sourceQuestion.findMany({where:pilot?{source:{title:{in:['Units & Measurement','Structure of Atom','Cell - The Unit of Life','Cell: The Unit of Life']}}}:undefined,orderBy:{id:'asc'},take:100,...(cursor?{cursor:{id:cursor},skip:1}:{}),include:{source:true,question:{include:{topics:true}}}});
  if(!rows.length)break;
  for(const row of rows){
   const e=row.extracted as Record<string,unknown>;
   const hybrid=(e.hybridVersions as Array<{structured?:{stem:{text:string};options:Array<{text:string}>};segments:Array<{page:number}>;section:string;warnings:string[]}>|undefined)?.at(-1);
   const repair=(e.repairVersions as Array<{structured?:{stem:{text:string};options:Array<{text:string}>};media:Array<{page:number}>}>|undefined)?.at(-1);
   const review=(e.extractionReviews as Array<{decision:string;text:string;options:string[];renderMode?:string}>|undefined)?.at(-1);
   const reconstructed=repair?.structured??hybrid?.structured;
   const stem=review?.text??reconstructed?.stem.text??String(e.stem??'');
   const options=review?.options??reconstructed?.options.map(o=>o.text)??e.options as string[]??[];
   const suggestion=row.suggestions as {candidateChapterIds?:string[]};
   const proposed=suggestion.candidateChapterIds?.length===1?suggestion.candidateChapterIds[0]:null;
   const chapter=byChapter.get(row.question?.chapterId??proposed??'');
   const subject=importSubject(row.source.metadata);
   const rawAnswer=String(e.answer??'');
   const keyVerified=row.answerStatus==='VERIFIED'&&/^[A-D]$/.test(rawAnswer);
   const links=row.question?.topics??[];
   const blocks=(text:string):ContentBlock[]=>text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g).filter(Boolean).map(t=>t.startsWith('$')?{type:'latex',value:t.replace(/^\$\$?|\$\$?$/g,''),display:t.startsWith('$$')}:{type:'text',text:t});
   const media=(hybrid?.segments??[]).map(s=>({type:'image' as const,url:`/api/admin/hybrid-media/${row.id}?page=${s.page}`,alt:`Original private PDF question ${row.sourceNumber}, page ${s.page}`,visibility:'PRIVATE_REVIEW' as const,verified:false}));
   const permission=(row.source.metadata as {permissionDecision?:{evidenceOrigin?:string}}).permissionDecision;
   const q:CanonicalQuestion={schemaVersion:'1.0',id:row.id,contentVersion:1,subject,subjectId:chapter?.subjectId??null,classLevel:chapter?.classLevel===11?11:chapter?.classLevel===12?12:null,chapterId:chapter?.id??null,primaryTopicIds:links.filter(t=>!t.required).map(t=>t.topicId),additionalTopicIds:[],prerequisiteTopicIds:links.filter(t=>t.required).map(t=>t.topicId),type:row.type==='SINGLE_CORRECT'?'SINGLE_CORRECT':row.type==='MULTIPLE_CORRECT'?'MULTIPLE_CORRECT':'UNRESOLVED',stem:blocks(stem),options:[... 'ABCD'].map((label,index)=>({id:row.id+':'+label,label:label as 'A'|'B'|'C'|'D',content:blocks(options[index]??'')})),correctAnswerIds:keyVerified?[row.id+':'+rawAnswer]:[],difficulty:row.question&&!row.question.tags.includes('DIFFICULTY_UNRATED')?row.question.difficulty:'UNRATED',language:'en',source:{documentId:row.sourceId,sourceQuestionId:row.id,questionNumber:row.sourceNumber,section:hybrid?.section??row.type,year:row.year,paperVariant:row.exam,pages:[...new Set((hybrid?.segments??[{page:row.page}]).map(s=>s.page))],answerEvidence:e.answerEvidence??hybrid??null},syllabus:{versionId:chapter?.subject.syllabusId??null,eligibilityVersion:row.eligibilityVersion,eligibility:row.eligibility,mappingState:row.reviewStatus==='APPROVED'?'APPROVED':'PENDING'},verification:{extraction:review?.decision==='APPROVE_EXTRACTION'?'APPROVED':review?.decision==='REJECT'?'REJECTED':'PENDING',answer:keyVerified?'VERIFIED':'REVIEW_REQUIRED',academic:row.reviewStatus==='APPROVED'?'APPROVED':'PENDING',rights:permission?.evidenceOrigin==='OWNER_CHAT_DECLARATION'?'OWNER_ATTESTED':row.rightsStatus==='CLEARED'?'CLEARED':'UNVERIFIED',publication:'PRIVATE'},presentation:repair||e.visual?'IMAGE_FALLBACK':'STRUCTURED',reviewMedia:media,issues:[...new Set(hybrid?.warnings??[])]};
   canonicalQuestionSchema.parse(q);const issues=structuralIssues(q);q.issues=[...new Set([...q.issues,...issues])];
   const file=`${root}/${subject.toLowerCase()}/${(q.chapterId??'unmapped').replace(/[^a-zA-Z0-9-]/g,'_')}.jsonl`;
   if(!files.has(file)){await mkdir(`${root}/${subject.toLowerCase()}`,{recursive:true});await writeFile(file,'');files.add(file);}
   await appendFile(file,JSON.stringify(q)+'\n');
   if(q.issues.length)await appendFile(root+'/exceptions.jsonl',JSON.stringify({id:q.id,issues:q.issues})+'\n');
   for(const m of media)await appendFile(root+'/media.jsonl',JSON.stringify({questionId:q.id,...m})+'\n');
   const hash=questionHash(q),other=hashes.get(hash);if(other)duplicates.push({id:q.id,otherId:other});else hashes.set(hash,q.id);
   stats.converted++;stats.structurallyValid+=Number(issues.length===0);stats.reviewRequired+=Number(q.issues.length>0);stats.sourceMatched+=Number(keyVerified);stats.topicVerified+=Number(q.syllabus.mappingState==='APPROVED');stats.academicApproved+=Number(q.verification.academic==='APPROVED');stats.rightsCleared+=Number(q.verification.rights==='CLEARED');
  }
  cursor=rows.at(-1)!.id;console.log({converted:stats.converted});
 }
 await writeFile(root+'/manifest.json',JSON.stringify({stats,files:[...files],duplicates},null,2));console.log(stats);
}else{
 const manifest=JSON.parse(await readFile(root+'/manifest.json','utf8')) as {files:string[]};let processed=0,inserted=0;
 for(const file of manifest.files)for await(const q of readQuestionJsonl(file)){if(mode==='import'){const result=await importCanonicalQuestion(q);inserted+=Number(result.inserted);}processed++;}
 console.log({mode,processed,inserted});
}
await db.$disconnect();
