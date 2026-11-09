import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {db} from '../src/lib/db';
import {importSubject} from '../src/lib/domain/import-source';
import type {Prisma} from '../src/generated/prisma/client';
type Repair={id:string;version:string;media:Array<{path:string;sha256:string}>};
const repairs=JSON.parse(await readFile('.local/question-repair-v2/repairs.json','utf8')) as Repair[];
const actor=await db.user.findFirstOrThrow({where:{role:'ADMIN'},select:{id:true}});
let stored=0,skipped=0;
for(const repair of repairs){
  await db.$transaction(async tx=>{
    const row=await tx.sourceQuestion.findUniqueOrThrow({where:{id:repair.id}});
    const raw=row.extracted as Record<string,Prisma.JsonValue>;
    const versions=(raw.repairVersions??[]) as unknown as Repair[];
    if(versions.some(v=>v.version===repair.version)){skipped++;return;}
    if(!repair.media.length) throw Error('Missing repair media: '+repair.id);
    await tx.sourceQuestion.update({where:{id:repair.id},data:{extracted:{...raw,repairVersions:[...versions,repair]} as unknown as Prisma.InputJsonValue}});
    await tx.auditLog.create({data:{userId:actor.id,action:'PREPARE_PRIVATE_VISUAL_REPAIR',entityId:repair.id,metadata:{version:repair.version,automated:true,academicApproval:false,rightsApproval:false}}});stored++;
  });
  if((stored+skipped)%200===0)console.log({stored,skipped});
}
const records=await db.sourceQuestion.findMany({include:{source:true,question:{include:{topics:true}}}});
const report=['Physics','Chemistry','Biology'].map(subject=>{
  const rows=records.filter(r=>importSubject(r.source.metadata)===subject);
  return{subject,staged:rows.length,incomplete:rows.filter(r=>repairs.some(p=>p.id===r.id)).length,visualFallbackPrepared:rows.filter(r=>repairs.some(p=>p.id===r.id)).length,textRepairCertified:0,structurallyCertified:rows.filter(r=>(r.extracted as {extractionReviews?:Array<{decision:string}>}).extractionReviews?.at(-1)?.decision==='APPROVE_EXTRACTION').length,sourceKeyVerified:rows.filter(r=>r.answerStatus==='VERIFIED').length,topicCandidates:rows.filter(r=>r.question?.topics.some(t=>!t.required)).length,academicApproved:rows.filter(r=>r.reviewStatus==='APPROVED').length,rightsCleared:rows.filter(r=>r.rightsStatus==='CLEARED').length,published:rows.filter(r=>r.question?.active&&r.question.status==='APPROVED').length};
});
await writeFile('.local/question-repair-v2/database-report.json',JSON.stringify({stored,skipped,subjects:report},null,2));
console.log(JSON.stringify({stored,skipped,subjects:report},null,2));await db.$disconnect();
