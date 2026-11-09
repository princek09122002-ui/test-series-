import { requireStaff } from "@/lib/auth";
import { api } from "@/lib/api";
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { db } from "@/lib/db";
import { importDirectory, importSubject } from "@/lib/domain/import-source";
import { AppError } from "@/lib/security";
export const GET=api(async(request,{params})=>{
  await requireStaff();
  const {id}=await params;
  const page=new URL(request.url).searchParams.get('page');
  if(!/^[a-f0-9-]{36}$/.test(id)||!/^\d{1,4}$/.test(page??'')) throw new AppError('Not found',404);
  if(new URL(request.url).searchParams.get('repair')==='1'){
    try{return new Response(await readFile(`.local/question-repair-v2/${id}-${page}.png`),{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch{throw new AppError('Private repair image not found',404);}
  }
  const target=`.local/hybrid-extraction/${id}-${page}.png`;
  try { await readFile(target); } catch {
    const record=await db.sourceQuestion.findUnique({where:{id},include:{source:true}});
    const versions=(record?.extracted as {hybridVersions?:Array<{segments:Array<{page:number;bbox:number[]}>}>})?.hybridVersions;
    const segment=versions?.at(-1)?.segments.find(s=>s.page===Number(page));
    if(!record||!segment) throw new AppError('No verified source region',404);
    const manifest=`.local/hybrid-extraction/${id}-${page}.render.json`;
    await writeFile(manifest,JSON.stringify({source:importDirectory(importSubject(record.source.metadata))+`/sources/${record.sourceId}.pdf`,page:Number(page),bbox:segment.bbox,target}));
    await promisify(execFile)('python',['scripts/render-hybrid-region.py',manifest],{windowsHide:true,timeout:60000});
  }
  try{return new Response(await readFile(`.local/hybrid-extraction/${id}-${page}.png`),{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch{throw new AppError('Image not found',404);}
});
