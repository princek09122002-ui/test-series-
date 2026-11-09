import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import {db} from '../src/lib/db';
import type {Prisma} from '../src/generated/prisma/client';
const repairs=JSON.parse(await readFile('scripts/repair-transcriptions.json','utf8')) as Array<{id:string;version:string}>;
const actor=await db.user.findFirstOrThrow({where:{role:'ADMIN'},select:{id:true}});
for(const repair of repairs) await db.$transaction(async tx=>{
  const source=await tx.sourceQuestion.findUniqueOrThrow({where:{id:repair.id}});
  const raw=source.extracted as Record<string,Prisma.JsonValue>;
  const versions=(raw.repairVersions??[]) as unknown as Array<{version:string;media?:unknown}>;
  if(versions.some(v=>v.version===repair.version))return;
  const previous=versions.at(-1);
  await tx.sourceQuestion.update({where:{id:repair.id},data:{extracted:{...raw,repairVersions:[...versions,{...repair,media:previous?.media??[]}]} as unknown as Prisma.InputJsonValue}});
  await tx.auditLog.create({data:{userId:actor.id,action:'SOURCE_GROUNDED_TRANSCRIPTION',entityId:repair.id,metadata:{version:repair.version,automated:true,academicApproval:false}}});
});
console.log({transcriptions:repairs.length,academicApproved:0});await db.$disconnect();
