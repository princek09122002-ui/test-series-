import "dotenv/config";
import { readFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import type { Prisma } from "../src/generated/prisma/client";
const records=JSON.parse(await readFile('.local/hybrid-extraction/records.json','utf8')) as Array<{id:string;version:string}>;
const gold=JSON.parse(await readFile('scripts/hybrid-gold.json','utf8')) as Array<{id:string;structured?:unknown;reviewMethod:string;before:string}>;
for(const record of records){
  const comparison=gold.find(g=>g.id===record.id);
  if(comparison) Object.assign(record,{visualComparison:comparison,...(comparison.structured?{structured:comparison.structured}:{})});
}
let stored=0, unchanged=0;
const actor=await db.user.findFirstOrThrow({where:{role:'ADMIN'},select:{id:true}});
for(const record of records){
  await db.$transaction(async tx=>{
    const source=await tx.sourceQuestion.findUniqueOrThrow({where:{id:record.id}});
    const raw=source.extracted as Record<string,Prisma.JsonValue>;
    const versions=(raw.hybridVersions ?? []) as unknown as Array<{version:string}>;
    if(versions.some(v=>v.version===record.version)){unchanged++;return;}
    await tx.sourceQuestion.update({where:{id:record.id},data:{extracted:{...raw,hybridVersions:[...versions,record]} as unknown as Prisma.InputJsonValue}});
    await tx.auditLog.create({data:{userId:actor.id,action:'HYBRID_EXTRACTION_VERSION',entityId:record.id,metadata:{version:record.version,rawPreserved:true,automated:true}}});
    stored++;
  });
  if((stored+unchanged)%500===0) console.log({stored,unchanged});
}
console.log({stored,unchanged});
await db.$disconnect();
