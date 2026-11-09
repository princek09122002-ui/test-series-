import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {db} from '@/lib/db';
import {canonicalQuestionSchema,structuralIssues,type CanonicalQuestion} from '@/lib/domain/canonical-question';
export function questionHash(q:CanonicalQuestion){return createHash('sha256').update(JSON.stringify({stem:q.stem,options:q.options.map(o=>({label:o.label,content:o.content}))})).digest('hex');}
function stableJson(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';
 if(value!==null&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>JSON.stringify(key)+':'+stableJson(item)).join(',')+'}';
 return JSON.stringify(value);
}
export async function importCanonicalQuestion(raw:unknown){
 const q=canonicalQuestionSchema.parse(raw);
 if(q.verification.publication!=='PRIVATE')throw Error('JSON imports cannot publish content; use the reviewed publication service');
 const hash=questionHash(q),issues=structuralIssues(q);
 return db.$transaction(async tx=>{
  const source=await tx.sourceQuestion.findUniqueOrThrow({where:{id:q.source.sourceQuestionId},include:{source:true}});
  if(q.id!==source.id||q.source.documentId!==source.sourceId||q.source.questionNumber!==source.sourceNumber||q.source.year!==source.year||q.source.paperVariant!==source.exam)throw Error('Source identity or provenance mismatch');
  if(q.type!=='UNRESOLVED'&&q.type!==source.type)throw Error('Question type differs from source occurrence');
  if(q.syllabus.mappingState==='APPROVED'&&source.reviewStatus!=='APPROVED')throw Error('Mapping approval cannot be supplied by an import');
  if(q.verification.rights==='CLEARED'&&((source.source.metadata as {permissionDecision?:{evidenceOrigin?:string}}).permissionDecision?.evidenceOrigin==='OWNER_CHAT_DECLARATION'||source.source.rightsStatus!=='CLEARED'))throw Error('An owner attestation cannot become independently verified rights through JSON import');
  if(q.verification.academic==='APPROVED'&&source.reviewStatus!=='APPROVED')throw Error('Academic approval cannot be supplied by an import');
  if(q.verification.extraction==='APPROVED'&&(source.extracted as {extractionReviews?:Array<{decision:string}>}).extractionReviews?.at(-1)?.decision!=='APPROVE_EXTRACTION')throw Error('Extraction approval lacks saved source review');
  if(q.verification.answer==='VERIFIED'&&source.answerStatus!=='VERIFIED')throw Error('Answer verification cannot be supplied by an import');
  if(q.verification.answer==='VERIFIED'&&q.type==='SINGLE_CORRECT'){
    const label=String((source.extracted as {answer?:string}).answer??'');
    if(!/^[A-D]$/.test(label)||q.correctAnswerIds[0]!==q.options.find(o=>o.label===label)?.id)throw Error('Answer IDs differ from verified source key');
  }
  const previous=await tx.$queryRaw<Array<{document:unknown}>>`SELECT "document" FROM "CanonicalQuestionRecord" WHERE "questionId"=${q.id} AND "contentVersion"=${q.contentVersion}`;
  if(previous.length){if(stableJson(canonicalQuestionSchema.parse(previous[0].document))!==stableJson(q))throw Error('Immutable version differs; increment contentVersion');return{inserted:false,issues};}
  const topics=[...q.primaryTopicIds,...q.additionalTopicIds,...q.prerequisiteTopicIds];
  const valid=await tx.topic.findMany({where:{id:{in:topics}},include:{chapter:true}});
  if(new Set(topics).size!==valid.length||valid.some(t=>t.chapter.subjectId!==q.subjectId)||[...q.primaryTopicIds,...q.additionalTopicIds].some(id=>valid.find(t=>t.id===id)?.chapterId!==q.chapterId))throw Error('Topic relationships do not match the canonical subject/chapter');
  if(q.chapterId){const chapter=await tx.chapter.findUniqueOrThrow({where:{id:q.chapterId},include:{subject:true}});if(chapter.subject.name!==q.subject||chapter.subjectId!==q.subjectId||chapter.classLevel!==q.classLevel||chapter.subject.syllabusId!==q.syllabus.versionId)throw Error('Syllabus scope mismatch');}
  await tx.$executeRaw`INSERT INTO "CanonicalQuestionRecord" ("questionId","contentVersion","schemaVersion","subject","chapterId","contentHash","document","technicalState","issues") VALUES (${q.id},${q.contentVersion},${q.schemaVersion},${q.subject},${q.chapterId},${hash},${JSON.stringify(q)}::jsonb,${issues.length?'REVIEW_REQUIRED':'CONTENT_VALIDATED'},${JSON.stringify(issues)}::jsonb)`;
  for(const option of q.options)await tx.$executeRaw`INSERT INTO "CanonicalQuestionOption" ("questionId","contentVersion","optionId","label","content","correct") VALUES (${q.id},${q.contentVersion},${option.id},${option.label},${JSON.stringify(option.content)}::jsonb,${q.correctAnswerIds.includes(option.id)})`;
  for(const [role,ids] of [['PRIMARY',q.primaryTopicIds],['ADDITIONAL',q.additionalTopicIds],['PREREQUISITE',q.prerequisiteTopicIds]] as const)for(const id of new Set(ids))await tx.$executeRaw`INSERT INTO "CanonicalQuestionTopic" ("questionId","contentVersion","topicId","role","verified") VALUES (${q.id},${q.contentVersion},${id},${role},${q.syllabus.mappingState==='APPROVED'})`;
  return{inserted:true,issues};
 },{timeout:30000});
}
export async function* readQuestionJsonl(path:string){let line=0;for await(const text of createInterface({input:createReadStream(path),crlfDelay:Infinity})){line++;if(!text.trim())continue;try{yield canonicalQuestionSchema.parse(JSON.parse(text));}catch(error){throw Error(`Invalid JSONL ${path}:${line}: ${error instanceof Error?error.message:String(error)}`);}}}
