import {z} from 'zod';
const localMedia=z.string().regex(/^\/api\/(?:question-media|admin\/(?:hybrid-media|import-media))\/[a-zA-Z0-9-]+(?:\?[a-zA-Z0-9=&-]+)?$/);
export const contentBlockSchema=z.discriminatedUnion('type',[
  z.object({type:z.literal('text'),text:z.string()}),
  z.object({type:z.literal('latex'),value:z.string(),display:z.boolean().default(false)}),
  z.object({type:z.literal('image'),url:localMedia,alt:z.string().min(1),visibility:z.enum(['PRIVATE_REVIEW','STUDENT']),verified:z.boolean()}),
  z.object({type:z.literal('table'),headers:z.array(z.string()),rows:z.array(z.array(z.string()))}),
  z.object({type:z.literal('list'),items:z.array(z.string()),ordered:z.boolean()}),
]);
export type ContentBlock=z.infer<typeof contentBlockSchema>;
export const canonicalQuestionSchema=z.object({
  schemaVersion:z.literal('1.0'),id:z.string().min(1),contentVersion:z.number().int().positive(),
  subject:z.enum(['Physics','Chemistry','Biology']),subjectId:z.string().nullable(),classLevel:z.union([z.literal(11),z.literal(12)]).nullable(),
  chapterId:z.string().nullable(),primaryTopicIds:z.array(z.string()),additionalTopicIds:z.array(z.string()),prerequisiteTopicIds:z.array(z.string()),
  type:z.enum(['SINGLE_CORRECT','MULTIPLE_CORRECT','UNRESOLVED']),
  stem:z.array(contentBlockSchema),options:z.array(z.object({id:z.string().min(1),label:z.enum(['A','B','C','D']),content:z.array(contentBlockSchema)})).length(4),
  correctAnswerIds:z.array(z.string()),difficulty:z.enum(['EASY','MEDIUM','HARD','UNRATED']),language:z.enum(['en','hi']),
  source:z.object({documentId:z.string(),sourceQuestionId:z.string(),questionNumber:z.number().int(),section:z.string(),year:z.number().int().nullable(),paperVariant:z.string(),pages:z.array(z.number().int().positive()),answerEvidence:z.unknown()}),
  syllabus:z.object({versionId:z.string().nullable(),eligibilityVersion:z.string(),eligibility:z.string(),mappingState:z.enum(['PENDING','APPROVED'])}),
  verification:z.object({extraction:z.enum(['PENDING','APPROVED','REJECTED']),answer:z.enum(['VERIFIED','REVIEW_REQUIRED']),academic:z.enum(['PENDING','APPROVED','REJECTED']),rights:z.enum(['UNVERIFIED','OWNER_ATTESTED','CLEARED','RESTRICTED']),publication:z.enum(['PRIVATE','PUBLISHED'])}),
  presentation:z.enum(['STRUCTURED','IMAGE_FALLBACK']),reviewMedia:z.array(contentBlockSchema),issues:z.array(z.string()),
}).superRefine((q,ctx)=>{
  if(new Set(q.options.map(o=>o.id)).size!==4||q.options.map(o=>o.label).join('')!=='ABCD')ctx.addIssue({code:'custom',message:'Four unique option IDs in A-D order are required'});
  if(q.correctAnswerIds.some(id=>!q.options.some(o=>o.id===id)))ctx.addIssue({code:'custom',message:'Answer IDs must reference this question options'});
  if(q.type==='SINGLE_CORRECT'&&q.verification.answer==='VERIFIED'&&q.correctAnswerIds.length!==1)ctx.addIssue({code:'custom',message:'A verified single-correct key must have one answer ID'});
});
export type CanonicalQuestion=z.infer<typeof canonicalQuestionSchema>;
export function contentStructureIssues(q:CanonicalQuestion){
  const issues:string[]=[];
  const complete=(blocks:ContentBlock[])=>blocks.some(b=>b.type==='text'?b.text.trim().length>0:b.type==='latex'?b.value.trim().length>0:b.type==='image'?b.verified&&b.visibility==='STUDENT':b.type==='list'?b.items.length>0:b.rows.length>0&&b.rows.every(row=>row.length===b.headers.length));
  if(!complete(q.stem))issues.push('MISSING_STEM');
  if(q.options.some(o=>!complete(o.content)))issues.push('INCOMPLETE_OPTIONS');
  if(q.presentation==='IMAGE_FALLBACK')issues.push('IMAGE_PRESENTATION_REVIEW_REQUIRED');
  return issues;
}
export function structuralIssues(q:CanonicalQuestion){
  const issues=contentStructureIssues(q);
  if(q.verification.extraction!=='APPROVED')issues.push('EXTRACTION_REVIEW_REQUIRED');
  if(q.verification.answer!=='VERIFIED')issues.push('ANSWER_REVIEW_REQUIRED');
  if(!q.chapterId||!q.primaryTopicIds.length||q.syllabus.mappingState!=='APPROVED')issues.push('TOPIC_MAPPING_PENDING');
  return issues;
}
export function studentContent(q:CanonicalQuestion){
  const publicBlocks=(blocks:ContentBlock[])=>blocks.filter(b=>b.type!=='image'||b.visibility==='STUDENT'&&b.verified);
  return{stem:publicBlocks(q.stem),options:q.options.map(o=>({id:o.id,label:o.label,content:publicBlocks(o.content)}))};
}
