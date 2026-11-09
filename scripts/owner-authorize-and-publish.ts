import 'dotenv/config';
import {db} from '../src/lib/db';
import {promoteImportedQuestion,importReviewSchema} from '../src/lib/services/import-promotion';
import {eligibleBankWhere} from '../src/lib/services/publication';
import type {Prisma} from '../src/generated/prisma/client';
const declaration='haa sbki permission h tu bs publish jr';
const actor=await db.user.findFirstOrThrow({where:{role:'ADMIN'},select:{id:true}});
const sources=await db.sourceDocument.findMany();
let authorized=0;
for(const source of sources){
  const metadata=source.metadata as Record<string,Prisma.JsonValue>;
  const previous=metadata.permissionDecision as Record<string,Prisma.JsonValue>|undefined;
  // An owner attestation is recorded as such; no external verification is claimed.
  if(previous?.evidenceOrigin==='OWNER_CHAT_DECLARATION'&&source.rightsStatus==='CLEARED') continue;
  await db.$transaction(async tx=>{
    const evidence='Application owner explicitly confirms permission for all supplied PDFs and authorizes student publication in the current chat: '+declaration;
    const decision={decision:'CLEARED',licenseType:'LICENSED',authorizedScope:'STUDENT_TESTS',documentationRef:'owner-chat-publication-authorization-2026-11-07',effectiveDate:new Date().toISOString(),evidence,evidenceOrigin:'OWNER_CHAT_DECLARATION',independentlyVerified:false,rightsHolder:null,reviewerId:actor.id,recordedBy:'AUTOMATED_AGENT_ON_OWNER_INSTRUCTION',decidedAt:new Date().toISOString()};
    await tx.sourceDocument.update({where:{id:source.id},data:{rightsStatus:'CLEARED',rightsEvidence:evidence,metadata:{...metadata,permissionDecision:decision} as Prisma.InputJsonValue}});
    await tx.sourceQuestion.updateMany({where:{sourceId:source.id},data:{rightsStatus:'CLEARED',rightsEvidence:evidence}});
    await tx.auditLog.create({data:{userId:actor.id,action:'OWNER_PUBLICATION_PERMISSION_DECLARATION',entityId:source.id,metadata:{declaration,evidenceOrigin:'OWNER_CHAT_DECLARATION',independentlyVerified:false,previousRightsStatus:source.rightsStatus,academicApprovalGranted:false}}});
  });authorized++;
}
const candidates=await db.sourceQuestion.findMany({where:{reviewStatus:'APPROVED',answerStatus:'VERIFIED',rightsStatus:'CLEARED',eligibility:'ELIGIBLE',type:'SINGLE_CORRECT',sourceOut:false}});
let published=0;const rejected:Array<{id:string;reason:string}>=[];
for(const record of candidates){
  const parsed=importReviewSchema.safeParse((record.suggestions as Record<string,unknown>).reviewedForm);
  if(!parsed.success){rejected.push({id:record.id,reason:'Saved academic review form is incomplete'});continue;}
  try{await db.$transaction(tx=>promoteImportedQuestion(tx,record.id,parsed.data,actor.id,'individual'));published++;}catch(error){rejected.push({id:record.id,reason:error instanceof Error?error.message:String(error)});}
}
console.log(JSON.stringify({sourcePermissionsRecorded:authorized,sourcePermissionBasis:'OWNER_CHAT_DECLARATION_NOT_INDEPENDENTLY_VERIFIED',questionsWithPermission:await db.sourceQuestion.count({where:{rightsStatus:'CLEARED'}}),academicPending:await db.sourceQuestion.count({where:{reviewStatus:'PENDING'}}),approvedCandidates:candidates.length,publishedThisRun:published,availableImportedQuestions:await db.question.count({where:{AND:[eligibleBankWhere,{importRecord:{isNot:null}}]}}),rejected},null,2));
await db.$disconnect();
